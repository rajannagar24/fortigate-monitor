/**
 * Firewall CRUD routes.
 * Manages FortiGate devices in the local SQLite database.
 */

import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb, FirewallRecord } from "../database";
import { FortiGateClient } from "../services/fortigate";
import { cache } from "../services/cache";

const router = Router();

// GET /api/firewalls - List all firewalls
router.get("/", (_req: Request, res: Response) => {
  const db = getDb();
  const firewalls = db.prepare("SELECT * FROM firewalls ORDER BY created_at DESC").all() as FirewallRecord[];
  // Never send tokens to the frontend
  const safe = firewalls.map(({ api_token, ...fw }) => ({
    ...fw,
    hasToken: true,
  }));
  res.json(safe);
});

// GET /api/firewalls/:id - Get single firewall
router.get("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const fw = db.prepare("SELECT * FROM firewalls WHERE id = ?").get(req.params.id) as FirewallRecord | undefined;
  if (!fw) return res.status(404).json({ error: "Firewall not found" });
  const { api_token, ...safe } = fw;
  res.json({ ...safe, hasToken: true });
});

// POST /api/firewalls - Add a new firewall
router.post("/", async (req: Request, res: Response) => {
  const { name, host, port = 443, apiToken, verifySsl = false } = req.body;

  if (!name || !host || !apiToken) {
    return res.status(400).json({ error: "name, host, and apiToken are required" });
  }

  // Test connection first
  const client = new FortiGateClient(
    { host, port, apiToken, verifySsl },
    "test"
  );
  const test = await client.testConnection();
  if (!test.ok) {
    return res.status(400).json({ error: test.message });
  }

  const id = uuidv4();
  const db = getDb();
  db.prepare(
    "INSERT INTO firewalls (id, name, host, port, api_token, verify_ssl) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, name, host, port, apiToken, verifySsl ? 1 : 0);

  res.status(201).json({
    id,
    name,
    host,
    port,
    verify_ssl: verifySsl ? 1 : 0,
    hasToken: true,
    connectionMessage: test.message,
  });
});

// PUT /api/firewalls/:id - Update a firewall
router.put("/:id", async (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM firewalls WHERE id = ?").get(req.params.id) as FirewallRecord | undefined;
  if (!existing) return res.status(404).json({ error: "Firewall not found" });

  const { name, host, port, apiToken, verifySsl } = req.body;
  const updatedName = name ?? existing.name;
  const updatedHost = host ?? existing.host;
  const updatedPort = port ?? existing.port;
  const updatedToken = apiToken ?? existing.api_token;
  const updatedSsl = verifySsl !== undefined ? (verifySsl ? 1 : 0) : existing.verify_ssl;

  // Test new connection
  const client = new FortiGateClient(
    {
      host: updatedHost,
      port: updatedPort,
      apiToken: updatedToken,
      verifySsl: updatedSsl === 1,
    },
    req.params.id
  );
  const test = await client.testConnection();
  if (!test.ok) {
    return res.status(400).json({ error: test.message });
  }

  db.prepare(
    `UPDATE firewalls SET name=?, host=?, port=?, api_token=?, verify_ssl=?, updated_at=datetime('now') WHERE id=?`
  ).run(updatedName, updatedHost, updatedPort, updatedToken, updatedSsl, req.params.id);

  cache.invalidateFirewall(req.params.id);

  res.json({ id: req.params.id, name: updatedName, host: updatedHost, port: updatedPort, connectionMessage: test.message });
});

// DELETE /api/firewalls/:id - Remove a firewall
router.delete("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const result = db.prepare("DELETE FROM firewalls WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Firewall not found" });
  cache.invalidateFirewall(req.params.id);
  res.json({ success: true });
});

// POST /api/firewalls/:id/test - Test connection
router.post("/:id/test", async (req: Request, res: Response) => {
  const db = getDb();
  const fw = db.prepare("SELECT * FROM firewalls WHERE id = ?").get(req.params.id) as FirewallRecord | undefined;
  if (!fw) return res.status(404).json({ error: "Firewall not found" });

  const client = new FortiGateClient(
    {
      host: fw.host,
      port: fw.port,
      apiToken: fw.api_token,
      verifySsl: fw.verify_ssl === 1,
    },
    fw.id
  );
  const test = await client.testConnection();
  res.json(test);
});

export default router;
