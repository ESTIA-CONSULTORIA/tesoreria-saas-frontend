import { describe, expect, it } from 'vitest';
import { DIAS_PRUEBA, INCLUYE,
  GIROS_FORM, GIROS_OTROS, GIROS_TARJETA, LIMITES, alternarPaso, cargarProgreso, cuerpoSolicitud, guardarProgreso, leerConfigPrueba, leerTokenDeHash, marcarGuiaVista,
  mensajeDeError, moverSeleccion, pasoActual, pasosHechos, primerCampoConError, validarActivacion, validarPassword, validarSolicitud, yaVioLaGuia, type SolicitudForm,
} from './pruebaLogic';

const almacen = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};
const buena: SolicitudForm = { nombre: 'Ana', correo: ' Ana@Gym.MX ', negocio: 'Gym Ana', giro: 'gimnasio', aceptaAviso: true, captcha: 'tok' };

describe('interruptor y configuración (apagado por defecto)', () => {
  it('sin variables o con el interruptor distinto de «true»: apagada', () => {
    expect(leerConfigPrueba({}).activa).toBe(false);
    for (const v of ['false', '', '1', 'TRUE', 'si']) expect(leerConfigPrueba({ VITE_PRUEBA_PUBLICA_ACTIVA: v, VITE_PRUEBA_AVISO_URL: 'https://a.mx', VITE_TURNSTILE_SITEKEY: 'k' }).activa).toBe(false);
  });
  it('encendida pero sin aviso https o sin site key: sigue apagada y dice qué NOMBRES faltan', () => {
    const c = leerConfigPrueba({ VITE_PRUEBA_PUBLICA_ACTIVA: 'true', VITE_PRUEBA_AVISO_URL: 'http://inseguro.mx' });
    expect(c.activa).toBe(false);
    expect(c.faltantes).toEqual(['VITE_PRUEBA_AVISO_URL', 'VITE_TURNSTILE_SITEKEY']);
  });
  it('encendida y completa: activa, con la URL del aviso configurable', () => {
    const c = leerConfigPrueba({ VITE_PRUEBA_PUBLICA_ACTIVA: 'true', VITE_PRUEBA_AVISO_URL: ' https://aviso.mx/privacidad ', VITE_TURNSTILE_SITEKEY: ' 0x4AAA ' });
    expect(c).toEqual({ activa: true, avisoUrl: 'https://aviso.mx/privacidad', siteKey: '0x4AAA', faltantes: [] });
  });
});

describe('límites visibles', () => {
  it('muestra los tres límites: sin CFDI timbrado, sin tarjeta integrada, sin reservas', () => {
    expect(LIMITES.map((l) => l.titulo)).toEqual(['Sin CFDI timbrado', 'Sin tarjeta integrada', 'Sin reservas']);
    expect(LIMITES.every((l) => l.detalle.length > 20)).toBe(true);
  });
});

describe('solicitud', () => {
  it('formulario correcto: sin errores y cuerpo normalizado igual al que espera el backend', () => {
    expect(validarSolicitud(buena)).toEqual({});
    expect(cuerpoSolicitud(buena)).toEqual({ correo: 'ana@gym.mx', nombre: 'Ana', negocio: 'Gym Ana', giro: 'gimnasio', captcha: 'tok', aceptaAviso: true });
  });
  it('cada campo obligatorio, la casilla del aviso y el captcha', () => {
    const e = validarSolicitud({ nombre: '', correo: 'no', negocio: '', giro: 'medico_dental', aceptaAviso: false, captcha: '' });
    expect(Object.keys(e)).toEqual(['nombre', 'correo', 'negocio', 'giro', 'aceptaAviso', 'captcha']);
    expect(e.aceptaAviso).toMatch(/aviso de privacidad/);
  });
  it('giros: tres tarjetas + la lista de «Otro giro»; los médicos y los inventados no pasan', () => {
    expect(GIROS_TARJETA.map((g) => g.valor)).toEqual(['gimnasio', 'restaurante', 'retail']);
    expect(GIROS_OTROS.map((g) => g.valor)).toEqual(['generico']);
    expect(GIROS_FORM.map((g) => g.valor)).toEqual(['gimnasio', 'restaurante', 'retail', 'generico']);
    for (const g of GIROS_FORM) expect(validarSolicitud({ ...buena, giro: g.valor }).giro).toBeUndefined();
    for (const g of ['medico_dental', 'medico_general', 'inventado', '', '__otro']) expect(validarSolicitud({ ...buena, giro: g }).giro).toBeDefined();
  });
  it('el foco va al primer campo con error, en orden visual', () => {
    expect(primerCampoConError(validarSolicitud({ ...buena, negocio: '', captcha: '' }))).toBe('negocio');
    expect(primerCampoConError(validarSolicitud({ ...buena, aceptaAviso: false, captcha: '' }))).toBe('aceptaAviso');
    expect(primerCampoConError({})).toBeNull();
  });
  it('largos máximos', () => {
    expect(validarSolicitud({ ...buena, nombre: 'x'.repeat(121) }).nombre).toBeDefined();
    expect(validarSolicitud({ ...buena, negocio: 'x'.repeat(121) }).negocio).toBeDefined();
    expect(validarSolicitud({ ...buena, correo: 'a'.repeat(250) + '@b.mx' }).correo).toBeDefined();
  });
});

