import type { ReactNode } from 'react';

// Dashboard de la skin ESTIA Isotipo (docs/IDENTIDAD-ISOTIPO.md): mismos datos que DashboardPage, otra composición. Sin tarjetas con radio:
// una cifra protagonista, una cinta de datos con bisel a 30°, prismas isométricos por empresa/sucursal y una lista de atención.
// Solo tokens de color (coloresFijos.spec); las formas salen de las variables de la skin (--bisel-*, --marca-*).

export interface FilaDesglose {
  nombre: string;
  ingresos: number;
  egresos: number;
}

interface Props {
  cargando: boolean;
  error: string;
  ambito: string;
  periodo: string;
  periodos: { value: string; label: string }[];
  onPeriodo: (p: string) => void;
  ventas: number;
  egresos: number;
  saldo: number;
  variacionVentas: number | null;
  filas: FilaDesglose[];
  atencion: { id: string; texto: string; ir: string }[];
  onIr: (ruta: string) => void;
}

const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-MX')}`;

function Divisor() {
  return <span aria-hidden="true" className="iso-divisor w-full" />;
}

function SeparadorInclinado() {
  return <span aria-hidden="true" className="h-10 w-0.5 shrink-0 -skew-x-[30deg] bg-line-field" />;
}

function Dato({ etiqueta, valor, tono, nota }: { etiqueta: string; valor: string; tono?: 'ok' | 'danger'; nota?: string }) {
  return (
    <div className="min-w-0 flex-1 px-5">
      <p className="text-[11px] uppercase tracking-[0.14em] !text-content-3">{etiqueta}</p>
      <p className={`iso-numero text-2xl font-semibold ${tono === 'ok' ? '!text-ok' : tono === 'danger' ? '!text-danger' : '!text-content-1'}`}>{valor}</p>
      {nota ? <p className="text-xs !text-content-3">{nota}</p> : null}
    </div>
  );
}

