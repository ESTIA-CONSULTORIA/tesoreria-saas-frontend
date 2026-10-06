import { useState } from 'react';
import type { MesasApi } from './mesasApi';
import { mensajeError, type Area } from './mesasLogic';

// Alta mínima de áreas y mesas: crear, editar y desactivar (no se borra nada). El backend valida que la
// sucursal sea del tenant.
interface Props {
  areas: Area[];
  sucursalId: string | null;
  api: MesasApi;
  onCambio: () => Promise<void>;
  onError: (m: string) => void;
}

const inputCls = 'rounded-lg bg-slate-900 border border-slate-700 px-3 py-3 text-base text-white w-full';
const btnCls = 'rounded-lg px-4 py-3 text-sm font-semibold min-h-[44px]';

export default function ConfigMesas({ areas, sucursalId, api, onCambio, onError }: Props) {
  const [nuevaArea, setNuevaArea] = useState('');
  const [nuevaMesa, setNuevaMesa] = useState<Record<string, { number: string; capacity: string }>>({});
  const [editArea, setEditArea] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setOcupado(true);
    try {
      await fn();
      await onCambio();
    } catch (e) {
      onError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }

  if (!sucursalId) {
    return <p className="p-4 text-sm text-amber-300">Selecciona una sucursal activa para configurar áreas y mesas.</p>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h3 className="mb-2 text-base font-semibold text-white">Nueva área</h3>
        <div className="flex gap-2">
          <input className={inputCls} placeholder="Nombre (Salón, Terraza…)" value={nuevaArea} onChange={(e) => setNuevaArea(e.target.value)} />
          <button
            disabled={ocupado || !nuevaArea.trim()}
            className={`${btnCls} bg-blue-600 text-white disabled:opacity-40`}
            onClick={() => run(async () => { await api.crearArea({ name: nuevaArea.trim(), branchId: sucursalId }); setNuevaArea(''); })}
          >
            Crear
          </button>
        </div>
      </div>

      {areas.map((area) => {
        const f = nuevaMesa[area.id] ?? { number: '', capacity: '4' };
        const nombre = editArea[area.id] ?? area.name;
        return (
          <div key={area.id} className={`rounded-xl border border-slate-800 bg-slate-900 p-4 ${area.isActive === false ? 'opacity-60' : ''}`}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <input className={`${inputCls} max-w-xs`} value={nombre} onChange={(e) => setEditArea({ ...editArea, [area.id]: e.target.value })} />
              <button
                disabled={ocupado || !nombre.trim() || nombre === area.name}
                className={`${btnCls} bg-slate-700 text-white disabled:opacity-40`}
                onClick={() => run(() => api.editarArea(area.id, { name: nombre.trim() }))}
              >
                Guardar nombre
              </button>
              <button
                disabled={ocupado}
                className={`${btnCls} ${area.isActive === false ? 'bg-green-700' : 'bg-red-800'} text-white`}
                onClick={() => run(() => api.editarArea(area.id, { isActive: area.isActive === false }))}
              >
                {area.isActive === false ? 'Reactivar área' : 'Desactivar área'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(area.tables ?? []).map((m) => (
                <MesaFila key={m.id} mesa={m} ocupado={ocupado} onGuardar={(b) => run(() => api.editarMesa(m.id, b))} />
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input className={`${inputCls} max-w-[8rem]`} inputMode="numeric" placeholder="Nº mesa" value={f.number} onChange={(e) => setNuevaMesa({ ...nuevaMesa, [area.id]: { ...f, number: e.target.value } })} />
              <input className={`${inputCls} max-w-[8rem]`} inputMode="numeric" placeholder="Personas" value={f.capacity} onChange={(e) => setNuevaMesa({ ...nuevaMesa, [area.id]: { ...f, capacity: e.target.value } })} />
              <button
                disabled={ocupado || !(Number(f.number) > 0) || !(Number(f.capacity) > 0)}
                className={`${btnCls} bg-blue-600 text-white disabled:opacity-40`}
                onClick={() => run(async () => {
                  await api.crearMesa({ number: Number(f.number), capacity: Number(f.capacity), areaId: area.id, branchId: sucursalId });
                  setNuevaMesa({ ...nuevaMesa, [area.id]: { number: '', capacity: f.capacity } });
                })}
              >
                + Mesa
              </button>
            </div>
          </div>
        );
      })}
      {areas.length === 0 && <p className="text-sm text-slate-400">Aún no hay áreas: crea la primera arriba.</p>}
    </div>
  );
}

function MesaFila({ mesa, ocupado, onGuardar }: {
  mesa: NonNullable<Area['tables']>[number];
  ocupado: boolean;
  onGuardar: (b: { number?: number; capacity?: number; isActive?: boolean }) => void;
}) {
  const [numero, setNumero] = useState(String(mesa.number));
  const [cap, setCap] = useState(String(mesa.capacity));
  const cambio = Number(numero) !== mesa.number || Number(cap) !== mesa.capacity;
  const inactiva = mesa.isActive === false;
  return (
    <div className={`flex items-center gap-2 rounded-lg border border-slate-700 p-2 ${inactiva ? 'opacity-50' : ''}`}>
      <span className="text-xs text-slate-400">Mesa</span>
      <input className={`${inputCls} max-w-[5rem]`} inputMode="numeric" value={numero} onChange={(e) => setNumero(e.target.value)} />
      <input className={`${inputCls} max-w-[5rem]`} inputMode="numeric" title="Personas" value={cap} onChange={(e) => setCap(e.target.value)} />
      <button disabled={ocupado || !cambio || !(Number(numero) > 0) || !(Number(cap) > 0)} className={`${btnCls} bg-slate-700 text-white disabled:opacity-40`} onClick={() => onGuardar({ number: Number(numero), capacity: Number(cap) })}>
        OK
      </button>
      <button disabled={ocupado || (!inactiva && mesa.status === 'OCCUPIED')} title={mesa.status === 'OCCUPIED' ? 'Tiene una cuenta abierta' : ''} className={`${btnCls} ${inactiva ? 'bg-green-700' : 'bg-red-800'} text-white disabled:opacity-40`} onClick={() => onGuardar({ isActive: inactiva })}>
        {inactiva ? 'Activar' : 'Desactivar'}
      </button>
    </div>
  );
}
