# Estándar de ventanas (modales) — ESTIA ERP

Aprobado tras el inventario de 100 ventanas (informe en `Documents/estia-capturas-modales/informe.html`). Este archivo es la referencia
viva: lo que está hecho, la regla y cómo se vigila.

## 1. Reglas (todas las ventanas)

| Tema | Regla |
|---|---|
| Estructura | Encabezado, cuerpo, pie fijo. El scroll del cuerpo es red de seguridad, no diseño. |
| Tamaños | `sm` 480 · `md` 760 · `lg` 1000 · `xl` 1240 px, siempre ≤ 90vw × 90vh (a 1366×768: 1229 × 691). |
| Capa | UNA sola (`CAPA_MODAL` = 200), en un portal colgado de `<body>`, por encima de la barra superior (z-index 100). |
| Botones | Pie con `ModalFooter`: resumen a la izquierda; a la derecha secundario (Cancelar) y luego principal. El color sale del ROL (`principal`, `peligro`, `exito`, `advertencia`), no de la ventana. |
| Foco | Foco inicial en el primer campo (o `data-autofocus`); Tab atrapado dentro; al cerrar, el foco vuelve a donde estaba. |
| Teclado | Esc cierra solo la ventana de arriba (pila `usePilaEscape`); F4 confirma la acción principal; Enter en un campo pulsa el botón principal. |
| Errores | Del campo: `ErrorCampo` debajo de él. De la operación: `AlertaModal` arriba del cuerpo. La ventana NO se cierra al fallar. Nada de `alert()` ni `confirm()`: `useAviso()` / `useConfirm()`. |
| Skins | Solo tokens (`!bg-surface-1`, `text-content-1`…). Las pantallas Lite pintan sobre papel claro: `apariencia="papel"`. |

## 2. Estándar por tipo de tarea

- **Cobro** (`CobroModal`, pendiente): `xl`, 3 columnas (formas de pago · importe con teclado · resumen), total siempre visible, F2/F3/F6/F8/F4.
- **Monto / NIP**: `sm` o `md`. `CampoMoneda` con `TecladoNumerico` (7-8-9 arriba, 0 abajo, un solo glifo ⌫). NIP con `NipPad` (puntos de avance, error anunciado, teclado físico).
- **Confirmación**: `sm`, `useConfirm()`. Texto con la consecuencia concreta; si es destructiva, botón `peligro` y foco inicial en Cancelar.
- **Formulario**: `md` o `lg`, `<label>` visible por campo, error por campo, alta y edición con el mismo componente.
- **Selección**: buscador arriba y lista navegable con ↑↓, Enter y Esc (pendiente).

## 3. Componentes (src/core/components)

`Modal` (antes `ModalPOS`, que sigue exportándose con ese nombre) · `ModalFooter` · `Boton` (+ `reglasBoton.ts`) · `AlertaModal` ·
`ErrorCampo` · `ConfirmDialog` (`ConfirmProvider`, montado en `main.tsx`) con `useConfirm()` / `useAviso()` (`confirmContext.ts`) ·
`TecladoNumerico` · `NipPad` · `CampoMoneda` · `usePilaEscape` (Esc en pila). Reglas puras con spec: `reglasModal.ts`,
`reglasBoton.ts`, `reglasTecladoNumerico.ts`.

## 4. Vigilancia (specs con línea base que solo baja)

| Spec | Qué vigila | Línea base |
|---|---|---|
| `modalesPropios.spec.ts` | `fixed inset-0` / `position: fixed; inset: 0` escrito a mano fuera de `Modal` | `modalesPropios.baseline.json` |
| `dialogosNativos.spec.ts` | `alert(` y `confirm(` nativos | `dialogosNativos.baseline.json` |
| `contratoModal.spec.ts` | Contrato de `Modal` (rol, nombre accesible, Esc en pila, foco, portal y capa, tamaño a 1366×768) y que ninguna ventana muestre «ESC para cerrar» sin atender Esc | — |

Al migrar una ventana a `Modal` (o quitar un `alert`), se baja el tope con `npm run modales:baseline` (el script se niega a subirlo).
En navegador real, `scripts/capturas-skins.mjs` escribe `contrato.json` por escena y skin (rol, nombre, medidas, capa sobre la barra, foco,
scroll interno, botones del pie) además de contraste, teclado y desborde.

## 5. Avance

- **Fase 1** (esta): componentes y specs; conjunto de corte (apertura, retiro/depósito, precorte, cierre, Corte Lite: PIN, fondo inicial, monto con teclado, avisos de insumos); Esc y capa de las ventanas `Create*` y afines (16).
- **Siguiente** (no iniciado): `CobroModal` único; confirmaciones y `alert()` restantes de `POSPage`; formularios del POS y de mesas; formularios del ERP sobre `FormModal`.
