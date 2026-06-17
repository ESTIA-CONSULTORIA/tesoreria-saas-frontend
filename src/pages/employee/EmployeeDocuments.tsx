import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EmployeeLayout from "./EmployeeLayout";
import { employeeApi } from "../../core/api/employeeApi";

interface HrDocument {
  id: string;
  nombre: string;
  tipo: string;
  url?: string;
  uploadedAt: string;
}

export default function EmployeeDocuments() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<HrDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const token = sessionStorage.getItem("employee_token");

  useEffect(() => {
    if (!token) { navigate("/employee"); return; }
    employeeApi.get("/hr/portal/documents")
      .then((res) => setDocuments(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <EmployeeLayout>
      <div className="max-w-2xl mx-auto">
        <h2 className="font-semibold mb-4">Mis Documentos</h2>

        {loading ? (
          <p className="text-sm" style={{ color: "#9A9A9A" }}>Cargando...</p>
        ) : documents.length === 0 ? (
          <div className="rounded-xl p-8 border text-center" style={{ backgroundColor: "#161616", borderColor: "#2D2D2D" }}>
            <p className="text-sm" style={{ color: "#9A9A9A" }}>No hay documentos disponibles</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="rounded-lg p-4 border flex items-center justify-between" style={{ backgroundColor: "#161616", borderColor: "#2D2D2D" }}>
                <div>
                  <p className="text-sm font-medium">{doc.nombre}</p>
                  <p className="text-xs" style={{ color: "#9A9A9A" }}>
                    {doc.tipo} — {new Date(doc.uploadedAt).toLocaleDateString("es-MX")}
                  </p>
                </div>
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded"
                    style={{ backgroundColor: "#2D2D2D", color: "#F5F5F5" }}
                  >
                    Ver
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
