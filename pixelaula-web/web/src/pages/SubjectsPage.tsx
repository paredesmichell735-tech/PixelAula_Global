import { LockKeyhole, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Async } from '../components/AsyncState';
import { SubjectCard } from '../components/SubjectCard';
import { useSubjects } from '../hooks/queries';
import { toUiSubject } from '../lib/adapters';

type Mode = 'all' | 'active' | 'done';

export function SubjectsPage() {
  const subjects = useSubjects();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode>('all');

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (subjects.data ?? []).filter(subject => {
      if (term && !subject.name.toLowerCase().includes(term)) return false;
      if (mode === 'active') return subject.status === 'IN_PROGRESS' && subject.completedMissions > 0;
      if (mode === 'done') return subject.status === 'COMPLETED';
      return true;
    });
  }, [subjects.data, query, mode]);

  return (
    <div className="page-stack">
      <section
        className="page-banner"
        style={{ backgroundImage: 'linear-gradient(90deg,rgba(8,20,46,.94),rgba(8,20,46,.15)),url(/assets/bg-islands.jpg)' }}
      >
        <div>
          <span className="eyebrow">Explora · aprende · domina</span>
          <h1>Catálogo de <span>Materias</span></h1>
          <p>Cada materia es una nueva aventura de conocimiento.</p>
        </div>
      </section>

      <div className="filter-bar">
        <div className="input-shell">
          <Search size={18} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar materias..." />
        </div>
        <div className="segment-control">
          <button className={mode === 'all' ? 'active' : ''} onClick={() => setMode('all')}>Todas</button>
          <button className={mode === 'active' ? 'active' : ''} onClick={() => setMode('active')}>En curso</button>
          <button className={mode === 'done' ? 'active' : ''} onClick={() => setMode('done')}>Completadas</button>
        </div>
      </div>

      <Async query={subjects}>
        {() => (
          <div className="subjects-grid">
            {filtered.length === 0 && (
              <p className="empty-note">
                {query ? `No encontramos ninguna materia con "${query}".` : 'Nada por aquí con ese filtro.'}
              </p>
            )}
            {filtered.map((subject, i) => (
              <SubjectCard key={subject.id} subject={toUiSubject(subject, i)} />
            ))}
            <article className="coming-card">
              <LockKeyhole size={48} />
              <h3>Más Materias</h3>
              <p>Nuevas aventuras están en camino. Pronto podrás explorar más áreas de conocimiento.</p>
              <button disabled>Próximamente...</button>
            </article>
          </div>
        )}
      </Async>
    </div>
  );
}
