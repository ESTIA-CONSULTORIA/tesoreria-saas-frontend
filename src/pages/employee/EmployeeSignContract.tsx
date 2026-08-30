import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import EmployeeLayout from "./EmployeeLayout";
import { employeeApi } from "../../core/api/employeeApi";

// Auditoría de producto (GoodsHabits, Fase 3 — Firma electrónica): pantalla nueva del
// Portal — hoy no existía ninguna aquí, solo lectura de documentos (EmployeeDocuments.tsx).
// Flujo: INE frente/reverso → verificación OCR contra el expediente ya capturado (bloquea
// si no coincide) → selfie → firma en pantalla → GPS → envío a POST /contracts/portal/:id/sign.
type Step = "intro" | "ine" | "verifying" | "mismatch" | "selfie" | "signature" | "sending" | "done" | "error";

interface ComparisonRow {
  field: string;
  expected: string;
  found: string;
  match: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  curp: "CURP",
  rfc: "RFC",
  numeroIne: "Número de INE",
  fechaNacimiento: "Fecha de nacimiento",
};

export default function EmployeeSignContract() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("intro");
  const [errorMsg, setErrorMsg] = useState("");

  const [ineFront, setIneFront] = useState<string | null>(null);
  const [ineBack, setIneBack] = useState<string | null>(null);
  const [comparison, setComparison] = useState<ComparisonRow[]>([]);
  const [selfie, setSelfie] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    // Limpia el lienzo cada vez que se llega al paso de firma.
    if (step !== "signature") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [step]);

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleIneFront(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !contractId) return;
    const dataUrl = await readFileAsDataUrl(file);
    setIneFront(dataUrl);
    setStep("verifying");
    setErrorMsg("");
    try {
      const res = await employeeApi.post(`/contracts/portal/${contractId}/verify-ine`, {
        ineFrontBase64: dataUrl,
        tipo: "INE",
      });
      setComparison(res.data?.comparison ?? []);
      setStep(res.data?.allMatch === false ? "mismatch" : "ine");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "No fue posible leer la INE. Intenta de nuevo con mejor luz.");
      setStep("ine");
    }
  }

  async function handleIneBack(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIneBack(await readFileAsDataUrl(file));
  }

  async function handleSelfie(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelfie(await readFileAsDataUrl(file));
    setStep("signature");
  }

  function pointerPos(canvas: HTMLCanvasElement, e: React.PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawingRef.current = true;
    const ctx = canvas.getContext("2d");
    const { x, y } = pointerPos(canvas, e);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointerPos(canvas, e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111111";
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  }

  function endDraw() {
    drawingRef.current = false;
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    setHasSignature(false);
  }

  async function getGps(): Promise<{ lat?: number; lng?: number }> {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      );
      return { lat: position.coords.latitude, lng: position.coords.longitude };
    } catch {
      return {}; // sin GPS no se bloquea la firma — mismo criterio que check-in del Portal
    }
  }

  async function submitSignature() {
    if (!contractId || !hasSignature) return;
    setStep("sending");
    setErrorMsg("");
    try {
      const signatureBase64 = canvasRef.current?.toDataURL("image/png") || "";
      const { lat, lng } = await getGps();
      await employeeApi.post(`/contracts/portal/${contractId}/sign`, {
        signatureBase64,
        selfieBase64: selfie,
        ineFrontBase64: ineFront,
        ineBackBase64: ineBack,
        lat,
        lng,
      });
      setStep("done");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "No fue posible registrar la firma. Intenta de nuevo.");
      setStep("error");
    }
  }

  return (
    <EmployeeLayout>
      <div style={{ padding: "28px 20px 0" }}>
        <h1 style={{ color: "#F5F5F5", fontSize: "1.2rem", fontWeight: 600, marginBottom: 6 }}>
          Firma electrónica
        </h1>
        <p style={{ color: "#505050", fontSize: "0.78rem", marginBottom: 24 }}>
          Necesitamos verificar tu identidad antes de firmar — INE, una foto tuya y tu firma.
        </p>

        {errorMsg && (
          <div style={{
            background: "#1A0808", border: "1px solid #EF444430", borderRadius: 10,
            padding: "12px 14px", marginBottom: 16, color: "#EF4444", fontSize: "0.78rem",
          }}>
            {errorMsg}
          </div>
        )}

        {step === "intro" && (
          <Card>
            <StepLabel n={1} total={3} label="Foto de tu INE" />
            <p style={{ color: "#505050", fontSize: "0.78rem", marginBottom: 16 }}>
              Frente y reverso, con buena luz y sin reflejos.
            </p>
            <FileButton label="Tomar foto — frente de la INE" capture="environment" onChange={handleIneFront} />
          </Card>
        )}

        {step === "verifying" && (
          <Card>
            <div style={{ textAlign: "center", padding: "24px 0", color: "#383838", fontSize: "0.8rem", letterSpacing: "0.1em" }}>
              VERIFICANDO INE...
            </div>
          </Card>
        )}

        {step === "ine" && ineFront && (
          <Card>
            <StepLabel n={1} total={3} label="Foto de tu INE" />
            <img src={ineFront} alt="INE frente" style={{ width: "100%", borderRadius: 10, marginBottom: 12 }} />
            {comparison.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {comparison.map((c) => (
                  <div key={c.field} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", padding: "4px 0", color: c.match ? "#22C55E" : "#EF4444" }}>
                    <span>{FIELD_LABELS[c.field] || c.field}</span>
                    <span>{c.match ? "✓ Coincide" : "✗ No coincide"}</span>
                  </div>
                ))}
              </div>
            )}
            {!ineBack ? (
              <FileButton label="Tomar foto — reverso de la INE" capture="environment" onChange={handleIneBack} />
            ) : (
              <PrimaryButton label="Continuar — tomar selfie" onClick={() => setStep("selfie")} />
            )}
          </Card>
        )}

        {step === "mismatch" && (
          <Card>
            <div style={{ color: "#EF4444", fontSize: "0.85rem", fontWeight: 600, marginBottom: 8 }}>
              No pudimos confirmar tu identidad
            </div>
            <p style={{ color: "#505050", fontSize: "0.78rem", marginBottom: 16 }}>
              Los datos de tu INE no coinciden con tu expediente. Contacta a Recursos Humanos antes de continuar — no se puede firmar con esta discrepancia.
            </p>
            {comparison.map((c) => (
              <div key={c.field} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", padding: "4px 0", color: c.match ? "#22C55E" : "#EF4444" }}>
                <span>{FIELD_LABELS[c.field] || c.field}</span>
                <span>{c.match ? "✓ Coincide" : "✗ No coincide"}</span>
              </div>
            ))}
            <div style={{ marginTop: 16 }}>
              <FileButton label="Reintentar con otra foto" capture="environment" onChange={handleIneFront} />
            </div>
          </Card>
        )}

        {step === "selfie" && (
          <Card>
            <StepLabel n={2} total={3} label="Una foto tuya" />
            <p style={{ color: "#505050", fontSize: "0.78rem", marginBottom: 16 }}>
              Rostro descubierto, mirando de frente a la cámara.
            </p>
            <FileButton label="Tomar selfie" capture="user" onChange={handleSelfie} />
          </Card>
        )}

        {step === "signature" && (
          <Card>
            <StepLabel n={3} total={3} label="Tu firma" />
            <p style={{ color: "#505050", fontSize: "0.78rem", marginBottom: 12 }}>
              Dibuja tu firma con el dedo dentro del recuadro.
            </p>
            <canvas
              ref={canvasRef}
              width={340}
              height={140}
              onPointerDown={startDraw}
              onPointerMove={draw}
              onPointerUp={endDraw}
              onPointerLeave={endDraw}
              style={{ width: "100%", height: 140, background: "#FFFFFF", borderRadius: 10, touchAction: "none" }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button
                onClick={clearSignature}
                style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid #2A2A2A", borderRadius: 10, color: "#A0A0A0", fontSize: "0.78rem" }}
              >
                Borrar
              </button>
            </div>
            <div style={{ marginTop: 12 }}>
              <PrimaryButton label="Firmar contrato" onClick={submitSignature} disabled={!hasSignature} />
            </div>
          </Card>
        )}

        {step === "sending" && (
          <Card>
            <div style={{ textAlign: "center", padding: "24px 0", color: "#383838", fontSize: "0.8rem", letterSpacing: "0.1em" }}>
              REGISTRANDO FIRMA...
            </div>
          </Card>
        )}

        {step === "done" && (
          <Card>
            <div style={{ color: "#22C55E", fontSize: "0.95rem", fontWeight: 600, marginBottom: 8 }}>
              ✓ Contrato firmado
            </div>
            <p style={{ color: "#505050", fontSize: "0.78rem", marginBottom: 16 }}>
              Puedes ver el contrato firmado y la constancia de firma en "Mis Documentos".
            </p>
            <PrimaryButton label="Ir a Documentos" onClick={() => navigate("/employee/documents")} />
          </Card>
        )}

        {step === "error" && (
          <Card>
            <PrimaryButton label="Reintentar firma" onClick={submitSignature} />
          </Card>
        )}
      </div>
    </EmployeeLayout>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#0E0E0E", border: "1px solid #1C1C1C", borderRadius: 14, padding: "18px 16px", marginBottom: 16 }}>
      {children}
    </div>
  );
}

function StepLabel({ n, total, label }: { n: number; total: number; label: string }) {
  return (
    <div style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#383838", marginBottom: 10 }}>
      Paso {n} de {total} · {label}
    </div>
  );
}

function PrimaryButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", padding: "14px",
        background: disabled ? "#1A1A1A" : "#22C55E15",
        border: `1px solid ${disabled ? "#2A2A2A" : "#22C55E40"}`,
        borderRadius: 10,
        color: disabled ? "#383838" : "#22C55E",
        fontSize: "0.82rem", fontWeight: 600, letterSpacing: "0.05em",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

function FileButton({ label, capture, onChange }: { label: string; capture: "user" | "environment"; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" capture={capture} onChange={onChange} style={{ display: "none" }} />
      <button
        onClick={() => inputRef.current?.click()}
        style={{
          width: "100%", padding: "14px",
          background: "#8FAFD415", border: "1px solid #8FAFD440", borderRadius: 10,
          color: "#8FAFD4", fontSize: "0.82rem", fontWeight: 600, letterSpacing: "0.05em", cursor: "pointer",
        }}
      >
        {label}
      </button>
    </>
  );
}
