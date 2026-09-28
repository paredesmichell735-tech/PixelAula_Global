import { BarChart3, BookOpen, ChevronRight, FolderKanban } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Subject } from '../types';
import { ProgressBar } from './ProgressBar';
import { SubjectIcon } from './SubjectIcon';

export function SubjectCard({ subject, compact = false }: { subject: Subject; compact?: boolean }) {
  const percent = Math.round(subject.xp / subject.xpMax * 100);
  return (
    <article className={`subject-card tone-border-${subject.tone} ${compact ? 'subject-card--compact' : ''}`}>
      <div className="subject-card__art">
        <div className={`subject-card__icon tone-bg-${subject.tone}`}><SubjectIcon subject={subject} size={compact ? 26 : 32} /></div>
        <span className={`level-pill tone-${subject.tone}`}>Nivel {subject.level}</span>
      </div>
      <div className="subject-card__body">
        <h3>{subject.name}</h3>
        {!compact && <p>{subject.description}</p>}
        <div className="subject-card__meta">
          <span><BookOpen size={15} /> {subject.lessons} lecciones</span>
          <span><FolderKanban size={15} /> {subject.projects} proyectos</span>
          {!compact && <span><BarChart3 size={15} /> {subject.difficulty}</span>}
        </div>
        <div className="subject-card__progress-row">
          <span>Tu progreso</span><b>{subject.xp}/{subject.xpMax} XP · {percent}%</b>
        </div>
        <ProgressBar value={subject.xp} max={subject.xpMax} tone={subject.tone} compact />
        <Link className={`pixel-button pixel-button--${subject.tone} subject-card__cta`} to={`/app/niveles?materia=${subject.id}`}>
          {subject.xp > 0 ? 'Continuar aprendiendo' : 'Comenzar materia'} <ChevronRight size={18} />
        </Link>
      </div>
    </article>
  );
}
