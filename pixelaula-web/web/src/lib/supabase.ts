import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en web/.env. Copia web/.env.example.',
  );
}

/**
 * Cliente de Supabase Auth. La web se autentica aquí directamente y solo
 * manda el token al backend; nunca toca la base de datos por su cuenta.
 *
 * Aquí va únicamente la clave publishable: es pública por diseño. La secreta
 * vive en el backend.
 */
export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
