import { z } from 'zod';
import { AVATAR_CATEGORIES } from './types.js';

/**
 * Validación de entrada del contrato. La usa el backend en el middleware
 * `validate`, así que el 422 que recibe un cliente señala exactamente el
 * campo que no cumple.
 *
 * Nota: este archivo es el único del paquete que depende de Zod. El cliente
 * (client.ts) no lo importa, para que la web y la app no arrastren la
 * dependencia si no la necesitan.
 */

export const uuid = z.string().uuid();
export const idParam = z.object({ id: uuid });

export const usernameSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guion bajo.');

export const registerProfileSchema = z.object({
  username: usernameSchema,
  displayName: z.string().min(2).max(40),
});

export const updateMeSchema = z
  .object({
    username: usernameSchema.optional(),
    displayName: z.string().min(2).max(40).optional(),
    title: z.string().max(60).optional(),
  })
  .refine(v => Object.keys(v).length > 0, { message: 'Envía al menos un campo.' });

// --------------------------------------------------------------------- avatar

const avatarShape = Object.fromEntries(
  AVATAR_CATEGORIES.map(category => [category, z.string().min(1).max(60)]),
) as Record<(typeof AVATAR_CATEGORIES)[number], z.ZodString>;

export const avatarConfigSchema = z.object(avatarShape);

export const createAvatarStyleSchema = z.object({
  name: z.string().min(1).max(30),
  config: avatarConfigSchema.optional(),
});

export const updateAvatarStyleSchema = z.object({ name: z.string().min(1).max(30) });

// ------------------------------------------------------------------ respuestas

const connection = z.object({ from: z.string().min(1), to: z.string().min(1) });

export const activityAnswerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('MULTIPLE_CHOICE'), optionId: z.string().min(1) }),
  z.object({ type: z.literal('IMAGE_SELECTION'), optionId: z.string().min(1) }),
  z.object({ type: z.literal('TRUE_FALSE'), value: z.boolean() }),
  z.object({ type: z.literal('ORDERING'), order: z.array(z.string().min(1)).min(2).max(12) }),
  z.object({
    type: z.literal('MATCHING'),
    pairs: z.array(z.object({ concept: z.string().min(1), definition: z.string().min(1) })).min(1).max(12),
  }),
  z.object({ type: z.literal('DRAG_DROP'), placements: z.record(z.string(), z.string()) }),
  z.object({ type: z.literal('SQL_CHALLENGE'), value: z.string().min(1).max(2000) }),
  z.object({
    type: z.literal('NETWORK_SIMULATION'),
    connections: z.array(connection).max(40),
    deviceConfig: z
      .record(z.string(), z.object({ ip: z.string().max(40).optional(), gateway: z.string().max(40).optional() }))
      .optional(),
  }),
  z.object({
    type: z.literal('CIRCUIT_SIMULATION'),
    components: z.array(z.object({ id: z.string().min(1), state: z.enum(['OPEN', 'CLOSED', 'PLACED']) })).max(40),
    connections: z.array(connection).max(40),
  }),
]);

export const answerSchema = z.object({
  /** UUID del cliente: hace la petición idempotente ante reintentos. */
  clientAttemptId: uuid,
  answer: activityAnswerSchema,
  timeSpentMs: z.number().int().min(0).max(3_600_000).optional(),
});

// ------------------------------------------------------------------- economía

export const purchaseSchema = z.object({
  itemId: uuid,
  quantity: z.number().int().min(1).max(99).default(1),
  currency: z.enum(['COINS', 'GEMS']).default('COINS'),
});

export const useItemSchema = z.object({ attemptId: uuid.optional() });

// ------------------------------------------------------------------ objetivos

export const createGoalSchema = z.object({
  title: z.string().min(3).max(120),
  subjectId: uuid.optional(),
  targetValue: z.number().int().min(1).max(10_000),
  dueDate: z.string().date().optional(),
});

export const updateGoalSchema = z
  .object({
    title: z.string().min(3).max(120).optional(),
    currentValue: z.number().int().min(0).optional(),
    targetValue: z.number().int().min(1).max(10_000).optional(),
    dueDate: z.string().date().nullable().optional(),
    completed: z.boolean().optional(),
  })
  .refine(v => Object.keys(v).length > 0, { message: 'Envía al menos un campo.' });

// ------------------------------------------------------------------ comunidad

export const joinClassSchema = z.object({ code: z.string().min(4).max(12) });
export const friendRequestSchema = z.object({ username: usernameSchema });
export const createPostSchema = z.object({ message: z.string().min(1).max(280) });

// ----------------------------------------------------------------- consultas

export const missionsQuerySchema = z.object({
  subjectId: uuid.optional(),
  status: z.enum(['LOCKED', 'ACTIVE', 'COMPLETED']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().max(200).optional(),
});

export const leaderboardQuerySchema = z.object({
  scope: z.enum(['global', 'friends', 'class']).default('global'),
  period: z.enum(['week', 'month', 'all']).default('all'),
  classId: uuid.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(200).optional(),
});

export const inventoryQuerySchema = z.object({
  category: z.enum(['ROPA', 'ACCESORIOS', 'MOCHILAS', 'MASCOTAS', 'EFECTOS']).optional(),
  ownedOnly: z.coerce.boolean().optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().min(2).max(60),
  limit: z.coerce.number().int().min(1).max(30).default(10),
});
