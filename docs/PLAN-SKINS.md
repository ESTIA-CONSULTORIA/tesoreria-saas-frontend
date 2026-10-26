# Plan: skins del ERP/POS (ESTIA, claro, oscuro, alto contraste, marca del negocio)

Estado: **solo diseño y plan.** No se implementó nada.
Medición de contraste: calculada el 2026-10-15 con la fórmula WCAG 2.x (luminancia relativa) sobre las paletas de la sección 3.

## 1. Estado actual del estilo (verificado en el repo)

| Hallazgo | Evidencia |
|---|---|
| **El tema es un solo aspecto oscuro, impuesto a la fuerza.** | `src/index.css` (247 líneas): fondo `#0A0A0A` con `!important` en `body, #root`, y más de 60 reglas que **reescriben clases de Tailwind** (`.bg-slate-800 → #161616`, `.text-white → #F5F5F5`, `.bg-blue-600 → #2D2D2D`…) con `!important`. |
| **La paleta vive duplicada** en tres lugares sin relación. | `index.css` (hex sueltos), `src/styles/executive-graphite.ts` (objeto de colores del módulo ejecutivo) y `useBrandingStore` (acento `#8fafd4`, `splashBg #0f1117`). |
| **"Claro/Oscuro" existe en pantalla pero no hace nada.** | `AppearancePage` guarda `theme: 'dark' \| 'light'` en `tenant_setting.theme`; **ningún componente lo lee** (no hay consumidores de `theme === 'light'`), y el CSS fuerza oscuro. `useThemeStore.darkMode` no se usa. |
| **Las variables CSS se escriben pero no se leen.** | `App.tsx` y `SettingsPage` ponen `--color-primary`, `--color-secondary`, `--color-accent`, `--font-family`, `--sidebar-bg`…; `var(--color-*)` tiene **0 usos** en el código (los `var(--…)` que sí existen son de otro módulo: `--basketball-*`). |
| **El color está regado por todo el código.** | 104 archivos `.tsx`; **2,177** usos de clases `slate/gray/zinc`; **2,158** colores hex en línea; **2,105** `style={{…}}`; 763 `text-white`/`bg-white`. Solo 2 usos de `dark:`/`prefers-color-scheme`. |
| **Tailwind sin tema propio.** | `tailwind.config.js` con `theme.extend = {}`: no hay tokens. |
| **Ya hay personalización por negocio (parcial).** | `tenant_setting`: `primaryColor`, `secondaryColor`, `accentColor`, `fontFamily`, `sidebar*`, `customCSS` (inyectado tal cual en `<style>`), `theme`, `logoUrl`, `backgroundImage`. |
| **Hay colores semánticos que hoy no pasan contraste.** | En ESTIA actual: éxito `#3B7A57` = **3.54:1**, error `#9B3A3A` = **2.64:1**, aviso `#8A6A3A` = **3.62:1** sobre la tarjeta `#161616` (mínimo de texto: 4.5:1). Bordes `#2D2D2D` = **1.31:1**. |
| **Aislamientos conocidos.** | `#exec-root` (módulo ejecutivo) neutraliza los overrides globales; el recibo imprime con `@media print`; el PWA fija `theme_color #050B1A` en el manifest. |

**Conclusión:** no se puede "agregar un selector de skin" sin antes **tokenizar**; hoy cambiar de skin exigiría tocar miles de sitios. La estrategia de este plan es una capa de compatibilidad que convierte los overrides actuales en variables, para que las skins funcionen pronto sin reescribir todo de una vez.

## 2. Principios

1. **Tokens semánticos**, no colores: `surface`, `text`, `accent`, `danger`… nunca `slate-800` en pantallas nuevas.
2. **Una sola fuente**: `src/core/theme/skins.ts` define cada skin; el CSS lo genera de ahí.
3. **Contraste validado por prueba automática**: una skin que no pasa no se puede publicar ni guardar.
4. **Sin parpadeo**: la skin se aplica antes de que React pinte.
5. **Cambiar de skin no cambia layout ni lógica.** Solo color, borde, sombra y (en alto contraste) grosor de foco.
6. **El módulo ejecutivo, el recibo impreso y el PDF** conservan su propia presentación (impresión siempre clara).

