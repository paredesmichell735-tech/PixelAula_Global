import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { z, type ZodType } from 'zod';
import { err } from '../lib/errors.js';

interface Schemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

/**
 * Valida body/params/query con Zod y reemplaza el valor por el parseado
 * (así los handlers reciben tipos ya coercionados).
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    for (const key of ['body', 'params', 'query'] as const) {
      const schema = schemas[key];
      if (!schema) continue;
      const result = schema.safeParse(req[key]);
      if (!result.success) {
        return next(err.validation({ in: key, issues: result.error.issues }));
      }
      Object.defineProperty(req, key, { value: result.data, writable: true, configurable: true });
    }
    next();
  };
}

export const uuidParam = (name = 'id') => z.object({ [name]: z.string().uuid() });
