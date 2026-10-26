import type { ReactNode } from 'react';

// Aviso dentro de una ventana: reemplaza al alert() nativo. El error se anuncia (role="alert"); lo demás, con aria-live cortés.
// `papel`: pantallas Lite, que pintan sobre papel claro con los tokens papel-*.
export type TipoAlerta = 'error' | 'aviso' | 'ok' | 'info';

const CLASES: Record<'sistema' | 'papel', Record<TipoAlerta, string>> = {
  sistema: {
    error: 'border-danger bg-danger/10 !text-content-1',
    aviso: 'border-warn bg-warn/10 !text-content-1',
    ok: 'border-ok bg-ok/10 !text-content-1',
    info: 'border-line !bg-surface-2 !text-content-1',
  },
  papel: {
    error: '!border-papel-rojo !bg-papel-rojo-bg !text-tinta-1',
    aviso: '!border-papel-ambar !bg-papel-ambar-bg !text-tinta-1',
    ok: '!border-papel-verde !bg-papel-verde-bg !text-tinta-1',
    info: '!border-papel-linea !bg-papel-soft !text-tinta-1',
  },
};
const GLIFO: Record<TipoAlerta, string> = { error: '⚠', aviso: '⚠', ok: '✓', info: 'ℹ' };

interface Props {
  tipo?: TipoAlerta;
  children: ReactNode;
  apariencia?: 'sistema' | 'papel';
  className?: string;
}

export function AlertaModal({ tipo = 'error', children, apariencia = 'sistema', className = '' }: Props) {
  return (
    <div role={tipo === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-lg border-l-4 px-3 py-2 text-sm ${CLASES[apariencia][tipo]} ${className}`}>
      <span aria-hidden="true">{GLIFO[tipo]}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
