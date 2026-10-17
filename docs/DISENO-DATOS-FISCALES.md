# Diseño: pantalla "Datos fiscales" del ERP

Estado: **solo diseño, nada implementado.** Complementa `backend/DISENO-CFDI-40.md` (F0). Fecha: 2026-10-17.
Lo ya existente: tablas `fiscal_emisores`, `fiscal_sucursales`, `fiscal_productos` y `receptores_fiscales` creadas en producción (vacías) y los endpoints `/facturacion/*` (ADMIN y GERENTE). Todo lo fiscal marcado **[VALIDAR]** sigue sujeto al contador.

## 0. Reglas de la pantalla (las tres que pediste, hechas medibles)

| Regla | Cómo se cumple | Cómo se comprueba |
|---|---|---|
| **Horizontal, sin desborde a 1366×768** | Ninguna vista requiere scroll de la página ni scroll horizontal. Las listas se **paginan** (no hacen scroll infinito) y el formulario va en columnas junto a la lista (lista 8/12 · detalle 4/12), no debajo. | Captura a 1366×768 de cada pestaña; `document.scrollingElement.scrollHeight <= innerHeight` y ningún elemento con `scrollWidth > clientWidth`. Misma prueba que las ventanas de caja. |
| **Teclado primero** | Todo se hace sin mouse; foco inicial siempre en el primer campo útil; orden de Tab = orden visual; atajos con leyenda visible (misma convención de `ModalPOS`: Esc cancela, F4 guarda, F2 nuevo). | Spec de teclado por pestaña: recorrer con Tab sin salir, guardar con F4, cancelar con Esc, foco devuelto al cerrar. |
| **Nombres, no ids** | Ningún UUID aparece en pantalla, en selectores ni en errores. Se muestra empresa (nombre comercial), sucursal (nombre), producto (nombre + categoría). Los ids viajan solo en la petición. | Revisión de capturas + spec que falla si un texto visible coincide con un UUID. |

Presupuesto vertical a 1366×768 (px): barra superior del ERP 56 · título 40 · pestañas 40 · barra de herramientas 48 · **zona de trabajo 520** · leyenda de atajos 32 · márgenes 32 = 768. La zona de trabajo cabe: encabezado de tabla 32 + **15 filas de 32** = 512.

## 1. Dónde vive y quién entra

- Ruta `Configuración → Datos fiscales` (`/settings/fiscal`). Visible solo para **ADMIN y GERENTE** (igual que el backend; el menú no lo muestra a otros roles y la ruta responde 403 si se teclea).
- Una sola pantalla con **4 pestañas**: `1 Emisor` · `2 Sucursales` · `3 Productos` · `4 Receptores`. Se cambia con **Alt+1…4** o con ← → sobre la lista de pestañas.
- Arriba, a la derecha, un indicador de **estado de preparación** por empresa: "Listo para facturar" / "Faltan 3 pasos" (ver §7). Solo informa; en F0 no hay timbrado.
- Aviso permanente, discreto: *"Los datos deben coincidir con tu Constancia de Situación Fiscal. Confírmalos con tu contador."* **[VALIDAR]**

## 2. Pestaña 1 — Emisor (por empresa)

Selector de empresa arriba a la izquierda (por **nombre comercial**); si el negocio tiene una sola empresa, no aparece y el título la nombra.

```
┌ Empresa: [Cafetería Centro ▾]                         Estado: ● Datos completos ──┐
│ RFC            [ EKU9003173C9      ]  ✔ Persona moral, formato y dígito correctos   │
│ Nombre fiscal  [ ESCUELA KEMPER URGATE                                  ]           │
│                 Tal como aparece en tu constancia, SIN "S.A. de C.V." [VALIDAR]    │
│ Régimen fiscal [ 601 · General de Ley Personas Morales ▾ ]                          │
│ Serie          [ A    ]   Siguiente folio  [ 1 ] (solo lectura)                     │
│ ☐ Facturación activa  (se habilita solo cuando el estado esté completo; sin efecto │
│    en F0)                                                                           │
└────────────────────────────────────────────────────────────────────── F4 Guardar ┘
```

