import { randomUUID } from 'node:crypto';
import type {
  Activity, AnswerBody, AnswerResult, Explanation, HintResult, MissionAttempt,
  MissionObjective, MissionResult,
} from '@pixelaula/api';
import { err } from '../lib/errors.js';
import { rpc } from '../lib/supabase.js';
import { activityScore, evaluate, missionScore, shuffleWithSeed, starsFor } from './evaluator.js';
import { toAttempt, toObjective, toPublicActivity } from './mappers.js';
import { assertMissionUnlocked } from './learning.service.js';
import { attempts, content, meta, personal, profiles, progress } from './repo.js';
import type { ActivityRow, AttemptRow, ObjectiveRow } from './rows.js';
import { evaluateAchievements, touchStreak } from './social.service.js';

/**
 * Motor de misiones.
 *
 * Todo lo que decide si una respuesta vale ocurre aquí y en evaluator.ts.
 * El cliente manda lo que hizo; el servidor dice si está bien, cuánto puntúa
 * y qué se lleva. Asume que la app se puede decompilar.
 */

/**
 * Pistas consumidas por actividad dentro de un intento. Vive en memoria
 * porque solo importa mientras la partida está abierta; si el proceso se
 * reinicia el jugador recupera pistas, que le favorece a él y no al revés.
 * Las gemas ya se descontaron y esas sí están en la base.
 */
const hintCounters = new Map<string, number>();
const hintKey = (attemptId: string, activityId: string) => `${attemptId}:${activityId}`;
const hintsUsedFor = (attemptId: string, activityId: string) => hintCounters.get(hintKey(attemptId, activityId)) ?? 0;
const bumpHint = (attemptId: string, activityId: string) => {
  const next = hintsUsedFor(attemptId, activityId) + 1;
  hintCounters.set(hintKey(attemptId, activityId), next);
  return next;
};
const clearHints = (attemptId: string) => {
  for (const key of hintCounters.keys()) {
    if (key.startsWith(`${attemptId}:`)) hintCounters.delete(key);
  }
};

function ownedAttempt(row: AttemptRow | null, userId: string): AttemptRow {
  if (!row || row.user_id !== userId) throw err.notFound('Intento');
  return row;
}

async function objectivesFor(attempt: AttemptRow): Promise<MissionObjective[]> {
  const [defs, state] = await Promise.all([
    content.objectives(attempt.mission_id),
    attempts.objectives(attempt.id),
  ]);
  const done = new Set(state.filter(s => s.completed).map(s => s.objective_id));
  return defs.map(d => toObjective(d, done.has(d.id)));
}

async function currentActivityRow(attempt: AttemptRow): Promise<ActivityRow | null> {
  const id = attempt.activity_order[attempt.activity_index];
  if (!id) return null;
  return content.activity(id);
}

async function publicCurrent(attempt: AttemptRow): Promise<Activity | null> {
  const row = await currentActivityRow(attempt);
  if (!row) return null;
  return toPublicActivity(
    row,
    attempt.activity_index + 1,
    attempt.activity_order.length,
    hintsUsedFor(attempt.id, row.id),
  );
}

// ---------------------------------------------------------------------------
// Iniciar o reanudar
// ---------------------------------------------------------------------------

