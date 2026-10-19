import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BLOQUES, CAPTURAS, CORREO_CONTACTO, HERO, LIMITES_POR_GIRO, PASOS_COMO_FUNCIONA, etiquetaGiro, limitesDeGiro } from './aterrizaje';
import { DIAS_PRUEBA, GIROS_FORM } from './pruebaLogic';
import { MARCA_UNICA, TAMANOS_MARCA } from './fondoMarcaDatos';

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
  it('gimnasio: los tres de siempre (textos intactos); el resto de giros: CFDI y tarjeta más lo que su plan realmente no trae', () => {
    expect(limitesDeGiro('gimnasio').map((l) => l.titulo)).toEqual(['Sin CFDI timbrado', 'Sin tarjeta integrada', 'Sin reservas']);
    expect(limitesDeGiro('restaurante').map((l) => l.titulo)).toEqual(['Sin CFDI timbrado', 'Sin tarjeta integrada', 'Sin costeo de recetas']);
    expect(limitesDeGiro('retail').map((l) => l.titulo)).toEqual(['Sin CFDI timbrado', 'Sin tarjeta integrada', 'Sin compras a proveedores']);
    expect(limitesDeGiro('generico').map((l) => l.titulo)).toEqual(['Sin CFDI timbrado', 'Sin tarjeta integrada', 'Sin tesorería ni nómina']);
  });
  it('«Sin reservas» (Playtomic) es solo del gimnasio; un giro desconocido cae en el genérico', () => {
    for (const g of ['restaurante', 'retail', 'generico']) expect(limitesDeGiro(g).some((l) => l.id === 'reservas')).toBe(false);
    expect(limitesDeGiro('inventado')).toEqual(limitesDeGiro('generico'));
  });
  it('cada giro ofrecido en el formulario tiene su lista, con detalle legible', () => {
    for (const g of GIROS_FORM) {
      expect(LIMITES_POR_GIRO[g.valor]).toBeDefined();
      for (const l of limitesDeGiro(g.valor)) expect(l.detalle.length).toBeGreaterThan(20);
    }
  });
});

describe('giros del formulario', () => {
  it('etiquetas; el aviso «Próximamente» y la lista de espera ya NO se usan desde la pantalla', () => {
    expect(etiquetaGiro('retail')).toBe('Tienda');
    expect(etiquetaGiro('generico')).toBe('Otro tipo de negocio (genérico)');
    const src = readFileSync(resolve(__dirname, 'SolicitudPage.tsx'), 'utf8');
    expect(src).not.toMatch(/Próximamente|avisame|lista de espera/i);
    expect(readFileSync(resolve(__dirname, 'aterrizaje.ts'), 'utf8')).not.toMatch(/validarAviso|cuerpoAviso/);
  });
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
    expect(src).toContain('GIROS_TARJETA');
    expect(src).toContain('TARJETA_OTRO');
    expect(src).not.toContain('se abre en otra pestaña');
    expect(src).toMatch(/target="_blank" rel="noopener noreferrer"/);
    expect(src).toMatch(/useTurnstile\(CONFIG_PRUEBA\.siteKey/);
    expect(src).toContain('aviso de privacidad');
  });
});