## 3. Tokens y skins

### 3.1 Tokens (variables CSS, canal RGB para permitir opacidad en Tailwind)

| Token | Uso |
|---|---|
| `--bg` | Fondo de página |
| `--surface-1` / `--surface-2` / `--surface-3` | Tarjetas, paneles, elementos elevados |
| `--border` | Separadores decorativos |
| `--border-field` | Borde de **controles** (inputs, selects, botones secundarios): debe ser ≥ 3:1 |
| `--text-1` / `--text-2` / `--text-3` | Principal / secundario / terciario |
| `--accent` / `--on-accent` | Acción primaria y el texto sobre ella |
| `--ok` / `--danger` / `--warn` / `--info` | Estados (nunca solo color: siempre con ícono o texto) |
| `--focus` | Anillo de foco (grosor 2 px; 3 px en alto contraste) |
| `--overlay` | Fondo de ventanas modales |
| `--radius`, `--font` | Esquinas y tipografía (ya existen como `--btn-radius` y `--font-family`) |

Tailwind: `theme.extend.colors` mapea `bg`, `surface`, `border`, `text`, `accent`, `ok`, `danger`, `warn` a `rgb(var(--token) / <alpha-value>)`. Los componentes nuevos usan `bg-surface-1 text-text-1 border-border`.

### 3.2 Paletas propuestas y su contraste medido

Mínimos aplicados: texto normal **4.5:1** (AA) · texto grande y componentes de interfaz **3:1** · alto contraste apunta a **7:1** (AAA).
Los valores de *estado* y *borde de campo* de ESTIA, Claro y Oscuro están **ya corregidos** respecto a los que hoy fallan.

| Token | ESTIA (corregida) | Claro | Oscuro | Alto contraste |
|---|---|---|---|---|
| `--bg` | `#0A0A0A` | `#F5F6F8` | `#0F1117` | `#000000` |
| `--surface-1` | `#161616` | `#FFFFFF` | `#171A22` | `#000000` |
| `--surface-2` | `#222222` | `#EEF0F3` | `#1F232D` | `#0D0D0D` |
| `--border` | `#2D2D2D` | `#D0D5DD` | `#2B3040` | `#FFFFFF` |
| `--border-field` | `#737373` | `#7C8798` | `#6B7388` | `#FFFFFF` |
| `--text-1` | `#F5F5F5` | `#101828` | `#E6E8EE` | `#FFFFFF` |
| `--text-2` | `#BDBDBD` | `#475467` | `#B4BAC8` | `#FFFFFF` |
| `--text-3` | `#9A9A9A` | `#667085` | `#8D95A6` | `#E0E0E0` |
| `--accent` | `#8FAFD4` | `#1D4ED8` | `#6EA8FE` | `#FFD400` |
| `--on-accent` | `#0A0A0A` | `#FFFFFF` | `#0F1117` | `#000000` |
| `--ok` | `#4CAF7A` | `#067647` | `#3FB950` | `#00E676` |
| `--danger` | `#E5736F` | `#B42318` | `#F87171` | `#FF5252` |
| `--warn` | `#D9A441` | `#B54708` | `#FBBF24` | `#FFD400` |

Contraste medido (sobre `--surface-1`, salvo donde se indica):

| Par | ESTIA | Claro | Oscuro | Alto contraste |
|---|---|---|---|---|
| Texto principal / `--bg` | 18.16 AAA | 16.41 AAA | 15.40 AAA | 21.00 AAA |
| Texto secundario | 9.63 AAA | 7.69 AAA | 8.94 AAA | 21.00 AAA |
| Texto terciario | 6.43 AA | 4.97 AA | 5.78 AA | 15.91 AAA |
| Acento como control (3:1) | 7.97 | 6.70 | 7.20 | 14.67 |
| Texto sobre acento | 8.72 AAA | 6.70 AA | 7.81 AAA | 14.67 AAA |
| Éxito | 6.65 AA *(antes 3.54 ✘)* | 5.69 AA | 6.85 AA | 12.58 AAA |
| Error | 6.04 AA *(antes 2.64 ✘)* | 6.57 AA | 6.29 AA | 6.58 AA |
| Aviso | 8.05 AAA *(antes 3.62 ✘)* | 5.43 AA | 10.42 AAA | 14.67 AAA |
| Borde de campo (3:1) | 3.82 | 3.64 | 3.67 | 21.00 |

