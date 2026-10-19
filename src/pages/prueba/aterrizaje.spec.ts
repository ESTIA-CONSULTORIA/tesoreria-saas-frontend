import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  BLOQUES, CAPTURAS, CORREO_CONTACTO, HERO, MENSAJE_AVISO_OK, PASOS_COMO_FUNCIONA, cuerpoAviso, etiquetaGiro, giroDisponible, limitesDeGiro,
  primerCampoAviso, validarAviso, type AvisoForm,
} from './aterrizaje';
import { DIAS_PRUEBA, GIROS_FORM, validarSolicitud } from './pruebaLogic';
import { MARCA_UNICA, TAMANOS_MARCA } from './fondoMarcaDatos';

const buena: AvisoForm = { correo: 'Ana@Negocio.mx', giro: 'restaurante', aceptaAviso: true, captcha: 'tok' };

describe('hero y textos de la página', () => {
  it('título, subtítulo y botón exactos; los días salen de DIAS_PRUEBA', () => {
    expect(HERO.titulo).toBe('Controla tu negocio desde un solo sistema.');
    expect(HERO.subtitulo).toBe(`Caja, inventario, cortes y reportes en una sola pantalla. Prueba ESTIA ${DIAS_PRUEBA} días con un negocio de ejemplo ya configurado para tu giro.`);
    expect(HERO.subtitulo).toContain('30 días');
    expect(HERO.cta).toBe('Comenzar mi prueba gratuita');
  });
  it('tres bloques comunes y tres pasos, sin números de días fijos', () => {
    expect(BLOQUES.map((b) => b.titulo)).toEqual(['Caja sin descuadres', 'Inventario y reportes', 'Control de acceso y usuarios']);
    expect(PASOS_COMO_FUNCIONA.map((p) => p.n)).toEqual([1, 2, 3]);
    expect(PASOS_COMO_FUNCIONA[2].titulo).toBe(`Explora ${DIAS_PRUEBA} días`);
    const todo = JSON.stringify([HERO, BLOQUES, PASOS_COMO_FUNCIONA]);
    expect(todo).not.toMatch(/\b14\b/);
  });
  it('contacto: el correo público de estiaconsultoria.com', () => expect(CORREO_CONTACTO).toBe('contacto@estiaconsultoria.com'));
  it('cada bloque tiene su captura (con texto alternativo) y la ruta, si ya hay imagen, es local', () => {
    for (const b of BLOQUES) expect(CAPTURAS[b.captura].alt.length).toBeGreaterThan(20);
    expect(CAPTURAS.hero.alt.length).toBeGreaterThan(20);
    for (const c of Object.values(CAPTURAS)) if (c.src) expect(c.src).toMatch(/^\/prueba\/[\w.-]+\.(png|webp|jpg)$/);
  });
});

describe('«lo que no incluye» por giro', () => {
  it('gimnasio: los tres de siempre; los demás giros: solo lo común (sin «Sin reservas»)', () => {
    expect(limitesDeGiro('gimnasio').map((l) => l.titulo)).toEqual(['Sin CFDI timbrado', 'Sin tarjeta integrada', 'Sin reservas']);
    for (const g of ['restaurante', 'retail', 'otro']) expect(limitesDeGiro(g).map((l) => l.titulo)).toEqual(['Sin CFDI timbrado', 'Sin tarjeta integrada']);
  });
});

describe('giros y «Próximamente»', () => {
  it('solo el gimnasio está disponible; los demás piden aviso', () => {
    expect(GIROS_FORM.filter((g) => g.disponible).map((g) => g.valor)).toEqual(['gimnasio']);
    expect(giroDisponible('gimnasio')).toBe(true);
    for (const g of ['restaurante', 'retail', 'otro', 'inventado']) expect(giroDisponible(g)).toBe(false);
    expect(etiquetaGiro('retail')).toBe('Tienda');
  });
  it('el aviso exige correo válido, aviso de privacidad y captcha, y solo vale para giros sin plantilla', () => {
    expect(validarAviso(buena)).toEqual({});
    expect(validarAviso({ ...buena, correo: '' }).correo).toBeDefined();
    expect(validarAviso({ ...buena, correo: 'no' }).correo).toBeDefined();
    expect(validarAviso({ ...buena, aceptaAviso: false }).aceptaAviso).toBeDefined();
    expect(validarAviso({ ...buena, captcha: '' }).captcha).toBeDefined();
    expect(validarAviso({ ...buena, giro: 'gimnasio' }).giro).toBeDefined(); // el gimnasio pide la prueba, no el aviso
    expect(validarAviso({ ...buena, giro: 'inventado' }).giro).toBeDefined();
    expect(primerCampoAviso(validarAviso({ ...buena, correo: 'x', captcha: '' }))).toBe('correo');
    expect(primerCampoAviso({})).toBeNull();
  });
  it('cuerpo del aviso: correo normalizado y solo los cuatro campos que espera POST /prueba/avisame', () => {
    expect(cuerpoAviso({ ...buena, correo: '  Ana@Negocio.MX ' })).toEqual({ correo: 'ana@negocio.mx', giro: 'restaurante', captcha: 'tok', aceptaAviso: true });
  });
  it('la solicitud de prueba del gimnasio no cambió (mismas validaciones)', () => {
    const f = { nombre: 'Ana', correo: 'a@b.mx', negocio: 'Gym', giro: 'gimnasio', aceptaAviso: true, captcha: 't' };
    expect(validarSolicitud(f)).toEqual({});
    expect(validarSolicitud({ ...f, giro: 'restaurante' }).giro).toBeDefined();
  });
  it('mensaje de confirmación con el giro', () => expect(MENSAJE_AVISO_OK('retail')).toContain('«Tienda»'));
});

describe('fondo de la página: un solo isotipo grande y sutil', () => {
  it('una marca grande, recortada por el borde, con la opacidad baja de las grandes', () => {
    expect(MARCA_UNICA).toHaveLength(1);
    expect(MARCA_UNICA[0].tam).toBe('grande');
    expect(MARCA_UNICA[0].x > 100 || MARCA_UNICA[0].x < 0 || MARCA_UNICA[0].x > 85).toBe(true);
    expect(TAMANOS_MARCA.grande.opacidad).toBeLessThanOrEqual(0.05);
  });
  it('el layout usa MARCA_UNICA solo en la variante «pagina»', () => {
    const src = readFileSync(resolve(__dirname, 'PruebaLayout.tsx'), 'utf8');
    expect(src).toMatch(/pagina \? MARCA_UNICA : MARCAS_FONDO/);
  });
});

describe('la página mantiene el formulario y el captcha intactos', () => {
  const src = readFileSync(resolve(__dirname, 'SolicitudPage.tsx'), 'utf8');
  it('campos y ids del formulario original', () => {
    for (const id of ['campo-nombre', 'campo-correo', 'campo-negocio', 'campo-aceptaAviso', 'campo-captcha']) expect(src).toContain(id);
    expect(src).toContain("'/prueba/solicitar'");
    expect(src).toContain("'/prueba/avisame'");
    expect(src).toMatch(/useTurnstile\(CONFIG_PRUEBA\.siteKey/);
    expect(src).toContain('aviso de privacidad');
  });
});
