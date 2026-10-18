import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../core/api/api';
import { CONFIG_PRUEBA, PruebaLayout, PruebaNoDisponible, cls } from './PruebaLayout';
import { DIAS_PRUEBA, PASOS_PRUEBA, esNipValido, fechaLarga, guardarNipSesion, leerTokenDeHash, mensajeDeError, validarActivacion } from './pruebaLogic';

// /prueba/activar#token=… — la persona elige su contraseña y se crea su negocio de prueba. El token se lee del fragmento y se BORRA
// de la barra de direcciones en cuanto se lee (no queda en el historial ni se comparte por accidente). Si la prueba está apagada,
// no lee ni envía nada.
export default function ActivarPage() {
  if (!CONFIG_PRUEBA.activa) return <PruebaNoDisponible />;
  return <Activacion />;
}

type Estado = { tipo: 'sin-token' } | { tipo: 'formulario' } | { tipo: 'listo'; slug: string; venceEn: string; socioNip: string; socioNumero: string } | { tipo: 'fallo'; mensaje: string };

function Activacion() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>({ tipo: 'formulario' });
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [ver, setVer] = useState(false);
  const [errores, setErrores] = useState<{ password?: string; confirmacion?: string }>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  const passRef = useRef<HTMLInputElement>(null);
  const entrarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const t = leerTokenDeHash(window.location.hash);
    if (!t) { setEstado({ tipo: 'sin-token' }); return; }
    setToken(t);
    window.history.replaceState(null, '', window.location.pathname); // el token ya no queda a la vista
  }, []);

  useEffect(() => {
    if (estado.tipo === 'formulario') passRef.current?.focus();
    if (estado.tipo === 'listo') entrarRef.current?.focus();
  }, [estado.tipo]);

  async function activar(ev: FormEvent) {
    ev.preventDefault();
    if (enviandoRef.current || !token) return;
    const e = validarActivacion(password, confirmacion);
    setErrores(e);
    setErrorGeneral('');
    if (e.password) { document.getElementById('campo-password')?.focus(); return; }
    if (e.confirmacion) { document.getElementById('campo-confirmacion')?.focus(); return; }
    enviandoRef.current = true;
    setEnviando(true);
    try {
      const r = await api.post('/prueba/activar', { token, password });
      setPassword(''); setConfirmacion('');
      setToken(null); // de un solo uso: ya no sirve
      const socioNip = esNipValido(r.data?.socioNip) ? r.data.socioNip : '';
      const socioNumero = String(r.data?.socioNumero ?? '1');
      // El servidor lo muestra una sola vez y no lo guarda en claro; aquí solo se conserva en esta pestaña (sessionStorage) para la guía.
      try { guardarNipSesion(sessionStorage, { numero: socioNumero, nip: socioNip }); } catch { /* sin almacenamiento */ }
      setEstado({ tipo: 'listo', slug: String(r.data?.slug ?? ''), venceEn: String(r.data?.venceEn ?? ''), socioNip, socioNumero });
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = mensajeDeError(err);
      // Un enlace inválido/vencido no se arregla reintentando: se ofrece pedir otro. Un 503 sí puede reintentarse con otro enlace.
      if (status === 400 && /enlace/i.test(msg)) setEstado({ tipo: 'fallo', mensaje: msg });
      else if (status === 503) setEstado({ tipo: 'fallo', mensaje: msg });
      else setErrorGeneral(msg);
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  return (
    <PruebaLayout>
      <div className="h-full flex items-start justify-center pt-6">
        <div className="w-full max-w-[560px]">
          {estado.tipo === 'sin-token' && (
            <Aviso titulo="Este enlace no está completo" texto="Abre el enlace del correo tal como llegó, o pide uno nuevo." />
          )}
          {estado.tipo === 'fallo' && <Aviso titulo="No pudimos activar tu prueba" texto={estado.mensaje} />}

          {estado.tipo === 'formulario' && (
            <form onSubmit={activar} noValidate className="rounded-xl border border-line bg-surface-1 p-6">
              <h1 className="text-xl font-semibold">Elige tu contraseña</h1>
              <p className="text-sm text-content-2 mt-1 mb-4">Con ella entrarás a tu prueba de {DIAS_PRUEBA} días. Mínimo 10 caracteres, con letras y números.</p>
              <div className="mb-3">
                <label htmlFor="campo-password" className={cls.label}>Contraseña</label>
                <input id="campo-password" ref={passRef} type={ver ? 'text' : 'password'} className={cls.input} value={password} autoComplete="new-password"
                  aria-invalid={!!errores.password} aria-describedby={errores.password ? 'err-password' : undefined}
                  onChange={(e) => { setPassword(e.target.value); setErrores((x) => ({ ...x, password: undefined })); }} />
                {errores.password && <p id="err-password" className={cls.error}>{errores.password}</p>}
              </div>
              <div className="mb-3">
                <label htmlFor="campo-confirmacion" className={cls.label}>Repite la contraseña</label>
                <input id="campo-confirmacion" type={ver ? 'text' : 'password'} className={cls.input} value={confirmacion} autoComplete="new-password"
                  aria-invalid={!!errores.confirmacion} aria-describedby={errores.confirmacion ? 'err-conf' : undefined}
                  onChange={(e) => { setConfirmacion(e.target.value); setErrores((x) => ({ ...x, confirmacion: undefined })); }} />
                {errores.confirmacion && <p id="err-conf" className={cls.error}>{errores.confirmacion}</p>}
              </div>
              <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
                <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent))]" checked={ver} onChange={(e) => setVer(e.target.checked)} /> Mostrar contraseñas
              </label>
              <div aria-live="polite">{errorGeneral && <p role="alert" className="mb-3 text-sm rounded-md border border-line px-3 py-2 text-danger bg-surface-2">{errorGeneral}</p>}</div>
              <div className="flex items-center gap-3">
                <button type="submit" className={cls.primario} disabled={enviando}>{enviando ? 'Creando tu prueba…' : 'Activar mi prueba'}</button>
                <span className="text-xs text-content-3">Enter: activar</span>
              </div>
            </form>
          )}

          {estado.tipo === 'listo' && (
            <section className="rounded-xl border border-line bg-surface-1 p-6" aria-labelledby="titulo-listo">
              <h1 id="titulo-listo" className="text-xl font-semibold">¡Tu prueba está lista!</h1>
              <p className="text-sm text-content-2 mt-1">
                Dura hasta el <strong className="text-content-1">{estado.venceEn ? fechaLarga(estado.venceEn) : `${DIAS_PRUEBA} días`}</strong>. Entra con tu correo y la contraseña que acabas de elegir.
              </p>
              {estado.socioNip && (
                <div className="mt-4 rounded-lg border border-line-field bg-surface-2 px-4 py-3" role="note">
                  <p className="text-xs text-content-2">NIP del socio de ejemplo (n.º {estado.socioNumero}) — para el check-in</p>
                  <p className="text-2xl font-semibold tracking-[0.3em] tabular-nums" aria-label={`NIP ${estado.socioNip.split('').join(' ')}`}>{estado.socioNip}</p>
                  <p className="text-xs text-content-3 mt-1">Anótalo: no lo guardamos y no se vuelve a mostrar. En la guía lo verás mientras no cierres esta pestaña; después puedes cambiarlo en Membresías → Socios.</p>
                </div>
              )}
              <h2 className="text-xs font-semibold text-content-2 uppercase tracking-wider mt-4 mb-2">Al entrar te guiaremos en 5 pasos</h2>
              <ol className="space-y-1 mb-4">
                {PASOS_PRUEBA.map((p, i) => <li key={p.id} className="text-sm flex gap-2"><span className="text-content-3 w-4">{i + 1}.</span>{p.titulo}</li>)}
              </ol>
              <div className="flex items-center gap-3">
                <button ref={entrarRef} className={cls.primario} onClick={() => navigate(estado.slug ? `/login?tenant=${encodeURIComponent(estado.slug)}` : '/login')}>Entrar a mi prueba</button>
                <span className="text-xs text-content-3">Enter: entrar</span>
              </div>
            </section>
          )}
        </div>
      </div>
    </PruebaLayout>
  );
}

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div role="alert" className="rounded-xl border border-line bg-surface-1 p-6">
      <h1 className="text-lg font-semibold mb-1">{titulo}</h1>
      <p className="text-sm text-content-2 mb-4">{texto}</p>
      <Link ref={ref} to="/prueba" className={`${cls.primario} inline-flex items-center`}>Pedir un enlace nuevo</Link>
    </div>
  );
}
