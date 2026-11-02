// Capturas, contraste (axe-core) y recorrido de teclado de las pantallas por skin, en Chrome real a 1366×768, con la API SIMULADA
// (los mismos datos antes y después, así que una diferencia es del código y no de los datos). Procedimiento de oleada: docs/PLAN-SKINS.md.
//
//   node scripts/capturas-skins.mjs --salida capturas-skins/ola0-antes --escenas todas --skins estia,oscuro [--rol ADMIN]
//
// Registra el data-skin que de verdad quedó aplicado (skins-aplicadas.json) y termina con error si no es el pedido. Claro y Alto contraste solo
// los ven ADMIN/SOPORTE: con otro rol esa captura se OMITE (se listaría como omitida, no como medida); --rol fuerza el rol de todas las escenas.
//
// Por escena y skin guarda: <escena>__<skin>.png, y en <salida>/axe.json el contraste (reglas color-contrast de WCAG 2 AA) y en
// <salida>/teclado.json el orden de foco al pulsar Tab. Requiere Chrome (CHROME_PATH o la ruta de Windows por defecto).
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { ESCENAS_POS, responderPos } from './escenas-pos.mjs';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith('--') ? [...a, [x.slice(2), arr[i + 1]]] : a), []));
const SALIDA = resolve(args.salida ?? 'capturas-skins/prueba');
const SKINS = (args.skins ?? 'estia,oscuro').split(',');
const PUERTO = Number(args.puerto ?? 5199);
// --movimiento reduce|no-preference: emula esa preferencia del sistema, NO apaga las animaciones y registra en movimiento.json lo que de verdad se anima
const MOVIMIENTO = args.movimiento;
const API = 'http://api.mock.test';
// Skins en preparación: solo las ven estos roles (src/core/theme/skins.ts). Con otro rol la app cae en ESTIA, así que esa captura no mostraría la skin pedida.
const SKINS_EN_PREPARACION = ['claro', 'contraste', 'isotipo'];
const ROLES_SKINS_EN_PREPARACION = ['ADMIN', 'SOPORTE'];
const ROL_FORZADO = args.rol; // --rol ADMIN: todas las escenas con ese rol (en vez del suyo)
const rolDe = (escena) => ROL_FORZADO ?? usuario(escena.usuario).roleCode;
const usuarioDe = (escena) => usuario({ ...escena.usuario, ...(ROL_FORZADO ? { roleCode: ROL_FORZADO } : {}) });
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
    { id: 'c1', name: 'Grupo Demo', companyName: 'Grupo Demo', income: 301000, expense: 190000, balance: 820000, ventas: 301000 },
    { id: 'c2', name: 'Norte', companyName: 'Norte', income: 181350.5, expense: 121200.25, balance: 425890.75, ventas: 181350.5 },
  ],
  branchesBreakdown: [],
};
const modulosCatalogo = [
  { code: 'pos', name: 'POS General', description: 'Punto de venta', category: 'pos', isAddon: true, defaultPrice: 400 },
  { code: 'rh', name: 'Recursos Humanos', description: 'Personal y nómina', category: 'rh', isAddon: true, defaultPrice: 300 },
  { code: 'costos', name: 'Costos y Producción', description: 'Recetas e inventario', category: 'operaciones', isAddon: true, defaultPrice: 499 },
  { code: 'tesoreria', name: 'Tesorería', description: 'Bancos y movimientos', category: 'finanzas', isAddon: false, defaultPrice: 0 },
];
// Catálogo de negocios para el selector de SOPORTE: uno con nombre muy largo para comprobar que no desborda la barra
const NEGOCIO_LARGO = 'Corporativo de Alimentos y Bebidas del Pacífico Norte SA de CV';
const NEGOCIOS_SOPORTE = [
  { id: 't1', tradeName: 'Gimnasio Demo', legalName: 'Gimnasio Demo SA de CV' },
  { id: 't2', tradeName: NEGOCIO_LARGO, legalName: NEGOCIO_LARGO },
  { id: 't3', tradeName: 'Cafetería Central', legalName: 'Cafetería Central SA' },
];
// Alertas de Tesorería con el caso real reportado: 10 «facturas vencidas» de $3,616 a $10,860 y una transferencia pendiente de $25,000
const diasAtras = (d) => new Date(Date.now() - d * 86400000).toISOString();
const FACTURAS_VENCIDAS = [
  ['Pago de nómina', 3616, 95], ['Renta de local', 4100.5, 88], ['Compra de insumos', 4875.25, 76], ['Servicios básicos', 5200, 64],
  ['Mantenimiento preventivo anual de equipos de refrigeración y cocina industrial de la sucursal matriz', 5990.75, 52], ['Publicidad digital', 6420, 41],
  ['Compra materias primas', 7310.4, 33], ['Asesoría contable', 8150, 21], ['Impuesto predial', 9275.9, 14], ['Transporte y logística', 10860, 6],
].map(([concept, amount, d]) => ({ type: 'OVERDUE', message: 'Pago vencido: ' + concept, concept, amount, date: diasAtras(d), severity: 'ERROR' }));
const alertasConDatos = () => ({
  lowBalanceAccounts: [], upcomingAlerts: [], overdueAlerts: FACTURAS_VENCIDAS,
  pendingAlerts: [{ type: 'PENDING', message: 'Traslado pendiente de autorización: Préstamo intercompañía', concept: 'Préstamo intercompañía', amount: 25000, date: diasAtras(3), severity: 'WARNING' }],
  totalAlerts: 11,
});
const alertasVacias = () => ({ lowBalanceAccounts: [], upcomingAlerts: [], overdueAlerts: [], pendingAlerts: [], totalAlerts: 0 });
const turnoPendiente = [{ id: 's1', status: 'PENDIENTE_APROBACION', cashierName: 'Luis', difference: -45.5, closedAt: '2026-10-24T20:10:00Z', branchName: 'Matriz' }];

