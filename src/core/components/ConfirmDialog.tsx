import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { AlertaModal } from './AlertaModal';
import { Boton } from './Boton';
import { ConfirmContext, type ApiConfirmacion, type OpcionesAviso, type OpcionesConfirmar } from './confirmContext';
import { Modal } from './Modal';
import { ModalFooter } from './ModalFooter';

// Proveedor de confirmaciones y avisos (se monta una vez, en main.tsx). Una ventana a la vez; si llegan varias, hacen cola.
type Pendiente =
  | { clase: 'confirmar'; o: OpcionesConfirmar; resolver: (v: boolean) => void }
  | { clase: 'aviso'; o: OpcionesAviso; resolver: () => void };

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [cola, setCola] = useState<Pendiente[]>([]);

  const confirmar = useCallback((o: OpcionesConfirmar) => new Promise<boolean>((resolver) => setCola((c) => [...c, { clase: 'confirmar', o, resolver }])), []);
  const avisar = useCallback((o: OpcionesAviso) => new Promise<void>((resolver) => setCola((c) => [...c, { clase: 'aviso', o, resolver }])), []);
  const api = useMemo<ApiConfirmacion>(() => ({ confirmar, avisar }), [confirmar, avisar]);

  const actual = cola[0];
  const cerrar = (valor: boolean) => {
    if (!actual) return;
    if (actual.clase === 'confirmar') actual.resolver(valor);
    else actual.resolver();
    setCola((c) => c.slice(1));
  };

  return (
    <ConfirmContext.Provider value={api}>
      {children}
      {actual?.clase === 'confirmar' ? (
        <Modal
          key={cola.length}
          size="sm"
          title={actual.o.titulo}
          onClose={() => cerrar(false)}
          footer={
            <ModalFooter
              secundario={<Boton variante="secundario" data-autofocus={actual.o.destructiva ? '' : undefined} onClick={() => cerrar(false)}>{actual.o.textoCancelar ?? 'Cancelar'}</Boton>}
              principal={<Boton variante={actual.o.destructiva ? 'peligro' : 'principal'} onClick={() => cerrar(true)}>{actual.o.textoConfirmar ?? 'Confirmar'}</Boton>}
            />
          }
        >
          <p className="text-sm !text-content-1">{actual.o.mensaje}</p>
          {actual.o.consecuencia ? <AlertaModal tipo="aviso" className="mt-3">{actual.o.consecuencia}</AlertaModal> : null}
        </Modal>
      ) : null}
      {actual?.clase === 'aviso' ? (
        <Modal
          key={cola.length}
          size="sm"
          title={actual.o.titulo ?? (actual.o.tipo === 'error' ? 'No se pudo completar' : actual.o.tipo === 'ok' ? 'Listo' : 'Aviso')}
          onClose={() => cerrar(true)}
          footer={<ModalFooter principal={<Boton data-autofocus="" onClick={() => cerrar(true)}>{actual.o.textoAceptar ?? 'Entendido'}</Boton>} />}
        >
          <AlertaModal tipo={actual.o.tipo ?? 'info'}>{actual.o.mensaje}</AlertaModal>
        </Modal>
      ) : null}
    </ConfirmContext.Provider>
  );
}