describe('activación: token en el fragmento', () => {
  const t = 'A'.repeat(43);
  it('lee #token=…, con o sin #, y con otros parámetros', () => {
    expect(leerTokenDeHash(`#token=${t}`)).toBe(t);
    expect(leerTokenDeHash(`token=${t}`)).toBe(t);
    expect(leerTokenDeHash(`#x=1&token=${t}`)).toBe(t);
  });
  it('rechaza ausente, corto, con caracteres raros o mal codificado', () => {
    for (const h of ['', '#', '#token=', '#token=corto', `#token=${t}$$`, '#token=%E0%A4%A', '#otra=1', `#token=${'A'.repeat(201)}`]) expect(leerTokenDeHash(h)).toBeNull();
  });
  it('contraseña: 10+, letras y números; confirmación', () => {
    expect(validarPassword('MiClaveSegura1')).toBeNull();
    for (const mala of ['corta1A', 'soloLetrasLargas', '12345678901']) expect(validarPassword(mala)).not.toBeNull();
    expect(validarActivacion('MiClaveSegura1', 'MiClaveSegura1')).toEqual({});
    expect(validarActivacion('MiClaveSegura1', 'otra')).toEqual({ confirmacion: 'Las contraseñas no coinciden.' });
    expect(validarActivacion('corta', 'corta').password).toBeDefined();
  });
});

describe('mensajes de error', () => {
  const err = (status?: number, data?: any) => (status === undefined ? {} : { response: { status, data } });
  it('traduce cada caso', () => {
    expect(mensajeDeError(err())).toMatch(/conectar/);
    expect(mensajeDeError(err(404))).toMatch(/no está disponible/);
    expect(mensajeDeError(err(429))).toMatch(/Demasiadas/);
    expect(mensajeDeError(err(503, { listaDeEspera: true, message: 'x' }))).toMatch(/lugar disponible/);
    expect(mensajeDeError(err(503, { message: 'No pudimos crear tu prueba.' }))).toBe('No pudimos crear tu prueba.');
    expect(mensajeDeError(err(400, { message: 'El enlace no es válido o ya venció. Pide uno nuevo.' }))).toMatch(/enlace/);
    expect(mensajeDeError(err(400, { message: ['a', 'b'] }))).toBe('a b');
    expect(mensajeDeError(err(500))).toMatch(/error/i);
  });
});

describe('guía de inicio: avance guardado', () => {
  const pasos = [{ id: 'categoria' }, { id: 'productos' }, { id: 'turno' }, { id: 'venta' }];
  it('progreso: alternar, contar, paso actual y persistir por tenant', () => {
    const a = almacen();
    let p = cargarProgreso(a, 't1');
    expect(p).toEqual({});
    expect(pasoActual(p, pasos)).toBe(0);
    p = alternarPaso(alternarPaso(p, 'categoria'), 'productos');
    expect(pasosHechos(p, pasos)).toBe(2);
    expect(pasoActual(p, pasos)).toBe(2);
    guardarProgreso(a, 't1', p);
    expect(cargarProgreso(a, 't1')).toEqual({ categoria: true, productos: true });
    expect(cargarProgreso(a, 't2')).toEqual({}); // otro negocio, otro avance
    expect(alternarPaso(p, 'categoria')).toEqual({ productos: true }); // desmarcar
  });
  it('todo hecho: el paso actual es el último; ignora claves raras y JSON roto', () => {
    const todo = Object.fromEntries(pasos.map((x) => [x.id, true]));
    expect(pasoActual(todo, pasos)).toBe(pasos.length - 1);
    expect(pasoActual({}, [])).toBe(0);
    const a = almacen();
    a.setItem('prueba_guia_t', '{"turno":true,"X-raro":true,"__proto__x":true,"venta":"si"}');
    expect(cargarProgreso(a, 't')).toEqual({ turno: true });
    a.setItem('prueba_guia_t', '{roto');
    expect(cargarProgreso(a, 't')).toEqual({});
  });
  it('la guía se muestra sola una vez por negocio', () => {
    const a = almacen();
    expect(yaVioLaGuia(a, 't1')).toBe(false);
    marcarGuiaVista(a, 't1');
    expect(yaVioLaGuia(a, 't1')).toBe(true);
    expect(yaVioLaGuia(a, 't2')).toBe(false);
  });
  it('sin almacenamiento nunca insiste ni falla', () => {
    const roto = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    expect(yaVioLaGuia(roto, 't')).toBe(true);
    expect(cargarProgreso(roto, 't')).toEqual({});
    expect(() => guardarProgreso(roto, 't', {})).not.toThrow();
  });
  it('las flechas no se salen de la lista', () => {
    expect(moverSeleccion(0, -1, 5)).toBe(0);
    expect(moverSeleccion(4, 1, 5)).toBe(4);
    expect(moverSeleccion(1, 1, 5)).toBe(2);
    expect(moverSeleccion(1, 1, 9)).toBe(2);
  });
});