function responder(metodo, ruta, escena) {
  // Escenas del POS/caja/mesas/Lite (scripts/escenas-pos.mjs): sus respuestas van primero; `fallos` fuerza un 500 en esas rutas (estado de error)
  if (escena.fallos?.some((r) => ruta.startsWith(r))) return [500, { message: 'Error simulado' }];
  const rp = responderPos(metodo, ruta, escena);
  if (rp) return rp;
  if (ruta.startsWith('/auth/me')) return escena.sinSesion ? [401, { message: 'No autenticado' }] : [200, usuarioDe(escena)];
  if (ruta === '/tenants') return [200, NEGOCIOS_SOPORTE];
  if (ruta.startsWith('/treasury/alerts')) return [200, escena.alertasVacias ? alertasVacias() : alertasConDatos()];
  if (ruta.startsWith('/treasury/alert-config')) return [200, { saldoMinimo: 0, diasAnticipacionAlerta: 7, alertasActivas: true }];
  if (ruta.startsWith('/tenants/resolve')) return [200, { id: 't1', slug: 'demo', tradeName: 'Negocio Demo' }];
  if (/^\/tenants\/t1/.test(ruta)) return [200, { id: 't1', plan: escena.plan ?? 'BUSINESS', giro: escena.giro ?? 'generico', isOnboarded: true }];
  if (ruta.startsWith('/tenant-settings')) return [200, { theme: 'estia', tenantId: 't1' }];
  if (ruta.startsWith('/companies')) return [200, empresas];
  if (ruta.startsWith('/branches')) return [200, [{ id: 'b1', name: 'Matriz', companyId: 'c1', code: 'MATRIZ' }]];
  if (ruta.startsWith('/dashboard/kpis')) return [200, escena.kpis ? { ...kpis, ...escena.kpis } : kpis];
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
// Mide el selector de negocio de SOPORTE en la barra superior: que quepa en la barra y en el viewport, que no pise la navegación y
// el contraste del texto (WCAG 1.4.3, ≥4.5:1; ≥7:1 en Alto contraste) y del borde del control (1.4.11, ≥3:1) contra el fondo real.
// Mide «Facturas vencidas» y «Transferencias pendientes» en la pestaña Alertas de Tesorería (antes y después del rediseño): alto que ocupa cada
// bloque, filas, desborde horizontal y, si el bloque nuevo existe, contraste axe SOLO dentro de él y elementos enfocables.
async function medirAlertasTesoreria(page) {
  const base = await page.evaluate(() => {
    const bloque = (re) => {
      const h = [...document.querySelectorAll('h3')].find((x) => re.test(x.textContent || ''));
      if (!h) return { hay: false };
      const cont = h.closest('[data-bloque-alertas]') || h.parentElement;
      const r = cont.getBoundingClientRect();
      const nuevo = !!cont.hasAttribute('data-bloque-alertas');
      const filas = nuevo ? cont.querySelectorAll('[data-fila-alerta]') : cont.querySelectorAll('div[style*="border"]');
      return {
        hay: true, nuevo, alto: Math.round(r.height), ancho: Math.round(r.width), filas: filas.length, desborde: cont.scrollWidth > cont.clientWidth + 1,
        enfocables: cont.querySelectorAll('a, button, input, select, textarea, [tabindex]').length,
        textoEncabezado: (h.parentElement.textContent || '').replace(/s+/g, ' ').trim().slice(0, 90),
        etiquetaVencido: (cont.textContent.match(/VENCIDO|PENDIENTE/g) || []).length,
        primeraFila: nuevo ? (cont.querySelector('[data-fila-alerta]')?.textContent || '').replace(/s+/g, ' ').trim().slice(0, 90) : null,
        columnas: nuevo ? new Set([...cont.querySelectorAll('[data-fila-alerta]')].map((x) => Math.round(x.getBoundingClientRect().left))).size : null,
        alturaFila: nuevo && filas[0] ? Math.round(filas[0].getBoundingClientRect().height) : null,
      };
    };
    return { facturas: bloque(/facturas vencidas/i), transferencias: bloque(/transferencias pendientes/i) };
  });
  const regla = (await page.evaluate(() => document.documentElement.getAttribute('data-skin'))) === 'contraste' ? 'color-contrast-enhanced' : 'color-contrast';
  const axeBloques = await page.evaluate(async (regla) => {
    const out = {};
    for (const [k, re] of [['facturas', /facturas vencidas/i], ['transferencias', /transferencias pendientes/i]]) {
      const h = [...document.querySelectorAll('h3')].find((x) => re.test(x.textContent || ''));
      const cont = h && (h.closest('[data-bloque-alertas]') || h.parentElement);
      if (!cont) { out[k] = null; continue; }
      const r = await window.axe.run(cont, { runOnly: { type: 'rule', values: [regla] }, resultTypes: ['violations'] });
      out[k] = r.violations.flatMap((v) => v.nodes.map((n) => (n.any[0]?.message ?? '').replace(/s+/g, ' ').slice(0, 120)));
    }
    return out;
  }, regla);
  return { ...base, contrasteBloques: axeBloques };
}
async function medirSelectorNegocio(page) {
  return page.evaluate(() => {
    const sel = document.querySelector('select[aria-label^="Negocio activo"]');
    if (!sel) return { hay: false };
    const num = (c) => (c.match(/[0-9.]+/g) || []).map(Number);
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const mezcla = (fg, bg) => { const [r, g, b, a = 1] = fg; return [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)]; };
    const razon = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    // fondo real: el primer ancestro con fondo no transparente
    let el = sel.parentElement, fondo = [255, 255, 255];
    while (el) { const c = num(getComputedStyle(el).backgroundColor); if (c.length >= 3 && (c[3] === undefined || c[3] > 0.99)) { fondo = c.slice(0, 3); break; } el = el.parentElement; }
    const cs = getComputedStyle(sel);
    const fondoSel = num(cs.backgroundColor); const fondoControl = fondoSel.length >= 3 ? mezcla(fondoSel, fondo) : fondo;
    const texto = mezcla(num(cs.color), fondoControl);
    const borde = mezcla(num(cs.borderTopColor), fondo);
    const etiqueta = sel.closest('label');
    const etiquetaColor = etiqueta ? mezcla(num(getComputedStyle(etiqueta).color), fondo) : null;
    const rs = sel.getBoundingClientRect();
    const derecha = etiqueta?.parentElement; // contenedor de la zona derecha de la barra
    const barra = [...document.querySelectorAll('div')].find((d) => d.contains(sel) && Math.round(d.getBoundingClientRect().height) === 52);
    const nav = document.querySelector('nav[aria-label="Módulos"]');
    const rb = barra?.getBoundingClientRect();
    const rn = nav?.getBoundingClientRect();
    const rd = derecha?.getBoundingClientRect();
    return {
      hay: true,
      depuracion: { fondoCalculado: cs.backgroundColor, colorCalculado: cs.color, esquema: cs.colorScheme, apariencia: cs.appearance, guardado: localStorage.getItem('soporte_tenant_id'), valor: sel.value, opciones: [...sel.options].map((o) => o.value + '=' + o.textContent.slice(0, 12)) },
      opcionElegida: sel.options[sel.selectedIndex]?.textContent,
      ancho: Math.round(rs.width), alto: Math.round(rs.height), izquierda: Math.round(rs.left), derecha: Math.round(rs.right),
      dentroDelViewport: rs.left >= 0 && rs.right <= window.innerWidth,
      dentroDeLaBarra: !!rb && rs.top >= rb.top - 0.5 && rs.bottom <= rb.bottom + 0.5,
      barraSinDesborde: !!barra && barra.scrollWidth <= barra.clientWidth + 1,
      navNoPisaZonaDerecha: !!rn && !!rd ? rn.right <= rd.left + 1 : null,
      contrasteTexto: +razon(texto, fondoControl).toFixed(2),
      contrasteBorde: +razon(borde, fondo).toFixed(2),
      contrasteEtiqueta: etiquetaColor ? +razon(etiquetaColor, fondo).toFixed(2) : null,
      tieneNombreAccesible: !!(sel.getAttribute('aria-label') || '').trim(),
      alturaMinima24: rs.height >= 24,
    };
  });
}
export const ESCENAS = {
  login: { ruta: '/login', sinSesion: true },
  'login-negocio': { ruta: '/login?t=demo', sinSesion: true },
  dashboard: { ruta: '/dashboard' },
  'dashboard-sin-pendientes': { ruta: '/dashboard', turnos: [], kpis: { cxpVencidas: 0, saldoDisponible: 50000 } },
  'dashboard-lite': { ruta: '/dashboard', usuario: { modulosActivos: ['dashboard', 'pos-sin-inventario', 'corte-caja-lite'] } },
  'centro-soluciones': { ruta: '/solutions' },
  guia: { ruta: '/dashboard', plan: 'PRUEBA', giro: 'restaurante', guia: true, accion: async (p) => { const b = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find((x) => /Guía de la prueba/.test(x.textContent || ''))); await b.asElement()?.click(); await ESPERA(400); } },
  'topbar-mas-modulos': { ruta: '/dashboard', accion: async (p) => { await p.keyboard.down('Alt'); await p.keyboard.press('KeyM'); await p.keyboard.up('Alt'); await ESPERA(300); } },
  'topbar-contexto': { ruta: '/dashboard', accion: async (p) => { const b = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find((x) => /empresa|vista|grupo|global/i.test(x.textContent || '') && x.closest('header,div'))); await b.asElement()?.click(); await ESPERA(300); } },
  ...ESCENAS_POS,
  // Selector de negocio de SOPORTE (barra superior). Con --rol SOPORTE; el nombre largo comprueba que no desborda la barra a 1366 px
  'topbar-negocio-soporte': { ruta: '/dashboard', usuario: { roleCode: 'SOPORTE' }, localStorage: { soporte_tenant_id: 't2', soporte_tenant_name: NEGOCIO_LARGO }, medir: medirSelectorNegocio },
  'topbar-negocio-soporte-vacio': { ruta: '/dashboard', usuario: { roleCode: 'SOPORTE' }, medir: medirSelectorNegocio },
  // Pestaña Alertas de Tesorería: con los datos del caso reportado (11 alertas) y sin alertas
  'tesoreria-alertas': { ruta: '/treasury', accion: async (p) => { const b = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find((x) => /^Alertas$/.test((x.textContent || '').trim()))); await b.asElement()?.click(); await ESPERA(700); }, medir: medirAlertasTesoreria },
  'tesoreria-alertas-vacio': { ruta: '/treasury', alertasVacias: true, accion: async (p) => { const b = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find((x) => /^Alertas$/.test((x.textContent || '').trim()))); await b.asElement()?.click(); await ESPERA(700); }, medir: medirAlertasTesoreria },
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
  page.on('dialog', (d) => { d.dismiss().catch(() => {}); }); // alert()/confirm() del POS bloquearían el teclado del navegador
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
      localStorage.removeItem('ui_pos_hex'); // el navegador es el mismo entre escenas: la opción solo vale en las que la piden
      localStorage.removeItem('soporte_tenant_id'); // idem: el negocio activo de SOPORTE solo existe en las escenas que lo piden
      localStorage.removeItem('soporte_tenant_name');
      localStorage.setItem('ui_skin_device', skinId);
      for (const [k, v] of Object.entries(e.localStorage ?? {})) localStorage.setItem(k, v);
      for (const [k, v] of Object.entries(e.sessionStorage ?? {})) sessionStorage.setItem(k, v);
      if (!e.sinSesion) {
        const u = JSON.parse(usuarioJson);
        localStorage.setItem('user', JSON.stringify(u));
        localStorage.setItem('tenant_id', u.tenantId);
        localStorage.setItem('modulos_activos', JSON.stringify(u.modulosActivos));
        localStorage.setItem('splash_visto', '1');
        if (!e.guia) localStorage.setItem('prueba_guia_vista_t1', '1');
      }
    } catch { /* nada */ }
  }, skin, escena, JSON.stringify(usuarioDe(escena)));
  if (MOVIMIENTO) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: MOVIMIENTO }]);
  await page.goto(`http://localhost:${PUERTO}${escena.ruta}`, { waitUntil: 'networkidle2', timeout: 45000 });
  if (!MOVIMIENTO) await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
  await ESPERA(900);
  // La skin que de verdad quedó puesta: si no es la pedida, la captura y el contraste serían de otra skin y no valen.
  const skinAplicada = await page.evaluate(() => document.documentElement.getAttribute('data-skin'));
  if (skinAplicada !== skin) { await page.close(); throw Object.assign(new Error(`skin pedida «${skin}» pero aplicada «${skinAplicada}»`), { desajuste: true }); }
  if (escena.accion) await escena.accion(page);
  await ESPERA(300);
  const movimiento = MOVIMIENTO ? await page.evaluate(() => ['.iso-entrada', '.iso-pestana', '.iso-bisel', '.iso-hex', '.iso-columna'].map((sel) => { const el = document.querySelector(sel); if (!el) return { sel, hay: false }; const cs = getComputedStyle(el); return { sel, hay: true, animacion: cs.animationName, transicion: cs.transitionDuration }; })) : null;
  await page.screenshot({ path: join(SALIDA, `${nombre}__${skin}.png`), type: 'png' });
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  // contrato de la ventana de arriba (estándar de modales): rol, nombre accesible, medidas a 1366×768, capa sobre la barra y foco dentro
  const contrato = await page.evaluate(() => {
    const d = [...document.querySelectorAll('[role="dialog"]')].pop();
    if (!d) return null;
    const panel = d.firstElementChild;
    const r = panel.getBoundingClientRect();
    const nombre = (d.getAttribute('aria-labelledby') || '').split(' ').map((i) => document.getElementById(i)?.textContent || '').join(' ').trim();
    const arriba = document.elementFromPoint(r.left + r.width / 2, r.top + 14);
    const cuerpo = [...panel.querySelectorAll('div')].find((x) => /overflow-y-auto/.test(x.className) && /flex-1/.test(x.className));
    return { fondoPanel: getComputedStyle(panel).backgroundColor, fondoOverlay: getComputedStyle(d).backgroundColor, clasePanel: panel.className.slice(0, 200), rol: d.getAttribute('role'), modal: d.getAttribute('aria-modal'), nombre, ancho: Math.round(r.width), alto: Math.round(r.height), caben1366: r.width <= 1229.5 && r.height <= 691.5, sobreBarra: !!arriba && d.contains(arriba), focoDentro: d.contains(document.activeElement), scrollInterno: cuerpo ? cuerpo.scrollHeight > cuerpo.clientHeight + 1 : false, botones: [...panel.querySelectorAll('[data-pos-footer] button')].map((b) => (b.textContent || '').trim()) };
  });
  // impresión (recibos): se emula el medio «print»; el papel debe quedar claro y el texto oscuro, sea cual sea la skin
  let impresion = null;
  if (escena.imprimible) {
    await page.emulateMediaType('print');
    await ESPERA(250);
    await page.screenshot({ path: join(SALIDA, `${nombre}__${skin}__print.png`), type: 'png' });
    impresion = await page.evaluate(() => {
      const el = document.getElementById('print-area');
      if (!el) return { areaImpresion: false };
      const cs = getComputedStyle(el);
      const lum = (c) => { const m = (c.match(/[0-9.]+/g) || [0, 0, 0]).map(Number); const l = m.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; };
      const texto = el.querySelector('h3, p, span') ? getComputedStyle(el.querySelector('h3, p, span')).color : cs.color;
      return { areaImpresion: true, visible: cs.visibility, fondo: cs.backgroundColor, fondoClaro: lum(cs.backgroundColor) > 0.8, texto, textoOscuro: lum(texto) < 0.2 };
    });
    await page.emulateMediaType('screen');
  }
  // contraste AA (axe-core en el navegador real)
  await page.evaluate(AXE);
  // Alto contraste se mide contra AAA (7:1: regla color-contrast-enhanced); el resto, contra AA (4.5:1)
  const regla = skin === 'contraste' ? 'color-contrast-enhanced' : 'color-contrast';
  const axe = await page.evaluate(async (regla) => {
    const r = await window.axe.run(document, { runOnly: { type: 'rule', values: [regla] }, resultTypes: ['violations'] });
    return r.violations.flatMap((v) => v.nodes.map((n) => ({ objetivo: n.target.join(' '), enDialogo: !!n.element?.closest('[role="dialog"]'), resumen: (n.any[0]?.message ?? '').replace(/\s+/g, ' ').slice(0, 160) })));
  }, regla);
  // atajos de la escena (F2/F3/F4/F6/F8/F10, Esc…): tras cada tecla, qué hay abierto y dónde está el foco (se compara antes/después)
  const atajos = [];
  for (const k of escena.teclas ?? []) {
    await page.keyboard.press(k);
    await ESPERA(300);
    atajos.push({ tecla: k, ...(await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"], .fixed.inset-0');
      const a = document.activeElement;
      return { dialogos: document.querySelectorAll('[role="dialog"]').length, titulo: (d?.textContent || '').replace(/s+/g, ' ').trim().slice(0, 70), foco: a ? (a.tagName.toLowerCase() + ':' + (a.getAttribute('name') || a.id || (a.textContent || '').trim().slice(0, 20))) : null };
    })) });
  }
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
      return { tag: a.tagName.toLowerCase(), id: a.id || undefined, rol: a.getAttribute('role') || undefined, texto: (a.getAttribute('aria-label') || a.textContent || a.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim().slice(0, 40), focoVisible: !!visible, grosor: parseFloat(cs.outlineWidth) || 0 };
    });
    teclado.push(d);
    if (!d) break;
  }
  const medidas = escena.medir ? await escena.medir(page) : null;
  await page.close();
  return { axe, teclado, desborde, atajos, impresion, contrato, skinAplicada, movimiento, medidas };
}

