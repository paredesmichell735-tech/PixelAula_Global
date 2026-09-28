import type { z } from 'zod';
import type { AIProvider, GenerateArgs, GenerateResult } from './types.js';

/**
 * Proveedor falso: no llama a la red. Se usa en tests y para desarrollar sin
 * gastar. Devuelve contenido fijo por operación y lo valida con el mismo
 * esquema Zod que el proveedor real, así los tests detectan drift de esquema.
 */
const FIXTURES: Record<string, unknown> = {
  lesson: {
    title: 'Lección de prueba',
    content_md:
      '# Concepto\n\nEsto es contenido de prueba generado por el proveedor mock, suficiente para pasar la validación de longitud mínima del esquema de lección.\n\n```js\nlet hp = 100;\n```\n\nUsa `let` cuando el valor cambia y `const` cuando no.',
    key_points: ['let cambia', 'const no se reasigna'],
    worked_examples: [
      {
        title: 'Declarar',
        problem: 'Guarda 100 de vida.',
        solution: 'let hp = 100;',
        explanation: 'El valor cambiará durante el combate, así que usamos let.',
      },
    ],
    concepts: ['variables'],
  },
  exercises: {
    exercises: [
      {
        type: 'multiple_choice',
        prompt: '¿Cuál palabra clave declara un valor que no se reasigna?',
        code_context: null,
        language: 'javascript',
        options: [
          { id: 'a', text: 'let' },
          { id: 'b', text: 'const' },
          { id: 'c', text: 'var' },
          { id: 'd', text: 'static' },
        ],
        correct_answer: { option_id: 'b', text: null },
        rubric: null,
        explanation: 'const crea una vinculación que no admite reasignación; let y var sí la admiten.',
        hints: ['Piensa en qué significa constante.', 'Dos opciones permiten reasignar.', 'Empieza con c.'],
        concept: 'variables',
        difficulty: 2,
      },
    ],
  },
  grade: {
    correcto: true,
    puntaje: 85,
    feedback: 'Buen golpe. Tu solución hace lo que debe.',
    siguiente_paso: 'Practica el mismo patrón con arreglos.',
  },
  explain: {
    diagnostico: 'Creíste que const permitía reasignar el valor.',
    pasos: [
      { titulo: 'Qué hace const', detalle: 'const fija la vinculación entre el nombre y el valor.' },
      { titulo: 'Qué pasa al reasignar', detalle: 'JavaScript lanza TypeError: Assignment to constant variable.' },
    ],
    solucion: 'Usa let cuando el valor va a cambiar.',
    regla_general: 'Elige la declaración según si el valor cambia o no.',
    animo: 'Casi. Ese error lo comete todo el mundo una vez.',
  },
  narrative: {
    intro: ['Algo se mueve entre los datos.', '* Prepárate.'],
    victory: ['El enemigo se desvanece.', '* Ganaste.'],
    defeat: ['Tu HP llega a cero.', '* Vuelve a intentarlo.'],
    enemy_name: 'Slime de Prueba',
  },
};

export class MockProvider implements AIProvider {
  readonly name = 'mock';

  async generate<T extends z.ZodTypeAny>(args: GenerateArgs<T>): Promise<GenerateResult<z.infer<T>>> {
    const fixture = FIXTURES[args.operation];
    if (fixture === undefined) {
      throw new Error(`MockProvider no tiene fixture para la operación "${args.operation}"`);
    }
    return {
      data: args.schema.parse(fixture),
      model: 'mock',
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      latencyMs: 1,
      retries: 0,
    };
  }
}