Notas: `--border` decorativo (1.3–1.6:1) no se exige por WCAG; solo `--border-field` y el foco. El rojo de alto contraste queda en 6.58:1 (AA) porque `#FF5252` es el máximo legible sin pasar a rosa; aceptable o cambiar a `#FF6E6E` si se exige AAA estricto.

### 3.3 Skin "Marca del negocio"

El negocio elige **un acento** (hoy `accentColor`); el sistema **deriva** el resto sobre la base Oscuro o Claro que el negocio elija. El acento libre es el único token que el usuario controla; todo lo demás se calcula:

1. `--accent` = el color elegido, **ajustado** en luminosidad (conservando tono) hasta tener ≥ 3:1 contra `--surface-1` de la base elegida.
2. `--on-accent` = blanco o negro, el que dé más contraste; si ninguno llega a 4.5:1, se oscurece/aclara el acento hasta que sí.
3. Estados (`ok/danger/warn`) **no** se derivan de la marca: se quedan los de la base, para no confundir "error" con el color corporativo.
4. Se muestra la vista previa con el valor ajustado y un aviso: "Ajustamos tu color para que se lea bien".

Ejemplos medidos del problema real (acento / sobre blanco / sobre oscuro `#171A22` / mejor texto encima):

| Acento | vs blanco | vs oscuro | Texto blanco | Texto negro |
|---|---|---|---|---|
| `#FFD400` | 1.43 ✘ | 12.15 | 1.43 | 14.67 |
| `#E11D48` | 4.70 | 3.70 | 4.70 | 4.47 |
| `#16A34A` | 3.30 | 5.28 | 3.30 | 6.37 |
| `#0EA5E9` | 2.77 ✘ | 6.28 | 2.77 | 7.58 |
| `#7C3AED` | 5.70 | 3.05 | 5.70 | 3.69 |
| `#F97316` | 2.80 ✘ | 6.21 | 2.80 | 7.49 |
| `#C0C0C0` | 1.82 ✘ | 9.56 | 1.82 | 11.54 |

Es decir, varios colores de marca **muy comunes** no son usables tal cual sobre blanco: el ajuste automático es parte del producto, no un extra.

## 4. Dónde se guarda la elección

Jerarquía (gana el más específico):

| Nivel | Qué es | Dónde |
|---|---|---|
| 1. **Dispositivo** | Caja/kiosco que debe verse siempre igual (p. ej. alto contraste en una terminal) | `localStorage` (`ui_skin_device`) |
| 2. **Usuario** | Preferencia personal | Perfil del usuario (JSON `uiPrefs`) y copia en `localStorage` (`ui_skin`) |
| 3. **Negocio** | Skin por defecto + acento de marca | `tenant_setting.theme` (hoy `'dark'\|'light'`; pasa a `'estia'\|'claro'\|'oscuro'\|'contraste'\|'marca'`) y `accentColor`, que ya existen |
| 4. **Sistema** | Sin elección: `prefers-contrast: more` → alto contraste; si no, ESTIA | `matchMedia` |

SQL de referencia (**no ejecutar** sin orden explícita):

```sql
-- El negocio ya tiene "theme" y "accentColor". Solo se amplía el significado de "theme" (sin DDL),
-- y se añade la preferencia por usuario:
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "uiPrefs" jsonb NOT NULL DEFAULT '{}'::jsonb;
-- Migración de datos de los valores actuales:
--   'dark'  -> 'estia'      'light' -> 'claro'
UPDATE tenant_setting SET theme = 'estia' WHERE theme = 'dark' OR theme IS NULL;
UPDATE tenant_setting SET theme = 'claro' WHERE theme = 'light';
```

