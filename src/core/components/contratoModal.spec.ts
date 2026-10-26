import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { altoMaximo, ANCHO_MAX_PX, anchoEfectivo, CAPA_BARRA_SUPERIOR, CAPA_MODAL, CLASES_MODAL, clasePanel, type TamanoModal } from './reglasModal';
import { leerFuentes, SRC } from './fuentesApp';

// Spec 3 del estándar de ventanas: el CONTRATO de `Modal` (rol, Esc, foco, capa, tamaño a 1366×768). Aquí se fija lo que se puede
// comprobar sin navegador; la comprobación en navegador real (rol, Esc, foco y medidas de cada ventana) la hace
// scripts/contrato-modal.mjs sobre las ventanas de caja.
const modal = readFileSync(join(SRC, 'core/components/Modal.tsx'), 'utf8');
const TAMANOS: TamanoModal[] = ['sm', 'md', 'lg', 'xl'];

describe('contrato de Modal: rol, Esc y foco', () => {
  it('es un diálogo modal con nombre accesible', () => {
    expect(modal).toContain('role="dialog"');
    expect(modal).toContain('aria-modal="true"');
    expect(modal).toContain('aria-labelledby={idTitulo}');
    expect(modal).toContain('id={idTitulo}');
  });
  it('Esc cierra solo la ventana de arriba (pila) y los atajos no actúan en las de abajo', () => {
    expect(modal).toContain('usePilaEscape(onClose)');
    expect(modal).toContain('!esSuperior()');
  });
  it('foco inicial, Tab atrapado y foco devuelto al cerrar', () => {
    expect(modal).toContain('data-autofocus');
    expect(modal).toContain('SELECTOR_ENFOCABLES');
    expect(modal).toContain('indiceTab(');
    expect(modal).toContain('previo?.focus?.()');
  });
});

describe('contrato de Modal: capa única sobre la barra superior', () => {
  it('se pinta en un portal colgado de <body> con la capa del estándar', () => {
    expect(modal).toContain('createPortal(');
    expect(modal).toContain('document.body');
    expect(CLASES_MODAL.overlay).toContain(`z-[${CAPA_MODAL}]`);
    expect(CAPA_MODAL).toBeGreaterThan(CAPA_BARRA_SUPERIOR);
  });
  it('la capa de la barra superior declarada es la real', () => {
    const barra = readFileSync(join(SRC, 'core/layout/TopBar.tsx'), 'utf8');
    expect(barra).toContain(`zIndex: ${CAPA_BARRA_SUPERIOR},`);
  });
});

describe('contrato de Modal: tamaño a 1366×768', () => {
  it('ninguna ventana supera 90vw × 90vh (1229 × 691 px)', () => {
    expect(altoMaximo(768)).toBe(691);
    for (const s of TAMANOS) {
      expect(anchoEfectivo(s, 1366)).toBeLessThanOrEqual(1229);
      expect(clasePanel(s)).toContain('max-h-[90vh]');
      expect(clasePanel(s)).toContain('w-[90vw]');
    }
  });
  it('cuatro tamaños: sm 480, md 760, lg 1000, xl 1240', () => {
    expect(ANCHO_MAX_PX).toEqual({ sm: 480, md: 760, lg: 1000, xl: 1240 });
  });
});

describe('ventanas heredadas con la leyenda "ESC para cerrar"', () => {
  it('toda ventana que la muestra atiende Esc de verdad (usePilaEscape, Modal o su propio manejador)', () => {
    const mentirosas = Object.entries(leerFuentes((rel) => /\.tsx$/.test(rel) && !/\.spec\.tsx$/.test(rel)))
      .filter(([, t]) => t.includes('ESC para cerrar'))
      .filter(([, t]) => !/usePilaEscape\(|<Modal\b|<ModalPOS\b|['"]Escape['"]/.test(t))
      .map(([rel]) => rel);
    expect(mentirosas, 'Muestran "ESC para cerrar" pero no cierran con Esc').toEqual([]);
  });
});
