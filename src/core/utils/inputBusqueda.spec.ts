import { describe, expect, it } from 'vitest';
import { NOMBRES_PROHIBIDOS, propsBusqueda, propsTextoLibre } from './inputBusqueda';
import { desgloseTicket, etiquetaIvaUnica, lineasDeIva, type IvaConfig } from './iva';

describe('propsBusqueda / propsTextoLibre', () => {
  it('búsqueda: type=search, autoComplete=off y sin ignorar gestores de contraseñas', () => {
    const p = propsBusqueda('pos-buscar-producto');
    expect(p.type).toBe('search');
    expect(p.autoComplete).toBe('off');
    expect(p['data-lpignore']).toBe('true');
    expect(p['data-1p-ignore']).toBe('true');
    expect(p.spellCheck).toBe(false);
  });

  it('el name no sugiere correo/usuario', () => {
    for (const n of ['pos-buscar-producto', 'mesas-buscar-producto', 'membresias-buscar-socio', 'pos-numero-socio']) {
      expect(NOMBRES_PROHIBIDOS.test(propsBusqueda(n).name)).toBe(false);
    }
    expect(NOMBRES_PROHIBIDOS.test('email')).toBe(true);
    expect(NOMBRES_PROHIBIDOS.test('username')).toBe(true);
  });

  it('texto libre: autoComplete=off y type=text', () => {
    const p = propsTextoLibre('pos-producto-nombre');
    expect(p.type).toBe('text');
    expect(p.autoComplete).toBe('off');
  });
});

describe('etiquetaIvaUnica: IVA del ticket', () => {
  const cfg8: IvaConfig = { ivaTasaDefault: '8', preciosIncluyenIva: false };
  const cfg16: IvaConfig = { ivaTasaDefault: '16', preciosIncluyenIva: false };

  it('ticket vacío: usa la tasa del NEGOCIO (no una fija ni la del último producto)', () => {
    expect(etiquetaIvaUnica(desgloseTicket([], cfg8), cfg8)).toBe('IVA (8%)');
    expect(etiquetaIvaUnica(desgloseTicket([], cfg16), cfg16)).toBe('IVA (16%)');
    expect(etiquetaIvaUnica(desgloseTicket([], { ivaTasaDefault: 'EXENTO', preciosIncluyenIva: false }), { ivaTasaDefault: 'EXENTO', preciosIncluyenIva: false })).toBe('IVA exento');
  });

  it('una sola tasa en el ticket: la de esa tasa, no la del negocio', () => {
    const d = desgloseTicket([{ cantidad: 1, precioUnitario: 100, tasaIva: '0' }], cfg8);
    expect(etiquetaIvaUnica(d, cfg8)).toBe('IVA (0%)');
  });

  it('ítems sin tasa propia heredan la del negocio', () => {
    const d = desgloseTicket([{ cantidad: 2, precioUnitario: 50 }], cfg8);
    expect(etiquetaIvaUnica(d, cfg8)).toBe('IVA (8%)');
    expect(d.impuestos).toBe(8);
  });

  it('ítems mixtos: hay una línea por tasa (el recibo las desglosa)', () => {
    const d = desgloseTicket(
      [
        { cantidad: 1, precioUnitario: 100, tasaIva: '16' },
        { cantidad: 1, precioUnitario: 100, tasaIva: '8' },
      ],
      cfg8,
    );
    const lineas = lineasDeIva(d);
    expect(lineas.map((l) => l.tasa)).toEqual(['16', '8']);
    expect(lineas.map((l) => l.impuestos)).toEqual([16, 8]);
  });
});