- Campos: RFC, nombre fiscal, régimen (lista con **número y nombre**), serie, folio (solo lectura: lo controla el sistema), activar.
- El RFC se escribe en mayúsculas automáticamente; los espacios se recortan al salir del campo.
- El régimen es una lista con búsqueda por teclado (escribir "601" o "general"). Solo ofrece regímenes aplicables al tipo de RFC detectado (moral vs. física) **[VALIDAR]**.
- La casilla "Facturación activa" queda **deshabilitada con el motivo a la vista** hasta que el estado esté completo.
- Guardar con **F4**; Esc descarta cambios (pide confirmación solo si hay cambios sin guardar).

## 3. Pestaña 2 — Sucursales (código postal de expedición)

Tabla de una columna por dato, **sin modal**: se edita en la propia fila.

| Empresa | Sucursal | Código postal de expedición | Estado |
|---|---|---|---|
| Cafetería Centro | Matriz | 06600 | ● Completo |
| Cafetería Centro | Sucursal Norte | — | ○ Falta CP |

- ↑ ↓ cambia de fila, **Enter** o **F2** edita el CP, Enter confirma y baja a la siguiente fila sin CP, Esc cancela la celda.
- Validación en vivo: solo 5 dígitos; se rechaza escribir letras. El CP debe existir en el catálogo del SAT (c_CodigoPostal) — **no está cargado en F0**, por lo que se valida solo el formato y la lista queda marcada "se confirmará con el catálogo SAT".
- Atajo **F5 "Copiar a todas"**: aplica el CP de la fila actual a las sucursales vacías de esa empresa (con confirmación; es lo habitual cuando todas están en la misma ciudad).

## 4. Pestaña 3 — Productos (claves SAT)

La pestaña más grande: el catálogo puede tener cientos de productos. Diseño de **lista + panel**, con trabajo por lote.

```
┌ Buscar [ café…           ]  Categoría [Todas ▾]  Mostrar [Pendientes ▾]    Sugerir por giro (F6) ┐
│ ┌ Producto ────────────┬ Categoría ──┬ IVA ─┬ Clave SAT ─┬ Unidad ─┬ Obj. ─┬ Estado ─┐ ┌ Detalle ┐│
│ │ Café americano       │ Bebidas     │ 16 % │ 90101501   │ H87 Pza │ 02    │ ●       │ │ Clave   ││
│ │ Baguette             │ Panadería   │ 0 %  │ —          │ —       │ —     │ ○       │ │ Unidad  ││
│ │ … (15 filas por página)                                                                │ │ Objeto  ││
│ └──────────────────────────────────────────────────────────────────── pág 1/12 · AvPág ──┘ └─────────┘│
```

