import { useEffect, useState } from "react";
import { execApi } from "./execApi";
import { getTheme } from "./theme";
import { fmtValue } from "./modules";
import type { ExecConfig } from "./ExecutivePage";
import type { Company } from "./ExecutivePage";

interface Props {
  token: string;
  config: ExecConfig;
  companies: Company[];
  selectedCompanyId: string | null;
  onSelectCompany: (id: string | null) => void;
  onCompaniesLoaded: (companies: Company[]) => void;
  onViewModules: () => void;
  onLogout: () => void;
  onAuthError: () => void;
}

interface KPIs {
  venta: number;
  costo: number;
  gasto: number;
  flujo: number;
}

function pctChange(current: number, prev: number): string | null {
  if (!prev || prev === 0) return null;
  const pct = ((current - prev) / Math.abs(prev)) * 100;
  return `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct).toFixed(1)}%`;
}

function companyName(c: Company): string {
  return (c as any).tradeName || (c as any).legalName || c.name || c.razonSocial || "Empresa";
}

export default function ExecutiveDashboard({
  token, config, companies,
  onSelectCompany, onCompaniesLoaded, onViewModules, onLogout, onAuthError,
}: Props) {
  const t = getTheme(config.theme);
  const [kpis, setKpis] = useState<KPIs>({ venta: 0, costo: 0, gasto: 0, flujo: 0 });
  const [prevKpis, setPrevKpis] = useState<KPIs | null>(() => {
    try {
      const s = localStorage.getItem("exec_kpis_prev");
      return s ? (JSON.parse(s) as KPIs) : null;
    } catch { return null; }
  });
  const [costoLabel, setCostoLabel] = useState("COSTO");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [pressedCompany, setPressedCompany] = useState<string | null>(null);

  const userName = sessionStorage.getItem("exec_user_name") || "";

  // Real-time clock — refresh every 60 s
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
  const dateStr = now.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" });
  const clockLabel = `${timeStr} · ${dateStr}`;

  // Load companies once
  useEffect(() => {
    if (companies.length > 0) return;
    execApi(token)
      .get("/companies")
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        onCompaniesLoaded(list);
      })
      .catch(() => {});
  }, []);

  // Load KPIs — always consolidated (no company filter)
  useEffect(() => {
    const eApi = execApi(token);
    setLoading(true);
    Promise.all([
      eApi.get("/dashboard/kpis").then((r) => r.data).catch(() => ({})),
      eApi.get("/costs/cost-of-sales").then((r) => r.data).catch(() => null),
    ])
      .then(([kpisData, costData]) => {
        const income = Number(kpisData.income || 0);
        const expense = Number(kpisData.expense || 0);

        let costo: number;
        if (costData) {
          const raw = Number(costData.costoVentas || costData.total || costData.value || 0);
          if (raw > 0) {
            costo = raw;
            setCostoLabel("COSTO");
          } else {
            costo = Math.round(income * 0.30);
            setCostoLabel("COSTO EST.");
          }
        } else {
          costo = Math.round(income * 0.30);
          setCostoLabel("COSTO EST.");
        }

        const next: KPIs = { venta: income, costo, gasto: expense, flujo: income - expense };
        setPrevKpis((prev) => {
          localStorage.setItem("exec_kpis_prev", JSON.stringify(prev ?? next));
          return prev;
        });
        setKpis(next);
      })
      .catch((err) => {
        if (err.response?.status === 401) onAuthError();
      })
      .finally(() => setLoading(false));
  }, [token]);

  const cardKeys = ["venta", "costo", "gasto", "flujo"] as const;
  const cardLabels: Record<string, string> = {
    venta: "VENTA",
    costo: costoLabel,
    gasto: "GASTO",
    flujo: "FLUJO",
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header — greeting + real-time clock */}
      <div
        style={{
          flexShrink: 0,
          padding: "36px 24px 16px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: t.secondary,
            fontSize: "0.6rem",
            fontWeight: 400,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          BIENVENIDO
        </p>
        {userName && (
          <p
            style={{
              color: t.text,
              fontSize: "1.1rem",
              fontWeight: 300,
              letterSpacing: "0.02em",
              marginBottom: 6,
            }}
          >
            {userName}
          </p>
        )}
        <p style={{ color: t.secondary, fontSize: "0.65rem", letterSpacing: "0.06em" }}>
          {clockLabel}
        </p>
      </div>

      {/* KPI 2×2 grid — consolidated totals */}
      <div
        style={{
          flexShrink: 0,
          height: "50vh",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 10,
          padding: "0 20px",
        }}
      >
        {cardKeys.map((key) => (
          <div
            key={key}
            style={{
              background: t.card,
              border: t.cardBorder,
              boxShadow: t.cardShadow,
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "space-between",
              padding: "14px 16px",
              minHeight: 0,
            }}
          >
            <span
              style={{
                color: t.secondary,
                fontSize: "0.6rem",
                fontWeight: 400,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              {cardLabels[key]}
            </span>
            <span
              style={{
                color: loading ? t.secondary : t.text,
                fontSize: "2.2rem",
                fontWeight: 200,
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {loading ? "—" : fmtValue(kpis[key], "currency")}
            </span>
            {(() => {
              const pct = !loading && prevKpis ? pctChange(kpis[key], prevKpis[key]) : null;
              const up = pct?.startsWith("▲");
              return (
                <span style={{
                  fontSize: "0.6rem",
                  letterSpacing: "0.04em",
                  color: pct ? (up ? "#4ade80" : "#f87171") : t.secondary,
                }}>
                  {pct ?? "— %"}
                </span>
              );
            })()}
          </div>
        ))}
      </div>

      {/* Company selector — each button navigates directly to grid */}
      <div style={{ flexShrink: 0, padding: "24px 20px 0", textAlign: "center" }}>
        <p
          style={{
            color: t.secondary,
            fontSize: "0.55rem",
            fontWeight: 400,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          SELECCIONA UNA EMPRESA
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {companies.map((c) => {
            const cId = String(c.id);
            const isPressed = pressedCompany === cId;
            return (
              <button
                key={cId}
                onClick={() => {
                  onSelectCompany(cId);
                  onViewModules();
                }}
                onPointerDown={() => setPressedCompany(cId)}
                onPointerUp={() => setPressedCompany(null)}
                onPointerLeave={() => setPressedCompany(null)}
                style={{
                  background: "transparent",
                  border: `1px solid ${t.border}`,
                  borderRadius: 6,
                  padding: "10px 20px",
                  color: t.text,
                  fontSize: "0.7rem",
                  fontWeight: 300,
                  letterSpacing: "0.05em",
                  textAlign: "center",
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  WebkitTapHighlightColor: "transparent",
                  outline: "none",
                  opacity: isPressed ? 0.5 : 1,
                  transform: isPressed ? "scale(0.97)" : "scale(1)",
                  transition: "opacity 0.1s, transform 0.1s",
                }}
              >
                {companyName(c)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Footer — logout only */}
      <div
        style={{
          flexShrink: 0,
          padding: "10px 20px 28px",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={onLogout}
          style={{
            background: "none",
            border: "none",
            color: t.secondary,
            fontSize: "0.6rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            WebkitTapHighlightColor: "transparent",
            padding: 0,
          }}
        >
          Salir
        </button>
      </div>
    </div>
  );
}
