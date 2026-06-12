import { useEffect, useRef, useState } from "react";
import { api } from "../../core/api/api";
import { useAuthStore } from "../../core/store/useAuthStore";

interface PosMessage {
  id: string;
  turnoId: string;
  userId: string;
  userName: string;
  role: string;
  message: string;
  type: string; // TEXT | APPROVAL_REQUEST | APPROVAL | REJECTION
  createdAt: string;
}

interface Props {
  turnoId: string;
  onClose: () => void;
  onApproved?: () => void;
  onRejected?: () => void;
}

const TYPE_STYLE: Record<string, { bg: string; border: string; label: string }> = {
  APPROVAL_REQUEST: { bg: "#1A1A0A", border: "#F59E0B44", label: "⚠ Solicitud de aprobación" },
  APPROVAL:        { bg: "#0A1A0A", border: "#22C55E44", label: "✓ Aprobado" },
  REJECTION:       { bg: "#1A0A0A", border: "#EF444444", label: "✗ Rechazado" },
  TEXT:            { bg: "transparent", border: "transparent", label: "" },
};

export default function PosChatPanel({ turnoId, onClose, onApproved, onRejected }: Props) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roleCode === "ADMIN" || user?.roleCode === "SOPORTE";
  const [messages, setMessages] = useState<PosMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [comment, setComment] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    try {
      const res = await api.get(`/pos-chat/${turnoId}/messages`);
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch {
      // silencioso
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [turnoId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (type = "TEXT", msg?: string) => {
    const finalMsg = msg ?? text.trim();
    if (!finalMsg) return;
    setSending(true);
    try {
      await api.post(`/pos-chat/${turnoId}/messages`, { message: finalMsg, type });
      setText("");
      await loadMessages();
    } finally {
      setSending(false);
    }
  };

  const requestApproval = () =>
    sendMessage("APPROVAL_REQUEST", "Precorte completado. Solicito aprobación de corte.");

  const approve = async () => {
    setSending(true);
    try {
      await api.put(`/pos-chat/${turnoId}/approve`, { comment: comment || undefined });
      setComment("");
      await loadMessages();
      onApproved?.();
    } finally {
      setSending(false);
    }
  };

  const reject = async () => {
    if (!comment.trim()) { alert("Ingresa un motivo de rechazo."); return; }
    setSending(true);
    try {
      await api.put(`/pos-chat/${turnoId}/reject`, { comment });
      setComment("");
      setShowRejectInput(false);
      await loadMessages();
      onRejected?.();
    } finally {
      setSending(false);
    }
  };

  const lastMsgType = messages[messages.length - 1]?.type;
  const resolved = lastMsgType === "APPROVAL" || lastMsgType === "REJECTION";

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1100, padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#161616", border: "1px solid #2D2D2D", borderRadius: 12,
        width: "100%", maxWidth: 480, height: "80vh", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #2D2D2D", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, color: "#F5F5F5", fontSize: 14 }}>Chat de Turno</div>
            <div style={{ fontSize: 11, color: "#7E7E7E" }}>Turno #{turnoId.slice(0, 8)}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#7E7E7E", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: "#7E7E7E", fontSize: 13, marginTop: 40 }}>
              Sin mensajes. Usa "Solicitar Aprobación" para notificar al supervisor.
            </div>
          )}
          {messages.map((msg) => {
            const style = TYPE_STYLE[msg.type] ?? TYPE_STYLE.TEXT;
            const isMe = msg.userId === user?.id;
            return (
              <div key={msg.id} style={{
                alignSelf: isMe ? "flex-end" : "flex-start",
                maxWidth: "85%",
                background: style.bg !== "transparent" ? style.bg : (isMe ? "#1A1A2A" : "#1A1A1A"),
                border: `1px solid ${style.border !== "transparent" ? style.border : (isMe ? "#3D3D6D" : "#2D2D2D")}`,
                borderRadius: 8, padding: "8px 12px",
              }}>
                <div style={{ fontSize: 10, color: "#7E7E7E", marginBottom: 2 }}>
                  {msg.userName} · {msg.role}
                  {style.label && <span style={{ marginLeft: 6, fontWeight: 600, color: style.border !== "transparent" ? style.border.replace("44", "") : "#7E7E7E" }}>{style.label}</span>}
                </div>
                <div style={{ fontSize: 13, color: "#F5F5F5" }}>{msg.message}</div>
                <div style={{ fontSize: 10, color: "#4A4A4A", marginTop: 2, textAlign: "right" }}>
                  {new Date(msg.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Admin approval panel */}
        {isAdmin && !resolved && (
          <div style={{ padding: "10px 16px", borderTop: "1px solid #2D2D2D", background: "#111" }}>
            <div style={{ fontSize: 11, color: "#9A9A9A", marginBottom: 6 }}>Acciones de supervisor</div>
            {showRejectInput ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Motivo del rechazo..."
                  style={{ background: "#1A1A1A", border: "1px solid #3D3D3D", borderRadius: 6, color: "#F5F5F5", fontSize: 13, padding: "6px 10px", outline: "none" }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={reject} disabled={sending} style={{ flex: 1, background: "#2A1515", border: "1px solid #EF444466", borderRadius: 6, color: "#EF4444", fontSize: 13, padding: "7px", cursor: "pointer" }}>
                    Confirmar Rechazo
                  </button>
                  <button onClick={() => setShowRejectInput(false)} style={{ background: "transparent", border: "1px solid #3D3D3D", borderRadius: 6, color: "#9A9A9A", fontSize: 13, padding: "7px 12px", cursor: "pointer" }}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Comentario (opcional)..."
                  style={{ flex: 1, background: "#1A1A1A", border: "1px solid #3D3D3D", borderRadius: 6, color: "#F5F5F5", fontSize: 13, padding: "6px 10px", outline: "none" }}
                />
                <button onClick={approve} disabled={sending} style={{ background: "#0A1A0A", border: "1px solid #22C55E66", borderRadius: 6, color: "#22C55E", fontSize: 13, padding: "6px 14px", cursor: "pointer", whiteSpace: "nowrap" }}>
                  ✓ Aprobar
                </button>
                <button onClick={() => setShowRejectInput(true)} style={{ background: "#1A0A0A", border: "1px solid #EF444466", borderRadius: 6, color: "#EF4444", fontSize: 13, padding: "6px 14px", cursor: "pointer", whiteSpace: "nowrap" }}>
                  ✗ Rechazar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid #2D2D2D", display: "flex", gap: 8 }}>
          {!resolved && !isAdmin && (
            <button
              onClick={requestApproval}
              disabled={sending}
              style={{ background: "#1A1A0A", border: "1px solid #F59E0B66", borderRadius: 6, color: "#F59E0B", fontSize: 12, padding: "6px 12px", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              ⚠ Solicitar Aprobación
            </button>
          )}
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Escribe un mensaje..."
            style={{ flex: 1, background: "#1A1A1A", border: "1px solid #3D3D3D", borderRadius: 6, color: "#F5F5F5", fontSize: 13, padding: "6px 10px", outline: "none" }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={sending || !text.trim()}
            style={{ background: "#1B1B2B", border: "1px solid #3D3D6D", borderRadius: 6, color: "#BDBDFF", fontSize: 13, padding: "6px 12px", cursor: "pointer" }}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
