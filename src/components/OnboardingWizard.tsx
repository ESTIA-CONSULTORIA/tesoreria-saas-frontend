import { useState } from "react";
import { api } from "../core/api/api";
import { useAuthStore } from "../core/store/useAuthStore";

interface Props {
  onComplete: () => void;
}

const STEPS = [
  { label: "Empresa", desc: "Datos de tu empresa" },
  { label: "Sucursal", desc: "Primera sucursal" },
  { label: "Cuenta Bancaria", desc: "Cuenta principal" },
  { label: "Usuario Gerente", desc: "Primer gerente" },
  { label: "¡Listo!", desc: "Confirmación" },
];

export default function OnboardingWizard({ onComplete }: Props) {
  const tenantId = useAuthStore((s) => s.tenantId);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 — empresa
  const [empresa, setEmpresa] = useState({ razonSocial: "", rfc: "", giro: "" });
  // legalName = razonSocial, taxId = rfc (mapped at submit time)
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Step 2 — sucursal
  const [sucursal, setSucursal] = useState({ nombre: "", ciudad: "", estado: "" });
  const [branchId, setBranchId] = useState<string | null>(null);

  // Step 3 — cuenta
  const [cuenta, setCuenta] = useState({ banco: "", numeroCuenta: "", alias: "", moneda: "MXN" });

  // Step 4 — gerente
  const [gerente, setGerente] = useState({ name: "", email: "", password: "" });

  const handleStep1 = async () => {
    setError("");
    if (!empresa.razonSocial.trim()) { setError("La razón social es obligatoria."); return; }
    setLoading(true);
    try {
      const res = await api.post("/companies", {
        legalName: empresa.razonSocial,
        tradeName: empresa.razonSocial,
        taxId: empresa.rfc,
        giro: empresa.giro,
        tenantId,
      });
      setCompanyId(res.data.id);
      setStep(1);
    } catch {
      setError("Error al crear la empresa. Verifica los datos.");
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async () => {
    setError("");
    if (!sucursal.nombre.trim()) { setError("El nombre de la sucursal es obligatorio."); return; }
    setLoading(true);
    try {
      const res = await api.post("/branches", {
        name: sucursal.nombre,
        code: sucursal.nombre.toUpperCase().replace(/\s+/g, '-').slice(0, 10),
        city: sucursal.ciudad,
        state: sucursal.estado,
        companyId,
      });
      setBranchId(res.data.id);
      setStep(2);
    } catch {
      setError("Error al crear la sucursal.");
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async () => {
    setError("");
    if (!cuenta.banco.trim() || !cuenta.numeroCuenta.trim()) {
      setError("Banco y número de cuenta son obligatorios.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/banks", {
        bank: cuenta.banco,
        accountNumber: cuenta.numeroCuenta,
        name: cuenta.alias || cuenta.banco,
        currency: cuenta.moneda,
        initialBalance: 0,
        type: "BANCO",
        branchId,
      });
      setStep(3);
    } catch {
      setError("Error al crear la cuenta bancaria.");
    } finally {
      setLoading(false);
    }
  };

  const handleStep4 = async () => {
    setError("");
    if (!gerente.name.trim() || !gerente.email.trim() || !gerente.password.trim()) {
      setError("Nombre, email y contraseña son obligatorios.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/users", {
        name: gerente.name,
        email: gerente.email,
        password: gerente.password,
        roleCode: "GERENTE",
      });
      setStep(4);
    } catch {
      setError("Error al crear el usuario gerente.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await api.patch(`/tenants/${tenantId}/onboard`, {});
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
      onComplete();
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    backgroundColor: "#222",
    border: "1px solid #2D2D2D",
    borderRadius: 6,
    color: "#F5F5F5",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 4,
    fontSize: 12,
    color: "#9A9A9A",
  };

  const fieldStyle: React.CSSProperties = { marginBottom: 14 };

  const btnPrimary: React.CSSProperties = {
    padding: "9px 28px",
    backgroundColor: "#F5F5F5",
    color: "#0A0A0A",
    border: "none",
    borderRadius: 6,
    fontWeight: 600,
    fontSize: 14,
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.7 : 1,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      backgroundColor: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        backgroundColor: "#161616",
        border: "1px solid #2D2D2D",
        borderRadius: 12,
        width: "100%",
        maxWidth: 520,
        padding: "32px 36px",
      }}>
        {/* Step indicators */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                margin: "0 auto 4px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700,
                backgroundColor: i < step ? "#4CAF50" : i === step ? "#F5F5F5" : "#2D2D2D",
                color: i < step ? "#fff" : i === step ? "#0A0A0A" : "#7E7E7E",
              }}>
                {i < step ? "✓" : i + 1}
              </div>
              <div style={{ fontSize: 10, color: i === step ? "#F5F5F5" : "#7E7E7E" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700, color: "#F5F5F5" }}>
          {STEPS[step].label}
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#9A9A9A" }}>
          {STEPS[step].desc}
        </p>

        {error && (
          <div style={{ marginBottom: 16, padding: "8px 12px", backgroundColor: "#2a1215", border: "1px solid #c0392b", borderRadius: 6, color: "#e74c3c", fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* STEP 0 — Empresa */}
        {step === 0 && (
          <div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Razón Social *</label>
              <input style={inputStyle} value={empresa.razonSocial} onChange={e => setEmpresa({ ...empresa, razonSocial: e.target.value })} placeholder="Ej. Mi Empresa S.A. de C.V." />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>RFC</label>
              <input style={inputStyle} value={empresa.rfc} onChange={e => setEmpresa({ ...empresa, rfc: e.target.value })} placeholder="Ej. XAXX010101000" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Giro / Industria</label>
              <input style={inputStyle} value={empresa.giro} onChange={e => setEmpresa({ ...empresa, giro: e.target.value })} placeholder="Ej. Comercio al por menor" />
            </div>
            <div style={{ textAlign: "right" }}>
              <button style={btnPrimary} onClick={handleStep1} disabled={loading}>
                {loading ? "Guardando..." : "Siguiente →"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 1 — Sucursal */}
        {step === 1 && (
          <div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Nombre de la Sucursal *</label>
              <input style={inputStyle} value={sucursal.nombre} onChange={e => setSucursal({ ...sucursal, nombre: e.target.value })} placeholder="Ej. Matriz, Sucursal Centro..." />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ ...fieldStyle, flex: 1 }}>
                <label style={labelStyle}>Ciudad</label>
                <input style={inputStyle} value={sucursal.ciudad} onChange={e => setSucursal({ ...sucursal, ciudad: e.target.value })} placeholder="Ciudad" />
              </div>
              <div style={{ ...fieldStyle, flex: 1 }}>
                <label style={labelStyle}>Estado</label>
                <input style={inputStyle} value={sucursal.estado} onChange={e => setSucursal({ ...sucursal, estado: e.target.value })} placeholder="Estado" />
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <button style={btnPrimary} onClick={handleStep2} disabled={loading}>
                {loading ? "Guardando..." : "Siguiente →"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — Cuenta Bancaria */}
        {step === 2 && (
          <div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Banco *</label>
              <input style={inputStyle} value={cuenta.banco} onChange={e => setCuenta({ ...cuenta, banco: e.target.value })} placeholder="Ej. BBVA, Banamex, Santander..." />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Número de Cuenta *</label>
              <input style={inputStyle} value={cuenta.numeroCuenta} onChange={e => setCuenta({ ...cuenta, numeroCuenta: e.target.value })} placeholder="CLABE o número de cuenta" />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ ...fieldStyle, flex: 2 }}>
                <label style={labelStyle}>Alias</label>
                <input style={inputStyle} value={cuenta.alias} onChange={e => setCuenta({ ...cuenta, alias: e.target.value })} placeholder="Nombre descriptivo" />
              </div>
              <div style={{ ...fieldStyle, flex: 1 }}>
                <label style={labelStyle}>Moneda</label>
                <select style={{ ...inputStyle, cursor: "pointer" }} value={cuenta.moneda} onChange={e => setCuenta({ ...cuenta, moneda: e.target.value })}>
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <button style={btnPrimary} onClick={handleStep3} disabled={loading}>
                {loading ? "Guardando..." : "Siguiente →"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — Gerente */}
        {step === 3 && (
          <div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Nombre completo *</label>
              <input style={inputStyle} value={gerente.name} onChange={e => setGerente({ ...gerente, name: e.target.value })} placeholder="Nombre del gerente" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Email *</label>
              <input style={inputStyle} type="email" value={gerente.email} onChange={e => setGerente({ ...gerente, email: e.target.value })} placeholder="correo@empresa.com" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Contraseña temporal *</label>
              <input style={inputStyle} type="password" value={gerente.password} onChange={e => setGerente({ ...gerente, password: e.target.value })} placeholder="Mínimo 8 caracteres" />
            </div>
            <div style={{ textAlign: "right" }}>
              <button style={btnPrimary} onClick={handleStep4} disabled={loading}>
                {loading ? "Guardando..." : "Siguiente →"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 — Confirmación */}
        {step === 4 && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "#F5F5F5" }}>¡Configuración completa!</h3>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "#9A9A9A", lineHeight: 1.6 }}>
              Tu empresa, sucursal, cuenta bancaria y primer gerente han sido creados exitosamente.
              Ahora puedes comenzar a usar el sistema.
            </p>
            <button style={btnPrimary} onClick={handleFinish} disabled={loading}>
              {loading ? "Finalizando..." : "Ingresar al sistema"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
