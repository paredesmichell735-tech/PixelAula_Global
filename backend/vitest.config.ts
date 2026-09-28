import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'error',
      // Credenciales de mentira: los tests no tocan Supabase real.
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_000000',
      SUPABASE_SECRET_KEY: 'sb_secret_test_000000',
      AI_PROVIDER: 'mock',
    },
  },
});
