import { useState, useRef, useCallback } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import { useAuthStore } from "../../core/store/useAuthStore";

interface OcrDocument {
  id: string;
  fileName: string;
  documentType: string;
  status: "PENDING" | "VALIDATED" | "REJECTED";
  extractedData: Record<string, string>;
  validatedData: Record<string, string> | null;
  rawText: string | null;
  uploadedAt: string;
  validatedAt: string | null;
  validatedBy: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  VALIDATED: "Validado",
  REJECTED: "Rechazado",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#F59E0B",
  VALIDATED: "#22C55E",
  REJECTED: "#EF4444",
};

const FIELD_LABELS: Record<string, string> = {
  numeroDocumento: "Número de documento",
  fecha: "Fecha",
  proveedor: "Proveedor / Emisor",
  montoTotal: "Monto total",
  concepto: "Concepto / Descripción",
};

export default function OCRPage() {
  const companyId = useAuthStore((s) => s.companyId);
  const tenantId = useAuthStore((s) => s.tenantId);

  const [documents, setDocuments] = useState<OcrDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<OcrDocument | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [modalLoading, setModalLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/ocr/documents", {
        headers: { "x-tenant-id": tenantId ?? "", "x-company-id": companyId ?? "" },
      });
      setDocuments(res.data);
    } catch {
      setError("Error al cargar documentos");
    } finally {
      setLoading(false);
    }
  }, [tenantId, companyId]);

  if (!loaded) {
    setLoaded(true);
    fetchDocuments();
  }

  const uploadFile = async (file: File) => {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setError("Tipo de archivo no permitido. Use JPG, PNG, WEBP, GIF o PDF.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      await api.post("/ocr/upload", form, {
        headers: {
          "Content-Type": "multipart/form-data",
          "x-tenant-id": tenantId ?? "",
          "x-company-id": companyId ?? "",
        },
      });
      await fetchDocuments();
    } catch {
      setError("Error al subir el archivo");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [tenantId, companyId]
  );

  const openModal = async (doc: OcrDocument) => {
    // Mostrar el modal inmediatamente con datos del caché
    setSelectedDoc(doc);
    setFormData({ ...(doc.extractedData ?? {}) });
    setModalLoading(true);
    try {
      // Refrescar desde el servidor para garantizar extractedData actualizado
      const res = await api.get(`/ocr/documents/${doc.id}`, {
        headers: { "x-tenant-id": tenantId ?? "", "x-company-id": companyId ?? "" },
      });
      const fresh: OcrDocument = res.data;
      setSelectedDoc(fresh);
      setFormData({ ...(fresh.extractedData ?? {}) });
    } catch {
      // Mantener datos del caché si falla el refresh
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedDoc(null);
    setFormData({});
  };

  const handleValidate = async () => {
    if (!selectedDoc) return;
    setModalLoading(true);
    try {
      await api.put(`/ocr/documents/${selectedDoc.id}/validate`, { validatedData: formData });
      await fetchDocuments();
      closeModal();
    } catch {
      setError("Error al validar el documento");
    } finally {
      setModalLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDoc) return;
    setModalLoading(true);
    try {
      await api.put(`/ocr/documents/${selectedDoc.id}/validate`, { validatedData: {}, action: "REJECT" });
      await fetchDocuments();
      closeModal();
    } catch {
      setError("Error al rechazar el documento");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este documento?")) return;
    try {
      await api.delete(`/ocr/documents/${id}`);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch {
      setError("Error al eliminar el documento");
    }
  };

  return (
    <MainLayout>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F5F5F5", marginBottom: 4 }}>
            OCR de Documentos
          </h1>
          <p style={{ color: "#9A9A9A", fontSize: 14 }}>
            Sube facturas, recibos o contratos. El sistema extrae los datos automáticamente para validación.
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#2A1515",
              border: "1px solid #EF4444",
              borderRadius: 8,
              padding: "10px 16px",
              color: "#EF4444",
              fontSize: 13,
              marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? "#BDBDBD" : "#3D3D3D"}`,
            borderRadius: 12,
            padding: "40px 24px",
            textAlign: "center",
            cursor: uploading ? "wait" : "pointer",
            background: dragging ? "#1A1A1A" : "#111111",
            transition: "all 0.2s",
            marginBottom: 32,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif,.pdf"
            style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.[0]) uploadFile(e.target.files[0]); }}
          />
          <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
          {uploading ? (
            <p style={{ color: "#F5F5F5", fontSize: 15 }}>Procesando documento...</p>
          ) : (
            <>
              <p style={{ color: "#F5F5F5", fontSize: 15, marginBottom: 4 }}>
                Arrastra aquí tu archivo o haz clic para seleccionar
              </p>
              <p style={{ color: "#7E7E7E", fontSize: 13 }}>JPG, PNG, WEBP, GIF, PDF — máximo 10 MB</p>
            </>
          )}
        </div>

        {/* Documents table */}
        <div style={{ background: "#161616", border: "1px solid #2D2D2D", borderRadius: 10 }}>
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid #2D2D2D",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: 600, color: "#F5F5F5", fontSize: 15 }}>
              Documentos procesados
            </span>
            <button
              onClick={fetchDocuments}
              style={{
                background: "transparent",
                border: "1px solid #3D3D3D",
                borderRadius: 6,
                color: "#9A9A9A",
                fontSize: 12,
                padding: "4px 12px",
                cursor: "pointer",
              }}
            >
              Actualizar
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#7E7E7E" }}>Cargando...</div>
          ) : documents.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#7E7E7E", fontSize: 14 }}>
              No hay documentos aún. Sube un archivo para comenzar.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 700, borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #2D2D2D" }}>
                    {["Archivo", "Tipo", "Estado", "Monto extraído", "Fecha subida", "Acciones"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 14px",
                          textAlign: "left",
                          color: "#7E7E7E",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      style={{ borderBottom: "1px solid #1F1F1F" }}
                    >
                      <td style={{ padding: "10px 14px", color: "#F5F5F5", maxWidth: 200 }}>
                        <span title={doc.fileName} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {doc.fileName ?? "—"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#BDBDBD" }}>{doc.documentType}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            background: STATUS_COLOR[doc.status] + "22",
                            color: STATUS_COLOR[doc.status],
                            border: `1px solid ${STATUS_COLOR[doc.status]}44`,
                            borderRadius: 4,
                            padding: "2px 8px",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {STATUS_LABEL[doc.status] ?? doc.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#BDBDBD" }}>
                        {doc.extractedData?.montoTotal
                          ? `$${Number(doc.extractedData.montoTotal).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#7E7E7E", whiteSpace: "nowrap" }}>
                        {new Date(doc.uploadedAt).toLocaleDateString("es-MX")}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          {doc.status === "PENDING" && (
                            <button
                              onClick={() => openModal(doc)}
                              style={{
                                background: "#1E3A2F",
                                border: "1px solid #22C55E44",
                                borderRadius: 5,
                                color: "#22C55E",
                                fontSize: 12,
                                padding: "4px 10px",
                                cursor: "pointer",
                              }}
                            >
                              Revisar
                            </button>
                          )}
                          {doc.status === "VALIDATED" && (
                            <button
                              onClick={() => openModal(doc)}
                              style={{
                                background: "transparent",
                                border: "1px solid #3D3D3D",
                                borderRadius: 5,
                                color: "#9A9A9A",
                                fontSize: 12,
                                padding: "4px 10px",
                                cursor: "pointer",
                              }}
                            >
                              Ver
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(doc.id)}
                            style={{
                              background: "transparent",
                              border: "1px solid #3D3D3D",
                              borderRadius: 5,
                              color: "#EF4444",
                              fontSize: 12,
                              padding: "4px 10px",
                              cursor: "pointer",
                            }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Validation Modal */}
      {selectedDoc && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            style={{
              background: "#161616",
              border: "1px solid #2D2D2D",
              borderRadius: 12,
              width: "100%",
              maxWidth: 520,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #2D2D2D",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#F5F5F5", margin: 0 }}>
                  Validar documento
                </h2>
                <p style={{ color: "#7E7E7E", fontSize: 12, marginTop: 2 }}>
                  {selectedDoc.fileName} · {selectedDoc.documentType}
                </p>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#7E7E7E",
                  fontSize: 20,
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: "20px" }}>
              {modalLoading && (
                <div style={{ fontSize: 12, color: "#7E7E7E", marginBottom: 12 }}>
                  Cargando datos extraídos...
                </div>
              )}
              {selectedDoc.status !== "PENDING" && (
                <div
                  style={{
                    background: "#1A1A1A",
                    border: "1px solid #2D2D2D",
                    borderRadius: 6,
                    padding: "8px 14px",
                    marginBottom: 16,
                    fontSize: 12,
                    color: STATUS_COLOR[selectedDoc.status],
                  }}
                >
                  Estado: {STATUS_LABEL[selectedDoc.status]}
                  {selectedDoc.validatedBy && ` · Por: ${selectedDoc.validatedBy}`}
                </div>
              )}

              {Object.entries(FIELD_LABELS).map(([key, label]) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#9A9A9A", marginBottom: 4 }}>
                    {label}
                  </label>
                  <input
                    value={formData[key] ?? ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }))}
                    disabled={selectedDoc.status !== "PENDING"}
                    style={{
                      width: "100%",
                      background: selectedDoc.status !== "PENDING" ? "#111" : "#1A1A1A",
                      border: "1px solid #3D3D3D",
                      borderRadius: 6,
                      color: "#F5F5F5",
                      fontSize: 14,
                      padding: "8px 12px",
                      outline: "none",
                      boxSizing: "border-box",
                      opacity: selectedDoc.status !== "PENDING" ? 0.7 : 1,
                    }}
                  />
                </div>
              ))}

              {/* Texto crudo extraído — diagnóstico */}
              {selectedDoc.rawText && !selectedDoc.rawText.startsWith('[OCR') && (
                <details style={{ marginTop: 16 }}>
                  <summary style={{ fontSize: 11, color: "#7E7E7E", cursor: "pointer", userSelect: "none" }}>
                    Ver texto extraído por OCR
                  </summary>
                  <pre
                    style={{
                      marginTop: 8,
                      padding: "8px 12px",
                      background: "#111",
                      border: "1px solid #2D2D2D",
                      borderRadius: 6,
                      fontSize: 11,
                      color: "#BDBDBD",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      maxHeight: 180,
                      overflowY: "auto",
                    }}
                  >
                    {selectedDoc.rawText.slice(0, 1000)}
                  </pre>
                </details>
              )}
              {selectedDoc.rawText?.startsWith('[OCR') && (
                <div style={{ marginTop: 12, padding: "8px 12px", background: "#1A1010", border: "1px solid #EF444433", borderRadius: 6, fontSize: 11, color: "#EF4444" }}>
                  {selectedDoc.rawText}
                </div>
              )}

              {selectedDoc.status === "PENDING" && (
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button
                    onClick={handleValidate}
                    disabled={modalLoading}
                    style={{
                      flex: 1,
                      background: "#1E3A2F",
                      border: "1px solid #22C55E66",
                      borderRadius: 7,
                      color: "#22C55E",
                      fontWeight: 600,
                      fontSize: 14,
                      padding: "10px",
                      cursor: modalLoading ? "wait" : "pointer",
                    }}
                  >
                    {modalLoading ? "Guardando..." : "Validar"}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={modalLoading}
                    style={{
                      flex: 1,
                      background: "#2A1515",
                      border: "1px solid #EF444466",
                      borderRadius: 7,
                      color: "#EF4444",
                      fontWeight: 600,
                      fontSize: 14,
                      padding: "10px",
                      cursor: modalLoading ? "wait" : "pointer",
                    }}
                  >
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
