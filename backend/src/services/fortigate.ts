/**
 * FortiGate REST API client.
 * Connects to a FortiGate device using its REST API v2.
 *
 * API Reference: https://fndn.fortinet.net (requires FortiNet account)
 * Common endpoints:
 *   /api/v2/monitor/system/resource/usage     - CPU/Mem
 *   /api/v2/monitor/system/interface           - Interface stats
 *   /api/v2/monitor/vpn/ssl                    - SSL VPN
 *   /api/v2/monitor/vpn/ipsec                  - IPSec VPN
 *   /api/v2/monitor/firewall/session           - Active sessions
 *   /api/v2/monitor/log/event                  - Event logs
 *   /api/v2/cmdb/firewall/policy               - Firewall policies
 *   /api/v2/monitor/system/firmware             - Firmware info
 *   /api/v2/monitor/license/status              - License
 */

import axios, { AxiosInstance } from "axios";
import https from "https";
import { cache } from "./cache";

export interface FortiGateConfig {
  host: string;
  port: number;
  apiToken: string;
  verifySsl: boolean;
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

export class FortiGateClient {
  private client: AxiosInstance;
  private firewallId: string;

  constructor(config: FortiGateConfig, firewallId: string) {
    this.firewallId = firewallId;

    this.client = axios.create({
      baseURL: `https://${config.host}:${config.port}`,
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: config.verifySsl,
      }),
      timeout: 15_000,
    });
  }

  // ─── System ──────────────────────────────────────────────

  async getSystemStatus(): Promise<SystemStatus> {
    const cacheKey = `fw:${this.firewallId}:system-status`;
    const cached = cache.get<SystemStatus>(cacheKey);
    if (cached) return cached;

    const { data } = await this.client.get(
      "/api/v2/monitor/system/status"
    );
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
    const session =
      results.session?.[results.session.length - 1]?.current ?? 0;
    const setupRate =
      results.setuprate?.[results.setuprate.length - 1]?.current ?? 0;

    const result: ResourceUsage = {
      cpu,
      memory: mem,
      disk,
      session,
      setupRate,
    };
    cache.set(cacheKey, result, 10); // short TTL for real-time feel
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

    // IPSec VPN
    try {
      const { data: ipsec } = await this.client.get(
        "/api/v2/monitor/vpn/ipsec"
      );
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

    // SSL VPN
    try {
      const { data: ssl } = await this.client.get(
        "/api/v2/monitor/vpn/ssl"
      );
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

    const { data } = await this.client.get(
      "/api/v2/cmdb/firewall/policy"
    );

    const results: FirewallPolicy[] = (data.results || []).map(
      (p: any) => ({
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
      })
    );
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

  // ─── Health Check ────────────────────────────────────────

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const status = await this.getSystemStatus();
      return {
        ok: true,
        message: `Connected to ${status.hostname} (${status.model}) running ${status.firmware}`,
      };
    } catch (err: any) {
      const msg =
        err.response?.status === 401
          ? "Authentication failed - check API token"
          : err.response?.status === 403
          ? "Access denied - check API token permissions"
          : err.code === "ECONNREFUSED"
          ? "Connection refused - check host and port"
          : err.code === "ENOTFOUND"
          ? "Host not found - check hostname/IP"
          : `Connection failed: ${err.message}`;
      return { ok: false, message: msg };
    }
  }
}
