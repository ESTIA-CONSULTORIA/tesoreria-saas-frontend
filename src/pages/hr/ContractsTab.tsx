import { useState, useEffect, useRef } from 'react';
import { api } from '../../core/api/api';

interface Props {
  employees: any[];
  tenantId: string;
  companyId: string;
}

const SIGNATURE_LEVELS = [
  { value: 'SIMPLE', label: 'Nivel 1 — Firma simple', desc: 'Firma en pantalla + timestamp + IP' },
  { value: 'KYC', label: 'Nivel 2 — KYC', desc: 'Firma + INE + Selfie + GPS' },
  { value: 'BIOMETRICO', label: 'Nivel 3 — Biométrico', desc: 'KYC + validación facial por IA' },
];

const FIELD_CATALOG = [
  'nombre_completo','curp','rfc','numero_imss','fecha_nacimiento',
  'domicilio','ciudad','estado','puesto','area','fecha_ingreso',
  'tipo_contrato','tipo_jornada','turno','salario_mensual',
  'salario_diario','periodo_pago','empresa','sucursal','fecha_contrato'
];

export function ContractsTab({ employees, tenantId: _tenantId, companyId: _companyId }: Props) {
  const [subTab, setSubTab] = useState<'contratos'|'plantillas'>('contratos');
  const [templates, setTemplates] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentContract, setCurrentContract] = useState<any>(null);
  const [signStep, setSignStep] = useState(0);
  const [signLevel, setSignLevel] = useState('SIMPLE');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [uploadForm, setUploadForm] = useState({ name: '', fileType: 'DOCX', fileBase64: '' });
  const [signData, setSignData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadContracts();
  }, []);

  const loadTemplates = async () => {
    console.log('[ContractsTab] loadTemplates ejecutado');
    try {
      const res = await api.get('/contracts/templates');
      setTemplates(Array.isArray(res.data) ? res.data : []);
    } catch(e) { console.error(e); }
  };

  const loadContracts = async () => {
    try {
      const res = await api.get('/contracts');
      setContracts(Array.isArray(res.data) ? res.data : []);
    } catch(e) { console.error(e); }
  };

  const loadEmpContracts = async (empId: string) => {
    try {
      const res = await api.get(`/contracts?employeeId=${empId}`);
      setContracts(Array.isArray(res.data) ? res.data : []);
    } catch(e) { console.error(e); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(',')[1];
      const fileType = file.name.endsWith('.docx') ? 'DOCX' : 'PDF';
      setUploadForm(p => ({ ...p, fileBase64: base64, fileType }));
    };
    reader.readAsDataURL(file);
  };

  const uploadTemplate = async () => {
    console.log('[ContractsTab] uploadTemplate ejecutado', { name: uploadForm.name, fileType: uploadForm.fileType, hasFile: !!uploadForm.fileBase64 });
    if (!uploadForm.name || !uploadForm.fileBase64) return;
    setLoading(true);
    try {
      await api.post('/contracts/templates', uploadForm);
      await loadTemplates();
      setShowUploadModal(false);
      setUploadForm({ name: '', fileType: 'DOCX', fileBase64: '' });
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const generateContract = async () => {
    if (!selectedEmp || !selectedTemplate) return;
    setLoading(true);
    try {
      const res = await api.post('/contracts/generate', {
        employeeId: selectedEmp.id,
        templateId: selectedTemplate,
        signatureLevel: signLevel,
      });
      setCurrentContract(res.data);
      setShowGenerateModal(false);
      setShowSignModal(true);
      setSignStep(0);
      setSignData({});
      setHasSignature(false);
      await loadEmpContracts(selectedEmp.id);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const getSignatureBase64 = () => {
    return canvasRef.current?.toDataURL('image/png') || '';
  };

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSignData((p: any) => ({ ...p, [field]: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const signContract = async () => {
    if (!currentContract || !hasSignature) return;
    setLoading(true);
    try {
      const sigBase64 = getSignatureBase64();
      await api.post(`/contracts/${currentContract.id}/sign`, {
        signatureBase64: sigBase64,
        selfieBase64: signData.selfie,
        ineFrontBase64: signData.ineFront,
        ineBackBase64: signData.ineBack,
        lat: signData.lat,
        lng: signData.lng,
      });
      setShowSignModal(false);
      if (selectedEmp) await loadEmpContracts(selectedEmp.id);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(pos => {
      setSignData((p: any) => ({ ...p, lat: pos.coords.latitude, lng: pos.coords.longitude }));
    });
  };

  const s = {
    card: { background: '#141820', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 16px', marginBottom: 10 } as React.CSSProperties,
    btn: { padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#c8cdd8', fontSize: 12, cursor: 'pointer' } as React.CSSProperties,
    btnPrimary: { padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(123,156,204,0.3)', background: 'rgba(123,156,204,0.1)', color: '#8fafd4', fontSize: 12, cursor: 'pointer' } as React.CSSProperties,
    input: { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0f1117', color: '#c8cdd8', fontSize: 13 } as React.CSSProperties,
    label: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4, display: 'block' } as React.CSSProperties,
  };

  const signSteps = [
    { key: 'review', label: 'Revisar contrato' },
    ...(signLevel !== 'SIMPLE' ? [
      { key: 'ineFront', label: 'Foto INE frontal' },
      { key: 'ineBack', label: 'Foto INE trasera' },
      { key: 'selfie', label: 'Selfie' },
    ] : []),
    { key: 'sign', label: 'Firma' },
  ];

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[{ key: 'contratos', label: 'Contratos' }, { key: 'plantillas', label: 'Plantillas' }].map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key as any)}
            style={{ ...s.btn, ...(subTab === t.key ? { borderColor: 'rgba(123,156,204,0.5)', background: 'rgba(123,156,204,0.15)', color: '#8fafd4' } : {}) }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Contratos */}
      {subTab === 'contratos' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <select onChange={e => {
              const emp = employees.find(x => x.id === e.target.value);
              setSelectedEmp(emp || null);
              if (emp) loadEmpContracts(emp.id);
            }} style={{ ...s.input, flex: 1 }}>
              <option value="">— Seleccionar empleado —</option>
              {employees.filter(e => e.status === 'ACTIVO').map(e => (
                <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>
              ))}
            </select>
            {selectedEmp && (
              <button onClick={() => setShowGenerateModal(true)} style={s.btnPrimary}>
                + Generar contrato
              </button>
            )}
          </div>

          {contracts.length === 0 ? (
            <div style={{ ...s.card, textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 40 }}>
              {selectedEmp ? 'Sin contratos para este empleado' : 'Selecciona un empleado para ver sus contratos'}
            </div>
          ) : (
            <div style={s.card}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['Fecha', 'Nivel', 'Estado', 'Acciones'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 500, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c: any) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '8px 10px', color: '#c8cdd8' }}>{new Date(c.createdAt).toLocaleDateString('es-MX')}</td>
                      <td style={{ padding: '8px 10px', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{c.signatureLevel}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 99,
                          background: c.status === 'FIRMADO' ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.07)',
                          color: c.status === 'FIRMADO' ? '#4ade80' : 'rgba(255,255,255,0.5)',
                        }}>{c.status}</span>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={async () => {
                            const res = await api.get(`/contracts/${c.id}/pdf`);
                            const link = document.createElement('a');
                            link.href = `data:application/pdf;base64,${res.data.pdf}`;
                            link.download = `contrato_${c.id}.pdf`;
                            link.click();
                          }} style={{ ...s.btn, fontSize: 11 }}>Descargar PDF</button>
                          {c.status === 'PENDIENTE' && (
                            <button onClick={async () => {
                              const res = await api.get(`/contracts/${c.id}/pdf`);
                              setCurrentContract({ ...c, contractPdfBase64: res.data.pdf });
                              setSignStep(0);
                              setHasSignature(false);
                              setSignData({});
                              setShowSignModal(true);
                            }} style={{ ...s.btnPrimary, fontSize: 11 }}>Firmar</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: Plantillas */}
      {subTab === 'plantillas' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              Usa marcadores <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>{`{{campo}}`}</code> en tu Word o PDF
            </div>
            <button onClick={() => setShowUploadModal(true)} style={s.btnPrimary}>+ Subir plantilla</button>
          </div>

          <div style={{ marginBottom: 8, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            Campos disponibles: {FIELD_CATALOG.map(f => (
              <code key={f} style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3, margin: '0 2px', fontSize: 10 }}>{`{{${f}}}`}</code>
            ))}
          </div>

          {templates.length === 0 ? (
            <div style={{ ...s.card, textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 40 }}>Sin plantillas</div>
          ) : (
            <div style={s.card}>
              {templates.map((t: any) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#c8cdd8' }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                      {t.fileType} · {t.detectedFields?.length || 0} campos · {t.isGlobal ? 'ESTIA' : 'Empresa'}
                    </div>
                  </div>
                  {!t.isGlobal && (
                    <button onClick={async () => { await api.delete(`/contracts/templates/${t.id}`); await loadTemplates(); }}
                      style={{ ...s.btn, fontSize: 11, color: 'rgba(252,165,165,0.7)', borderColor: 'rgba(252,165,165,0.2)' }}>
                      Eliminar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Generar contrato */}
      {showGenerateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#141820', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', padding: 24, width: 460 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#c8cdd8', marginBottom: 20 }}>
              Generar contrato — {selectedEmp?.nombre} {selectedEmp?.apellidos}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={s.label}>Plantilla</label>
                <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} style={s.input}>
                  <option value="">— Seleccionar plantilla —</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.fileType})</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Nivel de firma</label>
                {SIGNATURE_LEVELS.map(l => (
                  <div key={l.value} onClick={() => setSignLevel(l.value)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                      background: signLevel === l.value ? 'rgba(123,156,204,0.12)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${signLevel === l.value ? 'rgba(123,156,204,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${signLevel === l.value ? '#8fafd4' : 'rgba(255,255,255,0.3)'}`,
                      background: signLevel === l.value ? '#8fafd4' : 'transparent' }} />
                    <div>
                      <div style={{ fontSize: 12, color: '#c8cdd8' }}>{l.label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{l.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowGenerateModal(false)} style={{ ...s.btn, flex: 1 }}>Cancelar</button>
              <button onClick={generateContract} disabled={!selectedTemplate || loading}
                style={{ ...s.btnPrimary, flex: 1, opacity: (!selectedTemplate || loading) ? 0.5 : 1 }}>
                {loading ? 'Generando...' : 'Generar contrato'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Flujo de firma */}
      {showSignModal && currentContract && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#141820', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', padding: 24, width: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
              {signSteps.map((step, i) => (
                <div key={step.key} style={{ flex: 1, height: 3, borderRadius: 99,
                  background: i <= signStep ? '#8fafd4' : 'rgba(255,255,255,0.1)' }} />
              ))}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#c8cdd8', marginBottom: 16 }}>
              {signSteps[signStep]?.label}
            </div>

            {signSteps[signStep]?.key === 'review' && (
              <div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 16, marginBottom: 16, fontSize: 12, color: 'rgba(255,255,255,0.6)', minHeight: 120 }}>
                  El contrato ha sido generado con los datos del empleado. Por favor revísalo antes de continuar.
                </div>
                <button onClick={async () => {
                  const res = await api.get(`/contracts/${currentContract.id}/pdf`);
                  const win = window.open('', '_blank');
                  if (win) {
                    win.document.write(`<iframe src="data:application/pdf;base64,${res.data.pdf}" width="100%" height="100%" style="border:none"></iframe>`);
                    win.document.close();
                  }
                }} style={{ ...s.btn, width: '100%', marginBottom: 12 }}>Ver PDF del contrato</button>
              </div>
            )}

            {['ineFront', 'ineBack', 'selfie'].includes(signSteps[signStep]?.key) && (
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
                  {signSteps[signStep]?.key === 'ineFront' && 'Toma una foto de la parte FRONTAL de tu INE'}
                  {signSteps[signStep]?.key === 'ineBack' && 'Toma una foto de la parte TRASERA de tu INE'}
                  {signSteps[signStep]?.key === 'selfie' && 'Toma una selfie mirando de frente a la cámara'}
                </div>
                <input type="file" accept="image/*" capture="environment"
                  onChange={e => handleCapture(e, signSteps[signStep]?.key)}
                  style={{ ...s.input, marginBottom: 12 }} />
                {signData[signSteps[signStep]?.key] && (
                  <img src={signData[signSteps[signStep]?.key]} alt="captura"
                    style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8, marginBottom: 12 }} />
                )}
              </div>
            )}

            {signSteps[signStep]?.key === 'sign' && (
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                  Dibuja tu firma en el recuadro
                </div>
                <canvas ref={canvasRef} width={452} height={120}
                  style={{ background: '#fff', borderRadius: 8, cursor: 'crosshair', touchAction: 'none', width: '100%' }}
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={clearCanvas} style={{ ...s.btn, fontSize: 11 }}>Limpiar</button>
                  <button onClick={getLocation} style={{ ...s.btn, fontSize: 11 }}>
                    {signData.lat ? '✓ GPS capturado' : 'Capturar ubicación'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => { if (signStep === 0) setShowSignModal(false); else setSignStep(p => p - 1); }}
                style={{ ...s.btn, flex: 1 }}>
                {signStep === 0 ? 'Cancelar' : '← Atrás'}
              </button>
              {signStep < signSteps.length - 1 ? (
                <button onClick={() => setSignStep(p => p + 1)}
                  style={{ ...s.btnPrimary, flex: 1 }}>
                  Siguiente →
                </button>
              ) : (
                <button onClick={signContract} disabled={!hasSignature || loading}
                  style={{ ...s.btnPrimary, flex: 1, opacity: (!hasSignature || loading) ? 0.5 : 1 }}>
                  {loading ? 'Firmando...' : 'Confirmar firma'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Subir plantilla */}
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#141820', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', padding: 24, width: 420 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#c8cdd8', marginBottom: 20 }}>Subir plantilla de contrato</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={s.label}>Nombre de la plantilla</label>
                <input value={uploadForm.name} onChange={e => setUploadForm(p => ({ ...p, name: e.target.value }))} style={s.input} placeholder="ej: Contrato indefinido" />
              </div>
              <div>
                <label style={s.label}>Archivo (.docx o .pdf)</label>
                <input type="file" accept=".docx,.pdf" onChange={handleFileUpload} style={s.input} />
                {uploadForm.fileBase64 && <div style={{ fontSize: 11, color: '#4ade80', marginTop: 4 }}>✓ Archivo cargado ({uploadForm.fileType})</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowUploadModal(false)} style={{ ...s.btn, flex: 1 }}>Cancelar</button>
              <button onClick={uploadTemplate} disabled={!uploadForm.name || !uploadForm.fileBase64 || loading}
                style={{ ...s.btnPrimary, flex: 1, opacity: (!uploadForm.name || !uploadForm.fileBase64) ? 0.5 : 1 }}>
                {loading ? 'Subiendo...' : 'Subir plantilla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
