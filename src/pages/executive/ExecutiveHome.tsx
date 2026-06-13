import { useState } from "react";
import { useBrandingStore } from "../../core/store/useBrandingStore";
import { getTheme } from "./theme";
import { MODULES } from "./modules";
import type { ExecConfig } from "./ExecutivePage";
import type { Company } from "./ExecutivePage";

interface Props {
  token: string;
  config: ExecConfig;
  selectedCompanyId: string | null;
  companies: Company[];
  onReport: (module: string) => void;
  onConfig: () => void;
  onLogout: () => void;
  onAuthError: () => void;
  onBack: () => void;
}

const GRID_ORDER = [
  "VENTA", "COSTO", "GASTO",
  "PRESUPUESTO", "FLUJO", "BANCO",
  "NOMINA", "VACANTES", "ROTACION",
];

export default function ExecutiveHome({
  config, companies, selectedCompanyId,
  onReport, onConfig, onLogout, onBack,
}: Props) {
  const t = getTheme(config.theme);
  const { systemName } = useBrandingStore();
  const [pressedModule, setPressedModule] = useState<string | null>(null);

  const selectedCompany = companies.find((c) => String(c.id) === selectedCompanyId);
  const headerName = selectedCompany
    ? (selectedCompany.name || selectedCompany.razonSocial || "")
    : (systemName || "Vista Ejecutiva");

  const visibleKeys = GRID_ORDER.filter(
    (key) =>
      config.modules[key] !== false && MODULES.some((m) => m.key === key),
  );
  const rows = Math.ceil(visibleKeys.length / 3);

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
      {/* Header — minimal */}
      <div
        style={{
          flexShrink: 0,
          padding: "28px 24px 14px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: t.text,
            fontSize: "0.85rem",
            fontWeight: 300,
            letterSpacing: "0.05em",
          }}
        >
          {headerName}
        </p>
      </div>

      {/* 3×3 Grid */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: 10,
          padding: "0 16px",
          minHeight: 0,
        }}
      >
        {visibleKeys.map((key) => {
          const mod = MODULES.find((m) => m.key === key)!;
          const isPressed = pressedModule === key;
          return (
            <button
              key={key}
              onClick={() => onReport(key)}
              onPointerDown={() => setPressedModule(key)}
              onPointerUp={() => setPressedModule(null)}
              onPointerLeave={() => setPressedModule(null)}
              style={{
                background: t.card,
                border: t.cardBorder,
                boxShadow: t.cardShadow,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                WebkitTapHighlightColor: "transparent",
                outline: "none",
                opacity: isPressed ? 0.5 : 1,
                transform: isPressed ? "scale(0.97)" : "scale(1)",
                transition: "opacity 0.1s, transform 0.1s",
                minHeight: 0,
                padding: "8px 4px",
              }}
            >
              <span
                style={{
                  color: t.accent,
                  fontSize: "0.65rem",
                  fontWeight: 400,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  textAlign: "center",
                  lineHeight: 1.4,
                  wordBreak: "break-word",
                }}
              >
                {mod.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          flexShrink: 0,
          padding: "10px 20px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={onBack}
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
          ← RESUMEN
        </button>
        <div style={{ display: "flex", gap: 16 }}>
          <button
            onClick={onConfig}
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
            Configuración
          </button>
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
    </div>
  );
}