export async function startMission(userId: string, missionId: string) {
  await assertMissionUnlocked(userId, missionId);

  // Si ya había un intento abierto se reanuda: nada de perder el progreso.
  const existing = await attempts.activeForMission(userId, missionId);
  if (existing) {
    return {
      attempt: toAttempt(existing, await objectivesFor(existing)),
      activity: await publicCurrent(existing),
      resumed: true,
    };
  }

  const activities = await content.activities(missionId);
  if (!activities.length) throw err.noContent();

  const objectives = await content.objectives(missionId);
  const seed = randomUUID();

  let attempt: AttemptRow;
  try {
    attempt = await attempts.create({
      user_id: userId,
      mission_id: missionId,
      // Las actividades con simulador dependen del enunciado, así que solo se
      // baraja cuando todas son de pregunta suelta.
      activity_order: activities.some(a => a.type.endsWith('SIMULATION'))
        ? activities.map(a => a.id)
        : shuffleWithSeed(activities.map(a => a.id), seed),
      activity_index: 0,
    });
  } catch (cause) {
    // Dos peticiones a la vez (doble clic, un reintento, o el doble render de
    // React en desarrollo) pasan las dos la comprobación de "¿hay intento
    // activo?" y la segunda choca con el índice único. En ese caso lo correcto
    // es reanudar el que acaba de crear la otra, no devolver un error.
    const raced = await attempts.activeForMission(userId, missionId);
    if (!raced) throw cause;
    return {
      attempt: toAttempt(raced, await objectivesFor(raced)),
      activity: await publicCurrent(raced),
      resumed: true,
    };
  }

  await attempts.seedObjectives(attempt.id, objectives.map(o => o.id));
  await progress.upsert(userId, missionId, { status: 'ACTIVE' });

  return {
    attempt: toAttempt(attempt, await objectivesFor(attempt)),
    activity: await publicCurrent(attempt),
    resumed: false,
  };
}

export async function getAttempt(userId: string, attemptId: string): Promise<MissionAttempt> {
  const attempt = ownedAttempt(await attempts.byId(attemptId), userId);
  return toAttempt(attempt, await objectivesFor(attempt));
}

export async function getCurrentActivity(userId: string, attemptId: string): Promise<Activity> {
  const attempt = ownedAttempt(await attempts.byId(attemptId), userId);
  if (attempt.status !== 'ACTIVE') throw err.attemptFinished();
  const activity = await publicCurrent(attempt);
  if (!activity) throw err.noCurrentActivity();
  return activity;
}

// ---------------------------------------------------------------------------
// Responder
// ---------------------------------------------------------------------------

export async function submitAnswer(
  userId: string,
  attemptId: string,
  body: AnswerBody,
): Promise<AnswerResult> {
  const attempt = ownedAttempt(await attempts.byId(attemptId), userId);

  // Idempotencia: un reenvío por mala red devuelve el mismo resultado en vez
  // de contar un segundo fallo.
  const duplicate = await attempts.byClientId(attemptId, body.clientAttemptId);
  if (duplicate) {
    const fresh = (await attempts.byId(attemptId))!;
    return {
      duplicate: true,
      correct: duplicate.is_correct,
      score: duplicate.score,
      feedback: duplicate.ai_feedback?.feedback ?? 'Ya habíamos recibido esta respuesta.',
      nextStep: null,
      answerId: duplicate.id,
      canExplain: !duplicate.is_correct,
      objectives: await objectivesFor(fresh),
      attempt: toAttempt(fresh, await objectivesFor(fresh)),
      nextActivity: fresh.status === 'ACTIVE' ? await publicCurrent(fresh) : null,
      finished: fresh.status !== 'ACTIVE',
      result: null,
    };
  }

  if (attempt.status !== 'ACTIVE') throw err.attemptFinished();

  const activity = await currentActivityRow(attempt);
  if (!activity) throw err.noCurrentActivity();

  const hintsUsed = hintsUsedFor(attemptId, activity.id);
  const verdict = evaluate(activity.type, body.answer, activity.solution);
  const score = activityScore(verdict.score, hintsUsed);

  const answer = await attempts.insertAnswer({
    attempt_id: attemptId,
    user_id: userId,
    activity_id: activity.id,
    client_attempt_id: body.clientAttemptId,
    answer: body.answer,
    is_correct: verdict.correct,
    score,
    hints_used: hintsUsed,
    time_spent_ms: body.timeSpentMs ?? null,
    ai_feedback: { feedback: verdict.feedback },
  });

  if (activity.concept) {
    await progress.recordConcept(userId, activity.concept, verdict.correct);
  }

  // El objetivo ligado a esta actividad se marca al acertarla.
  if (verdict.correct) {
    const defs = await content.objectives(attempt.mission_id);
    const linked = defs.find((o: ObjectiveRow) => o.activity_index === activity.order_index);
    if (linked) await attempts.completeObjective(attemptId, linked.id);
  }

  const nextIndex = attempt.activity_index + 1;
  let updated = await attempts.update(attemptId, {
    activity_index: nextIndex,
    correct_count: attempt.correct_count + (verdict.correct ? 1 : 0),
    wrong_count: attempt.wrong_count + (verdict.correct ? 0 : 1),
    hints_used: attempt.hints_used + hintsUsed,
  });

  const finished = nextIndex >= updated.activity_order.length;
  let result: MissionResult | null = null;
  if (finished) {
    result = await finishAttempt(userId, attemptId);
    updated = (await attempts.byId(attemptId))!;
  }

  const objectives = await objectivesFor(updated);

  return {
    duplicate: false,
    correct: verdict.correct,
    score,
    feedback: verdict.feedback,
    nextStep: verdict.correct ? null : 'Revisa la explicación antes de seguir.',
    answerId: answer.id,
    /** La explicación completa se pide aparte: POST /answers/:id/explain */
    canExplain: !verdict.correct,
    objectives,
    attempt: toAttempt(updated, objectives),
    nextActivity: finished ? null : await publicCurrent(updated),
    finished,
    result,
  };
}

