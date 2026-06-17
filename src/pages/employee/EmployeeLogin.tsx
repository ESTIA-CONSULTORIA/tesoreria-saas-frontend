import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { employeeApi } from "../../core/api/employeeApi";

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
      const res = await employeeApi.post("/auth/portal-login", { email, password });
      const { access_token, user } = res.data;
      if (!access_token) throw new Error("Sin token");
      sessionStorage.setItem("employee_token", access_token);
      sessionStorage.setItem("employee_user", JSON.stringify(user));
      navigate("/employee/home");
    } catch (e: any) {
      setError(e?.response?.data?.message || "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(160deg, #0A0A0A 0%, #111111 50%, #0D0D0D 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: "#1A1A1A",
          border: "1px solid #2A2A2A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 32,
          fontSize: 24,
        }}
      >
        ◈
      </div>

      <div style={{ width: "100%", maxWidth: 360 }}>
        <h1
          style={{
            color: "#F5F5F5",
            fontSize: "1.5rem",
            fontWeight: 600,
            marginBottom: 6,
            textAlign: "center",
          }}
        >
          Portal del Empleado
        </h1>
        <p
          style={{
            color: "#505050",
            fontSize: "0.8rem",
            textAlign: "center",
            marginBottom: 36,
            letterSpacing: "0.05em",
          }}
        >
          Accede con tus credenciales
        </p>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.65rem",
                color: "#505050",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                width: "100%",
                background: "#0E0E0E",
                border: "1px solid #222222",
                borderRadius: 10,
                padding: "13px 16px",
                color: "#F5F5F5",
                fontSize: "0.95rem",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#383838")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#222222")}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.65rem",
                color: "#505050",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: "100%",
                background: "#0E0E0E",
                border: "1px solid #222222",
                borderRadius: 10,
                padding: "13px 16px",
                color: "#F5F5F5",
                fontSize: "0.95rem",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#383838")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#222222")}
            />
          </div>

          {error && (
            <div
              style={{
                background: "#1A0808",
                border: "1px solid #3A1515",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#EF4444",
                fontSize: "0.8rem",
                lineHeight: 1.4,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: loading ? "#1A1A1A" : "#F5F5F5",
              color: loading ? "#505050" : "#0A0A0A",
              border: "none",
              borderRadius: 10,
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: 4,
              letterSpacing: "0.05em",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {loading ? "Verificando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
