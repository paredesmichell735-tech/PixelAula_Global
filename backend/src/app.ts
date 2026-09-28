import cors from 'cors';
import express from 'express';
import { ENDPOINT_LIST } from '@pixelaula/api';
import helmet from 'helmet';
import { env } from './config/env.js';
import { httpLogger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { apiRouter } from './pa/routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());

  /**
   * CORS solo importa para la web. La app Android no envía Origin, así que
   * las peticiones sin origen pasan.
   */
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Origen no permitido por CORS'));
      },
      credentials: true,
      maxAge: 86_400,
    }),
  );

  app.use(express.json({ limit: '256kb' }));
  app.use(httpLogger);
  app.use('/api/v1', generalLimiter, apiRouter);

  // Catálogo de endpoints, generado desde el contrato compartido.
  app.get('/api/endpoints', (_req, res) =>
    res.json({ count: ENDPOINT_LIST.length, endpoints: ENDPOINT_LIST }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