- Columnas: nombre del producto, **categoría por nombre**, IVA (viene del producto, solo lectura aquí; se cambia donde ya se cambia), clave de producto/servicio, unidad (clave + nombre), objeto de impuesto, estado (● completo · ○ falta).
- Filtros por teclado: **/** o **F3** enfoca la búsqueda; el filtro "Mostrar" tiene *Todos · Pendientes · Completos*; por defecto **Pendientes** (es el trabajo real).
- **Panel de detalle (derecha, 4/12):** clave de 8 dígitos (con 8 dígitos exactos), unidad (lista de las comunes con nombre; otras claves válidas se aceptan escribiéndolas), nombre de la unidad en el comprobante (opcional), objeto de impuesto con texto ("02 · Sí objeto de impuesto"). **F4 guarda y pasa al siguiente producto pendiente**; Esc vuelve a la lista.
- **Sugerencias por giro (F6):** ver §4.1.
- **Selección múltiple:** Espacio marca filas, **F7 "Aplicar a las marcadas"** copia clave/unidad/objeto del producto actual a las marcadas (p. ej. todas las bebidas). Siempre muestra "Se cambiarán N productos" antes de confirmar.
- **Objeto de impuesto** se propone por la tasa del producto (16 %, 8 %, 0 % → `02`; exento → `02` con traslado exento; sin IVA → `01`) **[VALIDAR]**; el usuario puede cambiarlo.
- Los servicios (`esServicio`) proponen unidad `E48`; el resto, `H87`.

### 4.1 Sugerencias por giro

El giro sale del negocio (restaurante, retail, gimnasio, médico, genérico). Al pulsar F6 se abre un panel con **una sugerencia por categoría** del propio negocio (por nombre), que el usuario acepta, edita o ignora con teclado (Enter acepta, Tab salta). Nada se guarda sin aceptarlo.

| Giro | Qué se sugiere | Unidad | Objeto de impuesto |
|---|---|---|---|
| Restaurante | Alimentos y bebidas preparadas; bebidas envasadas | `H87` pieza (o `E48` si el consumo es servicio) | `02` |
| Retail | Por categoría del catálogo; productos a granel por peso/volumen | `H87`, `KGM`, `LTR` | `02` |
| Gimnasio | Membresías y clases | `E48` servicio (`MON` mes si se factura por periodo) | `02` |
| Genérico / médico | Sin sugerencia automática; solo unidad por defecto | `H87` / `E48` | `02` |

> **Importante:** las **claves de producto/servicio (8 dígitos) de cada giro no se inventan aquí.** El catálogo c_ClaveProdServ (~50 mil filas) **no está cargado** y su correcta elección es una decisión fiscal. El plan es que el contador confirme una lista corta por giro (decisión D-12), que se guarda como dato de configuración y no como código. Hasta entonces la sugerencia propone unidad y objeto de impuesto, y deja la clave vacía con la leyenda "elige con tu contador".

## 5. Pestaña 4 — Receptores

Lista de clientes fiscales del negocio (reutilizable por caja, mesas, socios y autofactura).

- Tabla: **Nombre fiscal · RFC · CP · Régimen (nombre) · Uso de CFDI (nombre) · Correo · Estado** (`● Validado con el SAT` / `○ Sin validar con el SAT`). 15 filas por página.
- **F2 nuevo**, **Enter** edita, **Supr** elimina (con confirmación). Búsqueda con **/** por nombre o RFC.
- El formulario va en el panel derecho (no en modal), con el orden: RFC → nombre fiscal → CP → régimen → uso de CFDI → correo.
- El RFC genérico nacional (`XAXX010101000`) y el extranjero (`XEXX010101000`) se reconocen y rellenan su régimen (`616`) y uso (`S01`) **[VALIDAR]**; el extranjero marca "Extranjero" solo.
- Si ya existe el mismo RFC con el mismo CP: aviso en la propia pantalla con el nombre del receptor existente y atajo para abrirlo ("Ya está registrado: Juan Pérez · Enter para verlo").
- Hasta que exista PAC, el estado es siempre "Sin validar con el SAT". Cambiar RFC, nombre, CP o régimen borra una validación previa (ya lo hace el backend).

## 6. Validación en vivo del RFC

| Capa | Qué comprueba | Cuándo | Disponible en F0 |
|---|---|---|---|
| **Local, en el navegador** | Largo (12/13), estructura, fecha válida dentro del RFC, **dígito verificador**, genérico nacional/extranjero | Mientras se escribe, con retraso de 250 ms; sin red | Sí (misma regla que el backend; se copia y se prueba contra los mismos RFC de prueba del SAT) |
| **Local, en el servidor** | Lo mismo, como autoridad al guardar (`GET /facturacion/validar-rfc` y el propio guardado) | Al salir del campo y al guardar | Sí |
| **SAT vía PAC** | Que el RFC exista, que el nombre fiscal, el CP y el régimen coincidan | Al guardar un receptor/emisor; botón "Validar con el SAT" | **No**, llega con el primer adaptador real |

Mensajes (siempre en español, junto al campo, nunca solo en color; icono + texto; el campo tiene `aria-describedby`):
`✔ Persona moral, RFC válido` · `✔ Persona física, RFC válido` · `⚠ RFC genérico: público en general` · `✖ El dígito verificador no coincide (revisa la última letra o número)` · `✖ La fecha dentro del RFC no es válida` · `… Faltan 2 caracteres`.
Un RFC con formato correcto pero **no confirmado con el SAT** no se presenta como "verificado": el texto dice "formato válido", no "existe".

