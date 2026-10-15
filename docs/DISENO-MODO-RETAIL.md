# Diseño: modo retail del POS (lector de código de barras)

Estado: **solo diseño, nada implementado ni ejecutado.** La migración de abajo es SQL de referencia, sin correr.
Criterio rector: el POS se opera con teclado y mouse (no solo táctil) y con lector de código de barras.

## 0. Punto de partida (verificado en el código)

| Tema | Hoy |
|---|---|
| Código de barras / SKU en producto | **No existe** (ni en `Product`, ni en el formulario, ni en el CSV de importación). |
| Buscador de la Terminal | Filtra solo por `name` (`POSPage.tsx`, `includes` sobre el nombre). Un código escaneado no encuentra nada. |
| Pestaña Hardware | **Solo maquetas.** El estado vive en memoria (no se guarda ni se lee de ningún lado); "Probar conexión" es un `alert()`. No hay impresora, cajón ni lector reales. |
| Impresión | `window.print()` del navegador sobre el recibo en pantalla. Sin ESC/POS ni apertura de cajón. |
| Lector hoy | Un lector USB/Bluetooth en modo HID escribe como teclado y cierra con Enter. Si el foco está en el buscador, escribe el código como texto y el filtro por nombre no devuelve productos; el Enter no hace nada. Si el foco no está en ningún campo, las teclas se pierden (o un Enter puede pulsar el último botón con foco). |
| Buscador `readOnly` | Nace `readOnly` y se libera con `onFocus`/`onPointerDown` (`InputBusqueda`). Un `focus()` programático **sí** dispara `onFocus` y lo libera; un escaneo sin foco previo no entra. Con el cambio de teclado de esta etapa la Terminal enfoca el buscador al abrir. |

## 1. Alcance mínimo del modo retail

1. **Código de barras en producto** (`barcode`, opcional, único por negocio).
2. **Campo de escaneo con foco permanente** en la Terminal.
3. **Cantidad que suma al repetir el escaneo**: la misma lectura incrementa la línea existente.
4. **Aviso de código desconocido**: sonido y mensaje, sin tocar el ticket.
5. **Vista de lista densa**, configurable por negocio (tablas en vez de tarjetas).
6. Nada de balanzas, etiquetas, ofertas por volumen ni inventario por lote en esta fase.

## 2. Modelo de datos

SQL de referencia (**no ejecutar** sin orden explícita; DDL con revisión previa, como el índice B5):

```sql
BEGIN;
ALTER TABLE product ADD COLUMN IF NOT EXISTS "barcode" varchar(64) NULL;
-- Único por negocio y solo entre productos que tienen código (un mismo código no puede ser de dos productos).
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "UQ_product_tenant_barcode"
  ON product ("tenantId", "barcode") WHERE "barcode" IS NOT NULL AND "barcode" <> '';
COMMIT;
-- CONCURRENTLY no corre dentro de una transacción: en la práctica se ejecuta fuera del BEGIN/COMMIT.

-- Reversa:
-- DROP INDEX CONCURRENTLY IF EXISTS "UQ_product_tenant_barcode";
-- ALTER TABLE product DROP COLUMN IF EXISTS "barcode";
```

Configuración por negocio (sin migración, en `tenant_setting.posCapabilities` JSON, como `ivaTasaDefault`):
`modoRetail: boolean`, `vistaDensa: boolean`, `escaneoSumaCantidad: boolean` (por defecto `true`).

Backend (S):
- `Product.barcode` + validación (longitud 4–64, solo alfanumérico y `-`; recortar espacios y saltos de línea).
- `GET /pos/products/by-barcode/:codigo` acotado al tenant del token (404 si no existe) — o `?barcode=` en el listado.
- Importación CSV y formulario: columna `barcode`; duplicado → 400 con el nombre del otro producto.
- Specs: unicidad por tenant, mismo código en dos tenants permitido, aislamiento del lookup.

## 3. Frontend

**Campo de escaneo con foco permanente** (`ScanInput`):
- Visible en la Terminal en modo retail, enfocado al abrir turno y **re-enfocado** al cerrar cualquier ventana o tras tocar un producto.
- Distingue un lector de una persona tecleando por **velocidad entre teclas** (p. ej. < 35 ms entre caracteres y terminador Enter, longitud ≥ 4). Una persona que teclea el código y pulsa Enter también funciona: el criterio solo evita que el lector dispare búsquedas parciales.
- El Enter resuelve contra el catálogo ya cargado (consulta local por `barcode`) y, si no está, contra el endpoint; sin red y con catálogo en caché sigue funcionando (compatible con offline).
- Con una ventana abierta el escaneo **no** se enruta a la Terminal (el foco lo tiene la ventana), para no mezclar un código con un monto.

