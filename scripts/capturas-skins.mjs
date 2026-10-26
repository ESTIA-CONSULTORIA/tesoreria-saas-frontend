// Capturas, contraste (axe-core) y recorrido de teclado de las pantallas por skin, en Chrome real a 1366×768, con la API SIMULADA
// (los mismos datos antes y después, así que una diferencia es del código y no de los datos). Procedimiento de oleada: docs/PLAN-SKINS.md.
//
//   node scripts/capturas-skins.mjs --salida capturas-skins/ola0-antes --escenas todas --skins estia,oscuro
//
// Por escena y skin guarda: <escena>__<skin>.png, y en <salida>/axe.json el contraste (reglas color-contrast de WCAG 2 AA) y en
// <salida>/teclado.json el orden de foco al pulsar Tab. Requiere Chrome (CHROME_PATH o la ruta de Windows por defecto).
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith('--') ? [...a, [x.slice(2), arr[i + 1]]] : a), []));
const SALIDA = resolve(args.salida ?? 'capturas-skins/prueba');
const SKINS = (args.skins ?? 'estia,oscuro').split(',');
const PUERTO = Number(args.puerto ?? 5199);
const API = 'http://api.mock.test';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const AXE = readFileSync(join(RAIZ, 'node_modules/axe-core/axe.min.js'), 'utf8');

// ── datos simulados ──
const MODULOS_ERP = ['dashboard', 'empresas', 'sucursales', 'usuarios', 'configuracion', 'tesoreria', 'pos', 'configuracion_pos', 'compras', 'proveedores', 'reportes', 'costos', 'rh'];
const usuario = (extra = {}) => ({ id: 'u1', email: 'ana@negocio-demo.mx', name: 'Ana Demo', roleCode: 'ADMIN', tenantId: 't1', companyId: null, branchId: null, modulosActivos: MODULOS_ERP, ...extra });
const empresas = [
  { id: 'c1', legalName: 'Grupo Demo SA de CV', tradeName: 'Grupo Demo', isActive: true, tenantId: 't1' },
  { id: 'c2', legalName: 'Sucursal Norte SA', tradeName: 'Norte', isActive: true, tenantId: 't1' },
];
const kpis = {
  income: 482350.5, expense: 311200.25, totalBalance: 1245890.75, incomeVariation: 12.4, expenseVariation: -3.1, cxpVencidas: 3, saldoDisponible: 8200,
  companiesBreakdown: [
    { id: 'c1', name: 'Grupo Demo', income: 301000, expense: 190000, balance: 820000, ventas: 301000 },
    { id: 'c2', name: 'Norte', income: 181350.5, expense: 121200.25, balance: 425890.75, ventas: 181350.5 },
  ],
  branchesBreakdown: [],
};
const modulosCatalogo = [
  { code: 'pos', name: 'POS General', description: 'Punto de venta', category: 'pos', isAddon: true, defaultPrice: 400 },
  { code: 'rh', name: 'Recursos Humanos', description: 'Personal y nómina', category: 'rh', isAddon: true, defaultPrice: 300 },
  { code: 'costos', name: 'Costos y Producción', description: 'Recetas e inventario', category: 'operaciones', isAddon: true, defaultPrice: 499 },
  { code: 'tesoreria', name: 'Tesorería', description: 'Bancos y movimientos', category: 'finanzas', isAddon: false, defaultPrice: 0 },
];
const turnoPendiente = [{ id: 's1', status: 'PENDIENTE_APROBACION', cashierName: 'Luis', difference: -45.5, closedAt: '2026-10-24T20:10:00Z', branchName: 'Matriz' }];

function responder(metodo, ruta, escena) {
  if (ruta.startsWith('/auth/me')) return escena.sinSesion ? [401, { message: 'No autenticado' }] : [200, usuario(escena.usuario)];
  if (ruta.startsWith('/tenants/resolve')) return [200, { id: 't1', slug: 'demo', tradeName: 'Negocio Demo' }];
  if (/^\/tenants\/t1/.test(ruta)) return [200, { id: 't1', plan: escena.plan ?? 'BUSINESS', giro: escena.giro ?? 'generico', isOnboarded: true }];
  if (ruta.startsWith('/tenant-settings')) return [200, { theme: 'estia', tenantId: 't1' }];
  if (ruta.startsWith('/companies')) return [200, empresas];
  if (ruta.startsWith('/branches')) return [200, [{ id: 'b1', name: 'Matriz', companyId: 'c1', code: 'MATRIZ' }]];
  if (ruta.startsWith('/dashboard/kpis')) return [200, kpis];
  if (ruta.startsWith('/pos/shifts')) return [200, escena.turnos ?? turnoPendiente];
  if (ruta === '/modules' || ruta.startsWith('/modules?')) return [200, modulosCatalogo];
  if (ruta.startsWith('/modules/tenant/')) return [200, ['dashboard', 'tesoreria', 'pos']];
  if (ruta.startsWith('/prueba/estado')) return [200, { esPrueba: true, estado: 'ACTIVA', venceEn: '2026-11-18T12:00:00.000Z', diasRestantes: 24, vencida: false, extendida: false }];
  if (ruta.startsWith('/prueba/progreso')) return [200, { categorias: 0, productos: 0, usuarios: 1, turnos: 0, turnosCerrados: 0, ventas: 0, puedeCargarEjemplo: true }];
  if (metodo === 'GET') return [200, []];
  return [200, {}];
}