**Sin parpadeo:** un script en `index.html` (antes del bundle) lee `ui_skin_device` → `ui_skin` → último valor del negocio en `localStorage` y pone `data-skin="…"` en `<html>`; el CSS de cada skin cuelga de `[data-skin="…"]`. Después de cargar sesión se reconcilia con el servidor. También actualiza `<meta name="theme-color">` (el manifest PWA queda fijo; es una limitación conocida).

El acceso para cambiar la skin de **todo el negocio** es de ADMIN; el cambio personal es de cualquier usuario; el de dispositivo requiere sesión de gerente.

## 5. Validación de contraste

1. **Biblioteca pura** `contraste.ts`: `luminancia`, `razon(a,b)`, `ajustarAcento(color, fondo, minimo)`, `colorSobre(color)`; con specs.
2. **Prueba que rompe el build**: para cada skin y cada par de la tabla 3.2, `razon ≥ mínimo`. Una paleta nueva que falle no entra.
3. **En tiempo de ejecución** (skin "marca"): el acento se ajusta con `ajustarAcento` antes de aplicarse; la pantalla de Apariencia muestra la razón resultante y desactiva "Guardar" si no se alcanza ni con ajuste.
4. **Estados nunca solo por color**: regla de revisión (ícono o texto además del color) y checklist visual.
5. **Revisión visual por skin**: capturas automatizadas de 8 pantallas clave × 5 skins (Terminal, Cobro, Apertura, Corte, Mesas, Listado de productos, Dashboard, formulario largo) a 1366×768, con el mismo arnés de Chrome headless ya usado para las ventanas de caja.
6. **Auditoría de accesibilidad** con axe-core en esas mismas pantallas (solo reglas de color y foco).
7. **Foco visible**: 2 px (3 px en alto contraste) con contraste ≥ 3:1 contra el elemento y su fondo; compatible con los atajos de teclado ya implementados.

## 6. Cómo se migra sin reescribir todo

**Capa de compatibilidad (rápida, antes de tocar pantallas):** las ~60 reglas de `index.css` que hoy mandan hex fijos pasan a leer variables (`.bg-slate-800 { background-color: rgb(var(--surface-1)) !important }`, `.text-slate-400 { color: rgb(var(--text-3)) !important }`…). Con eso, **cambiar de skin ya recolorea la mayor parte de la interfaz** que usa clases de Tailwind, porque la mayoría de los 2,177 usos caen en esas clases ya sobreescritas.

**Lo que la capa no cubre:** los 2,158 hex y 2,105 `style={{}}` en línea, gráficas, imágenes con fondo y el módulo ejecutivo. Se migran por pantalla con un codemod que mapea hex conocidos → token (lista cerrada, revisada), empezando por POS y ventanas de caja.

**Reglas durante la transición:** no se aceptan colores nuevos fuera de tokens (regla de lint); `customCSS` del negocio se sigue inyectando pero **después** de la skin y solo dentro de `[data-business-css]`, para que un CSS libre no rompa el contraste validado.

## 7. Fases y tamaño

| Fase | Contenido | Tamaño |
|---|---|---|
| **F0 — Fundamentos** | `skins.ts`, `contraste.ts` + specs, prueba que rompe el build, tokens en Tailwind (sin cambiar pantallas) | **S** |
| **F1 — Capa de compatibilidad + selector** | `index.css` sobre variables, `data-skin` sin parpadeo, skins ESTIA/Claro/Oscuro, ajuste de los estados que hoy fallan, pantalla de Apariencia con vista previa | **M** |
| **F2 — Shell y ventanas** | Sidebar, encabezado, `ModalPOS`, formularios, tablas y botones sobre tokens (sin hex) | **M** |
| **F3 — POS y caja** | Terminal, Cobro, apertura/corte/precorte, mesas, recibo (impresión siempre clara) | **M** |
| **F4 — ERP por módulos** | Costos, compras, tesorería, RH, membresías… (codemod sobre ~104 archivos, revisión por módulo) | **L** |
| **F5 — Alto contraste y foco** | Skin AAA, anillo de foco reforzado, `prefers-contrast`, reducción de movimiento | **S–M** |
| **F6 — Marca del negocio** | Derivación y ajuste automático del acento, vista previa, bloqueo de guardado, límites de `customCSS` | **M** |
| **F7 — Persistencia y QA** | Preferencia por usuario/dispositivo, reconciliación con el servidor, capturas × 5 skins, axe, documentación | **S–M** |
| **Total** | | **L–XL** (F0–F3 entregan el 80 % del valor) |

