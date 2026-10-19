import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { leerConfigPrueba } from './pruebaLogic';
import FondoMarca from './FondoMarca';
import './prueba.css';

// Configuración leída UNA vez al compilar. Sin las variables VITE_PRUEBA_* la prueba pública está apagada.
export const CONFIG_PRUEBA = leerConfigPrueba(import.meta.env as unknown as Record<string, string | undefined>);

export const cls = {
  input: 'w-full h-9 px-3 rounded-md text-sm border bg-field text-content-1 border-line-field focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))]',
  label: 'block text-xs font-medium text-content-2 mb-1',
  error: 'text-xs mt-1 text-danger',
  primario: 'h-10 px-4 rounded-md text-sm font-semibold bg-accent text-on-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgb(var(--focus))] disabled:opacity-50',
  secundario: 'h-10 px-4 rounded-md text-sm font-medium border border-line-field text-content-1 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))]',
};

// Caja de la prueba pública: con espacio (≥1024×700) es una sola pantalla sin scroll de página; en móvil fluye con scroll normal. Funciona sin sesión.
// Fondo de marca decorativo detrás (FondoMarca); el contenido va por encima (z-index 1) y nunca depende de él.
export function PruebaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="prueba-marca bg-bg text-content-1">
      <FondoMarca />
      <header className="prueba-contenido h-14 shrink-0 flex items-center justify-between gap-3 px-4 sm:px-8 border-b border-line">
        <span className="flex items-center gap-2.5 text-sm font-semibold tracking-[0.2em]">
          <img src="/logo-estia-isotipo.png" alt="" aria-hidden="true" className="h-7 w-auto" />
          <span>ESTIA <span className="text-accent">ERP</span></span>
        </span>
        <Link to="/login" className="text-sm text-content-2 underline focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))] rounded">Ya tengo cuenta<span className="hidden sm:inline"> · Iniciar sesión</span></Link>
      </header>
      <main className="prueba-contenido flex-1 min-h-0 px-4 sm:px-8 py-5">{children}</main>
    </div>
  );
}

export function PruebaNoDisponible() {
  return (
    <PruebaLayout>
      <div className="h-full flex items-center justify-center">
        <div className="max-w-md text-center rounded-2xl border border-line bg-surface-1 p-8" role="status">
          <h1 className="text-lg font-semibold mb-2">La prueba gratuita no está disponible por ahora</h1>
          <p className="text-sm text-content-2 mb-5">Estamos preparándola. Si ya tienes una cuenta, entra normalmente.</p>
          <Link to="/login" className={`${cls.primario} inline-flex items-center`}>Ir a iniciar sesión</Link>
        </div>
      </div>
    </PruebaLayout>
  );
}
