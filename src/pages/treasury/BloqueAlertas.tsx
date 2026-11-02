import { conteoTexto, dichoDias, formatoMonto, resumenDeFilas, textoDias, type FilaAlerta } from './alertasTesoreria';

interface Props {
  titulo: string;
  /** Línea única que explica las columnas (así no se repite «vencido» en cada fila). */
  subtitulo: string;
  tono: 'danger' | 'warn';
  singular: string;
  plural: string;
  /** Adjetivo para lectores de pantalla en la columna de días: «vencida», «pendiente». */
  adjetivo: string;
  /** Texto del estado vacío (una línea). */
  vacio: string;
  filas: FilaAlerta[];
}

// Lista densa a dos columnas: una fila por alerta (concepto, monto, días). Colores y bordes salen de los tokens de la skin
// (nada de hex fijos), así cumple el contraste AA en las cuatro. No tiene elementos enfocables: no cambia el orden del teclado.
export default function BloqueAlertas({ titulo, subtitulo, tono, singular, plural, adjetivo, vacio, filas }: Props) {
  const { cuenta, total } = resumenDeFilas(filas);
  const borde = tono === 'danger' ? 'border-l-danger' : 'border-l-warn';
  const textoTono = tono === 'danger' ? 'text-danger' : 'text-warn';

  return (
    <section
      data-bloque-alertas={tono}
      aria-label={titulo}
      className={`rounded-md border border-line border-l-4 ${borde} bg-surface-1`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 pt-3">
        <h3 className="text-sm font-semibold text-content-1">{titulo}</h3>
        <p className="text-xs tabular-nums text-content-2">
          {conteoTexto(cuenta, singular, plural)}
          {cuenta > 0 && <> · Total {formatoMonto(total)}</>}
        </p>
      </div>
      <p className="px-4 pb-2 text-xs text-content-2">{cuenta > 0 ? subtitulo : vacio}</p>

      {cuenta > 0 && (
        <ul className="px-4 pb-3 md:columns-2 md:gap-x-8">
          {filas.map((f, i) => (
            <li
              key={`${f.concepto}-${i}`}
              data-fila-alerta
              className="flex break-inside-avoid items-baseline gap-3 border-b border-line py-1 text-[13px] leading-5"
            >
              <span className="min-w-0 flex-1 truncate text-content-1" title={f.concepto}>{f.concepto}</span>
              <span className="shrink-0 text-right tabular-nums text-content-1">{formatoMonto(f.monto)}</span>
              <span className={`w-11 shrink-0 text-right tabular-nums ${textoTono}`} title={dichoDias(f.dias, adjetivo)}>
                <span aria-hidden="true">{textoDias(f.dias)}</span>
                <span className="sr-only">{dichoDias(f.dias, adjetivo)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
