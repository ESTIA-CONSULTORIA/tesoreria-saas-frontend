import { describe, expect, it } from "vitest";
import { PIN_MAX, puedeEnviar, puntosVisibles, siguientePin } from "./pinEjecutivo";

describe("teclado del PIN ejecutivo", () => {
  it("acumula dígitos, borra y respeta el máximo de 12", () => {
    let pin = "";
    for (const k of "123456") pin = siguientePin(pin, k);
    expect(pin).toBe("123456");
    expect(siguientePin(pin, "del")).toBe("12345");
    expect(siguientePin("", "del")).toBe("");
    let largo = "";
    for (let i = 0; i < 20; i++) largo = siguientePin(largo, "7");
    expect(largo).toHaveLength(PIN_MAX);
  });
  it("ignora teclas que no son dígitos", () => {
    expect(siguientePin("12", "a")).toBe("12");
    expect(siguientePin("12", "")).toBe("12");
  });
  it("llegar a 4 dígitos NO envía solo: solo «Entrar» envía, desde 4", () => {
    expect(puedeEnviar("123")).toBe(false);
    expect(puedeEnviar("1234")).toBe(true); // PIN antiguo de 4 dígitos
    expect(puedeEnviar("123456")).toBe(true);
    expect(puedeEnviar("")).toBe(false);
  });
  it("dibuja al menos 6 puntos y crece con el PIN", () => {
    expect(puntosVisibles(0)).toBe(6);
    expect(puntosVisibles(6)).toBe(6);
    expect(puntosVisibles(8)).toBe(8);
    expect(puntosVisibles(30)).toBe(PIN_MAX);
  });
});
