import { useEffect, useState } from "react";
import { execApi } from "./execApi";
import { getTheme } from "./theme";
import { fmtValue } from "./modules";
import { useBrandingStore } from "../../core/store/useBrandingStore";
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

const CARDS = [
  { key: "venta", label: "VENTA" },
  { key: "costo", label: "COSTO" },
  { key: "gasto", label: "GASTO" },
  { key: "flujo", label: "FLUJO" },
] as const;

export default function ExecutiveDashboard({
  token, config, companies, selectedCompanyId,
  onSelectCompany, onCompaniesLoaded, onViewModules, onLogout, onAuthError,
}: Props) {
  const t = getTheme(config.theme);
  const { systemName } = useBrandingStore();
  const [kpis, setKpis] = useState<KPIs>({ venta: 0, costo: 0, gasto: 0, flujo: 0 });
  const [loading, setLoading] = useState(true);

  const selectedCompany = companies.find((c) => String(c.id) === selectedCompanyId);
  const headerName = selectedCompany
    ? (selectedCompany.name || selectedCompany.razonSocial || "Empresa")
    : (systemName || "Vista Ejecutiva");

  const today = new Date().toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long",
  });

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

  // Load KPIs when company changes
  useEffect(() => {
    const eApi = execApi(token, selectedCompanyId);
    setLoading(true);
    Promise.all([
      eApi.get("/dashboard/kpis").then((r) => r.data).catch(() => ({})),
      eApi.get("/costs/cost-of-sales").then((r) => r.data).catch(() => null),
    ])
      .then(([kpisData, costData]) => {
        const income = Number(kpisData.income || 0);
        const expense = Number(kpisData.expense || 0);
        const costo = costData
          ? Number(costData.costoVentas || costData.total || costData.value || 0)
          : 0;
        setKpis({ venta: income, costo, gasto: expense, flujo: income - expense });
      })
      .catch((err) => {
        if (err.response?.status === 401) onAuthError();
      })
      .finally(() => setLoading(false));
  }, [token, selectedCompanyId]);

  const chipStyle = (active: boolean) => ({
    flexShrink: 0,
    background: active ? t.accent : "transparent",
    color: active ? "#111111" : t.secondary,
    border: `1px solid ${active ? t.accent : t.border}`,
    borderRadius: 20,
    padding: "6px 14px",
    fontSize: "0.65rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    WebkitTapHighlightColor: "transparent",
    whiteSpace: "nowrap" as const,
  });

  return (
    <div
      style={{
        height: "100vh",
        background: t.bg,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          padding: "32px 24px 16px",
          textAlign: "center",
        }}
      >
        <p style={{ color: t.text, fontSize: "0.9rem", fontWeight: 300, letterSpacing: "0.05em" }}>
          {headerName}
        </p>
        <p style={{ color: t.secondary, fontSize: "0.65rem", marginTop: 4, letterSpacing: "0.08em" }}>
          {today}
        </p>
      </div>

      {/* KPI 2x2 grid — 50vh */}
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
        {CARDS.map(({ key, label }) => {
          const val = kpis[key];
          return (
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
                {label}
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
                {loading ? "—" : fmtValue(val, "currency")}
              </span>
            </div>
          );
        })}
      </div>

      {/* Company selector */}
      <div style={{ flexShrink: 0, padding: "18px 20px 0" }}>
        <p
          style={{
            color: t.secondary,
            fontSize: "0.55rem",
            fontWeight: 400,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Empresa
        </p>
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 6,
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          } as React.CSSProperties}
        >
          <button
            onClick={() => onSelectCompany(null)}
            style={chipStyle(selectedCompanyId === null)}
          >
            Todas
          </button>
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectCompany(String(c.id))}
              style={chipStyle(selectedCompanyId === String(c.id))}
            >
              {(c.name || c.razonSocial || "Empresa").slice(0, 20)}
            </button>
          ))}
        </div>
      </div>

      {/* Footer — VER MÓDULOS */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          padding: "0 24px 36px",
        }}
      >
        <button
          onClick={onViewModules}
          style={{
            background: "none",
            border: "none",
            color: t.accent,
            fontSize: "0.65rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            WebkitTapHighlightColor: "transparent",
            padding: "8px 0",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          VER MÓDULOS
          <span style={{ fontSize: "0.8rem" }}>→</span>
        </button>
      </div>
    </div>
  );
}
