import { Link, useLocation, useParams } from "react-router-dom";
import {
  LayoutDashboard,
  Server,
  Network,
  Shield,
  FileText,
  AlertTriangle,
  Moon,
  Sun,
  Lock,
} from "lucide-react";

interface SidebarProps {
  darkMode: boolean;
  onToggleDark: () => void;
}

export default function Sidebar({ darkMode, onToggleDark }: SidebarProps) {
  const location = useLocation();

  // Extract firewallId from current path
  const pathParts = location.pathname.split("/");
  const firewallId =
    pathParts.length >= 3 && pathParts[1] !== "" ? pathParts[pathParts.length - 1] : null;

  const isActive = (path: string) =>
    location.pathname.startsWith(path)
      ? "bg-blue-600 text-white"
      : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800";

  return (
    <aside className="w-64 h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-lg font-bold leading-tight">FortiGate</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Monitor Dashboard
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-auto">
        <Link
          to="/"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            location.pathname === "/"
              ? "bg-blue-600 text-white"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
          }`}
        >
          <Server className="w-4 h-4" />
          Firewalls
        </Link>

        {firewallId && firewallId !== "" && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Monitoring
              </p>
            </div>

            <Link
              to={`/dashboard/${firewallId}`}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(
                "/dashboard"
              )}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>

            <Link
              to={`/interfaces/${firewallId}`}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(
                "/interfaces"
              )}`}
            >
              <Network className="w-4 h-4" />
              Interfaces
            </Link>

            <Link
              to={`/vpn/${firewallId}`}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(
                "/vpn"
              )}`}
            >
              <Lock className="w-4 h-4" />
              VPN
            </Link>

            <Link
              to={`/policies/${firewallId}`}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(
                "/policies"
              )}`}
            >
              <Shield className="w-4 h-4" />
              Policies
            </Link>

            <div className="pt-3 pb-1 px-3">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Logs
              </p>
            </div>

            <Link
              to={`/logs/traffic/${firewallId}`}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(
                "/logs/traffic"
              )}`}
            >
              <FileText className="w-4 h-4" />
              Traffic Logs
            </Link>

            <Link
              to={`/logs/security/${firewallId}`}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(
                "/logs/security"
              )}`}
            >
              <AlertTriangle className="w-4 h-4" />
              Security Logs
            </Link>
          </>
        )}
      </nav>

      {/* Dark mode toggle */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={onToggleDark}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </div>
    </aside>
  );
}
