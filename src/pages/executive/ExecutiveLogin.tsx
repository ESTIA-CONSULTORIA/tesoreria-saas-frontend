import { useEffect, useState } from "react";
import { execPublicApi } from "./execApi";
import type { ExecConfig } from "./ExecutivePage";
import { getTheme } from "./theme";

interface Props {
  onLogin: (name?: string, tenantId?: string) => void;
  config: ExecConfig;
}

const STORAGE_KEY = "exec_tenant_id";
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
const isUUID = (v: string) => /^[0-9a-f-]{36}$/.test(v);

export default function ExecutiveLogin({ onLogin, config }: Props) {
  const t = getTheme(config?.theme || "dark");
  const [brandLogo, setBrandLogo] = useState("");
  const [brandName, setBrandName] = useState("Vista Ejecutiva");

  const [tenantId, setTenantId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTenant = params.get("tenant");
    if (urlTenant) {
      localStorage.setItem(STORAGE_KEY, urlTenant);
      return urlTenant;
    }
    const envTenant = import.meta.env.VITE_EXECUTIVE_TENANT_ID as string;
    if (envTenant) return envTenant;
    return localStorage.getItem(STORAGE_KEY) || localStorage.getItem("tenant_id") || "";
  });

  // resolving/resolveError: antes, esta resolución corría en paralelo con el teclado del
  // PIN sin ningún gate — si el usuario tecleaba el PIN antes de que volviera la respuesta,
  // submit() mandaba el slug crudo como tenantId (nunca el UUID resuelto), y un fallo acá
  // se tragaba en silencio (.catch(() => {})). Con esto, el teclado queda deshabilitado
  // mientras resolving es true, y cualquier fallo (de red o "no encontrado") queda visible.
  const [resolving, setResolving] = useState(() => !!tenantId && !isUUID(tenantId));
  const [resolveError, setResolveError] = useState("");

  useEffect(() => {
    if (isUUID(tenantId) || !tenantId) return;
    setResolving(true);
    setResolveError("");
    execPublicApi.get(`/tenants/resolve/${encodeURIComponent(tenantId)}`)
      .then(r => {
        if (r.data?.id) {
          setTenantId(r.data.id);
          localStorage.setItem(STORAGE_KEY, r.data.id);
        } else {
          setResolveError("No se encontró la empresa. Verifica el enlace.");
        }
      })
      .catch(() => {
        setResolveError("No se pudo verificar la empresa. Intenta de nuevo.");
      })
      .finally(() => setResolving(false));
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    execPublicApi
      .get(`/tenant-settings/${tenantId}`)
      .then((r) => {
        if (r.data) {
          const lu = r.data.logoUrl || r.data.logo_url || r.data.logoURL || "";
          setBrandLogo(lu);
          setBrandName(r.data.name || "Vista Ejecutiva");
        }
      })
      .catch(() => {});
  }, []);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  async function submit(p: string) {
    if (!tenantId) { setError("Empresa no configurada"); setPin(""); return; }
    if (!isUUID(tenantId)) {
      // No debería poder llegar acá (press() ya bloquea), pero por si acaso — nunca mandar
      // un slug sin resolver como tenantId al backend.
      setError("Empresa no verificada todavía. Espera un momento e intenta de nuevo.");
      setPin("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await execPublicApi.post("/auth/executive-login", {
        tenantId,
        pin: p,
      });
      localStorage.setItem(STORAGE_KEY, tenantId);
      onLogin(res.data.user?.name || "", res.data.user?.tenantId);
    } catch {
      setError("PIN incorrecto");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  function press(k: string) {
    if (loading || resolving) return;
    if (k === "del") { setPin((p) => p.slice(0, -1)); return; }
    const next = pin + k;
    setPin(next);
    if (next.length === 4) submit(next);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
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
          padding: "0 16px",
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
          padding: "0 16px",
        }}
      >
        <p
          style={{
            color: t.secondary,
            fontSize: "0.6rem",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
          }}
        >
          {resolving ? "Verificando empresa…" : "Acceso Ejecutivo"}
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

        {(error || resolveError) && (
          <p
            style={{
              color: "#EF4444",
              fontSize: "0.75rem",
              textAlign: "center",
              letterSpacing: "0.02em",
              marginTop: -4,
            }}
          >
            {resolveError || error}
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
                  disabled={loading || resolving}
                  style={{
                    background: "none",
                    border: "none",
                    color: k === "del" ? t.secondary : t.text,
                    fontSize: k === "del" ? "1.3rem" : "1.8rem",
                    fontWeight: 300,
                    fontFamily: "'Inter', sans-serif",
                    cursor: loading || resolving ? "wait" : "pointer",
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

        {!tenantId && (
          <div style={{ flexShrink: 0, textAlign: "center", paddingBottom: 14, paddingTop: 4 }}>
            <p style={{ color: "#EF4444", fontSize: "0.7rem", letterSpacing: "0.05em" }}>
              No hay empresa configurada
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
