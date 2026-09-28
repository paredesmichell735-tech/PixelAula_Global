interface ProgressBarProps {
  value: number;
  max?: number;
  tone?: 'cyan' | 'magenta' | 'yellow' | 'violet' | 'green';
  compact?: boolean;
}

export function ProgressBar({ value, max = 100, tone = 'cyan', compact = false }: ProgressBarProps) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`progress ${compact ? 'progress--compact' : ''}`} aria-label={`Progreso ${Math.round(percent)}%`}>
      <span className={`progress__fill tone-${tone}`} style={{ width: `${percent}%` }} />
    </div>
  );
}
