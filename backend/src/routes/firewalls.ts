/**
 * Firewall CRUD + Authentication routes.
 * Firewalls are saved (host/port/name) but credentials are NOT stored.
 * Users must log in each session with their FortiGate username + password.
 */

import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  getAllFirewalls,
  getFirewallById,
  insertFirewall,
  updateFirewallRecord,
  deleteFirewallRecord,
} from "../database";
import {
  fortiLogin,
  fortiLogout,
  hasActiveSession,
  getSession,
  FortiGateClient,
} from "../services/fortigate";
import { cache } from "../services/cache";

const router = Router();

// GET /api/firewalls - List all firewalls with session status
router.get("/", (_req: Request, res: Response) => {
  const firewalls = getAllFirewalls();
  const result = firewalls.map((fw) => ({
    ...fw,
    authenticated: hasActiveSession(fw.id),
  }));
  res.json(result);
});

// GET /api/firewalls/:id - Get single firewall with session status
router.get("/:id", (req: Request, res: Response) => {
  const fw = getFirewallById(req.params.id);
  if (!fw) return res.status(404).json({ error: "Firewall not found" });
  res.json({ ...fw, authenticated: hasActiveSession(fw.id) });
});

// POST /api/firewalls - Add a new firewall (just saves host/port/name, no auth)
router.post("/", async (req: Request, res: Response) => {
  const { name, host, port = 443, verifySsl = false } = req.body;

  if (!name || !host) {
    return res.status(400).json({ error: "name and host are required" });
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  insertFirewall({
    id,
    name,
    host,
    port,
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
    authenticated: false,
    created_at: now,
    updated_at: now,
  });
});

// PUT /api/firewalls/:id - Update firewall connection details
router.put("/:id", async (req: Request, res: Response) => {
  const existing = getFirewallById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Firewall not found" });

  const { name, host, port, verifySsl } = req.body;

  updateFirewallRecord(req.params.id, {
    name: name ?? existing.name,
    host: host ?? existing.host,
    port: port ?? existing.port,
    verify_ssl: verifySsl !== undefined ? (verifySsl ? 1 : 0) : existing.verify_ssl,
    updated_at: new Date().toISOString(),
  });

  cache.invalidateFirewall(req.params.id);
  const updated = getFirewallById(req.params.id)!;
  res.json({ ...updated, authenticated: hasActiveSession(req.params.id) });
});

// DELETE /api/firewalls/:id - Remove a firewall
router.delete("/:id", async (req: Request, res: Response) => {
  const fw = getFirewallById(req.params.id);
  if (fw) {
    // Logout from FortiGate if session is active
    await fortiLogout({ host: fw.host, port: fw.port, verifySsl: fw.verify_ssl === 1 }, fw.id);
  }
  const deleted = deleteFirewallRecord(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Firewall not found" });
  cache.invalidateFirewall(req.params.id);
  res.json({ success: true });
});

// ─── Authentication ────────────────────────────────────────

// POST /api/firewalls/:id/login - Authenticate to a firewall
router.post("/:id/login", async (req: Request, res: Response) => {
  const fw = getFirewallById(req.params.id);
  if (!fw) return res.status(404).json({ error: "Firewall not found" });

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ ok: false, message: "Username and password are required" });
  }

  const result = await fortiLogin(
    { host: fw.host, port: fw.port, verifySsl: fw.verify_ssl === 1 },
    { username, password },
    fw.id
  );

  if (result.ok) {
    res.json({ ok: true, message: result.message });
  } else {
    res.status(401).json({ ok: false, message: result.message });
  }
});

// POST /api/firewalls/:id/logout - End session
router.post("/:id/logout", async (req: Request, res: Response) => {
  const fw = getFirewallById(req.params.id);
  if (!fw) return res.status(404).json({ error: "Firewall not found" });

  await fortiLogout(
    { host: fw.host, port: fw.port, verifySsl: fw.verify_ssl === 1 },
    fw.id
  );
  cache.invalidateFirewall(fw.id);
  res.json({ ok: true, message: "Logged out" });
});

// GET /api/firewalls/:id/session - Check session status
router.get("/:id/session", (req: Request, res: Response) => {
  const fw = getFirewallById(req.params.id);
  if (!fw) return res.status(404).json({ error: "Firewall not found" });

  const session = getSession(fw.id);
  res.json({
    authenticated: !!session,
    expiresAt: session?.expiresAt || null,
    remainingMs: session ? Math.max(0, session.expiresAt - Date.now()) : 0,
  });
});

// POST /api/firewalls/quick-login - Test login without saving firewall
router.post("/quick-login", async (req: Request, res: Response) => {
  const { host, port = 443, username, password, verifySsl = false } = req.body;
  if (!host || !username || !password) {
    return res.status(400).json({ ok: false, message: "host, username, and password are required" });
  }

  const result = await fortiLogin(
    { host, port, verifySsl },
    { username, password },
    "quicktest"
  );

  res.json({ ok: result.ok, message: result.message });
});

export default router;
