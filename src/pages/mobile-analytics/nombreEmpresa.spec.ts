import { describe, it, expect } from 'vitest';
import { inicialEmpresa, nombreEmpresa } from './nombreEmpresa';

describe('nombreEmpresa (Executive Access)', () => {
  it('usa el nombre comercial, luego la razón social; nunca queda vacío ni lanza error', () => {
    expect(nombreEmpresa({ tradeName: 'Grupo Demo', legalName: 'Grupo Demo SA de CV' })).toBe('Grupo Demo');
    expect(nombreEmpresa({ tradeName: '', legalName: 'Norte SA' })).toBe('Norte SA');
    expect(nombreEmpresa({ name: 'Heredado' })).toBe('Heredado');
    expect(nombreEmpresa({})).toBe('Empresa sin nombre');
    expect(nombreEmpresa(null)).toBe('Empresa sin nombre');
    expect(nombreEmpresa({ tradeName: '   ' })).toBe('Empresa sin nombre');
  });
  it('la inicial sale del nombre mostrado', () => {
    expect(inicialEmpresa({ tradeName: 'norte' })).toBe('N');
    expect(inicialEmpresa(undefined)).toBe('E');
  });
});
