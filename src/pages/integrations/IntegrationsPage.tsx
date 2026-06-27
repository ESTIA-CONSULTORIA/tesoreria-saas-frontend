import { useState, useEffect } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import { useCompanyStore } from "../../core/store/useCompanyStore";
import { NoContextBanner } from "../../core/components/NoContextBanner";

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

const STATUS_DOT: Record<string, string> = {
  CONNECTED: "#22C55E",
  DISCONNECTED: "#6B7280",
  ERROR: "#EF4444",
  SYNCING: "#F59E0B",
};

export default function IntegrationsPage() {
  const { activeCompany, activeBranch } = useCompanyStore();
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
      <div style={{ position: 'relative', minHeight: '80vh' }}>
        {(!activeCompany || !activeBranch) && <NoContextBanner />}
        {activeCompany && activeBranch && (<>
      <div style={{ padding: "24px", color: "#c8cdd8" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: "#c8cdd8", marginBottom: 2 }}>Integraciones</h1>
          <p style={{ fontSize: 12, color: "#6b7280" }}>Conecta ESTIA con sistemas externos</p>
        </div>

        {loading ? (
          <div style={{ fontSize: 12, color: "#6b7280" }}>Cargando...</div>
        ) : integrations.length === 0 ? (
          <div style={{ fontSize: 12, color: "#6b7280" }}>No hay integraciones disponibles.</div>
        ) : (
          categories.map((cat) => (
            <div key={cat} style={{ marginBottom: 28 }}>
              <div style={{
                fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
                textTransform: "uppercase", color: "#4b5563", marginBottom: 10,
              }}>
                {CATEGORY_LABELS[cat] ?? cat}
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 8,
              }}>
                {integrations
                  .filter((i) => i.category === cat)
                  .map((entry) => {
                    const dotColor = STATUS_DOT[entry.status] ?? "#6b7280";
                    const testR = testResult?.slug === entry.slug ? testResult : null;

                    return (
                      <div
                        key={entry.slug}
                        style={{
                          background: "#141820",
                          border: "1px solid rgba(255,255,255,0.07)",
                          borderRadius: 8,
                          padding: "10px 12px",
                        }}
                      >
                        {/* Header row */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{entry.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 12.5, fontWeight: 500, color: "#c8cdd8" }}>
                                {entry.name}
                              </span>
                              <div style={{
                                width: 6, height: 6, borderRadius: "50%",
                                background: dotColor, flexShrink: 0,
                              }} />
                            </div>
                            <p style={{
                              fontSize: 11, color: "#6b7280", margin: 0,
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                              maxWidth: "100%",
                            }}>
                              {entry.description}
                            </p>
                          </div>
                        </div>

                        {/* Test result */}
                        {testR && (
                          <div style={{
                            fontSize: 11, padding: "4px 8px", borderRadius: 4, marginBottom: 6,
                            background: testR.success ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                            color: testR.success ? "#22C55E" : "#ef4444",
                            border: `1px solid ${testR.success ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                          }}>
                            {testR.message}
                          </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                          {entry.isActive ? (
                            <>
                              <button
                                onClick={() => handleTest(entry.slug)}
                                style={{
                                  flex: 1, fontSize: 11, padding: "4px 0",
                                  background: "transparent",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  borderRadius: 5, color: "#9ca3af", cursor: "pointer",
                                }}
                              >
                                Probar
                              </button>
                              <button
                                onClick={() => openModal(entry)}
                                style={{
                                  flex: 1, fontSize: 11, padding: "4px 0",
                                  background: "transparent",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  borderRadius: 5, color: "#9ca3af", cursor: "pointer",
                                }}
                              >
                                Configurar
                              </button>
                              <button
                                onClick={() => handleDeactivate(entry.slug)}
                                style={{
                                  fontSize: 11, padding: "4px 10px",
                                  background: "rgba(239,68,68,0.08)",
                                  border: "1px solid rgba(239,68,68,0.2)",
                                  borderRadius: 5, color: "#ef4444", cursor: "pointer",
                                }}
                              >
                                Off
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => openModal(entry)}
                              style={{
                                flex: 1, fontSize: 11, padding: "5px 0",
                                background: "rgba(123,156,204,0.08)",
                                border: "1px solid rgba(123,156,204,0.2)",
                                borderRadius: 5, color: "#7b9ccc", cursor: "pointer",
                              }}
                            >
                              Activar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de configuración */}
      {modal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.7)",
        }}>
          <div style={{
            background: "#141820", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12, padding: 24, width: "100%", maxWidth: 420,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>{modal.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#c8cdd8" }}>{modal.name}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{modal.description}</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {modal.fields.map((field) => (
                <div key={field}>
                  <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 4, textTransform: "capitalize" }}>
                    {field.replace(/_/g, " ")}
                  </label>
                  <input
                    type={field.includes("contrasena") || field.includes("secret") || field.includes("token") ? "password" : "text"}
                    value={credentials[field] ?? ""}
                    onChange={(e) => setCredentials((p) => ({ ...p, [field]: e.target.value }))}
                    placeholder={field.replace(/_/g, " ")}
                    style={{
                      width: "100%", fontSize: 12.5, padding: "7px 10px",
                      background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 6, color: "#c8cdd8", boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setModal(null)}
                style={{
                  flex: 1, padding: "8px 0", fontSize: 12.5,
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 6, color: "#9ca3af", cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleActivate}
                disabled={saving}
                style={{
                  flex: 1, padding: "8px 0", fontSize: 12.5, fontWeight: 500,
                  background: saving ? "rgba(255,255,255,0.05)" : "#7b9ccc",
                  border: "none", borderRadius: 6,
                  color: saving ? "#6b7280" : "#0f1117",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Guardando..." : "Guardar y activar"}
              </button>
            </div>
          </div>
        </div>
      )}
          </>)}
      </div>
    </MainLayout>
  );
}
