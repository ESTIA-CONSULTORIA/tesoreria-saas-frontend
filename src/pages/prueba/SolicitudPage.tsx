import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../../core/api/api';
import { CONFIG_PRUEBA, PruebaLayout, PruebaNoDisponible, cls } from './PruebaLayout';
import { useTurnstile } from './useTurnstile';
import {
  DIAS_PRUEBA, GIROS_FORM, INCLUYE, LIMITES, cuerpoSolicitud, mensajeDeError, primerCampoConError, validarSolicitud,
  type CampoSolicitud, type SolicitudForm,
} from './pruebaLogic';

const VACIO: SolicitudForm = { nombre: '', correo: '', negocio: '', giro: 'gimnasio', aceptaAviso: false, captcha: '' };

// /prueba — formulario público. Teclado primero: el foco arranca en «Nombre», Tab recorre los campos, Espacio marca la casilla,
// Enter envía y, si algo falta, el foco salta al primer campo con error. Sin sesión; no llama a nada si la prueba está apagada.
export default function SolicitudPage() {
  if (!CONFIG_PRUEBA.activa) return <PruebaNoDisponible />;
  return <Formulario />;
}

function Formulario() {
  const [f, setF] = useState<SolicitudForm>(VACIO);
  const [errores, setErrores] = useState<Partial<Record<CampoSolicitud, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState('');
  const ts = useTurnstile(CONFIG_PRUEBA.siteKey, !listo);
  const nombreRef = useRef<HTMLInputElement>(null);
  const enviandoRef = useRef(false);

  useEffect(() => { nombreRef.current?.focus(); }, []);
  useEffect(() => { setF((x) => ({ ...x, captcha: ts.token })); }, [ts.token]);

  const poner = <K extends keyof SolicitudForm>(k: K, v: SolicitudForm[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrores((e) => ({ ...e, [k]: undefined }));
  };

  const enfocar = (c: CampoSolicitud) => {
    const el = document.getElementById(c === 'captcha' ? 'campo-captcha' : `campo-${c}`);
    (el as HTMLElement | null)?.focus();
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

  return (
    <PruebaLayout>
      <div className="h-full grid grid-cols-[minmax(0,540px)_minmax(0,1fr)] gap-8 max-w-[1180px] mx-auto">
        <section aria-labelledby="titulo-prueba" className="min-h-0">
          <h1 id="titulo-prueba" className="text-xl font-semibold leading-tight mb-3">Prueba ESTIA gratis por {DIAS_PRUEBA} días</h1>

          {listo ? (
            <div role="status" className="rounded-xl border border-line bg-surface-1 p-5">
              <h2 className="text-base font-semibold mb-2">Revisa tu correo</h2>
              <p className="text-sm text-content-2">{listo}</p>
              <p className="text-xs text-content-3 mt-3">El enlace es de un solo uso y vence en 30 minutos.</p>
            </div>
          ) : (
            <form onSubmit={enviar} noValidate aria-describedby={errorGeneral ? 'error-general' : undefined}>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <div>
                  <label htmlFor="campo-nombre" className={cls.label}>Tu nombre</label>
                  <input id="campo-nombre" ref={nombreRef} className={cls.input} value={f.nombre} maxLength={120} autoComplete="name"
                    aria-invalid={!!errores.nombre} aria-describedby={errores.nombre ? 'err-nombre' : undefined} onChange={(e) => poner('nombre', e.target.value)} />
                  {errores.nombre && <p id="err-nombre" className={cls.error}>{errores.nombre}</p>}
                </div>
                <div>
                  <label htmlFor="campo-correo" className={cls.label}>Correo</label>
                  <input id="campo-correo" type="email" className={cls.input} value={f.correo} maxLength={254} autoComplete="email"
                    aria-invalid={!!errores.correo} aria-describedby={errores.correo ? 'err-correo' : undefined} onChange={(e) => poner('correo', e.target.value)} />
                  {errores.correo && <p id="err-correo" className={cls.error}>{errores.correo}</p>}
                </div>
                <div>
                  <label htmlFor="campo-negocio" className={cls.label}>Nombre de tu negocio</label>
                  <input id="campo-negocio" className={cls.input} value={f.negocio} maxLength={120} autoComplete="organization"
                    aria-invalid={!!errores.negocio} aria-describedby={errores.negocio ? 'err-negocio' : undefined} onChange={(e) => poner('negocio', e.target.value)} />
                  {errores.negocio && <p id="err-negocio" className={cls.error}>{errores.negocio}</p>}
                </div>
                <div>
                  <label htmlFor="campo-giro" className={cls.label}>Giro</label>
                  <select id="campo-giro" className={cls.input} value={f.giro} aria-invalid={!!errores.giro} onChange={(e) => poner('giro', e.target.value)}>
                    {GIROS_FORM.map((g) => <option key={g.valor} value={g.valor} disabled={!g.disponible}>{g.etiqueta}</option>)}
                  </select>
                  {errores.giro && <p className={cls.error}>{errores.giro}</p>}
                </div>
              </div>

              <div className="mt-3">
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input id="campo-aceptaAviso" type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--accent))]" checked={f.aceptaAviso}
                    aria-invalid={!!errores.aceptaAviso} aria-describedby={errores.aceptaAviso ? 'err-aviso' : undefined} onChange={(e) => poner('aceptaAviso', e.target.checked)} />
                  <span>
                    He leído y acepto el{' '}
                    <a href={CONFIG_PRUEBA.avisoUrl} target="_blank" rel="noopener noreferrer" className="underline text-accent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))] rounded">aviso de privacidad</a>
                    {' '}(se abre en otra pestaña).
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
                <button type="submit" className={cls.primario} disabled={enviando}>{enviando ? 'Enviando…' : 'Pedir mi prueba'}</button>
              </div>
            </form>
          )}
        </section>

        <section className="min-h-0" aria-label="Qué incluye y qué no">
          <h2 className="text-sm font-semibold text-content-2 uppercase tracking-wider mb-2">Qué incluye</h2>
          <ul className="space-y-1.5 mb-4">
            {INCLUYE.map((t) => (
              <li key={t} className="flex gap-2 text-sm"><span aria-hidden className="text-ok">✓</span><span>{t}</span></li>
            ))}
          </ul>
          <h2 className="text-sm font-semibold text-content-2 uppercase tracking-wider mb-2">Lo que esta prueba NO tiene</h2>
          <ul className="space-y-2">
            {LIMITES.map((l) => (
              <li key={l.id} className="rounded-lg border border-line bg-surface-1 px-3 py-2">
                <p className="text-sm font-semibold"><span aria-hidden className="text-warn mr-1.5">!</span>{l.titulo}</p>
                <p className="text-xs text-content-2 mt-0.5">{l.detalle}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PruebaLayout>
  );
}
