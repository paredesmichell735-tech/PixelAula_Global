import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { fail } from '../lib/http.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(req: Request, res: Response) {
  return fail(res, 404, 'ROUTE_NOT_FOUND', `No existe la ruta ${req.method} ${req.path}.`);
}

/** Middleware central de errores. Ningún handler hace try/catch. */
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as Request & { id?: string }).id;

  if (error instanceof AppError) {
    if (error.status >= 500) logger.error({ err: error, requestId, details: error.details }, error.message);
    else logger.warn({ code: error.code, requestId }, error.message);
    // En producción los details internos no salen al cliente.
    return fail(res, error.status, error.code, error.message, env.isProd && error.status >= 500 ? undefined : error.details);
  }

  if (error instanceof ZodError) {
    return fail(res, 422, 'VALIDATION_ERROR', 'Los datos enviados no son válidos.', error.issues);
  }

  if (error instanceof SyntaxError && 'body' in error) {
    return fail(res, 400, 'INVALID_JSON', 'El cuerpo de la petición no es JSON válido.');
  }

  logger.error({ err: error, requestId }, 'Error no controlado');
  return fail(
    res,
    500,
    'INTERNAL_ERROR',
    env.isProd ? 'Error interno del servidor.' : String((error as Error)?.message ?? error),
  );
}
