import type { CSSProperties } from 'react';

/**
 * Retrato del personaje oficial de PixelAula.
 * Los recortes salen de PixelAula_Recursos_Graficos/04_Personajes_y_Avatares
 * (hoja "Personaje principal", bloque de expresiones faciales).
 */
export const EXPRESSIONS = [
  'neutral',
  'feliz',
  'emocionado',
  'riendo',
  'sorprendido',
  'concentrado',
  'pensativo',
  'dudoso',
  'determinado',
  'guino',
] as const;

export type Expression = (typeof EXPRESSIONS)[number];

export const EXPRESSION_LABELS: Record<Expression, string> = {
  neutral: 'Neutral',
  feliz: 'Feliz',
  emocionado: 'Emocionado',
  riendo: 'Riendo',
  sorprendido: 'Sorprendido',
  concentrado: 'Concentrado',
  pensativo: 'Pensativo',
  dudoso: 'Dudoso',
  determinado: 'Determinado',
  guino: 'Guiño',
};

export function expressionSrc(expression: Expression): string {
  return `/assets/character/expresiones/${expression}.png`;
}

interface Props {
  expression?: Expression;
  size?: number;
  /** Giro de color, para diferenciar a otras personas del ranking. */
  hue?: number;
  className?: string;
  title?: string;
}

export function CharacterPortrait({ expression = 'feliz', size = 48, hue = 0, className = '', title }: Props) {
  const style: CSSProperties = {
    width: size,
    height: size,
    filter: hue ? `hue-rotate(${hue}deg)` : undefined,
  };
  return (
    <img
      className={`character-portrait ${className}`}
      src={expressionSrc(expression)}
      style={style}
      alt=""
      title={title}
      loading="lazy"
    />
  );
}

const OTHER_EXPRESSIONS: Expression[] = ['feliz', 'neutral', 'emocionado', 'determinado', 'guino', 'concentrado'];

/**
 * Retrato de otra persona (ranking, amigos, comunidad). Mientras no exista el
 * set de sprites por partes, cada nombre recibe un giro de color y una
 * expresión estables para que no salgan todos idénticos.
 */
export function PeerPortrait({ name, size = 32, className = '' }: { name: string; size?: number; className?: string }) {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i++) hash = Math.imul(hash ^ name.charCodeAt(i), 16777619);
  const hue = Math.abs(hash) % 360;
  const expression = OTHER_EXPRESSIONS[Math.abs(hash >>> 9) % OTHER_EXPRESSIONS.length]!;
  return <CharacterPortrait expression={expression} size={size} hue={hue} className={className} title={name} />;
}
