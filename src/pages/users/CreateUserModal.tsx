import { useEffect, useState } from "react";
import { api } from "../../core/api/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface Role {
  id: string;
  code: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
}

export default function CreateUserModal({ open, onClose, onCreated }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [roleCode, setRoleCode] = useState("USER");
  const [branchId, setBranchId] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      loadRoles();
      loadBranches();
    }
  }, [open]);

  async function loadRoles() {
    try {
      const response = await api.get("/roles");
      const roleList = Array.isArray(response.data) ? response.data : [];
      setRoles(roleList);
    } catch {
      setRoles([]);
    }
  }

  async function loadBranches() {
    try {
      const response = await api.get("/branches");
      const branchList = Array.isArray(response.data) ? response.data : [];
      setBranches(branchList);
    } catch {
      setBranches([]);
    }
  }

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const fullName = `${firstName} ${lastName}`.trim();

      await api.post("/users", {
        name: fullName,
        email,
        password,
        roleId: roleId || undefined,
        roleCode,
        branchId: branchId || undefined,
      });

      onCreated();
      onClose();

      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setRoleId("");
      setRoleCode("USER");
      setBranchId("");
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible crear el usuario");
    } finally {
      setLoading(false);
    }
  }

  function handleRoleChange(selectedRoleId: string) {
    setRoleId(selectedRoleId);
    const selectedRole = roles.find((role) => role.id === selectedRoleId);
    setRoleCode(selectedRole?.code || "USER");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">Nuevo Usuario</h3>
            <p className="text-sm text-slate-400">
              Crea un usuario y asigna un rol
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
          >
            Cerrar
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Nombre"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Apellido"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
            />
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo electrónico"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
          />

          <select
            value={roleId}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
          >
            <option value="">Seleccionar rol (opcional)</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name} ({role.code})
              </option>
            ))}
          </select>

          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
          >
            <option value="">Seleccionar sucursal (opcional)</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>

          <button
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Guardar usuario"}
          </button>
        </form>
      </div>
    </div>
  );
}
