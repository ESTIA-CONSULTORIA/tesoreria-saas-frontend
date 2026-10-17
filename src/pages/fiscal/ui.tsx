import { useEffect, useRef, type InputHTMLAttributes } from 'react';
import { atajoDeTecla, leyendaAtajos, TECLAS_FUNCION, type Atajo } from '../../core/components/reglasTeclado';
import { validarRfc, type ResultadoRfc } from './fiscalLogic';

export const inp = 'w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-white focus:border-blue-500 focus:outline-none';
export const etiqueta = 'mb-0.5 block text-xs text-slate-400';
export const btn = 'rounded px-3 py-1 text-sm font-semibold';

/** Atajos de teclado de una pestaña (F2, F4…, Escape). Solo actúa cuando `activo`; bloquea la tecla del navegador solo si hay atajo. */
export function useAtajos(atajos: Atajo[], activo = true) {
  const vivo = useRef(atajos);
  vivo.current = atajos;
  useEffect(() => {
    if (!activo) return;
    const onKey = (e: KeyboardEvent) => {
      // Un diálogo abierto (sugerencias) atiende sus propias teclas.
      if (document.querySelector('[role="dialog"]')) return;
      if (e.key === 'Escape' || TECLAS_FUNCION.has(e.key)) {
        const a = atajoDeTecla(vivo.current, e.key);
        if (a) {
          e.preventDefault();
          if (!a.deshabilitado) a.accion();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activo]);
}

/** Barra inferior con las teclas de la pestaña. */
export function Leyenda({ atajos, extra = [] }: { atajos: Atajo[]; extra?: string[] }) {
  const partes = [...extra, ...leyendaAtajos(atajos, false)];
  return (
    <div className="flex shrink-0 flex-wrap gap-x-4 border-t border-slate-800 pt-1 text-xs text-slate-400" aria-label="Atajos de teclado">
      {partes.map((p) => (
        <span key={p}>
          <kbd className="rounded bg-slate-800 px-1 text-slate-200">{p.split(' ')[0]}</kbd> {p.split(' ').slice(1).join(' ')}
        </span>
      ))}
    </div>
  );
}

const COLOR: Record<ResultadoRfc['estado'], string> = {
  vacio: 'text-slate-500',
  incompleto: 'text-slate-400',
  ok: 'text-emerald-400',
  aviso: 'text-amber-300',
  error: 'text-red-400',
};
const ICONO: Record<ResultadoRfc['estado'], string> = { vacio: '', incompleto: '…', ok: '✔', aviso: '⚠', error: '✖' };

/** Campo de RFC con validación en vivo (icono + texto, nunca solo color). */
export function CampoRfc({
  id,
  valor,
  onCambio,
  resultado,
  ...resto
}: { id: string; valor: string; onCambio: (v: string) => void; resultado?: ResultadoRfc } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'id'>) {
  const r = resultado ?? validarRfc(valor);
  return (
    <div>
      <label htmlFor={id} className={etiqueta}>
        RFC
      </label>
      <input
        id={id}
        className={`${inp} font-mono uppercase`}
        value={valor}
        maxLength={14}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={r.estado === 'error'}
        aria-describedby={`${id}-msg`}
        onChange={(e) => onCambio(e.target.value.toUpperCase())}
        {...resto}
      />
      <p id={`${id}-msg`} role="status" className={`mt-0.5 h-4 text-xs ${COLOR[r.estado]}`}>
        {r.mensaje ? `${ICONO[r.estado]} ${r.mensaje}` : ''}
      </p>
    </div>
  );
}

export function Aviso({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <p role="status" className={`rounded px-2 py-1 text-xs ${ok ? 'bg-emerald-900/30 text-emerald-200' : 'bg-red-900/30 text-red-200'}`}>
      {texto}
    </p>
  );
}

export const Estado = ({ completo, textoSi = 'Completo', textoNo = 'Falta' }: { completo: boolean; textoSi?: string; textoNo?: string }) => (
  <span className={completo ? 'text-emerald-400' : 'text-amber-300'}>{completo ? `● ${textoSi}` : `○ ${textoNo}`}</span>
);
