import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Regresión: el modal de producto ofrecía insumos y recetas de prueba ('insumo-2', 'receta-1') que no son UUID y rompían
// GET /pos/products con 500. Ahora los selectores salen de GET /pos/products/opciones-stock (solo datos reales del negocio).
const fuente = readFileSync(resolve(__dirname, "POSPage.tsx"), "utf8");

describe("POSPage — selectores de insumo y receta del producto", () => {
  it("no trae opciones de prueba escritas a mano", () => {
    expect(fuente).not.toMatch(/value="insumo-\d+"/);
    expect(fuente).not.toMatch(/value="receta-\d+"/);
  });

  it("carga las opciones reales del servidor", () => {
    expect(fuente).toContain('/pos/products/opciones-stock');
    expect(fuente).toMatch(/opcionesStock\.insumos\.map/);
    expect(fuente).toMatch(/opcionesStock\.recetas\.map/);
  });
});
