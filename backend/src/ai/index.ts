import type { z } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { db } from '../lib/supabase.js';
import { AnthropicProvider } from './anthropic.js';
import { MockProvider } from './mock.js';
import { PROMPT_VERSION } from './prompts.js';
import type { AIProvider, GenerateArgs } from './types.js';

let provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!provider) {
    provider = env.AI_PROVIDER === 'anthropic' ? new AnthropicProvider() : new MockProvider();
    logger.info({ provider: provider.name, model: env.AI_MODEL }, 'Proveedor de IA inicializado');
  }
  return provider;
}

/** Solo para tests: inyecta un proveedor falso. */
export function setAIProvider(p: AIProvider | null) {
  provider = p;
}

interface Ctx {
  userId?: string;
  levelId?: string;
}

/**
 * Envuelve la generación registrando tokens y costo en ai_generation_logs.
 * Todo el backend llama a la IA por aquí, nunca al proveedor directamente.
 */
export async function generateWithLog<T extends z.ZodTypeAny>(
  args: GenerateArgs<T>,
  ctx: Ctx = {},
): Promise<z.infer<T>> {
  const ai = getAIProvider();
  try {
    const result = await ai.generate(args);
    void logCall({
      ...ctx,
      operation: args.operation,
      provider: ai.name,
      model: result.model,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      cost_usd: result.costUsd,
      latency_ms: result.latencyMs,
      retry_count: result.retries,
      success: true,
    });
    return result.data;
  } catch (error) {
    void logCall({
      ...ctx,
      operation: args.operation,
      provider: ai.name,
      model: env.AI_MODEL,
      success: false,
      error_code: 'AI_GENERATION_FAILED',
      error_message: String((error as Error).message).slice(0, 500),
    });
    throw error;
  }
}

async function logCall({ userId, levelId, ...row }: Ctx & Record<string, unknown>) {
  const { error } = await db.from('ai_generation_logs').insert({
    prompt_version: PROMPT_VERSION,
    user_id: userId ?? null,
    level_id: levelId ?? null,
    ...row,
  });
  if (error) logger.error({ err: error }, 'No se pudo registrar la llamada de IA');
}

export * from './schemas.js';
export * from './prompts.js';
export type { AIProvider } from './types.js';
