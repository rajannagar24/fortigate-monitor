import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { RefreshCw, Lock, Globe } from "lucide-react";
import { getVpn } from "../services/api";
import type { VpnConnection } from "../types";

export default function VpnMonitor() {
  const { firewallId } = useParams<{ firewallId: string }>();
  const [vpn, setVpn] = useState<VpnConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!firewallId) return;
    try {
      const data = await getVpn(firewallId);
      setVpn(data);
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

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
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
        <h1 className="text-2xl font-bold">VPN Connections</h1>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {vpn.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <Lock className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h2 className="text-xl font-bold mb-2">No Active VPN Connections</h2>
          <p className="text-gray-500 dark:text-gray-400">
            VPN tunnels will appear here when active
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vpn.map((v, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {v.type === "ssl" ? (
                    <Lock className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Globe className="w-4 h-4 text-purple-600" />
                  )}
                  <h3 className="font-bold">{v.name}</h3>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    v.status === "up"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {v.status.toUpperCase()}
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Type</span>
                  <span className="font-medium">{v.type.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Remote</span>
                  <span className="font-mono text-xs">{v.remoteGateway}</span>
                </div>
                {v.username && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">User</span>
                    <span>{v.username}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">In</span>
                  <span className="font-mono">{formatBytes(v.inBytes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Out</span>
                  <span className="font-mono">{formatBytes(v.outBytes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Duration</span>
                  <span>{formatDuration(v.uptime)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