mkdirSync(SALIDA, { recursive: true });
const nombres = args.escenas && args.escenas !== 'todas' ? args.escenas.split(',') : Object.keys(ESCENAS);
const srv = await servidor();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 60000, args: ['--no-sandbox', '--force-color-profile=srgb', '--font-render-hinting=none', '--disable-lcd-text'] });
const aplicadas = {}, omitidas = [], desajustes = [];
const movTodo = {};
const medidasTodo = {};
const axeTodo = {}, tecladoTodo = {}, desbordes = {}, atajosTodo = {}, impresionTodo = {}, contratoTodo = {};
try {
  for (const n of nombres) for (const skin of SKINS) {
    let r;
    if (SKINS_EN_PREPARACION.includes(skin) && !ROLES_SKINS_EN_PREPARACION.includes(rolDe(ESCENAS[n]))) { omitidas.push(`${n}__${skin}`); console.log(`${n.padEnd(20)} ${skin.padEnd(7)} OMITIDA: el rol ${rolDe(ESCENAS[n])} no ve esta skin (usa --rol ADMIN)`); continue; }
    try { r = await capturar(browser, n, ESCENAS[n], skin); } catch (e) { if (e.desajuste) desajustes.push(`${n}__${skin}: ${e.message}`); console.log(`${n.padEnd(20)} ${skin.padEnd(7)} ESCENA FALLÓ: ${String(e.message).slice(0, 90)}`); continue; }
    aplicadas[`${n}__${skin}`] = r.skinAplicada;
    if (r.movimiento) movTodo[`${n}__${skin}`] = r.movimiento;
    if (r.medidas) medidasTodo[`${n}__${skin}`] = r.medidas;
    axeTodo[`${n}__${skin}`] = r.axe; tecladoTodo[`${n}__${skin}`] = r.teclado; desbordes[`${n}__${skin}`] = r.desborde; atajosTodo[`${n}__${skin}`] = r.atajos; contratoTodo[`${n}__${skin}`] = r.contrato; if (r.impresion) impresionTodo[`${n}__${skin}`] = r.impresion;
    console.log(`${n.padEnd(20)} ${skin.padEnd(7)} contraste: ${String(r.axe.length).padStart(3)} fallos | foco: ${r.teclado.length} pasos | desborde: ${r.desborde ? 'SÍ' : 'no'}`);
  }
} finally {
  await browser.close();
  srv.kill();
}
writeFileSync(join(SALIDA, 'axe.json'), JSON.stringify(axeTodo, null, 1));
writeFileSync(join(SALIDA, 'teclado.json'), JSON.stringify(tecladoTodo, null, 1));
writeFileSync(join(SALIDA, 'desborde.json'), JSON.stringify(desbordes, null, 1));
writeFileSync(join(SALIDA, 'atajos.json'), JSON.stringify(atajosTodo, null, 1));
writeFileSync(join(SALIDA, 'impresion.json'), JSON.stringify(impresionTodo, null, 1));
writeFileSync(join(SALIDA, 'contrato.json'), JSON.stringify(contratoTodo, null, 1));
if (Object.keys(medidasTodo).length) writeFileSync(join(SALIDA, 'medidas.json'), JSON.stringify(medidasTodo, null, 1));
if (MOVIMIENTO) writeFileSync(join(SALIDA, 'movimiento.json'), JSON.stringify(movTodo, null, 1));
writeFileSync(join(SALIDA, 'skins-aplicadas.json'), JSON.stringify({ aplicadas, omitidas, desajustes }, null, 1));
if (omitidas.length) console.log(`\n${omitidas.length} captura(s) omitidas porque el rol no ve esa skin.`);
if (desajustes.length) { console.log(`\nFALLO: la skin aplicada no es la pedida en ${desajustes.length} captura(s):\n  ` + desajustes.join('\n  ')); process.exit(1); }
process.exit(0);
