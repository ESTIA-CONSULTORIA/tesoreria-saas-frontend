// Autorización de un gerente o administrador en la caja de otro rol (cortesía, o descuento sobre el tope). El servidor valida la contraseña
// ERP del autorizador, entrega un token de un solo uso (2 min) ligado a este ticket, y deja la entrada en la bitácora. Aquí solo se piden los datos.
export interface Autorizador {
  id: string;
  nombre: string | null;
  email: string;
  rol: string;
}

interface Props {
  /** Prefijo de los ids (dos ventanas pueden coexistir en el DOM). */
  idBase: string;
  autorizadores: Autorizador[] | null;
  autorizadorId: string;
  onAutorizador: (id: string) => void;
  contrasena: string;
  onContrasena: (v: string) => void;
  /** Frase que explica por qué hace falta (p. ej. «Este descuento supera tu límite del 10 %»). */
  motivoAutorizacion: string;
}

const ROL: Record<string, string> = { ADMIN: 'Administrador', GERENTE: 'Gerente' };
const campo = 'w-full px-4 py-2 rounded-lg border !border-line !bg-nav !text-content-1';

export function AutorizacionGerente({ idBase, autorizadores, autorizadorId, onAutorizador, contrasena, onContrasena, motivoAutorizacion }: Props) {
  const sinLista = autorizadores !== null && autorizadores.length === 0;
  return (
    <fieldset className="rounded-lg border !border-line p-3">
      <legend className="px-1 text-sm font-medium !text-content-1">Autorización de un gerente o administrador *</legend>
      <p className="mb-3 text-xs !text-content-3">{motivoAutorizacion} Quien autoriza escribe su contraseña del sistema; no se guarda.</p>
      <label htmlFor={`${idBase}-autorizador`} className="mb-1 block text-sm !text-content-3">Autoriza</label>
      <select
        id={`${idBase}-autorizador`}
        value={autorizadorId}
        onChange={(e) => onAutorizador(e.target.value)}
        disabled={autorizadores === null || sinLista}
        className={`${campo} mb-2`}
      >
        <option value="">{autorizadores === null ? 'Cargando…' : sinLista ? 'No hay gerentes ni administradores disponibles' : 'Seleccionar quién autoriza...'}</option>
        {(autorizadores ?? []).map((a) => (
          <option key={a.id} value={a.id}>{`${a.nombre ?? a.email} · ${ROL[a.rol] ?? a.rol}`}</option>
        ))}
      </select>
      <label htmlFor={`${idBase}-contrasena`} className="mb-1 block text-sm !text-content-3">Contraseña de quien autoriza</label>
      <input
        id={`${idBase}-contrasena`}
        type="password"
        autoComplete="new-password"
        value={contrasena}
        onChange={(e) => onContrasena(e.target.value)}
        className={campo}
      />
    </fieldset>
  );
}
