import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, LogIn, LogOut, Shield, ShieldOff } from "lucide-react";
import { getFirewalls, addFirewall, deleteFirewall, loginFirewall, logoutFirewall } from "../services/api";
import AddFirewallModal from "../components/AddFirewallModal";
import LoginModal from "../components/LoginModal";
import type { Firewall } from "../types";

export default function FirewallList() {
  const [firewalls, setFirewalls] = useState<Firewall[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [loginTarget, setLoginTarget] = useState<Firewall | null>(null);
  const [statusMessages, setStatusMessages] = useState<Record<string, { ok: boolean; message: string }>>({});
  const navigate = useNavigate();

  const fetchFirewalls = async () => {
    setLoading(true);
    try {
      const data = await getFirewalls();
      setFirewalls(data);
    } catch (err) {
      console.error("Failed to fetch firewalls:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFirewalls();
    // Refresh auth status every 30 seconds
    const interval = setInterval(fetchFirewalls, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleAdd = async (data: {
    name: string;
    host: string;
    port: number;
    verifySsl: boolean;
  }) => {
    await addFirewall(data);
    await fetchFirewalls();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this firewall?")) return;
    await deleteFirewall(id);
    await fetchFirewalls();
  };

  const handleLogin = async (fw: Firewall, credentials: { username: string; password: string }) => {
    const result = await loginFirewall(fw.id, credentials);
    if (result.ok) {
      setStatusMessages((prev) => ({ ...prev, [fw.id]: { ok: true, message: result.message } }));
      await fetchFirewalls();
    } else {
      throw new Error(result.message);
    }
  };

  const handleLogout = async (fw: Firewall) => {
    await logoutFirewall(fw.id);
    setStatusMessages((prev) => ({ ...prev, [fw.id]: { ok: false, message: "Logged out" } }));
    await fetchFirewalls();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">FortiGate Firewalls</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Manage and monitor your FortiGate devices
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Firewall
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : firewalls.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="text-6xl mb-4">🛡️</div>
          <h2 className="text-xl font-bold mb-2">No firewalls configured</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Add your first FortiGate firewall to start monitoring
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Add Firewall
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {firewalls.map((fw) => (
            <div
              key={fw.id}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => fw.authenticated ? navigate(`/dashboard/${fw.id}`) : setLoginTarget(fw)}
                >
                  <div className="flex items-center gap-2">
                    {fw.authenticated ? (
                      <Shield className="w-5 h-5 text-green-500" />
                    ) : (
                      <ShieldOff className="w-5 h-5 text-gray-400" />
                    )}
                    <h3 className="text-lg font-bold">{fw.name}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        fw.authenticated
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                      }`}
                    >
                      {fw.authenticated ? "Authenticated" : "Not logged in"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 ml-7">
                    {fw.host}:{fw.port}
                  </p>
                  {statusMessages[fw.id] && (
                    <p
                      className={`text-xs mt-1 ml-7 ${
                        statusMessages[fw.id].ok
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-500"
                      }`}
                    >
                      {statusMessages[fw.id].message}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {fw.authenticated ? (
                    <>
                      <button
                        onClick={() => navigate(`/dashboard/${fw.id}`)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                      >
                        Open Dashboard
                      </button>
                      <button
                        onClick={() => handleLogout(fw)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                        title="Logout"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setLoginTarget(fw)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                    >
                      <LogIn className="w-4 h-4" />
                      Log In
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(fw.id)}
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddFirewallModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAdd}
      />

      {loginTarget && (
        <LoginModal
          open={!!loginTarget}
          firewallName={loginTarget.name}
          onClose={() => setLoginTarget(null)}
          onLogin={(creds) => handleLogin(loginTarget, creds)}
        />
      )}
    </div>
  );
}
