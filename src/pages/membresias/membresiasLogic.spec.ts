import { describe, expect, it } from 'vitest';
import {
  armarCobro, fechaCorta, pestanasVisibles, periodoTexto, planAForm, PLAN_FORM_VACIO, precioDelPlan, textoSituacion, validarPlanForm, type Plan,
} from './membresiasLogic';

const plan = (extra: Partial<Plan> = {}): Plan => ({
  id: 'pl-1', nombre: 'Mensual', precio: 500, periodoTipo: 'MESES', periodoCantidad: 1, diasCongelacionMax: 7, activo: true, productId: 'prod-1', ...extra,
});

describe('precio del plan: misma regla de IVA del negocio', () => {
  it('sin configuración: 500 + 16 % = 580', () => {
    expect(precioDelPlan(plan())).toMatchObject({ base: 500, impuestos: 80, total: 580 });
  });
  it('IVA del negocio al 8 %: 540', () => {
    expect(precioDelPlan(plan(), { ivaTasaDefault: '8', preciosIncluyenIva: false })).toMatchObject({ impuestos: 40, total: 540 });
  });
  it('la tasa propia del plan gana: exento = 500 sin IVA', () => {
    expect(precioDelPlan(plan({ tasaIva: 'EXENTO' }), { ivaTasaDefault: '16', preciosIncluyenIva: false })).toMatchObject({ impuestos: 0, total: 500 });
  });
  it('precios con IVA incluido: el cliente paga 500 (base 431.03 + IVA 68.97)', () => {
    expect(precioDelPlan(plan(), { ivaTasaDefault: '16', preciosIncluyenIva: true })).toMatchObject({ base: 431.03, impuestos: 68.97, total: 500 });
  });
});

describe('armarCobro: una venta normal del POS con el producto del plan', () => {
  const base = { plan: plan(), socioId: 's-1', forma: 'EFECTIVO' as const, turnoId: 't-1', sucursalId: 'suc-1', cajero: 'u-1' };

  it('manda producto, socio, turno y el pago por el total; el servidor recalcula', () => {
    const c = armarCobro(base);
    expect(c).toMatchObject({ socioId: 's-1', turnoId: 't-1', sucursalId: 'suc-1', cajero: 'u-1', total: 580, impuestos: 80, subtotal: 500 });
    expect(c.items).toEqual([expect.objectContaining({ productoId: 'prod-1', cantidad: 1, precioUnitario: 500 })]);
    expect(c.formasPago).toEqual([{ forma: 'EFECTIVO', monto: 580 }]);
  });

  it('con IVA incluido el pago es por 500', () => {
    expect(armarCobro({ ...base, cfg: { ivaTasaDefault: '16', preciosIncluyenIva: true } }).formasPago[0].monto).toBe(500);
  });

  it('un plan sin producto de cobro no se puede cobrar', () => {
    expect(() => armarCobro({ ...base, plan: plan({ productId: null }) })).toThrow(/producto de cobro/);
  });
});

describe('formulario de plan', () => {
  const lleno = { ...PLAN_FORM_VACIO, nombre: ' Mensual ', precio: '500', periodoCantidad: '1', descuentoPct: '10', notas: 'Regaderas\n\n  Toalla  ' };

  it('arma el cuerpo limpio: precio numérico, IVA vacío = del negocio, notas sin renglones vacíos', () => {
    const r = validarPlanForm(lleno);
    expect(r).toEqual({
      ok: true,
      error: '',
      body: {
        nombre: 'Mensual', descripcion: null, precio: 500, periodoTipo: 'MESES', periodoCantidad: 1, tasaIva: null, diasCongelacionMax: 0,
        beneficios: { descuentoPct: 10, notas: ['Regaderas', 'Toalla'] }, activo: true,
      },
    });
  });

  it.each([
    [{ nombre: ' ' }, /nombre/],
    [{ precio: '' }, /precio/],
    [{ precio: '-5' }, /precio/],
    [{ periodoCantidad: '0' }, /duración/],
    [{ periodoCantidad: '1.5' }, /duración/],
    [{ diasCongelacionMax: '400' }, /congelación/],
    [{ descuentoPct: '120' }, /descuento/],
    [{ tasaIva: '21' }, /IVA/],
  ])('rechaza %j', (cambio, error) => {
    const r = validarPlanForm({ ...lleno, ...cambio });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(error);
  });

  it('editar: el formulario parte de lo guardado', () => {
    const f = planAForm(plan({ tasaIva: '8', beneficios: { descuentoPct: 15, notas: ['a', 'b'] } }));
    expect(f).toMatchObject({ nombre: 'Mensual', precio: '500', tasaIva: '8', descuentoPct: '15', notas: 'a\nb', diasCongelacionMax: '7' });
  });
});

describe('textos', () => {
  it('periodo y fechas sin corrimiento de zona', () => {
    expect(periodoTexto('MESES', 1)).toBe('1 mes');
    expect(periodoTexto('MESES', 3)).toBe('3 meses');
    expect(periodoTexto('ANOS', 1)).toBe('1 año');
    expect(periodoTexto('DIAS', 15)).toBe('15 días');
    expect(fechaCorta('2026-11-04')).toBe('4 nov 2026');
    expect(fechaCorta(null)).toBe('—');
  });

  it('situación del socio en una línea', () => {
    expect(textoSituacion({ estado: 'VIGENTE', dias: 0 })).toBe('Vence hoy');
    expect(textoSituacion({ estado: 'VIGENTE', dias: 5, periodo: { fechaInicio: '2026-10-01', fechaFin: '2026-10-10', estado: 'ACTIVA' } })).toBe('Vence en 5 día(s) · 10 oct 2026');
    expect(textoSituacion({ estado: 'VENCIDA', dias: 3, periodo: { fechaInicio: '2026-09-01', fechaFin: '2026-09-30', estado: 'ACTIVA' } })).toBe('Venció el 30 sep 2026 (hace 3 día(s))');
    expect(textoSituacion({ estado: 'SIN_MEMBRESIA' })).toBe('No ha contratado');
  });
});

describe('pestañas por rol', () => {
  it('RECEPCION no ve planes ni reportes (ingresos); ADMIN y GERENTE sí', () => {
    expect(pestanasVisibles('RECEPCION')).toEqual(['socios', 'checkin', 'alertas']);
    expect(pestanasVisibles('GERENTE')).toContain('planes');
    expect(pestanasVisibles('ADMIN')).toContain('reportes');
    expect(pestanasVisibles('CAJERO')).not.toContain('reportes');
  });
});