// ── escenas ──
const ESPERA = (ms) => new Promise((r) => setTimeout(r, ms));
export const ESCENAS = {
  login: { ruta: '/login', sinSesion: true },
  'login-negocio': { ruta: '/login?t=demo', sinSesion: true },
  dashboard: { ruta: '/dashboard' },
  'dashboard-lite': { ruta: '/dashboard', usuario: { modulosActivos: ['dashboard', 'pos-sin-inventario', 'corte-caja-lite'] } },
  'centro-soluciones': { ruta: '/solutions' },
  guia: { ruta: '/dashboard', plan: 'PRUEBA', giro: 'restaurante', guia: true, accion: async (p) => { const b = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find((x) => /Guía de la prueba/.test(x.textContent || ''))); await b.asElement()?.click(); await ESPERA(400); } },
  'topbar-mas-modulos': { ruta: '/dashboard', accion: async (p) => { await p.keyboard.down('Alt'); await p.keyboard.press('KeyM'); await p.keyboard.up('Alt'); await ESPERA(300); } },
  'topbar-contexto': { ruta: '/dashboard', accion: async (p) => { const b = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find((x) => /empresa|vista|grupo|global/i.test(x.textContent || '') && x.closest('header,div'))); await b.asElement()?.click(); await ESPERA(300); } },
  'busqueda-global': { ruta: '/dashboard', accion: async (p) => { await p.keyboard.down('Control'); await p.keyboard.press('KeyK'); await p.keyboard.up('Control'); await ESPERA(300); } },
};

async function servidor() {
  const proc = spawn(process.execPath, [join(RAIZ, 'node_modules/vite/bin/vite.js'), '--port', String(PUERTO), '--strictPort'], { cwd: RAIZ, env: { ...process.env, VITE_API_URL: API }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((ok, mal) => {
    const t = setTimeout(() => { proc.kill(); mal(new Error('vite no arrancó')); }, 60000);
    proc.stdout.on('data', (d) => { if (String(d).includes('ready in')) { clearTimeout(t); ok(); } });
    proc.on('exit', (c) => mal(new Error('vite salió ' + c)));
  });
  return proc;
}

async function capturar(browser, nombre, escena, skin) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (req.url().startsWith(API)) {
      const cors = { 'access-control-allow-origin': `http://localhost:${PUERTO}`, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': req.headers()['access-control-request-headers'] ?? '*', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' };
      if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers: cors });
      const [status, cuerpo] = responder(req.method(), url.pathname.replace('/api/v1', '') + url.search, escena);
      return req.respond({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(cuerpo) });
    }
    if (/fonts\.(googleapis|gstatic)\.com/.test(url.host)) return req.abort(); // fuente local de respaldo: mismo resultado antes y después
    req.continue();
  });
  await page.evaluateOnNewDocument((skinId, e, usuarioJson) => {
    try {
      localStorage.setItem('ui_skin_device', skinId);
      if (!e.sinSesion) {
        const u = JSON.parse(usuarioJson);
        localStorage.setItem('user', JSON.stringify(u));
        localStorage.setItem('tenant_id', u.tenantId);
        localStorage.setItem('modulos_activos', JSON.stringify(u.modulosActivos));
        localStorage.setItem('splash_visto', '1');
        if (!e.guia) localStorage.setItem('prueba_guia_vista_t1', '1');
      }
    } catch { /* nada */ }
  }, skin, escena, JSON.stringify(usuario(escena.usuario)));
  await page.goto(`http://localhost:${PUERTO}${escena.ruta}`, { waitUntil: 'networkidle2', timeout: 45000 });
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
  await ESPERA(900);
  if (escena.accion) await escena.accion(page);
  await ESPERA(300);
  await page.screenshot({ path: join(SALIDA, `${nombre}__${skin}.png`), type: 'png' });
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  // contraste AA (axe-core en el navegador real)
  await page.evaluate(AXE);
  const axe = await page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] }, resultTypes: ['violations'] });
    return r.violations.flatMap((v) => v.nodes.map((n) => ({ objetivo: n.target.join(' '), resumen: (n.any[0]?.message ?? '').replace(/\s+/g, ' ').slice(0, 160) })));
  });
  // teclado: a dónde llega el foco con Tab (hasta 40 pasos)
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
  const teclado = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const d = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return null;
      const cs = getComputedStyle(a);
      const visible = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none');
      return { tag: a.tagName.toLowerCase(), id: a.id || undefined, rol: a.getAttribute('role') || undefined, texto: (a.getAttribute('aria-label') || a.textContent || a.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim().slice(0, 40), focoVisible: !!visible };
    });
    teclado.push(d);
    if (!d) break;
  }
  await page.close();
  return { axe, teclado, desborde };
}

mkdirSync(SALIDA, { recursive: true });
const nombres = args.escenas && args.escenas !== 'todas' ? args.escenas.split(',') : Object.keys(ESCENAS);
const srv = await servidor();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--force-color-profile=srgb', '--font-render-hinting=none', '--disable-lcd-text'] });
const axeTodo = {}, tecladoTodo = {}, desbordes = {};
try {
  for (const n of nombres) for (const skin of SKINS) {
    const r = await capturar(browser, n, ESCENAS[n], skin);
    axeTodo[`${n}__${skin}`] = r.axe; tecladoTodo[`${n}__${skin}`] = r.teclado; desbordes[`${n}__${skin}`] = r.desborde;
    console.log(`${n.padEnd(20)} ${skin.padEnd(7)} contraste: ${String(r.axe.length).padStart(3)} fallos | foco: ${r.teclado.length} pasos | desborde: ${r.desborde ? 'SÍ' : 'no'}`);
  }
} finally {
  await browser.close();
  srv.kill();
}
writeFileSync(join(SALIDA, 'axe.json'), JSON.stringify(axeTodo, null, 1));
writeFileSync(join(SALIDA, 'teclado.json'), JSON.stringify(tecladoTodo, null, 1));
writeFileSync(join(SALIDA, 'desborde.json'), JSON.stringify(desbordes, null, 1));
process.exit(0);
