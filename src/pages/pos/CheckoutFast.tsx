import { useState } from "react";
import { esFormaTarjeta, motivoFaltaTarjeta, soloUltimos4 } from "../../core/utils/tarjeta";

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

const PAYMENT_METHODS = [
  { key: "EFECTIVO", label: "Efectivo", icon: "💵" },
  { key: "TARJETA", label: "Tarjeta", icon: "💳" },
  { key: "TRANSFERENCIA", label: "Transferencia", icon: "🏦" },
  { key: "CORTESIA", label: "Cortesía", icon: "🎁" },
];

export default function CheckoutFast({ items, total, tableId, tableNumber, onPay, onCancel }: Props) {
  const [selectedMethod, setSelectedMethod] = useState("EFECTIVO");
  const [cash, setCash] = useState("");
  const [processing, setProcessing] = useState(false);
  const [ultimos4, setUltimos4] = useState("");
  const motivoTarjeta = motivoFaltaTarjeta(selectedMethod, ultimos4);

  const parsedCash = parseFloat(cash) || 0;
  const change = selectedMethod === "EFECTIVO" ? Math.max(0, parsedCash - total) : 0;

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: "rgb(var(--scrim) / 0.8)" }}>
      <div
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: "rgb(var(--surface-1))", border: "1px solid rgb(var(--border))", maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold" style={{ color: "rgb(var(--text-1))" }}>
              {tableNumber ? `Mesa ${tableNumber}` : "Cobrar"}
            </h3>
            <p className="text-xs" style={{ color: "rgb(var(--text-3))" }}>{items.length} producto(s)</p>
          </div>
          <button onClick={onCancel} style={{ color: "rgb(var(--text-3))" }}>✕</button>
        </div>

        {/* Total */}
        <div className="text-center py-2">
          <span className="text-3xl font-bold" style={{ color: "rgb(var(--text-1))" }}>
            ${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Payment method selector */}
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.key}
              onClick={() => setSelectedMethod(m.key)}
              className="py-2 rounded-lg text-center"
              style={{
                backgroundColor: selectedMethod === m.key ? "rgb(var(--text-1))" : "rgb(var(--surface-alt))",
                color: selectedMethod === m.key ? "rgb(var(--bg))" : "rgb(var(--text-3))",
                border: `1px solid ${selectedMethod === m.key ? "rgb(var(--text-1))" : "rgb(var(--border))"}`,
              }}
            >
              <div className="text-lg">{m.icon}</div>
              <div className="text-xs mt-0.5">{m.label}</div>
            </button>
          ))}
        </div>

        {/* Cash amount input */}
        {selectedMethod === "EFECTIVO" && (
          <div>
            <label className="text-xs mb-1 block" style={{ color: "rgb(var(--text-3))" }}>Monto recibido</label>
            <input
              type="number"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              placeholder={`Mínimo $${total.toFixed(2)}`}
              className="w-full text-lg px-3 py-3 rounded-lg"
              style={{ backgroundColor: "rgb(var(--bg))", border: "1px solid rgb(var(--border))", color: "rgb(var(--text-1))" }}
              autoFocus
            />
            {/* Quick amounts */}
            <div className="flex gap-2 mt-2">
              {quickAmounts.map((a) => (
                <button
                  key={a}
                  onClick={() => setCash(String(a))}
                  className="flex-1 py-1.5 rounded text-xs"
                  style={{ backgroundColor: "rgb(var(--surface-alt))", border: "1px solid rgb(var(--border))", color: "rgb(var(--text-3))" }}
                >
                  ${a}
                </button>
              ))}
            </div>
            {parsedCash >= total && parsedCash > 0 && (
              <div className="mt-2 p-2 rounded-lg text-center" style={{ backgroundColor: "rgb(var(--st-ok) / 0.082)" }}>
                <span className="text-sm font-semibold" style={{ color: "rgb(var(--st-ok))" }}>
                  Cambio: ${change.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        )}

        {esFormaTarjeta(selectedMethod) && (
          <div>
            <label className="text-xs mb-1 block" style={{ color: "rgb(var(--text-3))" }}>Últimos 4 dígitos de la tarjeta *</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={ultimos4}
              onChange={(e) => setUltimos4(soloUltimos4(e.target.value))}
              placeholder="1234"
              className="w-full text-lg px-3 py-3 rounded-lg"
              style={{ backgroundColor: "rgb(var(--bg))", border: "1px solid rgb(var(--border))", color: "rgb(var(--text-1))" }}
            />
            {motivoTarjeta && <p className="mt-1 text-xs" style={{ color: "rgb(var(--st-warn))" }}>{motivoTarjeta}</p>}
          </div>
        )}

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={processing || !!motivoTarjeta || (selectedMethod === "EFECTIVO" && parsedCash < total && parsedCash > 0)}
          className="w-full py-3 rounded-xl font-semibold text-base"
          style={{
            backgroundColor: processing ? "rgb(var(--surface-3))" : "rgb(var(--text-1))",
            color: processing ? "rgb(var(--text-3))" : "rgb(var(--bg))",
          }}
        >
          {processing ? "Procesando..." : `Cobrar $${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
        </button>
      </div>
    </div>
  );
}
