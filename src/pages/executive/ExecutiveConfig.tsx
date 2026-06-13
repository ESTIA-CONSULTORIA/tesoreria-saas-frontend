import { useState } from "react";
import { getTheme } from "./theme";
import { MODULES } from "./modules";
import type { ExecConfig } from "./ExecutivePage";

interface Props {
  config: ExecConfig;
  onSave: (c: ExecConfig) => void;
  onBack: () => void;
  onLogout: () => void;
}

export default function ExecutiveConfig({ config, onSave, onBack, onLogout }: Props) {
  const [draft, setDraft] = useState<ExecConfig>({
    ...config,
    modules: { ...config.modules },
  });
  const t = getTheme(draft.theme);

  function toggleModule(key: string) {
    setDraft((prev) => ({
      ...prev,
      modules: { ...prev.modules, [key]: !prev.modules[key] },
    }));
  }

  function save() {
    onSave(draft);
    onBack();
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
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          padding: "20px 24px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={onBack}
          style={{
            color: t.secondary,
            background: "none",
            border: "none",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            padding: 0,
          }}
        >
          Cancelar
        </button>
        <p style={{ color: t.text, fontSize: 14, fontWeight: 500 }}>Configuración</p>
        <button
          onClick={save}
          style={{
            color: t.accent,
            background: "none",
            border: "none",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            padding: 0,
          }}
        >
          Guardar
        </button>
      </div>

      {/* Theme selector */}
      <div style={{ flexShrink: 0, padding: "4px 24px 10px" }}>
        <p
          style={{
            color: t.secondary,
            fontSize: 10,
            letterSpacing: "0.1em",
            marginBottom: 8,
          }}
        >
          APARIENCIA
        </p>
        <div style={{ display: "flex" }}>
          {(["dark", "light"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setDraft((prev) => ({ ...prev, theme: mode }))}
              style={{
                flex: 1,
                padding: "10px 0",
                background: "none",
                border: "none",
                borderBottom: `2px solid ${draft.theme === mode ? t.accent : t.border}`,
                color: draft.theme === mode ? t.text : t.secondary,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {mode === "dark" ? "Oscuro" : "Claro"}
            </button>
          ))}
        </div>
      </div>

      {/* Module label */}
      <div style={{ flexShrink: 0, padding: "4px 24px 6px" }}>
        <p style={{ color: t.secondary, fontSize: 10, letterSpacing: "0.1em" }}>
          MÓDULOS VISIBLES
        </p>
      </div>

      {/* Module list — fills remaining space */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "0 24px",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {MODULES.map((mod, i) => {
          const isOn = draft.modules[mod.key] !== false;
          const isLast = i === MODULES.length - 1;
          return (
            <button
              key={mod.key}
              onClick={() => toggleModule(mod.key)}
              style={{
                flex: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "none",
                border: "none",
                borderBottom: isLast ? "none" : `1px solid ${t.border}`,
                padding: 0,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                WebkitTapHighlightColor: "transparent",
                minHeight: 0,
                outline: "none",
              }}
            >
              <span style={{ color: t.text, fontSize: 13 }}>{mod.label}</span>
              {/* Toggle pill */}
              <div
                style={{
                  width: 40,
                  height: 22,
                  borderRadius: 11,
                  background: isOn ? t.accent : t.border,
                  position: "relative",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 3,
                    left: isOn ? 21 : 3,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: t.bgColor,
                    transition: "left 0.2s",
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Logout */}
      <div style={{ flexShrink: 0, padding: "10px 24px 34px" }}>
        <button
          onClick={onLogout}
          style={{
            width: "100%",
            padding: "14px 0",
            background: "none",
            border: "none",
            color: "#EF4444",
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
