import { useEffect, type ChangeEvent, type RefObject } from 'react';
import { normalizarMonto } from '../../core/utils/monto';
import { esFormaTarjeta, motivoBloqueoCobro, motivoFaltaTarjeta, soloUltimos4 } from '../../core/utils/tarjeta';
import { ModalPOS } from '../../core/components/ModalPOS';
import { AlertaModal } from '../../core/components/AlertaModal';
import { Boton } from '../../core/components/Boton';
import { CampoMoneda } from '../../core/components/CampoMoneda';
import { ErrorCampo } from '../../core/components/ErrorCampo';
import { ModalFooter } from '../../core/components/ModalFooter';
import { DENOMINACIONES, conciliacionTurno, diferenciasPrecorte, efectivoEsperado, totalContado, type TurnoCaja } from './cajaTurno';

// Ventanas de caja de uso diario (apertura, retiro, depósito, precorte, corte, cobro). Presentacionales: el estado y las
// llamadas a la API viven en POSPage. Todas usan ModalPOS (90vw × 90vh, botones fijos, columnas, sin scroll a 1366×768).

const money = (v: unknown) => { const n = Number(v) || 0; return `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`; };
const colorDif = (d: number) => (d === 0 ? '!text-content-2' : d < 0 ? '!text-danger' : '!text-ok');
const btnCancelar = 'px-6 py-2.5 rounded !bg-surface-2 !text-content-1 hover:!bg-surface-2';

