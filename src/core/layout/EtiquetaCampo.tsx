// Rótulo de los selectores de la barra superior («Negocio», «Empresa / Sucursal», «Sucursal»): punto de estado + texto.
// El punto relleno indica que hay algo elegido (no depende solo del color del borde del control).
export default function EtiquetaCampo({ texto, activo }: { texto: string; activo: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', fontSize: 12, color: 'rgb(var(--text-1))' }}>
      <span
        aria-hidden="true"
        style={{ width: 7, height: 7, borderRadius: '50%', background: activo ? 'rgb(var(--accent-alt))' : 'transparent', border: '1px solid rgb(var(--accent-alt))', flexShrink: 0 }}
      />
      {texto}
    </span>
  );
}
