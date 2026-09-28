import type { PropsWithChildren, ReactNode } from 'react';
import type { Tone } from '../types';

interface NeonCardProps extends PropsWithChildren {
  tone?: Tone;
  className?: string;
  title?: ReactNode;
  action?: ReactNode;
}

export function NeonCard({ tone = 'cyan', className = '', title, action, children }: NeonCardProps) {
  return (
    <section className={`neon-card tone-border-${tone} ${className}`.trim()}>
      {(title || action) && (
        <header className="neon-card__header">
          <div className="neon-card__title">{title}</div>
          {action && <div className="neon-card__action">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
