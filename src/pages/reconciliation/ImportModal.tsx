import { useState, useRef } from "react";
import { api } from "../../core/api/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

interface ParsedInvoice {
  invoiceNumber: string;
  type: "EMITIDA" | "RECIBIDA";
  status: "PAGADA" | "PENDIENTE_COBRO" | "PENDIENTE_PAGO";
  amount: number;
  dueDate: string;
  bankAccountId?: string;
  concept?: string;
  error?: string;
}

export default function ImportModal({ open, onClose, onImported }: Props) {
  const [invoiceType, setInvoiceType] = useState<"EMITIDA" | "RECIBIDA">("EMITIDA");
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedInvoice[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  }

  function parseCSV(text: string) {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const data: ParsedInvoice[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const invoice: any = {};
      let hasError = false;
      let errorMessage = '';

      headers.forEach((header, index) => {
        invoice[header] = values[index];
      });

      // Validar campos requeridos
      if (!invoice.invoicenumber) {
        hasError = true;
        errorMessage = 'Falta número de factura';
      }
      if (!invoice.amount || isNaN(Number(invoice.amount))) {
        hasError = true;
        errorMessage = errorMessage ? errorMessage + ', monto inválido' : 'Monto inválido';
      }
      if (!invoice.duedate) {
        hasError = true;
        errorMessage = errorMessage ? errorMessage + ', falta fecha' : 'Falta fecha de vencimiento';
      }

      data.push({
        invoiceNumber: invoice.invoicenumber || '',
        type: invoiceType,
        status: invoice.status?.toUpperCase() || 'PENDIENTE_PAGO',
        amount: Number(invoice.amount) || 0,
        dueDate: invoice.duedate || '',
        bankAccountId: invoice.bankaccountid,
        concept: invoice.concept,
        error: hasError ? errorMessage : undefined,
      });
    }

    setParsedData(data);
  }

  function downloadTemplate() {
    const template = `invoiceNumber,type,status,amount,dueDate,bankAccountId,concept
FAC-001,EMITIDA,PENDIENTE_PAGO,15000.00,2026-06-15,acct-123,Compra de equipo
FAC-002,RECIBIDA,PENDIENTE_PAGO,8500.00,2026-06-20,acct-456,Servicios profesionales`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_facturas.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    try {
      setImporting(true);
      const validInvoices = parsedData.filter(inv => !inv.error);
      
      const response = await api.post('/reconciliation/import', {
        invoices: validInvoices,
      });

      setImportResult({
        imported: response.data.imported || validInvoices.length,
        errors: parsedData.length - validInvoices.length,
      });

      setTimeout(() => {
        onImported();
        onClose();
        setParsedData([]);
        setImportResult(null);
      }, 2000);
    } catch (error: any) {
      console.error('Error importing:', error);
      alert(error.response?.data?.message || 'Error al importar facturas');
    } finally {
      setImporting(false);
    }
  }

  const validCount = parsedData.filter(inv => !inv.error).length;
  const errorCount = parsedData.filter(inv => inv.error).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white">Importación Masiva de Facturas</h3>
              <p className="text-sm text-slate-400">Importa facturas desde CSV, XML o Excel</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Selector de tipo */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Tipo de factura</label>
            <div className="flex gap-2">
              <button
                onClick={() => setInvoiceType("EMITIDA")}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  invoiceType === "EMITIDA"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Emitidas
              </button>
              <button
                onClick={() => setInvoiceType("RECIBIDA")}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  invoiceType === "RECIBIDA"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Recibidas
              </button>
            </div>
          </div>

          {/* Drag & Drop */}
          {parsedData.length === 0 && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragActive
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-700 bg-slate-800/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xml,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="text-4xl mb-3">📁</div>
              <p className="text-white mb-2">Arrastra y suelta tu archivo aquí</p>
              <p className="text-sm text-slate-400 mb-4">o haz clic para seleccionar</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Seleccionar Archivo
              </button>
              <p className="text-xs text-slate-500 mt-4">Formatos aceptados: CSV, XML (CFDI), Excel</p>
            </div>
          )}

          {/* Descargar plantilla */}
          {parsedData.length === 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50">
              <div>
                <p className="text-sm text-white">¿No tienes un archivo?</p>
                <p className="text-xs text-slate-400">Descarga nuestra plantilla CSV con el formato correcto</p>
              </div>
              <button
                onClick={downloadTemplate}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600"
              >
                📥 Descargar Plantilla
              </button>
            </div>
          )}

          {/* Vista previa */}
          {parsedData.length > 0 && !importResult && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold text-white">Vista Previa ({parsedData.length} registros)</h4>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-400">✓ Válidos: {validCount}</span>
                  <span className="text-red-400">✗ Errores: {errorCount}</span>
                </div>
              </div>
              <div className="overflow-x-auto max-h-64 rounded-xl border border-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 text-slate-400">
                    <tr>
                      <th className="p-2 text-left">Número</th>
                      <th className="p-2 text-left">Tipo</th>
                      <th className="p-2 text-left">Estado</th>
                      <th className="p-2 text-right">Monto</th>
                      <th className="p-2 text-left">Vencimiento</th>
                      <th className="p-2 text-left">Concepto</th>
                      <th className="p-2 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((inv, i) => (
                      <tr key={i} className={`border-t border-slate-800 ${inv.error ? 'bg-red-900/10' : ''}`}>
                        <td className="p-2 text-white">{inv.invoiceNumber}</td>
                        <td className="p-2 text-slate-300">{inv.type}</td>
                        <td className="p-2 text-slate-300">{inv.status}</td>
                        <td className="p-2 text-right text-white">${inv.amount.toFixed(2)}</td>
                        <td className="p-2 text-slate-300">{inv.dueDate}</td>
                        <td className="p-2 text-slate-300">{inv.concept || '-'}</td>
                        <td className="p-2">
                          {inv.error ? (
                            <span className="text-red-400 text-xs">{inv.error}</span>
                          ) : (
                            <span className="text-green-400 text-xs">✓ Válido</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Resultado de importación */}
          {importResult && (
            <div className="rounded-xl bg-slate-800/50 p-6 text-center">
              <div className="text-4xl mb-3">✅</div>
              <h4 className="text-lg font-semibold text-white mb-2">Importación Completada</h4>
              <div className="flex justify-center gap-8">
                <div>
                  <p className="text-2xl font-bold text-green-400">{importResult.imported}</p>
                  <p className="text-sm text-slate-400">Importadas</p>
                </div>
                {importResult.errors > 0 && (
                  <div>
                    <p className="text-2xl font-bold text-red-400">{importResult.errors}</p>
                    <p className="text-sm text-slate-400">Con error</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {parsedData.length > 0 && !importResult && (
          <div className="flex-shrink-0 p-4 border-t border-slate-800 flex justify-between items-center">
            <button
              onClick={() => {
                setParsedData([]);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={importing || validCount === 0}
              className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {importing ? 'Importando...' : `Importar ${validCount} facturas`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
