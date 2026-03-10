import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(__dirname, "..", "fortigate-monitor.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS firewalls (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 443,
      api_token TEXT NOT NULL,
      verify_ssl INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

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
