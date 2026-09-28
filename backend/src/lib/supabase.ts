import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { AppError, err, fromPostgres } from './errors.js';

/**
 * Cliente con service_role: ignora RLS. Vive SOLO aquí, nunca sale del backend.
 */
export const db: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.supabaseSecretKey,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

/** Verifica el JWT que emitió Supabase Auth en el cliente. */
export async function verifyAccessToken(token: string) {
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw err.unauthorized();
  return data.user;
}

/** Desenvuelve una respuesta de supabase-js lanzando AppError en caso de fallo. */
export function unwrap<T>(res: { data: T | null; error: { message: string } | null }, notFoundLabel?: string): T {
  if (res.error) throw fromPostgres(res.error.message);
  if (res.data === null) {
    if (notFoundLabel) throw err.notFound(notFoundLabel);
    throw err.internal();
  }
  return res.data;
}

/** Llama una función Postgres (RPC) traduciendo sus excepciones. */
export async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.rpc(name, args);
  if (error) {
    const mapped = fromPostgres(error.message);
    if (mapped instanceof AppError && mapped.code === 'INTERNAL_ERROR') {
      throw new AppError('INTERNAL_ERROR', `RPC ${name} falló: ${error.message}`, 500);
    }
    throw mapped;
  }
  return data as T;
}