**Reglas del ticket:**
- Código conocido: agrega 1 unidad; si la línea existe, `cantidad += 1` (configurable `escaneoSumaCantidad`).
- Código desconocido: aviso visible con el código leído ("Código 750… no está en el catálogo"), tono corto, el ticket no cambia y el foco se queda en el campo. Atajo para dar de alta (solo ADMIN/GERENTE).
- Producto sin precio o inactivo: mismo aviso con el motivo.
- Misma lectura dos veces seguidas en < 300 ms (rebote del lector) se descarta una vez.

**Vista de lista densa:** tabla (código · nombre · precio · existencia) con teclado (↑/↓, Enter agrega, F2 foco en escaneo), activada por `vistaDensa`. Mismo componente de tarjetas por defecto.

**Teclado:** hereda lo de esta etapa (F2 buscar, F4 cobrar, Esc limpiar, ventanas con foco y atajos).

## 4. Hardware requerido y cómo se verifica

| Dispositivo | Qué se requiere | Cómo se verifica |
|---|---|---|
| Lector de código de barras | Cualquier lector USB o Bluetooth en **modo HID (teclado)** con terminador Enter (CR/LF) y símbolos EAN-13/UPC/Code128. No requiere driver ni permisos del navegador. | Pantalla de prueba "Probar lector" que muestra cada lectura, su velocidad y el terminador; el cajero escanea 3 códigos y ve "OK". Se prueba también el Enter. |
| Impresora térmica (fase aparte) | 58/80 mm con ESC/POS por USB o red. Desde el navegador solo es posible vía WebUSB/Web Serial (Chrome/Edge) o un agente local; **no** con la pestaña actual. | Ticket de prueba y corte; hasta entonces `window.print()` con CSS de 80 mm. |
| Cajón de dinero (fase aparte) | Conectado a la impresora (pulso RJ11/RJ12 por ESC/POS). | Comando de apertura desde "Probar cajón"; registrar en bitácora quién lo abre. |
| Terminal bancaria | Independiente del POS; hoy solo se captura los 4 dígitos. | Sin integración. |

La pestaña Hardware debe **dejar de simular**: persistir la configuración por sucursal y marcar lo no soportado como "Próximamente" en vez de mostrar "Probar conexión" falso.

## 5. Plan y tamaño

| Bloque | Tamaño | Notas |
|---|---|---|
| Migración + endpoint + validaciones + specs | **S** | Una columna, un índice, un lookup. |
| `ScanInput`, reglas del ticket, avisos | **M** | Foco permanente, detección de lector, sin red. |
| Vista densa configurable | **S–M** | Un componente y un switch por negocio. |
| Hardware real (impresora/cajón) | **L** | Fuera de esta fase; depende de WebUSB/agente local. |
| **Modo retail completo (sin impresora/cajón)** | **M** | ~1 semana de desarrollo y pruebas con un lector real. |

## 6. Riesgos

1. **Códigos duplicados o mal capturados** al migrar un catálogo grande → el índice único lo rechaza; el importador debe reportar fila y producto en conflicto.
2. **Pérdida de foco** (un clic fuera, una ventana que no lo devuelve) → el lector escribe en la nada o dispara un botón con Enter. Mitigación: foco permanente y devolución de foco en `ModalPOS` (ya hecha).
3. **Lectores con prefijos/sufijos o layout de teclado distinto** (ñ, -, ' en lugar de dígitos) → configuración del lector (EAN-13 numérico) y pantalla de prueba; no depender del layout.
4. **Autorrelleno del navegador** en el campo de escaneo → mismas defensas de `InputBusqueda` (`autocomplete=off`, `data-lpignore`).
5. **Escaneo durante un cobro** → el código termina en el campo de monto. Mitigación: con una ventana abierta el escaneo se ignora y el campo de monto solo acepta dígitos/punto (ya normalizado).
6. **Offline**: el catálogo en caché debe incluir `barcode`; un producto nuevo sin sincronizar no se resolverá hasta tener red (aviso claro, no silencioso).
7. **Rendimiento** con catálogos de miles de SKUs → índice local por `barcode` (Map) y paginación del listado denso.
8. **Alcance**: inventario por código, balanzas y etiquetado quedan fuera; pedirlos antes de la fase M duplica el tamaño.

## 7. Qué NO cambia

Cobro, descuentos, devoluciones, corte de caja, tenant y permisos siguen exactamente como están; el modo retail solo agrega una forma de llenar el ticket.
