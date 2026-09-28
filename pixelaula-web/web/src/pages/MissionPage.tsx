import type { Activity, ActivityAnswer, AnswerResult, MissionAttempt } from '@pixelaula/api';
import { PixelAulaError, messageFor } from '@pixelaula/api';
import { useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, ChevronRight, Circle, Gem, LockKeyhole, RotateCcw, SkipForward, Sparkles, Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ActivityPlayer } from '../components/ActivityPlayer';
import { ErrorState, Loading } from '../components/AsyncState';
import { NeonCard } from '../components/NeonCard';
import { ProgressBar } from '../components/ProgressBar';
import { invalidateProgress, useMission, useSubjectMissions } from '../hooks/queries';
import { toneForDifficulty } from '../lib/adapters';
import { api } from '../lib/api';

/**
 * Pantalla de misión: la que cierra el bucle jugable.
 *
 * El estado del intento lo manda el servidor en cada respuesta, así que aquí
 * no se lleva contabilidad propia de aciertos ni de puntaje: se pinta lo que
 * llega. Es lo que impide que tocar el JavaScript cambie el resultado.
 */
export function MissionPage() {
  const { missionId } = useParams<{ missionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mission = useMission(missionId);
  const siblings = useSubjectMissions(mission.data?.subjectId);

  const [attempt, setAttempt] = useState<MissionAttempt | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [answer, setAnswer] = useState<ActivityAnswer | null>(null);
  const [feedback, setFeedback] = useState<AnswerResult | null>(null);
  const [hint, setHint] = useState<{ text: string; level: number } | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [starting, setStarting] = useState(true);

  /** UUID por actividad: hace la respuesta idempotente ante un reintento. */
  const clientAttemptId = useRef<string>(crypto.randomUUID());
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    if (!missionId) return;
    let cancelled = false;

    setStarting(true);
    setError(null);
    api
      .startMission(missionId)
      .then(result => {
        if (cancelled) return;
        setAttempt(result.attempt);
        setActivity(result.activity);
        clientAttemptId.current = crypto.randomUUID();
        startedAt.current = Date.now();
      })
      .catch(cause => { if (!cancelled) setError(cause); })
      .finally(() => { if (!cancelled) setStarting(false); });

    return () => { cancelled = true; };
  }, [missionId]);

  function advance(result: AnswerResult) {
    setAttempt(result.attempt);
    setFeedback(result);
    setHint(null);
    setExplanation(null);
    setAnswer(null);

    if (result.finished) {
      invalidateProgress(queryClient);
      // Deja ver el veredicto un momento antes de saltar al resultado.
      setTimeout(() => navigate(`/app/resultados/${result.attempt.id}`), 1200);
    }
  }

  async function submit() {
    if (!attempt || !answer || busy) return;
    setBusy(true);
    setError(null);
    try {
      advance(
        await api.answer(attempt.id, {
          clientAttemptId: clientAttemptId.current,
          answer,
          timeSpentMs: Date.now() - startedAt.current,
        }),
      );
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (!feedback?.nextActivity) return;
    setActivity(feedback.nextActivity);
    setFeedback(null);
    clientAttemptId.current = crypto.randomUUID();
    startedAt.current = Date.now();
  }

  async function askHint() {
    if (!attempt || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.hint(attempt.id);
      setHint({ text: result.hint, level: result.hintLevel });
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }

  async function skip() {
    if (!attempt || busy) return;
    setBusy(true);
    setError(null);
    try {
      advance(await api.skipActivity(attempt.id));
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }

  async function explain() {
    if (!feedback?.answerId || busy) return;
    setBusy(true);
    try {
      const result = await api.explainAnswer(feedback.answerId);
      setExplanation(result.markdown);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }

  if (mission.isLoading || starting) {
    return <div className="page-stack"><Loading label="Preparando la misión..." /></div>;
  }

  if (error && !attempt) {
    const locked = error instanceof PixelAulaError && error.code === 'MISSION_LOCKED';
    return (
      <div className="page-stack">
        <ErrorState error={error} onRetry={locked ? undefined : () => navigate(0)} />
        <button className="pixel-button pixel-button--cyan" onClick={() => navigate('/app/niveles')}>
          Volver al mapa
        </button>
      </div>
    );
  }

  const data = mission.data;
  const tone = data ? toneForDifficulty(data.difficulty) : 'cyan';
  const total = attempt?.activityTotal ?? 0;
  const done = attempt?.activityIndex ?? 0;

  return (
    <div className="mission-page">
      <aside className="mission-rail">
        <div className="mission-rail__title"><Zap /> {data?.subjectName}</div>

        {(siblings.data ?? []).map(item => (
          <button
            key={item.id}
            className={item.id === missionId ? 'active' : item.status === 'LOCKED' ? 'locked' : ''}
            disabled={item.status === 'LOCKED'}
            onClick={() => navigate(`/app/misiones/${item.id}`)}
          >
            <span>
              {item.status === 'LOCKED' ? <LockKeyhole size={16} />
                : item.status === 'COMPLETED' ? <CheckCircle2 size={17} />
                : <Sparkles size={17} />}
            </span>
            <div>
              <b>Misión {item.levelNumber}</b>
              <small>{item.title}</small>
            </div>
          </button>
        ))}

        <div className="mission-progress">
          <span>Tu progreso</span>
          <b>{done}/{total}</b>
          <ProgressBar value={done} max={Math.max(1, total)} tone="yellow" />
          <div>⭐ {attempt?.correctCount ?? 0} aciertos · 💎 {attempt?.hintsUsed ?? 0} pistas</div>
        </div>
      </aside>

      <section className="mission-work">
        <div
          className="mission-banner"
          style={{ backgroundImage: 'linear-gradient(90deg,rgba(8,20,46,.9),rgba(8,20,46,.2)),url(/assets/bg-classroom.jpg)' }}
        >
          <div>
            <span>{data?.subjectName} · Misión {data?.levelNumber}</span>
            <h1>{data?.title}</h1>
            <p>{data?.description}</p>
          </div>
          <div className="hero-bubble">{activity?.title ?? '¡Vamos allá!'}</div>
          <img className="hero-character hero-character--mission" src="/assets/character/senalar.png" alt="" />
          <div className="level-box">Nivel {data?.levelNumber}</div>
        </div>

        <div className="mission-grid">
          <NeonCard tone="magenta" title="Objetivo de la misión">
            <p>{data?.description}</p>
            <ul className="checklist">
              {(attempt?.objectives ?? []).map(objective => (
                <li key={objective.id} className={objective.completed ? 'done' : ''}>
                  {objective.description}
                </li>
              ))}
            </ul>
            <div className="reward-box">⭐ +{data?.xpReward} XP · 💎 +{data?.coinsReward} Pixeles</div>
          </NeonCard>

          <div className="activity-stage">
            {activity ? (
              <>
                <div className="activity-head">
                  <span>Actividad {activity.index} de {activity.total}</span>
                  <b>{activity.question}</b>
                </div>

                <ActivityPlayer activity={activity} disabled={Boolean(feedback) || busy} onChange={setAnswer} />

                {hint && (
                  <div className="tip-box">
                    <Sparkles />
                    <span><b>Pista {hint.level}</b>{hint.text}</span>
                  </div>
                )}

                {feedback && (
                  <div className={`mission-feedback ${feedback.correct ? 'success' : 'error'}`}>
                    <b>{feedback.feedback}</b>
                    {feedback.nextStep && <small>{feedback.nextStep}</small>}
                    {explanation && <div className="explanation">{explanation}</div>}
                  </div>
                )}

                {error && <ErrorState error={error} />}

                <div className="activity-actions">
                  {!feedback ? (
                    <>
                      <button
                        className="pixel-button pixel-button--ghost pixel-button--sm"
                        onClick={askHint}
                        disabled={busy || activity.hintsAvailable === 0}
                        title={activity.hintsAvailable === 0 ? 'No quedan pistas' : undefined}
                      >
                        <Gem size={15} /> Pista ({activity.hintsAvailable}) · −{activity.hintCostGems}
                      </button>
                      <button className="pixel-button pixel-button--ghost pixel-button--sm" onClick={skip} disabled={busy}>
                        <SkipForward size={15} /> Saltar
                      </button>
                      <button className={`pixel-button pixel-button--${tone}`} onClick={submit} disabled={!answer || busy}>
                        {busy ? 'Comprobando...' : 'Comprobar'} <ChevronRight size={17} />
                      </button>
                    </>
                  ) : feedback.finished ? (
                    <span className="activity-actions__note">Preparando tus resultados...</span>
                  ) : (
                    <>
                      {feedback.canExplain && !explanation && (
                        <button className="pixel-button pixel-button--ghost pixel-button--sm" onClick={explain} disabled={busy}>
                          <RotateCcw size={15} /> ¿Por qué?
                        </button>
                      )}
                      <button className="pixel-button pixel-button--cyan" onClick={next}>
                        Siguiente <ChevronRight size={17} />
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <Loading label="Cargando la actividad..." />
            )}
          </div>

          <NeonCard tone="cyan" title="Tu misión">
            <div className="score-box">
              <b>{attempt?.correctCount ?? 0}/{total}</b>
              <span>aciertos</span>
              <ProgressBar value={attempt?.correctCount ?? 0} max={Math.max(1, total)} />
            </div>
            <ul className="mission-checks">
              {(attempt?.objectives ?? []).map(objective => (
                <li key={objective.id} className={objective.completed ? 'done' : ''}>
                  {objective.completed ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                  {objective.description}
                </li>
              ))}
            </ul>
            {error instanceof PixelAulaError && (
              <div className="tip-box"><span>{messageFor(error.code, error.message)}</span></div>
            )}
          </NeonCard>
        </div>
      </section>
    </div>
  );
}