## 8. Riesgos

1. **`!important` en cascada.** Las reglas actuales ganan a casi todo; mientras convivan con tokens, un override mal ordenado deja pantallas con mezcla de skins. Mitigación: F1 hace que **todo** pase por variables antes de agregar skins.
2. **Hex en línea sin migrar** se quedan oscuros dentro de una skin clara (texto ilegible). Mitigación: lista de pantallas por migrar visible, y la skin Claro no se ofrece al negocio hasta cerrar F3.
3. **Gráficas y módulo ejecutivo** usan paleta propia; requieren su propia versión por skin o quedan aisladas.
4. **Contraste de la marca**: un negocio con color muy claro/neón verá su color "corregido" y puede reclamar. Mitigación: vista previa con el valor ajustado y explicación.
5. **`customCSS` libre** puede romper contraste. Mitigación: aislarlo y advertir.
6. **Impresión y PDF**: siempre claro; probar cada skin con `@media print`.
7. **Rendimiento**: variables CSS son baratas; el riesgo es el parpadeo si el script de arranque falla → valor por defecto ESTIA.
8. **Pruebas de regresión visual** requieren mantener las capturas; costo de mantenimiento a vigilar.
9. **ESTIA hoy cambia visualmente** (estados más claros): es una corrección de accesibilidad, no un rediseño, pero el negocio lo notará; avisar.

## 9. Decisiones que necesito de ti

| # | Decisión |
|---|---|
| S-01 | ¿Los colores de estado de ESTIA se corrigen para pasar AA (recomendado) aunque se vean más claros? |
| S-02 | ¿Quién cambia la skin: solo ADMIN (negocio), cada usuario, o ambos? ¿Y el dispositivo (kiosco)? |
| S-03 | ¿La skin "Marca" se apoya sobre base oscura, clara o la elige el negocio? |
| S-04 | ¿Alto contraste apunta a AAA (7:1) estricto en todos los textos, incluido el rojo? |
| S-05 | ¿El módulo ejecutivo entra en las skins o conserva su paleta propia? |
| S-06 | ¿Se mantiene `customCSS` libre para el negocio o se restringe? |
| S-07 | ¿Prioridad: salir primero con ESTIA + Oscuro + Claro (F1) o esperar a F3 para no ofrecer Claro a medias? |

## 10. Estado de la implementación (rama `feat/skins-f0-f1`)

Hecho: **F0** (`src/core/theme/skins.ts`, `contraste.ts`, `aplicarSkin.ts`; prueba `skins.spec.ts` que rompe el build si una paleta no cumple contraste; tokens en `tailwind.config.js`) y **F1** (`index.css` sobre variables, `skins.generated.css` generado con `npm run skins:css`, `data-skin` aplicado desde `index.html` sin parpadeo, skins **ESTIA** y **Oscuro**, selector en Apariencia: tema del negocio y «solo en este equipo»).
- **Claro y Alto contraste no existen todavía** (decisión S-07): no están definidos ni se ofrecen. Los valores viejos del negocio (`dark`, `light`, vacío) y cualquier desconocido se ven como ESTIA.
- Para el negocio se reutiliza `tenant_setting.theme` con los valores `estia` / `oscuro` (sin DDL). La preferencia **por usuario** (`uiPrefs`) no está: requiere el `ALTER` de la sección 4, que no se ejecutó.
- ESTIA: los textos de estado (éxito, error, aviso) ahora pasan 4.5:1 (S-01) y el borde de los campos pasa 3:1; fondos, tarjetas y botones conservan los mismos grises.
- Medido en Chrome a 1366×768 (caja: apertura de turno, terminal, cobro; Apariencia, Datos fiscales, Usuarios): sin desborde horizontal en ninguna de las dos skins.
- Pendiente (F2/F3): los colores fijos en línea de las pantallas (2,158 hex y 2,105 `style`) siguen sin migrar; con dos skins oscuras no hay texto ilegible, pero p. ej. los botones de Retiro/Precorte conservan su color propio y varios elementos de la barra superior usan transparencias fijas.

