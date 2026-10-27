import { describe, expect, it } from "vitest";
import { etiquetaAmbito, etiquetaNegocio } from "./etiquetasUsuario";

const UUID = "b96b6317-a777-4e4e-838e-794980a46b4a";

describe("etiquetasUsuario", () => {
  it("empresa y sucursal: sin id es «Todas»; con id muestra el nombre", () => {
    expect(etiquetaAmbito(null, null)).toBe("Todas");
    expect(etiquetaAmbito(undefined, undefined)).toBe("Todas");
    expect(etiquetaAmbito("Gimnasio Demo", UUID)).toBe("Gimnasio Demo");
    expect(etiquetaAmbito("  Matriz ", UUID)).toBe("Matriz");
  });

  it("nunca muestra el UUID: con id pero sin nombre dice «Sin nombre»", () => {
    for (const n of [null, undefined, "", "  "]) {
      expect(etiquetaAmbito(n, UUID)).toBe("Sin nombre");
      expect(etiquetaNegocio(n, UUID)).toBe("Sin nombre");
    }
    expect(etiquetaAmbito(null, UUID)).not.toContain(UUID);
  });

  it("negocio: sin id es «Sin negocio»", () => {
    expect(etiquetaNegocio(null, null)).toBe("Sin negocio");
    expect(etiquetaNegocio("Gimnasio Demo", UUID)).toBe("Gimnasio Demo");
  });
});
