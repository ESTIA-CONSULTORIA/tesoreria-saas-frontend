import { describe, it, expect } from "vitest";
import { negocioParaAlta, errorNegocioFaltante, etiquetaSucursal } from "./altaUsuario";

describe("alta de usuario", () => {
  it("SOPORTE con negocio elegido en el encabezado lo manda", () => {
    expect(negocioParaAlta(true, "", "", "t-1")).toBe("t-1");
  });
  it("el campo del formulario manda sobre el filtro y el encabezado", () => {
    expect(negocioParaAlta(true, "t-form", "t-filtro", "t-enc")).toBe("t-form");
    expect(negocioParaAlta(true, "", "t-filtro", "t-enc")).toBe("t-filtro");
  });
  it("un rol que no es SOPORTE nunca manda negocio (lo toma el servidor de su sesión)", () => {
    expect(negocioParaAlta(false, "t-x", "t-y", "t-z")).toBe("");
    expect(errorNegocioFaltante(false, "")).toBeNull();
  });
  it("SOPORTE sin negocio recibe un mensaje claro que apunta a un campo visible", () => {
    expect(errorNegocioFaltante(true, "")).toMatch(/Elige el negocio/);
    expect(errorNegocioFaltante(true, "t-1")).toBeNull();
  });
  it("las sucursales con el mismo nombre se distinguen por empresa", () => {
    const emp = [{ id: "c1", tradeName: "Alfa" }, { id: "c2", tradeName: "Beta" }];
    expect(etiquetaSucursal({ id: "b1", name: "Matriz", companyId: "c1" }, emp)).toBe("Alfa · Matriz");
    expect(etiquetaSucursal({ id: "b2", name: "Matriz", companyId: "c2" }, emp)).toBe("Beta · Matriz");
    expect(etiquetaSucursal({ id: "b3", name: "Norte" }, emp)).toBe("Norte");
  });
});
