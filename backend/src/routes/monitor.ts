/**
 * Monitoring routes.
 * Fetches real-time data from a specific FortiGate firewall.
 */

import { Router, Request, Response } from "express";
import { getDb, FirewallRecord } from "../database";
import { FortiGateClient } from "../services/fortigate";

const router = Router();

/** Helper: get FortiGateClient for a firewall ID */
function getClient(firewallId: string): FortiGateClient | null {
  const db = getDb();
  const fw = db
    .prepare("SELECT * FROM firewalls WHERE id = ?")
    .get(firewallId) as FirewallRecord | undefined;
  if (!fw) return null;

  return new FortiGateClient(
    {
      host: fw.host,
      port: fw.port,
      apiToken: fw.api_token,
      verifySsl: fw.verify_ssl === 1,
    },
    fw.id
  );
}

// GET /api/monitor/:firewallId/overview
// Returns all dashboard data in one call for efficiency
router.get("/:firewallId/overview", async (req: Request, res: Response) => {
  const client = getClient(req.params.firewallId);
  if (!client) return res.status(404).json({ error: "Firewall not found" });

  try {
    const [systemStatus, resources, interfaces, vpn] = await Promise.all([
      client.getSystemStatus(),
      client.getResourceUsage(),
      client.getInterfaces(),
      client.getVpnConnections(),
    ]);

    res.json({
      systemStatus,
      resources,
      interfaces,
      vpn,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(502).json({
      error: "Failed to fetch data from FortiGate",
      details: err.message,
    });
  }
});

// GET /api/monitor/:firewallId/resources
router.get("/:firewallId/resources", async (req: Request, res: Response) => {
  const client = getClient(req.params.firewallId);
  if (!client) return res.status(404).json({ error: "Firewall not found" });

  try {
    const resources = await client.getResourceUsage();
    res.json(resources);
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/monitor/:firewallId/interfaces
router.get("/:firewallId/interfaces", async (req: Request, res: Response) => {
  const client = getClient(req.params.firewallId);
  if (!client) return res.status(404).json({ error: "Firewall not found" });

  try {
    const interfaces = await client.getInterfaces();
    res.json(interfaces);
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/monitor/:firewallId/vpn
router.get("/:firewallId/vpn", async (req: Request, res: Response) => {
  const client = getClient(req.params.firewallId);
  if (!client) return res.status(404).json({ error: "Firewall not found" });

  try {
    const vpn = await client.getVpnConnections();
    res.json(vpn);
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/monitor/:firewallId/policies
router.get("/:firewallId/policies", async (req: Request, res: Response) => {
  const client = getClient(req.params.firewallId);
  if (!client) return res.status(404).json({ error: "Firewall not found" });

  try {
    const policies = await client.getPolicies();
    res.json(policies);
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/monitor/:firewallId/logs/traffic
router.get("/:firewallId/logs/traffic", async (req: Request, res: Response) => {
  const client = getClient(req.params.firewallId);
  if (!client) return res.status(404).json({ error: "Firewall not found" });

  const rows = parseInt(req.query.rows as string) || 100;
  try {
    const logs = await client.getTrafficLogs(rows);
    res.json(logs);
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/monitor/:firewallId/logs/security
router.get("/:firewallId/logs/security", async (req: Request, res: Response) => {
  const client = getClient(req.params.firewallId);
  if (!client) return res.status(404).json({ error: "Firewall not found" });

  const rows = parseInt(req.query.rows as string) || 100;
  try {
    const logs = await client.getSecurityLogs(rows);
    res.json(logs);
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

export default router;
