/**
 * Prompts. Versionados: si cambias el texto, sube PROMPT_VERSION para que
 * ai_generation_logs y el contenido cacheado sean rastreables.
 */
export const PROMPT_VERSION = 'v1';

/** Qué significa cada nivel de dificultad al enseñar PROGRAMACIÓN. */
export const DIFFICULTY_RUBRIC = `Escala de dificultad (1-10) para ejercicios de programación:
1  Reconocer sintaxis. Leer una línea y decir qué hace.
2  Declarar variables, tipos primitivos, imprimir por consola.
3  Operadores, coerción de tipos, condicionales simples (if/else).
4  Bucles simples (for/while) sobre rangos o cadenas cortas.
5  Funciones con parámetros y retorno; arreglos y sus métodos básicos.
6  Objetos, iteración anidada, combinar 2-3 conceptos en un mismo problema.
7  Callbacks, map/filter/reduce, manejo de casos borde explícitos.
8  Recursión, estructuras de datos simples (pila, cola), depurar código ajeno.
9  Complejidad Big-O, optimizar una solución ingenua, invariantes.
10 Diseñar un algoritmo desde cero con restricciones de tiempo o memoria.`;

const TONE = `TONO: RPG retro tipo Undertale. Frases cortas, con personalidad, algo traviesas.
Nunca humilles al jugador: fallar es parte de aprender. Prohibido "incorrecto", "mal", "error tonto".
Usa "todavía no", "casi", "por ahí va". Español neutro (evita voseo y modismos regionales).`;

export const SYSTEM_TEACHER = `Eres el diseñador de contenido de una academia de programación con forma de RPG.
Enseñas JavaScript moderno a principiantes que aprenden jugando.
${TONE}

REGLAS DURAS:
- Devuelve SOLO el JSON pedido, sin texto alrededor y sin bloques de markdown.
- El contenido debe ser correcto: el código de ejemplo tiene que ejecutarse tal cual.
- Un ejercicio evalúa UN concepto principal. Nada de preguntas trampa ni ambigüedades.
- Los distractores de opción múltiple son errores plausibles y reales, no absurdos.`;

interface LessonArgs {
  worldTheme: string;
  chapterName: string;
  levelName: string;
  difficulty: number;
  concepts: string[];
}

export function lessonPrompt(a: LessonArgs): string {
  return `Escribe la lección previa al combate del nivel "${a.levelName}".

Contexto narrativo del mundo: ${a.worldTheme}
Capítulo: ${a.chapterName}
Dificultad objetivo: ${a.difficulty}/10
Conceptos a cubrir: ${a.concepts.join(', ')}

${DIFFICULTY_RUBRIC}

Requisitos:
- content_md en markdown, entre 200 y 500 palabras. Bloques de código con \`\`\`js.
- Explica el porqué, no solo el cómo.
- worked_examples: 1 a 3 ejemplos resueltos, cada uno con problema, solución y explicación.
- key_points: entre 2 y 6 frases memorizables.
- La lección debe bastar para resolver los ejercicios de este nivel.`;
}

interface ExercisesArgs extends LessonArgs {
  count: number;
  isBoss: boolean;
  /** Conceptos donde el usuario va flojo; se refuerzan si vienen. */
  weakConcepts?: { concept: string; mastery: number }[];
  lessonSummary?: string;
}

