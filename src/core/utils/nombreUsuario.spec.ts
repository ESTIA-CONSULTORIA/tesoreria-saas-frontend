import { describe, expect, it } from 'vitest';
import { construirDirectorio, esUuid, nombreUsuario } from './nombreUsuario';

const ANA = '1bd9bfdb-5a1c-4f0e-9f0b-0123456789ab';
const SIN_NOMBRE = '2cd9bfdb-5a1c-4f0e-9f0b-0123456789ab';
const dir = construirDirectorio([
  { id: ANA, nombre: 'Ana Pérez', email: 'ana@demo.com' },
  { id: SIN_NOMBRE, nombre: null, email: 'caja@demo.com' },
]);

describe('nombreUsuario', () => {
  it('un id interno se muestra como nombre completo', () => {
    expect(nombreUsuario(ANA, dir)).toBe('Ana Pérez');
    expect(nombreUsuario(ANA.toUpperCase(), dir)).toBe('Ana Pérez');
  });

  it('sin nombre, muestra el correo', () => {
    expect(nombreUsuario(SIN_NOMBRE, dir)).toBe('caja@demo.com');
  });

  it('un id que no es del tenant (no está en el directorio) nunca se muestra crudo', () => {
    const ajeno = '99999999-5a1c-4f0e-9f0b-0123456789ab';
    expect(nombreUsuario(ajeno, dir)).toBe('—');
    expect(nombreUsuario(ajeno, dir, 'Usuario')).toBe('Usuario');
    expect(nombreUsuario(ajeno, dir)).not.toContain(ajeno);
  });

  it('sin directorio cargado tampoco se muestra el id', () => {
    expect(nombreUsuario(ANA, undefined, 'Usuario')).toBe('Usuario');
    expect(nombreUsuario(ANA, construirDirectorio(null), 'Usuario')).toBe('Usuario');
  });

  it('un correo (cuentas de mesas) se resuelve a su nombre; si no está, se muestra el correo', () => {
    expect(nombreUsuario('ANA@demo.com', dir)).toBe('Ana Pérez');
    expect(nombreUsuario('otro@demo.com', dir)).toBe('otro@demo.com');
  });

  it('texto libre de datos viejos se respeta y los vacíos usan el respaldo', () => {
    expect(nombreUsuario('Usuario Demo', dir)).toBe('Usuario Demo');
    expect(nombreUsuario('', dir)).toBe('—');
    expect(nombreUsuario(null, dir, 'Cajero')).toBe('Cajero');
  });

  it('esUuid distingue ids de texto', () => {
    expect(esUuid(ANA)).toBe(true);
    expect(esUuid('cajero1')).toBe(false);
  });
});
