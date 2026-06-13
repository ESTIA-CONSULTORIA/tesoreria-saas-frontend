import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import CreateBankModal from "./CreateBankModal";
import { useCompanyStore } from "../../core/store/useCompanyStore";

interface BankAccount {
  id: string;
  branchId: string;
  name: string;
  accountNumber: string;
  bank: string;
  initialBalance: number;
  balance: number;
  currency: string;
  type: "EFECTIVO" | "BANCO" | "CAJA";
  isActive: boolean;
}

interface Branch {
  id: string;
  name: string;
}

export default function BanksPage() {
  const { activeBranch, activeCompany } = useCompanyStore();
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState<BankAccount | null>(null);

  useEffect(() => {
    loadBanks();
    loadBranches();
  }, [activeBranch?.id, activeCompany?.id]);

  async function loadBanks() {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/banks");
      setBanks(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar cuentas bancarias");
    } finally {
      setLoading(false);
    }
  }

  async function loadBranches() {
    try {
      const response = await api.get("/branches");
      setBranches(Array.isArray(response.data) ? response.data : []);
    } catch {
      setBranches([]);
    }
  }

  function getBranchName(branchId: string): string {
    const branch = branches.find((b) => b.id === branchId);
    return branch?.name || branchId;
  }

  async function deleteBank(id: string) {
    try {
      await api.delete(`/banks/${id}`);
      loadBanks();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible eliminar la cuenta");
    }
  }

  function handleEditBankAccount(account: BankAccount) {
    setSelectedBankAccount(account);
    setModalOpen(true);
  }

  function handleCreateBankAccount() {
    setSelectedBankAccount(null);
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setSelectedBankAccount(null);
  }

  return (
    <MainLayout>
      <CreateBankModal 
        open={modalOpen} 
        onClose={handleCloseModal} 
        onCreated={loadBanks} 
        bankAccount={selectedBankAccount}
      />
      {!activeCompany ? (
        <div style={{ padding: '24px', backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', color: '#8A6A3A', textAlign: 'center' }}>
          Selecciona una empresa para ver los datos
        </div>
      ) : (
        <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Bancos</h2>
            <p className="text-slate-400">Cuentas bancarias por sucursal</p>
          </div>
          <button onClick={handleCreateBankAccount} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
            + Nueva Cuenta
          </button>
        </div>
        {error && <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">{error}</div>}
        {loading ? (
          <div className="rounded-xl bg-slate-900 p-6">Cargando cuentas...</div>
        ) : (
          <div className="space-y-4">
            {banks.length === 0 ? (
              <div className="rounded-xl bg-slate-900 p-6">No existen cuentas registradas</div>
            ) : (
              banks.map((account) => (
                <div key={account.id} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{account.name}</h3>
                      <p className="text-sm text-slate-400">
                        {account.bank} · {account.accountNumber}
                      </p>
                      <p className="text-xs text-slate-500">
                        Sucursal: {getBranchName(account.branchId)} · Tipo: {account.type} · Moneda: {account.currency}
                      </p>
                      <p className="text-xs text-slate-400">
                        Saldo inicial: {Number(account.initialBalance)} · Saldo actual: {Number(account.balance)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-sm ${account.isActive ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                        {account.isActive ? "Activa" : "Inactiva"}
                      </span>
                      <button 
                        onClick={() => handleEditBankAccount(account)} 
                        className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600"
                      >
                        Editar
                      </button>
                      <button onClick={() => deleteBank(account.id)} className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700">
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
      )}
    </MainLayout>
  );
}
