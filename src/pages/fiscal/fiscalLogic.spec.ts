import { describe, expect, it } from 'vitest';
import {
  alturaMinimaProductos, completarGenerico, contieneUuid, FORM_PRODUCTO_VACIO, FORM_RECEPTOR_VACIO, formDeSugerencia, hayCambios, mensajeErrorApi,
  MENSAJE_CLAVE_CONTADOR, normalizarRfc, opcionesRegimen, paginaAnterior, paginaSiguiente, pasosPreparacion, pestanaDeAtajo, pestanaRelativa,
  puedeActivarFacturacion, textoPagina, validarFormEmisor, validarFormProducto, validarFormReceptor, validarRfc, type ResumenFiscal,
} from './fiscalLogic';

describe('RFC en vivo: formato y dígito verificador', () => {
  it('reconoce persona moral y física con el dígito correcto (RFC de prueba del SAT)', () => {
    expect(validarRfc('EKU9003173C9')).toMatchObject({ estado: 'ok', tipo: 'MORAL', mensaje: 'Persona moral, formato válido' });
    expect(validarRfc('XIQB891116QE4')).toMatchObject({ estado: 'ok', tipo: 'FISICA' });
  });

  it('normaliza minúsculas y espacios', () => {
    expect(normalizarRfc('  eku 9003173c9 ')).toBe('EKU9003173C9');
    expect(validarRfc(' eku9003173c9 ').estado).toBe('ok');
  });

  it('avisa del dígito verificador incorrecto y de la fecha imposible', () => {
    expect(validarRfc('EKU9003173C8')).toMatchObject({ estado: 'error', mensaje: expect.stringContaining('dígito verificador') });
    expect(validarRfc('EKU9013173C9')).toMatchObject({ estado: 'error', mensaje: expect.stringContaining('fecha') });
    expect(validarRfc('EKU9002303C9').estado).toBe('error'); // 30 de febrero
  });

  it('mientras se escribe dice cuántos caracteres faltan, sin gritar error', () => {
    expect(validarRfc('')).toMatchObject({ estado: 'vacio', mensaje: '' });
    expect(validarRfc('EKU90')).toMatchObject({ estado: 'incompleto', mensaje: 'Faltan al menos 7 caracteres' });
    expect(validarRfc('EKU9003173C')).toMatchObject({ estado: 'incompleto', mensaje: 'Faltan al menos 1 carácter' });
    expect(validarRfc('XIQB891116QE')).toMatchObject({ estado: 'incompleto', mensaje: 'Persona física: falta 1 carácter' });
  });

  it('rechaza símbolos y largos excesivos', () => {
    expect(validarRfc('EKU-9003173C9').estado).toBe('error');
    expect(validarRfc('EKU9003173C99X').estado).toBe('error');
  });

  it('los genéricos son aviso (válidos pero señalados)', () => {
    expect(validarRfc('xaxx010101000')).toMatchObject({ estado: 'aviso', tipo: 'GENERICO_NACIONAL' });
    expect(validarRfc('XEXX010101000')).toMatchObject({ estado: 'aviso', tipo: 'GENERICO_EXTRANJERO' });
  });

  it('un RFC con formato válido nunca se anuncia como verificado en el SAT', () => {
    expect(validarRfc('EKU9003173C9').mensaje.toLowerCase()).not.toMatch(/sat|existe|verificado/);
  });
});

describe('regímenes', () => {
  const catalogo = { '601': 'General de Ley Personas Morales', '605': 'Sueldos y Salarios', '612': 'Actividades Empresariales' };
  it('muestra número y nombre y pone primero los que suelen aplicar, sin quitar los demás', () => {
    const moral = opcionesRegimen(catalogo, 'MORAL');
    expect(moral[0]).toMatchObject({ codigo: '601', texto: '601 · General de Ley Personas Morales', sugerido: true });
    expect(moral.map((o) => o.codigo)).toEqual(['601', '605', '612']);
    expect(moral.filter((o) => !o.sugerido)).toHaveLength(2);
    expect(opcionesRegimen(catalogo, 'FISICA')[0].codigo).toBe('605');
  });
  it('sin tipo conocido todos son sugeridos', () => {
    expect(opcionesRegimen(catalogo).every((o) => o.sugerido)).toBe(true);
  });
});

