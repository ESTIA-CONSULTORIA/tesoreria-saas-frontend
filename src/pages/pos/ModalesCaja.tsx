import type { ChangeEvent, RefObject } from 'react';
import { ModalPOS } from '../../core/components/ModalPOS';
import { DENOMINACIONES, conciliacionTurno, diferenciasPrecorte, efectivoEsperado, totalContado, type TurnoCaja } from './cajaTurno';

// Ventanas de caja de uso diario (apertura, retiro, depósito, precorte, corte, cobro). Presentacionales: el estado y las
// llamadas a la API viven en POSPage. Todas usan ModalPOS (90vw × 90vh, botones fijos, columnas, sin scroll a 1366×768).

const money = (v: unknown) => { const n = Number(v) || 0; return `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`; };
const colorDif = (d: number) => (d === 0 ? 'text-slate-300' : d < 0 ? 'text-red-400' : 'text-green-400');
const btnCancelar = 'px-6 py-2.5 rounded bg-slate-700 text-white hover:bg-slate-600';

// ───────────────────────── Apertura de turno ─────────────────────────
export function AperturaTurnoModal(p: {
  cajero: string;
  fondo: string;
  setFondo: (v: string) => void;
  notas: string;
  setNotas: (v: string) => void;
  onCancel: () => void;
  onOpen: () => void;
}) {
  return (
    <ModalPOS
      size="md"
      title="Apertura de Turno"
      onClose={p.onCancel}
      footer={
        <>
          <button onClick={p.onCancel} className={`flex-1 ${btnCancelar}`}>Cancelar</button>
          <button onClick={p.onOpen} className="flex-1 py-2.5 rounded bg-green-600 text-white font-semibold hover:bg-green-700">
            Abrir Turno
          </button>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Cajero</label>
            <div className="text-white font-medium">{p.cajero}</div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Fecha y Hora</label>
            <div className="text-white">{new Date().toLocaleString()}</div>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Fondo de Caja *</label>
            <input
              type="number"
              step="0.01"
              value={p.fondo}
              onChange={(e) => p.setFondo(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Notas (opcional)</label>
            <textarea
              value={p.notas}
              onChange={(e) => p.setNotas(e.target.value)}
              placeholder="Notas del turno..."
              className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white"
              rows={2}
            />
          </div>
        </div>
      </div>
    </ModalPOS>
  );
}

// ───────────────────────── Retiro / Depósito ─────────────────────────
export function MovimientoEfectivoModal(p: {
  tipo: 'RETIRO' | 'DEPOSITO';
  esperado?: number;
  monto: string;
  setMonto: (v: string) => void;
  concepto: string;
  setConcepto: (v: string) => void;
  autorizadoPor: string;
  setAutorizadoPor: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const retiro = p.tipo === 'RETIRO';
  return (
    <ModalPOS
      size="md"
      title={retiro ? '💰 Retiro de Efectivo' : '💵 Depósito de Efectivo'}
      subtitle={p.esperado !== undefined ? `Efectivo esperado en caja: ${money(p.esperado)}` : undefined}
      onClose={p.onCancel}
      footer={
        <>
          <button onClick={p.onCancel} className={`flex-1 ${btnCancelar}`}>Cancelar</button>
          <button
            onClick={p.onConfirm}
            className={`flex-1 py-2.5 rounded text-white font-semibold ${retiro ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {retiro ? 'Retirar' : 'Depositar'}
          </button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Monto *</label>
            <input
              type="number"
              step="0.01"
              value={p.monto}
              onChange={(e) => p.setMonto(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded bg-slate-900 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Autorizado por *</label>
            <select
              value={p.autorizadoPor}
              onChange={(e) => p.setAutorizadoPor(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-900 text-white"
            >
              <option value="">Seleccionar autorizador</option>
              <option value="admin">Administrador</option>
              <option value="soporte">Soporte</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">{retiro ? 'Motivo *' : 'Origen *'}</label>
          <textarea
            value={p.concepto}
            onChange={(e) => p.setConcepto(e.target.value)}
            placeholder={retiro ? 'Motivo del retiro' : 'Origen del depósito'}
            rows={4}
            className="w-full px-3 py-2 rounded bg-slate-900 text-white"
          />
        </div>
      </div>
    </ModalPOS>
  );
}

// ───────────────────────── Precorte X ─────────────────────────
export function PrecorteModal(p: {
  turno: TurnoCaja & { id: string; totalVentas?: number | string };
  tickets: number;
  cashCounts: Record<string, number>;
  setCashCounts: (v: Record<string, number>) => void;
  debito: string;
  setDebito: (v: string) => void;
  credito: string;
  setCredito: (v: string) => void;
  transferencia: string;
  setTransferencia: (v: string) => void;
  vales: string;
  setVales: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const t = p.turno;
  const difs = diferenciasPrecorte(t, {
    efectivo: totalContado(p.cashCounts),
    debito: Number(p.debito) || 0,
    credito: Number(p.credito) || 0,
    transferencia: Number(p.transferencia) || 0,
  });
  const ef = difs[0];
  const soloNumeros = (setter: (v: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    if (val.startsWith('0') && val.length > 1 && val[1] !== '.') val = val.slice(1);
    setter(val);
  };
  const declaraciones: [string, string, (v: string) => void][] = [
    ['Terminal débito', p.debito, p.setDebito],
    ['Terminal crédito', p.credito, p.setCredito],
    ['Transferencias', p.transferencia, p.setTransferencia],
    ['Vales/Cupones', p.vales, p.setVales],
  ];
  return (
    <ModalPOS
      size="xl"
      title={`📊 Precorte X — Turno #${p.turno.id.slice(0, 8)}`}
      onClose={p.onCancel}
      footer={
        <>
          <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-1 text-sm" data-testid="precorte-diferencia">
            <div><span className="text-slate-400">Esperado </span><span className="font-semibold">{money(ef.sistema)}</span></div>
            <div><span className="text-slate-400">Contado </span><span className="font-semibold">{money(ef.declarado)}</span></div>
            <div className={`text-base font-bold ${colorDif(ef.diferencia)}`}>
              Diferencia efectivo {ef.diferencia > 0 ? '+' : ''}{money(ef.diferencia)}
              {ef.diferencia < 0 ? ' (faltante)' : ef.diferencia > 0 ? ' (sobrante)' : ' ✓'}
            </div>
          </div>
          <button onClick={p.onCancel} className={btnCancelar}>Cancelar</button>
          <button onClick={p.onSave} className="px-6 py-2.5 rounded bg-purple-600 text-white font-semibold hover:bg-purple-700">
            Guardar Precorte
          </button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr_1fr]">
        <div className="bg-slate-900 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Resumen de Ventas</h4>
          <dl className="space-y-1.5 text-sm">
            {([
              ['Total ventas', money(t.totalVentas)],
              ['Efectivo', money(t.totalEfectivo)],
              ['Tarjeta (déb./créd.)', money(t.totalTarjeta)],
              ['Transferencia SPEI', money(t.totalTransferencia)],
              ['Cortesía', money(t.totalCortesia)],
              ['Tickets', String(p.tickets)],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <dt className="text-slate-400">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-slate-700 pt-1.5">
              <dt className="text-slate-400">Fondo inicial</dt>
              <dd>{money(t.fondoInicial)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Depósitos / Retiros</dt>
              <dd>{money(t.totalDepositos)} / {money(t.totalRetiros)}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-slate-900 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Conteo de Efectivo</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {DENOMINACIONES.map((denom) => (
              <div key={denom} className="flex items-center gap-2">
                <span className="w-14 text-sm text-right">${denom} ×</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={p.cashCounts[denom] || 0}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.startsWith('0') && val.length > 1) val = val.slice(1);
                    p.setCashCounts({ ...p.cashCounts, [denom]: Number(val) || 0 });
                  }}
                  className="w-16 px-2 py-1 rounded bg-slate-700 text-white text-sm"
                />
                <span className="text-xs text-slate-400">= ${(p.cashCounts[denom] || 0) * denom}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700 font-semibold">TOTAL EFECTIVO: {money(ef.declarado)}</div>
        </div>

        <div className="space-y-3">
          <div className="bg-slate-900 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Otras Formas de Pago (Declaración)</h4>
            <div className="space-y-2">
              {declaraciones.map(([etiqueta, valor, setter]) => (
                <div key={etiqueta} className="flex items-center gap-2">
                  <span className="w-28 text-sm">{etiqueta}:</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={valor}
                    onChange={soloNumeros(setter)}
                    placeholder="0.00"
                    className="flex-1 min-w-0 px-2 py-1 rounded bg-slate-700 text-white text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-slate-900 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Diferencias vs sistema</h4>
            <table className="w-full text-sm">
              <tbody>
                {difs.map((f) => (
                  <tr key={f.clave}>
                    <td className="py-0.5 text-slate-400">{f.nombre}</td>
                    <td className={`py-0.5 text-right font-semibold ${colorDif(f.diferencia)}`}>
                      {f.diferencia > 0 ? '+' : ''}{money(f.diferencia)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ModalPOS>
  );
}

// ───────────────────────── Corte de caja (Z) ─────────────────────────
export function CierreTurnoModal(p: {
  turno: TurnoCaja & { id: string; horaApertura?: string; totalVentas?: number | string; precorteDeclaracion?: Record<string, unknown> };
  totalesServidor?: Record<string, number>;
  onCancel: () => void;
  onClose: () => void;
}) {
  const t = p.turno;
  const conc = conciliacionTurno(t, t.precorteDeclaracion, p.totalesServidor);
  const dif = (d: number) => (d === 0 ? '' : d < 0 ? 'text-red-400' : 'text-green-400');
  return (
    <ModalPOS
      size="lg"
      title={`🔒 Corte de Caja — Turno #${t.id.slice(0, 8)}`}
      onClose={p.onCancel}
      footer={
        <>
          <div className={`flex flex-1 items-center text-base font-bold ${dif(conc.totalDif) || 'text-slate-300'}`} data-testid="cierre-diferencia">
            Diferencia total {money(conc.totalDif)}
          </div>
          <button onClick={p.onCancel} className={btnCancelar}>Cancelar</button>
          <button onClick={p.onClose} className="px-6 py-2.5 rounded bg-red-600 text-white font-semibold hover:bg-red-700">
            Cerrar Turno Definitivamente
          </button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1.7fr]">
        <div className="bg-slate-900 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Resumen del Turno</h4>
          <dl className="space-y-1.5 text-sm">
            {([
              ['Hora apertura', String(t.horaApertura ?? '')],
              ['Hora cierre', new Date().toLocaleTimeString()],
              ['Fondo inicial', money(t.fondoInicial)],
              ['Total ventas', money(t.totalVentas)],
              ['Total retiros', money(t.totalRetiros)],
              ['Total depósitos', money(t.totalDepositos)],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <dt className="text-slate-400">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="bg-slate-900 rounded-lg p-4">
          <h4 className="font-semibold mb-2">Conciliación — Sistema vs Declarado</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2">Forma de Pago</th>
                <th className="text-right py-2">Sistema</th>
                <th className="text-right py-2">Declarado</th>
                <th className="text-right py-2">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {conc.filas.map((row) => (
                <tr key={row.nombre} className="border-b border-slate-800">
                  <td className="py-1.5">{row.nombre}</td>
                  <td className="text-right py-1.5">{money(row.sistema)}</td>
                  <td className="text-right py-1.5">{row.noDeclarado ? '-' : money(row.declarado)}</td>
                  <td className={`text-right py-1.5 font-semibold ${dif(row.dif)}`}>{row.noDeclarado ? '-' : money(row.dif)}</td>
                </tr>
              ))}
              <tr className="border-t border-slate-700 font-bold">
                <td className="py-2">TOTAL</td>
                <td className="text-right py-2">{money(conc.totalSistema)}</td>
                <td className="text-right py-2">{money(conc.totalDeclarado)}</td>
                <td className={`text-right py-2 ${dif(conc.totalDif)}`}>{money(conc.totalDif)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </ModalPOS>
  );
}

// ───────────────────────── Cobro ─────────────────────────
export type FormaPago = 'EFECTIVO' | 'TARJETA' | 'DEBITO' | 'CREDITO' | 'TRANSFERENCIA' | 'CORTESIA';
const ICONO: Record<string, string> = { EFECTIVO: '◈', DEBITO: '▣', CREDITO: '◉', TRANSFERENCIA: '⇄', CORTESIA: '✦', TARJETA: '▣' };

export function CobroModal(p: {
  total: number;
  pagado: number;
  pendiente: number;
  cambio: number;
  puedeCortesia: boolean;
  pagos: { id: string; forma: string; monto: number }[];
  formaActiva: FormaPago | null;
  onElegirForma: (f: FormaPago) => void;
  monto: string;
  setMonto: (v: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  onAgregar: () => void;
  onExacto: () => void;
  onQuitar: (id: string) => void;
  cardLast4: string;
  setCardLast4: (v: string) => void;
  cardBank: string;
  setCardBank: (v: string) => void;
  speiKey: string;
  setSpeiKey: (v: string) => void;
  courtesyReason: string;
  setCourtesyReason: (v: string) => void;
  courtesyAuthUser: string;
  setCourtesyAuthUser: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const formas: [FormaPago, string][] = [
    ['EFECTIVO', 'Efectivo'],
    ['DEBITO', 'Tarjeta Débito'],
    ['CREDITO', 'Tarjeta Crédito'],
    ['TRANSFERENCIA', 'SPEI'],
    ...(p.puedeCortesia ? ([['CORTESIA', 'Cortesía']] as [FormaPago, string][]) : []),
  ];
  const campo = 'w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-700';
  return (
    <ModalPOS
      size="xl"
      title="Cobro"
      subtitle={`Total a cobrar ${money(p.total)}`}
      onClose={p.onCancel}
      footer={
        <>
          <button onClick={p.onCancel} className="px-6 py-3 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600">Cancelar</button>
          <button
            onClick={p.onConfirm}
            disabled={p.pagado < p.total}
            className="flex-1 py-3 rounded-lg bg-green-700 text-white font-bold hover:bg-green-600 disabled:bg-slate-700 disabled:text-slate-500"
          >
            CONFIRMAR COBRO →
          </button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr_1fr]">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-400">FORMA DE PAGO</p>
          {formas.map(([forma, etiqueta]) => (
            <button
              key={forma}
              onClick={() => p.onElegirForma(forma)}
              className={`w-full h-11 rounded-lg flex items-center gap-3 px-4 transition-colors ${
                p.formaActiva === forma ? 'bg-blue-600 border-2 border-blue-400' : 'bg-slate-700 border border-slate-600 hover:bg-slate-600'
              }`}
            >
              <span className="text-xl">{ICONO[forma]}</span>
              <span className="font-medium">{etiqueta}</span>
            </button>
          ))}
          <p className="text-xs text-slate-400 mt-1">PAGOS AGREGADOS</p>
          <div className="max-h-28 overflow-y-auto space-y-2">
            {p.pagos.length === 0 && <p className="text-sm text-slate-500">Ninguno todavía</p>}
            {p.pagos.map((pf) => (
              <div key={pf.id} className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{ICONO[pf.forma] ?? '✦'}</span>
                  <span className="text-sm">{money(pf.monto)}</span>
                </div>
                <button onClick={() => p.onQuitar(pf.id)} className="text-red-400 hover:text-red-300 text-lg">×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          <p className="text-sm text-slate-400 mb-2">{p.formaActiva || 'Seleccionar forma de pago'}</p>
          <div className="bg-slate-900 rounded-lg px-4 py-2 border border-slate-700 mb-3">
            <input
              ref={p.inputRef}
              type="text"
              value={p.monto}
              onChange={(e) => {
                if (/^\d*\.?\d*$/.test(e.target.value)) p.setMonto(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') p.onAgregar();
                else if (e.key === 'Backspace') p.setMonto(p.monto.slice(0, -1));
              }}
              placeholder="0.00"
              className="w-full bg-transparent text-4xl font-bold text-white text-right outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'].map((key) => (
              <button
                key={key}
                onClick={() => {
                  if (key === '⌫') return p.setMonto(p.monto.slice(0, -1));
                  let nuevo = p.monto + key;
                  if (nuevo.startsWith('0') && nuevo.length > 1 && nuevo[1] !== '.') nuevo = nuevo.slice(1);
                  p.setMonto(nuevo);
                }}
                className="h-12 rounded-lg bg-slate-700 hover:bg-slate-600 text-xl font-medium transition-colors"
              >
                {key}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={p.onExacto} className="py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700">
              Exacto {money(p.pendiente)}
            </button>
            <button
              onClick={p.onAgregar}
              disabled={!p.formaActiva || Number(p.monto) <= 0}
              className="py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500"
            >
              + Agregar pago
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-lg bg-slate-900 border border-slate-700 p-3">
            <p className="text-xs text-slate-400">TOTAL</p>
            <p className="text-4xl font-bold text-green-400">{money(p.total)}</p>
            <div className="mt-2 space-y-1 text-sm">
              <div className="text-green-400">Pagado: {money(p.pagado)}</div>
              <div className={p.pendiente > 0 ? 'text-red-400' : 'text-slate-500'}>Pendiente: {money(p.pendiente)}</div>
              <div className={p.cambio > 0 ? 'text-green-400' : 'text-slate-500'}>Cambio: {money(p.cambio)}</div>
            </div>
          </div>

          {(p.formaActiva === 'DEBITO' || p.formaActiva === 'CREDITO') && (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Últimos 4 dígitos o folio voucher *</label>
                <input type="text" value={p.cardLast4} onChange={(e) => p.setCardLast4(e.target.value)} placeholder="****" className={campo} />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Banco emisor</label>
                <input type="text" value={p.cardBank} onChange={(e) => p.setCardBank(e.target.value)} placeholder="Banco" className={campo} />
              </div>
            </div>
          )}

          {p.formaActiva === 'TRANSFERENCIA' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Clave de rastreo SPEI *</label>
                <input type="text" value={p.speiKey} onChange={(e) => p.setSpeiKey(e.target.value)} placeholder="Clave de rastreo" className={campo} />
              </div>
              <button
                onClick={() => window.open('https://www.banxico.org.mx/cep/', '_blank')}
                className="w-full py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                Verificar en BANXICO →
              </button>
            </div>
          )}

          {p.formaActiva === 'CORTESIA' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Motivo *</label>
                <select value={p.courtesyReason} onChange={(e) => p.setCourtesyReason(e.target.value)} className={campo}>
                  <option value="">Seleccionar motivo...</option>
                  <option value="cortesia_ejecutiva">Cortesía ejecutiva</option>
                  <option value="error_pedido">Error en pedido</option>
                  <option value="cliente_vip">Cliente VIP</option>
                  <option value="cumpleanos">Cumpleaños</option>
                  <option value="compensacion_queja">Compensación por queja</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Autorizado por *</label>
                <select value={p.courtesyAuthUser} onChange={(e) => p.setCourtesyAuthUser(e.target.value)} className={campo}>
                  <option value="">Seleccionar autorizador...</option>
                  <option value="admin">Administrador</option>
                  <option value="soporte">Soporte</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalPOS>
  );
}

export { efectivoEsperado };
