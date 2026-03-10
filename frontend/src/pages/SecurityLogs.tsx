import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { getSecurityLogs } from "../services/api";
import type { TrafficLog } from "../types";

export default function SecurityLogs() {
  const { firewallId } = useParams<{ firewallId: string }>();
  const [logs, setLogs] = useState<TrafficLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const fetchData = async () => {
    if (!firewallId) return;
    try {
      const data = await getSecurityLogs(firewallId, 200);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [firewallId]);

  const filtered = filter
    ? logs.filter(
        (l) =>
          l.srcip.includes(filter) ||
          l.dstip.includes(filter) ||
          (l.threat || "").toLowerCase().includes(filter.toLowerCase()) ||
          l.action.toLowerCase().includes(filter.toLowerCase())
      )
    : logs;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Security Logs</h1>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Filter by IP, threat, action..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm w-64 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {logs.length === 0 && !filter ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <AlertTriangle className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h2 className="text-xl font-bold mb-2">No Security Events</h2>
          <p className="text-gray-500 dark:text-gray-400">
            IPS/IDS events and threat detections will appear here
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left p-3 font-medium">Date/Time</th>
                <th className="text-left p-3 font-medium">Source</th>
                <th className="text-left p-3 font-medium">Destination</th>
                <th className="text-left p-3 font-medium">Threat</th>
                <th className="text-left p-3 font-medium">Level</th>
                <th className="text-left p-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                >
                  <td className="p-3 whitespace-nowrap text-gray-500">
                    {l.date} {l.time}
                  </td>
                  <td className="p-3 font-mono">{l.srcip}</td>
                  <td className="p-3 font-mono">{l.dstip}</td>
                  <td className="p-3 font-medium text-red-500">{l.threat || "-"}</td>
                  <td className="p-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        l.level === "critical"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : l.level === "high"
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                          : l.level === "medium"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {l.level || "info"}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        l.action === "dropped" || l.action === "blocked"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}
                    >
                      {l.action}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-8">No logs match your filter</p>
          )}
        </div>
      )}
    </div>
  );
}
