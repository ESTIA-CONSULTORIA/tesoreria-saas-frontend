import { MARCAS_FONDO, estiloMarca } from './fondoMarcaDatos';

// Capa decorativa detrás del contenido: no recibe foco ni clics (pointer-events: none) y no la leen los lectores de pantalla.
// Es `fixed` y recorta lo que se sale (overflow: hidden): nunca genera scroll ni desborde.
export default function FondoMarca() {
  return (
    <div aria-hidden="true" data-fondo-marca className="fondo-marca">
      {MARCAS_FONDO.map((m, i) => <span key={i} className="fondo-marca-isotipo" style={estiloMarca(m)} />)}
    </div>
  );
}
