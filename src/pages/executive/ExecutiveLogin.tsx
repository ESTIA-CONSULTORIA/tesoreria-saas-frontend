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
    if (!tenantId.trim()) { setError("Ingresa el ID de empresa"); return; }
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
    if (k === "del") { setPin((p) => p.slice(0, -1)); return; }
    const next = pin + k;
    setPin(next);
    if (next.length === 4) submit(next);
  }

  return (
    <div
      style={{
        height: "100vh",
        background: t.bg,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', sans-serif",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Branding */}
      <div
        style={{
          flexShrink: 0,
          paddingTop: 52,
          paddingBottom: 0,
          textAlign: "center",
          padding: "52px 24px 0",
        }}
      >
        {logoUrl && (
          <img
            src={logoUrl}
            alt="logo"
            style={{ height: 40, marginBottom: 10, objectFit: "contain" }}
          />
        )}
        <p style={{ color: t.text, fontSize: 16, fontWeight: 500, letterSpacing: "0.03em" }}>
          {systemName || "Vista Ejecutiva"}
        </p>
      </div>

      {/* PIN area — grows to push keypad down */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        {!storedTenant && (
          <input
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            placeholder="ID de empresa"
            style={{
              width: 180,
              padding: "9px 14px",
              background: "transparent",
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              color: t.text,
              fontSize: 14,
              fontFamily: "'Inter', sans-serif",
              outline: "none",
              textAlign: "center",
            }}
          />
        )}

        {/* PIN dots */}
        <div style={{ display: "flex", gap: 22 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 15,
                height: 15,
                borderRadius: "50%",
                background: i < pin.length ? t.text : "transparent",
                border: `2px solid ${i < pin.length ? t.text : t.secondary}`,
                transition: "background 0.12s",
              }}
            />
          ))}
        </div>

        {error && (
          <p style={{ color: "#EF4444", fontSize: 13, textAlign: "center" }}>{error}</p>
        )}
      </div>

      {/* Keypad */}
      <div style={{ flexShrink: 0, padding: "0 16px 36px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 4,
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
                  height: 68,
                  background: "none",
                  border: "none",
                  color: k === "del" ? t.secondary : t.text,
                  fontSize: k === "del" ? "1.4rem" : "2rem",
                  fontWeight: 300,
                  fontFamily: "'Inter', sans-serif",
                  cursor: loading ? "wait" : "pointer",
                  WebkitTapHighlightColor: "transparent",
                  outline: "none",
                }}
              >
                {k === "del" ? "⌫" : k}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
