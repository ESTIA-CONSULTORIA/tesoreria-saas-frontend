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

function companyLabel(companies: Company[], selectedId: string | null, fallback: string): string {
  const c = companies.find((co) => String(co.id) === selectedId);
  if (!c) return fallback;
  return (c as any).tradeName || (c as any).legalName || c.name || c.razonSocial || fallback;
}

export default function ExecutiveHome({
  config, companies, selectedCompanyId,
  onReport, onConfig, onLogout, onBack,
}: Props) {
  const t = getTheme(config.theme);
  const { systemName } = useBrandingStore();
  const [pressedModule, setPressedModule] = useState<string | null>(null);

  const headerName = companyLabel(companies, selectedCompanyId, systemName || "Vista Ejecutiva");

  const visibleKeys = GRID_ORDER.filter(
    (key) => config.modules[key] !== false && MODULES.some((m) => m.key === key),
  );
  const rows = Math.ceil(visibleKeys.length / 3);

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
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          padding: "24px 24px 12px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: t.text,
            fontSize: "0.8rem",
            fontWeight: 300,
            letterSpacing: "0.05em",
          }}
        >
          {headerName}
        </p>
      </div>

      {/* 3×3 Grid — 65% height, square buttons */}
      <div
        style={{
          flexShrink: 0,
          height: "65%",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: 10,
          padding: "0 16px",
          boxSizing: "border-box" as const,
          alignItems: "center",
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
                aspectRatio: "1",
                width: "100%",
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
                padding: "6px",
              }}
            >
              <span
                style={{
                  color: t.accent,
                  fontSize: "0.55rem",
                  fontWeight: 400,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  textAlign: "center",
                  lineHeight: 1.2,
                  wordBreak: "break-word",
                }}
              >
                {mod.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

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
