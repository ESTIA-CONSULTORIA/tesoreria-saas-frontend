import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import CreateBranchModal from "./CreateBranchModal";

interface Branch {
  id: string;
  name: string;
  code?: string;
  city?: string;
  address?: string;
  isActive: boolean;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadBranches();
  }, []);

  async function loadBranches() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/branches");
      setBranches(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar sucursales");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout>
      <CreateBranchModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={loadBranches}
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Sucursales</h2>
            <p className="text-slate-400">Administracion de sucursales</p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            + Nueva Sucursal
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl bg-slate-900 p-6">Cargando sucursales...</div>
        ) : (
          <div className="space-y-4">
            {branches.length === 0 ? (
              <div className="rounded-xl bg-slate-900 p-6">
                No existen sucursales registradas
              </div>
            ) : (
              branches.map((branch) => (
                <div
                  key={branch.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{branch.name}</h3>

                      <p className="text-sm text-slate-400">
                        Codigo: {branch.code || "Sin codigo"} · Ciudad:{" "}
                        {branch.city || "Sin ciudad"}
                      </p>

                      <p className="text-xs text-slate-500">
                        Direccion: {branch.address || "Sin direccion"}
                      </p>
                    </div>

                    <span className="rounded-full bg-green-900/40 px-3 py-1 text-sm text-green-300">
                      {branch.isActive ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