// ───────────────────────── Apertura de turno ─────────────────────────
export function AperturaTurnoModal(p: {
  cajero: string;
  fondo: string;
  setFondo: (v: string) => void;
  notas: string;
  setNotas: (v: string) => void;
  /** Error de la operación (servidor) que se muestra dentro de la ventana, en vez de un alert(). */
  error?: string | null;
  /** Error de validación del campo «Fondo de caja». */
  errorFondo?: string | null;
  onCancel: () => void;
  onOpen: () => void;
}) {
  return (
    <ModalPOS
      size="md"
      title="Apertura de Turno"
      onClose={p.onCancel}
      etiquetaEnter="Abrir turno"
      atajos={[{ tecla: 'F4', etiqueta: 'Abrir turno', accion: p.onOpen }]}
      footer={
        <ModalFooter
          secundario={<Boton variante="secundario" onClick={p.onCancel}>Cancelar</Boton>}
          principal={<Boton onClick={p.onOpen}>Abrir Turno</Boton>}
        />
      }
    >
      {p.error ? <AlertaModal className="mb-3">{p.error}</AlertaModal> : null}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <span className="mb-1 block text-sm !text-content-3">Cajero</span>
            <div className="!text-content-1 font-medium">{p.cajero}</div>
          </div>
          <div>
            <span className="mb-1 block text-sm !text-content-3">Fecha y Hora</span>
            <div className="!text-content-1">{new Date().toLocaleString()}</div>
          </div>
          <div>
            <label htmlFor="apertura-notas" className="mb-1 block text-sm !text-content-3">Notas (opcional)</label>
            <textarea
              id="apertura-notas"
              value={p.notas}
              onChange={(e) => p.setNotas(e.target.value)}
              placeholder="Notas del turno..."
              className="w-full px-4 py-2 rounded-lg border !border-line !bg-nav !text-content-1"
              rows={2}
            />
          </div>
        </div>
        <CampoMoneda etiqueta="Fondo de Caja" requerido valor={p.fondo} onCambio={p.setFondo} error={p.errorFondo} conTeclado autoFocus />
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
  /** Error de la operación (servidor) que se muestra dentro de la ventana, en vez de un alert(). */
  error?: string | null;
  /** Errores de validación por campo. */
  errores?: { monto?: string; autorizadoPor?: string; concepto?: string };
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const retiro = p.tipo === 'RETIRO';
  const campo = (c: boolean) => `w-full px-3 py-2 rounded !bg-nav !text-content-1 ${c ? 'border !border-danger' : ''}`;
  return (
    <ModalPOS
      size="md"
      title={retiro ? '💰 Retiro de Efectivo' : '💵 Depósito de Efectivo'}
      subtitle={p.esperado !== undefined ? `Efectivo esperado en caja: ${money(p.esperado)}` : undefined}
      onClose={p.onCancel}
      enterModo="siguiente"
      atajos={[{ tecla: 'F4', etiqueta: retiro ? 'Registrar retiro' : 'Registrar depósito', accion: p.onConfirm }]}
      footer={
        <ModalFooter
          secundario={<Boton variante="secundario" onClick={p.onCancel}>Cancelar</Boton>}
          principal={<Boton onClick={p.onConfirm}>{retiro ? 'Retirar' : 'Depositar'}</Boton>}
        />
      }
    >
      {p.error ? <AlertaModal className="mb-3">{p.error}</AlertaModal> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <CampoMoneda etiqueta="Monto" requerido valor={p.monto} onCambio={p.setMonto} error={p.errores?.monto} conTeclado autoFocus />
        <div className="space-y-4">
          <div>
            <label htmlFor="mov-autoriza" className="mb-1 block text-sm !text-content-3">Autorizado por *</label>
            <select
              id="mov-autoriza"
              value={p.autorizadoPor}
              onChange={(e) => p.setAutorizadoPor(e.target.value)}
              aria-invalid={p.errores?.autorizadoPor ? true : undefined}
              className={campo(!!p.errores?.autorizadoPor)}
            >
              <option value="">Seleccionar autorizador</option>
              <option value="admin">Administrador</option>
              <option value="soporte">Soporte</option>
            </select>
            <ErrorCampo id="mov-autoriza" mensaje={p.errores?.autorizadoPor} />
          </div>
          <div>
            <label htmlFor="mov-concepto" className="mb-1 block text-sm !text-content-3">{retiro ? 'Motivo *' : 'Origen *'}</label>
            <textarea
              id="mov-concepto"
              value={p.concepto}
              onChange={(e) => p.setConcepto(e.target.value)}
              placeholder={retiro ? 'Motivo del retiro' : 'Origen del depósito'}
              rows={4}
              aria-invalid={p.errores?.concepto ? true : undefined}
              className={campo(!!p.errores?.concepto)}
            />
            <ErrorCampo id="mov-concepto" mensaje={p.errores?.concepto} />
          </div>
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
  /** Error de la operación (servidor) que se muestra dentro de la ventana, en vez de un alert(). */
  error?: string | null;
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
      enterModo="siguiente"
      atajos={[{ tecla: 'F4', etiqueta: 'Guardar precorte', accion: p.onSave }]}
      footer={
        <ModalFooter
          resumen={
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm" data-testid="precorte-diferencia">
              <div><span className="!text-content-3">Esperado </span><span className="font-semibold">{money(ef.sistema)}</span></div>
              <div><span className="!text-content-3">Contado </span><span className="font-semibold">{money(ef.declarado)}</span></div>
              <div className={`text-base font-bold ${colorDif(ef.diferencia)}`}>
                Diferencia efectivo {ef.diferencia > 0 ? '+' : ''}{money(ef.diferencia)}
                {ef.diferencia < 0 ? ' (faltante)' : ef.diferencia > 0 ? ' (sobrante)' : ' ✓'}
              </div>
            </div>
          }
          secundario={<Boton variante="secundario" onClick={p.onCancel}>Cancelar</Boton>}
          principal={<Boton onClick={p.onSave}>Guardar Precorte</Boton>}
        />
      }
    >
      {p.error ? <AlertaModal className="mb-3">{p.error}</AlertaModal> : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr_1fr]">
        <div className="!bg-nav rounded-lg p-4">
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
                <dt className="!text-content-3">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t !border-line pt-1.5">
              <dt className="!text-content-3">Fondo inicial</dt>
              <dd>{money(t.fondoInicial)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="!text-content-3">Depósitos / Retiros</dt>
              <dd>{money(t.totalDepositos)} / {money(t.totalRetiros)}</dd>
            </div>
          </dl>
        </div>

        <div className="!bg-nav rounded-lg p-4">
          <h4 className="font-semibold mb-3">Conteo de Efectivo</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {DENOMINACIONES.map((denom) => (
              <div key={denom} className="flex items-center gap-2">
                <span className="w-14 text-sm text-right">${denom} ×</span>
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label={`Cantidad de billetes o monedas de $${denom}`}
                  value={p.cashCounts[denom] || 0}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.startsWith('0') && val.length > 1) val = val.slice(1);
                    p.setCashCounts({ ...p.cashCounts, [denom]: Number(val) || 0 });
                  }}
                  className="w-16 px-2 py-1 rounded !bg-surface-2 !text-content-1 text-sm"
                />
                <span className="text-xs !text-content-3">= ${(p.cashCounts[denom] || 0) * denom}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t !border-line font-semibold">TOTAL EFECTIVO: {money(ef.declarado)}</div>
        </div>

        <div className="space-y-3">
          <div className="!bg-nav rounded-lg p-4">
            <h4 className="font-semibold mb-2">Otras Formas de Pago (Declaración)</h4>
            <div className="space-y-2">
              {declaraciones.map(([etiqueta, valor, setter]) => (
                <div key={etiqueta} className="flex items-center gap-2">
                  <span className="w-28 text-sm">{etiqueta}:</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label={etiqueta}
                    value={valor}
                    onChange={soloNumeros(setter)}
                    placeholder="0.00"
                    className="flex-1 min-w-0 px-2 py-1 rounded !bg-surface-2 !text-content-1 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="!bg-nav rounded-lg p-4">
            <h4 className="font-semibold mb-2">Diferencias vs sistema</h4>
            <table className="w-full text-sm">
              <tbody>
                {difs.map((f) => (
                  <tr key={f.clave}>
                    <td className="py-0.5 !text-content-3">{f.nombre}</td>
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
  /** Error de la operación (ventas sin sincronizar, servidor) que se muestra dentro de la ventana, en vez de un alert(). */
  error?: string | null;
  onCancel: () => void;
  onClose: () => void;
}) {
  const t = p.turno;
  const conc = conciliacionTurno(t, t.precorteDeclaracion, p.totalesServidor);
  const dif = (d: number) => (d === 0 ? '' : d < 0 ? '!text-danger' : '!text-ok');
  return (
    <ModalPOS
      size="lg"
      title={`🔒 Corte de Caja — Turno #${t.id.slice(0, 8)}`}
      onClose={p.onCancel}
      enterModo="avanzar"
      atajos={[{ tecla: 'F10', etiqueta: 'Cerrar turno', accion: p.onClose }]}
      footer={
        <ModalFooter
          resumen={
            <div className={`text-base font-bold ${dif(conc.totalDif) || '!text-content-2'}`} data-testid="cierre-diferencia">
              Diferencia total {money(conc.totalDif)}
            </div>
          }
          secundario={<Boton variante="secundario" onClick={p.onCancel}>Cancelar</Boton>}
          principal={<Boton variante="peligro" onClick={p.onClose}>Cerrar Turno Definitivamente</Boton>}
        />
      }
    >
      {p.error ? <AlertaModal className="mb-3">{p.error}</AlertaModal> : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.7fr]">
        <div className="!bg-nav rounded-lg p-4">
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
                <dt className="!text-content-3">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="!bg-nav rounded-lg p-4">
          <h4 className="font-semibold mb-2">Conciliación — Sistema vs Declarado</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b !border-line">
                <th className="text-left py-2">Forma de Pago</th>
                <th className="text-right py-2">Sistema</th>
                <th className="text-right py-2">Declarado</th>
                <th className="text-right py-2">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {conc.filas.map((row) => (
                <tr key={row.nombre} className="border-b !border-line">
                  <td className="py-1.5">{row.nombre}</td>
                  <td className="text-right py-1.5">{money(row.sistema)}</td>
                  <td className="text-right py-1.5">{row.noDeclarado ? '-' : money(row.declarado)}</td>
                  <td className={`text-right py-1.5 font-semibold ${dif(row.dif)}`}>{row.noDeclarado ? '-' : money(row.dif)}</td>
                </tr>
              ))}
              <tr className="border-t !border-line font-bold">
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
  pagos: { id: string; forma: string; monto: number; ultimos4Digitos?: string }[];
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
  /** Motivo real con el que el servidor (o la validación local) rechazó el cobro. */
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  // Foco en el campo de monto al abrir y cada vez que cambia la forma de pago: el cajero teclea sin tocar la pantalla.
  useEffect(() => {
    const t = setTimeout(() => {
      p.inputRef.current?.focus();
      p.inputRef.current?.select();
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.formaActiva]);
  const formas: [FormaPago, string][] = [
    ['EFECTIVO', 'Efectivo'],
    ['DEBITO', 'Tarjeta Débito'],
    ['CREDITO', 'Tarjeta Crédito'],
    ['TRANSFERENCIA', 'SPEI'],
    ...(p.puedeCortesia ? ([['CORTESIA', 'Cortesía']] as [FormaPago, string][]) : []),
  ];
  const campo = 'w-full px-3 py-2 rounded !bg-nav !text-content-1 border !border-line';
  const motivoTarjeta = motivoFaltaTarjeta(p.formaActiva, p.cardLast4);
  const motivoConfirmar = motivoBloqueoCobro({ pagado: p.pagado, total: p.total, pagos: p.pagos, formaActiva: p.formaActiva, ultimos4Activo: p.cardLast4 });
  return (
    <ModalPOS
      size="xl"
      title="Cobro"
      subtitle={`Total a cobrar ${money(p.total)}`}
      onClose={p.onCancel}
      etiquetaEnter="Agregar pago"
      atajos={[
        { tecla: 'F2', etiqueta: 'Efectivo', accion: () => p.onElegirForma('EFECTIVO') },
        { tecla: 'F3', etiqueta: 'Tarjeta', accion: () => p.onElegirForma(p.formaActiva === 'DEBITO' ? 'CREDITO' : 'DEBITO') },
        { tecla: 'F6', etiqueta: 'SPEI', accion: () => p.onElegirForma('TRANSFERENCIA') },
        { tecla: 'F8', etiqueta: 'Exacto', accion: p.onExacto },
        { tecla: 'F4', etiqueta: 'Cobrar', accion: p.onConfirm, deshabilitado: !!motivoConfirmar },
      ]}
      footer={
        <>
          <button onClick={p.onCancel} className="px-6 py-3 rounded-lg !bg-surface-2 !text-content-2 hover:!bg-surface-2">Cancelar</button>
          {motivoConfirmar ? <span role="status" className="self-center text-xs text-tono-amber-300">{motivoConfirmar}</span> : null}
          <button
            onClick={p.onConfirm}
            disabled={!!motivoConfirmar}
            className="flex-1 py-3 rounded-lg !bg-ok-solid !text-on-solid font-bold hover:bg-tono-ok-700 disabled:bg-tono-slate-700 disabled:text-tinta-3"
          >
            CONFIRMAR COBRO →
          </button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr_1fr]">
        <div className="flex flex-col gap-2">
          <p className="text-xs !text-content-3">FORMA DE PAGO</p>
          {formas.map(([forma, etiqueta]) => (
            <button
              key={forma}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => p.onElegirForma(forma)}
              className={`w-full h-11 rounded-lg flex items-center gap-3 px-4 transition-colors ${
                p.formaActiva === forma ? '!bg-btn border-2 border-tono-blue-400' : '!bg-surface-2 border !border-line hover:!bg-surface-2'
              }`}
            >
              <span className="text-xl">{ICONO[forma]}</span>
              <span className="font-medium">{etiqueta}</span>
            </button>
          ))}
          <p className="text-xs !text-content-3 mt-1">PAGOS AGREGADOS</p>
          <div className="max-h-28 overflow-y-auto space-y-2">
            {p.pagos.length === 0 && <p className="text-sm !text-content-3">Ninguno todavía</p>}
            {p.pagos.map((pf) => (
              <div key={pf.id} className="flex items-center justify-between p-2 rounded !bg-nav border !border-line">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{ICONO[pf.forma] ?? '✦'}</span>
                  <span className="text-sm">{money(pf.monto)}</span>
                  {pf.ultimos4Digitos ? <span className="text-xs !text-content-3">****{pf.ultimos4Digitos}</span> : null}
                </div>
                <button onClick={() => p.onQuitar(pf.id)} className="!text-danger hover:text-tono-danger-300 text-lg">×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          <p className="text-sm !text-content-3 mb-2">{p.formaActiva || 'Seleccionar forma de pago'}</p>
          <div className="!bg-nav rounded-lg px-4 py-2 border !border-line mb-3">
            <input
              ref={p.inputRef}
              type="text"
              value={p.monto}
              inputMode="decimal"
              autoComplete="off"
              aria-label="Monto del pago"
              onChange={(e) => p.setMonto(normalizarMonto(e.target.value))}
              onKeyDown={(e) => {
                // Enter confirma: con un monto lo agrega como pago; sin monto y con todo cubierto, confirma el cobro.
                // Escape lo atiende ModalPOS (cancela). Backspace y dígitos los maneja el propio input.
                if (e.key !== 'Enter') return;
                e.preventDefault();
                if (Number(p.monto) > 0) {
                  if (!motivoTarjeta) p.onAgregar();
                } else if (!motivoConfirmar) {
                  p.onConfirm();
                }
              }}
              placeholder="0.00"
              className="w-full bg-transparent text-4xl font-bold !text-content-1 text-right outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'].map((key) => (
              <button
                key={key}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (key === '⌫') return p.setMonto(p.monto.slice(0, -1));
                  p.setMonto(normalizarMonto(p.monto + key));
                  p.inputRef.current?.focus();
                }}
                className="h-12 rounded-lg !bg-surface-2 hover:!bg-surface-2 text-xl font-medium transition-colors"
              >
                {key}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={p.onExacto} className="py-2.5 rounded-lg !bg-ok-solid !text-on-solid font-medium hover:bg-tono-ok-700">
              Exacto {money(p.pendiente)}
            </button>
            <button
              onClick={p.onAgregar}
              disabled={!p.formaActiva || Number(p.monto) <= 0 || !!motivoTarjeta}
              title={motivoTarjeta ?? undefined}
              className="py-2.5 rounded-lg !bg-btn !text-on-solid font-medium hover:!bg-btn-hover disabled:bg-tono-slate-700 disabled:text-tinta-3"
            >
              + Agregar pago
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-lg !bg-nav border !border-line p-3">
            <p className="text-xs !text-content-3">TOTAL</p>
            <p className="text-4xl font-bold !text-ok">{money(p.total)}</p>
            <div className="mt-2 space-y-1 text-sm">
              <div className="!text-ok">Pagado: {money(p.pagado)}</div>
              <div className={p.pendiente > 0 ? '!text-danger' : '!text-content-3'}>Pendiente: {money(p.pendiente)}</div>
              <div className={p.cambio > 0 ? '!text-ok' : '!text-content-3'}>Cambio: {money(p.cambio)}</div>
            </div>
          </div>

          {p.error ? (
            <div role="alert" className="rounded-lg border border-tono-danger-700 bg-tono-danger-950 p-2 text-sm text-tono-danger-200">{p.error}</div>
          ) : null}

          {esFormaTarjeta(p.formaActiva) && (
            <div className="space-y-3">
              <div>
                <label className="text-sm !text-content-3 mb-1 block">Últimos 4 dígitos de la tarjeta *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={p.cardLast4}
                  onChange={(e) => p.setCardLast4(soloUltimos4(e.target.value))}
                  placeholder="1234"
                  aria-invalid={!!motivoTarjeta}
                  className={campo}
                />
                {motivoTarjeta ? <p className="mt-1 text-xs text-tono-amber-300">{motivoTarjeta}</p> : null}
              </div>
              <div>
                <label className="text-sm !text-content-3 mb-1 block">Banco emisor</label>
                <input type="text" value={p.cardBank} onChange={(e) => p.setCardBank(e.target.value)} placeholder="Banco" className={campo} />
              </div>
            </div>
          )}

          {p.formaActiva === 'TRANSFERENCIA' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm !text-content-3 mb-1 block">Clave de rastreo SPEI *</label>
                <input type="text" value={p.speiKey} onChange={(e) => p.setSpeiKey(e.target.value)} placeholder="Clave de rastreo" className={campo} />
              </div>
              <button
                onClick={() => window.open('https://www.banxico.org.mx/cep/', '_blank')}
                className="w-full py-2 rounded !bg-btn !text-on-solid text-sm hover:!bg-btn-hover"
              >
                Verificar en BANXICO →
              </button>
            </div>
          )}

          {p.formaActiva === 'CORTESIA' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm !text-content-3 mb-1 block">Motivo *</label>
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
                <label className="text-sm !text-content-3 mb-1 block">Autorizado por *</label>
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
