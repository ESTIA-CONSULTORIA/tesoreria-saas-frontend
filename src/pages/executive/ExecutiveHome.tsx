import { useState } from "react";
import { useBrandingStore } from "../../core/store/useBrandingStore";
import { getTheme } from "./theme";
import { MODULES } from "./modules";
import type { ExecConfig } from "./ExecutivePage";

interface Props {
  token: string;
  config: ExecConfig;
  onReport: (module: string) => void;
  onConfig: () => void;
  onLogout: () => void;
  onAuthError: () => void;
}

const GRID_ORDER = [
  "VENTA", "COSTO", "GASTO",
  "PRESUPUESTO", "FLUJO", "BANCO",
  "NOMINA", "VACANTES", "ROTACION",
];

export default function ExecutiveHome({
  config, onReport, onConfig, onLogout,
}: Props) {
  const t = getTheme(config.theme);
  const { systemName } = useBrandingStore();
  const [pressedModule, setPressedModule] = useState<string | null>(null);

  const cellBg = config.theme === "dark" ? "#161616" : "#EFEFEF";

  const today = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const visibleKeys = GRID_ORDER.filter(
    (key) => config.modules[key] !== false && MODULES.some((m) => m.key === key),
  );

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
          padding: "24px 24px 16px",
          textAlign: "center",
        }}
      >
        <p style={{ color: t.text, fontSize: 15, fontWeight: 400, letterSpacing: "0.02em" }}>
          {systemName || "Vista Ejecutiva"}
        </p>
        <p style={{ color: t.secondary, fontSize: 11, marginTop: 3, letterSpacing: "0.04em" }}>
          {today}
        </p>
      </div>

      {/* 3×3 Grid */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gridTemplateRows: `repeat(${Math.ceil(visibleKeys.length / 3)}, 1fr)`,
          gap: 2,
          padding: "0 2px",
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
                background: cellBg,
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                WebkitTapHighlightColor: "transparent",
                outline: "none",
                opacity: isPressed ? 0.4 : 1,
                transition: "opacity 0.08s",
                minHeight: 0,
                padding: "8px 4px",
              }}
            >
              <span
                style={{
                  color: t.text,
                  fontSize: "0.7rem",
                  fontWeight: 300,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  textAlign: "center",
                  lineHeight: 1.3,
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
          onClick={onConfig}
          style={{
            background: "none",
            border: "none",
            color: t.secondary,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.04em",
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
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.04em",
            WebkitTapHighlightColor: "transparent",
            padding: 0,
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
