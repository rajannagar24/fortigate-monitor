import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { getPolicies } from "../services/api";
import type { FirewallPolicy } from "../types";

export default function Policies() {
  const { firewallId } = useParams<{ firewallId: string }>();
  const [policies, setPolicies] = useState<FirewallPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!firewallId) return;
    try {
      const data = await getPolicies(firewallId);
      setPolicies(data);
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
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
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
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Firewall Policies</h1>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left p-3 font-medium">ID</th>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Src Intf</th>
              <th className="text-left p-3 font-medium">Dst Intf</th>
              <th className="text-left p-3 font-medium">Source</th>
              <th className="text-left p-3 font-medium">Destination</th>
              <th className="text-left p-3 font-medium">Service</th>
              <th className="text-left p-3 font-medium">Action</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-right p-3 font-medium">Hits</th>
              <th className="text-right p-3 font-medium">Bytes</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr
                key={p.policyid}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30"
              >
                <td className="p-3 font-mono">{p.policyid}</td>
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3">{p.srcintf}</td>
                <td className="p-3">{p.dstintf}</td>
                <td className="p-3 text-xs">{p.srcaddr}</td>
                <td className="p-3 text-xs">{p.dstaddr}</td>
                <td className="p-3 text-xs">{p.service}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.action === "accept"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {p.action.toUpperCase()}
                  </span>
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.status === "enable"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="p-3 text-right font-mono">{p.hitCount.toLocaleString()}</td>
                <td className="p-3 text-right font-mono">{formatBytes(p.bytes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {policies.length === 0 && (
          <p className="text-center text-gray-400 py-8">No policies found</p>
        )}
      </div>
    </div>
  );
}
