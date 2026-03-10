/**
 * Firewall CRUD routes.
 * Manages FortiGate devices in a local JSON file database.
 */

import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  getAllFirewalls,
  getFirewallById,
  insertFirewall,
  updateFirewallRecord,
  deleteFirewallRecord,
  FirewallRecord,
} from "../database";
import { FortiGateClient } from "../services/fortigate";
import { cache } from "../services/cache";

const router = Router();

// GET /api/firewalls - List all firewalls
router.get("/", (_req: Request, res: Response) => {
  const firewalls = getAllFirewalls();
  // Never send tokens to the frontend
  const safe = firewalls.map(({ api_token, ...fw }) => ({
    ...fw,
    hasToken: true,
  }));
  res.json(safe);
});

// GET /api/firewalls/:id - Get single firewall
router.get("/:id", (req: Request, res: Response) => {
  const fw = getFirewallById(req.params.id);
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
  const now = new Date().toISOString();
  insertFirewall({
    id,
    name,
    host,
    port,
    api_token: apiToken,
    verify_ssl: verifySsl ? 1 : 0,
    created_at: now,
    updated_at: now,
  });

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
  const existing = getFirewallById(req.params.id);
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

  updateFirewallRecord(req.params.id, {
    name: updatedName,
    host: updatedHost,
    port: updatedPort,
    api_token: updatedToken,
    verify_ssl: updatedSsl,
    updated_at: new Date().toISOString(),
  });

  cache.invalidateFirewall(req.params.id);

  res.json({ id: req.params.id, name: updatedName, host: updatedHost, port: updatedPort, connectionMessage: test.message });
});

// DELETE /api/firewalls/:id - Remove a firewall
router.delete("/:id", (req: Request, res: Response) => {
  const deleted = deleteFirewallRecord(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Firewall not found" });
  cache.invalidateFirewall(req.params.id);
  res.json({ success: true });
});

// POST /api/firewalls/:id/test - Test connection
router.post("/:id/test", async (req: Request, res: Response) => {
  const fw = getFirewallById(req.params.id);
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
