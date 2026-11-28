import { type ChangeEvent, type ReactNode, type RefObject } from 'react';
import { esFormaTarjeta, motivoBloqueoCobro, motivoFaltaTarjeta, soloUltimos4 } from '../../core/utils/tarjeta';
import { ModalPOS } from '../../core/components/ModalPOS';
import { AlertaModal } from '../../core/components/AlertaModal';
import { Boton } from '../../core/components/Boton';
import { CampoMoneda } from '../../core/components/CampoMoneda';
import { ErrorCampo } from '../../core/components/ErrorCampo';
import { ModalFooter } from '../../core/components/ModalFooter';
import { CobroModal } from '../../core/components/cobro/CobroModal';
import { ICONO_FORMA, type ClaveForma, type OpcionForma } from '../../core/components/cobro/reglasCobro';
import { BILLETES, MONEDAS, claveBillete, claveMoneda, corteZ, totalContado, type TurnoCaja } from './cajaTurno';
import { TecladoNumerico } from '../../core/components/TecladoNumerico';
import { TiraZ } from './TiraZ';
import { aperturaDelTurno, formatoDuracion, formatoFechaHora, formatoHora } from '../../core/utils/tiempo';

// Ventanas de caja de uso diario (apertura, retiro, depósito, precorte, corte, cobro). Presentacionales: el estado y las
// llamadas a la API viven en POSPage. Todas usan ModalPOS (90vw × 90vh, botones fijos, columnas, sin scroll a 1366×768).

