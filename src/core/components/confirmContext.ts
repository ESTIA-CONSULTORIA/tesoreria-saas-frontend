import { createContext, useContext } from 'react';
import type { TipoAlerta } from './AlertaModal';

// Reemplazo de confirm() y alert(): se pide con await, igual que los nativos, pero con una ventana estándar (foco, Esc, teclado y skin).
export interface OpcionesConfirmar {
  titulo: string;
  mensaje: string;
  /** Consecuencia concreta ("No se podrá deshacer"), destacada bajo el mensaje. */
  consecuencia?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  /** Acción destructiva: el botón es de peligro y el foco inicial queda en Cancelar. */
  destructiva?: boolean;
}

export interface OpcionesAviso {
  titulo?: string;
  mensaje: string;
  tipo?: TipoAlerta;
  textoAceptar?: string;
}

export interface ApiConfirmacion {
  confirmar: (o: OpcionesConfirmar) => Promise<boolean>;
  avisar: (o: OpcionesAviso) => Promise<void>;
}

export const ConfirmContext = createContext<ApiConfirmacion | null>(null);

function useApi(): ApiConfirmacion {
  const api = useContext(ConfirmContext);
  if (!api) throw new Error('Falta <ConfirmProvider> en la raíz de la aplicación');
  return api;
}

/** `const confirmar = useConfirm(); if (await confirmar({ titulo, mensaje, destructiva: true })) …` */
export const useConfirm = () => useApi().confirmar;
/** `const avisar = useAviso(); await avisar({ mensaje, tipo: 'ok' })` */
export const useAviso = () => useApi().avisar;
