import { useQueryClient } from '@tanstack/react-query';
import { Award, CalendarDays, Check, Edit3, Flame, Gem, Share2, Star, Trophy, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Async } from '../components/AsyncState';
import { CharacterPortrait, PeerPortrait } from '../components/CharacterPortrait';
import { NeonCard } from '../components/NeonCard';
import { ProgressBar } from '../components/ProgressBar';
import {
  keys, useAchievements, useActivityFeed, useBadges, useFriends, useMe, useProgress, useStreak, useSubjects,
} from '../hooks/queries';
import { timeAgo, toneOf } from '../lib/adapters';
import { api } from '../lib/api';
import { useAvatar } from '../state/avatar';

export function ProfilePage() {
  const { expression } = useAvatar();
  const queryClient = useQueryClient();

  const me = useMe();
  const progress = useProgress();
  const subjects = useSubjects();
  const badges = useBadges();
  const achievements = useAchievements();
  const feed = useActivityFeed();
  const friends = useFriends();
  const streak = useStreak();

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [title, setTitle] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEditing() {
    setDisplayName(me.data?.displayName ?? '');
    setTitle(me.data?.title ?? '');
    setSaveError(null);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      await api.updateMe({ displayName, title });
      await queryClient.invalidateQueries({ queryKey: keys.me });
      setEditing(false);
    } catch (cause) {
      setSaveError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const unlockedBadges = (badges.data ?? []).filter(b => b.unlocked);

  return (
    <div className="page-stack">
      <section
        className="page-banner profile-banner"
        style={{ backgroundImage: 'linear-gradient(90deg,rgba(8,20,46,.92),rgba(8,20,46,.18)),url(/assets/bg-islands.jpg)' }}
      >
        <div>
          <h1>Perfil del estudiante</h1>
          <p>Conoce tu progreso, tus logros y todo lo que te hace único en PixelAula.</p>
        </div>
      </section>

      <Async query={me}>
        {user => (
          <div className="profile-header-card">
            <div className="profile-avatar-big"><CharacterPortrait expression={expression} size={132} /></div>

            <div className="profile-identity">
              {editing ? (
                <div className="profile-edit">
                  <label>
                    Nombre
                    <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={40} />
                  </label>
                  <label>
                    Título
                    <input value={title} onChange={e => setTitle(e.target.value)} maxLength={60} />
                  </label>
                  {saveError && <div className="auth-error">{saveError}</div>}
                  <div className="profile-edit__actions">
                    <button className="pixel-button pixel-button--cyan pixel-button--sm" onClick={save} disabled={saving}>
                      <Check size={15} /> {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button className="pixel-button pixel-button--ghost pixel-button--sm" onClick={() => setEditing(false)}>
                      <X size={15} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h2>
                      {user.displayName}{' '}
                      <button className="link-button" onClick={startEditing} aria-label="Editar nombre">
                        <Edit3 size={17} />
                      </button>
                    </h2>
                    <span className="level-pill tone-cyan">Nivel {user.level}</span>
                  </div>
                  <p>“{user.title}”</p>
                  <small>
                    🎓 @{user.username} · Miembro desde{' '}
                    {new Date(user.createdAt).toLocaleDateString('es', { month: 'long', year: 'numeric' })}
                  </small>
                </>
              )}
            </div>

            <div className="profile-xp">
              <div><Star /><b>{user.level}</b><span>Nivel actual</span></div>
              <div><Trophy /><b>{progress.data?.completedMissionsCount ?? 0}</b><span>Misiones</span></div>
              <div><Flame /><b>{streak.data?.currentDays ?? 0} días</b><span>Racha</span></div>
              <div><Gem /><b>{user.pixelsCoins}</b><span>Pixeles</span></div>
              <ProgressBar value={user.currentXp} max={user.requiredXp} />
            </div>

            <div className="profile-actions">
              <button className="pixel-button pixel-button--cyan" onClick={startEditing}>
                <Edit3 size={17} /> Editar perfil
              </button>
              <Link className="pixel-button pixel-button--magenta" to="/app/comunidad">
                <Share2 size={17} /> Ver comunidad
              </Link>
            </div>
          </div>
        )}
      </Async>

      <div className="profile-grid">
        <NeonCard title="Mis materias">
          <Async query={subjects}>
            {data => (
              <div className="favorite-subjects">
                {data.slice(0, 4).map((subject, i) => (
                  <div key={subject.id}>
                    <span className={`favorite-icon tone-bg-${toneOf(subject, i)}`}><Award /></span>
                    <div>
                      <b>{subject.name}</b>
                      <small>{subject.completedMissions}/{subject.totalMissions} misiones</small>
                      <ProgressBar value={subject.progressPercent} max={100} tone={toneOf(subject, i)} compact />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Async>
        </NeonCard>

        <NeonCard tone="magenta" title="Mis insignias">
          <Async query={badges}>
            {() => (
              <div className="profile-missions">
                {unlockedBadges.length === 0 && <p className="empty-note">Completa misiones para ganar insignias.</p>}
                {unlockedBadges.slice(0, 6).map(badge => (
                  <div key={badge.id} title={badge.description}>
                    <span>🏅</span>
                    <small>{badge.title}</small>
                  </div>
                ))}
              </div>
            )}
          </Async>
        </NeonCard>

        <NeonCard tone="yellow" title="Logros recientes">
          <Async query={achievements}>
            {data => {
              const unlocked = data.filter(a => a.unlocked).slice(0, 3);
              const next = data.filter(a => !a.unlocked).sort((a, b) => b.progressPercent - a.progressPercent)[0];
              return (
                <>
                  {unlocked.length === 0 && <p className="empty-note">Aún no desbloqueaste ninguno.</p>}
                  {unlocked.map(achievement => (
                    <div className="certificate" key={achievement.id}>
                      <Award />
                      <div>
                        <b>{achievement.title}</b>
                        <span>Completado{achievement.unlockedAt ? ` · ${timeAgo(achievement.unlockedAt)}` : ''}</span>
                      </div>
                    </div>
                  ))}
                  {next && (
                    <>
                      <ProgressBar value={next.currentValue} max={next.targetValue} tone="yellow" />
                      <small>Siguiente: {next.title} · {next.progressPercent}%</small>
                    </>
                  )}
                </>
              );
            }}
          </Async>
        </NeonCard>

        <NeonCard tone="cyan" title="Mis amigos">
          <Async query={friends}>
            {data => {
              const accepted = data.filter(f => f.status === 'ACCEPTED');
              return (
                <div className="friends-row">
                  {accepted.length === 0 && <p className="empty-note">Todavía no tienes amigos agregados.</p>}
                  {accepted.slice(0, 4).map(friend => (
                    <div key={friend.id}>
                      <span><PeerPortrait name={friend.displayName} size={34} /></span>
                      <small>{friend.displayName}</small>
                    </div>
                  ))}
                  <Link className="friends-row__add" to="/app/comunidad"><UserPlus /><small>Agregar</small></Link>
                </div>
              );
            }}
          </Async>
        </NeonCard>

        <NeonCard tone="magenta" title="Actividad reciente">
          <Async query={feed}>
            {data => (
              <div className="activity-list">
                {data.items.length === 0 && <p className="empty-note">Sin actividad todavía.</p>}
                {data.items.map(entry => (
                  <div className="activity-item" key={entry.id}>
                    <Star />
                    <div>
                      <b>{entry.title}</b>
                      <span>{entry.subtitle}</span>
                      <small>{timeAgo(entry.createdAt)}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Async>
        </NeonCard>

        <NeonCard tone="yellow" title="Tu semana">
          <Async query={progress}>
            {data => (
              <div className="goal-list">
                {data.weeklyActivity.map(day => (
                  <div key={day.day}>
                    <CalendarDays />
                    <span>{day.day}</span>
                    <b>{day.xp} XP</b>
                  </div>
                ))}
              </div>
            )}
          </Async>
        </NeonCard>
      </div>
    </div>
  );
}
