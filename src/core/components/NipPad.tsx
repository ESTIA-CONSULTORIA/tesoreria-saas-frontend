import { useEffect, useRef } from 'react';
import { ErrorCampo } from './ErrorCampo';
import { TecladoNumerico } from './TecladoNumerico';
import { teclaDeEvento, type TeclaNumerica } from './reglasTecladoNumerico';

// NIP único: puntos de avance, teclado numérico estándar y error anunciado. Controlado: quien lo usa conserva el valor y decide
// qué hacer al completarse. También atiende el teclado físico (dígitos y Retroceso) mientras no haya un campo de texto con foco.
interface Props {
  valor: string;
  longitud?: number;
  onTecla: (t: TeclaNumerica) => void;
  error?: string | null;
  cargando?: boolean;
  apariencia?: 'sistema' | 'papel';
  /** Ancla del mensaje de error para lectores de pantalla. */
  id?: string;
}

export function NipPad({ valor, longitud = 4, onTecla, error, cargando = false, apariencia = 'sistema', id = 'nip' }: Props) {
  const papel = apariencia === 'papel';
  const vivo = useRef({ onTecla, cargando });
  vivo.current = { onTecla, cargando };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(input|textarea|select)$/i.test(el.tagName)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = teclaDeEvento(e.key, false);
      if (!t || vivo.current.cargando) return;
      e.preventDefault();
      vivo.current.onTecla(t);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex w-full flex-col items-center">
      <div role="img" aria-label={`NIP: ${valor.length} de ${longitud} dígitos`} className="mb-6 flex gap-5">
        {Array.from({ length: longitud }, (_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full transition ${valor.length > i ? (papel ? 'bg-papel-azul' : '!bg-btn') : papel ? 'bg-papel-linea' : '!bg-line'}`}
          />
        ))}
      </div>
      <div className="mb-4 min-h-[1.25rem] text-center">
        <ErrorCampo id={id} mensaje={error} apariencia={apariencia} />
      </div>
      <TecladoNumerico className="w-full max-w-[300px]" tamano="grande" apariencia={apariencia} deshabilitado={cargando} onTecla={onTecla} />
    </div>
  );
}
