import { useState } from "react";
import { esFormaTarjeta, motivoFaltaTarjeta, soloUltimos4 } from "../../core/utils/tarjeta";
import { Boton } from "../../core/components/Boton";
import { CobroModal } from "../../core/components/cobro/CobroModal";
import type { ClaveForma } from "../../core/components/cobro/reglasCobro";

interface TicketItem {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
}

interface Props {
  items: TicketItem[];
  total: number;
  tableId?: string | null;
  tableNumber?: number | null;
  onPay: (formasPago: { forma: string; monto: number; ultimos4Digitos?: string }[]) => void;
  onCancel: () => void;
}

const PAYMENT_METHODS: { key: ClaveForma; label: string }[] = [
  { key: "EFECTIVO", label: "Efectivo" },
  { key: "TARJETA", label: "Tarjeta" },
  { key: "TRANSFERENCIA", label: "Transferencia" },
  { key: "CORTESIA", label: "Cortesía" },
];

const dinero = (v: number) => `$${v.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

// Cobro rápido de retail (un solo pago). Es el CobroModal único: aquí solo viven los montos rápidos y la lógica de este cobro.
export default function CheckoutFast({ items, total, tableNumber, onPay, onCancel }: Props) {
  const [selectedMethod, setSelectedMethod] = useState<ClaveForma>("EFECTIVO");
  const [cash, setCash] = useState("");
  const [processing, setProcessing] = useState(false);
  const [ultimos4, setUltimos4] = useState("");
  const motivoTarjeta = motivoFaltaTarjeta(selectedMethod, ultimos4);

  const parsedCash = parseFloat(cash) || 0;
  const change = selectedMethod === "EFECTIVO" ? Math.max(0, parsedCash - total) : 0;
  const efectivo = selectedMethod === "EFECTIVO";
  const faltaEfectivo = efectivo && parsedCash < total && parsedCash > 0;

  async function handlePay() {
    if (processing || motivoTarjeta) return;
    setProcessing(true);
    const monto = selectedMethod === "EFECTIVO" ? Math.min(parsedCash, total) || total : total;
    onPay([{ forma: selectedMethod, monto, ...(esFormaTarjeta(selectedMethod) ? { ultimos4Digitos: ultimos4 } : {}) }]);
  }

  const quickAmounts = [50, 100, 200, 500].filter((a) => a >= total).slice(0, 4);
  if (quickAmounts.length < 4 && !quickAmounts.includes(total)) {
    quickAmounts.unshift(total);
  }

  return (
    <CobroModal
      titulo={tableNumber ? `Mesa ${tableNumber}` : "Cobrar"}
      totalTexto={dinero(total)}
      formas={PAYMENT_METHODS.map((m) => ({ clave: m.key, etiqueta: m.label }))}
      formaActiva={selectedMethod}
      onElegirForma={setSelectedMethod}
      columnaFormas={<p className="mt-1 text-xs !text-content-3">{items.length} producto(s)</p>}
      campos={efectivo ? [{ id: "recibido", etiqueta: "Monto recibido", valor: cash, onCambio: setCash, grande: true, placeholder: `Mínimo $${total.toFixed(2)}` }] : []}
      accionesImporte={
        efectivo ? (
          <div className="flex gap-2">
            {quickAmounts.map((a) => (
              <Boton key={a} variante="secundario" confirma={false} tamano="sm" className="flex-1" onClick={() => setCash(String(a))}>${a}</Boton>
            ))}
          </div>
        ) : undefined
      }
      onExacto={efectivo ? () => setCash(String(total)) : undefined}
      lineas={[
        { etiqueta: "Productos", valor: String(items.length), tono: "tenue" },
        ...(efectivo && parsedCash >= total && parsedCash > 0 ? [{ etiqueta: "Cambio", valor: dinero(change), tono: "ok" as const }] : []),
      ]}
      detalle={
        esFormaTarjeta(selectedMethod) ? (
          <div>
            <label htmlFor="checkout-ultimos4" className="mb-1 block text-sm !text-content-3">Últimos 4 dígitos de la tarjeta *</label>
            <input
              id="checkout-ultimos4"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={ultimos4}
              onChange={(e) => setUltimos4(soloUltimos4(e.target.value))}
              placeholder="1234"
              className="w-full rounded border !border-line !bg-nav px-3 py-2 !text-content-1"
            />
          </div>
        ) : undefined
      }
      textoConfirmar={processing ? "Procesando..." : `Cobrar ${dinero(total)}`}
      onCancel={onCancel}
      onConfirm={handlePay}
      procesando={processing}
      motivoBloqueo={motivoTarjeta ?? (faltaEfectivo ? `El monto recibido no cubre ${dinero(total)}` : null)}
    />
  );
}
