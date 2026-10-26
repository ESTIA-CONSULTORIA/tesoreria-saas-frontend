import { describe, expect, it } from 'vitest';
import { CLASES_TAMANO_BOTON, CLASES_VARIANTE, esVariantePrincipal, type VarianteBoton } from './reglasBoton';

describe('variantes del botón', () => {
  const todas = Object.keys(CLASES_VARIANTE) as VarianteBoton[];
  it('solo secundario y fantasma no confirman', () => {
    expect(todas.filter((v) => !esVariantePrincipal(v)).sort()).toEqual(['fantasma', 'secundario']);
  });
  it('las que confirman usan texto sobre sólido (on-solid) y fondo de token', () => {
    for (const v of todas.filter(esVariantePrincipal)) {
      expect(CLASES_VARIANTE[v]).toContain('!text-on-solid');
      expect(CLASES_VARIANTE[v]).toMatch(/!bg-(btn|danger-solid|ok-solid|warn-solid)/);
    }
  });
  it('tres tamaños, con objetivo táctil mínimo en el grande', () => {
    expect(Object.keys(CLASES_TAMANO_BOTON).sort()).toEqual(['lg', 'md', 'sm']);
    expect(CLASES_TAMANO_BOTON.lg).toContain('py-3.5');
  });
});
