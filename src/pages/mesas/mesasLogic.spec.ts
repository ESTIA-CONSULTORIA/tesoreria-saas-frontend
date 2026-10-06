import { describe, expect, it } from 'vitest';
import {
  accionesVisibles, asegurarConexion, construirItem, cuentaDeMesa, indicesPorCobrar, mensajeError, MENSAJE_SIN_CONEXION,
  OPCIONES_POLITICA_COBRO, OPCIONES_POLITICA_DIVISION, totalItems, type Cuenta, type PoliticasMesas,
} from './mesasLogic';

const pol = (o: Partial<PoliticasMesas> = {}): PoliticasMesas => ({
  politicaCobro: 'SOLO_CAJA', politicaDivisionCuentas: 'GERENTE_CAPITAN_CAJERO', rol: 'MESERO', contexto: 'MESA',
  puedeCobrar: false, puedeDividir: false, soloQuitaSinCocina: true, ...o,
});
const item = (extra = {}) => ({ productoId: 'p', nombre: 'Taco', cantidad: 1, precioUnitario: 50, descuento: 0, subtotal: 50, ...extra });
const cuenta = (o: Partial<Cuenta> = {}): Cuenta => ({ id: 'c1', tableId: 'm1', total: 100, pagado: 0, saldoPendiente: 100, items: [item(), item({ notaCocinaId: 'n1' })], ...o });

describe('accionesVisibles — solo decide qué botones se muestran (el backend decide siempre)', () => {
  it('sin políticas cargadas o sin cuenta: no se muestra nada', () => {
    expect(accionesVisibles(null, cuenta()).cobrar).toBe(false);
    expect(accionesVisibles(pol(), null).cancelar).toBe(false);
  });

  it('mesero con SOLO_CAJA: no ve cobrar ni dividir', () => {
    const a = accionesVisibles(pol(), cuenta());
    expect(a.cobrar).toBe(false);
    expect(a.dividir).toBe(false);
  });

  it('caja (puedeCobrar) ve cobrar; dividir solo si la política lo permite', () => {
    const caja = pol({ rol: 'CAJERO', contexto: 'CAJA', puedeCobrar: true, puedeDividir: false, soloQuitaSinCocina: false });
    expect(accionesVisibles(caja, cuenta()).cobrar).toBe(true);
    expect(accionesVisibles(caja, cuenta()).dividir).toBe(false);
    expect(accionesVisibles({ ...caja, puedeDividir: true }, cuenta()).dividir).toBe(true);
  });

  it('el mesero solo ve quitar en ítems sin nota de cocina; los demás roles quitan cualquiera', () => {
    const c = cuenta();
    const mesero = accionesVisibles(pol(), c);
    expect(mesero.quitarItem(c.items[0], 0)).toBe(true);
    expect(mesero.quitarItem(c.items[1], 1)).toBe(false);
    const capitan = accionesVisibles(pol({ rol: 'CAPITAN', soloQuitaSinCocina: false }), c);
    expect(capitan.quitarItem(c.items[1], 1)).toBe(true);
  });

  it('no se quita un ítem anulado ni uno ya cobrado por ítems', () => {
    const c = cuenta({ items: [item({ anulado: true }), item()], formasPago: [{ forma: 'EFECTIVO', monto: 50, itemIndexes: [1] }] });
    const a = accionesVisibles(pol({ rol: 'GERENTE', soloQuitaSinCocina: false }), c);
    expect(a.quitarItem(c.items[0], 0)).toBe(false);
    expect(a.quitarItem(c.items[1], 1)).toBe(false);
  });

  it('cancelar: no con pagos; el mesero tampoco con ítems enviados a cocina', () => {
    expect(accionesVisibles(pol(), cuenta()).cancelar).toBe(false);
    expect(accionesVisibles(pol(), cuenta({ items: [item()] })).cancelar).toBe(true);
    expect(accionesVisibles(pol({ rol: 'CAPITAN', soloQuitaSinCocina: false }), cuenta()).cancelar).toBe(true);
    expect(accionesVisibles(pol({ rol: 'GERENTE', soloQuitaSinCocina: false }), cuenta({ pagado: 40 })).cancelar).toBe(false);
  });
});

describe('cuentas, ítems y montos', () => {
  it('cuentaDeMesa encuentra la cuenta de una mesa', () => {
    expect(cuentaDeMesa([cuenta(), cuenta({ id: 'c2', tableId: 'm2' })], 'm2')?.id).toBe('c2');
    expect(cuentaDeMesa([cuenta()], 'otra')).toBeUndefined();
  });
  it('indicesPorCobrar salta anulados y ya cobrados por ítem', () => {
    const c = cuenta({ items: [item(), item({ anulado: true }), item(), item()], formasPago: [{ forma: 'EFECTIVO', monto: 50, itemIndexes: [2] }] });
    expect(indicesPorCobrar(c)).toEqual([0, 3]);
  });
  it('construirItem y totalItems redondean a centavos', () => {
    const it = construirItem({ id: 'p1', name: 'Agua', price: '33.333' }, 3);
    expect(it).toMatchObject({ productoId: 'p1', cantidad: 3, precioUnitario: 33.333, subtotal: 100 });
    expect(totalItems([it, construirItem({ id: 'p2', name: 'X', price: 10.5 }, 2)])).toBe(121);
  });
});

describe('errores y conexión', () => {
  it('muestra el mensaje real del backend (texto o arreglo)', () => {
    expect(mensajeError({ response: { data: { message: 'Con la política de cobro de este negocio las cuentas solo se cobran en caja. Pasa la cuenta a caja.' } } }))
      .toBe('Con la política de cobro de este negocio las cuentas solo se cobran en caja. Pasa la cuenta a caja.');
    expect(mensajeError({ response: { data: { message: ['a', 'b'] } } })).toBe('a. b');
  });
  it('sin respuesta es problema de conexión; con respuesta sin mensaje usa el respaldo', () => {
    expect(mensajeError(new Error('Network Error'))).toMatch(/Sin conexión/);
    expect(mensajeError({ response: { data: {} } }, 'falló')).toBe('falló');
  });
  it('sin conexión se rechaza antes de llamar al backend (nada se encola)', () => {
    expect(() => asegurarConexion(false)).toThrow(MENSAJE_SIN_CONEXION);
    expect(() => asegurarConexion(true)).not.toThrow();
  });
});

describe('selectores de política: una línea por opción', () => {
  it('las 3 opciones de cobro y las 3 de división, con su línea', () => {
    expect(OPCIONES_POLITICA_COBRO.map((o) => o.value)).toEqual(['SOLO_CAJA', 'GERENTE_EN_MESA', 'MESERO_EN_MESA']);
    expect(OPCIONES_POLITICA_DIVISION.map((o) => o.value)).toEqual(['GERENTE_CAPITAN_CAJERO', 'SOLO_GERENTE', 'TODOS']);
    for (const o of [...OPCIONES_POLITICA_COBRO, ...OPCIONES_POLITICA_DIVISION]) expect(o.linea.length).toBeGreaterThan(10);
  });
});
