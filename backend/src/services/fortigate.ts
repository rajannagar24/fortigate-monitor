/**
 * FortiGate REST API client.
 * Supports two authentication modes:
 *   1. Session-based: username + password → /logincheck → session cookies + CSRF token
 *   2. Token-based: REST API admin token (query param or Bearer header, legacy fallback)
 *
 * Session-based auth works with SSO/LDAP/RADIUS/local accounts —
 * no need to create a dedicated REST API admin or configure Trusted Hosts.
 */

import axios, { AxiosInstance, AxiosResponse } from "axios";
import https from "https";
import { cache } from "./cache";

// ─── Types ─────────────────────────────────────────────────

export interface FortiGateConfig {
  host: string;
  port: number;
  verifySsl: boolean;
}

export interface SessionCredentials {
  username: string;
  password: string;
}

export interface SessionInfo {
  cookies: string; // raw Set-Cookie value for requests
  csrfToken: string; // X-CSRFTOKEN header value
  expiresAt: number; // Unix ms when session expires
}

// ─── Session Store (in-memory, per-firewall) ───────────────

const sessionStore = new Map<string, SessionInfo>();

export function getSession(firewallId: string): SessionInfo | null {
  const s = sessionStore.get(firewallId);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    sessionStore.delete(firewallId);
    return null;
  }
  return s;
}

export function setSession(firewallId: string, session: SessionInfo): void {
  sessionStore.set(firewallId, session);
}

export function clearSession(firewallId: string): void {
  sessionStore.delete(firewallId);
}

export function hasActiveSession(firewallId: string): boolean {
  return getSession(firewallId) !== null;
}

// ─── Login / Logout ────────────────────────────────────────

/**
 * Authenticate to FortiGate via /logincheck (session-based).
 * Works with SSO, LDAP, RADIUS, and local admin accounts.
 */
export async function fortiLogin(
  config: FortiGateConfig,
  credentials: SessionCredentials,
  firewallId: string
): Promise<{ ok: boolean; message: string; session?: SessionInfo }> {
  const baseURL = `https://${config.host}:${config.port}`;
  const agent = new https.Agent({ rejectUnauthorized: config.verifySsl });

  console.log(`[FortiGate] Logging in to ${baseURL} as ${credentials.username}...`);

  try {
    // FortiGate /logincheck expects x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append("username", credentials.username);
    params.append("secretkey", credentials.password);
    params.append("ajax", "1");

    const resp: AxiosResponse = await axios.post(
      `${baseURL}/logincheck`,
      params.toString(),
      {
        httpsAgent: agent,
        timeout: 15_000,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        maxRedirects: 0,
        validateStatus: (status) => status < 500,
        withCredentials: true,
      }
    );

    console.log("[FortiGate] Login response:", {
      status: resp.status,
      setCookieCount: resp.headers["set-cookie"]?.length ?? 0,
      dataPreview: typeof resp.data === "string" ? resp.data.substring(0, 200) : resp.data,
    });

    // FortiGate returns cookies on success
    const setCookies = resp.headers["set-cookie"];
    if (!setCookies || setCookies.length === 0) {
      return {
        ok: false,
        message: "Login failed — invalid username or password (no session cookie returned).",
      };
    }

    // Extract all cookies into a single Cookie header string
    const cookieString = setCookies
      .map((c: string) => c.split(";")[0])
      .join("; ");

    // Extract CSRF token (ccsrftoken or ccsrftoken_<port>)
    let csrfToken = "";
    for (const c of setCookies) {
      const match = c.match(/ccsrftoken[^=]*="?([^";]+)/);
      if (match) {
        csrfToken = match[1];
        break;
      }
    }

    if (!csrfToken) {
      console.warn("[FortiGate] No CSRF token found in cookies — trying without it");
    }

    // FortiGate default admin idle timeout = 5 min. Use 4 min to be safe.
    const SESSION_TTL_MS = 4 * 60 * 1000;

    const session: SessionInfo = {
      cookies: cookieString,
      csrfToken,
      expiresAt: Date.now() + SESSION_TTL_MS,
    };

    // Verify session with a real API call
    try {
      const testClient = createSessionClient(config, session);
      const { data } = await testClient.get("/api/v2/monitor/system/status");
      const hostname = data.results?.hostname || data.hostname || "unknown";
      const model = data.results?.model || data.model_name || "unknown";
      const firmware = data.results?.firmware_version || data.version || "unknown";

      setSession(firewallId, session);

      console.log(`[FortiGate] Login successful: ${hostname} (${model}) — ${firmware}`);
      return {
        ok: true,
        message: `Authenticated to ${hostname} (${model}) running ${firmware}`,
        session,
      };
    } catch (verifyErr: any) {
      console.error("[FortiGate] Post-login verification failed:", {
        status: verifyErr.response?.status,
        data: verifyErr.response?.data,
      });
      return {
        ok: false,
        message: `Login appeared to succeed but API access failed (${verifyErr.response?.status || verifyErr.code}). The account may lack API read permissions.`,
      };
    }
  } catch (err: any) {
    console.error("[FortiGate] Login error:", {
      status: err.response?.status,
      code: err.code,
      message: err.message,
    });

    if (err.code === "ECONNREFUSED") return { ok: false, message: "Connection refused — check host and port" };
    if (err.code === "ENOTFOUND") return { ok: false, message: "Host not found — check hostname" };
    if (err.code === "ECONNRESET") return { ok: false, message: "Connection reset — port may be wrong or blocked" };
    if (err.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" || err.code === "DEPTH_ZERO_SELF_SIGNED_CERT") {
      return { ok: false, message: "SSL certificate error — uncheck 'Verify SSL'" };
    }
    return { ok: false, message: `Login failed: ${err.code || ""} ${err.message}` };
  }
}

