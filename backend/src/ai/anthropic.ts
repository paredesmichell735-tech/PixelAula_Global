import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';
import { env } from '../config/env.js';
import { err } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import type { AIProvider, GenerateArgs, GenerateResult } from './types.js';

/** USD por millón de tokens. Ajusta si cambias de modelo. */
const PRICING: Record<string, { in: number; out: number }> = {
  'claude-opus-5': { in: 5, out: 25 },
  'claude-sonnet-5': { in: 2, out: 10 },
  'claude-haiku-4-5': { in: 1, out: 5 },
};

function costOf(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] ?? PRICING['claude-opus-5']!;
  return (inputTokens * p.in + outputTokens * p.out) / 1_000_000;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY!,
      timeout: env.AI_TIMEOUT_MS, // milisegundos en el SDK de TypeScript
      maxRetries: 0, // los reintentos los controlamos nosotros, con validación
    });
  }

  /**
   * Salida JSON estricta: el modelo responde contra el esquema Zod y además
   * revalidamos aquí. Si no pasa, reintenta hasta AI_MAX_RETRIES veces.
   */
  async generate<T extends z.ZodTypeAny>(args: GenerateArgs<T>): Promise<GenerateResult<z.infer<T>>> {
    const started = Date.now();
    let inputTokens = 0;
    let outputTokens = 0;
    let lastIssue: unknown;

    for (let attempt = 0; attempt <= env.AI_MAX_RETRIES; attempt++) {
      try {
        const response = await this.client.messages.parse({
          model: env.AI_MODEL,
          max_tokens: args.maxTokens ?? env.AI_MAX_TOKENS,
          system: args.system,
          messages: [
            {
              role: 'user',
              content:
                attempt === 0
                  ? args.prompt
                  : `${args.prompt}\n\nEl intento anterior no cumplió el esquema: ${JSON.stringify(lastIssue).slice(0, 500)}\nDevuelve JSON válido esta vez.`,
            },
          ],
          output_config: { format: zodOutputFormat(args.schema) },
        });

        inputTokens += response.usage.input_tokens;
        outputTokens += response.usage.output_tokens;

        const parsed = args.schema.safeParse(response.parsed_output);
        if (parsed.success) {
          return {
            data: parsed.data,
            model: env.AI_MODEL,
            inputTokens,
            outputTokens,
            costUsd: costOf(env.AI_MODEL, inputTokens, outputTokens),
            latencyMs: Date.now() - started,
            retries: attempt,
          };
        }
        lastIssue = parsed.error.issues.slice(0, 3);
        logger.warn({ op: args.operation, attempt, issues: lastIssue }, 'Salida de IA inválida, reintentando');
      } catch (error) {
        lastIssue = (error as Error).message;
        logger.warn({ op: args.operation, attempt, err: error }, 'Llamada a IA falló, reintentando');
        // No reintentar errores de autenticación o de petición mal formada.
        if (error instanceof Anthropic.APIError && error.status && error.status < 500 && error.status !== 429) {
          throw err.aiFailed({ status: error.status, message: error.message });
        }
      }

      if (attempt < env.AI_MAX_RETRIES) await sleep(400 * (attempt + 1));
    }

    throw err.aiFailed({ operation: args.operation, lastIssue });
  }
}