// ---------------------------------------------------------------------------
// Pistas
// ---------------------------------------------------------------------------

export async function requestHint(userId: string, attemptId: string): Promise<HintResult> {
  const attempt = ownedAttempt(await attempts.byId(attemptId), userId);
  if (attempt.status !== 'ACTIVE') throw err.attemptFinished();

  const activity = await currentActivityRow(attempt);
  if (!activity) throw err.noCurrentActivity();

  const used = hintsUsedFor(attemptId, activity.id);
  if (used >= activity.hints.length) throw err.noMoreHints();

  // Las gemas se descuentan de forma atómica: si no alcanzan, no hay pista.
  const gemsRemaining = await rpc<number>('pa_spend_gems', {
    p_user_id: userId,
    p_amount: activity.hint_cost_gems,
  });

  const level = bumpHint(attemptId, activity.id);

  return {
    hint: activity.hints[level - 1]!,
    hintLevel: level,
    hintsRemaining: activity.hints.length - level,
    gemsSpent: activity.hint_cost_gems,
    gemsRemaining,
    scoreMultiplier: [1, 0.85, 0.65, 0.4][Math.min(level, 3)]!,
  };
}

// ---------------------------------------------------------------------------
// Saltar y abandonar
// ---------------------------------------------------------------------------

export async function skipActivity(userId: string, attemptId: string): Promise<AnswerResult> {
  const attempt = ownedAttempt(await attempts.byId(attemptId), userId);
  if (attempt.status !== 'ACTIVE') throw err.attemptFinished();

  const activity = await currentActivityRow(attempt);
  if (!activity) throw err.noCurrentActivity();

  const answer = await attempts.insertAnswer({
    attempt_id: attemptId,
    user_id: userId,
    activity_id: activity.id,
    client_attempt_id: randomUUID(),
    answer: { skipped: true },
    is_correct: false,
    score: 0,
    hints_used: hintsUsedFor(attemptId, activity.id),
    skipped: true,
  });

  const nextIndex = attempt.activity_index + 1;
  let updated = await attempts.update(attemptId, {
    activity_index: nextIndex,
    skipped_count: attempt.skipped_count + 1,
  });

  const finished = nextIndex >= updated.activity_order.length;
  let result: MissionResult | null = null;
  if (finished) {
    result = await finishAttempt(userId, attemptId);
    updated = (await attempts.byId(attemptId))!;
  }

  const objectives = await objectivesFor(updated);

  return {
    duplicate: false,
    correct: false,
    score: 0,
    feedback: 'Actividad saltada. Puedes volver a ella repitiendo la misión.',
    nextStep: null,
    answerId: answer.id,
    canExplain: true,
    objectives,
    attempt: toAttempt(updated, objectives),
    nextActivity: finished ? null : await publicCurrent(updated),
    finished,
    result,
  };
}

