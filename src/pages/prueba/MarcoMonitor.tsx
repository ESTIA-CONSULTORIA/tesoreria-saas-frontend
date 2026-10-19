// Marco de monitor para las capturas de pantalla. Con `src` muestra la captura real; sin ella, una maqueta neutra (barras, sin texto ni cifras)
// marcada como decorativa. La captura lleva su `alt`; el texto que la acompaña en la página es el que describe la función.
export default function MarcoMonitor({ src, alt, prioridad = false }: { src: string | null; alt: string; prioridad?: boolean }) {
  return (
    <figure className="marco-monitor" data-marco-monitor>
      <div className="marco-monitor-pantalla">
        {src ? (
          <img src={src} alt={alt} width={1600} height={1000} loading={prioridad ? 'eager' : 'lazy'} decoding="async" className="block w-full h-full object-cover object-top" />
        ) : (
          <div aria-hidden="true" className="marco-monitor-maqueta">
            <span className="m-barra" />
            <span className="m-lateral" />
            <span className="m-fila" style={{ width: '82%' }} />
            <span className="m-fila" style={{ width: '64%' }} />
            <span className="m-fila" style={{ width: '74%' }} />
            <span className="m-tarjeta" />
          </div>
        )}
      </div>
      <div aria-hidden="true" className="marco-monitor-cuello" />
      <div aria-hidden="true" className="marco-monitor-base" />
    </figure>
  );
}
