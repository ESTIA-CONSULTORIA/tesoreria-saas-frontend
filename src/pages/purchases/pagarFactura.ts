// Enlace "Pagar ahora" de Tesorería (CxP) → Compras: abre el modal de pago de esa factura en PurchasesPage
// (POST /purchases/invoices/:id/register-payment). La cuenta por pagar de Tesorería usa el id de la factura de compra.

export const PARAM_PAGAR = 'pagar';

export function rutaPagarFactura(facturaId: string): string {
  return `/purchases?${PARAM_PAGAR}=${encodeURIComponent(facturaId)}`;
}

export function facturaAPagar<T extends { id: string }>(facturas: T[], pagarId: string | null | undefined): T | null {
  if (!pagarId) return null;
  return facturas.find((f) => f.id === pagarId) ?? null;
}
