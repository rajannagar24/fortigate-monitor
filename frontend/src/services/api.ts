/** API client for the FortiGate Monitor backend. */

import axios from "axios";
import type {
  Firewall,
  DashboardOverview,
  ResourceUsage,
  InterfaceStat,
  VpnConnection,
  FirewallPolicy,
  TrafficLog,
} from "../types";

const api = axios.create({
  baseURL: "/api",
  timeout: 20_000,
});

// ─── Firewalls CRUD ─────────────────────────────────────────

export async function getFirewalls(): Promise<Firewall[]> {
  const { data } = await api.get("/firewalls");
  return data;
}

export async function addFirewall(payload: {
  name: string;
  host: string;
  port: number;
  apiToken: string;
  verifySsl: boolean;
}): Promise<Firewall & { connectionMessage: string }> {
  const { data } = await api.post("/firewalls", payload);
  return data;
}

export async function updateFirewall(
  id: string,
  payload: Partial<{
    name: string;
    host: string;
    port: number;
    apiToken: string;
    verifySsl: boolean;
  }>
): Promise<any> {
  const { data } = await api.put(`/firewalls/${id}`, payload);
  return data;
}

export async function deleteFirewall(id: string): Promise<void> {
  await api.delete(`/firewalls/${id}`);
}

export async function testFirewall(
  id: string
): Promise<{ ok: boolean; message: string }> {
  const { data } = await api.post(`/firewalls/${id}/test`);
  return data;
}

// ─── Monitoring Data ────────────────────────────────────────

export async function getOverview(
  firewallId: string
): Promise<DashboardOverview> {
  const { data } = await api.get(`/monitor/${firewallId}/overview`);
  return data;
}

export async function getResources(
  firewallId: string
): Promise<ResourceUsage> {
  const { data } = await api.get(`/monitor/${firewallId}/resources`);
  return data;
}

export async function getInterfaces(
  firewallId: string
): Promise<InterfaceStat[]> {
  const { data } = await api.get(`/monitor/${firewallId}/interfaces`);
  return data;
}

export async function getVpn(firewallId: string): Promise<VpnConnection[]> {
  const { data } = await api.get(`/monitor/${firewallId}/vpn`);
  return data;
}

export async function getPolicies(
  firewallId: string
): Promise<FirewallPolicy[]> {
  const { data } = await api.get(`/monitor/${firewallId}/policies`);
  return data;
}

export async function getTrafficLogs(
  firewallId: string,
  rows = 100
): Promise<TrafficLog[]> {
  const { data } = await api.get(
    `/monitor/${firewallId}/logs/traffic?rows=${rows}`
  );
  return data;
}

export async function getSecurityLogs(
  firewallId: string,
  rows = 100
): Promise<TrafficLog[]> {
  const { data } = await api.get(
    `/monitor/${firewallId}/logs/security?rows=${rows}`
  );
  return data;
}
