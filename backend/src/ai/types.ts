import type { z } from 'zod';

export interface GenerateArgs<T extends z.ZodTypeAny> {
  /** Etiqueta de la operación, para ai_generation_logs. */
  operation: string;
  system: string;
  prompt: string;
  schema: T;
  maxTokens?: number;
}

export interface GenerateResult<T> {
  data: T;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  retries: number;
}

/**
 * Contrato del proveedor de IA. Cambiar de LLM = escribir otra clase que
 * implemente esto; nada del resto del backend se entera.
 */
export interface AIProvider {
  readonly name: string;
  generate<T extends z.ZodTypeAny>(args: GenerateArgs<T>): Promise<GenerateResult<z.infer<T>>>;
}