describe('pestañas y atajos (sin chocar con Alt+1…4 del ERP)', () => {
  const t = (code: string, extra = {}) => ({ altKey: true, shiftKey: true, ctrlKey: false, code, ...extra });
  it('Alt+Shift+1…4 elige la pestaña', () => {
    expect(pestanaDeAtajo(t('Digit1'))).toBe('emisor');
    expect(pestanaDeAtajo(t('Digit4'))).toBe('receptores');
  });
  it('Alt+1…4 solo (navegación global del ERP) y otras teclas NO se toman', () => {
    expect(pestanaDeAtajo(t('Digit1', { shiftKey: false }))).toBeNull();
    expect(pestanaDeAtajo(t('Digit5'))).toBeNull();
    expect(pestanaDeAtajo(t('Digit2', { ctrlKey: true }))).toBeNull();
    expect(pestanaDeAtajo(t('Digit2', { altKey: false }))).toBeNull();
  });
  it('← → recorre en círculo', () => {
    expect(pestanaRelativa('receptores', 1)).toBe('emisor');
    expect(pestanaRelativa('emisor', -1)).toBe('receptores');
    expect(pestanaRelativa('sucursales', 1)).toBe('productos');
  });
});

describe('nombres en vez de ids', () => {
  it('detecta un UUID visible', () => {
    expect(contieneUuid('Sucursal 3f2b8c1e-9a4d-4e7b-8c21-5d6f7a8b9c0d')).toBe(true);
    expect(contieneUuid('Cafetería Centro · Matriz')).toBe(false);
  });
  it('los textos de preparación usan nombres de empresa, no ids', () => {
    const resumen: ResumenFiscal = {
      empresas: [{ companyId: '3f2b8c1e-9a4d-4e7b-8c21-5d6f7a8b9c0d', empresa: 'Cafetería Centro', emisorCompleto: false, facturacionActiva: false, sucursalesTotal: 2, sucursalesConCp: 1 }],
      productos: { total: 60, conClaves: 42, pendientes: 18 },
    };
    const textos = pasosPreparacion(resumen).map((p) => p.texto).join(' | ');
    expect(contieneUuid(textos)).toBe(false);
    expect(textos).toContain('Cafetería Centro');
  });
});

describe('preparación para facturar', () => {
  const completo: ResumenFiscal = {
    empresas: [{ companyId: 'a', empresa: 'Centro', emisorCompleto: true, facturacionActiva: false, sucursalesTotal: 2, sucursalesConCp: 2 }],
    productos: { total: 10, conClaves: 10, pendientes: 0 },
  };
  it('cuenta sucursales y productos y deja CSD y proveedor como "próximamente"', () => {
    const pasos = pasosPreparacion(completo);
    expect(pasos.map((p) => p.estado)).toEqual(['listo', 'listo', 'listo', 'proximamente', 'proximamente']);
    expect(pasos[1].texto).toBe('Sucursales con CP: 2 de 2');
    expect(pasos[2].texto).toBe('Productos con claves SAT: 10 de 10');
  });
  it('P-03: aun con los pasos 1–3 listos NO se puede activar sin CSD y proveedor', () => {
    const r = puedeActivarFacturacion(pasosPreparacion(completo));
    expect(r.puede).toBe(false);
    expect(r.motivo).toContain('CSD');
  });
  it('con pasos pendientes el motivo dice cuáles', () => {
    const r = puedeActivarFacturacion(pasosPreparacion({ ...completo, productos: { total: 10, conClaves: 4, pendientes: 6 } }));
    expect(r).toMatchObject({ puede: false });
    expect(r.motivo).toContain('productos con claves sat');
  });
  it('sin datos todo está pendiente', () => {
    expect(pasosPreparacion(null).slice(0, 3).every((p) => p.estado === 'pendiente')).toBe(true);
  });
});

