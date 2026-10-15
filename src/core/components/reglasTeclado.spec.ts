import { describe, expect, it, vi } from 'vitest';
import { accionEnter, atajoDeTecla, indiceTab, leyendaAtajos, type Atajo } from './reglasTeclado';

const atajo = (tecla: string, etiqueta: string, extra: Partial<Atajo> = {}): Atajo => ({ tecla, etiqueta, accion: vi.fn(), ...extra });

describe('atajos de las ventanas de caja', () => {
  const lista = [atajo('F2', 'Efectivo'), atajo('F3', 'Tarjeta'), atajo('F4', 'Cobrar')];

  it('encuentra el atajo por tecla y no inventa los que no existen', () => {
    expect(atajoDeTecla(lista, 'F4')?.etiqueta).toBe('Cobrar');
    expect(atajoDeTecla(lista, 'F9')).toBeUndefined();
  });

  it('la leyenda en pantalla documenta Enter, los atajos y Esc', () => {
    expect(leyendaAtajos(lista, true, 'Agregar pago')).toEqual(['Enter Agregar pago', 'F2 Efectivo', 'F3 Tarjeta', 'F4 Cobrar', 'Esc Cancelar']);
  });

  it('sin cancelar ni Enter solo lista los atajos', () => {
    expect(leyendaAtajos(lista, false)).toEqual(['F2 Efectivo', 'F3 Tarjeta', 'F4 Cobrar']);
  });
});

describe('Enter dentro de una ventana', () => {
  const base = { modo: 'confirmar' as const, hayCampoSiguiente: false, defaultPrevented: false };

  it('en un campo de texto o número confirma', () => {
    expect(accionEnter({ ...base, tag: 'INPUT', tipo: 'number' })).toBe('confirmar');
    expect(accionEnter({ ...base, tag: 'INPUT', tipo: 'text' })).toBe('confirmar');
  });

  it('un select conserva Enter para abrir su lista', () => {
    expect(accionEnter({ ...base, tag: 'SELECT' })).toBe('nada');
  });

  it('modo avanzar (cerrar turno): pasa al siguiente campo y en el último NO confirma', () => {
    expect(accionEnter({ ...base, modo: 'avanzar', tag: 'INPUT', tipo: 'number', hayCampoSiguiente: true })).toBe('siguiente');
    expect(accionEnter({ ...base, modo: 'avanzar', tag: 'INPUT', tipo: 'number', hayCampoSiguiente: false })).toBe('nada');
  });

  it('un textarea, un botón, un checkbox y un evento ya atendido conservan su comportamiento', () => {
    expect(accionEnter({ ...base, tag: 'TEXTAREA' })).toBe('nada');
    expect(accionEnter({ ...base, tag: 'BUTTON' })).toBe('nada');
    expect(accionEnter({ ...base, tag: 'INPUT', tipo: 'checkbox' })).toBe('nada');
    expect(accionEnter({ ...base, tag: 'INPUT', tipo: 'text', defaultPrevented: true })).toBe('nada');
  });

  it('en el conteo de billetes pasa al siguiente campo y en el último confirma', () => {
    expect(accionEnter({ ...base, modo: 'siguiente', tag: 'INPUT', tipo: 'number', hayCampoSiguiente: true })).toBe('siguiente');
    expect(accionEnter({ ...base, modo: 'siguiente', tag: 'INPUT', tipo: 'number', hayCampoSiguiente: false })).toBe('confirmar');
  });
});

describe('Tab circular dentro de la ventana', () => {
  it('avanza y da la vuelta', () => {
    expect(indiceTab(0, 3, false)).toBe(1);
    expect(indiceTab(2, 3, false)).toBe(0);
  });
  it('Shift+Tab retrocede y da la vuelta', () => {
    expect(indiceTab(1, 3, true)).toBe(0);
    expect(indiceTab(0, 3, true)).toBe(2);
  });
  it('sin foco dentro entra por el primero (o el último con Shift)', () => {
    expect(indiceTab(-1, 4, false)).toBe(0);
    expect(indiceTab(-1, 4, true)).toBe(3);
    expect(indiceTab(0, 0, false)).toBe(-1);
  });
});
