import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../core/api/api';
import { CONFIG_PRUEBA, PruebaLayout, PruebaNoDisponible, cls } from './PruebaLayout';
import MarcoMonitor from './MarcoMonitor';
import { useTurnstile } from './useTurnstile';
import {
  GIROS_OTROS, GIROS_TARJETA, TARJETA_OTRO, cuerpoSolicitud, mensajeDeError, primerCampoConError, validarSolicitud,
  type CampoSolicitud, type SolicitudForm,
} from './pruebaLogic';
import { BLOQUES, CAPTURAS, CORREO_CONTACTO, HERO, PASOS_COMO_FUNCIONA, limitesDeGiro } from './aterrizaje';

const VACIO: SolicitudForm = { nombre: '', correo: '', negocio: '', giro: 'gimnasio', aceptaAviso: false, captcha: '' };

// /prueba — página de aterrizaje y formulario público. Teclado primero: el botón «Comenzar…» lleva el foco al selector de giro (flechas para
// elegir), Tab recorre los campos, Espacio marca la casilla, Enter envía y, si algo falta, el foco salta al primer campo con error.
// Sin sesión; no llama a nada si la prueba está apagada. «Otro giro» despliega la lista de los demás giros que sí tienen alta completa.
export default function SolicitudPage() {
  if (!CONFIG_PRUEBA.activa) return <PruebaNoDisponible />;
  return <Aterrizaje />;
}

