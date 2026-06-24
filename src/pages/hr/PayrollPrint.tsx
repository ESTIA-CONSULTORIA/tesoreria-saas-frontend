import { useRef } from 'react';

interface Props {
  run: any;
  employees: any[];
  company: any;
  branch: any;
}

export function PayrollPrint({ run, employees, company, branch }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Lista de Raya — ${run.periodStart} al ${run.periodEnd}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
    .company-name { font-size: 16px; font-weight: bold; }
    .periodo { font-size: 12px; margin-top: 4px; }
    .recibo { border: 1px solid #999; margin-bottom: 16px; page-break-inside: avoid; }
    .recibo-header { background: #f0f0f0; padding: 8px 12px; display: flex; justify-content: space-between; }
    .recibo-body { padding: 8px 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th { background: #f0f0f0; padding: 4px 8px; text-align: left; font-size: 10px; border: 1px solid #ccc; }
    td { padding: 4px 8px; border: 1px solid #ccc; font-size: 11px; }
    .amount { text-align: right; }
    .neto { font-weight: bold; font-size: 13px; }
    .firma { margin-top: 12px; display: flex; justify-content: flex-end; }
    .firma-line { text-align: center; }
    .firma-linea { border-bottom: 1px solid #000; width: 160px; margin-bottom: 4px; height: 24px; }
    .firma-label { font-size: 10px; }
    .resumen { margin-top: 20px; border-top: 2px solid #000; padding-top: 12px; }
    .resumen table { width: 50%; margin-left: auto; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>${content}</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const totalPerceptions = (run.entries || []).reduce((s: number, e: any) => s + Number(e.totalPerceptions), 0);
  const totalDeductions  = (run.entries || []).reduce((s: number, e: any) => s + Number(e.totalDeductions), 0);
  const totalNet         = (run.entries || []).reduce((s: number, e: any) => s + Number(e.netAmount), 0);

  return (
    <div>
      <button
        onClick={handlePrint}
        style={{ marginBottom: 16, padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(123,156,204,0.3)', background: 'rgba(123,156,204,0.1)', color: '#8fafd4', fontSize: 13, cursor: 'pointer' }}
      >Imprimir lista de raya completa</button>

      <div ref={printRef}>
        <div className="header">
          <div className="company-name">{company?.legalName || company?.tradeName || company?.name || 'Empresa'}</div>
          <div className="periodo">
            Sucursal: {branch?.name || '—'} &nbsp;|&nbsp;
            Período: {run.periodStart} al {run.periodEnd} &nbsp;|&nbsp;
            Tipo: {run.periodType} &nbsp;|&nbsp;
            Fecha de impresión: {new Date().toLocaleDateString('es-MX')}
          </div>
        </div>

        {(run.entries || []).map((entry: any) => {
          const emp = employees.find(e => e.id === entry.employeeId);
          const empName = emp ? `${emp.nombre} ${emp.apellidos || ''}`.trim() : entry.employeeId;
          const perceptions = (entry.concepts || []).filter((c: any) => c.type === 'P');
          const deductions  = (entry.concepts || []).filter((c: any) => c.type === 'D');
          const rows = Math.max(perceptions.length, deductions.length);
          return (
            <div key={entry.id} className="recibo">
              <div className="recibo-header">
                <div>
                  <strong>{empName}</strong> &nbsp;|&nbsp; {emp?.puesto || '—'} &nbsp;|&nbsp; IMSS: {emp?.imssNumber || 'N/D'}
                </div>
                <div>Días laborados: {entry.workedDays} &nbsp;|&nbsp; SDI: ${Number(entry.dailySalary).toFixed(2)}</div>
              </div>
              <div className="recibo-body">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>Percepciones</th>
                      <th className="amount">Importe</th>
                      <th style={{ width: '40%' }}>Deducciones</th>
                      <th className="amount">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: rows }).map((_, i) => (
                      <tr key={i}>
                        <td>{perceptions[i]?.name || ''}</td>
                        <td className="amount">{perceptions[i] ? `$${Number(perceptions[i].amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : ''}</td>
                        <td>{deductions[i]?.name || ''}</td>
                        <td className="amount">{deductions[i] ? `-$${Number(deductions[i].amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : ''}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 'bold', background: '#f9f9f9' }}>
                      <td>Total percepciones</td>
                      <td className="amount">${Number(entry.totalPerceptions).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                      <td>Total deducciones</td>
                      <td className="amount">-${Number(entry.totalDeductions).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <div className="neto">NETO A PAGAR EN EFECTIVO: ${Number(entry.netAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
                  <div className="firma">
                    <div className="firma-line">
                      <div className="firma-linea"></div>
                      <div className="firma-label">Firma del trabajador</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="resumen">
          <table>
            <tbody>
              <tr><td>Total percepciones</td><td className="amount">${totalPerceptions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td></tr>
              <tr><td>Total deducciones</td><td className="amount">-${totalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td></tr>
              <tr style={{ fontWeight: 'bold', fontSize: 13 }}><td>TOTAL PAGADO</td><td className="amount">${totalNet.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td></tr>
            </tbody>
          </table>
          <div style={{ marginTop: 24, display: 'flex', gap: 60 }}>
            <div className="firma-line">
              <div className="firma-linea" style={{ width: 200 }}></div>
              <div className="firma-label">Elaboró</div>
            </div>
            <div className="firma-line">
              <div className="firma-linea" style={{ width: 200 }}></div>
              <div className="firma-label">Autorizó</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
