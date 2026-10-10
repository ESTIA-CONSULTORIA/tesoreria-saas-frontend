import axios, { type AxiosInstance } from 'axios';
import { api } from '../../core/api/api';
import type { Area, Cuenta, ItemCuenta, Mesa, PoliticasMesas } from './mesasLogic';

const baseURL = ((import.meta.env.VITE_API_URL as string) ||
  (window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://api.estiaconsultoria.com')) + '/api/v1';

// /mesas usa la sesión ERP (cookie access_token, el cliente `api` de siempre). /mesero usa la sesión POS Lite:
// cookie pos_access_token + x-session-scope: pos-lite, igual que CorteCajaLite y NotasCocinaLite.
export const liteClient: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 30000,
  headers: { 'x-session-scope': 'pos-lite' },
});
export const erpClient: AxiosInstance = api;

export interface Producto { id: string; name: string; price: number | string; isActive?: boolean; categoryId?: string; tasaIva?: string | null }
export type FormaPago = 'EFECTIVO' | 'DEBITO' | 'CREDITO' | 'TRANSFERENCIA';

// Ninguna de estas llamadas pasa por la cola offline (enqueueOperation): una cuenta abierta necesita al backend.
export function mesasApi(c: AxiosInstance) {
  return {
    capacidadMesas: async (tenantId: string): Promise<boolean> => {
      const r = await c.get(`/tenant-settings/${tenantId}`);
      return r.data?.posCapabilities?.mesas_cuenta_abierta === true;
    },
    politicas: async (): Promise<PoliticasMesas> => (await c.get('/pos/sales/politicas-mesas')).data,
    areas: async (): Promise<Area[]> => {
      const r = await c.get('/pos/areas');
      return Array.isArray(r.data) ? r.data : [];
    },
    cuentas: async (sucursalId?: string): Promise<Cuenta[]> => {
      const r = await c.get('/pos/sales/cuentas-abiertas', { params: sucursalId ? { sucursalId } : undefined });
      return Array.isArray(r.data) ? r.data : [];
    },
    productos: async (): Promise<Producto[]> => {
      const r = await c.get('/pos/products');
      return (Array.isArray(r.data) ? r.data : []).filter((p: Producto) => p.isActive !== false);
    },
    abrirCuenta: async (p: { tableId: string; sucursalId: string; items: ItemCuenta[]; total: number; cajero: string }): Promise<Cuenta> =>
      (await c.post('/pos/sales', { items: p.items, subtotal: p.total, descuento: 0, impuestos: 0, total: p.total, cajero: p.cajero, sucursalId: p.sucursalId, tableId: p.tableId })).data,
    agregarItems: async (id: string, items: ItemCuenta[]) => (await c.post(`/pos/sales/${id}/items`, { items })).data,
    quitarItem: async (id: string, indice: number) => (await c.delete(`/pos/sales/${id}/items/${indice}`)).data,
    cobrar: async (id: string, body: { formaPago: FormaPago; monto?: number; itemIndexes?: number[]; montoRecibido?: number; cambio?: number }) =>
      (await c.post(`/pos/sales/${id}/pagos`, body)).data,
    cancelar: async (id: string, motivo: string) => (await c.put(`/pos/sales/${id}/cancel`, { motivo })).data,
    // Alta mínima de áreas y mesas
    crearArea: async (b: { name: string; branchId: string }) => (await c.post('/pos/areas', b)).data,
    editarArea: async (id: string, b: { name?: string; isActive?: boolean }) => (await c.put(`/pos/areas/${id}`, b)).data,
    crearMesa: async (b: { number: number; capacity: number; areaId: string; branchId: string }) => (await c.post('/pos/tables', b)).data as Mesa,
    editarMesa: async (id: string, b: { number?: number; capacity?: number; isActive?: boolean }) => (await c.put(`/pos/tables/${id}`, b)).data as Mesa,
  };
}
export type MesasApi = ReturnType<typeof mesasApi>;
