import { useEffect, useState } from "react";
import { api } from "../../core/api/api";

interface User {
  id: string;
  name?: string;
  email: string;
  roleId?: string;
  roleCode?: string;
  branchId?: string;
  isActive: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  user?: User | null;
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

export default function CreateUserModal({ open, onClose, onCreated, user }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [roleCode, setRoleCode] = useState("USER");
  const [branchId, setBranchId] = useState("");
  const [isActive, setIsActive] = useState(true);
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

  useEffect(() => {
    if (user) {
      const nameParts = (user.name || "").split(" ");
      setFirstName(nameParts[0] || "");
      setLastName(nameParts.slice(1).join(" ") || "");
      setEmail(user.email);
      setRoleId(user.roleId || "");
      setRoleCode(user.roleCode || "USER");
      setBranchId(user.branchId || "");
      setIsActive(user.isActive);
      setPassword("");
    } else {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setRoleId("");
      setRoleCode("USER");
      setBranchId("");
      setIsActive(true);
    }
  }, [user, open]);

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

      if (user) {
        await api.put(`/users/${user.id}`, {
          name: fullName,
          roleId: roleId || undefined,
          roleCode,
          isActive,
        });
      } else {
        await api.post("/users", {
          name: fullName,
          email,
          password,
          roleId: roleId || undefined,
          roleCode,
          branchId: branchId || undefined,
        });
      }

      onCreated();
      onClose();

      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setRoleId("");
      setRoleCode("USER");
      setBranchId("");
      setIsActive(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible guardar el usuario");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header - flex-shrink-0 */}
        <div className="flex-shrink-0 p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white">{user ? "Editar Usuario" : "Nuevo Usuario"}</h3>
              <p className="text-sm text-slate-400">
                {user ? "Modifica los datos del usuario" : "Crea un usuario y asigna un rol"}
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Body - flex-1 overflow-y-auto */}
        <div className="flex-1 overflow-y-auto p-6">
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
              required={!user}
              disabled={!!user}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
            />

            {!user && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
              />
            )}

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

            {!user && (
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
            )}

            {user && (
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded"
                />
                Activo
              </label>
            )}

            <button
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Guardando..." : user ? "Actualizar usuario" : "Guardar usuario"}
            </button>
          </form>
        </div>

        {/* Footer - flex-shrink-0 */}
        <div className="flex-shrink-0 p-4 border-t border-slate-800 text-center text-xs text-slate-500">
          ESC para cerrar
        </div>
      </div>
    </div>
  );
}
