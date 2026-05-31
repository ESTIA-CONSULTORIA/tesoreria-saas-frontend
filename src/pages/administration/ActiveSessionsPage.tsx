import { useEffect, useState } from "react";
import { api } from "../../core/api/api";
import { useAuthStore } from "../../core/store/useAuthStore";

interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  tenantId: string;
  ipAddress: string;
  userAgent: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  lastActivity: string;
  createdAt: string;
}

export default function ActiveSessionsPage() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      const response = await api.get('/admin/active-sessions');
      setSessions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error loading sessions:", error);
      // Si no hay endpoint, mostrar al menos la sesión actual
      setSessions([{
        id: 'current',
        userId: user?.id || '',
        userName: user?.name || 'Usuario',
        userEmail: user?.email || '',
        userRole: user?.roleCode || 'USER',
        tenantId: localStorage.getItem('tenant_id') || '',
        ipAddress: '192.168.1.1',
        userAgent: navigator.userAgent,
        deviceType: detectDeviceType(navigator.userAgent),
        lastActivity: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  function detectDeviceType(userAgent: string): 'mobile' | 'desktop' | 'tablet' {
    if (/Mobile|Android|iPhone/i.test(userAgent)) return 'mobile';
    if (/Tablet|iPad/i.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  async function handleEndSession(sessionId: string) {
    if (!confirm('¿Estás seguro de cerrar esta sesión?')) return;
    
    try {
      await api.post(`/admin/active-sessions/${sessionId}/end`);
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error("Error ending session:", error);
      alert('No fue posible cerrar la sesión');
    }
  }

  function getDeviceIcon(type: string) {
    switch (type) {
      case 'mobile': return '📱';
      case 'tablet': return '📲';
      case 'desktop': return '💻';
      default: return '🖥️';
    }
  }

  function formatLastActivity(date: string) {
    const now = new Date();
    const activity = new Date(date);
    const diffMs = now.getTime() - activity.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} días`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sesiones Activas</h1>
        <p className="text-slate-400">Usuarios conectados actualmente al sistema</p>
      </div>

      {/* Tabla de sesiones */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-white">Usuario</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-white">Rol</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-white">Último Acceso</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-white">IP</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-white">Dispositivo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-white">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-slate-400">
                  Cargando...
                </td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-slate-400">
                  No hay sesiones activas
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id} className="hover:bg-slate-800/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{session.userName}</div>
                    <div className="text-sm text-slate-400">{session.userEmail}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      session.userRole === 'ADMIN' ? 'bg-purple-900/40 text-purple-300' :
                      session.userRole === 'SOPORTE' ? 'bg-blue-900/40 text-blue-300' :
                      session.userRole === 'GERENTE' ? 'bg-green-900/40 text-green-300' :
                      'bg-slate-700 text-slate-300'
                    }`}>
                      {session.userRole}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    {formatLastActivity(session.lastActivity)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">{session.ipAddress}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getDeviceIcon(session.deviceType)}</span>
                      <span className="text-sm text-slate-300 capitalize">{session.deviceType}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {session.id !== 'current' ? (
                      <button
                        onClick={() => handleEndSession(session.id)}
                        className="px-3 py-1 rounded-lg bg-red-600 text-sm text-white hover:bg-red-700"
                      >
                        Cerrar Sesión
                      </button>
                    ) : (
                      <span className="px-3 py-1 rounded-lg bg-slate-700 text-sm text-slate-400">
                        Sesión Actual
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
