// Lógica pura de la pantalla "Datos fiscales" (sin DOM, con spec). Ver docs/DISENO-DATOS-FISCALES.md.
// El servidor tiene la última palabra: estas reglas dan respuesta inmediata mientras se escribe.

// ── RFC: formato, fecha y dígito verificador (misma regla que backend/src/facturacion/fiscal-validators.ts) ──
const ALFABETO = '0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ';
const RFC_RE = /^([A-ZÑ&]{3,4})(\d{2})(\d{2})(\d{2})([A-Z\d]{2})([A\d])$/;
const CARACTERES_RFC = /^[A-ZÑ&0-9]*$/;
export const RFC_GENERICO_NACIONAL = 'XAXX010101000';
export const RFC_GENERICO_EXTRANJERO = 'XEXX010101000';

export type TipoRfc = 'MORAL' | 'FISICA' | 'GENERICO_NACIONAL' | 'GENERICO_EXTRANJERO';
export interface ResultadoRfc {
  estado: 'vacio' | 'incompleto' | 'ok' | 'aviso' | 'error';
  mensaje: string;
  rfc: string;
  tipo?: TipoRfc;
}

export const normalizarRfc = (v: string) => (v ?? '').replace(/\s+/g, '').toUpperCase();

function fechaValida(aa: number, mm: number, dd: number): boolean {
  if (mm < 1 || mm > 12 || dd < 1) return false;
  const dias = (anio: number) => new Date(anio, mm, 0).getDate();
  return dd <= Math.max(dias(1900 + aa), dias(2000 + aa));
}

export function digitoVerificadorRfc(sinDigito: string): string {
  const base = sinDigito.length === 11 ? ` ${sinDigito}` : sinDigito;
  let suma = 0;
  for (let i = 0; i < 12; i++) {
    const idx = ALFABETO.indexOf(base[i]);
    if (idx < 0) return '?';
    suma += idx * (13 - i);
  }
  const resto = suma % 11;
  if (resto === 0) return '0';
  const dv = 11 - resto;
  return dv === 10 ? 'A' : String(dv);
}

/** Validación en vivo. "Formato válido" NUNCA se presenta como "existe en el SAT": eso solo lo confirma el proveedor de timbrado. */
export function validarRfc(valor: string): ResultadoRfc {
  const rfc = normalizarRfc(valor);
  if (!rfc) return { estado: 'vacio', mensaje: '', rfc };
  if (rfc === RFC_GENERICO_NACIONAL) return { estado: 'aviso', mensaje: 'RFC genérico: público en general', rfc, tipo: 'GENERICO_NACIONAL' };
  if (rfc === RFC_GENERICO_EXTRANJERO) return { estado: 'aviso', mensaje: 'RFC genérico: extranjero', rfc, tipo: 'GENERICO_EXTRANJERO' };
  if (!CARACTERES_RFC.test(rfc)) return { estado: 'error', mensaje: 'Solo letras, números, & y Ñ', rfc };
  if (rfc.length < 12) {
    const faltan = 12 - rfc.length;
    return { estado: 'incompleto', mensaje: `Faltan al menos ${faltan} ${faltan === 1 ? 'carácter' : 'caracteres'}`, rfc };
  }
  if (rfc.length > 13) return { estado: 'error', mensaje: 'Sobran caracteres (máximo 13)', rfc };
  const m = RFC_RE.exec(rfc);
  if (!m) {
    // 12 caracteres con 4 letras y 6 dígitos al inicio: es una persona física a la que le falta la homoclave final.
    const fisicaIncompleta = rfc.length === 12 && /^[A-ZÑ&]{4}\d{6}/.test(rfc);
    return { estado: fisicaIncompleta ? 'incompleto' : 'error', mensaje: fisicaIncompleta ? 'Persona física: falta 1 carácter' : 'El formato del RFC no es válido', rfc };
  }
  if (!fechaValida(Number(m[2]), Number(m[3]), Number(m[4]))) return { estado: 'error', mensaje: 'La fecha dentro del RFC no es válida', rfc };
  if (digitoVerificadorRfc(rfc.slice(0, -1)) !== rfc.slice(-1)) {
    return { estado: 'error', mensaje: 'El dígito verificador no coincide (revisa la última letra o número)', rfc };
  }
  const tipo: TipoRfc = m[1].length === 3 ? 'MORAL' : 'FISICA';
  return { estado: 'ok', mensaje: tipo === 'MORAL' ? 'Persona moral, formato válido' : 'Persona física, formato válido', rfc, tipo };
}

