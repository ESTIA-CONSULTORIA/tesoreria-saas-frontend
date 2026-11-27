import { C } from "./portalPaleta";
import type { CSSProperties, ReactNode } from "react";

export const ESTADO: Record<string, { color: string; label: string }> = {
  PENDIENTE: { color: C.espera, label: "En espera de aprobación" },
  APROBADA: { color: C.aprobada, label: "Aprobada" },
  RECHAZADA: { color: C.rechazada, label: "Rechazada" },
};

export const card: CSSProperties = { background: C.tarjeta, border: `1px solid ${C.borde}`, borderRadius: 12, padding: "14px 16px" };
export const input: CSSProperties = { width: "100%", background: C.fondo, border: `1px solid ${C.bordeInput}`, borderRadius: 8, padding: "10px 12px", color: C.texto, fontSize: "0.9rem", boxSizing: "border-box" };
export const boton: CSSProperties = { background: C.texto, color: C.fondo, border: "none", borderRadius: 8, padding: "10px 16px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" };
export const botonSec: CSSProperties = { background: "transparent", color: C.claro, border: `1px solid ${C.bordeInput}`, borderRadius: 8, padding: "9px 14px", fontSize: "0.82rem", cursor: "pointer" };

export function Titulo({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
      <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 600, color: C.texto }}>{children}</h1>
      {aside}
    </div>
  );
}

export function Etiqueta({ estado }: { estado: string }) {
  const e = ESTADO[estado] ?? ESTADO.PENDIENTE;
  return <span style={{ color: e.color, border: `1px solid ${e.color}`, borderRadius: 20, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 600, whiteSpace: "nowrap" }}>{e.label}</span>;
}

export function Aviso({ texto, ok }: { texto: string; ok?: boolean }) {
  if (!texto) return null;
  return <div role={ok ? "status" : "alert"} style={{ border: `1px solid ${ok ? C.aprobada : C.rechazada}`, background: C.tarjeta, color: ok ? C.okTexto : C.error, borderRadius: 8, padding: "9px 12px", fontSize: "0.82rem", marginBottom: 12 }}>{texto}</div>;
}

export function Vacio({ texto }: { texto: string }) {
  return <div style={{ ...card, color: C.suave, textAlign: "center", fontSize: "0.85rem" }}>{texto}</div>;
}

export const mensajeError = (e: any, def: string) => e?.response?.data?.message || def;

/** Abre o descarga un documento que el servidor mandó como data URL o como enlace. */
export function abrirDocumento(d: { nombre?: string; fileData?: string; url?: string }) {
  const href = d.fileData || d.url;
  if (!href) return false;
  const a = document.createElement("a");
  a.href = href;
  a.download = `${(d.nombre || "documento").replace(/[^\wáéíóúñÁÉÍÓÚÑ .-]/g, "_")}.pdf`;
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}