/**
 * Logout from FortiGate (destroy session).
 */
export async function fortiLogout(
  config: FortiGateConfig,
  firewallId: string
): Promise<void> {
  const session = getSession(firewallId);
  if (!session) return;
  try {
    const client = createSessionClient(config, session);
    await client.get("/logout");
  } catch {
    // Best-effort
  }
  clearSession(firewallId);
}

// ─── Axios Client Factory ──────────────────────────────────

function createSessionClient(
  config: FortiGateConfig,
  session: SessionInfo
): AxiosInstance {
  const headers: Record<string, string> = {
    Cookie: session.cookies,
  };
  if (session.csrfToken) {
    headers["X-CSRFTOKEN"] = session.csrfToken;
  }
  return axios.create({
    baseURL: `https://${config.host}:${config.port}`,
    httpsAgent: new https.Agent({ rejectUnauthorized: config.verifySsl }),
    timeout: 15_000,
    headers,
  });
}

export interface SystemStatus {
  hostname: string;
  serial: string;
  firmware: string;
  uptime: number;
  model: string;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  disk: number;
  session: number;
  setupRate: number;
}

export interface InterfaceStat {
  name: string;
  alias: string;
  status: "up" | "down";
  ip: string;
  speed: number;
  txBytes: number;
  rxBytes: number;
  txPackets: number;
  rxPackets: number;
}

export interface VpnConnection {
  name: string;
  type: "ipsec" | "ssl";
  status: "up" | "down";
  remoteGateway: string;
  inBytes: number;
  outBytes: number;
  uptime: number;
  username?: string;
}

export interface FirewallPolicy {
  policyid: number;
  name: string;
  srcintf: string;
  dstintf: string;
  srcaddr: string;
  dstaddr: string;
  action: "accept" | "deny";
  service: string;
  status: "enable" | "disable";
  hitCount: number;
  bytes: number;
}

export interface TrafficLog {
  date: string;
  time: string;
  srcip: string;
  dstip: string;
  srcport: number;
  dstport: number;
  proto: number;
  action: string;
  service: string;
  sentbyte: number;
  rcvdbyte: number;
  threat?: string;
  level?: string;
}

// ─── FortiGate Data Client (session-based) ─────────────────

