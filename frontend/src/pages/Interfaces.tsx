import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { getInterfaces } from "../services/api";
import type { InterfaceStat } from "../types";

export default function Interfaces() {
  const { firewallId } = useParams<{ firewallId: string }>();
  const [interfaces, setInterfaces] = useState<InterfaceStat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!firewallId) return;
    try {
      const data = await getInterfaces(firewallId);
      setInterfaces(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15_000);
    return () => clearInterval(interval);
  }, [firewallId]);

  const formatBytes = (bytes: number) => {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`;
    if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Network Interfaces</h1>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left p-4 font-medium">Interface</th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-left p-4 font-medium">IP</th>
              <th className="text-left p-4 font-medium">Speed</th>
              <th className="text-right p-4 font-medium">TX</th>
              <th className="text-right p-4 font-medium">RX</th>
              <th className="text-right p-4 font-medium">Packets TX</th>
              <th className="text-right p-4 font-medium">Packets RX</th>
            </tr>
          </thead>
          <tbody>
            {interfaces.map((iface) => (
              <tr
                key={iface.name}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30"
              >
                <td className="p-4 font-medium">
                  {iface.alias || iface.name}
                  {iface.alias && iface.alias !== iface.name && (
                    <span className="text-xs text-gray-400 ml-1">({iface.name})</span>
                  )}
                </td>
                <td className="p-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      iface.status === "up"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        iface.status === "up" ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    {iface.status.toUpperCase()}
                  </span>
                </td>
                <td className="p-4 font-mono text-xs">{iface.ip}</td>
                <td className="p-4">{iface.speed ? `${iface.speed} Mbps` : "-"}</td>
                <td className="p-4 text-right font-mono">{formatBytes(iface.txBytes)}</td>
                <td className="p-4 text-right font-mono">{formatBytes(iface.rxBytes)}</td>
                <td className="p-4 text-right">{iface.txPackets.toLocaleString()}</td>
                <td className="p-4 text-right">{iface.rxPackets.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {interfaces.length === 0 && (
          <p className="text-center text-gray-400 py-8">No interfaces found</p>
        )}
      </div>
    </div>
  );
}
