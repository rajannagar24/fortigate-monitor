import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import FirewallList from "./pages/FirewallList";
import Dashboard from "./pages/Dashboard";
import Interfaces from "./pages/Interfaces";
import VpnMonitor from "./pages/VpnMonitor";
import Policies from "./pages/Policies";
import TrafficLogs from "./pages/TrafficLogs";
import SecurityLogs from "./pages/SecurityLogs";

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Sidebar darkMode={darkMode} onToggleDark={() => setDarkMode(!darkMode)} />
      <main className="flex-1 overflow-auto p-6">
        <Routes>
          <Route path="/" element={<FirewallList />} />
          <Route path="/dashboard/:firewallId" element={<Dashboard />} />
          <Route path="/interfaces/:firewallId" element={<Interfaces />} />
          <Route path="/vpn/:firewallId" element={<VpnMonitor />} />
          <Route path="/policies/:firewallId" element={<Policies />} />
          <Route path="/logs/traffic/:firewallId" element={<TrafficLogs />} />
          <Route path="/logs/security/:firewallId" element={<SecurityLogs />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