export const rfcAceptable = (r: ResultadoRfc) => r.estado === 'ok' || r.estado === 'aviso';

// ── formato de otras claves ──
export const esCodigoPostal = (v: string) => /^\d{5}$/.test(v);
export const esClaveProdServ = (v: string) => /^\d{8}$/.test(v);
export const esClaveUnidad = (v: string) => /^[A-Z0-9]{2,3}$/.test(v);
export const soloDigitos = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);
export const esCorreo = (v: string) => v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// ── regímenes aplicables [VALIDAR con el contador]: ordena primero los que suelen aplicar, sin impedir elegir otro ──
const REGIMENES_MORAL = ['601', '603', '620', '622', '623', '624'];
const REGIMENES_FISICA = ['605', '606', '607', '608', '610', '611', '612', '614', '615', '616', '621', '625', '626'];

export interface OpcionRegimen {
  codigo: string;
  texto: string;
  sugerido: boolean;
}
export function opcionesRegimen(catalogo: Record<string, string>, tipo?: TipoRfc): OpcionRegimen[] {
  const sugeridos = tipo === 'MORAL' ? REGIMENES_MORAL : tipo === 'FISICA' ? REGIMENES_FISICA : null;
  return Object.entries(catalogo)
    .map(([codigo, nombre]) => ({ codigo, texto: `${codigo} · ${nombre}`, sugerido: sugeridos ? sugeridos.includes(codigo) : true }))
    .sort((a, b) => Number(b.sugerido) - Number(a.sugerido) || a.codigo.localeCompare(b.codigo));
}

// ── pestañas y atajos ──
export const PESTANAS = ['emisor', 'sucursales', 'productos', 'receptores'] as const;
export type Pestana = (typeof PESTANAS)[number];
export const ETIQUETA_PESTANA: Record<Pestana, string> = { emisor: 'Emisor', sucursales: 'Sucursales', productos: 'Productos', receptores: 'Receptores' };

export function pestanaRelativa(actual: Pestana, delta: 1 | -1): Pestana {
  const i = PESTANAS.indexOf(actual);
  return PESTANAS[(i + delta + PESTANAS.length) % PESTANAS.length];
}

/** Alt+Shift+1…4. Se usa `code` (no `key`) para no depender de la distribución del teclado, y NO se pisa Alt+1…4 del ERP. */
export function pestanaDeAtajo(e: { altKey: boolean; shiftKey: boolean; ctrlKey: boolean; metaKey?: boolean; code: string }): Pestana | null {
  if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return null;
  const m = /^Digit([1-4])$/.exec(e.code);
  return m ? PESTANAS[Number(m[1]) - 1] : null;
}

// ── nombres en vez de ids ──
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
export const contieneUuid = (texto: string) => UUID_RE.test(texto);

// ── preparación para facturar ──
export interface ResumenFiscal {
  empresas: { companyId: string; empresa: string; emisorCompleto: boolean; facturacionActiva: boolean; sucursalesTotal: number; sucursalesConCp: number }[];
  productos: { total: number; conClaves: number; pendientes: number };
}
export interface PasoPreparacion {
  clave: 'emisor' | 'sucursales' | 'productos' | 'csd' | 'proveedor';
  texto: string;
  estado: 'listo' | 'pendiente' | 'proximamente';
  pestana?: Pestana;
}

