import { useQuery } from '@tanstack/react-query';
import { Award, CheckCircle2, ChevronRight, Flame, Gem, RotateCcw, Star, Zap } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Async } from '../components/AsyncState';
import { NeonCard } from '../components/NeonCard';
import { ProgressBar } from '../components/ProgressBar';
import { api } from '../lib/api';

/** Pantalla de "¡Misión completada!" con el resultado real del intento. */
export function LessonCompletePage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const result = useQuery({
    queryKey: ['attempt-result', attemptId],
    queryFn: () => api.attemptResult(attemptId!),
    enabled: Boolean(attemptId),
    retry: false,
  });

  return (
    <div className="complete-page">
      <Async query={result}>
        {data => (
          <>
            <section
              className="complete-hero"
              style={{ backgroundImage: 'linear-gradient(90deg,rgba(8,20,46,.86),rgba(8,20,46,.28)),url(/assets/bg-cosmic.jpg)' }}
            >
              <div>
                <span>🎉</span>
                <h1>{data.outcome === 'COMPLETED' ? '¡Misión completada!' : 'Casi lo tienes'}</h1>
                <p>{data.subjectName} · {data.missionTitle}</p>
              </div>
              <img className="hero-character hero-character--celebrate" src="/assets/character/celebrar.png" alt="" />
            </section>

            <div className="complete-grid">
              <NeonCard tone="yellow" title="Puntuación final">
                <div className="score-final">
                  <b>{data.score}</b><span>/{data.maxScore}</span>
                </div>
                <ProgressBar value={data.score} max={data.maxScore} tone="yellow" />
                <div className="stars-big">{'★'.repeat(data.stars)}{'☆'.repeat(3 - data.stars)}</div>
                <span>{data.stars} de 3 estrellas</span>
                <small>
                  {data.stars === 3 ? '¡Misión completada al máximo!'
                    : data.stars === 2 ? 'Buen trabajo. Repite para las tres estrellas.'
                    : 'Completada. Vuelve cuando quieras a mejorarla.'}
                </small>
              </NeonCard>

              <NeonCard tone="cyan" title="Tus respuestas">
                <div className="answer-score">
                  <div className="answer-ring">
                    <b>{data.correctCount}</b>
                    <span>de {data.correctCount + data.wrongCount + data.skippedCount}</span>
                  </div>
                  <ul>
                    <li className="good">{data.correctCount} correctas</li>
                    <li className="bad">{data.wrongCount} incorrectas</li>
                    <li>{data.skippedCount} sin responder</li>
                  </ul>
                </div>
                <div className="accuracy">
                  <b>{data.accuracyPercent}%</b>
                  <span>de aciertos</span>
                </div>
              </NeonCard>

              <NeonCard tone="yellow" title="Recompensas obtenidas">
                <div className="reward-cards">
                  <div><Star /><b>+{data.xpAwarded}</b><span>XP</span></div>
                  <div><Gem /><b>+{data.coinsAwarded}</b><span>Pixeles</span></div>
                  {data.gemsAwarded > 0 && <div><Zap /><b>+{data.gemsAwarded}</b><span>Gemas</span></div>}
                </div>
                {data.leveledUp && (
                  <div className="level-up-note"><Flame /> ¡Subiste al nivel {data.newLevel}!</div>
                )}
              </NeonCard>

              <NeonCard tone="magenta" title={data.unlockedBadges.length > 0 && data.unlockedAchievements.length > 0
                ? 'Logros e insignias'
                : data.unlockedAchievements.length > 0 ? 'Logros desbloqueados' : 'Insignias desbloqueadas'}>
                {data.unlockedBadges.length === 0 && data.unlockedAchievements.length === 0 ? (
                  <p className="empty-note">Ninguna esta vez. Sigue jugando y caerán.</p>
                ) : (
                  <div className="unlocked-badges">
                    {data.unlockedBadges.map(badge => (
                      <div key={badge.id}><Zap /><b>{badge.title}</b><span>{badge.description}</span></div>
                    ))}
                    {data.unlockedAchievements.map(achievement => (
                      <div key={achievement.id}><Award /><b>{achievement.title}</b><span>{achievement.description}</span></div>
                    ))}
                  </div>
                )}
              </NeonCard>

              <NeonCard tone="cyan" title="Lista de objetivos de la misión">
                <ul className="complete-checklist">
                  {data.objectives.map(objective => (
                    <li key={objective.id} className={objective.completed ? '' : 'pending'}>
                      <CheckCircle2 />{objective.description}
                    </li>
                  ))}
                </ul>
              </NeonCard>

              {data.teacherNote && (
                <NeonCard tone="magenta" title="Comentario de tu profesor">
                  <div className="teacher-note">
                    <span className="teacher-avatar">👩‍🏫</span>
                    <p>{data.teacherNote}</p>
                  </div>
                </NeonCard>
              )}
            </div>

            {data.learnedPoints.length > 0 && (
              <div className="what-learned">
                <h3>Lo que aprendiste</h3>
                {data.learnedPoints.map(point => (
                  <span key={point}><CheckCircle2 />{point}</span>
                ))}
              </div>
            )}

            <div className="complete-actions">
              <Link className="pixel-button pixel-button--ghost" to="/app/niveles">
                <RotateCcw size={17} /> Volver al mapa
              </Link>
              <button className="pixel-button pixel-button--magenta" onClick={() => navigate(`/app/misiones/${data.missionId}`)}>
                Repetir misión
              </button>
              {data.nextMissionId && (
                <button className="pixel-button pixel-button--yellow" onClick={() => navigate(`/app/misiones/${data.nextMissionId}`)}>
                  Siguiente misión <ChevronRight size={18} />
                </button>
              )}
            </div>
          </>
        )}
      </Async>
    </div>
  );
}
