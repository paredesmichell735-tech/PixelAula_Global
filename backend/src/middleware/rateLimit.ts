import rateLimit, { type Options } from 'express-rate-limit';
import type { Request } from 'express';
import { env } from '../config/env.js';
import { fail } from '../lib/http.js';

/** Clave por usuario autenticado; si no hay sesión, por IP. */
const keyByUser = (req: Request) => req.user?.id ?? req.ip ?? 'anon';

const base: Partial<Options> = {
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUser,
  skip: () => env.isTest,
  handler: (_req, res) =>
    fail(res, 429, 'RATE_LIMITED', 'Demasiadas peticiones. Espera un momento.'),
};

/** Límite general de la API. */
export const generalLimiter = rateLimit({
  ...base,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
});

/**
 * Límite estricto para endpoints que llaman al LLM. Cada request cuesta
 * dinero: generación de lecciones, calificación, explicaciones y pistas.
 */
export const aiLimiter = rateLimit({
  ...base,
  windowMs: env.AI_RATE_LIMIT_WINDOW_MS,
  limit: env.AI_RATE_LIMIT_MAX,
  handler: (_req, res) =>
    fail(res, 429, 'AI_RATE_LIMITED', 'Estás pidiendo ayuda muy rápido. Respira y vuelve en un minuto.'),
});
