import { useState, useEffect } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";

interface CatalogEntry {
  slug: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  fields: string[];
  isActive: boolean;
  status: string;
  lastSync: string | null;
  id: string | null;
  config: Record<string, any> | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  fiscal: "Fiscal",
  rh: "Recursos Humanos",
  bancos: "Bancos",
  contabilidad: "Contabilidad",
  pos: "Punto de Venta",
  comunicacion: "Comunicación",
};

const STATUS_COLORS: Record<string, string> = {
  CONNECTED: "#22C55E",
  DISCONNECTED: "#6B7280",
  ERROR: "#EF4444",
  SYNCING: "#F59E0B",
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<CatalogEntry | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ slug: string; success: boolean; message: string } | null>(null);

  const token = localStorage.getItem("access_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    loadIntegrations();
  }, []);

  async function loadIntegrations() {
    try {
      const res = await api.get("/integrations", { headers });
      setIntegrations(res.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  function openModal(entry: CatalogEntry) {
    setModal(entry);
    setCredentials({});
    setTestResult(null);
  }

  async function handleActivate() {
    if (!modal) return;
    setSaving(true);
    try {
      await api.post(`/integrations/${modal.slug}/activate`, { credentials }, { headers });
      await loadIntegrations();
      setModal(null);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Error al activar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(slug: string) {
    if (!confirm("¿Desactivar esta integración?")) return;
    try {
      await api.delete(`/integrations/${slug}`, { headers });
      await loadIntegrations();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Error al desactivar");
    }
  }

  async function handleTest(slug: string) {
    setTestResult(null);
    try {
      const res = await api.get(`/integrations/${slug}/test`, { headers });
      setTestResult({ slug, ...res.data });
    } catch {
      setTestResult({ slug, success: false, message: "Error de conexión" });
    }
  }

  const categories = [...new Set(integrations.map((i) => i.category))];

  return (
    <MainLayout>
      <div className="p-6" style={{ color: "#F5F5F5" }}>
        <h1 className="text-xl font-semibold mb-1">Integraciones</h1>
        <p className="text-sm mb-6" style={{ color: "#9A9A9A" }}>
          Conecta ESTIA con sistemas externos
        </p>

        {loading ? (
          <div className="text-sm" style={{ color: "#9A9A9A" }}>Cargando...</div>
        ) : (
          categories.map((cat) => (
            <div key={cat} className="mb-8">
              <h2 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#7E7E7E" }}>
                {CATEGORY_LABELS[cat] ?? cat}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {integrations
                  .filter((i) => i.category === cat)
                  .map((entry) => (
                    <div
                      key={entry.slug}
                      className="rounded-lg p-4 border"
                      style={{ backgroundColor: "#161616", borderColor: "#2D2D2D" }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{entry.icon}</span>
                          <div>
                            <div className="text-sm font-medium">{entry.name}</div>
                            <div className="text-xs" style={{ color: "#9A9A9A" }}>{entry.description}</div>
                          </div>
                        </div>
                        <div
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: (STATUS_COLORS[entry.status] ?? "#6B7280") + "22",
                            color: STATUS_COLORS[entry.status] ?? "#6B7280",
                          }}
                        >
                          {entry.isActive ? "Activo" : "Inactivo"}
                        </div>
                      </div>

                      {entry.lastSync && (
                        <div className="text-xs mb-2" style={{ color: "#7E7E7E" }}>
                          Última sync: {new Date(entry.lastSync).toLocaleString("es-MX")}
                        </div>
                      )}

                      {testResult?.slug === entry.slug && (
                        <div
                          className="text-xs mb-2 px-2 py-1 rounded"
                          style={{
                            backgroundColor: testResult.success ? "#22C55E22" : "#EF444422",
                            color: testResult.success ? "#22C55E" : "#EF4444",
                          }}
                        >
                          {testResult.message}
                        </div>
                      )}

                      <div className="flex gap-2 mt-3">
                        {entry.isActive ? (
                          <>
                            <button
                              onClick={() => handleTest(entry.slug)}
                              className="flex-1 text-xs py-1.5 rounded border"
                              style={{ borderColor: "#2D2D2D", color: "#9A9A9A" }}
                            >
                              Probar
                            </button>
                            <button
                              onClick={() => openModal(entry)}
                              className="flex-1 text-xs py-1.5 rounded border"
                              style={{ borderColor: "#2D2D2D", color: "#9A9A9A" }}
                            >
                              Configurar
                            </button>
                            <button
                              onClick={() => handleDeactivate(entry.slug)}
                              className="text-xs py-1.5 px-3 rounded"
                              style={{ backgroundColor: "#EF444422", color: "#EF4444" }}
                            >
                              Off
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openModal(entry)}
                            className="flex-1 text-xs py-1.5 rounded"
                            style={{ backgroundColor: "#1A1A1A", border: "1px solid #3D3D3D", color: "#F5F5F5" }}
                          >
                            Activar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de configuración */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div className="rounded-xl p-6 w-full max-w-md" style={{ backgroundColor: "#161616", border: "1px solid #2D2D2D" }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{modal.icon}</span>
              <div>
                <h3 className="font-semibold">{modal.name}</h3>
                <p className="text-xs" style={{ color: "#9A9A9A" }}>{modal.description}</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              {modal.fields.map((field) => (
                <div key={field}>
                  <label className="text-xs mb-1 block capitalize" style={{ color: "#9A9A9A" }}>
                    {field.replace(/_/g, " ")}
                  </label>
                  <input
                    type={field.includes("contrasena") || field.includes("secret") || field.includes("token") ? "password" : "text"}
                    value={credentials[field] ?? ""}
                    onChange={(e) => setCredentials((p) => ({ ...p, [field]: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded"
                    style={{ backgroundColor: "#0A0A0A", border: "1px solid #2D2D2D", color: "#F5F5F5" }}
                    placeholder={field.replace(/_/g, " ")}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2 text-sm rounded"
                style={{ border: "1px solid #2D2D2D", color: "#9A9A9A" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleActivate}
                disabled={saving}
                className="flex-1 py-2 text-sm rounded font-medium"
                style={{ backgroundColor: "#F5F5F5", color: "#0A0A0A" }}
              >
                {saving ? "Guardando..." : "Guardar y activar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