export async function abandonAttempt(userId: string, attemptId: string): Promise<MissionAttempt> {
  const attempt = ownedAttempt(await attempts.byId(attemptId), userId);
  if (attempt.status !== 'ACTIVE') throw err.attemptFinished();

  clearHints(attemptId);
  const updated = await attempts.update(attemptId, {
    status: 'ABANDONED',
    finished_at: new Date().toISOString(),
  });
  await progress.upsert(userId, attempt.mission_id, { status: 'ACTIVE' });

  return toAttempt(updated, await objectivesFor(updated));
}

// ---------------------------------------------------------------------------
// Cierre y resultado
// ---------------------------------------------------------------------------

function teacherNoteFor(accuracy: number, missionTitle: string, displayName: string): string {
  if (accuracy >= 90) {
    return `¡Excelente, ${displayName}! Dominaste "${missionTitle}" de principio a fin. Se nota que entendiste el porqué, no solo el cómo.`;
  }
  if (accuracy >= 70) {
    return `Buen trabajo, ${displayName}. Tienes clara la idea principal de "${missionTitle}". Repasa los puntos que fallaste y quedará redondo.`;
  }
  if (accuracy >= 40) {
    return `Vas avanzando, ${displayName}. "${missionTitle}" tiene partes que todavía se resisten: vuelve a la lección y repite la misión sin prisa.`;
  }
  return `Esta te costó, ${displayName}, y no pasa nada. Lee otra vez la lección de "${missionTitle}" y vuelve: la segunda siempre se ve distinta.`;
}

export async function finishAttempt(userId: string, attemptId: string): Promise<MissionResult> {
  const attempt = ownedAttempt(await attempts.byId(attemptId), userId);

  // Si ya estaba cerrado, se devuelve el resultado guardado en vez de pagar dos veces.
  if (attempt.status !== 'ACTIVE') return buildResult(userId, attempt);

  const [answers, mission, profile] = await Promise.all([
    attempts.answers(attemptId),
    content.mission(attempt.mission_id),
    profiles.byId(userId),
  ]);
  if (!mission) throw err.notFound('Misión');

  const total = attempt.activity_order.length;
  const score = missionScore(answers.map(a => a.score), total);
  const mistakes = answers.filter(a => !a.is_correct).length;
  const stars = starsFor(score, mistakes);
  const accuracy = total ? Math.round((answers.filter(a => a.is_correct).length / total) * 100) : 0;

  await attempts.update(attemptId, {
    teacher_note: teacherNoteFor(accuracy, mission.title, profile?.display_name ?? 'estudiante'),
  });

  // XP, Pixeles, gemas, estrellas, subida de nivel y desbloqueo: una transacción.
  await rpc('pa_complete_mission', {
    p_attempt_id: attemptId,
    p_score: score,
    p_stars: stars,
  });

  clearHints(attemptId);
  await touchStreak(userId);
  await evaluateAchievements(userId);

  const refreshed = (await attempts.byId(attemptId))!;
  return buildResult(userId, refreshed);
}

export async function getResult(userId: string, attemptId: string): Promise<MissionResult> {
  const attempt = ownedAttempt(await attempts.byId(attemptId), userId);
  return buildResult(userId, attempt);
}

