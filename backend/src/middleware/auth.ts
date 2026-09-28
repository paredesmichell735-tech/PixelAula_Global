import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/auth.js';
import { err } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { db } from '../lib/supabase.js';

export interface AuthUser {
  id: string;
  email?: string;
  isAdmin: boolean;
  /** false mientras el usuario no haya completado el alta del perfil. */
  hasProfile: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function bearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Caché corta del perfil.
 *
 * Sin esto cada petición hacía un viaje extra a Supabase solo para saber si
 * el usuario es admin. Treinta segundos son suficientes: un cambio de permisos
 * tarda como mucho medio minuto en notarse, y a cambio se ahorra una llamada
 * de red por cada request de la API.
 */
const CACHE_TTL_MS = 30_000;
const profileCache = new Map<string, { isAdmin: boolean; hasProfile: boolean; at: number }>();

export function clearProfileCache(userId?: string) {
  if (userId) profileCache.delete(userId);
  else profileCache.clear();
}

async function loadProfileFlags(userId: string): Promise<{ isAdmin: boolean; hasProfile: boolean }> {
  const cached = profileCache.get(userId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { isAdmin: cached.isAdmin, hasProfile: cached.hasProfile };
  }

  const { data, error } = await db
    .from('pa_profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();

  // Un fallo de la consulta NO es "este usuario no tiene perfil". Confundir las
  // dos cosas mandaba al usuario a completar un alta que ya había hecho.
  if (error) {
    logger.error({ err: error, userId }, 'No se pudo leer el perfil para autorizar');
    throw err.internal('No pudimos verificar tu cuenta. Inténtalo de nuevo.');
  }

  const flags = { isAdmin: data?.is_admin === true, hasProfile: data !== null };
  profileCache.set(userId, { ...flags, at: Date.now() });
  return flags;
}

/**
 * Verifica el JWT de Supabase Auth y expone `req.user`.
 * Los clientes se autentican con el SDK de Supabase; aquí solo validamos.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = bearer(req);
    if (!token) throw err.unauthorized();

    const verified = await verifyToken(token);
    const flags = await loadProfileFlags(verified.userId);

    req.user = { id: verified.userId, email: verified.email, ...flags };
    next();
  } catch (error) {
    next(error);
  }
}

/** Rutas de administración: generación de contenido y CRUD del catálogo. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(err.unauthorized());
  if (!req.user.isAdmin) return next(err.forbidden('Se requieren permisos de administrador.'));
  next();
}

/**
 * Para las rutas que necesitan que el alta esté terminada. `/auth/profile` y
 * `/auth/session` quedan fuera: son justo las que sirven para completarla.
 */
export function requireProfile(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(err.unauthorized());
  if (!req.user.hasProfile) {
    return next(err.conflict('PROFILE_REQUIRED', 'Primero completa tu perfil.'));
  }
  next();
}

/** Atajo tipado para handlers que corren detrás de requireAuth. */
export function userId(req: Request): string {
  if (!req.user) throw err.unauthorized();
  return req.user.id;
}