function Aterrizaje() {
  const [f, setF] = useState<SolicitudForm>(VACIO);
  const [errores, setErrores] = useState<Partial<Record<CampoSolicitud, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState('');
  const ts = useTurnstile(CONFIG_PRUEBA.siteKey, !listo);
  const enviandoRef = useRef(false);
  // «Otro giro»: abre la lista de los demás giros disponibles (hoy solo el genérico).
  const [otroAbierto, setOtroAbierto] = useState(false);
  const idGiroActivo = otroAbierto ? `giro-${TARJETA_OTRO}` : `giro-${f.giro}`;

  useEffect(() => { setF((x) => ({ ...x, captcha: ts.token })); }, [ts.token]);

  const poner = <K extends keyof SolicitudForm>(k: K, v: SolicitudForm[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrores((e) => ({ ...e, [k]: undefined }));
  };

  const enfocar = (c: CampoSolicitud) => {
    const id = c === 'captcha' ? 'campo-captcha' : c === 'giro' ? idGiroActivo : `campo-${c}`;
    (document.getElementById(id) as HTMLElement | null)?.focus();
  };

  const irAlFormulario = () => {
    document.getElementById('comenzar')?.scrollIntoView({ block: 'start' });
    (document.getElementById(idGiroActivo) as HTMLElement | null)?.focus({ preventScroll: true });
  };

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    if (enviandoRef.current) return; // Enter repetido no manda dos solicitudes
    const e = validarSolicitud(f);
    setErrores(e);
    setErrorGeneral('');
    const primero = primerCampoConError(e);
    if (primero) { enfocar(primero); return; }
    enviandoRef.current = true;
    setEnviando(true);
    try {
      const r = await api.post('/prueba/solicitar', cuerpoSolicitud(f));
      setListo(r.data?.mensaje || 'Revisa tu correo: te enviamos el enlace para activar tu prueba.');
    } catch (err) {
      setErrorGeneral(mensajeDeError(err));
      ts.reiniciar(); // el token de Turnstile es de un solo uso
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  const limites = limitesDeGiro(f.giro);

  return (
    <PruebaLayout pagina>
      <div className="max-w-[1120px] mx-auto">
        {/* ── Hero ── */}
        <section aria-labelledby="titulo-prueba" className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] gap-10 lg:gap-14 items-center py-6 lg:py-12">
          <div>
            <h1 id="titulo-prueba" className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-[1.15] tracking-tight">{HERO.titulo}</h1>
            <p className="text-base lg:text-lg text-content-2 mt-4 max-w-[34rem]">{HERO.subtitulo}</p>
            <button type="button" onClick={irAlFormulario} className={`${cls.primario} mt-7 !h-12 !px-6 !text-base`}>{HERO.cta}</button>
          </div>
          <MarcoMonitor src={CAPTURAS.hero.src} alt={CAPTURAS.hero.alt} prioridad />
        </section>

        {/* ── Selector de giro + formulario ── */}
        <section id="comenzar" aria-labelledby="titulo-form" className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)] gap-8 lg:gap-14 items-start py-8 lg:py-12 scroll-mt-4">
          <div>
            <h2 id="titulo-form" className="text-2xl lg:text-3xl font-bold tracking-tight">Pide tu prueba gratuita</h2>
            <p className="text-sm text-content-2 mt-2 max-w-[30rem]">Elige tu giro y déjanos tu correo. Te enviamos el enlace para activar tu negocio de ejemplo.</p>
            <div className="mt-6 pl-4 border-l border-line max-w-[30rem]" aria-live="polite">
              <h3 className="text-xs font-medium text-content-3 mb-2">Lo que esta prueba no tiene</h3>
              <ul className="space-y-1.5">
                {limites.map((l) => (
                  <li key={l.id} className="text-xs text-content-3"><span className="font-semibold text-content-2">{l.titulo}.</span> {l.detalle}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface-1 p-5 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
            {listo ? (
              <div role="status">
                <h3 className="text-base font-semibold mb-2">Revisa tu correo</h3>
                <p className="text-sm text-content-2">{listo}</p>
                <p className="text-xs text-content-3 mt-3">El enlace es de un solo uso y vence en 30 minutos.</p>
              </div>
            ) : (
              <form onSubmit={enviar} noValidate aria-describedby={errorGeneral ? 'error-general' : undefined}>
                <fieldset aria-describedby={errores.giro ? 'err-giro' : undefined}>
                  <legend className={`${cls.label} !mb-2`}>Tu giro</legend>
                  <div className="grid grid-cols-1 min-[440px]:grid-cols-2 gap-2">
                    {GIROS_TARJETA.map((g) => (
                      <div key={g.valor}>
                      <label className="relative block min-w-0 cursor-pointer">
                        <input type="radio" name="giro" id={`giro-${g.valor}`} value={g.valor} checked={!otroAbierto && f.giro === g.valor} className="peer sr-only"
                          aria-invalid={!!errores.giro} onChange={() => { setOtroAbierto(false); poner('giro', g.valor); }} />
                        <span className="flex items-center min-h-12 px-3 py-1.5 rounded-lg border border-line-field bg-field text-sm text-content-1 peer-checked:border-[rgb(var(--accent))] peer-checked:bg-surface-2 peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-[rgb(var(--focus))]">{g.etiqueta}</span>
                      </label>
                      </div>
                    ))}
                    <div>
                      <label className="relative block min-w-0 cursor-pointer">
                        <input type="radio" name="giro" id={`giro-${TARJETA_OTRO}`} value={TARJETA_OTRO} checked={otroAbierto} className="peer sr-only"
                          aria-invalid={!!errores.giro} onChange={() => { setOtroAbierto(true); poner('giro', GIROS_OTROS[0].valor); }} />
                        <span className="flex items-center min-h-12 px-3 py-1.5 rounded-lg border border-line-field bg-field text-sm text-content-1 peer-checked:border-[rgb(var(--accent))] peer-checked:bg-surface-2 peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-[rgb(var(--focus))]">Otro giro</span>
                      </label>
                    </div>
                  </div>
                  {otroAbierto && (
                    <div className="mt-2">
                      <label htmlFor="campo-giro-otro" className={cls.label}>¿Qué tipo de negocio es?</label>
                      <select id="campo-giro-otro" className={cls.input} value={f.giro} onChange={(e) => poner('giro', e.target.value)}>
                        {GIROS_OTROS.map((g) => <option key={g.valor} value={g.valor}>{g.etiqueta}</option>)}
                      </select>
                    </div>
                  )}
                  {errores.giro && <p id="err-giro" className={cls.error}>{errores.giro}</p>}
                </fieldset>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 mt-4">
                  <div>
                    <label htmlFor="campo-nombre" className={cls.label}>Tu nombre</label>
                    <input id="campo-nombre" className={cls.input} value={f.nombre} maxLength={120} autoComplete="name"
                      aria-invalid={!!errores.nombre} aria-describedby={errores.nombre ? 'err-nombre' : undefined} onChange={(e) => poner('nombre', e.target.value)} />
                    {errores.nombre && <p id="err-nombre" className={cls.error}>{errores.nombre}</p>}
                  </div>
                  <div>
                    <label htmlFor="campo-correo" className={cls.label}>Correo</label>
                    <input id="campo-correo" type="email" className={cls.input} value={f.correo} maxLength={254} autoComplete="email"
                      aria-invalid={!!errores.correo} aria-describedby={errores.correo ? 'err-correo' : undefined} onChange={(e) => poner('correo', e.target.value)} />
                    {errores.correo && <p id="err-correo" className={cls.error}>{errores.correo}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="campo-negocio" className={cls.label}>Nombre de tu negocio</label>
                    <input id="campo-negocio" className={cls.input} value={f.negocio} maxLength={120} autoComplete="organization"
                      aria-invalid={!!errores.negocio} aria-describedby={errores.negocio ? 'err-negocio' : undefined} onChange={(e) => poner('negocio', e.target.value)} />
                    {errores.negocio && <p id="err-negocio" className={cls.error}>{errores.negocio}</p>}
                  </div>
                </div>

                <div className="mt-3">
                  <label className="flex items-start gap-2 text-sm cursor-pointer">
                    <input id="campo-aceptaAviso" type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--accent))]" checked={f.aceptaAviso}
                      aria-invalid={!!errores.aceptaAviso} aria-describedby={errores.aceptaAviso ? 'err-aviso' : undefined} onChange={(e) => poner('aceptaAviso', e.target.checked)} />
                    <span>
                      He leído y acepto el{' '}
                      <a href={CONFIG_PRUEBA.avisoUrl} target="_blank" rel="noopener noreferrer" className="underline text-accent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))] rounded">aviso de privacidad</a>
                      .
                    </span>
                  </label>
                  {errores.aceptaAviso && <p id="err-aviso" className={cls.error}>{errores.aceptaAviso}</p>}
                </div>

                <div className="mt-3">
                  <div id="campo-captcha" ref={ts.contenedor} tabIndex={-1} className="min-h-[65px] rounded-md" aria-label="Verificación de que eres una persona" />
                  {(errores.captcha || ts.error) && <p className={cls.error}>{ts.error || errores.captcha}</p>}
                </div>

                <div aria-live="polite" id="error-general">
                  {errorGeneral && <p role="alert" className="mt-3 text-sm rounded-md border border-line px-3 py-2 text-danger bg-surface-2">{errorGeneral}</p>}
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <button type="submit" className={cls.primario} disabled={enviando}>
                    {enviando ? 'Enviando…' : 'Pedir mi prueba'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* ── Tres bloques ── */}
        <section aria-labelledby="titulo-bloques" className="py-8 lg:py-12">
          <h2 id="titulo-bloques" className="text-2xl lg:text-3xl font-bold tracking-tight max-w-[34rem]">Lo esencial para operar, en un solo lugar.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            {BLOQUES.map((b) => (
              <article key={b.id}>
                <MarcoMonitor src={CAPTURAS[b.captura].src} alt={CAPTURAS[b.captura].alt} />
                <h3 className="text-lg font-semibold mt-5">{b.titulo}</h3>
                <p className="text-sm text-content-2 mt-1.5">{b.texto}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Cómo funciona ── */}
        <section aria-labelledby="titulo-pasos" className="py-8 lg:py-12">
          <h2 id="titulo-pasos" className="text-2xl lg:text-3xl font-bold tracking-tight">Cómo funciona</h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {PASOS_COMO_FUNCIONA.map((p) => (
              <li key={p.n} className="rounded-2xl border border-line bg-surface-1 p-5">
                <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-on-accent text-sm font-bold">{p.n}</span>
                <h3 className="text-base font-semibold mt-3"><span className="sr-only">Paso {p.n}: </span>{p.titulo}</h3>
                <p className="text-sm text-content-2 mt-1">{p.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Pie ── */}
        <footer className="border-t border-line mt-6 py-6 text-sm text-content-2 flex flex-wrap items-center justify-between gap-3">
          <p>¿Dudas? Escríbenos a{' '}
            <a href={`mailto:${CORREO_CONTACTO}`} className="underline text-accent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))] rounded">{CORREO_CONTACTO}</a>
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <a href={CONFIG_PRUEBA.avisoUrl} target="_blank" rel="noopener noreferrer" className="underline focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))] rounded">Aviso de privacidad</a>
            <Link to="/login" className="underline focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))] rounded">Iniciar sesión</Link>
          </p>
        </footer>
      </div>
    </PruebaLayout>
  );
}
