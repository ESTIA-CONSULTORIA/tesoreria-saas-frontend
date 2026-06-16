import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../core/api/api";

export default function EmployeeLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const { access_token, user } = res.data;
      if (!access_token) throw new Error("Sin token");
      localStorage.setItem("employee_token", access_token);
      localStorage.setItem("employee_user", JSON.stringify(user));
      navigate("/employee/home");
    } catch (e: any) {
      setError(e?.response?.data?.message || "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#0A0A0A" }}
    >
      <div className="w-full max-w-sm p-6 rounded-xl" style={{ backgroundColor: "#161616", border: "1px solid #2D2D2D" }}>
        <h1 className="text-lg font-semibold mb-1" style={{ color: "#F5F5F5" }}>
          Portal del Empleado
        </h1>
        <p className="text-xs mb-6" style={{ color: "#9A9A9A" }}>
          Accede con tu usuario
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs block mb-1" style={{ color: "#9A9A9A" }}>Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full text-sm px-3 py-2 rounded"
              style={{ backgroundColor: "#0A0A0A", border: "1px solid #2D2D2D", color: "#F5F5F5" }}
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "#9A9A9A" }}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full text-sm px-3 py-2 rounded"
              style={{ backgroundColor: "#0A0A0A", border: "1px solid #2D2D2D", color: "#F5F5F5" }}
            />
          </div>

          {error && <p className="text-xs" style={{ color: "#EF4444" }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 text-sm font-medium rounded"
            style={{ backgroundColor: "#F5F5F5", color: "#0A0A0A" }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
