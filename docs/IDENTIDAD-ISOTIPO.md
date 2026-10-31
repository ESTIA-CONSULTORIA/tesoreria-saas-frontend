# Skin «ESTIA Isotipo»

Estado: **implementada, en preparación** (solo la ven ADMIN y SOPORTE, igual que Claro y Alto contraste). Fase 1: **dashboard ejecutivo, POS (terminal) y ventana de cobro**. El resto de las pantallas heredan los colores de la skin y la tipografía, pero no el bisel ni las teclas hexagonales.

## Lenguaje geométrico (medido en `public/marca/isotipo-plano.svg` y `logo-estia-isotipo.png`)

| Rasgo | Medida | Cómo se usa |
|---|---|---|
| Ángulos | solo 30°, 150° y 90° | bisel de esquinas, divisores con escalón, pestañas, marcadores triangulares, rejilla de fondo |
| Proporción del hexágono | 403 × 356 (0.882, cerca de 0.866) | teclas hexagonales del POS (120 × 139 px) |
| Banda y hueco | ≈ iguales (73–75 px y 63 px en el PNG de 578 px) | ritmo del panal y de los divisores |
| Facetas | clara `#3973F9`, oscura `#004281` | cara superior y lateral de los prismas; borde superior de las piezas con bisel |
| Degradado | eje de 30°: cian `#00ABC6` → azul `#0057A6` → cobalto `#0A2BA5` | marca (`.iso-marca`), borde al pasar sobre una tecla. **Solo decorativo**: texto blanco sobre el cian da 2.75:1 |

## Qué cambia respecto a las otras skins

Además de color, la skin controla **forma, elevación, tipografía y movimiento** (`FORMAS` en `src/core/theme/skins.ts`; las demás skins llevan valores neutros y no cambian):

- `--bisel-l` / `--bisel-a`: 24 × 14 px (30°). Esquinas arriba-izquierda y abajo-derecha cortadas en vez de radio.
- `--elev-x` / `--elev-y`: desplazamiento duro a 30°, sin desenfoque.
- `--fuente-ui` (Inter) y `--fuente-num` (Montserrat, para importes grandes).
- `--mov-dur`: 160 ms.

Reglas en `src/core/theme/isotipo.css`; las clases `iso-*` (`iso-bisel`, `iso-pestana`, `iso-hex`, `iso-fondo`, `iso-marca`, …) no hacen nada en otra skin.

## Teclas hexagonales (opción)

Tema (🎨 en la barra del POS) → «Teclas hexagonales en el POS». Es una opción **de este equipo** (`localStorage.ui_pos_hex`), apagada por defecto, y solo aparece con la skin ESTIA Isotipo. Desmarcada vuelve la cuadrícula de siempre. El DOM no cambia: cada tecla sigue siendo el mismo `<button>`, así que el orden de Tab y los lectores de pantalla no cambian.

## Accesibilidad y teclado

- Foco: contorno amarillo de 3 px (`#FFD60A`, ≥ 7:1 sobre todas las superficies), rectangular. En piezas con bisel o hexágono se quita el recorte mientras tienen el foco para que el contorno se vea entero.
- Contraste: la paleta pasa los mínimos de `skins.spec.ts` (texto AA/AAA, bordes de control 3:1, estados, botones). axe-core (reglas `color-contrast`) en Chrome real a 1366×768: 0 fallos en las escenas listadas abajo.
- Borde de las teclas hexagonales: `--border-field` (≥ 3:1); el degradado solo aparece al pasar el ratón.
- Gráfica de prismas: cada prisma lleva su valor escrito y la gráfica tiene `aria-label` con los datos; el desglose va además en una tabla.
- `prefers-reduced-motion: reduce`: sin animaciones ni transiciones (regla en `isotipo.css`, comprobada en Chrome con `--movimiento reduce`: `animation-name: none`, `transition-duration: 0s`). Las animaciones solo existen dentro de `prefers-reduced-motion: no-preference`.

## Tipografía local

Inter y Montserrat (variables, subconjunto latino) salen de `src/assets/fonts/` (licencias OFL en el mismo directorio) mediante `src/core/theme/fuentes.css`. Ya no se piden a Google Fonts. Siguen en Google Fonts, sin cambio: Manrope (login, `index.html`) y las fuentes que un negocio elija en Apariencia.

## Backend

`src/users/ui-prefs.util.ts` repite la lista de skins: `isotipo` está en `SKINS_VALIDAS` y en `SKINS_EN_PREPARACION`. Hay que desplegar el backend antes que el frontend para que ADMIN/SOPORTE puedan **guardar** «Mi tema» = Isotipo; «Solo en este equipo» no necesita backend.

## Verificación

```
node scripts/capturas-skins.mjs --salida capturas-skins/isotipo --skins isotipo,estia --rol ADMIN \
  --escenas dashboard,dashboard-sin-pendientes,pos-terminal,pos-terminal-hex,pos-ticket-hex,pos-cobro,pos-recibo,pos-tema,pos-descuento,pos-abrir-turno
node scripts/capturas-skins.mjs --salida capturas-skins/isotipo-mov-reduce --skins isotipo --rol ADMIN --movimiento reduce --escenas dashboard,pos-terminal-hex
```

## Límites conocidos

- No se ha probado con un cajero real: las teclas hexagonales (120 × 139 px) y los nombres largos están por validar.
- Fase 2 pendiente: mesas, Lite, resto de pantallas del ERP y el recibo.
- El login conserva su paleta por negocio (decisión de `PLAN-SKINS.md` §11).
