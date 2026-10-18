import { describe, expect, it } from 'vitest';
import {
  GIROS_FORM, LIMITES, PASOS_PRUEBA, alternarPaso, cargarProgreso, cuerpoSolicitud, guardarProgreso, leerConfigPrueba, leerTokenDeHash, marcarGuiaVista,
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
    const e = validarSolicitud({ nombre: '', correo: 'no', negocio: '', giro: 'restaurante', aceptaAviso: false, captcha: '' });
    expect(Object.keys(e)).toEqual(['nombre', 'correo', 'negocio', 'giro', 'aceptaAviso', 'captcha']);
    expect(e.aceptaAviso).toMatch(/aviso de privacidad/);
  });
  it('solo gimnasio está disponible', () => {
    expect(GIROS_FORM.filter((g) => g.disponible).map((g) => g.valor)).toEqual(['gimnasio']);
    expect(validarSolicitud({ ...buena, giro: 'retail' }).giro).toBeDefined();
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

describe('guía de inicio', () => {
  it('5 pasos con las cifras de la plantilla del gimnasio', () => {
    expect(PASOS_PRUEBA.map((p) => p.id)).toEqual(['turno', 'barra', 'membresia', 'checkin', 'corte']);
    const texto = PASOS_PRUEBA.map((p) => p.detalle).join(' ');
    for (const cifra of ['$46.40', '$580.00', '4321']) expect(texto).toContain(cifra);
    expect(PASOS_PRUEBA.every((p) => p.ruta.startsWith('/'))).toBe(true);
  });
  it('progreso: alternar, contar, paso actual y persistir por tenant', () => {
    const a = almacen();
    let p = cargarProgreso(a, 't1');
    expect(p).toEqual({});
    expect(pasoActual(p)).toBe(0);
    p = alternarPaso(alternarPaso(p, 'turno'), 'barra');
    expect(pasosHechos(p)).toBe(2);
    expect(pasoActual(p)).toBe(2);
    guardarProgreso(a, 't1', p);
    expect(cargarProgreso(a, 't1')).toEqual({ turno: true, barra: true });
    expect(cargarProgreso(a, 't2')).toEqual({}); // otro negocio, otro avance
    expect(alternarPaso(p, 'turno')).toEqual({ barra: true }); // desmarcar
  });
  it('todo hecho: el paso actual es el último; ignora ids desconocidos y JSON roto', () => {
    const todo = Object.fromEntries(PASOS_PRUEBA.map((x) => [x.id, true]));
    expect(pasoActual(todo)).toBe(PASOS_PRUEBA.length - 1);
    const a = almacen();
    a.setItem('prueba_guia_t', '{"turno":true,"inventado":true}');
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
  it('flechas: la selección no se sale de la lista', () => {
    expect(moverSeleccion(0, -1)).toBe(0);
    expect(moverSeleccion(4, 1)).toBe(4);
    expect(moverSeleccion(1, 1)).toBe(2);
  });
});
