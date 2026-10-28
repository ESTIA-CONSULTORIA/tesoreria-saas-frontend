// Escenas de captura de la Ola 2 de skins (POS, caja, mesas, Corte Lite, notas de cocina) y sus datos simulados.
// Lo importa scripts/capturas-skins.mjs. Cada escena: ruta, estado (vacío / datos / modal / error) y, si hace falta, `accion` (clics) y
// `teclas` (atajos que se pulsan al final: se guarda qué cambió, para comparar antes/después que el teclado sigue igual).
// `fallos`: rutas de la API que responden 500 en esa escena (estado de error).
const ESPERA = (ms) => new Promise((r) => setTimeout(r, ms));
const clic = async (p, re, sel = 'button') => {
  // el elemento MÁS pequeño que contiene el texto (así «Hamburguesa» es la tarjeta del producto y no toda la página)
  const h = await p.evaluateHandle((s, src) => [...document.querySelectorAll(s)]
    .filter((x) => new RegExp(src, 'i').test(((x.getAttribute('aria-label') || '') + ' ' + (x.textContent || '')).replace(/\s+/g, ' ').trim()))
    .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0], sel, re);
  const el = h.asElement();
  if (!el) throw new Error('no encontré: ' + re);
  await el.click();
  await ESPERA(350);
};
// El ADMIN entra a la terminal re-identificándose con el NIP del cajero (aquí simulado)
const entrarPos = async (p) => {
  await p.type('input[type="password"]', '1234');
  await clic(p, 'Continuar');
  await ESPERA(1200);
};
const digitos = async (p, d) => { for (const c of d) await clic(p, '^' + c + '( ' + c + ')?$'); await ESPERA(900); };
const tecla = async (p, k) => { await p.keyboard.press(k); await ESPERA(250); };

const categorias = [
  { id: 'cat1', name: 'Comida', color: '#3B82F6', isActive: true },
  { id: 'cat2', name: 'Bebidas', color: '#22C55E', isActive: true },
  { id: 'cat3', name: 'Postres', color: '#F59E0B', isActive: true },
];
const productos = [
  { id: 'p1', name: 'Hamburguesa clásica', price: 95, categoryId: 'cat1', isActive: true, stock: 20, tasaIva: '16' },
  { id: 'p2', name: 'Tacos al pastor', price: 70, categoryId: 'cat1', isActive: true, stock: 40, tasaIva: '16' },
  { id: 'p3', name: 'Refresco cola', price: 28, categoryId: 'cat2', isActive: true, stock: 100, tasaIva: '16' },
  { id: 'p4', name: 'Agua de horchata', price: 32, categoryId: 'cat2', isActive: true, stock: 0, tasaIva: '16' },
  { id: 'p5', name: 'Flan napolitano', price: 55, categoryId: 'cat3', isActive: true, stock: 6, tasaIva: '16' },
  { id: 'p6', name: 'Pastel de chocolate', price: 65, categoryId: 'cat3', isActive: true, stock: 3, tasaIva: '16' },
];
const turno = {
  id: 's1', cajero: 'u1', sucursalId: 'b1', status: 'ABIERTO', fondoInicial: 1000, totalVentas: 2450.5, totalEfectivo: 1500, totalTarjeta: 800.5,
  totalTransferencia: 150, totalCortesia: 0, totalDevoluciones: 45, totalRetiros: 200, totalDepositos: 0, fecha: '2026-10-25T08:00:00Z', horaApertura: '08:00', precorteGuardado: false,
};
const mesas = [
  { id: 't1', number: 1, capacity: 4, status: 'AVAILABLE', isActive: true, areaId: 'a1' },
  { id: 't2', number: 2, capacity: 4, status: 'OCCUPIED', isActive: true, areaId: 'a1' },
  { id: 't3', number: 3, capacity: 2, status: 'RESERVED', isActive: true, areaId: 'a1' },
  { id: 't4', number: 4, capacity: 6, status: 'DIRTY', isActive: true, areaId: 'a1' },
  { id: 't5', number: 5, capacity: 2, status: 'AVAILABLE', isActive: true, areaId: 'a2' },
];
const areasConMesas = [
  { id: 'a1', name: 'Salón', branchId: 'b1', isActive: true, tables: mesas.filter((m) => m.areaId === 'a1') },
  { id: 'a2', name: 'Terraza', branchId: 'b1', isActive: true, tables: mesas.filter((m) => m.areaId === 'a2') },
];
const cuentaAbierta = {
  id: 'c1', folio: 'A-0012', tableId: 't2', cajero: 'mesero@negocio-demo.mx', total: 193, subtotal: 166.38, impuestos: 26.62, pagado: 0, saldoPendiente: 193,
  items: [
    { productoId: 'p1', nombre: 'Hamburguesa clásica', cantidad: 1, precioUnitario: 95, descuento: 0, subtotal: 95, tasaIva: '16' },
    { productoId: 'p3', nombre: 'Refresco cola', cantidad: 2, precioUnitario: 28, descuento: 0, subtotal: 56, tasaIva: '16' },
    { productoId: 'p5', nombre: 'Flan napolitano', cantidad: 1, precioUnitario: 55, descuento: 0, subtotal: 55, tasaIva: '16', anulado: true },
  ],
  formasPago: [], createdAt: '2026-10-25T09:10:00Z',
};
const notasCocina = [
  { id: 'n1', saleId: 'v1', productoId: 'p1', nombre: 'Hamburguesa clásica (sin cebolla)', cantidad: 2, estacion: 'COCINA', estado: 'PENDIENTE', createdAt: '2026-10-25T09:31:00Z' },
  { id: 'n2', saleId: 'v1', productoId: 'p2', nombre: 'Tacos al pastor', cantidad: 3, estacion: 'COCINA', estado: 'PENDIENTE', createdAt: '2026-10-25T09:31:00Z' },
  { id: 'n3', saleId: 'v2', productoId: 'p5', nombre: 'Flan napolitano', cantidad: 1, estacion: 'COCINA', estado: 'PENDIENTE', createdAt: '2026-10-25T09:40:00Z' },
];
const campos = ['efectivo', 'tarjeta', 'transferencia', 'plataformas', 'promociones', 'cortesia', 'descuento', 'gasto'].map((key, i) => ({ key, label: key[0].toUpperCase() + key.slice(1), isActive: i < 6, sortOrder: i }));
const ventas = [
  { id: 'v1', folio: 'V-0101', total: 193, status: 'COMPLETADA', formaPago: 'EFECTIVO', createdAt: '2026-10-25T09:30:00Z', items: cuentaAbierta.items.slice(0, 2), cajero: 'u1' },
  { id: 'v2', folio: 'V-0102', total: 70, status: 'CANCELADA', formaPago: 'TARJETA', createdAt: '2026-10-25T09:50:00Z', items: [cuentaAbierta.items[0]], cajero: 'u1' },
];

