import type { ActivityAnswer, ActivityType } from '@pixelaula/api';

/**
 * Evaluación de actividades.
 *
 * Todo ocurre en el servidor: el cliente manda lo que hizo y aquí se decide si
 * está bien. Nada de confiar en un `isCorrect` que venga de fuera — el APK se
 * puede decompilar y el JavaScript de la web se lee en dos clics.
 *
 * Son funciones puras, sin base de datos, para poder probarlas solas.
 */

export interface Verdict {
  correct: boolean;
  /** 0-100. Algunos tipos dan crédito parcial: ayuda más que un sí/no seco. */
  score: number;
  /** Frase corta para la caja de diálogo. Nunca humilla. */
  feedback: string;
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[;.]+$/, '');

/** Una conexión no tiene dirección: A-B es lo mismo que B-A. */
const edgeKey = (a: string, b: string) => [a, b].sort().join('::');

function edgeSet(connections: Array<{ from: string; to: string }>): Set<string> {
  return new Set(connections.map(c => edgeKey(c.from, c.to)));
}

/** Proporción de aciertos, redondeada a puntaje 0-100. */
function ratioScore(hits: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((hits / total) * 100);
}

const OK = ['¡Exacto!', '¡Muy bien!', '¡Lo tienes!', '¡Perfecto!'];
const PARTIAL = 'Vas por buen camino, pero falta algo.';
const MISS = 'Todavía no. Mira la explicación y vuelve a intentarlo.';

const praise = (seed: number) => OK[seed % OK.length]!;

// ---------------------------------------------------------------------------
// Evaluadores por tipo
// ---------------------------------------------------------------------------

function evalChoice(answer: { optionId: string }, solution: Record<string, unknown>): Verdict {
  const correct = String(solution.optionId ?? '') === answer.optionId;
  return {
    correct,
    score: correct ? 100 : 0,
    feedback: correct ? praise(answer.optionId.length) : MISS,
  };
}

function evalTrueFalse(answer: { value: boolean }, solution: Record<string, unknown>): Verdict {
  const correct = Boolean(solution.value) === answer.value;
  return { correct, score: correct ? 100 : 0, feedback: correct ? praise(1) : MISS };
}

function evalOrdering(answer: { order: string[] }, solution: Record<string, unknown>): Verdict {
  const expected = (solution.order as string[] | undefined) ?? [];
  if (expected.length === 0) return { correct: false, score: 0, feedback: MISS };

  let hits = 0;
  expected.forEach((item, i) => {
    if (answer.order[i] !== undefined && normalize(answer.order[i]!) === normalize(item)) hits++;
  });

  const score = ratioScore(hits, expected.length);
  const correct = hits === expected.length;
  return {
    correct,
    score,
    feedback: correct ? praise(2) : score > 0 ? `${PARTIAL} Acertaste ${hits} de ${expected.length} posiciones.` : MISS,
  };
}

function evalMatching(
  answer: { pairs: Array<{ concept: string; definition: string }> },
  solution: Record<string, unknown>,
): Verdict {
  const expected = (solution.pairs as Array<{ concept: string; definition: string }> | undefined) ?? [];
  if (expected.length === 0) return { correct: false, score: 0, feedback: MISS };

  const given = new Map(answer.pairs.map(p => [normalize(p.concept), normalize(p.definition)]));
  const hits = expected.filter(p => given.get(normalize(p.concept)) === normalize(p.definition)).length;

  const score = ratioScore(hits, expected.length);
  const correct = hits === expected.length;
  return {
    correct,
    score,
    feedback: correct ? praise(3) : score > 0 ? `${PARTIAL} Emparejaste ${hits} de ${expected.length}.` : MISS,
  };
}

function evalDragDrop(
  answer: { placements: Record<string, string> },
  solution: Record<string, unknown>,
): Verdict {
  const expected = (solution.placements as Record<string, string> | undefined) ?? {};
  const keys = Object.keys(expected);
  if (keys.length === 0) return { correct: false, score: 0, feedback: MISS };

  const hits = keys.filter(k => normalize(answer.placements[k] ?? '') === normalize(expected[k]!)).length;
  const score = ratioScore(hits, keys.length);
  const correct = hits === keys.length;
  return {
    correct,
    score,
    feedback: correct ? praise(4) : score > 0 ? `${PARTIAL} Colocaste ${hits} de ${keys.length}.` : MISS,
  };
}

