import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV, ai: env.AI_PROVIDER },
    `API escuchando en http://localhost:${env.PORT}/api/v1 · catálogo en /api/endpoints`,
  );
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    logger.info({ signal }, 'Apagando');
    server.close(() => process.exit(0));
  });
}

process.on('unhandledRejection', (reason) => logger.error({ reason }, 'Promesa sin manejar'));
