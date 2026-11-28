import { corteZ, estadoDiferencia } from './cajaTurno';

// Tira / corte Z de un turno: por forma de pago, lo que espera el sistema, lo que declaró la caja y la diferencia (faltante o sobrante,
// con signo y color), más los retiros y depósitos con quién pidió y quién autorizó. SOLO se pinta si el servidor mandó los totales
// (ADMIN, GERENTE o SOPORTE): la caja a ciegas nunca los recibe. Lo usan el cierre de turno y la pantalla «Cortes de caja».
const money = (v: unknown) => { const n = Number(v) || 0; return `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`; };

interface Movimiento { tipo: string; monto: number; motivo: string; solicitadoPor: string; autorizadoPor: string | null; momento: string }

export function TiraZ(p: { totales?: Record<string, any>; declaracion?: Record<string, unknown> }) {
  const z = corteZ(p.totales, p.declaracion);
  if (!z) return null;
  const color = (d: number) => (d === 0 ? '!text-content-2' : d < 0 ? '!text-danger' : '!text-ok');
  const signo = (d: number) => (d > 0 ? '+' : '');
  const movimientos: Movimiento[] = Array.isArray(p.totales?.movimientosCaja) ? p.totales!.movimientosCaja : [];
  const hayDeclaracion = !!p.declaracion && Object.keys(p.declaracion).length > 0;
  return (
    <div>
      <h4 className="font-semibold mb-2">Corte Z — Sistema vs Declarado</h4>
      {hayDeclaracion ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b !border-line">
              <th scope="col" className="text-left py-2">Forma de pago</th>
              <th scope="col" className="text-right py-2">Esperado</th>
              <th scope="col" className="text-right py-2">Declarado</th>
              <th scope="col" className="text-right py-2">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {z.filas.map((row) => (
              <tr key={row.clave} className="border-b !border-line">
                <td className="py-1.5">{row.nombre}</td>
                <td className="text-right py-1.5">{money(row.esperado)}</td>
                <td className="text-right py-1.5">{money(row.declarado)}</td>
                <td className={`text-right py-1.5 font-semibold ${color(row.diferencia)}`}>
                  {signo(row.diferencia)}{money(row.diferencia)} {estadoDiferencia(row.diferencia) === 'faltante' ? '(faltante)' : estadoDiferencia(row.diferencia) === 'sobrante' ? '(sobrante)' : '✓'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm !text-content-3">Este turno todavía no tiene precorte: no hay declaración que comparar.</p>
      )}
      <p className="mt-2 text-xs !text-content-3">
        Efectivo esperado en caja <strong className="!text-content-1">{money(z.efectivoEnCaja)}</strong> = fondo {money(z.fondoInicial)} + ventas en efectivo + depósitos − retiros. La caja declara sin el fondo.
      </p>
      {movimientos.length > 0 && (
        <div className="mt-3">
          <h5 className="mb-1 text-xs uppercase !text-content-3">Retiros y depósitos del turno</h5>
          <ul className="space-y-0.5 text-xs">
            {movimientos.map((m, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>{m.tipo === 'RETIRO' ? 'Retiro' : 'Depósito'} · {m.motivo || 'sin motivo'} · pidió {m.solicitadoPor}{m.autorizadoPor ? ` · autorizó ${m.autorizadoPor}` : ''}</span>
                <span className="font-semibold">{money(m.monto)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