async function buildResult(userId: string, attempt: AttemptRow): Promise<MissionResult> {
  const [mission, answers, objectives, profile, badgeRows, userBadges, achievements, userAchievements] =
    await Promise.all([
      content.mission(attempt.mission_id),
      attempts.answers(attempt.id),
      objectivesFor(attempt),
      profiles.byId(userId),
      meta.badges(),
      meta.userBadges(userId),
      meta.achievements(),
      meta.userAchievements(userId),
    ]);
  if (!mission) throw err.notFound('Misión');

  const subject = await content.subject(mission.subject_id);
  const total = attempt.activity_order.length;
  const correct = answers.filter(a => a.is_correct).length;

  // Solo lo desbloqueado durante este intento: entre que empezó y terminó.
  const since = Date.parse(attempt.started_at);
  const unlockedBadges = userBadges
    .filter(b => Date.parse(b.unlocked_at) >= since)
    .map(b => badgeRows.find(row => row.id === b.badge_id))
    .filter((b): b is NonNullable<typeof b> => Boolean(b))
    .map(b => ({
      id: b.id,
      title: b.title,
      description: b.description,
      icon: b.icon,
      rarity: b.rarity,
      unlocked: true,
    }));

  const unlockedAchievements = userAchievements
    .filter(a => a.unlocked_at && Date.parse(a.unlocked_at) >= since)
    .map(a => {
      const row = achievements.find(x => x.id === a.achievement_id);
      if (!row) return null;
      return {
        id: row.id,
        category: row.category,
        title: row.title,
        description: row.description,
        icon: row.icon,
        progressPercent: 100,
        currentValue: a.current_value,
        targetValue: row.target_value,
        unlocked: true,
        unlockedAt: a.unlocked_at ?? undefined,
        rewardXp: row.reward_xp,
        rewardCoins: row.reward_coins,
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  const nextMission = await rpc<string | null>('pa_next_mission_id', { p_mission_id: mission.id });

  return {
    attemptId: attempt.id,
    missionId: mission.id,
    missionTitle: mission.title,
    subjectName: subject?.name ?? '',
    outcome: attempt.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
    score: attempt.score,
    maxScore: 100,
    stars: attempt.stars,
    accuracyPercent: total ? Math.round((correct / total) * 100) : 0,
    correctCount: correct,
    wrongCount: attempt.wrong_count,
    skippedCount: attempt.skipped_count,
    xpAwarded: attempt.xp_awarded,
    coinsAwarded: attempt.coins_awarded,
    gemsAwarded: attempt.gems_awarded,
    leveledUp: false,
    newLevel: profile?.level ?? 1,
    objectives,
    unlockedBadges,
    unlockedAchievements,
    learnedPoints: mission.learned_points,
    teacherNote: attempt.teacher_note,
    nextMissionId: nextMission,
  };
}

// ---------------------------------------------------------------------------
// Explicación del fallo
// ---------------------------------------------------------------------------

/**
 * El corazón del "te enseña": dada una respuesta fallida, explica el error
 * concreto. Se cachea en la fila para que releerla no cueste otra llamada.
 */
export async function explainAnswer(userId: string, answerId: string): Promise<Explanation> {
  const answer = await attempts.answer(answerId);
  if (!answer || answer.user_id !== userId) throw err.notFound('Respuesta');

  const activity = await content.activity(answer.activity_id);
  if (!activity) throw err.notFound('Actividad');

  if (answer.explanation_md) {
    return {
      answerId: answer.id,
      diagnosis: '',
      steps: [],
      solution: '',
      generalRule: '',
      encouragement: '',
      markdown: answer.explanation_md,
      cached: true,
    };
  }
  if (answer.is_correct) throw err.answerWasCorrect();

  // Con el proveedor de IA activo aquí se genera una explicación adaptada al
  // error concreto. Sin él, se usa la del autor, que siempre existe.
  const diagnosis = answer.skipped
    ? 'Saltaste esta actividad, así que vamos a verla con calma.'
    : 'Tu respuesta no coincide con lo que pedía la actividad.';

  const markdown = [
    `### Qué pasó\n\n${diagnosis}`,
    `### La explicación\n\n${activity.explanation}`,
    `### Para la próxima\n\n${activity.hints[activity.hints.length - 1] ?? 'Repasa el enunciado con calma.'}`,
    `> Nadie lo saca a la primera siempre. Vuelve a intentarlo.`,
  ].join('\n\n');

  await attempts.saveExplanation(answer.id, markdown);
  await personal.addFeed(userId, 'MISSION_COMPLETED', 'Revisaste una explicación', activity.title, 'lightbulb');

  return {
    answerId: answer.id,
    diagnosis,
    steps: [{ title: 'La explicación', detail: activity.explanation }],
    solution: activity.explanation,
    generalRule: activity.hints[activity.hints.length - 1] ?? '',
    encouragement: 'Nadie lo saca a la primera siempre. Vuelve a intentarlo.',
    markdown,
    cached: false,
  };
}