export function responderPos(metodo, ruta, escena) {
  if (!escena.pos) return null;
  if (escena.erp && metodo === 'GET' && ruta.startsWith('/banks')) return [200, [{ id: 'k1', name: 'BBVA', accountNumber: '0123456789', clabe: '012345678901234567', currency: 'MXN', balance: 125000, isActive: true, companyId: 'c1' }]];
  if (escena.erp && metodo !== 'GET') return [200, { id: 'nuevo', ok: true }];
  const turnoEsc = escena.precorte ? { ...turno, precorteGuardado: true, precorteDeclaracion: { efectivo: 2300.5, tarjeta: 800.5, transferencia: 150 } } : turno;
  const vacio = escena.vacio;
  if (metodo === 'POST' && ruta.startsWith('/pos/cashiers/nip')) return [200, { user: { id: 'u1', name: 'Ana Demo', email: 'ana@negocio-demo.mx', branchId: 'b1' } }];
  if (ruta.startsWith('/pos/products')) return [200, vacio ? [] : productos];
  if (ruta.startsWith('/pos/categories')) return [200, vacio ? [] : categorias];
  if (ruta.startsWith('/pos/areas')) return [200, vacio ? [] : areasConMesas];
  if (ruta.startsWith('/pos/shifts/open')) return escena.sinTurno ? [200, null] : [200, turnoEsc];
  if (/^\/pos\/shifts\/[^/]+\/summary/.test(ruta)) return [200, { ...turno, esperadoEfectivo: 2300.5, ventasCount: 18, porForma: { EFECTIVO: 1500, TARJETA: 800.5, TRANSFERENCIA: 150 } }];
  if (ruta.startsWith('/pos/shifts')) return [200, escena.turnosLista ?? [turno]];
  if (ruta.startsWith('/pos/sales/politicas-mesas')) return [200, { politicaCobro: 'MESERO_EN_MESA', politicaDivisionCuentas: 'TODOS', rol: 'ADMIN', contexto: 'MESA', puedeCobrar: true, puedeDividir: true, soloQuitaSinCocina: false }];
  if (ruta.startsWith('/pos/sales/cuentas-abiertas')) return [200, vacio ? [] : [cuentaAbierta]];
  if (metodo === 'POST' && ruta.startsWith('/pos/sales')) return [200, venta];
  if (ruta.startsWith('/pos/sales')) return [200, vacio ? [] : ventas];
  if (ruta.startsWith('/pos/corte-fields')) return [200, campos];
  if (metodo === 'GET' && ruta.startsWith('/pos/cashiers/lista')) return [200, [{ id: 'u2', nombre: 'Luis Cajero', rol: 'CAJERO' }, { id: 'u3', nombre: null, rol: 'MESERO' }]];
  if (metodo === 'GET' && ruta.startsWith('/pos/autorizaciones/autorizadores')) return [200, [{ id: 'g1', nombre: 'Gina Gerente', email: 'gerente@negocio-demo.mx', rol: 'GERENTE' }, { id: 'a1', nombre: 'Ana Demo', email: 'ana@negocio-demo.mx', rol: 'ADMIN' }]];
  if (metodo === 'POST' && ruta.startsWith('/pos/autorizaciones')) return escena.autorizacionRechazo ? [403, { message: 'Autorizador o contraseña incorrectos.' }] : [200, { token: 'tok-demo', expiraEn: '2099-01-01T00:00:00Z', autorizadoPor: { nombre: 'Gina Gerente', email: 'gerente@negocio-demo.mx', rol: 'GERENTE' } }];
  if (ruta.startsWith('/pos/cashiers/me')) return [200, { id: 'u1', nombre: 'Ana Demo', email: 'ana@negocio-demo.mx', roleCode: 'CAJERO', tenantId: 't1' }];
  if (ruta.startsWith('/pos/notas-cocina')) return [200, vacio ? [] : notasCocina];
  if (ruta.startsWith('/pos/insumo-alerts')) return [200, []];
  if (ruta.startsWith('/pos-chat')) return [200, []];
  if (ruta.startsWith('/users')) return [200, [{ id: 'u1', email: 'ana@negocio-demo.mx', name: 'Ana Demo', roleCode: 'ADMIN', isActive: true }, { id: 'u2', email: 'luis@negocio-demo.mx', name: 'Luis Cajero', roleCode: 'CAJERO', isActive: true }]];
  if (/^\/tenant-settings\/t1(\?|$)/.test(ruta)) return [200, { theme: 'estia', tenantId: 't1', stockPolicy: 'PERMITIR_NEGATIVO', posCapabilities: { mesas_cuenta_abierta: true, membresias: false }, name: 'Negocio Demo' }];
  if (ruta.includes('/politica-cobro')) return [200, { politicaCobro: 'MESERO_EN_MESA' }];
  if (ruta.includes('/politica-division-cuentas')) return [200, { politicaDivisionCuentas: 'TODOS' }];
  if (ruta.includes('/politica-devoluciones')) return [200, { politicaDevoluciones: 'GERENTE_Y_ADMIN' }];
  return null;
}

