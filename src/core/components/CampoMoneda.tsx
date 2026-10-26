import { useId } from 'react';
import { normalizarMonto } from '../utils/monto';
import { ErrorCampo, idErrorCampo } from './ErrorCampo';
import { TecladoNumerico } from './TecladoNumerico';
import { aplicarTeclaMonto } from './reglasTecladoNumerico';

// Campo de monto único: etiqueta visible, "$", solo dígitos y un punto con 2 decimales (mismas reglas que el cobro), error pegado
// debajo y teclado en pantalla opcional. El valor es texto: el que lo usa decide cuándo convertirlo a número.
interface Props {
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  error?: string | null;
  requerido?: boolean;
  placeholder?: string;
  conTeclado?: boolean;
  autoFocus?: boolean;
  apariencia?: 'sistema' | 'papel';
  disabled?: boolean;
}

export function CampoMoneda({ etiqueta, valor, onCambio, error, requerido, placeholder = '0.00', conTeclado = false, autoFocus, apariencia = 'sistema', disabled }: Props) {
  const id = useId();
  const papel = apariencia === 'papel';
  return (
    <div>
      <label htmlFor={id} className={`mb-1 block text-sm ${papel ? 'text-tinta-3' : '!text-content-3'}`}>
        {etiqueta}{requerido ? ' *' : ''}
      </label>
      <div className="relative">
        <span aria-hidden="true" className={`pointer-events-none absolute inset-y-0 left-3 flex items-center ${papel ? 'text-tinta-3' : '!text-content-3'}`}>$</span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={valor}
          disabled={disabled}
          data-autofocus={autoFocus ? '' : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? idErrorCampo(id) : undefined}
          placeholder={placeholder}
          onChange={(e) => onCambio(normalizarMonto(e.target.value))}
          className={`w-full rounded-lg border py-2 pl-7 pr-3 text-lg font-semibold ${papel ? 'border-papel-linea bg-papel-soft text-tinta-1' : '!border-line !bg-nav !text-content-1'} ${error ? (papel ? '!border-papel-rojo' : '!border-danger') : ''}`}
        />
      </div>
      <ErrorCampo id={id} mensaje={error} apariencia={apariencia} />
      {conTeclado ? <TecladoNumerico className="mt-3" permitirPunto apariencia={apariencia} deshabilitado={disabled} onTecla={(t) => onCambio(aplicarTeclaMonto(valor, t))} /> : null}
    </div>
  );
}