export function pasosPreparacion(r: ResumenFiscal | null): PasoPreparacion[] {
  const empresas = r?.empresas ?? [];
  const sinEmisor = empresas.filter((e) => !e.emisorCompleto);
  const sucTotal = empresas.reduce((s, e) => s + e.sucursalesTotal, 0);
  const sucCp = empresas.reduce((s, e) => s + e.sucursalesConCp, 0);
  const p = r?.productos ?? { total: 0, conClaves: 0, pendientes: 0 };
  return [
    {
      clave: 'emisor',
      texto: !empresas.length ? 'Emisor: no hay empresas' : sinEmisor.length ? (sinEmisor.length <= 2 ? `Emisor: falta en ${sinEmisor.map((e) => e.empresa).join(', ')}` : `Emisor: falta en ${sinEmisor.length} empresas`) : 'Emisor completo',
      estado: empresas.length && !sinEmisor.length ? 'listo' : 'pendiente',
      pestana: 'emisor',
    },
    { clave: 'sucursales', texto: `Sucursales con CP: ${sucCp} de ${sucTotal}`, estado: sucTotal > 0 && sucCp === sucTotal ? 'listo' : 'pendiente', pestana: 'sucursales' },
    { clave: 'productos', texto: `Productos con claves SAT: ${p.conClaves} de ${p.total}`, estado: p.total > 0 && p.pendientes === 0 ? 'listo' : 'pendiente', pestana: 'productos' },
    { clave: 'csd', texto: 'CSD', estado: 'proximamente' },
    { clave: 'proveedor', texto: 'Proveedor', estado: 'proximamente' },
  ];
}

/** "Facturación activa" solo se habilita con los pasos 1 a 3 listos Y con CSD y proveedor (P-03): en F0 nunca se puede activar. */
export function puedeActivarFacturacion(pasos: PasoPreparacion[]): { puede: boolean; motivo: string } {
  const faltan = pasos.filter((p) => p.estado !== 'listo');
  if (!faltan.length) return { puede: true, motivo: '' };
  const pendientes = faltan.filter((p) => p.estado === 'pendiente');
  if (pendientes.length) return { puede: false, motivo: `Completa antes: ${pendientes.map((p) => p.texto.split(':')[0].toLowerCase()).join(', ')}.` };
  return { puede: false, motivo: 'Necesita certificado (CSD) y proveedor de timbrado, que llegan en una fase posterior.' };
}

// ── productos ──
export interface FormProducto {
  claveProdServ: string;
  claveUnidad: string;
  unidadNombre: string;
  objetoImp: string;
}
export const FORM_PRODUCTO_VACIO: FormProducto = { claveProdServ: '', claveUnidad: '', unidadNombre: '', objetoImp: '' };

export const UNIDADES_COMUNES: { clave: string; nombre: string }[] = [
  { clave: 'H87', nombre: 'Pieza' },
  { clave: 'E48', nombre: 'Servicio' },
  { clave: 'ACT', nombre: 'Actividad' },
  { clave: 'KGM', nombre: 'Kilogramo' },
  { clave: 'GRM', nombre: 'Gramo' },
  { clave: 'LTR', nombre: 'Litro' },
  { clave: 'XBX', nombre: 'Caja' },
  { clave: 'XPK', nombre: 'Paquete' },
  { clave: 'MON', nombre: 'Mes' },
  { clave: 'DAY', nombre: 'Día' },
  { clave: 'HUR', nombre: 'Hora' },
];

export const MENSAJE_CLAVE_CONTADOR = 'La clave de producto/servicio (8 dígitos) la entrega tu contador.';

export function validarFormProducto(f: FormProducto): string[] {
  const errores: string[] = [];
  if (!f.claveProdServ.trim()) errores.push(MENSAJE_CLAVE_CONTADOR);
  else if (!esClaveProdServ(f.claveProdServ.trim())) errores.push('La clave de producto/servicio debe tener 8 dígitos.');
  if (!esClaveUnidad(f.claveUnidad.trim().toUpperCase())) errores.push('Elige o escribe la clave de unidad (2 o 3 caracteres, p. ej. H87).');
  if (!['01', '02', '03', '04'].includes(f.objetoImp)) errores.push('Elige el objeto de impuesto.');
  if (f.unidadNombre.length > 40) errores.push('El nombre de la unidad admite máximo 40 caracteres.');
  return errores;
}

export interface SugerenciaCategoria {
  categoriaId: string | null;
  categoria: string;
  productosPendientes: number;
  claveProdServ: string | null;
  claveUnidad: string;
  unidadNombre: string;
  objetoImp: string;
}
/** Una sugerencia se vuelca al formulario SIN clave de producto/servicio: esa la entrega el contador. */
export function formDeSugerencia(s: SugerenciaCategoria): FormProducto {
  return { claveProdServ: '', claveUnidad: s.claveUnidad, unidadNombre: s.unidadNombre, objetoImp: s.objetoImp };
}

export const textoObjetoImp = (catalogo: Record<string, string>, codigo: string | null) => (codigo ? `${codigo} · ${catalogo[codigo] ?? 'Desconocido'}` : '—');
export const textoIva = (tasa: string | null) => (tasa === null ? 'Negocio' : tasa === 'EXENTO' ? 'Exento' : `${tasa} %`);