/** Prismas isométricos: frente, cara superior (faceta clara) y cara lateral (faceta oscura). Cada prisma lleva su valor escrito. */
function Prismas({ filas }: { filas: FilaDesglose[] }) {
  const max = Math.max(1, ...filas.flatMap((f) => [f.ingresos, f.egresos]));
  const H = 170;
  const ancho = 52;
  const dx = 18; // profundidad a 30°: dx = d·cos30, dy = d·sin30
  const dy = 10;
  const n = Math.max(filas.length, 1);
  const paso = Math.max(170, Math.floor(680 / n)); // los grupos se reparten a lo ancho del panel
  const grupo = 2 * ancho + dx + 8;
  const W = n * paso + 40;

  const prisma = (x: number, valor: number, frente: string, etiqueta: string) => {
    const h = Math.max(4, Math.round((valor / max) * H));
    const y = 34 + (H - h);
    return (
      <g key={etiqueta + x}>
        <rect className="iso-columna" x={x} y={y} width={ancho} height={h} style={{ fill: `rgb(var(${frente}))` }} />
        <polygon points={`${x},${y} ${x + dx},${y - dy} ${x + ancho + dx},${y - dy} ${x + ancho},${y}`} style={{ fill: 'rgb(var(--marca-faceta))' }} />
        <polygon points={`${x + ancho},${y} ${x + ancho + dx},${y - dy} ${x + ancho + dx},${y + h - dy} ${x + ancho},${y + h}`} style={{ fill: 'rgb(var(--marca-faceta-osc))' }} />
        <text x={x + ancho / 2 + dx / 2} y={y - dy - 5} textAnchor="middle" style={{ fill: 'rgb(var(--text-1))', fontSize: 12, fontWeight: 600 }}>{pesos(valor)}</text>
      </g>
    );
  };

  return (
    <svg viewBox={`0 0 ${W} ${H + 78}`} className="h-auto max-h-[250px] w-full" preserveAspectRatio="xMinYMid meet" role="img" aria-label={`Ingresos y egresos por ${filas.length > 1 ? 'empresa o sucursal' : 'periodo'}: ${filas.map((f) => `${f.nombre}, ingresos ${pesos(f.ingresos)}, egresos ${pesos(f.egresos)}`).join('; ')}`}>
      <line x1="0" y1={34 + H} x2={W} y2={34 + H} style={{ stroke: 'rgb(var(--border-field))', strokeWidth: 1 }} />
      {filas.map((f, i) => {
        const x0 = 20 + i * paso + (paso - grupo) / 2;
        return (
          <g key={f.nombre + i}>
            {prisma(x0, f.ingresos, '--btn', 'ing')}
            {prisma(x0 + ancho + dx + 8, f.egresos, '--accent', 'egr')}
            <text x={x0 + ancho + dx / 2 + 4} y={H + 58} textAnchor="middle" style={{ fill: 'rgb(var(--text-2))', fontSize: 12 }}>{f.nombre.length > 22 ? f.nombre.slice(0, 21) + '…' : f.nombre}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function DashboardIsotipo(p: Props) {
  const utilidad = p.ventas - p.egresos;
  const margen = p.ventas > 0 ? Math.round((utilidad / p.ventas) * 100) : 0;
  const variacion = p.variacionVentas;
  const totalIngresos = p.filas.reduce((s, f) => s + f.ingresos, 0);

  const cuerpo: ReactNode = p.cargando ? (
    <p role="status" className="px-8 py-10 text-sm !text-content-3">Cargando datos…</p>
  ) : p.error ? (
    <p role="alert" className="px-8 py-10 text-sm !text-danger">{p.error}</p>
  ) : (
    <>
      {/* Cifra protagonista + cinta de datos */}
      <section aria-label="Resumen del periodo" className="px-8 pt-5">
        <p className="text-xs uppercase tracking-[0.18em] !text-content-3">Ventas del periodo</p>
        <div className="flex items-end gap-6">
          <p className="iso-numero iso-entrada text-[72px] font-bold leading-none !text-content-1">{pesos(p.ventas)}</p>
          {variacion !== null && (
            <p className={`mb-2 flex items-center gap-2 text-sm font-medium ${variacion >= 0 ? '!text-ok' : '!text-danger'}`}>
              <span aria-hidden="true" className="iso-marcador" style={{ transform: `rotate(${variacion >= 0 ? -90 : 90}deg)` }} />
              {variacion >= 0 ? '+' : ''}{variacion.toFixed(1)} % frente al periodo anterior
            </p>
          )}
        </div>
        <div className="iso-bisel mt-4 flex items-stretch gap-0 !bg-surface-1 py-4">
          <Dato etiqueta="Egresos" valor={pesos(p.egresos)} />
          <SeparadorInclinado />
          <Dato etiqueta="Utilidad antes de impuestos" valor={pesos(utilidad)} tono={utilidad >= 0 ? 'ok' : 'danger'} nota={`Margen ${margen} %`} />
          <SeparadorInclinado />
          <Dato etiqueta="Saldo disponible" valor={pesos(p.saldo)} />
        </div>
      </section>

      <section className="mt-6 grid grid-cols-[1.45fr_1fr] gap-10 px-8">
        {/* Prismas */}
        <div className="min-w-0">
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] !text-content-2">Ingresos y egresos</h2>
            <p className="flex items-center gap-4 text-xs !text-content-3">
              <span className="flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-2.5 w-2.5 bg-btn" />Ingresos</span>
              <span className="flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-2.5 w-2.5 bg-accent" />Egresos</span>
            </p>
          </div>
          <Divisor />
          {p.filas.length === 0 ? <p className="py-8 text-sm !text-content-3">Todavía no hay movimientos en este periodo.</p> : <Prismas filas={p.filas} />}
        </div>

        {/* Atención */}
        <div className="min-w-0">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-[0.14em] !text-content-2">Requiere atención</h2>
          <Divisor />
          {p.atencion.length === 0 ? (
            <div className="flex items-center gap-4 py-6">
              <span aria-hidden="true" className="iso-marca h-20 w-[72px] shrink-0" />
              <p className="text-sm !text-content-2">Nada pendiente por ahora.<span className="block text-xs !text-content-3">Cuando haya cortes por revisar o facturas vencidas, aparecen aquí.</span></p>
            </div>
          ) : (
            <ul className="mt-1">
              {p.atencion.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => p.onIr(a.ir)} className="flex w-full items-center gap-3 py-3 text-left text-sm !text-content-1 hover:!bg-surface-1">
                    <span aria-hidden="true" className="iso-marcador !text-warn" />
                    <span className="flex-1">{a.texto}</span>
                    <span aria-hidden="true" className="!text-content-3">›</span>
                  </button>
                  <Divisor />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Desglose */}
      {p.filas.length > 0 && (
        <section className="mt-5 px-8 pb-6">
          <table className="w-full text-sm">
            <caption className="sr-only">Desglose de ingresos y egresos</caption>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.14em] !text-content-3">
                <th scope="col" className="py-1 font-medium">Empresa o sucursal</th>
                <th scope="col" className="py-1 text-right font-medium">Ingresos</th>
                <th scope="col" className="py-1 text-right font-medium">Egresos</th>
                <th scope="col" className="py-1 text-right font-medium">Participación</th>
              </tr>
            </thead>
            <tbody>
              {p.filas.map((f, i) => (
                <tr key={f.nombre + i} className="border-t !border-line">
                  <td className="py-2 !text-content-1">{f.nombre}</td>
                  <td className="iso-numero py-2 text-right !text-content-1">{pesos(f.ingresos)}</td>
                  <td className="iso-numero py-2 text-right !text-content-2">{pesos(f.egresos)}</td>
                  <td className="iso-numero py-2 text-right !text-content-2">{totalIngresos > 0 ? ((f.ingresos / totalIngresos) * 100).toFixed(1) : '0'} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );

  return (
    <div className="iso-fondo overflow-y-auto" style={{ height: 'calc(100vh - 48px)', backgroundColor: 'rgb(var(--bg))' }}>
      <header className="flex items-center justify-between px-8 pt-5">
        <div>
          <h1 className="text-lg font-semibold !text-content-1">Dashboard Ejecutivo</h1>
          <p className="text-xs !text-content-3">{p.ambito}</p>
        </div>
        <div role="group" aria-label="Periodo" className="flex gap-1">
          {p.periodos.map((x) => (
            <button
              key={x.value}
              type="button"
              aria-pressed={p.periodo === x.value}
              onClick={() => p.onPeriodo(x.value)}
              className={`iso-pestana px-4 py-1.5 text-xs ${p.periodo === x.value ? '!bg-btn !text-on-solid' : '!bg-surface-2 !text-content-2'}`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </header>
      {cuerpo}
    </div>
  );
}
