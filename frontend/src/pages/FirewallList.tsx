import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { getFirewalls, addFirewall, deleteFirewall, testFirewall } from "../services/api";
import AddFirewallModal from "../components/AddFirewallModal";
import type { Firewall } from "../types";

export default function FirewallList() {
  const [firewalls, setFirewalls] = useState<Firewall[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});
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
  }, []);

  const handleAdd = async (data: {
    name: string;
    host: string;
    port: number;
    apiToken: string;
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

  const handleTest = async (id: string) => {
    setTestResults((prev) => ({ ...prev, [id]: { ok: false, message: "Testing..." } }));
    try {
      const result = await testFirewall(id);
      setTestResults((prev) => ({ ...prev, [id]: result }));
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [id]: { ok: false, message: "Test request failed" },
      }));
    }
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
                  onClick={() => navigate(`/dashboard/${fw.id}`)}
                >
                  <h3 className="text-lg font-bold">{fw.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {fw.host}:{fw.port}
                  </p>
                  {testResults[fw.id] && (
                    <p
                      className={`text-xs mt-1 ${
                        testResults[fw.id].ok
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-500"
                      }`}
                    >
                      {testResults[fw.id].ok ? (
                        <Wifi className="w-3 h-3 inline mr-1" />
                      ) : (
                        <WifiOff className="w-3 h-3 inline mr-1" />
                      )}
                      {testResults[fw.id].message}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTest(fw.id)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                    title="Test Connection"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/dashboard/${fw.id}`)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Open Dashboard
                  </button>
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
    </div>
  );
}