import { CLAVE_NIP_SOCIO, borrarNipSesion, esEstadoPrueba, esNipValido, etiquetaDias, guardarNipSesion, leerNipSesion, textoDias, type EstadoPrueba } from './pruebaLogic';

const almacen2 = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), _m: m };
};

describe('NIP del socio de ejemplo (aleatorio, mostrado una vez)', () => {
  it('solo se acepta un NIP de 4 dígitos', () => {
    for (const ok of ['0007', '7391']) expect(esNipValido(ok)).toBe(true);
    for (const mal of ['123', '12345', 'abcd', '12 4', 7391, null, undefined]) expect(esNipValido(mal)).toBe(false);
    const a = almacen2();
    guardarNipSesion(a, { numero: '1', nip: 'xx' });
    expect(a._m.size).toBe(0);
  });
  it('se guarda solo en el almacén de sesión que se le pase, se lee y se borra', () => {
    const a = almacen2();
    guardarNipSesion(a, { numero: '1', nip: '7391' });
    expect(a.getItem(CLAVE_NIP_SOCIO)).toContain('7391');
    expect(leerNipSesion(a)).toEqual({ numero: '1', nip: '7391' });
    borrarNipSesion(a);
    expect(leerNipSesion(a)).toBeNull();
  });
  it('datos corruptos o un almacén roto no rompen nada', () => {
    const a = almacen2();
    a.setItem(CLAVE_NIP_SOCIO, '{roto');
    expect(leerNipSesion(a)).toBeNull();
    a.setItem(CLAVE_NIP_SOCIO, JSON.stringify({ numero: '1', nip: 'no' }));
    expect(leerNipSesion(a)).toBeNull();
    const roto = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); }, removeItem: () => { throw new Error('x'); } };
    expect(() => guardarNipSesion(roto, { nip: '7391' })).not.toThrow();
    expect(leerNipSesion(roto)).toBeNull();
    expect(() => borrarNipSesion(roto)).not.toThrow();
    expect(leerNipSesion(null)).toBeNull();
  });
});

describe('estado de la prueba (días restantes)', () => {
  const e = (o: Partial<EstadoPrueba> = {}): EstadoPrueba => ({ esPrueba: true, estado: 'ACTIVA', venceEn: '2026-11-01T12:00:00.000Z', diasRestantes: 14, vencida: false, extendida: false, ...o });
  it('reconoce la forma del servidor y rechaza lo demás', () => {
    expect(esEstadoPrueba(e())).toBe(true);
    for (const mal of [null, {}, { esPrueba: false }, { ...e(), diasRestantes: '14' }, { ...e(), venceEn: 5 }, { ...e(), vencida: undefined }]) expect(esEstadoPrueba(mal)).toBe(false);
  });
  it('textos: varios días, último día, vencida y sin dato', () => {
    expect(textoDias(e())).toBe('Te quedan 14 días de prueba (hasta el 1 de noviembre de 2026).');
    expect(textoDias(e({ diasRestantes: 1 }))).toMatch(/^Último día de tu prueba/);
    expect(textoDias(e({ diasRestantes: 0, vencida: true }))).toMatch(/^Tu prueba terminó el 1 de noviembre de 2026/);
    expect(textoDias(null)).toBe('');
  });
  it('etiqueta corta del botón', () => {
    expect(etiquetaDias(e())).toBe('14 d');
    expect(etiquetaDias(e({ diasRestantes: 1 }))).toBe('último día');
    expect(etiquetaDias(e({ vencida: true, diasRestantes: 0 }))).toBe('terminó');
    expect(etiquetaDias(null)).toBe('');
  });
});

describe('duración de la prueba (un solo lugar)', () => {
  it('son 30 días y los textos salen de la constante, sin un número fijo', () => {
    expect(DIAS_PRUEBA).toBe(30);
    expect(INCLUYE[0]).toBe(`${DIAS_PRUEBA} días con tu propio negocio de prueba`);
  });
});
