/**
 * Monitoring routes.
 * Fetches real-time data from a specific FortiGate firewall.
 * Requires an active session (user must be logged in).
 */

import { Router, Request, Response } from "express";
import { getFirewallById } from "../database";
import { FortiGateClient, hasActiveSession } from "../services/fortigate";

const router = Router();

/** Helper: get FortiGateClient for a firewall ID (session-based). */
function getClient(firewallId: string): { client: FortiGateClient } | { error: string; status: number } {
  const fw = getFirewallById(firewallId);
  if (!fw) return { error: "Firewall not found", status: 404 };

  if (!hasActiveSession(firewallId)) {
    return { error: "Session expired — please log in again", status: 401 };
  }

  try {
    const client = new FortiGateClient(
      { host: fw.host, port: fw.port, verifySsl: fw.verify_ssl === 1 },
      fw.id
    );
    return { client };
  } catch (err: any) {
    if (err.message === "NO_SESSION") {
      return { error: "Session expired — please log in again", status: 401 };
    }
    return { error: err.message, status: 500 };
  }
}

// GET /api/monitor/:firewallId/overview
router.get("/:firewallId/overview", async (req: Request, res: Response) => {
  const result = getClient(req.params.firewallId);
  if ("error" in result) return res.status(result.status).json({ error: result.error });

  try {
    const [systemStatus, resources, interfaces, vpn] = await Promise.all([
      result.client.getSystemStatus(),
      result.client.getResourceUsage(),
      result.client.getInterfaces(),
      result.client.getVpnConnections(),
    ]);

    res.json({ systemStatus, resources, interfaces, vpn, timestamp: new Date().toISOString() });
  } catch (err: any) {
    if (err.response?.status === 401) {
      return res.status(401).json({ error: "Session expired — please log in again" });
    }
    res.status(502).json({ error: "Failed to fetch data from FortiGate", details: err.message });
  }
});

// GET /api/monitor/:firewallId/resources
router.get("/:firewallId/resources", async (req: Request, res: Response) => {
  const result = getClient(req.params.firewallId);
  if ("error" in result) return res.status(result.status).json({ error: result.error });

  try {
    res.json(await result.client.getResourceUsage());
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/monitor/:firewallId/interfaces
router.get("/:firewallId/interfaces", async (req: Request, res: Response) => {
  const result = getClient(req.params.firewallId);
  if ("error" in result) return res.status(result.status).json({ error: result.error });

  try {
    res.json(await result.client.getInterfaces());
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/monitor/:firewallId/vpn
router.get("/:firewallId/vpn", async (req: Request, res: Response) => {
  const result = getClient(req.params.firewallId);
  if ("error" in result) return res.status(result.status).json({ error: result.error });

  try {
    res.json(await result.client.getVpnConnections());
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/monitor/:firewallId/policies
router.get("/:firewallId/policies", async (req: Request, res: Response) => {
  const result = getClient(req.params.firewallId);
  if ("error" in result) return res.status(result.status).json({ error: result.error });

  try {
    res.json(await result.client.getPolicies());
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/monitor/:firewallId/logs/traffic
router.get("/:firewallId/logs/traffic", async (req: Request, res: Response) => {
  const result = getClient(req.params.firewallId);
  if ("error" in result) return res.status(result.status).json({ error: result.error });

  const rows = parseInt(req.query.rows as string) || 100;
  try {
    res.json(await result.client.getTrafficLogs(rows));
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/monitor/:firewallId/logs/security
router.get("/:firewallId/logs/security", async (req: Request, res: Response) => {
  const result = getClient(req.params.firewallId);
  if ("error" in result) return res.status(result.status).json({ error: result.error });

  const rows = parseInt(req.query.rows as string) || 100;
  try {
    res.json(await result.client.getSecurityLogs(rows));
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

export default router;