## 11. Procedimiento de oleada y estado (rama `feat/skins-ola-N`)

**Decisiones aprobadas (2026-10-25):** el usuario elige su skin y el negocio define el valor por defecto; la Vista Ejecutiva conserva su paleta; el CSS libre queda aislado; los portales (analítica móvil, empleado) quedan fuera; en el login mandan los colores por negocio (su paleta propia no sigue la skin). Claro y Alto contraste no se crean antes de terminar la ola 1; el ALTER de `uiPrefs` tampoco.

**Redes automáticas** (`src/core/theme/coloresFijos.spec.ts`): (1) tope de colores fijos por archivo con línea base (`coloresFijos.baseline.json`, `npm run colores:baseline`): solo baja; un archivo nuevo no puede traer ninguno; (2) `pantallasMigradas.ts`: cero tolerancia en cada archivo migrado.

**Cada oleada:** rama → pruebas primero → migrar (`rgb(var(--token) / a)` en estilos, clases `!bg-surface-1`… con `!important` para conservar la precedencia que hoy les da `index.css`) → `node scripts/capturas-skins.mjs --salida capturas-skins/olaN-despues` y `node scripts/capturas-comparar.mjs …antes …despues` (Chrome real, 1366×768, API simulada; en ESTIA solo pueden cambiar los textos de contraste corregidos) → axe-core (`color-contrast`, WCAG 2 AA) y recorrido de Tab idéntico (`teclado.json`) → merge → Railway en SUCCESS → login responde 401 sin credenciales.

**Tokens de cáscara** (ola 0; mismos valores que ya estaban fijos, así ESTIA y Oscuro no cambian): `veil`, `scrim`, `canvas`, `panel`, `popover`, `textSoft`, `textBright`, `accentAlt`, `chip`, `viz1–4`.

**Ola 0 (cáscara):** TopBar, Header, MainLayout, UpdatePrompt, NoContextBanner, búsqueda global, ModalPOS y reglasModal, App.tsx. ESTIA y Oscuro sin cambio visual salvo los textos de la barra superior que no llegaban a 4.5:1 (rol, «Salir», encabezados y subnavegación: de 0.28–0.45 a 0.5 de opacidad).

