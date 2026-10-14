import { describe, expect, it, vi } from 'vitest';
import { aplicarActualizacion, avisoPendientes } from './actualizacion';

describe('avisoPendientes', () => {
  it('sin pendientes ni fallidas no hay aviso', () => {
    expect(avisoPendientes({ pendientes: 0, fallidas: 0 })).toBeNull();
  });
  it('menciona pendientes y fallidas y que no se pierden', () => {
    const m = avisoPendientes({ pendientes: 3, fallidas: 1 })!;
    expect(m).toContain('3 operación(es) offline');
    expect(m).toContain('1 con error');
    expect(m).toContain('no se pierden');
  });
});

describe('aplicarActualizacion', () => {
  const base = () => {
    const programadas: Array<() => void> = [];
    return {
      programadas,
      deps: {
        contarPendientes: vi.fn().mockResolvedValue({ pendientes: 0, fallidas: 0 }),
        confirmar: vi.fn().mockReturnValue(true),
        activarWorker: vi.fn().mockResolvedValue(undefined),
        recargar: vi.fn(),
        programar: (fn: () => void) => void programadas.push(fn),
      },
    };
  };

  it('sin pendientes: activa el worker sin preguntar y deja recarga de respaldo', async () => {
    const { deps, programadas } = base();
    expect(await aplicarActualizacion(deps)).toBe('actualizando');
    expect(deps.confirmar).not.toHaveBeenCalled();
    expect(deps.activarWorker).toHaveBeenCalledTimes(1);
    expect(programadas).toHaveLength(1);
    programadas[0]();
    expect(deps.recargar).toHaveBeenCalledTimes(1);
  });

  it('con pendientes pregunta; si cancela no toca el worker ni recarga', async () => {
    const { deps } = base();
    deps.contarPendientes.mockResolvedValue({ pendientes: 2, fallidas: 0 });
    deps.confirmar.mockReturnValue(false);
    expect(await aplicarActualizacion(deps)).toBe('cancelado');
    expect(deps.confirmar).toHaveBeenCalledTimes(1);
    expect(deps.activarWorker).not.toHaveBeenCalled();
    expect(deps.recargar).not.toHaveBeenCalled();
  });

  it('con pendientes y confirmación: actualiza', async () => {
    const { deps } = base();
    deps.contarPendientes.mockResolvedValue({ pendientes: 2, fallidas: 0 });
    expect(await aplicarActualizacion(deps)).toBe('actualizando');
    expect(deps.activarWorker).toHaveBeenCalled();
  });

  it('si no se puede leer la cola, no bloquea la actualización', async () => {
    const { deps } = base();
    deps.contarPendientes.mockRejectedValue(new Error('idb'));
    expect(await aplicarActualizacion(deps)).toBe('actualizando');
  });

  it('si activar el worker falla, recarga directamente', async () => {
    const { deps } = base();
    deps.activarWorker.mockRejectedValue(new Error('sw'));
    await aplicarActualizacion(deps);
    expect(deps.recargar).toHaveBeenCalledTimes(1);
  });
});