describe('producto: la clave SAT la entrega el contador', () => {
  const ok = { claveProdServ: '90101501', claveUnidad: 'H87', unidadNombre: 'Pieza', objetoImp: '02' };
  it('sin clave el mensaje manda al contador y no hay clave inventada', () => {
    expect(validarFormProducto({ ...ok, claveProdServ: '' })).toEqual([MENSAJE_CLAVE_CONTADOR]);
    expect(FORM_PRODUCTO_VACIO.claveProdServ).toBe('');
  });
  it('valida 8 dígitos, unidad y objeto', () => {
    expect(validarFormProducto(ok)).toEqual([]);
    expect(validarFormProducto({ ...ok, claveProdServ: '1234' })[0]).toContain('8 dígitos');
    expect(validarFormProducto({ ...ok, claveUnidad: '' })[0]).toContain('unidad');
    expect(validarFormProducto({ ...ok, objetoImp: '' })[0]).toContain('objeto');
  });
  it('una sugerencia llena unidad y objeto pero NUNCA la clave', () => {
    const f = formDeSugerencia({ categoriaId: 'c', categoria: 'Bebidas', productosPendientes: 3, claveProdServ: null, claveUnidad: 'H87', unidadNombre: 'Pieza', objetoImp: '02' });
    expect(f).toEqual({ claveProdServ: '', claveUnidad: 'H87', unidadNombre: 'Pieza', objetoImp: '02' });
  });
  it('paginación', () => {
    expect(textoPagina(2, 5, 71)).toBe('Pág. 2 de 5 · 71 productos');
    expect(textoPagina(1, 1, 1)).toBe('Pág. 1 de 1 · 1 producto');
    expect(textoPagina(1, 1, 0)).toBe('Sin resultados');
    expect(paginaSiguiente(5, 5)).toBe(5);
    expect(paginaAnterior(1)).toBe(1);
  });
});

describe('receptor y emisor', () => {
  const rec = { rfc: 'XIQB891116QE4', nombreFiscal: 'JUAN PEREZ', codigoPostal: '06600', regimenFiscal: '612', usoCfdiDefault: 'G03', email: '' };
  it('valida los datos mínimos', () => {
    expect(validarFormReceptor(rec)).toEqual([]);
    expect(validarFormReceptor(FORM_RECEPTOR_VACIO)).toHaveLength(4);
    expect(validarFormReceptor({ ...rec, rfc: 'EKU9003173C8' })[0]).toContain('dígito verificador');
    expect(validarFormReceptor({ ...rec, codigoPostal: '066' })[0]).toContain('5 dígitos');
    expect(validarFormReceptor({ ...rec, email: 'no' })[0]).toContain('correo');
  });
  it('el RFC genérico propone régimen 616, uso S01 y nombre', () => {
    expect(completarGenerico({ ...FORM_RECEPTOR_VACIO, rfc: 'xaxx010101000' })).toMatchObject({ rfc: 'XAXX010101000', nombreFiscal: 'PUBLICO EN GENERAL', regimenFiscal: '616', usoCfdiDefault: 'S01' });
    expect(completarGenerico({ ...rec })).toEqual(rec);
  });
  it('el emisor no admite RFC genérico ni vacío', () => {
    const em = { rfc: 'EKU9003173C9', nombreFiscal: 'ESCUELA KEMPER URGATE', regimenFiscal: '601', serie: 'A' };
    expect(validarFormEmisor(em)).toEqual([]);
    expect(validarFormEmisor({ ...em, rfc: 'XAXX010101000' })[0]).toContain('genérico');
    expect(validarFormEmisor({ ...em, serie: 'A-1' })[0]).toContain('serie');
    expect(validarFormEmisor({ rfc: '', nombreFiscal: '', regimenFiscal: '', serie: '' })).toHaveLength(3);
  });
});

describe('varios', () => {
  it('hayCambios compara por contenido', () => {
    expect(hayCambios({ a: 1 }, { a: 1 })).toBe(false);
    expect(hayCambios({ a: 1 }, { a: 2 })).toBe(true);
  });
  it('mensajeErrorApi toma el texto del servidor', () => {
    expect(mensajeErrorApi({ response: { data: { message: 'RFC con formato inválido' } } })).toBe('RFC con formato inválido');
    expect(mensajeErrorApi({ response: { data: { message: ['a', 'b'] } } })).toBe('a · b');
    expect(mensajeErrorApi(new Error('x'), 'No se pudo')).toBe('No se pudo');
  });
  it('presupuesto: la pestaña de productos con 15 filas cabe en 768 px de alto', () => {
    expect(alturaMinimaProductos()).toBeLessThanOrEqual(768);
  });
});