const BASE = { pos: true };
// Elige la opción n-ésima del select i-ésimo de la ventana abierta (si ese select no existe en esta versión de la pantalla, no hace nada).
const elegir = async (p, i, n) => { const sels = await p.$$('[role="dialog"] select'); if (sels[i]) await sels[i].evaluate((el, k) => { el.selectedIndex = k; el.dispatchEvent(new Event('change', { bubbles: true })); }, n); };
const escribirClave = async (p, v) => { const c = await p.$('[role="dialog"] input[type="password"]'); if (c) await c.type(v); };
const pos = (extra = {}, pasos = null) => ({ ...BASE, ruta: '/pos', ...extra, accion: async (p) => { await entrarPos(p); if (pasos) await pasos(p); } });
// Un CAJERO con sesión entra directo a la terminal (sin re-identificarse con NIP como el ADMIN).
const posCajero = (extra = {}, pasos = null) => ({ ...BASE, ruta: '/pos', ...extra, accion: async (p) => { await ESPERA(1500); if (pasos) await pasos(p); } });
const prod = (p, n) => clic(p, n, 'button,div[role="button"],div');
const venta = { id: 'v9', folio: 'V-0103', total: 193, subtotal: 166.38, impuestos: 26.62, status: 'COMPLETADA', formaPago: 'EFECTIVO', createdAt: '2026-10-25T11:05:00Z', items: [{ productoId: 'p1', nombre: 'Hamburguesa clásica', cantidad: 1, precioUnitario: 95, descuento: 0, subtotal: 95, tasaIva: '16' }], cajero: 'u1' };
export const VENTA_MOCK = venta;
export const ESCENAS_POS = {
  // ── POS: terminal ──
  'pos-pin': { ...BASE, ruta: '/pos' },
  'pos-sin-turno': pos({ sinTurno: true }),
  'pos-terminal-vacio': pos({ vacio: true }),
  'pos-terminal': pos(),
  'pos-error': pos({ fallos: ['/pos/products', '/pos/categories'] }),
  'pos-ticket': pos({ teclas: ['F2', 'Escape'] }, async (p) => { await prod(p, 'Hamburguesa'); await prod(p, 'Refresco'); }),
  'pos-descuento': pos({}, async (p) => { await prod(p, 'Hamburguesa'); await clic(p, '^Descuento$'); }),
  'pos-cortesia': pos({}, async (p) => { await prod(p, 'Hamburguesa'); await clic(p, '^Cortesía$'); }),
  // ── POS: cobro y recibo ──
  'pos-cobro': pos({ teclas: ['F3', 'F6', 'F8', 'F2', 'Escape'] }, async (p) => { await prod(p, 'Hamburguesa'); await tecla(p, 'F4'); }),
  'pos-cobro-error': pos({ fallos: ['/pos/sales'], teclas: ['F8'] }, async (p) => { await prod(p, 'Hamburguesa'); await tecla(p, 'F4'); await tecla(p, 'F8'); await clic(p, 'Agregar pago'); await clic(p, 'CONFIRMAR COBRO'); await ESPERA(900); }),
  'pos-cobro-tarjeta': pos({ teclas: ['F6', 'F2', 'Escape'] }, async (p) => { await prod(p, 'Hamburguesa'); await tecla(p, 'F4'); await tecla(p, 'F3'); }),
  'pos-cobro-spei': pos({ teclas: ['F2', 'Escape'] }, async (p) => { await prod(p, 'Hamburguesa'); await tecla(p, 'F4'); await tecla(p, 'F6'); }),
  'pos-cobro-pago-parcial': pos({ teclas: ['Escape'] }, async (p) => { await prod(p, 'Hamburguesa'); await tecla(p, 'F4'); await p.keyboard.type('50'); await clic(p, 'Agregar pago'); }),
  'mesas-cobro': { ...BASE, ruta: '/mesas', teclas: ['F3', 'F6', 'F8', 'F2', 'Escape'], accion: async (p) => { await clic(p, 'Ocupada|Mesa 2|^2'); await clic(p, '^Cobrar$'); } },
  'mesas-dividir': { ...BASE, ruta: '/mesas', teclas: ['Escape'], accion: async (p) => { await clic(p, 'Ocupada|Mesa 2|^2'); await clic(p, '^Dividir$'); } },
  // ── Fase 3: errores dentro de la ventana, confirmaciones y PanelCuenta como pantalla ──
  'pos-login-cajeros': { ...BASE, ruta: '/pos', accion: async (p) => { await ESPERA(600); } },
  'pos-login-error': { ...BASE, ruta: '/pos', accion: async (p) => { await p.type('input[type="password"]', '12'); await clic(p, 'Continuar'); } },
  'pos-descuento-error': pos({ teclas: ['Escape'] }, async (p) => { await prod(p, 'Hamburguesa'); await clic(p, '^Descuento$'); await clic(p, 'Aplicar descuento'); }),
  'pos-cortesia-error': pos({ teclas: ['Escape'] }, async (p) => { await prod(p, 'Hamburguesa'); await clic(p, '^Cortesía$'); await elegir(p, 0, 3); await p.type('[role="dialog"] input[type="password"]', '12').catch(() => {}); await clic(p, 'Aplicar cortesía').catch(() => {}); }),
  // ── Fase 5: cortesía y descuento sobre el límite con la autorización de un gerente (sesión de CAJERO) ──
  'pos-cortesia-cajero': posCajero({ usuario: { roleCode: 'CAJERO' }, teclas: ['Escape'] }, async (p) => { await prod(p, 'Hamburguesa'); await clic(p, '^Cortesía$'); await ESPERA(500); await elegir(p, 0, 3); await elegir(p, 1, 1); await escribirClave(p, 'clave-demo'); }),
  'pos-cortesia-cajero-rechazo': posCajero({ usuario: { roleCode: 'CAJERO' }, autorizacionRechazo: true, teclas: ['Escape'] }, async (p) => { await prod(p, 'Hamburguesa'); await clic(p, '^Cortesía$'); await ESPERA(500); await elegir(p, 0, 3); await elegir(p, 1, 1); await escribirClave(p, 'mala'); await clic(p, 'Aplicar cortesía'); await ESPERA(500); }),
  'pos-descuento-sobre-tope': posCajero({ usuario: { roleCode: 'CAJERO' }, teclas: ['Escape'] }, async (p) => { await prod(p, 'Hamburguesa'); await clic(p, '^Descuento$'); await clic(p, '^15%$'); await ESPERA(500); await elegir(p, 0, 1); await elegir(p, 1, 1); await escribirClave(p, 'clave-demo'); }),
  'pos-producto-error': pos({ teclas: ['Escape'] }, async (p) => { await clic(p, '^Productos$'); await clic(p, 'Nuevo|Agregar'); await clic(p, '^Guardar$'); }),
  'pos-eliminar-producto': pos({ teclas: ['Escape'] }, async (p) => { await clic(p, '^Productos$'); await clic(p, '^Eliminar$'); }),
  'mesas-cancelar-cuenta': { ...BASE, ruta: '/mesas', teclas: ['Escape'], accion: async (p) => { await clic(p, 'Ocupada|Mesa 2|^2'); await clic(p, '^Cancelar cuenta$'); } },
  'pos-recibo': pos({ imprimible: true }, async (p) => { await prod(p, 'Hamburguesa'); await tecla(p, 'F4'); await tecla(p, 'F8'); await clic(p, 'Agregar pago'); await clic(p, 'CONFIRMAR COBRO'); await ESPERA(1200); }),
  // ── POS: caja ──
  'pos-abrir-turno': pos({ sinTurno: true, teclas: ['F4', 'Escape'] }),
  'pos-retiro': pos({ teclas: ['F4', 'Escape'] }, async (p) => { await clic(p, 'Retiro'); }),
  'pos-deposito': pos({ teclas: ['F4', 'Escape'] }, async (p) => { await clic(p, 'Depósito'); }),
  'pos-precorte': pos({ teclas: ['F4', 'Escape'] }, async (p) => { await clic(p, 'Precorte'); }),
  'pos-cierre': pos({ precorte: true, teclas: ['F10', 'Escape'] }, async (p) => { await clic(p, 'Cerrar Turno'); }),
  'pos-historial': pos({ teclas: ['Escape'] }, async (p) => { await clic(p, 'Historial de Ventas'); }),
  // ── Acceso al tema desde la barra del POS (ADMIN: las 4 skins; CAJERO: ESTIA y Oscuro) ──
  'pos-tema': pos({ teclas: ['Escape'] }, async (p) => { await clic(p, 'Tema'); await ESPERA(400); }),
  'pos-tema-cajero': posCajero({ usuario: { roleCode: 'CAJERO' }, teclas: ['Escape'] }, async (p) => { await ESPERA(3000); await clic(p, 'Tema'); await ESPERA(400); }),
  'pos-historial-vacio': pos({ vacio: true, teclas: ['Escape'] }, async (p) => { await clic(p, 'Historial de Ventas'); }),
  // ── POS: pestañas ──
  'pos-productos': pos({}, async (p) => { await clic(p, '^Productos$'); }),
  'pos-categorias': pos({}, async (p) => { await clic(p, '^Categorías$'); }),
  'pos-turnos': pos({}, async (p) => { await clic(p, '^Turnos$'); }),
  'pos-parametros': pos({}, async (p) => { await clic(p, '^Parámetros$'); }),
  'pos-producto-nuevo': pos({}, async (p) => { await clic(p, '^Productos$'); await clic(p, 'Nuevo|Agregar'); }),
  // ── Mesas ──
  'mesas-vacio': { ...BASE, ruta: '/mesas', vacio: true },
  'mesas-datos': { ...BASE, ruta: '/mesas' },
  'mesas-error': { ...BASE, ruta: '/mesas', fallos: ['/pos/areas', '/pos/sales/cuentas-abiertas'] },
  'mesas-cuenta': { ...BASE, ruta: '/mesas', accion: async (p) => { await clic(p, 'Ocupada|Mesa 2|^2'); } },
  'mesas-config': { ...BASE, ruta: '/mesas', accion: async (p) => { await clic(p, 'Áreas y mesas'); } },
  'mesas-cuentas': { ...BASE, ruta: '/mesas', accion: async (p) => { await clic(p, 'Cuentas'); } },
  // ── Lite y otras de caja ──
  'corte-empresa': { ...BASE, ruta: '/corte?tenant=t1' },
  'corte-pin': { ...BASE, ruta: '/corte?tenant=t1', accion: async (p) => { await clic(p, 'Grupo Demo|Norte'); } },
  'corte-pin-error': { ...BASE, ruta: '/corte?tenant=t1', fallos: ['/pos/cashiers/nip'], accion: async (p) => { await clic(p, 'Grupo Demo|Norte'); await digitos(p, '1234'); } },
  'corte-fondo': { ...BASE, ruta: '/corte?tenant=t1', sinTurno: true, accion: async (p) => { await clic(p, 'Grupo Demo|Norte'); await digitos(p, '1234'); await ESPERA(600); } },
  'corte-corte': { ...BASE, ruta: '/corte?tenant=t1', accion: async (p) => { await clic(p, 'Grupo Demo|Norte'); await digitos(p, '1234'); await ESPERA(900); } },
  'cocina-sin-estacion': { ...BASE, ruta: '/cocina?tenant=t1' },
  'cocina-pin': { ...BASE, ruta: '/cocina?tenant=t1&estacion=COCINA' },
  'cocina-notas': { ...BASE, ruta: '/cocina?tenant=t1&estacion=COCINA', accion: async (p) => { await digitos(p, '1234'); await ESPERA(900); } },
  'cocina-notas-vacio': { ...BASE, ruta: '/cocina?tenant=t1&estacion=COCINA', vacio: true, accion: async (p) => { await digitos(p, '1234'); await ESPERA(900); } },
  'backfill': { ...BASE, ruta: '/pos/backfill' },
  'ventas-offline': { ...BASE, ruta: '/ventas-offline' },
  'corte-campos': { ...BASE, ruta: '/settings/corte-fields' },
  // ── Fase 1 de modales (conjunto de corte): estados de error y teclado en pantalla ──
  'pos-abrir-turno-error': pos({ sinTurno: true }, async (p) => { await clic(p, '^Abrir Turno$', '[role="dialog"] button'); }),
  'pos-retiro-error': pos({}, async (p) => { await clic(p, 'Retiro'); await clic(p, '^Retirar$'); }),
  'pos-deposito-error': pos({}, async (p) => { await clic(p, 'Depósito'); await clic(p, '^Depositar$'); }),
  'pos-precorte-error': pos({ fallos: ['/pos/shifts/s1/precut'] }, async (p) => { await clic(p, 'Precorte'); await clic(p, 'Guardar Precorte'); }),
  'pos-cierre-error': pos({ precorte: true, fallos: ['/pos/shifts/s1/close'] }, async (p) => { await clic(p, 'Cerrar Turno'); await clic(p, 'Definitivamente'); }),
  'corte-teclado': { ...BASE, ruta: '/corte?tenant=t1', accion: async (p) => { await clic(p, 'Grupo Demo|Norte'); await digitos(p, '1234'); await clic(p, '^Efectivo$', 'span'); } },
  'corte-corte-error': { ...BASE, ruta: '/corte?tenant=t1', fallos: ['/pos/shifts/s1/precut'], accion: async (p) => { await clic(p, 'Grupo Demo|Norte'); await digitos(p, '1234'); await clic(p, 'Guardar corte'); await ESPERA(600); } },
  // ERP: ventana Create* (capa sobre la barra superior y Esc que cierra)
  'erp-banks-nuevo': { ...BASE, erp: true, ruta: '/banks', localStorage: { active_company_id: 'c1', active_company_name: 'Grupo Demo', active_branch_id: 'b1', active_branch_name: 'Matriz' }, usuario: { modulosActivos: ['dashboard', 'empresas', 'sucursales', 'usuarios', 'configuracion', 'tesoreria', 'pos', 'bancos', 'movimientos', 'transferencias', 'compras', 'proveedores', 'reportes', 'costos', 'rh'] }, teclas: ['Escape'], accion: async (p) => { await ESPERA(900); await clic(p, 'Nuev|Agregar|Crear|Añadir'); await ESPERA(500); } },
  'corte-fondo-error': { ...BASE, ruta: '/corte?tenant=t1', sinTurno: true, fallos: ['/pos/shifts'], accion: async (p) => { await clic(p, 'Grupo Demo|Norte'); await digitos(p, '1234'); await ESPERA(600); await clic(p, 'Confirmar y abrir turno'); await ESPERA(600); } },
};
