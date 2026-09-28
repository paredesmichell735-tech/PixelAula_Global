import { z } from 'zod';

/**
 * Esquemas de la salida del LLM. Si el modelo devuelve algo que no encaja,
 * se reintenta; tras agotar los reintentos se falla con AI_GENERATION_FAILED.
 * Nada sin validar toca la base de datos.
 */

export const exerciseTypeSchema = z.enum(['multiple_choice', 'fill_blank', 'code', 'open']);

/** Líneas de diálogo estilo RPG: cortas, para una caja de ~3 líneas. */
const dialogueLines = z.array(z.string().min(1).max(60)).min(1).max(3);

export const lessonSchema = z.object({
  title: z.string().min(3).max(80),
  content_md: z.string().min(120),
  key_points: z.array(z.string().min(5).max(120)).min(2).max(6),
  worked_examples: z
    .array(
      z.object({
        title: z.string().min(3).max(80),
        problem: z.string().min(5),
        solution: z.string().min(1),
        explanation: z.string().min(10),
      }),
    )
    .min(1)
    .max(3),
  concepts: z.array(z.string().min(2)).min(1).max(6),
});
export type GeneratedLesson = z.infer<typeof lessonSchema>;

const optionSchema = z.object({
  id: z.enum(['a', 'b', 'c', 'd']),
  text: z.string().min(1).max(200),
});

export const generatedExerciseSchema = z
  .object({
    type: exerciseTypeSchema,
    prompt: z.string().min(10).max(600),
    code_context: z.string().nullable().default(null),
    language: z.string().default('javascript'),
    options: z.array(optionSchema).min(2).max(4).nullable().default(null),
    correct_answer: z.object({
      option_id: z.enum(['a', 'b', 'c', 'd']).nullable().default(null),
      text: z.string().nullable().default(null),
    }),
    rubric: z
      .object({
        criteria: z
          .array(
            z.object({
              name: z.string().min(2),
              weight: z.number().min(0).max(1),
              description: z.string().min(5),
            }),
          )
          .min(1)
          .max(4),
        pass_threshold: z.number().min(0).max(1).default(0.6),
      })
      .nullable()
      .default(null),
    explanation: z.string().min(20),
    /** Pista 1 vaga, pista 2 concreta, pista 3 casi la respuesta. */
    hints: z.tuple([z.string().min(5), z.string().min(5), z.string().min(5)]),
    concept: z.string().min(2),
    difficulty: z.number().int().min(1).max(10),
  })
  .superRefine((ex, ctx) => {
    if (ex.type === 'multiple_choice') {
      if (!ex.options || !ex.correct_answer.option_id) {
        ctx.addIssue({ code: 'custom', message: 'multiple_choice requiere options y correct_answer.option_id' });
      } else if (!ex.options.some((o) => o.id === ex.correct_answer.option_id)) {
        ctx.addIssue({ code: 'custom', message: 'correct_answer.option_id no coincide con ninguna opción' });
      }
    }
    if (ex.type === 'fill_blank' && !ex.correct_answer.text) {
      ctx.addIssue({ code: 'custom', message: 'fill_blank requiere correct_answer.text' });
    }
    if ((ex.type === 'code' || ex.type === 'open') && !ex.rubric) {
      ctx.addIssue({ code: 'custom', message: 'code y open requieren rubric' });
    }
  });

export const exerciseBatchSchema = z.object({
  exercises: z.array(generatedExerciseSchema).min(1).max(12),
});
export type GeneratedExercise = z.infer<typeof generatedExerciseSchema>;

/** Calificación de respuestas abiertas y de código contra la rúbrica. */
export const gradingSchema = z.object({
  correcto: z.boolean(),
  puntaje: z.number().int().min(0).max(100),
  feedback: z.string().min(10).max(400),
  siguiente_paso: z.string().min(5).max(200),
});
export type Grading = z.infer<typeof gradingSchema>;

/** Explicación pedagógica del fallo concreto del usuario. */
export const explanationSchema = z.object({
  diagnostico: z.string().min(10).max(300),
  pasos: z.array(z.object({ titulo: z.string().min(3), detalle: z.string().min(10) })).min(2).max(6),
  solucion: z.string().min(5),
  regla_general: z.string().min(10).max(200),
  animo: z.string().min(3).max(120),
});
export type Explanation = z.infer<typeof explanationSchema>;

/** Narrativa RPG de un nivel, ya cortada en líneas de caja de diálogo. */
export const narrativeSchema = z.object({
  intro: dialogueLines,
  victory: dialogueLines,
  defeat: dialogueLines,
  enemy_name: z.string().min(3).max(30),
});
export type GeneratedNarrative = z.infer<typeof narrativeSchema>;
