import { useEffect, useState } from 'react';
import type { AxiosInstance } from 'axios';
import { api } from '../api/api';
import { useAuthStore } from '../store/useAuthStore';
import { construirDirectorio, DIRECTORIO_VACIO, type DirectorioUsuarios, type UsuarioDirectorio } from '../utils/nombreUsuario';

// Directorio de nombres del tenant (GET /pos/cashiers/directorio), una sola carga por negocio. La caché va por tenant: al
// cambiar de negocio nunca se reutilizan nombres del anterior. Si falla, queda vacío y las pantallas usan su respaldo.
const cache = new Map<string, Promise<UsuarioDirectorio[]>>();

export function useDirectorioUsuarios(opciones?: { client?: AxiosInstance; tenantId?: string | null }): DirectorioUsuarios {
  const tenantStore = useAuthStore((s) => s.tenantId);
  const tenantId = opciones?.tenantId ?? tenantStore;
  const client = opciones?.client;
  const [dir, setDir] = useState<DirectorioUsuarios>(DIRECTORIO_VACIO);

  useEffect(() => {
    if (!tenantId) {
      setDir(DIRECTORIO_VACIO);
      return;
    }
    let cancelado = false;
    let p = cache.get(tenantId);
    if (!p) {
      p = (client ?? api)
        .get('/pos/cashiers/directorio')
        .then((r) => (Array.isArray(r.data) ? (r.data as UsuarioDirectorio[]) : []))
        .catch(() => {
          cache.delete(tenantId);
          return [] as UsuarioDirectorio[];
        });
      cache.set(tenantId, p);
    }
    p.then((lista) => {
      if (!cancelado) setDir(construirDirectorio(lista));
    });
    return () => {
      cancelado = true;
    };
  }, [tenantId, client]);

  return dir;
}
