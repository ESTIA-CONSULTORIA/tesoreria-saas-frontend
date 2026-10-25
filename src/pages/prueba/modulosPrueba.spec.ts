import { describe, expect, it } from 'vitest';
import { MODULOS_NUCLEO, modulosDeGiro, tieneModulo } from './modulosPrueba';

// MISMO literal que backend/src/prueba-publica/giros-prueba.spec.ts («tabla definitiva giro → módulos»).
const NUCLEO = ['dashboard', 'usuarios', 'empresas', 'sucursales', 'configuracion', 'pos', 'configuracion_pos', 'reportes', 'tesoreria'];

describe('módulos de la prueba por giro (espejo del backend)', () => {
  it('tabla definitiva giro → módulos', () => {
    expect([...MODULOS_NUCLEO]).toEqual(NUCLEO);
    expect(modulosDeGiro('restaurante').sort()).toEqual([...NUCLEO, 'costos', 'compras', 'proveedores'].sort());
    expect(modulosDeGiro('retail').sort()).toEqual([...NUCLEO, 'costos', 'compras', 'proveedores'].sort());
    expect(modulosDeGiro('gimnasio').sort()).toEqual([...NUCLEO, 'membresias'].sort());
    expect(modulosDeGiro('generico').sort()).toEqual([...NUCLEO].sort());
  });

  it('aislamiento: membresías solo el gimnasio; costos/compras/proveedores solo restaurante y tienda; todos tienen tesorería', () => {
    for (const g of ['gimnasio', 'restaurante', 'retail', 'generico']) {
      expect(tieneModulo(g, 'tesoreria')).toBe(true);
      expect(tieneModulo(g, 'membresias')).toBe(g === 'gimnasio');
      for (const m of ['costos', 'compras', 'proveedores']) expect(tieneModulo(g, m)).toBe(g === 'restaurante' || g === 'retail');
      expect(tieneModulo(g, 'pacientes')).toBe(false);
      expect(tieneModulo(g, 'rh')).toBe(false);
    }
  });

  it('un giro desconocido o vacío se trata como genérico', () => {
    for (const g of ['medico_dental', 'inventado', '', null, undefined]) expect(modulosDeGiro(g).sort()).toEqual([...NUCLEO].sort());
  });
});
