import { randomUUID } from 'node:crypto';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: env.isProd ? undefined : { target: 'pino/file', options: { destination: 1 } },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.correct_answer', '*.rubric'],
    censor: '[oculto]',
  },
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id'];
    const id = typeof existing === 'string' && existing ? existing : randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
  customLogLevel: (_req, res, error) => {
    if (error || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
