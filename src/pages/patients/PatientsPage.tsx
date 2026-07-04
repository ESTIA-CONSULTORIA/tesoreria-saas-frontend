import { useState, useEffect } from 'react';
import { api } from '../../core/api/api';
import MainLayout from '../../core/layout/MainLayout';

interface Patient {
  id: string;
  nombre: string;
  telefono?: string;
  email?: string;
  tipo: string;
  numeroVisitas: number;
  origen?: string;
  notas?: string;
  createdAt: string;
}

interface Consulta {
  id: string;
  doctor: string;
  tratamiento: string;
  importe: number;
  pagado: number;
  metodoPago: string;
  status: string;
  proximaCita?: string;
  notas?: string;
  fecha: string;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [view, setView] = useState<'detail' | 'new-patient' | 'new-consulta'>('detail');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', origen: '', notas: '' });
  const [consultaForm, setConsultaForm] = useState({
    doctor: '', tratamiento: '', importe: '', pagado: '',
    metodoPago: 'efectivo', status: 'pagado', proximaCita: '', notas: '',
  });

  useEffect(() => {
    api.get('/patients')
      .then(r => setPatients(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadConsultas = (patientId: string) => {
    api.get(`/patients/${patientId}/consultas`)
      .then(r => setConsultas(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  };

  const selectPatient = (p: Patient) => {
    setSelected(p);
    setView('detail');
    loadConsultas(p.id);
  };

  const savePatient = async () => {
    const res = await api.post('/patients', form);
    setPatients(prev => [res.data, ...prev]);
    setSelected(res.data);
    setView('detail');
    setForm({ nombre: '', telefono: '', email: '', origen: '', notas: '' });
  };

  const saveConsulta = async () => {
    if (!selected) return;
    await api.post('/patients/consultas', {
      ...consultaForm,
      patientId: selected.id,
      importe: parseFloat(consultaForm.importe) || 0,
      pagado: parseFloat(consultaForm.pagado) || 0,
    });
    loadConsultas(selected.id);
    const updated = { ...selected, numeroVisitas: selected.numeroVisitas + 1, tipo: 'recurrente' };
    setSelected(updated as Patient);
    setPatients(prev => prev.map(p => p.id === selected.id ? updated as Patient : p));
    setView('detail');
    setConsultaForm({ doctor: '', tratamiento: '', importe: '', pagado: '', metodoPago: 'efectivo', status: 'pagado', proximaCita: '', notas: '' });
  };

  const filtered = patients.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.telefono?.includes(search),
  );

  const saldo = consultas.reduce((s, c) => s + (Number(c.importe) - Number(c.pagado)), 0);

  const s = {
    container: { display: 'flex', height: 'calc(100vh - 120px)', gap: 0, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' },
    left: { width: 280, borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column' as const, background: '#0f1117' },
    right: { flex: 1, display: 'flex', flexDirection: 'column' as const, background: '#141820', overflowY: 'auto' as const },
    header: { padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' },
    row: { padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' },
    input: { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#c8cdd8', fontSize: 13, marginBottom: 10, outline: 'none' },
    label: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 4, display: 'block' as const, letterSpacing: '0.05em' },
    btn: { padding: '8px 16px', borderRadius: 8, border: 'none', background: 'rgba(143,175,212,0.1)', color: '#8fafd4', fontSize: 12, cursor: 'pointer' },
    btnGreen: { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#1a3a2a', color: '#4ade80', fontSize: 13, cursor: 'pointer', fontWeight: 500 },
  };

  return (
    <MainLayout>
      <div style={{ padding: '0 0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 500, color: '#c8cdd8', marginBottom: 2 }}>Pacientes</h1>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{patients.length} pacientes registrados</div>
          </div>
          <button style={s.btnGreen} onClick={() => { setSelected(null); setView('new-patient'); }}>+ Nuevo Paciente</button>
        </div>

        <div style={s.container}>
          {/* Panel izquierdo */}
          <div style={s.left}>
            <div style={s.header}>
              <input placeholder="Buscar paciente..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ ...s.input, marginBottom: 0 }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto' as const }}>
              {loading ? (
                <div style={{ padding: 20, color: 'rgba(255,255,255,0.2)', fontSize: 13, textAlign: 'center' }}>Cargando...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 20, color: 'rgba(255,255,255,0.2)', fontSize: 13, textAlign: 'center' }}>Sin pacientes</div>
              ) : filtered.map(p => (
                <div key={p.id} onClick={() => selectPatient(p)}
                  style={{ ...s.row, background: selected?.id === p.id ? 'rgba(143,175,212,0.08)' : 'transparent', borderLeft: `3px solid ${selected?.id === p.id ? '#8fafd4' : 'transparent'}` }}>
                  <div style={{ fontSize: 13, color: '#c8cdd8', fontWeight: 500 }}>{p.nombre}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: p.tipo === 'nuevo' ? 'rgba(74,222,128,0.12)' : 'rgba(143,175,212,0.12)', color: p.tipo === 'nuevo' ? '#4ade80' : '#8fafd4' }}>
                      {p.tipo === 'nuevo' ? 'Nuevo' : 'Recurrente'}
                    </span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{p.numeroVisitas} visita{p.numeroVisitas !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Panel derecho */}
          <div style={s.right}>
            {/* Nuevo paciente */}
            {view === 'new-patient' && (
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#c8cdd8', marginBottom: 20 }}>Nuevo Paciente</div>
                <label style={s.label}>Nombre completo *</label>
                <input style={s.input} value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del paciente" />
                <label style={s.label}>Teléfono</label>
                <input style={s.input} value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="Teléfono" />
                <label style={s.label}>Email</label>
                <input style={s.input} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email" />
                <label style={s.label}>Origen</label>
                <select style={s.input} value={form.origen} onChange={e => setForm(p => ({ ...p, origen: e.target.value }))}>
                  <option value="">Selecciona el origen</option>
                  <option value="recomendacion">Recomendación</option>
                  <option value="redes">Redes sociales</option>
                  <option value="google">Google</option>
                  <option value="otro">Otro</option>
                </select>
                <label style={s.label}>Notas</label>
                <textarea style={{ ...s.input, height: 80, resize: 'none' as const }} value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} placeholder="Notas adicionales" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={s.btnGreen} onClick={savePatient} disabled={!form.nombre}>Guardar Paciente</button>
                  <button style={s.btn} onClick={() => setView('detail')}>Cancelar</button>
                </div>
              </div>
            )}

            {/* Nueva consulta */}
            {view === 'new-consulta' && selected && (
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#c8cdd8', marginBottom: 4 }}>Nueva Consulta</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>{selected.nombre}</div>
                <label style={s.label}>Doctor *</label>
                <input style={s.input} value={consultaForm.doctor} onChange={e => setConsultaForm(p => ({ ...p, doctor: e.target.value }))} placeholder="Nombre del doctor" />
                <label style={s.label}>Tratamiento *</label>
                <input style={s.input} value={consultaForm.tratamiento} onChange={e => setConsultaForm(p => ({ ...p, tratamiento: e.target.value }))} placeholder="Tratamiento realizado" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={s.label}>Importe total</label>
                    <input style={s.input} type="number" value={consultaForm.importe} onChange={e => setConsultaForm(p => ({ ...p, importe: e.target.value }))} placeholder="$0.00" />
                  </div>
                  <div>
                    <label style={s.label}>Monto pagado</label>
                    <input style={s.input} type="number" value={consultaForm.pagado} onChange={e => setConsultaForm(p => ({ ...p, pagado: e.target.value }))} placeholder="$0.00" />
                  </div>
                </div>
                <label style={s.label}>Método de pago</label>
                <select style={s.input} value={consultaForm.metodoPago} onChange={e => setConsultaForm(p => ({ ...p, metodoPago: e.target.value }))}>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="mixto">Mixto</option>
                </select>
                <label style={s.label}>Estado del pago</label>
                <select style={s.input} value={consultaForm.status} onChange={e => setConsultaForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="pagado">Pagado</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="parcial">Parcial</option>
                </select>
                <label style={s.label}>Próxima cita</label>
                <input style={s.input} type="date" value={consultaForm.proximaCita} onChange={e => setConsultaForm(p => ({ ...p, proximaCita: e.target.value }))} />
                <label style={s.label}>Notas</label>
                <textarea style={{ ...s.input, height: 60, resize: 'none' as const }} value={consultaForm.notas} onChange={e => setConsultaForm(p => ({ ...p, notas: e.target.value }))} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={s.btnGreen} onClick={saveConsulta} disabled={!consultaForm.doctor || !consultaForm.tratamiento}>Guardar Consulta</button>
                  <button style={s.btn} onClick={() => setView('detail')}>Cancelar</button>
                </div>
              </div>
            )}

            {/* Detalle del paciente */}
            {view === 'detail' && selected && (
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 500, color: '#c8cdd8' }}>{selected.nombre}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: selected.tipo === 'nuevo' ? 'rgba(74,222,128,0.12)' : 'rgba(143,175,212,0.12)', color: selected.tipo === 'nuevo' ? '#4ade80' : '#8fafd4' }}>
                        {selected.tipo === 'nuevo' ? 'Paciente nuevo' : 'Paciente recurrente'}
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{selected.numeroVisitas} consulta{selected.numeroVisitas !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <button style={s.btnGreen} onClick={() => setView('new-consulta')}>+ Nueva Consulta</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Teléfono', value: selected.telefono || '—' },
                    { label: 'Email', value: selected.email || '—' },
                    { label: 'Origen', value: selected.origen || '—' },
                    { label: 'Saldo pendiente', value: saldo > 0 ? `$${saldo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '$0.00' },
                    { label: 'Registro', value: new Date(selected.createdAt).toLocaleDateString('es-MX') },
                  ].map(item => (
                    <div key={item.label} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: '#0f1117' }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 13, color: saldo > 0 && item.label === 'Saldo pendiente' ? 'rgba(252,165,165,0.8)' : '#c8cdd8' }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Historial de consultas</div>
                {consultas.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>Sin consultas registradas</div>
                ) : (
                  <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', background: '#0f1117', overflow: 'hidden' }}>
                    {consultas.map(c => (
                      <div key={c.id} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div>
                            <div style={{ fontSize: 13, color: '#c8cdd8', fontWeight: 500 }}>{c.tratamiento}</div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                              Dr. {c.doctor} · {new Date(c.fecha).toLocaleDateString('es-MX')}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 14, fontWeight: 500, color: c.status === 'pendiente' ? 'rgba(252,165,165,0.8)' : '#4ade80' }}>
                              ${Number(c.pagado).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </div>
                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: c.status === 'pagado' ? 'rgba(74,222,128,0.1)' : c.status === 'pendiente' ? 'rgba(252,165,165,0.1)' : 'rgba(251,191,36,0.1)', color: c.status === 'pagado' ? '#4ade80' : c.status === 'pendiente' ? 'rgba(252,165,165,0.8)' : 'rgba(251,191,36,0.8)' }}>
                              {c.status}
                            </span>
                          </div>
                        </div>
                        {c.proximaCita && (
                          <div style={{ fontSize: 11, color: '#8fafd4' }}>Próxima cita: {new Date(c.proximaCita).toLocaleDateString('es-MX')}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {view === 'detail' && !selected && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
                Selecciona un paciente para ver el detalle
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
