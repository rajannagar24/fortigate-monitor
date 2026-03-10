import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Cpu,
  HardDrive,
  MemoryStick,
  Activity,
  Zap,
  Clock,
  Server,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { getOverview } from "../services/api";
import StatCard from "../components/StatCard";
import GaugeChart from "../components/GaugeChart";
import type { DashboardOverview, ResourceHistory } from "../types";

export default function Dashboard() {
  const { firewallId } = useParams<{ firewallId: string }>();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [history, setHistory] = useState<ResourceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const intervalRef = useRef<number>();

  const fetchData = async () => {
    if (!firewallId) return;
    try {
      const result = await getOverview(firewallId);
      setData(result);
      setError("");

      // Append to history (keep last 60 points ≈ 10 min at 10s interval)
      setHistory((prev) => {
        const next = [
          ...prev,
          {
            time: new Date().toLocaleTimeString(),
            cpu: result.resources.cpu,
            memory: result.resources.memory,
            sessions: result.resources.session,
          },
        ];
        return next.slice(-60);
      });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = window.setInterval(fetchData, 10_000); // poll every 10s
    return () => clearInterval(intervalRef.current);
  }, [firewallId]);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

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

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Connection Error</h2>
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { systemStatus, resources, interfaces, vpn } = data;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{systemStatus.hostname}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {systemStatus.model} &middot; {systemStatus.firmware} &middot; S/N: {systemStatus.serial}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live &middot; Updated {new Date(data.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="CPU Usage"
          value={`${resources.cpu}%`}
          icon={<Cpu className="w-5 h-5" />}
          color={resources.cpu > 80 ? "red" : resources.cpu > 50 ? "yellow" : "blue"}
        />
        <StatCard
          label="Memory"
          value={`${resources.memory}%`}
          icon={<MemoryStick className="w-5 h-5" />}
          color={resources.memory > 80 ? "red" : resources.memory > 50 ? "yellow" : "green"}
        />
        <StatCard
          label="Disk"
          value={`${resources.disk}%`}
          icon={<HardDrive className="w-5 h-5" />}
          color={resources.disk > 80 ? "red" : "purple"}
        />
        <StatCard
          label="Sessions"
          value={resources.session.toLocaleString()}
          icon={<Activity className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          label="Uptime"
          value={formatUptime(systemStatus.uptime)}
          icon={<Clock className="w-5 h-5" />}
          color="green"
        />
      </div>

      {/* Gauges */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-bold mb-4">System Resources</h2>
        <div className="flex justify-around flex-wrap gap-6">
          <GaugeChart value={resources.cpu} label="CPU" color="#3b82f6" />
          <GaugeChart value={resources.memory} label="Memory" color="#10b981" />
          <GaugeChart value={resources.disk} label="Disk" color="#8b5cf6" />
        </div>
      </div>

      {/* Resource History Chart */}
      {history.length > 1 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-bold mb-4">Resource History</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#f9fafb",
                }}
              />
              <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} name="CPU %" />
              <Area type="monotone" dataKey="memory" stroke="#10b981" fill="#10b981" fillOpacity={0.1} name="Memory %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Interfaces & VPN side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interfaces */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Interfaces</h2>
            <Link
              to={`/interfaces/${firewallId}`}
              className="text-sm text-blue-600 hover:underline"
            >
              View All →
            </Link>
          </div>
          <div className="space-y-2 max-h-64 overflow-auto">
            {interfaces.slice(0, 8).map((iface) => (
              <div
                key={iface.name}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      iface.status === "up" ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span className="text-sm font-medium">{iface.alias || iface.name}</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  ↑ {formatBytes(iface.txBytes)} &middot; ↓ {formatBytes(iface.rxBytes)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* VPN */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">VPN Connections</h2>
            <Link
              to={`/vpn/${firewallId}`}
              className="text-sm text-blue-600 hover:underline"
            >
              View All →
            </Link>
          </div>
          {vpn.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No active VPN connections</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-auto">
              {vpn.slice(0, 8).map((v, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        v.status === "up" ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <div>
                      <span className="text-sm font-medium">{v.name}</span>
                      {v.username && (
                        <span className="text-xs text-gray-400 ml-2">({v.username})</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                    {v.type.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
