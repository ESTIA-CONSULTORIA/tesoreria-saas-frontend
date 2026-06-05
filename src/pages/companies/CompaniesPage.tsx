import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import CreateCompanyModal from "./CreateCompanyModal";

interface Company {
  id: string;
  legalName: string;
  tradeName: string;
  taxId?: string;
  baseCurrency: string;
  isActive: boolean;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/companies");
      setCompanies(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "No fue posible cargar empresas"
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteCompany(id: string) {
    if (!confirm("¿Estás seguro de eliminar esta empresa?")) return;
    try {
      await api.delete(`/companies/${id}`);
      loadCompanies();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible eliminar la empresa");
    }
  }

  function handleEdit(company: Company) {
    setSelectedCompany(company);
    setModalOpen(true);
  }

  function handleCreate() {
    setSelectedCompany(null);
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setSelectedCompany(null);
  }

  return (
    <MainLayout>
      <CreateCompanyModal
        open={modalOpen}
        onClose={handleCloseModal}
        onCreated={loadCompanies}
        company={selectedCompany}
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Empresas</h2>
            <p className="text-slate-400">
              Administración de empresas
            </p>
          </div>

          <button
            onClick={handleCreate}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            + Nueva Empresa
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl bg-slate-900 p-6">
            Cargando empresas...
          </div>
        ) : (
          <div className="space-y-4">
            {companies.length === 0 ? (
              <div className="rounded-xl bg-slate-900 p-6">
                No existen empresas registradas
              </div>
            ) : (
              companies.map((company) => (
                <div
                  key={company.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {company.legalName}
                      </h3>

                      <p className="text-sm text-slate-400">
                        {company.tradeName}
                      </p>

                      <p className="text-xs text-slate-500">
                        RFC: {company.taxId || "Sin RFC"} · Moneda:{" "}
                        {company.baseCurrency}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-green-900/40 px-3 py-1 text-sm text-green-300">
                        {company.isActive ? "Activa" : "Inactiva"}
                      </span>
                      <button
                        onClick={() => handleEdit(company)}
                        className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteCompany(company.id)}
                        className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
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