export class FortiGateClient {
  private client: AxiosInstance;
  private firewallId: string;

  constructor(config: FortiGateConfig, firewallId: string) {
    this.firewallId = firewallId;

    const session = getSession(firewallId);
    if (!session) {
      throw new Error("NO_SESSION");
    }

    this.client = createSessionClient(config, session);
  }

  // ─── System ──────────────────────────────────────────────

  async getSystemStatus(): Promise<SystemStatus> {
    const cacheKey = `fw:${this.firewallId}:system-status`;
    const cached = cache.get<SystemStatus>(cacheKey);
    if (cached) return cached;

    const { data } = await this.client.get("/api/v2/monitor/system/status");
    const result: SystemStatus = {
      hostname: data.results?.hostname || data.hostname || "unknown",
      serial: data.results?.serial || data.serial || "unknown",
      firmware: data.results?.firmware_version || data.version || "unknown",
      uptime: data.results?.uptime || data.uptime || 0,
      model: data.results?.model || data.model_name || "unknown",
    };
    cache.set(cacheKey, result, 60);
    return result;
  }

  async getResourceUsage(): Promise<ResourceUsage> {
    const cacheKey = `fw:${this.firewallId}:resources`;
    const cached = cache.get<ResourceUsage>(cacheKey);
    if (cached) return cached;

    const { data } = await this.client.get(
      "/api/v2/monitor/system/resource/usage?interval=1-min&resource=cpu,mem,disk,session,setuprate"
    );

    const results = data.results || {};
    const cpu = results.cpu?.[results.cpu.length - 1]?.current ?? 0;
    const mem = results.mem?.[results.mem.length - 1]?.current ?? 0;
    const disk = results.disk?.[results.disk.length - 1]?.current ?? 0;
    const session = results.session?.[results.session.length - 1]?.current ?? 0;
    const setupRate = results.setuprate?.[results.setuprate.length - 1]?.current ?? 0;

    const result: ResourceUsage = { cpu, memory: mem, disk, session, setupRate };
    cache.set(cacheKey, result, 10);
    return result;
  }

  // ─── Interfaces ──────────────────────────────────────────

  async getInterfaces(): Promise<InterfaceStat[]> {
    const cacheKey = `fw:${this.firewallId}:interfaces`;
    const cached = cache.get<InterfaceStat[]>(cacheKey);
    if (cached) return cached;

    const { data } = await this.client.get(
      "/api/v2/monitor/system/interface?include_vlan=true&include_aggregate=true"
    );

    const results: InterfaceStat[] = (data.results || []).map((iface: any) => ({
      name: iface.name,
      alias: iface.alias || iface.name,
      status: iface.link ? "up" : "down",
      ip: iface.ip || "N/A",
      speed: iface.speed || 0,
      txBytes: iface.tx_bytes || 0,
      rxBytes: iface.rx_bytes || 0,
      txPackets: iface.tx_packets || 0,
      rxPackets: iface.rx_packets || 0,
    }));
    cache.set(cacheKey, results, 15);
    return results;
  }

  // ─── VPN ─────────────────────────────────────────────────

  async getVpnConnections(): Promise<VpnConnection[]> {
    const cacheKey = `fw:${this.firewallId}:vpn`;
    const cached = cache.get<VpnConnection[]>(cacheKey);
    if (cached) return cached;

    const connections: VpnConnection[] = [];

    try {
      const { data: ipsec } = await this.client.get("/api/v2/monitor/vpn/ipsec");
      for (const tunnel of ipsec.results || []) {
        for (const p2 of tunnel.proxyid || []) {
          connections.push({
            name: tunnel.name,
            type: "ipsec",
            status: p2.status === "up" ? "up" : "down",
            remoteGateway: tunnel.rgwy || "N/A",
            inBytes: p2.incoming_bytes || 0,
            outBytes: p2.outgoing_bytes || 0,
            uptime: p2.expire || 0,
          });
        }
      }
    } catch {
      // IPSec might not be configured
    }

    try {
      const { data: ssl } = await this.client.get("/api/v2/monitor/vpn/ssl");
      for (const user of ssl.results || []) {
        connections.push({
          name: user.subsessions?.[0]?.aip || "SSL-VPN",
          type: "ssl",
          status: "up",
          remoteGateway: user.remote_host || "N/A",
          inBytes: user.subsessions?.[0]?.in_bytes || 0,
          outBytes: user.subsessions?.[0]?.out_bytes || 0,
          uptime: user.subsessions?.[0]?.duration || 0,
          username: user.user_name,
        });
      }
    } catch {
      // SSL VPN might not be configured
    }

    cache.set(cacheKey, connections, 15);
    return connections;
  }

