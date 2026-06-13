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

  function setTheme(theme: "dark" | "light") {
    setDraft((prev) => ({ ...prev, theme }));
  }

  function save() {
    onSave(draft);
    onBack();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bg,
        fontFamily: "'Inter', sans-serif",
        padding: "24px 24px 48px",
        transition: "background 0.2s",
      }}
    >
      <div style={{ maxWidth: 430, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 36,
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
              padding: 0,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Volver
          </button>
          <p style={{ color: t.text, fontSize: 16, fontWeight: 600 }}>Configuración</p>
          <button
            onClick={save}
            style={{
              color: t.accent,
              background: "none",
              border: "none",
              fontSize: 13,
              cursor: "pointer",
              padding: 0,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Guardar
          </button>
        </div>

        {/* Apariencia */}
        <p
          style={{
            color: t.secondary,
            fontSize: 10,
            letterSpacing: "0.12em",
            marginBottom: 10,
          }}
        >
          APARIENCIA
        </p>
        <div
          style={{
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            marginBottom: 28,
            overflow: "hidden",
          }}
        >
          {(["dark", "light"] as const).map((mode, i) => (
            <button
              key={mode}
              onClick={() => setTheme(mode)}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                background: "none",
                border: "none",
                borderBottom: i === 0 ? `1px solid ${t.border}` : "none",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <span style={{ color: t.text, fontSize: 14 }}>
                {mode === "dark" ? "Oscuro" : "Claro"}
              </span>
              {draft.theme === mode && (
                <span style={{ color: t.accent, fontSize: 11 }}>activo</span>
              )}
            </button>
          ))}
        </div>

        {/* Módulos */}
        <p
          style={{
            color: t.secondary,
            fontSize: 10,
            letterSpacing: "0.12em",
            marginBottom: 10,
          }}
        >
          MÓDULOS VISIBLES
        </p>
        <div
          style={{
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            marginBottom: 40,
            overflow: "hidden",
          }}
        >
          {MODULES.map((mod, i) => {
            const isOn = draft.modules[mod.key] !== false;
            return (
              <button
                key={mod.key}
                onClick={() => toggleModule(mod.key)}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 20px",
                  background: "none",
                  border: "none",
                  borderBottom: i < MODULES.length - 1 ? `1px solid ${t.border}` : "none",
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <span style={{ color: t.text, fontSize: 14 }}>{mod.label}</span>
                {/* Toggle pill */}
                <div
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
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
                      left: isOn ? 23 : 3,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: t.bg,
                      transition: "left 0.2s",
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: 12,
            border: "1px solid rgba(239,68,68,0.35)",
            background: "none",
            color: "#EF4444",
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
