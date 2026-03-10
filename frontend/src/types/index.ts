/** Shared TypeScript types for the FortiGate Monitor dashboard. */

export interface Firewall {
  id: string;
  name: string;
  host: string;
  port: number;
  verify_ssl: number;
  authenticated: boolean;
  created_at: string;
  updated_at: string;
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

export interface DashboardOverview {
  systemStatus: SystemStatus;
  resources: ResourceUsage;
  interfaces: InterfaceStat[];
  vpn: VpnConnection[];
  timestamp: string;
}

export interface ResourceHistory {
  time: string;
  cpu: number;
  memory: number;
  sessions: number;
}