function evalSql(answer: { value: string }, solution: Record<string, unknown>): Verdict {
  const accepted = [
    ...((solution.accepted as string[] | undefined) ?? []),
    String(solution.value ?? ''),
  ].filter(Boolean);

  const correct = accepted.some(a => normalize(a) === normalize(answer.value));
  return { correct, score: correct ? 100 : 0, feedback: correct ? praise(5) : MISS };
}

/**
 * Red: se comparan las conexiones (sin dirección) y, si la solución lo pide,
 * la configuración IP de cada dispositivo.
 */
function evalNetwork(
  answer: { connections: Array<{ from: string; to: string }>; deviceConfig?: Record<string, { ip?: string; gateway?: string }> },
  solution: Record<string, unknown>,
): Verdict {
  const required = (solution.requiredConnections as Array<{ from: string; to: string }> | undefined) ?? [];
  const requiredEdges = edgeSet(required);
  const givenEdges = edgeSet(answer.connections);

  const hits = [...requiredEdges].filter(e => givenEdges.has(e)).length;
  const extras = [...givenEdges].filter(e => !requiredEdges.has(e)).length;

  const expectedConfig = (solution.requiredConfig as Record<string, { ip?: string; gateway?: string }> | undefined) ?? {};
  const configKeys = Object.keys(expectedConfig);
  const configHits = configKeys.filter(id => {
    const want = expectedConfig[id]!;
    const got = answer.deviceConfig?.[id];
    if (!got) return false;
    if (want.ip && normalize(want.ip) !== normalize(got.ip ?? '')) return false;
    if (want.gateway && normalize(want.gateway) !== normalize(got.gateway ?? '')) return false;
    return true;
  }).length;

  const total = requiredEdges.size + configKeys.length;
  const score = ratioScore(hits + configHits, total);
  const correct = hits === requiredEdges.size && configHits === configKeys.length && extras === 0;

  let feedback = MISS;
  if (correct) feedback = '¡Todos los dispositivos están conectados correctamente!';
  else if (extras > 0 && hits === requiredEdges.size) feedback = 'Conectaste todo lo necesario, pero sobran cables.';
  else if (score > 0) feedback = `${PARTIAL} Llevas ${hits} de ${requiredEdges.size} conexiones.`;

  return { correct, score, feedback };
}

/**
 * Circuito: además de las conexiones, hay que comprobar el estado de los
 * componentes (un interruptor abierto corta el paso aunque el cableado esté
 * perfecto) y que el circuito quede realmente cerrado.
 */
function evalCircuit(
  answer: { components: Array<{ id: string; state: string }>; connections: Array<{ from: string; to: string }> },
  solution: Record<string, unknown>,
): Verdict {
  const required = (solution.requiredConnections as Array<{ from: string; to: string }> | undefined) ?? [];
  const requiredEdges = edgeSet(required);
  const givenEdges = edgeSet(answer.connections);
  const hits = [...requiredEdges].filter(e => givenEdges.has(e)).length;

  const requiredStates = (solution.requiredStates as Record<string, string> | undefined) ?? {};
  const stateById = new Map(answer.components.map(c => [c.id, c.state]));
  const stateKeys = Object.keys(requiredStates);
  const stateHits = stateKeys.filter(id => stateById.get(id) === requiredStates[id]).length;

  const wiringDone = hits === requiredEdges.size;
  const statesDone = stateHits === stateKeys.length;
  const closed = wiringDone && isClosedLoop(answer.connections, required);

  const total = requiredEdges.size + stateKeys.length;
  const score = ratioScore(hits + stateHits, total);
  const correct = wiringDone && statesDone && closed;

  let feedback = MISS;
  if (correct) feedback = '¡Circuito cerrado! Todas las bombillas encienden.';
  else if (wiringDone && !statesDone) feedback = 'El cableado está bien, pero revisa el interruptor.';
  else if (score > 0) feedback = `${PARTIAL} Llevas ${hits} de ${requiredEdges.size} conexiones.`;

  return { correct, score, feedback };
}

