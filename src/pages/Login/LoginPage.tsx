import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../core/api/api";
import { useAuthStore } from "../../core/store/useAuthStore";

export default function LoginPage() {
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    try {
      setLoading(true);

      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const token = response.data.access_token;

      login(
        token,
        "test-tenant",
        {
          id: "1",
          email,
          name: "Administrador",
        }
      );

      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      alert("Usuario o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-8 shadow-2xl">
        <h1 className="mb-6 text-center text-3xl font-bold text-white">
          Tesorería SaaS
        </h1>

        <p className="mb-6 text-center text-slate-400">
          Iniciar sesión
        </p>

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white"
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white"
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </div>
  );
}