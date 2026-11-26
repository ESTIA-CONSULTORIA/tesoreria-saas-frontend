import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { decisionRuta, moduloDisponible, MODULOS_VERTICALES } from './moduloDisponible';

describe('moduloDisponible', () => {
  it('con lista de módulos: solo lo que está activo', () => {
    const s = { roleCode: 'ADMIN', modulosActivos: ['dashboard', 'pacientes'] };
    expect(moduloDisponible('pacientes', s)).toBe(true);
    expect(moduloDisponible('tesoreria', s)).toBe(false);
  });
  it('un negocio sin Pacientes en su lista no lo ve', () => {
    expect(moduloDisponible('pacientes', { roleCode: 'ADMIN', modulosActivos: ['dashboard', 'pos', 'tesoreria'] })).toBe(false);
  });
  it('SOPORTE sin negocio elegido ve todo', () => {
    expect(moduloDisponible('pacientes', { roleCode: 'SOPORTE', modulosActivos: [] })).toBe(true);
  });
  it('SOPORTE con negocio elegido: Pacientes y Membresías solo si ese negocio los tiene activos; lo demás siempre', () => {
    const sin = { roleCode: 'SOPORTE', negocioSoporteId: 'n1', modulosNegocioSoporte: ['dashboard', 'pos'] };
    expect(moduloDisponible('pacientes', sin)).toBe(false);
    expect(moduloDisponible('membresias', sin)).toBe(false);
    expect(moduloDisponible('tesoreria', sin)).toBe(true);
    expect(moduloDisponible('pacientes', { ...sin, modulosNegocioSoporte: ['pacientes'] })).toBe(true);
    // lista aún sin cargar: no se ofrece un vertical que quizá no corresponde
    expect(moduloDisponible('pacientes', { ...sin, modulosNegocioSoporte: null })).toBe(false);
    expect(moduloDisponible('costos', { ...sin, modulosNegocioSoporte: null })).toBe(true);
  });
  it('ADMIN de un negocio con el módulo no cambia', () => {
    expect(moduloDisponible('pacientes', { roleCode: 'ADMIN', modulosActivos: ['pacientes'], negocioSoporteId: 'x', modulosNegocioSoporte: [] })).toBe(true);
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

// Puerta de ruta (ModuloRoute): misma regla que el menú, para TODOS los roles.
describe('decisionRuta (ModuloRoute)', () => {
  const rioVa = { roleCode: 'SOPORTE', negocioSoporteId: 'riova', modulosNegocioSoporte: ['dashboard', 'pacientes'] };
  const empresaDemo = { roleCode: 'SOPORTE', negocioSoporteId: 'demo', modulosNegocioSoporte: ['dashboard', 'pos', 'tesoreria'] };

  it('con el módulo → abre (RIOVA DENTAL sigue entrando a Pacientes, como SOPORTE y como ADMIN)', () => {
    expect(decisionRuta('pacientes', rioVa)).toBe('permitir');
    expect(decisionRuta('pacientes', { roleCode: 'ADMIN', modulosActivos: ['dashboard', 'pacientes'] })).toBe('permitir');
  });
  it('sin el módulo → redirige, también SOPORTE por URL directa (Empresa Demo / Grupo Empresarial Demo)', () => {
    expect(decisionRuta('pacientes', empresaDemo)).toBe('redirigir');
    expect(decisionRuta('membresias', empresaDemo)).toBe('redirigir');
    expect(decisionRuta('pacientes', { roleCode: 'ADMIN', modulosActivos: ['dashboard', 'pos'] })).toBe('redirigir');
  });
  it('cambio de negocio dentro de la pantalla: la misma ruta, con el negocio nuevo, pasa de permitir a redirigir', () => {
    expect(decisionRuta('pacientes', rioVa)).toBe('permitir');
    expect(decisionRuta('pacientes', empresaDemo)).toBe('redirigir');
  });
  it('SOPORTE con «Sin negocio» no cambia: entra; con negocio y módulos aún cargando: espera (no saca a quien sí lo tiene)', () => {
    expect(decisionRuta('pacientes', { roleCode: 'SOPORTE', negocioSoporteId: null, modulosNegocioSoporte: null })).toBe('permitir');
    expect(decisionRuta('pacientes', { roleCode: 'SOPORTE', negocioSoporteId: 'riova', modulosNegocioSoporte: null })).toBe('esperar');
  });
  it('el resto de módulos no cambia para SOPORTE (ve todo lo demás aunque el negocio no lo tenga)', () => {
    expect(decisionRuta('tesoreria', { roleCode: 'SOPORTE', negocioSoporteId: 'demo', modulosNegocioSoporte: [] })).toBe('permitir');
    expect(decisionRuta('costos', { roleCode: 'SOPORTE', negocioSoporteId: 'demo', modulosNegocioSoporte: null })).toBe('permitir');
  });
  it('ModuloRoute ya no deja pasar a SOPORTE sin preguntar, y /membresias y /hr están envueltas', () => {
    const mr = readFileSync('src/core/router/ModuloRoute.tsx', 'utf8');
    expect(mr).not.toMatch(/roleCode === ["']SOPORTE["']/);
    expect(mr).toContain('useDecisionRuta');
    const app = readFileSync('src/App.tsx', 'utf8').replace(/\r\n/g, '\n');
    for (const [ruta, mod] of [['/membresias', 'membresias'], ['/hr', 'rh'], ['/patients', 'pacientes']]) {
      const i = app.indexOf(`path="${ruta}"`);
      expect(i).toBeGreaterThan(-1);
      expect(app.slice(i, app.indexOf('</ProtectedRoute>', i))).toContain(`<ModuloRoute modulo="${mod}">`);
    }
  });
});
