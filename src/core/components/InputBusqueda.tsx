import { useState, type InputHTMLAttributes } from 'react';
import { propsBusqueda, soloLecturaInicial, soloLecturaTrasFoco } from '../utils/inputBusqueda';

// Campo de búsqueda que el navegador no autorrellena con el correo del login: ver core/utils/inputBusqueda.ts.
// Nace readOnly y se libera al enfocar/tocar. `name` es obligatorio y debe ser estable y neutro.
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'name' | 'readOnly'> & { name: string };

export function InputBusqueda({ name, onFocus, onPointerDown, ...resto }: Props) {
  const [soloLectura, setSoloLectura] = useState(soloLecturaInicial());
  const liberar = () => setSoloLectura((v) => soloLecturaTrasFoco(v));
  return (
    <input
      {...propsBusqueda(name)}
      {...resto}
      readOnly={soloLectura}
      onPointerDown={(e) => {
        liberar();
        onPointerDown?.(e);
      }}
      onFocus={(e) => {
        liberar();
        onFocus?.(e);
      }}
    />
  );
}
