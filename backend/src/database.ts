/**
 * Simple JSON file-based database.
 * No native dependencies — works everywhere Node.js runs.
 */

import fs from "fs";
import path from "path";

const DB_PATH = path.join(__dirname, "..", "data.json");

export interface FirewallRecord {
  id: string;
  name: string;
  host: string;
  port: number;
  api_token: string;
  verify_ssl: number;
  created_at: string;
  updated_at: string;
}

interface DbData {
  firewalls: FirewallRecord[];
}

function readDb(): DbData {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch {
    // Corrupt file — start fresh
  }
  return { firewalls: [] };
}

function writeDb(data: DbData): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function getAllFirewalls(): FirewallRecord[] {
  return readDb().firewalls;
}

export function getFirewallById(id: string): FirewallRecord | undefined {
  return readDb().firewalls.find((fw) => fw.id === id);
}

export function insertFirewall(fw: FirewallRecord): void {
  const data = readDb();
  data.firewalls.push(fw);
  writeDb(data);
}

export function updateFirewallRecord(id: string, updates: Partial<Omit<FirewallRecord, "id">>): boolean {
  const data = readDb();
  const idx = data.firewalls.findIndex((fw) => fw.id === id);
  if (idx === -1) return false;
  data.firewalls[idx] = { ...data.firewalls[idx], ...updates };
  writeDb(data);
  return true;
}

export function deleteFirewallRecord(id: string): boolean {
  const data = readDb();
  const before = data.firewalls.length;
  data.firewalls = data.firewalls.filter((fw) => fw.id !== id);
  if (data.firewalls.length === before) return false;
  writeDb(data);
  return true;
}

// Initialize file if missing
if (!fs.existsSync(DB_PATH)) {
  writeDb({ firewalls: [] });
}