## 7. Estado de preparación ("¿ya puedo facturar?")

Lista de verificación visible arriba, por **nombre** de empresa:

1. Emisor completo (RFC, nombre fiscal, régimen) · 2. Todas las sucursales con CP · 3. Productos con claves (muestra "42 de 60") · 4. (Futuro, F2) CSD cargado · 5. (Futuro) proveedor de timbrado conectado.

En F0 los pasos 4 y 5 aparecen en gris como "Próximamente". Cada paso es un enlace que lleva a la pestaña correspondiente con el primer pendiente seleccionado.

## 8. Lo que falta en el backend para construirla (sin cambiar tablas)

Los endpoints actuales son de **un registro por id**. Para mostrar nombres y listas hacen falta lecturas nuevas, todas acotadas al tenant del token y sin migración:

| Endpoint nuevo | Devuelve |
|---|---|
| `GET /facturacion/resumen` | Por empresa: nombre comercial, estado del emisor, sucursales con/sin CP, productos con/sin claves (los conteos del §7). |
| `GET /facturacion/sucursales` | Empresa (nombre), sucursal (nombre), CP o nulo. |
| `GET /facturacion/productos?q&categoria&estado&page` | Producto (nombre), categoría (nombre), IVA, claves o nulo, total para paginar (15 por página). |
| `PUT /facturacion/productos/lote` | Aplica claves a varios productos (máx. 200), cada uno verificado contra el tenant; devuelve cuántos se cambiaron. |
| `GET /facturacion/sugerencias` | Unidad y objeto de impuesto propuestos por categoría según el giro del negocio (claves SAT: solo las que el contador haya confirmado). |
| `GET /facturacion/receptores` (ya existe) | Se amplía con el nombre del régimen y del uso de CFDI. |

El módulo de **datos del frontend** se apoya en `GET /facturacion/catalogos` (ya existe) para mostrar nombres de régimen, uso de CFDI y objeto de impuesto.

## 9. Pruebas previstas

- **Teclado:** Tab sin escape, F2/F4/F5/F6/F7/Esc/Alt+1…4 en cada pestaña, foco devuelto, Enter avanza en la tabla de sucursales.
- **1366×768:** captura de las cuatro pestañas con datos de 15+ filas; verificación automática de que no hay scroll de página ni horizontal.
- **Nombres:** ninguna cadena visible con forma de UUID.
- **RFC:** los mismos casos del backend (válidos, dígito incorrecto, fecha imposible, genérico) en el navegador, más "el servidor tiene la última palabra".
- **Roles:** CAJERO/MESERO no ven la entrada ni acceden por URL.
- **Aislamiento:** un negocio no ve empresas, sucursales, productos ni receptores de otro (ya cubierto en backend; el frontend no cachea entre sesiones).
- **Accesibilidad:** contraste AA de estados (no solo color: icono + texto) y etiquetas de campo asociadas.

## 10. Fases de construcción sugeridas

| Fase | Contenido | Tamaño |
|---|---|---|
| A | Endpoints de lectura del §8 + specs de tenant | S |
| B | Pestañas Emisor y Sucursales + resumen de preparación | S |
| C | Pestaña Receptores + validación RFC en vivo | M |
| D | Pestaña Productos: lista, panel, lote, sugerencias | M |
| E | Pruebas de teclado y 1366×768 | S |

## 11. Decisiones que necesito de ti

| # | Decisión | Mi recomendación |
|---|---|---|
| P-01 | ¿La pantalla va dentro de Configuración (recomendado) o como entrada propia "Facturación" en el menú? | Dentro de Configuración ahora; entrada propia cuando exista emisión de facturas. |
| P-02 | ¿Quién puede editar: solo ADMIN, o también GERENTE (como en el backend)? | ADMIN y GERENTE, como el backend; las claves SAT las suele capturar quien lleva el catálogo. |
| P-03 | ¿Se permite activar "Facturación activa" antes de tener CSD y PAC? | No: se habilita solo con los pasos 1–3 completos y no hace nada hasta F2. |
| P-04 | ¿Quién entrega la lista corta de claves SAT por giro? | Tu contador, antes de la fase D (D-12). |
