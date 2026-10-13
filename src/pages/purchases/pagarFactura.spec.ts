import { describe, expect, it } from 'vitest';
import { facturaAPagar, PARAM_PAGAR, rutaPagarFactura } from './pagarFactura';

describe('pagarFactura', () => {
  it('arma la ruta a Compras con la factura a pagar', () => {
    expect(rutaPagarFactura('abc-123')).toBe('/purchases?pagar=abc-123');
    expect(new URLSearchParams(rutaPagarFactura('a b&c').split('?')[1]).get(PARAM_PAGAR)).toBe('a b&c');
  });

  it('encuentra la factura por id y devuelve null si no está o no hay parámetro', () => {
    const lista = [{ id: 'f1' }, { id: 'f2' }];
    expect(facturaAPagar(lista, 'f2')).toEqual({ id: 'f2' });
    expect(facturaAPagar(lista, 'nope')).toBeNull();
    expect(facturaAPagar(lista, null)).toBeNull();
    expect(facturaAPagar([], 'f1')).toBeNull();
  });
});
