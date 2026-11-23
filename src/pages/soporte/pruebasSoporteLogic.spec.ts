import { describe, expect, it } from 'vitest';
import { etiquetaEstado, etiquetaPlan, fechaCorta, mensajeConversion, puedeConvertir, textoVigencia, validarConversion } from './pruebasSoporteLogic';

describe('pruebasSoporteLogic', () => {
  it('etiquetas de estado en español, con respaldo', () => {
    expect(etiquetaEstado('ACTIVA')).toBe('En prueba');
    expect(etiquetaEstado('VENCIDA')).toBe('Vencida');
    expect(etiquetaEstado('CONVERTIDA')).toBe('Convertida');
    expect(etiquetaEstado('OTRA')).toBe('OTRA');
  });

  it('textoVigencia: singular, plural, vencida, convertida y sin fecha', () => {
    expect(textoVigencia({ estado: 'ACTIVA', diasRestantes: 1 })).toBe('Queda 1 día');
    expect(textoVigencia({ estado: 'ACTIVA', diasRestantes: 9 })).toBe('Quedan 9 días');
    expect(textoVigencia({ estado: 'ACTIVA', diasRestantes: 0 })).toBe('Venció');
    expect(textoVigencia({ estado: 'VENCIDA', diasRestantes: 0 })).toBe('Venció');
    expect(textoVigencia({ estado: 'CONVERTIDA', diasRestantes: null })).toBe('Plan de pago');
    expect(textoVigencia({ estado: 'ACTIVA', diasRestantes: null })).toBe('Sin fecha');
  });

  it('solo se convierte una prueba activa o vencida con negocio', () => {
    expect(puedeConvertir({ estado: 'ACTIVA', tenantId: 't' })).toBe(true);
    expect(puedeConvertir({ estado: 'VENCIDA', tenantId: 't' })).toBe(true);
    expect(puedeConvertir({ estado: 'CONVERTIDA', tenantId: 't' })).toBe(false);
    expect(puedeConvertir({ estado: 'ACTIVA', tenantId: null })).toBe(false);
  });

  it('validarConversion exige un plan de la lista', () => {
    const planes = ['BASIC', 'PRO'];
    expect(validarConversion('', planes)).toBe('Elige un plan.');
    expect(validarConversion('PRUEBA', planes)).toBe('Ese plan no es válido.');
    expect(validarConversion('PRO', planes)).toBeNull();
  });

  it('etiquetaPlan usa nombres legibles y respeta códigos desconocidos', () => {
    expect(etiquetaPlan('LITE_CORTE')).toBe('Lite — Corte de caja');
    expect(etiquetaPlan('NUEVO')).toBe('NUEVO');
  });

  it('mensajeConversion no filtra trazas y distingue casos', () => {
    expect(mensajeConversion({ response: { status: 404 } })).toMatch(/no existe|apagada/);
    expect(mensajeConversion({ response: { status: 403 } })).toMatch(/SOPORTE/);
    expect(mensajeConversion({ response: { status: 409, data: { message: 'Esta prueba ya fue convertida.' } } })).toBe('Esta prueba ya fue convertida.');
    expect(mensajeConversion({ response: { status: 400, data: { message: ['Plan no válido.'] } } })).toBe('Plan no válido.');
    expect(mensajeConversion({ response: { status: 500, data: { message: 'QueryFailedError: relation x' } } })).not.toMatch(/QueryFailed/);
    expect(mensajeConversion(new Error('Network Error'))).toMatch(/conexión/);
  });

  it('fechaCorta tolera vacío e inválido', () => {
    expect(fechaCorta(null)).toBe('—');
    expect(fechaCorta('no-fecha')).toBe('—');
    expect(fechaCorta('2026-12-10T12:00:00Z')).toMatch(/2026/);
  });
});
