// Error de UN campo, pegado debajo de él. El campo lo enlaza con aria-describedby={idErrorCampo(id)} y aria-invalid.
// `papel`: pantallas Lite, que pintan sobre papel claro con los tokens papel-*.
export const idErrorCampo = (id: string) => `${id}-error`;

interface Props {
  id: string;
  mensaje?: string | null;
  apariencia?: 'sistema' | 'papel';
}

export function ErrorCampo({ id, mensaje, apariencia = 'sistema' }: Props) {
  if (!mensaje) return null;
  return (
    <p id={idErrorCampo(id)} role="alert" className={`mt-1 text-xs font-medium ${apariencia === 'papel' ? '!text-papel-rojo' : '!text-danger'}`}>
      {mensaje}
    </p>
  );
}