**Ola 1 (dashboard, Centro de Soluciones, guía de la prueba):** DashboardPage, DashboardLite, DashboardInfoModal, SolutionsCenter, PruebaWizard y `/prueba`, en cero colores fijos. Tokens añadidos: `viz5`/`viz6` (series grises de las gráficas). El login conserva su paleta propia por negocio (decisión): no se migra a tokens, solo se corrigieron sus 4 textos que no llegaban a 4.5:1. Resultado medido en Chrome (1366×768, ESTIA y Oscuro): 0 fallos de contraste AA (axe-core) en las 9 escenas; orden de Tab idéntico; sin desborde horizontal; en ESTIA solo cambian píxeles de texto corregido (opacidades 0.2–0.45 → 0.5, grises #7E7E7E → texto 3, verdes/rojos de estado como texto → `ok`/`danger`).

## 12. Claro y Alto contraste (estado)

- **Definidas** en `skins.ts` pero **en preparación**: solo ADMIN y SOPORTE las ven (`SKINS_EN_PREPARACION`, `puedeVerSkin`) hasta terminar las olas 2 a 4. La regla se aplica en el resolver, en `index.html` (antes de pintar) y en el backend (`users/ui-prefs.util.ts`, que rechaza con 403 a otros roles). Un negocio en Claro no se lo impone a un rol sin permiso, y `theme = 'light'` NO se migra a Claro.
- **Tokens nuevos**: `onSolid` (texto sobre botones de color; regla en `compatSolidos.css`, igual a `text-1` en las skins oscuras), `modal` (fondo de ventanas; igual a `surface1` en las oscuras) y `alfaTextoMin` (piso de opacidad del texto translúcido: `rgb(var(--veil) / max(0.5, var(--alfa-texto-min)))`; 0 en ESTIA/Oscuro, 0.7 en Claro, 0.75 en Alto contraste). Una veladura oscura al 50 % sobre blanco da solo 3.4:1.
- **Alto contraste**: texto y estados ≥ 7:1 (spec `skin contraste: 7:1`), foco amarillo de 3 px (`[data-skin="contraste"] :focus-visible`), medido con `color-contrast-enhanced`. `@media (prefers-contrast: more)` sube bordes y foco (3 px) en cualquier skin; no cambia de skin por sí solo.
- **Orden de preferencia**: este equipo → preferencia del usuario (`user.uiPrefs.skin`, `PUT /auth/me/ui-prefs`, devuelta en login y refresh) → negocio → ESTIA.
- **Excepción conocida**: el login conserva su paleta propia (colores por negocio); en Alto contraste 4 textos del login quedan entre 4.6 y 5.7:1 (AA sí, AAA no).
- Las pantallas aún no migradas (olas 2 a 4) conservan colores fijos y NO se ven bien en Claro: por eso la restricción de rol.

## 13. Ola 2: POS, caja, mesas, Corte Lite y notas de cocina (estado)

**Pantallas migradas (16, cero colores fijos, en `pantallasMigradas.ts`):** `pos/POSPage`, `pos/ModalesCaja`, `pos/CheckoutFast`, `pos/PosChatPanel`, `pos/VentasOfflineFallidas`, `pos/BackfillCortePage`, `pos/TableLayout`, `mesas/{PanelCuenta, MesasScreen, ConfigMesas, MeseroPage, MesasPage, mesasLogic}`, `lite/{CorteCajaLite, NotasCocinaLite}`, `settings/CorteFieldsConfig`. La línea base de colores fijos bajó de 104 a 88 archivos.

**Cómo se migró sin cambiar un píxel en ESTIA/Oscuro:** cada color fijo se cambió por un token con el MISMO valor que ya tenía en ESTIA (las clases que `index.css` ya reescribía llevan `!`, igual que antes; las que Tailwind pintaba tal cual pasaron a «tonos» exactos). Tokens nuevos: `tono*` (rojos, verdes, amarillos, ámbar, azules, morados y grises azulados de Tailwind), `st*` (estados de mesa), `papel*`/`tinta*`/`papelNavy*` (las pantallas Lite son claras de origen), `chat*`, `toggleOn`, `surfaceAlt`, `navAlt`, `onYellow`, `onStrong`. Claro y Alto contraste tienen sus propios valores; Oscuro usa los de ESTIA (salvo `onStrong`).
- **Lite**: Corte y notas de cocina son pantallas claras de tableta. Con los tokens `papel`/`tinta` siguen claras en ESTIA, Oscuro y Claro, y pasan a negro/blanco/amarillo solo en Alto contraste (la skin Oscuro no las oscurece: sería cambiar píxeles).
- **Datos, no interfaz**: el color por defecto de una categoría nueva (`#3B82F6`) se guarda en la base y vive en `pos/coloresDatos.ts` (declarado en `DEFINEN_COLORES`).
- **Estados de mesa** (`ESTADO_MESA`) ahora son `rgb(var(--st-*))` con un campo `fondo`; antes se concatenaba `color + '18'`.

**Recibo**: `window.print()` imprimía en blanco porque el CSS de impresión solo muestra `#print-area` y el recibo no lo tenía. Ahora el recibo lleva `id="print-area"` y `skins.generated.css` incluye `@media print` con los tokens de Claro, de modo que se imprime sobre papel claro con texto oscuro sea cual sea la skin.

**Procedimiento (se repite en las olas 3 y 4):** `scripts/escenas-pos.mjs` define 51 escenas (vacío, con datos, modal, error) y `scripts/capturas-skins.mjs --escenas todas --skins estia,oscuro,claro,contraste` guarda captura, axe-core, orden de Tab, atajos (`atajos.json`), desborde e impresión (`impresion.json`). `scripts/montaje.mjs` arma una hoja de contacto. Un worktree congelado en `main` produce el «antes» mientras se migra.
