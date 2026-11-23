import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { moduloDisponible, MODULOS_VERTICALES } from './moduloDisponible';

describe('moduloDisponible', () => {
  it('con lista de módulos: solo lo que está activo', () => {
    const s = { roleCode: 'ADMIN', modulosActivos: ['dashboard', 'pacientes'] };
    expect(moduloDisponible('pacientes', s)).toBe(true);
    expect(moduloDisponible('tesoreria', s)).toBe(false);
  });
  it('un negocio sin Pacientes en su lista no lo ve', () => {
    expect(moduloDisponible('pacientes', { roleCode: 'ADMIN', modulosActivos: ['dashboard', 'pos', 'tesoreria'] })).toBe(false);
  });
  it('SOPORTE ve todo', () => {
    expect(moduloDisponible('pacientes', { roleCode: 'SOPORTE', modulosActivos: [] })).toBe(true);
  });
  it('lista vacía o ausente: los módulos genéricos se conservan (sesiones antiguas) pero los verticales NO', () => {
    for (const lista of [[], null, undefined]) {
      const s = { roleCode: 'ADMIN', modulosActivos: lista };
      expect(moduloDisponible('tesoreria', s)).toBe(true);
      for (const v of MODULOS_VERTICALES) expect(moduloDisponible(v, s)).toBe(false);
    }
  });
  it('un vertical activo en la lista sí se ofrece', () => {
    expect(moduloDisponible('membresias', { roleCode: 'GERENTE', modulosActivos: ['membresias'] })).toBe(true);
  });
  it('ocr es siempre visible', () => {
    expect(moduloDisponible('ocr', { roleCode: 'ADMIN', modulosActivos: ['dashboard'] })).toBe(true);
  });
  it('Pacientes y Membresías están declarados como verticales (coincide con el backend)', () => {
    expect([...MODULOS_VERTICALES].sort()).toEqual(['membresias', 'pacientes']);
  });
});

// Guarda de ruta: entrar por URL directa a /patients sin el módulo debe redirigir, no mostrar la pantalla.
describe('ruta /patients', () => {
  it('está envuelta en ModuloRoute modulo="pacientes"', () => {
    const app = readFileSync('src/App.tsx', 'utf8').replace(/\r\n/g, '\n');
    const i = app.indexOf('path="/patients"');
    expect(i).toBeGreaterThan(-1);
    const bloque = app.slice(i, app.indexOf('/>', app.indexOf('</ProtectedRoute>', i)) + 2);
    expect(bloque).toContain('<ModuloRoute modulo="pacientes">');
    expect(bloque.indexOf('<ModuloRoute')).toBeLessThan(bloque.indexOf('<PatientsPage'));
  });
});
