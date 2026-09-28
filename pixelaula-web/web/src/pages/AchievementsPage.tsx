import type { AchievementCategory } from '@pixelaula/api';
import { Award, ChevronRight, Flame, Gem, Star, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Async } from '../components/AsyncState';
import { CharacterPortrait, PeerPortrait } from '../components/CharacterPortrait';
import { NeonCard } from '../components/NeonCard';
import { ProgressBar } from '../components/ProgressBar';
import {
  useAchievements, useBadges, useChallenges, useLeaderboard, useMe, useStreak,
} from '../hooks/queries';

const CATEGORIES: Array<{ id: AchievementCategory | 'TODOS'; label: string }> = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'APRENDIZAJE', label: 'Aprendizaje' },
  { id: 'EXPLORACION', label: 'Exploración' },
  { id: 'CONSTANCIA', label: 'Constancia' },
  { id: 'CREATIVIDAD', label: 'Creatividad' },
  { id: 'ESPECIALES', label: 'Especiales' },
];

const RARITY_TONE: Record<string, string> = {
  COMMON: 'cyan',
  UNCOMMON: 'green',
  RARE: 'violet',
  EPIC: 'magenta',
  LEGENDARY: 'yellow',
};

export function AchievementsPage() {
  const me = useMe();
  const achievements = useAchievements();
  const badges = useBadges();
  const challenges = useChallenges();
  const streak = useStreak();
  const leaderboard = useLeaderboard('global', 'week');

  const [category, setCategory] = useState<AchievementCategory | 'TODOS'>('TODOS');

  const unlockedCount = (achievements.data ?? []).filter(a => a.unlocked).length;
  const badgeCount = (badges.data ?? []).filter(b => b.unlocked).length;
  const visible = (achievements.data ?? []).filter(a => category === 'TODOS' || a.category === category);
  const topXp = Math.max(1, ...(leaderboard.data?.entries ?? []).map(e => e.xp));

  return (
    <div className="page-stack">
      <section
        className="page-banner achievements-banner"
        style={{ backgroundImage: 'linear-gradient(90deg,rgba(8,20,46,.9),rgba(8,20,46,.25)),url(/assets/bg-cosmic.jpg)' }}
      >
        <div>
          <span className="eyebrow">Tus metas cuentan</span>
          <h1>Logros que te acercan a un <span>futuro increíble</span></h1>
          <p>Aprende, completa desafíos y desbloquea recompensas mientras sigues tu aventura.</p>
        </div>
      </section>

      <div className="achievement-summary">
        <div><Star /><b>{unlockedCount}</b><span>Logros completados</span></div>
        <div><Trophy /><b>{badgeCount}</b><span>Insignias obtenidas</span></div>
        <div><Flame /><b>{streak.data?.currentDays ?? 0} días</b><span>Racha actual</span></div>
        <div><Gem /><b>{me.data?.pixelsCoins ?? 0}</b><span>Pixeles</span></div>
      </div>

      <div className="achievement-layout">
        <NeonCard tone="yellow" title="Logros">
          <div className="segment-control segment-control--wrap">
            {CATEGORIES.map(item => (
              <button
                key={item.id}
                className={category === item.id ? 'active' : ''}
                onClick={() => setCategory(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Async query={achievements}>
            {() => (
              <div className="achievement-grid">
                {visible.length === 0 && <p className="empty-note">No hay logros en esta categoría.</p>}
                {visible.map(achievement => (
                  <article
                    key={achievement.id}
                    className={`achievement-card ${achievement.unlocked ? '' : 'achievement-card--locked'}`}
                  >
                    <div className="achievement-card__icon tone-bg-yellow"><Trophy /></div>
                    <h3>{achievement.title}</h3>
                    <p>{achievement.description}</p>
                    {achievement.unlocked ? (
                      <span className="tone-green">✓ Completado</span>
                    ) : (
                      <>
                        <ProgressBar value={achievement.currentValue} max={achievement.targetValue} compact />
                        <span>{achievement.currentValue}/{achievement.targetValue}</span>
                      </>
                    )}
                    <small>⭐ +{achievement.rewardXp} XP · 💎 +{achievement.rewardCoins}</small>
                  </article>
                ))}
              </div>
            )}
          </Async>
        </NeonCard>

        <NeonCard tone="magenta" title="Insignias">
          <Async query={badges}>
            {data => (
              <div className="badge-matrix">
                {data.map(badge => (
                  <div
                    key={badge.id}
                    className={`badge-large ${badge.unlocked ? '' : 'locked'} tone-border-${RARITY_TONE[badge.rarity] ?? 'cyan'}`}
                    title={`${badge.description} · ${badge.rarity}`}
                  >
                    <Award />
                    <span>{badge.title}</span>
                  </div>
                ))}
              </div>
            )}
          </Async>
        </NeonCard>
      </div>

      <div className="achievement-layout achievement-layout--bottom">
        <NeonCard tone="cyan" title="Ranking de la semana">
          <Async query={leaderboard}>
            {data => (
              <div className="ranking-list">
                {data.entries.length === 0 && <p className="empty-note">Nadie ha sumado XP esta semana todavía.</p>}
                {data.entries.slice(0, 6).map(entry => (
                  <div key={entry.userId} className={entry.isCurrentUser ? 'me' : ''}>
                    <b>{entry.rank}</b>
                    <span className="ranking-avatar">
                      {entry.isCurrentUser
                        ? <CharacterPortrait size={30} />
                        : <PeerPortrait name={entry.displayName} size={30} />}
                    </span>
                    <div>
                      <strong>{entry.displayName}</strong>
                      <small>Nivel {entry.level}</small>
                    </div>
                    <div className="ranking-bar"><i style={{ width: `${Math.round((entry.xp / topXp) * 100)}%` }} /></div>
                    <span>{entry.xp} XP</span>
                  </div>
                ))}
              </div>
            )}
          </Async>
        </NeonCard>

        <NeonCard tone="magenta" title="Desafíos">
          <Async query={challenges}>
            {data => (
              <div className="challenge-list">
                {data.length === 0 && <p className="empty-note">No hay desafíos activos ahora mismo.</p>}
                {data.map((challenge, i) => (
                  <div key={challenge.id}>
                    <span className={`challenge-dot tone-bg-${['yellow', 'cyan', 'magenta', 'green'][i % 4]}`} />
                    <div>
                      <b>{challenge.title}</b>
                      <small>{challenge.description}</small>
                      <ProgressBar value={challenge.currentValue} max={challenge.targetValue} compact />
                    </div>
                    <strong>{challenge.completed ? '✓' : `+${challenge.rewardXp} XP`}</strong>
                    <ChevronRight />
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
