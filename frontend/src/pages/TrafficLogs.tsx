import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { getTrafficLogs } from "../services/api";
import type { TrafficLog } from "../types";

export default function TrafficLogs() {
  const { firewallId } = useParams<{ firewallId: string }>();
  const [logs, setLogs] = useState<TrafficLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const fetchData = async () => {
    if (!firewallId) return;
    try {
      const data = await getTrafficLogs(firewallId, 200);
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

  const formatBytes = (bytes: number) => {
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
    if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const filtered = filter
    ? logs.filter(
        (l) =>
          l.srcip.includes(filter) ||
          l.dstip.includes(filter) ||
          l.action.toLowerCase().includes(filter.toLowerCase()) ||
          l.service.toLowerCase().includes(filter.toLowerCase())
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
        <h1 className="text-2xl font-bold">Traffic Logs</h1>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Filter by IP, action, service..."
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

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left p-3 font-medium">Date/Time</th>
              <th className="text-left p-3 font-medium">Source</th>
              <th className="text-left p-3 font-medium">Destination</th>
              <th className="text-left p-3 font-medium">Service</th>
              <th className="text-left p-3 font-medium">Action</th>
              <th className="text-right p-3 font-medium">Sent</th>
              <th className="text-right p-3 font-medium">Received</th>
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
                <td className="p-3 font-mono">
                  {l.srcip}
                  {l.srcport > 0 && <span className="text-gray-400">:{l.srcport}</span>}
                </td>
                <td className="p-3 font-mono">
                  {l.dstip}
                  {l.dstport > 0 && <span className="text-gray-400">:{l.dstport}</span>}
                </td>
                <td className="p-3">{l.service}</td>
                <td className="p-3">
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      l.action === "accept"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : l.action === "deny" || l.action === "blocked"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {l.action}
                  </span>
                </td>
                <td className="p-3 text-right font-mono">{formatBytes(l.sentbyte)}</td>
                <td className="p-3 text-right font-mono">{formatBytes(l.rcvdbyte)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-8">
            {filter ? "No logs match your filter" : "No traffic logs available"}
          </p>
        )}
      </div>
    </div>
  );
}
