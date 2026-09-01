import { useState, useEffect } from "react";
import EmployeeLayout from "./EmployeeLayout";
import { employeeApi } from "../../core/api/employeeApi";

interface HrDocument {
  id: string;
  nombre: string;
  tipo: string;
  url?: string;
  fileData?: string;
  uploadedAt: string;
}

const TIPO_ICONS: Record<string, string> = {
  CONTRATO: "◈",
  CONSTANCIA: "◻",
  NOMINA: "◯",
  RECIBO: "▸",
  RECIBO_NOMINA: "▸",
  OTRO: "·",
};

export default function EmployeeDocuments() {
  const [documents, setDocuments] = useState<HrDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    employeeApi
      .get("/hr/portal/documents")
      .then((res) => setDocuments(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <EmployeeLayout>
      <div style={{ padding: "28px 20px 0" }}>
        <h1 style={{ color: "#F5F5F5", fontSize: "1.2rem", fontWeight: 600, marginBottom: 24 }}>
          Mis Documentos
        </h1>

        {loading ? (
          <div style={{ color: "#383838", fontSize: "0.8rem", letterSpacing: "0.1em", textAlign: "center", padding: "40px 0" }}>
            CARGANDO
          </div>
        ) : documents.length === 0 ? (
          <div
            style={{
              background: "#0E0E0E",
              border: "1px solid #1C1C1C",
              borderRadius: 14,
              padding: "48px 20px",
              textAlign: "center",
              color: "#303030",
              fontSize: "0.8rem",
              letterSpacing: "0.05em",
            }}
          >
            No hay documentos disponibles
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  background: "#0E0E0E",
                  border: "1px solid #1C1C1C",
                  borderRadius: 14,
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    background: "#141414",
                    border: "1px solid #1C1C1C",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#383838",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {TIPO_ICONS[doc.tipo?.toUpperCase()] ?? TIPO_ICONS.OTRO}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: "#F5F5F5",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {doc.nombre}
                  </div>
                  <div style={{ color: "#383838", fontSize: "0.7rem", marginTop: 3 }}>
                    {doc.tipo} · {new Date(doc.uploadedAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>

                {/* Action — antes solo revisaba doc.url: con STORAGE_PROVIDER=base64_postgres
                    el archivo llega como doc.fileData (data URI) y el botón nunca aparecía. */}
                {(doc.url || doc.fileData) && (
                  <a
                    href={doc.url || doc.fileData}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flexShrink: 0,
                      background: "#141414",
                      border: "1px solid #2A2A2A",
                      borderRadius: 8,
                      color: "#A0A0A0",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      padding: "7px 14px",
                      textDecoration: "none",
                      textTransform: "uppercase",
                    }}
                  >
                    VER
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </EmployeeLayout>
  );
}
