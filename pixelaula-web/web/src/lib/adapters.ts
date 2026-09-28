import type { Subject as ApiSubject } from '@pixelaula/api';
import type { Subject as UiSubject, Tone } from '../types';

/**
 * Puente entre el contrato y los tipos que ya usaban los componentes.
 *
 * El contrato manda un color hexadecimal; el sistema visual trabaja con
 * "tonos" con nombre porque de ellos cuelgan los bordes, sombras y botones.
 * Traducir aquí evita reescribir cada componente y su CSS.
 */

const TONE_BY_COLOR: Record<string, Tone> = {
  '#19D3FF': 'cyan',
  '#FF43D1': 'magenta',
  '#FFD53A': 'yellow',
  '#6B46FF': 'violet',
  '#44F0C0': 'green',
  '#2E5BFF': 'violet',
};

const TONE_FALLBACK: Tone[] = ['cyan', 'magenta', 'yellow', 'violet', 'green'];

export function toneOf(subject: ApiSubject, index = 0): Tone {
  return TONE_BY_COLOR[subject.color.toUpperCase()] ?? TONE_FALLBACK[index % TONE_FALLBACK.length]!;
}

const ICON_MAP: Record<string, UiSubject['iconName']> = {
  database: 'database',
  network: 'network',
  bolt: 'bolt',
  code: 'code',
  math: 'math',
  brain: 'code',
};

const BACKGROUNDS = [
  '/assets/bg-city.jpg',
  '/assets/bg-school.jpg',
  '/assets/bg-cosmic.jpg',
  '/assets/bg-classroom.jpg',
  '/assets/bg-islands.jpg',
];

const DIFFICULTY: Record<string, UiSubject['difficulty']> = {
  FACIL: 'Principiante',
  MEDIO: 'Intermedio',
  DIFICIL: 'Avanzado',
  EPICO: 'Avanzado',
};

export function toUiSubject(subject: ApiSubject, index = 0): UiSubject {
  return {
    id: subject.id,
    name: subject.name,
    description: subject.description,
    level: subject.level,
    lessons: subject.totalLessons,
    projects: subject.totalProjects,
    xp: subject.currentXp,
    xpMax: subject.requiredXp,
    difficulty: DIFFICULTY[subject.difficulty] ?? 'Intermedio',
    tone: toneOf(subject, index),
    iconName: ICON_MAP[subject.icon] ?? 'code',
    background: BACKGROUNDS[index % BACKGROUNDS.length]!,
  };
}

/** Tono de una misión a partir de su dificultad, para las tarjetas. */
export function toneForDifficulty(difficulty: string): Tone {
  if (difficulty === 'FACIL') return 'cyan';
  if (difficulty === 'MEDIO') return 'magenta';
  if (difficulty === 'DIFICIL') return 'yellow';
  return 'violet';
}

/** "Hace 2 h", "Hace 3 días". Los mockups siempre muestran tiempo relativo. */
export function timeAgo(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'Justo ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Ayer';
  if (days < 30) return `Hace ${days} días`;
  const months = Math.round(days / 30);
  return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
}
