import type { LucideIcon } from 'lucide-react';

export type Tone = 'cyan' | 'magenta' | 'yellow' | 'violet' | 'green';

export interface Subject {
  id: string;
  name: string;
  description: string;
  level: number;
  lessons: number;
  projects: number;
  xp: number;
  xpMax: number;
  difficulty: 'Principiante' | 'Intermedio' | 'Avanzado';
  tone: Tone;
  iconName: 'database' | 'network' | 'bolt' | 'code' | 'math';
  background: string;
}

export interface Mission {
  id: string;
  title: string;
  subject: string;
  description: string;
  progress: number;
  target: number;
  xp: number;
  tone: Tone;
  iconName: 'clipboard' | 'network' | 'bolt';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  reward: string;
  unlocked: boolean;
  icon: LucideIcon;
  tone: Tone;
}
