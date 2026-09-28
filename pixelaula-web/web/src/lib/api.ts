import { PixelAulaClient } from '@pixelaula/api';
import { supabase } from './supabase';

/**
 * Cliente de la API. Es el mismo `PixelAulaClient` que usa la app Android:
 * un cambio de flujo se hace una vez, en `shared/pixelaula-api`.
 */
export const api = new PixelAulaClient({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1',

  // Se lee en CADA petición a propósito: el SDK de Supabase refresca por su
  // cuenta y guardar el token al arrancar deja sesiones caducadas.
  getToken: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },

  onRefresh: async () => {
    const { data } = await supabase.auth.refreshSession();
    return data.session?.access_token ?? null;
  },

  onAuthError: () => {
    // La sesión no se pudo recuperar: fuera y a empezar de nuevo.
    void supabase.auth.signOut();
  },
});