  // ─── Firewall Policies ───────────────────────────────────

  async getPolicies(): Promise<FirewallPolicy[]> {
    const cacheKey = `fw:${this.firewallId}:policies`;
    const cached = cache.get<FirewallPolicy[]>(cacheKey);
    if (cached) return cached;

    const { data } = await this.client.get("/api/v2/cmdb/firewall/policy");

    const results: FirewallPolicy[] = (data.results || []).map((p: any) => ({
      policyid: p.policyid,
      name: p.name || `Policy ${p.policyid}`,
      srcintf: (p.srcintf || []).map((i: any) => i.name).join(", "),
      dstintf: (p.dstintf || []).map((i: any) => i.name).join(", "),
      srcaddr: (p.srcaddr || []).map((a: any) => a.name).join(", "),
      dstaddr: (p.dstaddr || []).map((a: any) => a.name).join(", "),
      action: p.action === "accept" ? "accept" : "deny",
      service: (p.service || []).map((s: any) => s.name).join(", "),
      status: p.status || "enable",
      hitCount: p["hit-count"] || 0,
      bytes: p.bytes || 0,
    }));
    cache.set(cacheKey, results, 120);
    return results;
  }

  // ─── Logs ────────────────────────────────────────────────

  async getTrafficLogs(rows: number = 100): Promise<TrafficLog[]> {
    const cacheKey = `fw:${this.firewallId}:traffic-logs:${rows}`;
    const cached = cache.get<TrafficLog[]>(cacheKey);
    if (cached) return cached;

    const { data } = await this.client.get(
      `/api/v2/log/memory/traffic/forward?rows=${rows}&start=0`
    );

    const results: TrafficLog[] = (data.results || []).map((l: any) => ({
      date: l.date || "",
      time: l.time || "",
      srcip: l.srcip || "",
      dstip: l.dstip || "",
      srcport: l.srcport || 0,
      dstport: l.dstport || 0,
      proto: l.proto || 0,
      action: l.action || "",
      service: l.service || "",
      sentbyte: l.sentbyte || 0,
      rcvdbyte: l.rcvdbyte || 0,
      threat: l.threat || undefined,
      level: l.level || undefined,
    }));
    cache.set(cacheKey, results, 30);
    return results;
  }

  async getSecurityLogs(rows: number = 100): Promise<TrafficLog[]> {
    const cacheKey = `fw:${this.firewallId}:security-logs:${rows}`;
    const cached = cache.get<TrafficLog[]>(cacheKey);
    if (cached) return cached;

    try {
      const { data } = await this.client.get(
        `/api/v2/log/memory/utm/ips?rows=${rows}&start=0`
      );

      const results: TrafficLog[] = (data.results || []).map((l: any) => ({
        date: l.date || "",
        time: l.time || "",
        srcip: l.srcip || "",
        dstip: l.dstip || "",
        srcport: l.srcport || 0,
        dstport: l.dstport || 0,
        proto: l.proto || 0,
        action: l.action || "",
        service: l.service || "",
        sentbyte: l.sentbyte || 0,
        rcvdbyte: l.rcvdbyte || 0,
        threat: l.attack || l.threat || undefined,
        level: l.level || undefined,
      }));
      cache.set(cacheKey, results, 30);
      return results;
    } catch {
      return [];
    }
  }
}
