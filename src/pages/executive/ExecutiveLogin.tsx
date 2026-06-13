import { useEffect, useState } from "react";
import { execPublicApi } from "./execApi";
import type { ExecConfig } from "./ExecutivePage";
import { getTheme } from "./theme";

interface Props {
  onLogin: (token: string, name?: string) => void;
  config: ExecConfig;
}

const STORAGE_KEY = "exec_tenant_id";
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export default function ExecutiveLogin({ onLogin, config }: Props) {
  const t = getTheme(config.theme);
  const [brandLogo, setBrandLogo] = useState("");
  const [brandName, setBrandName] = useState("Vista Ejecutiva");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    execPublicApi
      .get(`/tenant-settings/${stored}`)
      .then((r) => {
        if (r.data) {
          const lu = r.data.logoUrl || r.data.logo_url || r.data.logoURL || "";
          console.log("tenant-settings:", JSON.stringify(r.data));
          console.log("logo length:", lu?.length, "preview:", lu?.slice(0, 50));
          setBrandLogo(lu);
          setBrandName(r.data.name || "Vista Ejecutiva");
        }
      })
      .catch(() => {});
  }, []);

  // Reactive so "Cambiar empresa" can clear it and show the input
  const [storedTenant, setStoredTenant] = useState(
    () => localStorage.getItem(STORAGE_KEY) || "",
  );
  const [tenantId, setTenantId] = useState(storedTenant);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  const gradient = t.bg;

  async function submit(p: string) {
    if (!tenantId.trim()) { setError("Ingresa el ID de empresa"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await execPublicApi.post("/auth/executive-login", {
        tenantId: tenantId.trim(),
        pin: p,
      });
      // Persist tenant and token on success
      localStorage.setItem(STORAGE_KEY, tenantId.trim());
      setStoredTenant(tenantId.trim());
      onLogin(res.data.access_token, res.data.user?.name || "");
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

  function handleChangeTenant() {
    localStorage.removeItem(STORAGE_KEY);
    setStoredTenant("");
    setTenantId("");
    setPin("");
    setError("");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: gradient, overflowY: "auto", overflowX: "hidden" }}>
      <div
        style={{
          height: "100%",
          maxWidth: 430,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'Inter', sans-serif",
          userSelect: "none",
        }}
      >
      {/* ── TOP ZONE 40% — branding ── */}
      <div
        style={{
          height: "40%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 32px",
          gap: 12,
        }}
      >
        {brandLogo ? (
          <>
            <img
              src={brandLogo}
              alt="logo"
              style={{ maxHeight: 80, maxWidth: "80%", objectFit: "contain" }}
            />
            {brandName && (
              <p
                style={{
                  color: t.secondary,
                  fontSize: "0.85rem",
                  fontWeight: 300,
                  letterSpacing: "0.14em",
                  textAlign: "center",
                }}
              >
                {brandName}
              </p>
            )}
          </>
        ) : (
          <p
            style={{
              color: t.text,
              fontSize: "1.8rem",
              fontWeight: 200,
              letterSpacing: "0.08em",
              textAlign: "center",
              lineHeight: 1.25,
            }}
          >
            {brandName}
          </p>
        )}
      </div>

      {/* ── MIDDLE ZONE 20% — label + dots ── */}
      <div
        style={{
          height: "20%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          padding: "0 32px",
        }}
      >
        {/* Tenant input — only when no stored tenant */}
        {!storedTenant && (
          <input
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            placeholder="ID de empresa"
            autoComplete="off"
            style={{
              width: 160,
              padding: "8px 12px",
              background: "transparent",
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              color: t.text,
              fontSize: 13,
              fontFamily: "'Inter', sans-serif",
              outline: "none",
              textAlign: "center",
            }}
          />
        )}

        <p
          style={{
            color: t.secondary,
            fontSize: "0.6rem",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
          }}
        >
          Acceso Ejecutivo
        </p>

        {/* PIN dots */}
        <div style={{ display: "flex", gap: 24 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: i < pin.length ? t.accent : "transparent",
                border: `1px solid ${i < pin.length ? t.accent : t.secondary}`,
                transition: "background 0.15s, border-color 0.15s",
              }}
            />
          ))}
        </div>

        {error && (
          <p
            style={{
              color: "#EF4444",
              fontSize: "0.75rem",
              textAlign: "center",
              letterSpacing: "0.02em",
              marginTop: -4,
            }}
          >
            {error}
          </p>
        )}
      </div>

      {/* ── BOTTOM ZONE 40% — keypad + cambiar empresa ── */}
      <div
        style={{
          height: "40%",
          display: "flex",
          flexDirection: "column",
          padding: "0 12px",
        }}
      >
        {/* Keypad grid */}
        <div style={{ flex: 1, display: "flex", alignItems: "stretch" }}>
          <div
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gridTemplateRows: "repeat(4, 1fr)",
            }}
          >
            {KEYS.map((k, i) =>
              k === "" ? (
                <div key={i} />
              ) : (
                <button
                  key={k + i}
                  onClick={() => press(k)}
                  onPointerDown={() => setPressedKey(k)}
                  onPointerUp={() => setPressedKey(null)}
                  onPointerLeave={() => setPressedKey(null)}
                  disabled={loading}
                  style={{
                    background: "none",
                    border: "none",
                    color: k === "del" ? t.secondary : t.text,
                    fontSize: k === "del" ? "1.3rem" : "1.8rem",
                    fontWeight: 300,
                    fontFamily: "'Inter', sans-serif",
                    cursor: loading ? "wait" : "pointer",
                    WebkitTapHighlightColor: "transparent",
                    outline: "none",
                    opacity: pressedKey === k ? 0.3 : 1,
                    transition: "opacity 0.08s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {k === "del" ? "⌫" : k}
                </button>
              )
            )}
          </div>
        </div>

        {/* "Cambiar empresa" — only when there's a stored tenant */}
        {storedTenant && (
          <div
            style={{
              flexShrink: 0,
              textAlign: "center",
              paddingBottom: 14,
              paddingTop: 4,
            }}
          >
            <button
              onClick={handleChangeTenant}
              style={{
                background: "none",
                border: "none",
                color: t.secondary,
                fontSize: "0.7rem",
                letterSpacing: "0.1em",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                WebkitTapHighlightColor: "transparent",
                padding: "4px 8px",
              }}
            >
              Cambiar empresa
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
