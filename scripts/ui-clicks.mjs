// Pruebas de pantallas (clics) en ambiente LOCAL: arranca el backend real con la BD de pruebas y el frontend, abre Chrome y recorre
// login, POS, Compras, Tesorería, RH, Costos y el portal del empleado como lo haría una persona, a 1366x768 y en móvil.
// Uso: npm run test:ui   (requiere Postgres local de pruebas en 127.0.0.1:54329 y Chrome instalado). Nunca toca producción.
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const BACK = path.resolve('../backend');
const API = 'http://127.0.0.1:3300';
const WEB = 'http://127.0.0.1:5174';
const hijos = [];
const resultados = [];

function lanzar(cmd, args, opts, marca, ms) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { ...opts, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
    hijos.push(p);
    let listo = false;
    const alVer = (d) => { for (const l of String(d).split('\n')) if (l.startsWith('UI_ACCESO')) console.log(l.trim()); if (!listo && String(d).includes(marca)) { listo = true; resolve(p); } };
    p.stdout.on('data', alVer); p.stderr.on('data', alVer);
    p.on('exit', (c) => { if (!listo) reject(new Error(`${cmd} terminó con código ${c} antes de estar listo`)); });
    setTimeout(() => { if (!listo) reject(new Error(`Tiempo agotado esperando: ${marca}`)); }, ms);
  });
}
function apagar() { for (const h of hijos) { try { execSync('taskkill /pid ' + h.pid + ' /T /F', { stdio: 'ignore' }); } catch { /* ya terminó */ } } }

async function paso(nombre, fn) {
  try { await fn(); resultados.push({ pantalla: nombre, estado: 'OK' }); console.log(`  ✓ ${nombre}`); }
  catch (e) { try { mkdirSync('test-resultados', { recursive: true }); await paginaActual?.screenshot({ path: 'test-resultados/falla-' + String(resultados.length + 1).padStart(2, '0') + '.png' }); } catch { /* sin captura */ } resultados.push({ pantalla: nombre, estado: 'FALLA', detalle: String(e?.message ?? e).split('\n')[0].slice(0, 300) }); console.log(`  ✗ ${nombre}: ${String(e?.message ?? e).split('\n')[0]}`); }
}

let paginaActual = null;
const accesibilidad = [];
async function axe(page, nombre) {
  await page.evaluate(axeSource);
  const r = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.map((v) => ({ id: v.id, impacto: v.impact, nodos: v.nodes.length, ejemplos: v.nodes.slice(0, 4).map((n) => ({ el: n.target.join(' '), msg: (n.any[0]?.message || '').slice(0, 140) })) })));
  const aaa = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast-enhanced'] } })).violations.reduce((n, v) => n + v.nodes.length, 0));
  accesibilidad.push({ pantalla: nombre, aaa, graves: r.filter((v) => ['serious', 'critical'].includes(v.impacto)), otras: r.filter((v) => !['serious', 'critical'].includes(v.impacto)).length });
}

async function nueva(browser, viewport) {
  const ctx = await browser.newContext({ viewport, locale: 'es-MX' });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push('JS: ' + e.message));
  page.on('response', (r) => { if (r.status() >= 500 && r.url().startsWith(API)) errores.push(`HTTP ${r.status()} ${r.url().replace(API, '')}`); });
  page.errores = errores;
  paginaActual = page;
  return page;
}
const sinErrores = (page) => { if (page.errores.length) throw new Error('Errores en la pantalla: ' + page.errores.slice(0, 3).join(' | ')); };

async function iniciarSesion(page, correo, clave) {
  await page.goto(`${WEB}/login`);
  await page.getByRole('button', { name: /Sistema Principal/ }).press('Enter');
  await page.getByPlaceholder('Correo electrónico').fill(correo);
  await page.getByPlaceholder('Contraseña').fill(clave);
  await page.getByRole('button', { name: /Ingresar/ }).click();
}

