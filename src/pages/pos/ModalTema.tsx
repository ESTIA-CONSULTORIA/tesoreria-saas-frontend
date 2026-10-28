import { useState } from "react";
import { api } from "../../core/api/api";
import { Boton } from "../../core/components/Boton";
import { Modal } from "../../core/components/Modal";
import { ModalFooter } from "../../core/components/ModalFooter";
import { skinDispositivo, skinUsuario } from "../../core/theme/aplicarSkin";
import { elegirMiTema, elegirTemaEquipo, opcionesTema } from "../../core/theme/miTema";
import { SKINS } from "../../core/theme/skins";
import { useAuthStore } from "../../core/store/useAuthStore";

const CLASE_SELECT = "w-full rounded px-3 py-2 text-sm !bg-surface-1 !text-content-1 border !border-line";

// Tema desde la barra del POS. Mismas opciones que Configuración → Apariencia, pero solo las skins que el rol puede ver.
export default function ModalTema({ onClose }: { onClose: () => void }) {
  const rol = useAuthStore((s) => s.user?.roleCode);
  const opciones = opcionesTema(rol);
  const [miTema, setMiTema] = useState(skinUsuario() ?? "");
  const [esteEquipo, setEsteEquipo] = useState(skinDispositivo() ?? "");
  const [error, setError] = useState("");

  async function cambiarMiTema(valor: string) {
    const previo = miTema;
    setMiTema(valor);
    setError("");
    const r = await elegirMiTema(valor, previo, rol, (skin) => api.put("/auth/me/ui-prefs", { skin }));
    if (!r.ok) {
      setMiTema(previo);
      setError(r.mensaje ?? "");
    }
  }

  function cambiarEquipo(valor: string) {
    setError("");
    const r = elegirTemaEquipo(valor, rol);
    if (r.ok) setEsteEquipo(valor);
    else setError(r.mensaje ?? "");
  }

  return (
    <Modal
      title="Tema"
      subtitle="Cómo se ve la pantalla"
      size="sm"
      onClose={onClose}
      footer={<ModalFooter principal={<Boton confirma onClick={onClose}>Listo</Boton>} />}
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="tema-pos-usuario" className="block text-sm !text-content-3 mb-1">Mi tema (en todos mis equipos)</label>
          <select id="tema-pos-usuario" value={miTema} onChange={(e) => { void cambiarMiTema(e.target.value); }} className={CLASE_SELECT}>
            <option value="">Igual que el negocio</option>
            {opciones.map((t) => <option key={t} value={t}>{SKINS[t].nombre}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="tema-pos-equipo" className="block text-sm !text-content-3 mb-1">Solo en este equipo</label>
          <select id="tema-pos-equipo" value={esteEquipo} onChange={(e) => cambiarEquipo(e.target.value)} className={CLASE_SELECT}>
            <option value="">Igual que el negocio</option>
            {opciones.map((t) => <option key={t} value={t}>{SKINS[t].nombre}</option>)}
          </select>
        </div>
        <p className="text-xs !text-content-3">«Mi tema» se guarda al elegirlo. «Solo en este equipo» vale únicamente aquí y gana a las otras dos (útil en una caja que debe verse siempre igual).</p>
        {error && <div role="alert" className="text-sm !text-danger">{error}</div>}
      </div>
    </Modal>
  );
}
