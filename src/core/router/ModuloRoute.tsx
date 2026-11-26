import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useDecisionRuta } from "../hooks/useModulo";
import { ESPERA_MAXIMA_RUTA_MS, mensajeRedireccion } from "../hooks/moduloDisponible";
import { useAuthStore } from "../store/useAuthStore";
import { leerNegocioActivo } from "../api/negocioActivo";
import { api } from "../api/api";

interface Props {
  children: React.ReactNode;
  modulo: string;
}

// Puerta de ruta por módulo: la MISMA regla que el menú (moduloDisponible) para todos los roles. Sin el módulo → /dashboard con un aviso.
// SOPORTE ve todos los módulos salvo los verticales (Pacientes, Membresías) cuando el negocio elegido no los tiene activos.
//
// Carga directa por URL: esta puerta vive FUERA de MainLayout (y de su barra superior), así que NO puede esperar a que la barra cargue los
// módulos del negocio de SOPORTE (nunca se montaría: «Cargando…» infinito). Los pide ella misma, y la espera tiene tope: pasado
// ESPERA_MAXIMA_RUTA_MS se sale a /dashboard con un mensaje.
export default function ModuloRoute({ children, modulo }: Props) {
  const decision = useDecisionRuta(modulo);
  const setModulos = useAuthStore((s) => s.setModulosNegocioSoporte);
  const [agotado, setAgotado] = useState(false);

  useEffect(() => {
    if (decision !== 'esperar') return;
    const negocio = leerNegocioActivo(localStorage)?.id;
    if (!negocio) return;
    let vivo = true;
    api.get(`/modules/tenant/${negocio}`, { timeout: ESPERA_MAXIMA_RUTA_MS })
      .then((r) => { if (vivo) setModulos(Array.isArray(r.data) ? r.data : []); })
      .catch(() => { if (vivo) setAgotado(true); });
    const t = setTimeout(() => { if (vivo) setAgotado(true); }, ESPERA_MAXIMA_RUTA_MS);
    return () => { vivo = false; clearTimeout(t); };
  }, [decision, setModulos]);

  if (decision === 'esperar') {
    if (agotado) return <Navigate to="/dashboard" replace state={{ avisoRuta: mensajeRedireccion(modulo, 'tiempo-agotado') }} />;
    return <div role="status" className="p-6 text-sm !text-content-2">Comprobando módulos del negocio…</div>;
  }
  if (decision === 'redirigir') return <Navigate to="/dashboard" replace state={{ avisoRuta: mensajeRedireccion(modulo, 'no-disponible') }} />;
  return <>{children}</>;
}
