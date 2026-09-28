import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Envelope de éxito. Todas las respuestas 2xx pasan por aquí. */
export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data, error: null });
}

/** Envelope de error. Lo usa el middleware central; no lo llames desde handlers. */
export function fail(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return res.status(status).json({
    success: false,
    data: null,
    error: details === undefined ? { code, message } : { code, message, details },
  });
}

/**
 * Evita el try/catch repetido: cualquier rechazo llega al middleware de errores.
 */
export function h(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
