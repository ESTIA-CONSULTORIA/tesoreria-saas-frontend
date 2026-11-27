// Paleta y estilos del portal del empleado (tema oscuro propio, independiente de las skins del ERP). Es un módulo que DEFINE colores.
export const C = {
  fondo: "#0A0A0A", tarjeta: "#0E0E0E", borde: "#1C1C1C", bordeInput: "#2A2A2A", texto: "#F5F5F5", suave: "#9A9A9A", medio: "#B0B0B0", claro: "#D8D8D8", activo: "#1E1E1E", blanco: "#fff",
  aviso: "#FCD34D", avisoBorde: "#F59E0B66", avisoBorde2: "#F59E0B55", error: "#FCA5A5", espera: "#F59E0B", aprobada: "#22C55E", rechazada: "#EF4444", okTexto: "#86EFAC",
} as const;

export const PORTAL_CSS = `
.pe-root{position:fixed;inset:0;display:flex;flex-direction:column;background:#0A0A0A;color:#F5F5F5}
.pe-top{flex:0 0 56px;display:flex;align-items:center;gap:16px;padding:0 20px;background:#080808;border-bottom:1px solid #1C1C1C}
.pe-top img{height:30px;width:auto}
.pe-top .pe-title{font-size:.85rem;color:#C8C8C8;letter-spacing:.06em}
.pe-nav{display:flex;gap:4px;margin-left:auto}
.pe-tab{display:flex;align-items:center;gap:6px;background:transparent;border:none;border-radius:8px;color:#B0B0B0;padding:8px 12px;font-size:.85rem;cursor:pointer}
.pe-tab:hover{background:#161616;color:#fff}
.pe-tab:focus-visible,.pe-out:focus-visible{outline:2px solid #fff;outline-offset:2px}
.pe-tab[aria-current="page"]{background:#1E1E1E;color:#fff;font-weight:600}
.pe-out{background:transparent;border:1px solid #2A2A2A;border-radius:8px;color:#C8C8C8;padding:7px 12px;font-size:.8rem;cursor:pointer}
.pe-main{flex:1;overflow-y:auto}
.pe-wrap{max-width:880px;margin:0 auto;padding:20px 20px 32px}
@media (max-width:720px){
  .pe-top{padding:0 14px}
  .pe-top .pe-title{display:none}
  .pe-out{margin-left:auto}
  .pe-nav{position:fixed;left:0;right:0;bottom:0;margin:0;height:64px;background:#080808;border-top:1px solid #1C1C1C;justify-content:space-around;gap:0;z-index:5}
  .pe-tab{flex-direction:column;gap:2px;padding:6px 2px;font-size:.68rem;flex:1;border-radius:0}
  .pe-main{padding-bottom:72px}
}
`;