/**
 * Comprueba que las conexiones forman un ciclo: cada nodo con grado par y
 * todos alcanzables entre sí. Es lo que distingue un circuito cerrado de una
 * cadena suelta con los mismos cables.
 */
export function isClosedLoop(
  connections: Array<{ from: string; to: string }>,
  required: Array<{ from: string; to: string }>,
): boolean {
  if (connections.length === 0) return false;

  const nodes = new Set<string>();
  const degree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const { from, to } of connections) {
    nodes.add(from);
    nodes.add(to);
    degree.set(from, (degree.get(from) ?? 0) + 1);
    degree.set(to, (degree.get(to) ?? 0) + 1);
    adjacency.set(from, [...(adjacency.get(from) ?? []), to]);
    adjacency.set(to, [...(adjacency.get(to) ?? []), from]);
  }

  // Todos los nodos que la solución exige tienen que estar presentes.
  for (const { from, to } of required) {
    if (!nodes.has(from) || !nodes.has(to)) return false;
  }

  // En un ciclo cada nodo entra y sale: grado par.
  for (const node of nodes) {
    if ((degree.get(node) ?? 0) % 2 !== 0) return false;
  }

  // Y todo tiene que ser alcanzable desde cualquier punto.
  const start = nodes.values().next().value as string;
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }

  return seen.size === nodes.size;
}

// ---------------------------------------------------------------------------
// Entrada única
// ---------------------------------------------------------------------------

export function evaluate(
  type: ActivityType,
  answer: ActivityAnswer,
  solution: Record<string, unknown>,
): Verdict {
  // El tipo de la respuesta tiene que coincidir con el de la actividad: así
  // nadie manda un MULTIPLE_CHOICE para saltarse la validación del circuito.
  if (answer.type !== type) {
    return { correct: false, score: 0, feedback: 'La respuesta no corresponde a esta actividad.' };
  }

  switch (answer.type) {
    case 'MULTIPLE_CHOICE':
    case 'IMAGE_SELECTION':
      return evalChoice(answer, solution);
    case 'TRUE_FALSE':
      return evalTrueFalse(answer, solution);
    case 'ORDERING':
      return evalOrdering(answer, solution);
    case 'MATCHING':
      return evalMatching(answer, solution);
    case 'DRAG_DROP':
      return evalDragDrop(answer, solution);
    case 'SQL_CHALLENGE':
      return evalSql(answer, solution);
    case 'NETWORK_SIMULATION':
      return evalNetwork(answer, solution);
    case 'CIRCUIT_SIMULATION':
      return evalCircuit(answer, solution);
  }
}

// ---------------------------------------------------------------------------
// Reglas de puntuación de la misión
// ---------------------------------------------------------------------------

/** Cada pista consumida recorta el puntaje de esa actividad. */
export const HINT_PENALTY = [1, 0.85, 0.65, 0.4] as const;

export function penaltyFor(hintsUsed: number): number {
  return HINT_PENALTY[Math.min(hintsUsed, HINT_PENALTY.length - 1)]!;
}

export function activityScore(rawScore: number, hintsUsed: number): number {
  return Math.round(Math.max(0, Math.min(100, rawScore)) * penaltyFor(hintsUsed));
}

/** Puntaje de la misión: media sobre el total de actividades, no sobre las respondidas. */
export function missionScore(scores: number[], totalActivities: number): number {
  if (totalActivities <= 0) return 0;
  return Math.round(Math.min(100, scores.reduce((a, b) => a + b, 0) / totalActivities));
}

/** 3 estrellas exige puntaje alto y ningún fallo; completar siempre da 1. */
export function starsFor(score: number, mistakes: number): 1 | 2 | 3 {
  if (score >= 90 && mistakes === 0) return 3;
  if (score >= 70) return 2;
  return 1;
}

/** Baraja determinista por intento: el mismo intento reanuda en el mismo orden. */
export function shuffleWithSeed<T>(items: T[], seed: string): T[] {
  const out = [...items];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
