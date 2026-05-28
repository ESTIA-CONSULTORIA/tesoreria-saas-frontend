import { useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import SettingsPreviewModal from "./SettingsPreviewModal";

export default function SettingsPage() {
  const [name, setName] = useState(localStorage.getItem("tenant_name") || "");
  const [logoUrl, setLogoUrl] = useState(localStorage.getItem("tenant_logo_url") || "");
  const [primaryColor, setPrimaryColor] = useState(localStorage.getItem("tenant_primary_color") || "#2563eb");
  const [sidebarColor, setSidebarColor] = useState(localStorage.getItem("tenant_sidebar_color") || "#0f172a");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      localStorage.setItem("tenant_name", name);
      localStorage.setItem("tenant_logo_url", logoUrl);
      localStorage.setItem("tenant_primary_color", primaryColor);
      localStorage.setItem("tenant_sidebar_color", sidebarColor);

      const tenantId = localStorage.getItem("tenant_id") || "test-tenant";
      await api.post(`/tenant-settings/${tenantId}`, {
        name,
        logoUrl,
        primaryColor,
        sidebarColor,
      });

      setSuccess("Configuracion guardada correctamente");
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible guardar la configuracion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout>
      <SettingsPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        name={name}
        logoUrl={logoUrl}
        primaryColor={primaryColor}
        sidebarColor={sidebarColor}
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Configuracion</h2>
            <p className="text-slate-400">Personaliza tenant, logo y colores</p>
          </div>
          <button onClick={() => setPreviewOpen(true)} className="rounded-lg bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-700">
            Preview
          </button>
        </div>

        {error && <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">{error}</div>}
        {success && <div className="rounded-xl border border-green-700 bg-green-900/30 p-4 text-green-300">{success}</div>}

        <form onSubmit={saveSettings} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del tenant" className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white" />
          <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="URL del logo" className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white" />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-300">
              Color primario
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="mt-1 h-10 w-full rounded border border-slate-700 bg-slate-800 p-1" />
            </label>
            <label className="text-sm text-slate-300">
              Color sidebar/header
              <input type="color" value={sidebarColor} onChange={(e) => setSidebarColor(e.target.value)} className="mt-1 h-10 w-full rounded border border-slate-700 bg-slate-800 p-1" />
            </label>
          </div>
          <button disabled={loading} className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {loading ? "Guardando..." : "Guardar configuracion"}
          </button>
        </form>
      </div>
    </MainLayout>
  );
}
