import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Terminal del POS sin productos para la sucursal del usuario: debe decirlo en vez de mostrar solo «Todos». No hay jsdom en el proyecto,
// así que se revisa el código fuente; la pantalla real se captura con scripts/capturas-skins.mjs (escena pos-terminal-vacio).
const pos = readFileSync(new URL('./POSPage.tsx', import.meta.url), 'utf8');

describe('Terminal del POS: catálogo vacío', () => {
  it('muestra «No hay productos en tu sucursal» solo cuando ya cargó y no hay ninguno', () => {
    expect(pos).toMatch(/\{productosCargados && products\.length === 0 && \(\s*<p role="status"[^>]*>No hay productos en tu sucursal<\/p>/);
  });
  it('«ya cargó» se marca al terminar el intento, con éxito o con error, para no mostrar el aviso mientras carga', () => {
    expect(pos).toMatch(/const \[productosCargados, setProductosCargados\] = useState\(false\)/);
    expect(pos).toMatch(/\} finally \{\s*setProductosCargados\(true\);/);
  });
  it('una búsqueda sin resultados NO dispara el aviso de sucursal (se basa en el catálogo, no en el filtro)', () => {
    expect(pos).not.toMatch(/filteredProducts\.length === 0 && \(\s*<p role="status"/);
  });
});
