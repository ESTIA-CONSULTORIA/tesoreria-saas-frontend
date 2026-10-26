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
  APPROVAL_REQUEST: { bg: "rgb(var(--chat-warn-bg))", border: "rgb(var(--st-warn) / 0.267)", label: "⚠ Solicitud de aprobación" },
  APPROVAL:        { bg: "rgb(var(--chat-ok-bg))", border: "rgb(var(--st-ok) / 0.267)", label: "✓ Aprobado" },
  REJECTION:       { bg: "rgb(var(--chat-danger-bg))", border: "rgb(var(--st-danger) / 0.267)", label: "✗ Rechazado" },
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
        position: "fixed", inset: 0, background: "rgb(var(--scrim) / 0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1100, padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "rgb(var(--surface-1))", border: "1px solid rgb(var(--border))", borderRadius: 12,
        width: "100%", maxWidth: 480, height: "80vh", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgb(var(--border))", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, color: "rgb(var(--text-1))", fontSize: 14 }}>Chat de Turno</div>
            <div style={{ fontSize: 11, color: "rgb(var(--text-3))" }}>Turno #{turnoId.slice(0, 8)}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgb(var(--text-3))", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: "rgb(var(--text-3))", fontSize: 13, marginTop: 40 }}>
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
                background: style.bg !== "transparent" ? style.bg : (isMe ? "rgb(var(--chat-mine-bg))" : "rgb(var(--surface-alt))"),
                border: `1px solid ${style.border !== "transparent" ? style.border : (isMe ? "rgb(var(--chat-mine-line))" : "rgb(var(--border))")}`,
                borderRadius: 8, padding: "8px 12px",
              }}>
                <div style={{ fontSize: 10, color: "rgb(var(--text-3))", marginBottom: 2 }}>
                  {msg.userName} · {msg.role}
                  {style.label && <span style={{ marginLeft: 6, fontWeight: 600, color: style.border !== "transparent" ? style.border.replace("44", "") : "rgb(var(--text-3))" }}>{style.label}</span>}
                </div>
                <div style={{ fontSize: 13, color: "rgb(var(--text-1))" }}>{msg.message}</div>
                <div style={{ fontSize: 10, color: "rgb(var(--viz-6))", marginTop: 2, textAlign: "right" }}>
                  {new Date(msg.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Admin approval panel */}
        {isAdmin && !resolved && (
          <div style={{ padding: "10px 16px", borderTop: "1px solid rgb(var(--border))", background: "rgb(var(--nav-alt))" }}>
            <div style={{ fontSize: 11, color: "rgb(var(--text-3))", marginBottom: 6 }}>Acciones de supervisor</div>
            {showRejectInput ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Motivo del rechazo..."
                  style={{ background: "rgb(var(--surface-alt))", border: "1px solid rgb(var(--surface-4))", borderRadius: 6, color: "rgb(var(--text-1))", fontSize: 13, padding: "6px 10px", outline: "none" }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={reject} disabled={sending} style={{ flex: 1, background: "rgb(var(--chat-danger-btn))", border: "1px solid rgb(var(--st-danger) / 0.4)", borderRadius: 6, color: "rgb(var(--st-danger))", fontSize: 13, padding: "7px", cursor: "pointer" }}>
                    Confirmar Rechazo
                  </button>
                  <button onClick={() => setShowRejectInput(false)} style={{ background: "transparent", border: "1px solid rgb(var(--surface-4))", borderRadius: 6, color: "rgb(var(--text-3))", fontSize: 13, padding: "7px 12px", cursor: "pointer" }}>
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
                  style={{ flex: 1, background: "rgb(var(--surface-alt))", border: "1px solid rgb(var(--surface-4))", borderRadius: 6, color: "rgb(var(--text-1))", fontSize: 13, padding: "6px 10px", outline: "none" }}
                />
                <button onClick={approve} disabled={sending} style={{ background: "rgb(var(--chat-ok-bg))", border: "1px solid rgb(var(--st-ok) / 0.4)", borderRadius: 6, color: "rgb(var(--st-ok))", fontSize: 13, padding: "6px 14px", cursor: "pointer", whiteSpace: "nowrap" }}>
                  ✓ Aprobar
                </button>
                <button onClick={() => setShowRejectInput(true)} style={{ background: "rgb(var(--chat-danger-bg))", border: "1px solid rgb(var(--st-danger) / 0.4)", borderRadius: 6, color: "rgb(var(--st-danger))", fontSize: 13, padding: "6px 14px", cursor: "pointer", whiteSpace: "nowrap" }}>
                  ✗ Rechazar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid rgb(var(--border))", display: "flex", gap: 8 }}>
          {!resolved && !isAdmin && (
            <button
              onClick={requestApproval}
              disabled={sending}
              style={{ background: "rgb(var(--chat-warn-bg))", border: "1px solid rgb(var(--st-warn) / 0.4)", borderRadius: 6, color: "rgb(var(--st-warn))", fontSize: 12, padding: "6px 12px", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              ⚠ Solicitar Aprobación
            </button>
          )}
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Escribe un mensaje..."
            style={{ flex: 1, background: "rgb(var(--surface-alt))", border: "1px solid rgb(var(--surface-4))", borderRadius: 6, color: "rgb(var(--text-1))", fontSize: 13, padding: "6px 10px", outline: "none" }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={sending || !text.trim()}
            style={{ background: "rgb(var(--chat-info-bg))", border: "1px solid rgb(var(--chat-mine-line))", borderRadius: 6, color: "rgb(var(--chat-info-text))", fontSize: 13, padding: "6px 12px", cursor: "pointer" }}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
