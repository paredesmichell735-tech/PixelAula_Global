import { Award, CalendarDays, ChevronRight, Flame, Gem, Pencil, Star, Trophy, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Async } from '../components/AsyncState';
import { CharacterPortrait } from '../components/CharacterPortrait';
import { NeonCard } from '../components/NeonCard';
import { ProgressBar } from '../components/ProgressBar';
import { SubjectCard } from '../components/SubjectCard';
import { useDashboard } from '../hooks/queries';
import { timeAgo, toneForDifficulty, toUiSubject } from '../lib/adapters';
import { useAvatar } from '../state/avatar';

const FEED_ICONS: Record<string, typeof Trophy> = {
  MISSION_COMPLETED: Trophy,
  LEVEL_UP: Zap,
  ACHIEVEMENT: Award,
  BADGE: Gem,
  STREAK: Flame,
  SUBJECT_STARTED: Star,
};

export function DashboardPage() {
  const { expression } = useAvatar();
  const dashboard = useDashboard();

  return (
    <div className="dashboard page-stack">
      <section
        className="dashboard-hero"
        style={{ backgroundImage: 'linear-gradient(90deg,rgba(8,20,46,.75),rgba(8,20,46,.15)),url(/assets/bg-path.jpg)' }}
      >
        <div>
          <img src="/assets/logo.png" alt="PixelAula" />
          <p>Aprender jugando, <b>crecer creando.</b></p>
          <span>Convierte el conocimiento en tu mejor aventura.</span>
        </div>
        <img className="hero-character" src="/assets/character/correr.png" alt="" />
      </section>

      <Async query={dashboard}>
        {data => (
          <>
            <div className="dashboard-grid dashboard-grid--top">
              <NeonCard title={<><Zap size={20} /> Tu progreso</>}>
                <div className="progress-head">
                  <b>Nivel {data.user.level}</b>
                  <span>{data.user.currentXp}/{data.user.requiredXp} XP</span>
                </div>
                <ProgressBar value={data.user.currentXp} max={data.user.requiredXp} />
                <div className="stat-grid">
                  <div><Star /><b>{data.progress.completedMissionsCount}</b><span>Misiones</span></div>
                  <div><Trophy /><b>{data.progress.unlockedAchievementsCount}</b><span>Logros</span></div>
                  <div><Gem /><b>{data.user.pixelsCoins}</b><span>Pixeles</span></div>
                  <div><Flame /><b>{data.streak.currentDays} días</b><span>Racha</span></div>
                </div>
              </NeonCard>

              <NeonCard
                title={<><span className="mini-avatar"><CharacterPortrait expression={expression} size={24} /></span> Perfil del estudiante</>}
              >
                <div className="profile-mini">
                  <div className="profile-mini__avatar"><CharacterPortrait expression={expression} size={112} /></div>
                  <div>
                    <span>Hola,</span>
                    <h2>{data.user.displayName}</h2>
                    <p>“{data.user.title}”</p>
                    <Link className="pixel-button pixel-button--cyan pixel-button--sm" to="/app/avatar">
                      <Pencil size={15} /> Personalizar
                    </Link>
                  </div>
                </div>
              </NeonCard>

              <NeonCard
                tone="magenta"
                title={<><Award size={20} /> Misiones</>}
                action={<Link to="/app/niveles">Ver todas <ChevronRight size={14} /></Link>}
              >
                <div className="mission-list">
                  {data.activeMissions.length === 0 && (
                    <p className="empty-note">No tienes misiones en curso. Entra al mapa y empieza una.</p>
                  )}
                  {data.activeMissions.map(mission => (
                    <div key={mission.id} className="mission-row">
                      <div className={`mission-row__icon tone-bg-${toneForDifficulty(mission.difficulty)}`}>
                        <Zap />
                      </div>
                      <div className="mission-row__body">
                        <b>{mission.title}</b>
                        <small>{mission.description}</small>
                        <ProgressBar
                          value={mission.progress.completed}
                          max={Math.max(1, mission.progress.total)}
                          tone={toneForDifficulty(mission.difficulty)}
                          compact
                        />
                      </div>
                      <strong>{mission.progress.completed}/{mission.progress.total}</strong>
                      <span>XP<br /><b>{mission.xpReward}</b></span>
                    </div>
                  ))}
                </div>
              </NeonCard>
            </div>

            <NeonCard
              tone="magenta"
              title="Mis materias"
              action={<Link to="/app/materias">Ver todas <ChevronRight size={14} /></Link>}
            >
              <div className="dashboard-subjects">
                {data.subjects.slice(0, 3).map((subject, i) => (
                  <SubjectCard key={subject.id} subject={toUiSubject(subject, i)} compact />
                ))}
              </div>
            </NeonCard>

            <div className="dashboard-grid dashboard-grid--bottom">
              <NeonCard title="Actividad reciente" action={<Link to="/app/perfil">Ver toda la actividad</Link>}>
                <div className="activity-list">
                  {data.recentActivity.length === 0 && (
                    <p className="empty-note">Todavía no hay nada por aquí. Completa una misión y vuelve.</p>
                  )}
                  {data.recentActivity.map(entry => {
                    const Icon = FEED_ICONS[entry.type] ?? Star;
                    return (
                      <div className="activity-item" key={entry.id}>
                        <Icon />
                        <div>
                          <b>{entry.title}</b>
                          <span>{entry.subtitle}</span>
                          <small>{timeAgo(entry.createdAt)}</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </NeonCard>

              <NeonCard tone="magenta" title={<><CalendarDays size={20} /> Próxima actividad</>}>
                {data.upcomingEvent ? (
                  <div className="calendar-event">
                    <div className="calendar-event__date">
                      <small>{new Date(data.upcomingEvent.startsAt).toLocaleDateString('es', { weekday: 'short' }).toUpperCase()}</small>
                      <b>{new Date(data.upcomingEvent.startsAt).getDate()}</b>
                      <small>{new Date(data.upcomingEvent.startsAt).toLocaleDateString('es', { month: 'short' }).toUpperCase()}</small>
                    </div>
                    <div>
                      <h3>{data.upcomingEvent.title}</h3>
                      <p>
                        {new Date(data.upcomingEvent.startsAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                        {data.upcomingEvent.endsAt &&
                          ` - ${new Date(data.upcomingEvent.endsAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                      <span>{[data.upcomingEvent.location, data.upcomingEvent.teacherName].filter(Boolean).join(' · ')}</span>
                    </div>
                    <ChevronRight />
                  </div>
                ) : (
                  <p className="empty-note">No hay clases programadas.</p>
                )}

                <div className="badge-strip">
                  {data.badges.length === 0 && <p className="empty-note">Aún no tienes insignias.</p>}
                  {data.badges.map(badge => (
                    <div key={badge.id} className="badge-icon">
                      <Award />
                      <small>{badge.title}</small>
                    </div>
                  ))}
                </div>
              </NeonCard>
            </div>
          </>
        )}
      </Async>
    </div>
  );
}
