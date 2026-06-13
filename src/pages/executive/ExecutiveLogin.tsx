import { useState } from "react";
import { execPublicApi } from "./execApi";
import { useBrandingStore } from "../../core/store/useBrandingStore";
import type { ExecConfig } from "./ExecutivePage";
import { getTheme } from "./theme";

interface Props {
  onLogin: (token: string) => void;
  config: ExecConfig;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export default function ExecutiveLogin({ onLogin, config }: Props) {
  const t = getTheme(config.theme);
  const { systemName, logoUrl } = useBrandingStore();
  const storedTenant = localStorage.getItem("tenant_id") || "";
  const [tenantId, setTenantId] = useState(storedTenant);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(p: string) {
    if (!tenantId.trim()) {
      setError("Ingresa el ID de empresa");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await execPublicApi.post("/auth/executive-login", {
        tenantId: tenantId.trim(),
        pin: p,
      });
      onLogin(res.data.access_token);
    } catch {
      setError("PIN incorrecto");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  function press(k: string) {
    if (loading) return;
    if (k === "del") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    const next = pin + k;
    setPin(next);
    if (next.length === 4) submit(next);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
        padding: "24px",
      }}
    >
      {logoUrl && (
        <img
          src={logoUrl}
          alt="logo"
          style={{ height: 52, marginBottom: 12, objectFit: "contain" }}
        />
      )}
      <p
        style={{
          color: t.secondary,
          fontSize: 13,
          letterSpacing: "0.08em",
          marginBottom: 48,
          textAlign: "center",
        }}
      >
        {systemName || "Vista Ejecutiva"}
      </p>

      {!storedTenant && (
        <div style={{ marginBottom: 32, width: "100%", maxWidth: 216 }}>
          <input
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            placeholder="ID de empresa"
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 10,
              border: `1px solid ${t.border}`,
              background: t.card,
              color: t.text,
              fontSize: 14,
              fontFamily: "'Inter', sans-serif",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      )}

      {/* PIN dots */}
      <div style={{ display: "flex", gap: 18, marginBottom: 36 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: i < pin.length ? t.text : "transparent",
              border: `2px solid ${i < pin.length ? t.text : t.border}`,
              transition: "background 0.15s",
            }}
          />
        ))}
      </div>

      {error && (
        <p
          style={{
            color: "#EF4444",
            fontSize: 13,
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          {error}
        </p>
      )}

      {/* Keypad */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 72px)",
          gap: 10,
        }}
      >
        {KEYS.map((k, i) =>
          k === "" ? (
            <div key={i} />
          ) : (
            <button
              key={k + i}
              onClick={() => press(k)}
              disabled={loading}
              style={{
                height: 72,
                borderRadius: 14,
                border: `1px solid ${t.border}`,
                background: t.card,
                color: k === "del" ? t.secondary : t.text,
                fontSize: k === "del" ? 18 : 24,
                fontWeight: 300,
                fontFamily: "'Inter', sans-serif",
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {k === "del" ? "⌫" : k}
            </button>
          )
        )}
      </div>
    </div>
  );
}
