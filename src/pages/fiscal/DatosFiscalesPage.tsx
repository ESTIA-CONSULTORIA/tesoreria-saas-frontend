import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MainLayout from '../../core/layout/MainLayout';
import { api } from '../../core/api/api';
import { useAuthStore } from '../../core/store/useAuthStore';
import { ETIQUETA_PESTANA, mensajeErrorApi, pasosPreparacion, PESTANAS, pestanaDeAtajo, pestanaRelativa, type Pestana, type ResumenFiscal } from './fiscalLogic';
import EmisorTab from './EmisorTab';
import SucursalesTab from './SucursalesTab';
import ProductosTab from './ProductosTab';
import ReceptoresTab from './ReceptoresTab';

interface Catalogos {
  regimenesFiscales: Record<string, string>;
  usosCfdi: Record<string, string>;
  objetosImpuesto: Record<string, string>;
}
const ICONO_PASO = { listo: '✔', pendiente: '○', proximamente: '⏳' } as const;
const COLOR_PASO = { listo: 'text-emerald-400', pendiente: 'text-amber-300', proximamente: 'text-slate-500' } as const;

// Configuración → Datos fiscales (F0 del CFDI 4.0). Solo captura y validación local: no hay timbrado. Diseño: docs/DISENO-DATOS-FISCALES.md.
// Todo cabe en 1366×768 sin desplazar la página: la zona de trabajo se reparte en columnas y las listas se paginan.
export default function DatosFiscalesPage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Pestana>('emisor');
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [resumen, setResumen] = useState<ResumenFiscal | null>(null);
  const [error, setError] = useState('');
  const lista = useRef<HTMLDivElement>(null);

  const cargarResumen = useCallback(async () => {
    try {
      setResumen((await api.get<ResumenFiscal>('/facturacion/resumen')).data);
    } catch (e) {
      setError(mensajeErrorApi(e, 'No se pudo cargar el estado de los datos fiscales.'));
    }
  }, []);

  useEffect(() => {
    void cargarResumen();
    api
      .get<Catalogos>('/facturacion/catalogos')
      .then((r) => setCatalogos(r.data))
      .catch((e) => setError(mensajeErrorApi(e, 'No se pudieron cargar los catálogos del SAT.')));
  }, [cargarResumen]);

  // Alt+Shift+1…4: no choca con Alt+1…4 (navegación global del ERP).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const destino = pestanaDeAtajo(e);
      if (destino) {
        e.preventDefault();
        setTab(destino);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pasos = useMemo(() => pasosPreparacion(resumen), [resumen]);

  if (!user || !['ADMIN', 'GERENTE'].includes(user.roleCode ?? '')) {
    return (
      <MainLayout>
        <div className="p-6 text-slate-300">Tu rol no tiene acceso a Datos fiscales. Pide a un administrador o gerente.</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mx-auto flex w-full max-w-[1366px] flex-col gap-2 overflow-hidden px-4 py-2 text-white" style={{ height: 'calc(100vh - 96px)' }}>
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-lg font-bold leading-tight">Datos fiscales</h1>
          <p className="truncate text-xs text-slate-400">Los datos deben coincidir con tu Constancia de Situación Fiscal. Confírmalos con tu contador.</p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div
            ref={lista}
            role="tablist"
            aria-label="Secciones de datos fiscales"
            className="flex gap-1"
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const destino = pestanaRelativa(tab, e.key === 'ArrowRight' ? 1 : -1);
                setTab(destino);
                requestAnimationFrame(() => lista.current?.querySelector<HTMLElement>(`[data-tab="${destino}"]`)?.focus());
              }
            }}
          >
            {PESTANAS.map((p, i) => (
              <button
                key={p}
                type="button"
                role="tab"
                id={`fiscal-tab-${p}`}
                data-tab={p}
                aria-selected={tab === p}
                aria-controls="fiscal-panel"
                tabIndex={tab === p ? 0 : -1}
                onClick={() => setTab(p)}
                className={`whitespace-nowrap rounded px-3 py-1 text-sm font-semibold ${tab === p ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'}`}
              >
                {ETIQUETA_PESTANA[p]} <span className="ml-1 text-[10px] font-normal text-slate-300">Alt+Shift+{i + 1}</span>
              </button>
            ))}
          </div>
          <ul className="flex min-w-0 flex-wrap justify-end gap-x-3 text-xs leading-tight" aria-label="Preparación para facturar">
            {pasos.map((p) => (
              <li key={p.clave} className={COLOR_PASO[p.estado]}>
                {p.pestana ? (
                  <button type="button" className="underline-offset-2 hover:underline" onClick={() => setTab(p.pestana!)}>
                    {ICONO_PASO[p.estado]} {p.texto}
                  </button>
                ) : (
                  <span title="Llega en una fase posterior">{ICONO_PASO[p.estado]} {p.texto} (próx.)</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {error ? <p role="alert" className="rounded bg-red-900/30 px-2 py-1 text-xs text-red-200">{error}</p> : null}

        <div id="fiscal-panel" role="tabpanel" aria-labelledby={`fiscal-tab-${tab}`} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {!catalogos ? (
            <p className="text-sm text-slate-400">Cargando…</p>
          ) : tab === 'emisor' ? (
            <EmisorTab resumen={resumen} regimenes={catalogos.regimenesFiscales} pasos={pasos} alGuardar={cargarResumen} />
          ) : tab === 'sucursales' ? (
            <SucursalesTab alGuardar={cargarResumen} />
          ) : tab === 'productos' ? (
            <ProductosTab objetos={catalogos.objetosImpuesto} alGuardar={cargarResumen} />
          ) : (
            <ReceptoresTab regimenes={catalogos.regimenesFiscales} usos={catalogos.usosCfdi} alGuardar={cargarResumen} />
          )}
        </div>
      </div>
    </MainLayout>
  );
}
