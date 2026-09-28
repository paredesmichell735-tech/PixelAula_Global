import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { env } from '../config/env.js';
import { err } from './errors.js';
import { logger } from './logger.js';
import { db } from './supabase.js';

/**
 * Verificación del JWT de Supabase.
 *
 * El proyecto firma con ES256 (claves asimétricas), así que el token se puede
 * verificar aquí mismo contra el JWKS en vez de preguntarle a Supabase en cada
 * petición. `jose` cachea el JWKS y lo refresca solo cuando rota la clave.
 *
 * Si el proyecto todavía usa el secreto compartido HS256 (proyectos antiguos),
 * la verificación local falla y caemos a `auth.getUser`, que sí funciona con
 * los dos esquemas. Así no hay que elegir entre uno u otro.
 */

const jwks = createRemoteJWKSet(new URL(env.supabaseJwksUrl), {
  cacheMaxAge: 10 * 60_000,
  cooldownDuration: 30_000,
});

const issuer = `${env.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1`;

export interface VerifiedToken {
  userId: string;
  email?: string;
  claims: JWTPayload;
}

let warnedAboutFallback = false;

export async function verifyToken(token: string): Promise<VerifiedToken> {
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      // Supabase emite aud "authenticated" para sesiones de usuario.
      audience: 'authenticated',
    });

    if (!payload.sub) throw err.unauthorized();
    return {
      userId: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      claims: payload,
    };
  } catch (cause) {
    // Proyecto con firma simétrica, clave rotada o JWKS inalcanzable:
    // preguntamos a Supabase antes de rechazar al usuario.
    if (!warnedAboutFallback) {
      warnedAboutFallback = true;
      logger.warn({ err: cause }, 'Verificación local del JWT falló; usando auth.getUser como respaldo');
    }

    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) throw err.unauthorized();

    return {
      userId: data.user.id,
      email: data.user.email,
      claims: {} as JWTPayload,
    };
  }
}
