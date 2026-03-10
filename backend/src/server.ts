/**
 * Express server entry point.
 * Starts the backend API for FortiGate monitoring dashboard.
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import firewallRoutes from "./routes/firewalls";
import monitorRoutes from "./routes/monitor";
import { getDb } from "./database";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "4000", 10);

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/firewalls", firewallRoutes);
app.use("/api/monitor", monitorRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Initialize DB and start server
getDb();
console.log("Database initialized");

app.listen(PORT, () => {
  console.log(`\n🛡️  FortiGate Monitor Backend running on http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