export function exercisesPrompt(a: ExercisesArgs): string {
  const boss = a.isBoss
    ? `\nEste nivel es un JEFE: los ejercicios deben mezclar TODOS los conceptos del capítulo y ser 1-2 puntos más difíciles.`
    : '';

  const weak = a.weakConcepts?.length
    ? `\nEste jugador falla en: ${a.weakConcepts
        .map((w) => `${w.concept} (dominio ${(w.mastery * 100).toFixed(0)}%)`)
        .join(', ')}. Refuerza esos conceptos en al menos un ejercicio, sin salirte del temario del nivel.`
    : '';

  return `Genera ${a.count} ejercicios para el nivel "${a.levelName}".

Capítulo: ${a.chapterName}
Dificultad objetivo: ${a.difficulty}/10 (puedes variar ±1 entre ejercicios)
Conceptos: ${a.concepts.join(', ')}${boss}${weak}
${a.lessonSummary ? `\nLa lección que acaba de leer el jugador cubre: ${a.lessonSummary}` : ''}

${DIFFICULTY_RUBRIC}

Mezcla de tipos sugerida: al menos un multiple_choice, al menos un fill_blank,
y si la dificultad es 5 o más, al menos un ejercicio de tipo code.

Por cada ejercicio:
- multiple_choice: 4 opciones (a,b,c,d), una correcta en correct_answer.option_id.
- fill_blank: code_context con un hueco marcado como ___ y correct_answer.text con lo que va en el hueco.
- code: code_context con la firma de la función; rubric con criterios y pesos que sumen 1.
- open: pregunta conceptual; rubric con criterios y pesos que sumen 1.
- hints: exactamente 3, escaladas. La 1 orienta sin decir nada concreto,
  la 2 nombra la técnica o el método, la 3 deja la respuesta casi servida.
- explanation: por qué la respuesta correcta lo es, y por qué fallan las otras.
- concept: un solo slug en kebab-case (ej: "loops", "type-coercion").`;
}

interface GradeArgs {
  exercisePrompt: string;
  codeContext: string | null;
  rubric: unknown;
  referenceAnswer: unknown;
  userAnswer: string;
  language: string;
  difficulty: number;
}

export function gradePrompt(a: GradeArgs): string {
  return `Califica esta respuesta contra la rúbrica.

EJERCICIO: ${a.exercisePrompt}
${a.codeContext ? `CÓDIGO BASE (${a.language}):\n${a.codeContext}\n` : ''}
RÚBRICA: ${JSON.stringify(a.rubric)}
REFERENCIA DEL AUTOR: ${JSON.stringify(a.referenceAnswer)}
DIFICULTAD: ${a.difficulty}/10

RESPUESTA DEL JUGADOR:
"""
${a.userAnswer}
"""

Instrucciones:
- puntaje de 0 a 100 aplicando los pesos de la rúbrica.
- correcto = true solo si el puntaje alcanza el pass_threshold de la rúbrica.
- Una solución distinta a la de referencia pero correcta vale igual. No penalices el estilo si funciona.
- feedback: 2 frases máximo, dirigidas al jugador, con tono de RPG y sin humillar.
- siguiente_paso: qué practicar ahora, en una frase.`;
}

interface ExplainArgs {
  exercisePrompt: string;
  codeContext: string | null;
  correctAnswer: unknown;
  authorExplanation: string | null;
  userAnswer: string;
  concept: string;
}

export function explainPrompt(a: ExplainArgs): string {
  return `El jugador falló este ejercicio. Explícale paso a paso, adaptándote a SU error concreto.

EJERCICIO: ${a.exercisePrompt}
${a.codeContext ? `CÓDIGO BASE:\n${a.codeContext}\n` : ''}
RESPUESTA CORRECTA: ${JSON.stringify(a.correctAnswer)}
${a.authorExplanation ? `NOTA DEL AUTOR: ${a.authorExplanation}\n` : ''}
CONCEPTO: ${a.concept}

LO QUE RESPONDIÓ: ${a.userAnswer}

Instrucciones:
- diagnostico: qué creyó el jugador que pasaba. Nómbralo con precisión; este es el corazón de la explicación.
- pasos: 2 a 6 pasos que lleven de su idea equivocada a la correcta. Con código cuando ayude.
- solucion: la respuesta correcta, explicada.
- regla_general: la lección transferible a otros problemas.
- animo: una frase corta de aliento, con tono retro. Nunca condescendiente.`;
}

export function narrativePrompt(worldTheme: string, levelName: string, isBoss: boolean): string {
  return `Escribe la narrativa del nivel "${levelName}" (${isBoss ? 'JEFE de capítulo' : 'combate normal'}).

Mundo: ${worldTheme}

Devuelve intro, victory y defeat: cada uno entre 1 y 3 líneas de máximo 60 caracteres,
pensadas para una caja de diálogo pixel art. También enemy_name (3-30 caracteres).
La línea de derrota debe animar a reintentar, jamás burlarse.`;
}