async function main() {
  console.log('Arrancando backend de pruebas…');
  await lanzar('npx', ['ts-node', '--transpile-only', 'test/ui/servidor-ui.ts'], { cwd: BACK, env: { ...process.env, DB_HOST: '127.0.0.1', DB_PORT: process.env.DB_PORT || '54329' } }, 'UI_SERVIDOR_LISTO', 240000);
  console.log('Arrancando frontend…');
  await lanzar('npx', ['vite', '--port', '5174', '--strictPort', '--host', '127.0.0.1'], { cwd: process.cwd(), env: { ...process.env, VITE_API_URL: API } }, 'ready in', 120000);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    // ───────── ERP a 1366x768 ─────────
    let page = await nueva(browser, { width: 1366, height: 768 });
    console.log('ERP (1366x768)');
    await paso('Login: clave incorrecta muestra un mensaje en español', async () => {
      await iniciarSesion(page, 'admin@demo.com', 'clave-mala-1');
      await page.getByText(/incorrect|inválid|Credenciales/i).first().waitFor({ timeout: 10000 });
    });
    await paso('Login: administrador entra al sistema', async () => {
      await iniciarSesion(page, 'admin@demo.com', 'Admin123');
      await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 });
      sinErrores(page);
    });
    // Elegir la primera empresa y sucursal (como lo haría la persona en el selector de arriba)
    await paso('Selector de empresa y sucursal', async () => {
      const dato = await page.evaluate(async (api) => {
        const get = async (u) => (await fetch(api + '/api/v1' + u, { credentials: 'include' })).json();
        const emp = (await get('/companies'))[0];
        const suc = (await get('/branches')).find((b) => b.companyId === emp.id);
        return { emp: { id: emp.id, name: emp.tradeName || emp.legalName }, suc: { id: suc.id, name: suc.name } };
      }, API);
      await page.evaluate((d) => { localStorage.setItem('active_company_id', d.emp.id); localStorage.setItem('active_company_name', d.emp.name); localStorage.setItem('active_branch_id', d.suc.id); localStorage.setItem('active_branch_name', d.suc.name); }, dato);
    });
    const abrir = async (ruta, texto, nombre, extra) => paso(nombre, async () => {
      await page.goto(`${WEB}${ruta}`);
      await page.getByText(texto).first().waitFor({ timeout: 20000 });
      if (extra) await extra();
      await axe(page, nombre);
      sinErrores(page);
    });
    await abrir('/dashboard', /Dashboard|Resumen|Ventas|Tesorer/i, 'Dashboard');
    await abrir('/pos', /Punto de venta|Abrir turno|Caja|Turno|Mesa|Producto/i, 'POS');
    await abrir('/purchases', /Compras|Órdenes|Facturas|Proveedor/i, 'Compras');
    await abrir('/treasury', /Tesorer|Flujo|Cuentas/i, 'Tesorería');
    await abrir('/costs', /Costos|Insumos|Recetas/i, 'Costos e inventario', async () => {
      await page.getByRole('button', { name: 'Almacenes' }).click();
      await page.getByText('Existencias por almacén').waitFor({ timeout: 10000 });
    });
    await abrir('/hr', /Recursos|Empleados|Nómina|Solicitudes/i, 'RH', async () => {
      await page.getByRole('button', { name: 'Vacaciones' }).last().click();
      await page.getByText(/Portal del empleado: recibos, cartas y correcciones/).waitFor({ timeout: 10000 });
    });
    await paso('RH: la ficha del empleado muestra «Acceso al portal del empleado»', async () => {
      await page.goto(`${WEB}/hr`);
      await page.getByRole('button', { name: 'Editar' }).first().click();
      await page.getByRole('button', { name: /Relación Laboral/ }).click();
      await page.getByText('Acceso al portal del empleado').waitFor({ timeout: 15000 });
      sinErrores(page);
    });
    for (const [vpNombre, vp] of [['1366x768', { width: 1366, height: 768 }], ['1920x1080', { width: 1920, height: 1080 }]]) {
      await paso(`Usuarios y Roles ${vpNombre}: roles como chips, buscar, filtrar, abrir detalle y crear usuario, sin scroll de página`, async () => {
        await page.setViewportSize(vp);
        await page.goto(`${WEB}/users`);
        await page.getByRole('button', { name: 'Todos (' }).waitFor({ timeout: 20000 });
        const filas = page.locator('tbody tr');
        await filas.first().waitFor({ timeout: 10000 });
        const total = await filas.count();
        // sin scroll de la página; el botón «+ Nuevo usuario» visible sin bajar
        const desborde = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
        if (desborde > 4) throw new Error('la página tiene scroll vertical (' + desborde + ' px)');
        const nuevo = page.getByRole('button', { name: '+ Nuevo usuario' });
        await nuevo.waitFor({ timeout: 5000 });
        if (!(await nuevo.isVisible()) || (await nuevo.boundingBox()).y > vp.height) throw new Error('«+ Nuevo usuario» no se ve sin bajar');
        // filtrar por rol (chip) → solo ese rol y aparece el detalle de permisos
        const chips = page.getByRole('group', { name: 'Filtrar por rol' }).getByRole('button');
        const nChips = await chips.count();
        if (nChips < 2) throw new Error('faltan los chips de rol');
        await chips.nth(1).click();
        await page.getByText(/permisos/i).first().waitFor({ timeout: 10000 });
        if ((await page.locator('tbody tr').count()) > total) throw new Error('el filtro por rol no redujo la lista');
        await chips.first().click();
        // buscar por correo
        const correo = (await page.locator('tbody tr').first().locator('td').nth(1).innerText()).trim();
        await page.getByLabel('Buscar usuario por nombre o correo').fill(correo.slice(0, 6));
        if ((await page.locator('tbody tr').count()) < 1) throw new Error('la búsqueda no encontró al usuario');
        await page.getByLabel('Buscar usuario por nombre o correo').fill('zzzz-no-existe');
        await page.getByText('Ningún usuario coincide con el filtro.').waitFor({ timeout: 5000 });
        await page.getByLabel('Buscar usuario por nombre o correo').fill('');
        await page.getByLabel('Filtrar por estado').selectOption('inactivos');
        await page.getByLabel('Filtrar por estado').selectOption('todos');
        // detalle con teclado (Enter sobre la fila)
        await page.locator('tbody tr').first().focus();
        await page.keyboard.press('Enter');
        await page.getByRole('button', { name: 'Cerrar' }).waitFor({ timeout: 5000 });
        // crear usuario
        const correoNuevo = 'ui.' + vpNombre.replace(/W/g, '') + '.' + Date.now() + '@e2e.mx';
        await nuevo.click();
        await page.getByPlaceholder('Nombre', { exact: true }).fill('Prueba');
        await page.getByPlaceholder('Apellido').fill('Pantalla');
        await page.getByPlaceholder('Correo electrónico').fill(correoNuevo);
        await page.getByPlaceholder('Contraseña').fill('ClaveUi12345');
        const selRol = page.locator('select').filter({ has: page.locator('option', { hasText: 'Seleccionar rol' }) });
        const valor = await selRol.evaluate((s) => { const o = [...s.options].find((x) => /CONTADOR/.test(x.textContent || '')); return o ? o.value : ''; });
        if (valor) await selRol.selectOption(valor);
        await page.getByRole('button', { name: /Guardar usuario/ }).click();
        await page.getByText(correoNuevo).first().waitFor({ timeout: 15000 });
        if (vpNombre === '1366x768') { await axe(page, 'Usuarios y Roles'); try { mkdirSync('test-resultados', { recursive: true }); await page.screenshot({ path: 'test-resultados/usuarios-1366x768.png' }); } catch { /* sin captura */ } }
        else { try { await page.screenshot({ path: 'test-resultados/usuarios-1920x1080.png' }); } catch { /* sin captura */ } }
        sinErrores(page);
      });
    }
    await page.setViewportSize({ width: 1366, height: 768 });
    await abrir('/reports', /Reportes a la medida/, 'Reportes a la medida', async () => {
      await page.getByRole('button', { name: 'Generar reporte' }).click();
      await page.getByText(/Ventas cobradas: Total vendido/).first().waitFor({ timeout: 15000 });
    });
    await abrir('/settings/fiscal', /Datos fiscales/i, 'Datos fiscales y facturas (aviso sin validez fiscal)', async () => {
      await page.getByRole('tab', { name: /Facturas/ }).click();
      await page.getByText(/no tienen validez fiscal/i).first().waitFor({ timeout: 10000 });
    });
    await abrir('/settings/login-config', /Login|Acceso|Configuración/i, 'Configuración de login');
    await abrir('/settings/appearance', /Apariencia|Tema|Skin/i, 'Apariencia');
    await page.context().close();

    // ───────── Portal del empleado a 1366x768 y en móvil ─────────
    for (const [etiqueta, vp] of [['1366x768', { width: 1366, height: 768 }], ['móvil 390x844', { width: 390, height: 844 }]]) {
      page = await nueva(browser, vp);
      console.log(`Portal del empleado (${etiqueta})`);
      await paso(`Portal ${etiqueta}: entra con el acceso que dio RH`, async () => {
        await page.goto(`${WEB}/employee`);
        await page.locator('input[type="email"]').fill('ana.ui@e2e.mx');
        await page.locator('input[type="password"]').fill('ClaveUi12345');
        await page.locator('button[type="submit"]').click();
        await page.waitForURL(/\/employee\/home/, { timeout: 20000 });
        await page.getByAltText('ESTIA').waitFor();
      });
      await paso(`Portal ${etiqueta}: checar entrada`, async () => {
        const entrada = page.getByRole('button', { name: /registrar entrada/i });
        await entrada.or(page.getByText('EN TURNO')).first().waitFor({ timeout: 15000 });
        if (await entrada.count()) { await entrada.click(); await page.getByText(/Entrada registrada/).waitFor({ timeout: 15000 }); }
        else await page.getByText('EN TURNO').waitFor({ timeout: 10000 }); // ya había checado en la vuelta anterior
        await axe(page, `Portal inicio ${etiqueta}`);
      });
      await paso(`Portal ${etiqueta}: asistencia del mes`, async () => {
        await page.getByRole('button', { name: /Asistencia/ }).first().click();
        await page.getByText('Mi asistencia').waitFor();
        await page.getByText(/fuera de zona|Días con registro/).first().waitFor();
        await axe(page, `Portal asistencia ${etiqueta}`);
      });
      await paso(`Portal ${etiqueta}: mis recibos con la leyenda «sin validez fiscal»`, async () => {
        await page.getByRole('button', { name: /Recibos/ }).first().click();
        await page.getByText('Mis recibos de nómina').waitFor();
        await page.getByText(/sin validez fiscal/i).waitFor();
        await axe(page, `Portal recibos ${etiqueta}`);
      });
      await paso(`Portal ${etiqueta}: pedir una carta de trabajo queda en espera de aprobación`, async () => {
        await page.getByRole('button', { name: /Solicitudes/ }).first().click();
        await page.getByRole('button', { name: 'Carta de trabajo' }).click();
        await page.getByRole('button', { name: 'Enviar solicitud' }).click();
        await page.getByText('En espera de aprobación').first().waitFor({ timeout: 15000 });
        await axe(page, `Portal solicitudes ${etiqueta}`);
      });
      await paso(`Portal ${etiqueta}: sin desplazamiento horizontal y sin errores`, async () => {
        const ancho = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (ancho > 2) throw new Error(`La pantalla se desborda ${ancho}px a lo ancho`);
        sinErrores(page);
      });
      await page.context().close();
    }
  } finally {
    await browser.close();
  }
}

let salida = 0;
try { await main(); } catch (e) { console.error('Error general:', e.message); salida = 1; }
apagar();
mkdirSync('test-resultados', { recursive: true });
writeFileSync('test-resultados/ui-clicks.json', JSON.stringify({ resultados, accesibilidad }, null, 1));
const fallas = resultados.filter((r) => r.estado === 'FALLA').length;
console.log(`\nPantallas: ${resultados.length - fallas} OK, ${fallas} con falla. Accesibilidad: test-resultados/ui-clicks.json`);
for (const a of accesibilidad) if (a.aaa) console.log(`  AAA (7:1) ${a.pantalla}: ${a.aaa} elementos`);
for (const a of accesibilidad) if (a.graves.length) console.log(`  a11y ${a.pantalla}: ${a.graves.map((v) => `${v.id}(${v.nodos})`).join(', ')}`);
process.exit(fallas || salida ? 1 : 0);
