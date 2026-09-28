import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  SUPABASE_URL: z.string().url(),
  // Claves nuevas de Supabase (sb_publishable_ / sb_secret_). Se aceptan los
  // nombres antiguos para no romper entornos ya configurados.
  SUPABASE_PUBLISHABLE_KEY: z.string().min(10).optional(),
  SUPABASE_ANON_KEY: z.string().min(10).optional(),
  SUPABASE_SECRET_KEY: z.string().min(10).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10).optional(),
  SUPABASE_JWKS_URL: z.string().url().optional(),
  ASSETS_BUCKET: z.string().default('assets'),
  ASSETS_PUBLIC: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  ASSETS_SIGNED_URL_TTL: z.coerce.number().int().positive().default(3600),

  AI_PROVIDER: z.enum(['anthropic', 'mock']).default('mock'),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('claude-opus-5'),
  AI_MAX_TOKENS: z.coerce.number().int().positive().default(4096),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(45_000),
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  AI_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  AI_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
});

// Una variable vacia en el .env equivale a no ponerla: asi el aviso que sale
// es el nuestro, explicando de donde sacar la clave, y no un error de Zod.
const rawEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== undefined && value !== ''),
);

const parsed = schema.safeParse(rawEnv);

if (!parsed.success) {
  // Falla al arrancar, no en la primera request.
  console.error('Configuración inválida:', z.treeifyError(parsed.error));
  process.exit(1);
}

const publishableKey = parsed.data.SUPABASE_PUBLISHABLE_KEY ?? parsed.data.SUPABASE_ANON_KEY;
const secretKey = parsed.data.SUPABASE_SECRET_KEY ?? parsed.data.SUPABASE_SERVICE_ROLE_KEY;

if (!publishableKey) {
  console.error('Falta SUPABASE_PUBLISHABLE_KEY (o SUPABASE_ANON_KEY) en el .env');
  process.exit(1);
}
if (!secretKey) {
  console.error(
    'Falta SUPABASE_SECRET_KEY (o SUPABASE_SERVICE_ROLE_KEY) en el .env. ' +
    'Cópiala de Supabase > Project Settings > API Keys. Nunca la expongas a los clientes.',
  );
  process.exit(1);
}

export const env = {
  ...parsed.data,
  supabasePublishableKey: publishableKey,
  /** Ignora RLS. Vive solo en el backend. */
  supabaseSecretKey: secretKey,
  supabaseJwksUrl:
    parsed.data.SUPABASE_JWKS_URL ??
    `${parsed.data.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/.well-known/jwks.json`,
  corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
  isProd: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
};

if (env.AI_PROVIDER === 'anthropic' && !env.ANTHROPIC_API_KEY) {
  console.error('AI_PROVIDER=anthropic requiere ANTHROPIC_API_KEY');
  process.exit(1);
}