const money = (v: unknown) => { const n = Number(v) || 0; return `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`; };
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
            <div className="!text-content-1">{formatoFechaHora(new Date())}</div>
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
// Todo retiro y todo depósito de efectivo lo autoriza un supervisor (GERENTE o ADMIN) con SU PIN: la caja captura monto y motivo, y el
// supervisor teclea su PIN aquí mismo. El servidor lo valida (nada se registra sin un PIN válido). Esta ventana NO muestra cuánto
// efectivo espera el sistema: eso solo lo ve el corte Z de un supervisor.
export function MovimientoEfectivoModal(p: {
  tipo: 'RETIRO' | 'DEPOSITO';
  monto: string;
  setMonto: (v: string) => void;
  concepto: string;
  setConcepto: (v: string) => void;
  /** PIN del supervisor (solo dígitos). */
  pin: string;
  setPin: (v: string) => void;
  /** false cuando el monto queda por debajo del umbral que configuró el negocio: entonces el PIN no se pide. */
  pedirPin: boolean;
  /** Error de la operación (servidor) que se muestra dentro de la ventana, en vez de un alert(). */
  error?: string | null;
  /** Errores de validación por campo. */
  errores?: { monto?: string; pin?: string; concepto?: string };
  /** Mientras se envía: el botón queda deshabilitado (un segundo clic no manda otra operación). */
  enviando?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const retiro = p.tipo === 'RETIRO';
  const campo = (c: boolean) => `w-full px-3 py-2 rounded !bg-nav !text-content-1 ${c ? 'border !border-danger' : ''}`;
  const alTeclear = (t: string) => {
    if (t === 'borrar') p.setPin(p.pin.slice(0, -1));
    else if (/^[0-9]$/.test(t) && p.pin.length < 12) p.setPin(p.pin + t);
  };
  return (
    <ModalPOS
      size="lg"
      title={retiro ? '💰 Retiro de Efectivo' : '💵 Depósito de Efectivo'}
      subtitle="Lo autoriza un supervisor con su PIN"
      onClose={p.onCancel}
      enterModo="siguiente"
      atajos={[{ tecla: 'F4', etiqueta: retiro ? 'Registrar retiro' : 'Registrar depósito', accion: p.onConfirm }]}
      footer={
        <ModalFooter
          secundario={<Boton variante="secundario" onClick={p.onCancel}>Cancelar</Boton>}
          principal={<Boton cargando={p.enviando} onClick={p.onConfirm}>{p.enviando ? 'Guardando…' : retiro ? 'Retirar' : 'Depositar'}</Boton>}
        />
      }
    >
      {p.error ? <AlertaModal className="mb-3">{p.error}</AlertaModal> : null}
      <div className="grid gap-4 md:grid-cols-3">
        <CampoMoneda etiqueta="Monto" requerido valor={p.monto} onCambio={p.setMonto} error={p.errores?.monto} conTeclado autoFocus />
        <div>
          <label htmlFor="mov-concepto" className="mb-1 block text-sm !text-content-3">{retiro ? 'Motivo *' : 'Origen / motivo *'}</label>
          <textarea
            id="mov-concepto"
            value={p.concepto}
            onChange={(e) => p.setConcepto(e.target.value)}
            placeholder={retiro ? 'Motivo del retiro' : 'Origen del depósito'}
            rows={6}
            aria-invalid={p.errores?.concepto ? true : undefined}
            className={campo(!!p.errores?.concepto)}
          />
          <ErrorCampo id="mov-concepto" mensaje={p.errores?.concepto} />
        </div>
        <div>
          {p.pedirPin ? (
            <>
              <span id="mov-pin-etiqueta" className="mb-1 block text-sm !text-content-3">PIN del supervisor *</span>
              <div role="img" aria-labelledby="mov-pin-etiqueta" aria-label={`PIN del supervisor: ${p.pin.length} dígitos`} data-testid="pin-supervisor"
                className="mb-2 flex h-9 items-center justify-center gap-2 rounded !bg-nav">
                {p.pin.length === 0 ? <span className="text-xs !text-content-3">PIN del supervisor</span> : Array.from({ length: p.pin.length }, (_, i) => <span key={i} aria-hidden="true" className="h-2.5 w-2.5 rounded-full !bg-btn" />)}
              </div>
              <TecladoNumerico tamano="normal" onTecla={alTeclear} />
              <ErrorCampo id="mov-pin" mensaje={p.errores?.pin} />
            </>
          ) : (
            <p className="text-sm !text-content-3">Este monto no necesita el PIN de un supervisor.</p>
          )}
        </div>
      </div>
    </ModalPOS>
  );
}

// ───────────────────────── Precorte (a ciegas) ─────────────────────────
// La caja DECLARA lo que tiene: efectivo por denominación (SIN el fondo inicial) y los totales de terminal y transferencias. No hay
// nada precargado ni se muestra lo que el sistema espera, ni diferencias: eso se compara en el corte Z, solo para un supervisor.
export function PrecorteModal(p: {
  turno: TurnoCaja & { id: string; folio?: string | null };
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
  const declarado = totalContado(p.cashCounts);
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
  const cambiar = (clave: string) => (e: ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    if (val.startsWith('0') && val.length > 1) val = val.slice(1);
    p.setCashCounts({ ...p.cashCounts, [clave]: Number(val) || 0 });
  };
  const fila = (clave: string, etiqueta: string, valor: number) => (
    <div key={clave} className="flex items-center gap-2">
      <span className="w-16 text-sm text-right">{etiqueta} ×</span>
      <input
        type="text"
        inputMode="numeric"
        aria-label={`Cantidad de ${clave.startsWith('m') ? 'monedas' : 'billetes'} de $${valor}`}
        value={p.cashCounts[clave] ? p.cashCounts[clave] : ''}
        placeholder="0"
        onChange={cambiar(clave)}
        className="w-14 px-2 py-1 rounded !bg-surface-2 !text-content-1 text-sm"
      />
      <span className="text-xs !text-content-3">= {money((p.cashCounts[clave] || 0) * valor)}</span>
    </div>
  );
  return (
    <ModalPOS
      size="xl"
      title={`📊 Precorte — Turno ${p.turno.folio ?? `#${p.turno.id.slice(0, 8)}`}`}
      subtitle="Cuenta tu caja y declara lo que tienes. El fondo inicial no se cuenta."
      onClose={p.onCancel}
      enterModo="siguiente"
      atajos={[{ tecla: 'F4', etiqueta: 'Guardar precorte', accion: p.onSave }]}
      footer={
        <ModalFooter
          resumen={
            <div className="text-sm" data-testid="precorte-declarado">
              <span className="!text-content-3">Efectivo que declaras </span><span className="text-base font-bold">{money(declarado)}</span>
            </div>
          }
          secundario={<Boton variante="secundario" onClick={p.onCancel}>Cancelar</Boton>}
          principal={<Boton onClick={p.onSave}>Guardar Precorte</Boton>}
        />
      }
    >
      {p.error ? <AlertaModal className="mb-3">{p.error}</AlertaModal> : null}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="!bg-nav rounded-lg p-4">
          <h4 className="font-semibold mb-3">Conteo de efectivo</h4>
          <div className="grid grid-cols-2 gap-x-6">
            <div className="space-y-2">
              <h5 className="text-xs uppercase !text-content-3">Billetes</h5>
              {BILLETES.map((b) => fila(claveBillete(b), `$${b}`, b))}
            </div>
            <div className="space-y-2">
              <h5 className="text-xs uppercase !text-content-3">Monedas</h5>
              {MONEDAS.map((m) => fila(claveMoneda(m), m === 0.5 ? '$0.50' : `$${m}`, m))}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t !border-line font-semibold">TOTAL EFECTIVO: {money(declarado)}</div>
        </div>

        <div className="!bg-nav rounded-lg p-4">
          <h4 className="font-semibold mb-2">Otras formas de pago (declaración)</h4>
          <p className="mb-3 text-xs !text-content-3">Captura el total que marcan tus terminales y transferencias recibidas.</p>
          <div className="space-y-2">
            {declaraciones.map(([etiqueta, valor, setter]) => (
              <div key={etiqueta} className="flex items-center gap-2">
                <span className="w-28 text-sm">{etiqueta}:</span>
                <input
                  type="text"
                  inputMode="decimal"
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
      </div>
    </ModalPOS>
  );
}

// ───────────────────────── Cierre de turno / corte Z ─────────────────────────
// La caja a ciegas (cajera) solo confirma el cierre con lo que declaró: NO recibe totales del sistema ni diferencias. Un supervisor
// (ADMIN, GERENTE, SOPORTE) ve la tira Z: por forma de pago, lo que espera el sistema, lo declarado y la diferencia (faltante/sobrante).
export function CierreTurnoModal(p: {
  turno: TurnoCaja & { id: string; folio?: string | null; fecha?: string; horaApertura?: string; horaCierre?: string | null; abiertoEn?: string | null; cerradoEn?: string | null; totalVentas?: number | string; precorteDeclaracion?: Record<string, unknown> };
  /** shiftSummary.calculatedTotals: solo llega para ADMIN, GERENTE y SOPORTE; la caja a ciegas no lo recibe. */
  totalesServidor?: Record<string, any>;
  /** Error de la operación (ventas sin sincronizar, servidor) que se muestra dentro de la ventana, en vez de un alert(). */
  error?: string | null;
  onCancel: () => void;
  onClose: () => void;
}) {
  const t = p.turno;
  const z = corteZ(p.totalesServidor, t.precorteDeclaracion);
  const declaracion = t.precorteDeclaracion || {};
  return (
    <ModalPOS
      size="lg"
      title={`🔒 ${z ? 'Corte de Caja' : 'Cerrar turno'} — Turno ${t.folio ?? `#${t.id.slice(0, 8)}`}`}
      onClose={p.onCancel}
      enterModo="avanzar"
      atajos={[{ tecla: 'F10', etiqueta: 'Cerrar turno', accion: p.onClose }]}
      footer={
        <ModalFooter
          resumen={z ? (
            <div className="text-sm" data-testid="cierre-diferencia">
              <span className="!text-content-3">Efectivo esperado en caja </span><span className="font-semibold">{money(z.efectivoEnCaja)}</span>
            </div>
          ) : undefined}
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
              ['Hora apertura', formatoHora(aperturaDelTurno(t))],
              ['Hora cierre', formatoHora(new Date())],
              ['Duración', formatoDuracion(aperturaDelTurno(t), new Date())],
              ['Fondo inicial', money(t.fondoInicial)],
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
        {z ? (
          <div className="!bg-nav rounded-lg p-4">
            <TiraZ totales={p.totalesServidor} declaracion={t.precorteDeclaracion} />
          </div>
        ) : (
          <div className="!bg-nav rounded-lg p-4" data-testid="cierre-declarado">
            <h4 className="font-semibold mb-2">Lo que declaraste</h4>
            <dl className="space-y-1.5 text-sm">
              {([
                ['Efectivo (sin fondo)', money(declaracion.efectivoContado)],
                ['Tarjeta débito', money(declaracion.debitoDeclarado)],
                ['Tarjeta crédito', money(declaracion.creditoDeclarado)],
                ['Transferencias', money(declaracion.transferenciaDeclarada)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="!text-content-3">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs !text-content-3">Al cerrar, tu declaración queda registrada. Un supervisor revisa el corte.</p>
          </div>
        )}
      </div>
    </ModalPOS>
  );
}

// ───────────────────────── Cobro ─────────────────────────
// Adaptador del POS sobre el CobroModal único (core/components/cobro). El estado y el cálculo (total, pagado, pendiente, cambio, validación
// de tarjeta) viven en POSPage; aquí solo se arman las columnas.
export type FormaPago = ClaveForma;

export function CobroPOS(p: {
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
  /** Motivo real con el que el servidor (o la validación local) rechazó el cobro. */
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** Tras cobrar, la MISMA ventana pasa a mostrar el recibo. */
  recibo?: ReactNode;
  onCerrarRecibo?: () => void;
  onImprimirRecibo?: () => void;
}) {
  const formas: OpcionForma[] = [
    { clave: 'EFECTIVO', etiqueta: 'Efectivo' },
    { clave: 'DEBITO', etiqueta: 'Tarjeta Débito' },
    { clave: 'CREDITO', etiqueta: 'Tarjeta Crédito' },
    { clave: 'TRANSFERENCIA', etiqueta: 'SPEI' },
    ...(p.puedeCortesia ? ([{ clave: 'CORTESIA', etiqueta: 'Cortesía' }] as OpcionForma[]) : []),
  ];
  const campo = 'w-full px-3 py-2 rounded !bg-nav !text-content-1 border !border-line';
  const motivoTarjeta = motivoFaltaTarjeta(p.formaActiva, p.cardLast4);
  const motivoConfirmar = motivoBloqueoCobro({ pagado: p.pagado, total: p.total, pagos: p.pagos, formaActiva: p.formaActiva, ultimos4Activo: p.cardLast4 });
  return (
    <CobroModal
      fase={p.recibo ? 'recibo' : 'cobro'}
      recibo={p.recibo}
      onCerrarRecibo={p.onCerrarRecibo}
      onImprimirRecibo={p.onImprimirRecibo}
      totalTexto={money(p.total)}
      formas={formas}
      formaActiva={p.formaActiva}
      onElegirForma={p.onElegirForma}
      columnaFormas={
        <>
          <p className="mt-1 text-xs !text-content-3">PAGOS AGREGADOS</p>
          <div className="max-h-28 space-y-2 overflow-y-auto">
            {p.pagos.length === 0 && <p className="text-sm !text-content-3">Ninguno todavía</p>}
            {p.pagos.map((pf) => (
              <div key={pf.id} className="flex items-center justify-between rounded border !border-line !bg-nav p-2">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-lg">{ICONO_FORMA[pf.forma] ?? '✦'}</span>
                  <span className="text-sm">{money(pf.monto)}</span>
                  {pf.ultimos4Digitos ? <span className="text-xs !text-content-3">****{pf.ultimos4Digitos}</span> : null}
                </div>
                <button type="button" aria-label={`Quitar pago de ${money(pf.monto)}`} onClick={() => p.onQuitar(pf.id)} className="text-lg !text-danger">×</button>
              </div>
            ))}
          </div>
        </>
      }
      cuerpoImporte={<p className="mb-2 text-sm !text-content-3">{p.formaActiva || 'Seleccionar forma de pago'}</p>}
      campos={[
        {
          id: 'monto',
          etiqueta: 'Monto del pago',
          valor: p.monto,
          onCambio: p.setMonto,
          grande: true,
          inputRef: p.inputRef,
          // Enter confirma: con un monto lo agrega como pago; sin monto y con todo cubierto, confirma el cobro.
          onEnter: () => {
            if (Number(p.monto) > 0) {
              if (!motivoTarjeta) p.onAgregar();
            } else if (!motivoConfirmar) {
              p.onConfirm();
            }
          },
        },
      ]}
      accionesImporte={
        <div className="grid grid-cols-2 gap-2">
          <Boton variante="exito" confirma={false} onClick={p.onExacto}>Exacto {money(p.pendiente)}</Boton>
          <Boton confirma={false} onClick={p.onAgregar} disabled={!p.formaActiva || Number(p.monto) <= 0 || !!motivoTarjeta} title={motivoTarjeta ?? undefined}>
            + Agregar pago
          </Boton>
        </div>
      }
      onExacto={p.onExacto}
      lineas={[
        { etiqueta: 'Pagado', valor: money(p.pagado), tono: 'ok' },
        { etiqueta: 'Pendiente', valor: money(p.pendiente), tono: p.pendiente > 0 ? 'peligro' : 'tenue' },
        { etiqueta: 'Cambio', valor: money(p.cambio), tono: p.cambio > 0 ? 'ok' : 'tenue' },
      ]}
      error={p.error}
      motivoBloqueo={motivoConfirmar}
      onCancel={p.onCancel}
      onConfirm={p.onConfirm}
      detalle={
        <>
          {esFormaTarjeta(p.formaActiva) && (
            <div className="space-y-3">
              <div>
                <label htmlFor="cobro-ultimos4" className="mb-1 block text-sm !text-content-3">Últimos 4 dígitos de la tarjeta *</label>
                <input
                  id="cobro-ultimos4"
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
                {motivoTarjeta ? <p className="mt-1 text-xs !text-content-2">⚠ {motivoTarjeta}</p> : null}
              </div>
              <div>
                <label htmlFor="cobro-banco" className="mb-1 block text-sm !text-content-3">Banco emisor</label>
                <input id="cobro-banco" type="text" value={p.cardBank} onChange={(e) => p.setCardBank(e.target.value)} placeholder="Banco" className={campo} />
              </div>
            </div>
          )}

          {p.formaActiva === 'TRANSFERENCIA' && (
            <div className="space-y-3">
              <div>
                <label htmlFor="cobro-spei" className="mb-1 block text-sm !text-content-3">Clave de rastreo SPEI *</label>
                <input id="cobro-spei" type="text" value={p.speiKey} onChange={(e) => p.setSpeiKey(e.target.value)} placeholder="Clave de rastreo" className={campo} />
              </div>
              <Boton confirma={false} tamano="sm" completo onClick={() => window.open('https://www.banxico.org.mx/cep/', '_blank')}>
                Verificar en BANXICO →
              </Boton>
            </div>
          )}

          {p.formaActiva === 'CORTESIA' && (
            <div className="space-y-3">
              <div>
                <label htmlFor="cobro-motivo" className="mb-1 block text-sm !text-content-3">Motivo *</label>
                <select id="cobro-motivo" value={p.courtesyReason} onChange={(e) => p.setCourtesyReason(e.target.value)} className={campo}>
                  <option value="">Seleccionar motivo...</option>
                  <option value="cortesia_ejecutiva">Cortesía ejecutiva</option>
                  <option value="error_pedido">Error en pedido</option>
                  <option value="cliente_vip">Cliente VIP</option>
                  <option value="cumpleanos">Cumpleaños</option>
                  <option value="compensacion_queja">Compensación por queja</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <p className="text-xs !text-content-3">Autoriza tu sesión de gerente o administrador; queda en la bitácora con el motivo.</p>
            </div>
          )}
        </>
      }
    />
  );
}