export function textoPagina(page: number, paginas: number, total: number, singular = 'producto', plural = 'productos'): string {
  return total === 0 ? 'Sin resultados' : `Pág. ${page} de ${paginas} · ${total} ${total === 1 ? singular : plural}`;
}
export const paginaSiguiente = (page: number, paginas: number) => Math.min(paginas, page + 1);
export const paginaAnterior = (page: number) => Math.max(1, page - 1);

// ── receptores ──
export interface FormReceptor {
  rfc: string;
  nombreFiscal: string;
  codigoPostal: string;
  regimenFiscal: string;
  usoCfdiDefault: string;
  email: string;
}
export const FORM_RECEPTOR_VACIO: FormReceptor = { rfc: '', nombreFiscal: '', codigoPostal: '', regimenFiscal: '', usoCfdiDefault: '', email: '' };

/** Al teclear el RFC genérico se proponen régimen y uso del público en general [VALIDAR]. */
export function completarGenerico(f: FormReceptor): FormReceptor {
  const r = normalizarRfc(f.rfc);
  if (r === RFC_GENERICO_NACIONAL) return { ...f, rfc: r, nombreFiscal: f.nombreFiscal || 'PUBLICO EN GENERAL', regimenFiscal: f.regimenFiscal || '616', usoCfdiDefault: f.usoCfdiDefault || 'S01' };
  if (r === RFC_GENERICO_EXTRANJERO) return { ...f, rfc: r, regimenFiscal: f.regimenFiscal || '616', usoCfdiDefault: f.usoCfdiDefault || 'S01' };
  return f;
}

export function validarFormReceptor(f: FormReceptor): string[] {
  const errores: string[] = [];
  const r = validarRfc(f.rfc);
  if (!rfcAceptable(r)) errores.push(r.estado === 'vacio' ? 'Escribe el RFC.' : `RFC: ${r.mensaje}.`);
  if (!f.nombreFiscal.trim()) errores.push('Escribe el nombre fiscal.');
  if (!esCodigoPostal(f.codigoPostal)) errores.push('El código postal fiscal debe ser de 5 dígitos.');
  if (!f.regimenFiscal) errores.push('Elige el régimen fiscal.');
  if (f.email.trim() && !esCorreo(f.email.trim())) errores.push('El correo no es válido.');
  return errores;
}

export interface FormEmisor {
  rfc: string;
  nombreFiscal: string;
  regimenFiscal: string;
  serie: string;
}
export function validarFormEmisor(f: FormEmisor): string[] {
  const errores: string[] = [];
  const r = validarRfc(f.rfc);
  if (r.estado !== 'ok') errores.push(r.estado === 'vacio' ? 'Escribe el RFC.' : r.estado === 'aviso' ? 'El emisor no puede usar un RFC genérico.' : `RFC: ${r.mensaje}.`);
  if (!f.nombreFiscal.trim()) errores.push('Escribe el nombre fiscal, igual que en tu constancia.');
  if (!f.regimenFiscal) errores.push('Elige el régimen fiscal.');
  if (f.serie.trim() && !/^[A-Za-z0-9]{1,25}$/.test(f.serie.trim())) errores.push('La serie solo admite letras y números.');
  return errores;
}

export const hayCambios = <T extends object>(a: T, b: T) => JSON.stringify(a) !== JSON.stringify(b);

export function mensajeErrorApi(e: unknown, defecto = 'No se pudo completar la operación.'): string {
  const m = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(m)) return m.join(' · ');
  return typeof m === 'string' && m ? m : defecto;
}

// ── presupuesto vertical a 1366×768 (documentado en el diseño; el spec lo comprueba) ──
export const PRESUPUESTO_VERTICAL = { barraErp: 92, titulo: 36, pestanas: 40, herramientas: 44, leyenda: 28, margenes: 24, alturaFila: 30, encabezadoTabla: 32, filasPorPagina: 15 };
export function alturaMinimaProductos(p = PRESUPUESTO_VERTICAL): number {
  return p.barraErp + p.titulo + p.pestanas + p.herramientas + p.encabezadoTabla + p.filasPorPagina * p.alturaFila + p.leyenda + p.margenes;
}
