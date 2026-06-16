import { useState } from "react";

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
  onPay: (formasPago: { forma: string; monto: number }[]) => void;
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

  const parsedCash = parseFloat(cash) || 0;
  const change = selectedMethod === "EFECTIVO" ? Math.max(0, parsedCash - total) : 0;

  async function handlePay() {
    if (processing) return;
    setProcessing(true);
    const monto = selectedMethod === "EFECTIVO" ? Math.min(parsedCash, total) || total : total;
    onPay([{ forma: selectedMethod, monto }]);
  }

  const quickAmounts = [50, 100, 200, 500].filter((a) => a >= total).slice(0, 4);
  if (quickAmounts.length < 4 && !quickAmounts.includes(total)) {
    quickAmounts.unshift(total);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.8)" }}>
      <div
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: "#161616", border: "1px solid #2D2D2D", maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold" style={{ color: "#F5F5F5" }}>
              {tableNumber ? `Mesa ${tableNumber}` : "Cobrar"}
            </h3>
            <p className="text-xs" style={{ color: "#9A9A9A" }}>{items.length} producto(s)</p>
          </div>
          <button onClick={onCancel} style={{ color: "#9A9A9A" }}>✕</button>
        </div>

        {/* Total */}
        <div className="text-center py-2">
          <span className="text-3xl font-bold" style={{ color: "#F5F5F5" }}>
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
                backgroundColor: selectedMethod === m.key ? "#F5F5F5" : "#1A1A1A",
                color: selectedMethod === m.key ? "#0A0A0A" : "#9A9A9A",
                border: `1px solid ${selectedMethod === m.key ? "#F5F5F5" : "#2D2D2D"}`,
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
            <label className="text-xs mb-1 block" style={{ color: "#9A9A9A" }}>Monto recibido</label>
            <input
              type="number"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              placeholder={`Mínimo $${total.toFixed(2)}`}
              className="w-full text-lg px-3 py-3 rounded-lg"
              style={{ backgroundColor: "#0A0A0A", border: "1px solid #2D2D2D", color: "#F5F5F5" }}
              autoFocus
            />
            {/* Quick amounts */}
            <div className="flex gap-2 mt-2">
              {quickAmounts.map((a) => (
                <button
                  key={a}
                  onClick={() => setCash(String(a))}
                  className="flex-1 py-1.5 rounded text-xs"
                  style={{ backgroundColor: "#1A1A1A", border: "1px solid #2D2D2D", color: "#9A9A9A" }}
                >
                  ${a}
                </button>
              ))}
            </div>
            {parsedCash >= total && parsedCash > 0 && (
              <div className="mt-2 p-2 rounded-lg text-center" style={{ backgroundColor: "#22C55E15" }}>
                <span className="text-sm font-semibold" style={{ color: "#22C55E" }}>
                  Cambio: ${change.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={processing || (selectedMethod === "EFECTIVO" && parsedCash < total && parsedCash > 0)}
          className="w-full py-3 rounded-xl font-semibold text-base"
          style={{
            backgroundColor: processing ? "#2D2D2D" : "#F5F5F5",
            color: processing ? "#7E7E7E" : "#0A0A0A",
          }}
        >
          {processing ? "Procesando..." : `Cobrar $${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
        </button>
      </div>
    </div>
  );
}
