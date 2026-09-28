import type { LearningMap, Mission, MissionSummary, Subject } from '@pixelaula/api';
import { err } from '../lib/errors.js';
import { toLevelNode, toMission, toMissionSummary, toSubject } from './mappers.js';
import { content, profiles, progress } from './repo.js';
import type { MissionProgressRow, MissionRow, SubjectRow } from './rows.js';

/**
 * Materias, mapa y misiones. Aquí vive la regla de desbloqueo: una misión se
 * abre al completar la anterior de su materia, y una materia necesita que la
 * cuenta tenga el nivel mínimo.
 */

interface Context {
  subjects: SubjectRow[];
  missions: MissionRow[];
  progressByMission: Map<string, MissionProgressRow>;
  accountLevel: number;
}

async function loadContext(userId: string): Promise<Context> {
  const [subjects, missions, rows, profile] = await Promise.all([
    content.subjects(),
    content.missions(),
    progress.byUser(userId),
    profiles.byId(userId),
  ]);

  return {
    subjects: [...subjects].sort((a, b) => a.order_index - b.order_index),
    missions,
    progressByMission: new Map(rows.map(r => [r.mission_id, r])),
    accountLevel: profile?.level ?? 1,
  };
}

const missionsOf = (ctx: Context, subjectId: string) =>
  ctx.missions.filter(m => m.subject_id === subjectId).sort((a, b) => a.level_number - b.level_number);

/**
 * Estado efectivo de una misión. La primera de cada materia desbloqueada está
 * disponible; el resto depende de haber completado la anterior.
 */
function statusOf(ctx: Context, mission: MissionRow, subjectUnlocked: boolean): 'LOCKED' | 'ACTIVE' | 'COMPLETED' {
  const stored = ctx.progressByMission.get(mission.id);
  if (stored?.status === 'COMPLETED') return 'COMPLETED';
  if (!subjectUnlocked) return 'LOCKED';

  const siblings = missionsOf(ctx, mission.subject_id);
  const index = siblings.findIndex(m => m.id === mission.id);
  if (index <= 0) return 'ACTIVE';

  const previous = siblings[index - 1]!;
  const previousDone = ctx.progressByMission.get(previous.id)?.status === 'COMPLETED';
  return previousDone ? 'ACTIVE' : 'LOCKED';
}

function subjectStats(ctx: Context, subject: SubjectRow) {
  const missions = missionsOf(ctx, subject.id);
  const completed = missions.filter(m => ctx.progressByMission.get(m.id)?.status === 'COMPLETED');
  const xp = completed.reduce((sum, m) => sum + m.xp_reward, 0);
  return {
    total: missions.length,
    completed: completed.length,
    xp,
    unlocked: ctx.accountLevel >= subject.min_level,
  };
}

export async function listSubjects(userId: string): Promise<Subject[]> {
  const ctx = await loadContext(userId);
  return ctx.subjects.map(s => toSubject(s, subjectStats(ctx, s)));
}

export async function getSubject(userId: string, subjectId: string): Promise<Subject> {
  const ctx = await loadContext(userId);
  const row = ctx.subjects.find(s => s.id === subjectId);
  if (!row) throw err.notFound('Materia');
  return toSubject(row, subjectStats(ctx, row));
}

export async function listMissions(
  userId: string,
  filter: { subjectId?: string; status?: 'LOCKED' | 'ACTIVE' | 'COMPLETED'; limit?: number } = {},
): Promise<MissionSummary[]> {
  const ctx = await loadContext(userId);
  const objectiveCounts = new Map<string, number>();

  const rows = ctx.missions
    .filter(m => !filter.subjectId || m.subject_id === filter.subjectId)
    .sort((a, b) => a.level_number - b.level_number);

  const summaries: MissionSummary[] = [];
  for (const mission of rows) {
    const subject = ctx.subjects.find(s => s.id === mission.subject_id);
    if (!subject) continue;

    const unlocked = ctx.accountLevel >= subject.min_level;
    const status = statusOf(ctx, mission, unlocked);
    if (filter.status && status !== filter.status) continue;

    if (!objectiveCounts.has(mission.id)) {
      objectiveCounts.set(mission.id, (await content.objectives(mission.id)).length);
    }

    const stored = ctx.progressByMission.get(mission.id);
    summaries.push(
      toMissionSummary(
        mission,
        subject.name,
        stored ? { ...stored, status } : ({ status } as MissionProgressRow),
        objectiveCounts.get(mission.id) ?? 0,
      ),
    );
  }

  return filter.limit ? summaries.slice(0, filter.limit) : summaries;
}

export async function getMission(userId: string, missionId: string): Promise<Mission> {
  const ctx = await loadContext(userId);
  const mission = ctx.missions.find(m => m.id === missionId);
  if (!mission) throw err.notFound('Misión');

  const subject = ctx.subjects.find(s => s.id === mission.subject_id);
  if (!subject) throw err.notFound('Materia');

  const unlocked = ctx.accountLevel >= subject.min_level;
  const status = statusOf(ctx, mission, unlocked);
  const objectives = await content.objectives(missionId);
  const stored = ctx.progressByMission.get(missionId);

  return toMission(
    mission,
    subject.name,
    stored ? { ...stored, status } : ({ status } as MissionProgressRow),
    objectives,
    // Fuera de un intento, los objetivos se muestran cumplidos si la misión lo está.
    status === 'COMPLETED' ? new Set(objectives.map(o => o.id)) : new Set(),
  );
}

/** Comprueba que el usuario puede entrar. Lanza si no. */
export async function assertMissionUnlocked(userId: string, missionId: string) {
  const ctx = await loadContext(userId);
  const mission = ctx.missions.find(m => m.id === missionId);
  if (!mission) throw err.notFound('Misión');

  const subject = ctx.subjects.find(s => s.id === mission.subject_id);
  if (!subject) throw err.notFound('Materia');

  if (ctx.accountLevel < subject.min_level) throw err.levelTooLow(subject.min_level);
  if (statusOf(ctx, mission, true) === 'LOCKED') throw err.missionLocked();

  return { mission, subject };
}

/**
 * GET /map — el árbol completo con el estado del usuario en una sola llamada.
 * Es lo que pinta la pantalla de Niveles sin pedir nada más.
 */
export async function getLearningMap(userId: string): Promise<LearningMap> {
  const ctx = await loadContext(userId);

  let nextMission: MissionSummary | null = null;
  let totalMissions = 0;
  let totalCompleted = 0;

  const subjects = ctx.subjects.map(subject => {
    const stats = subjectStats(ctx, subject);
    totalMissions += stats.total;
    totalCompleted += stats.completed;

    const missions = missionsOf(ctx, subject.id);
    // La misión actual es la primera disponible sin completar.
    const currentId = missions.find(m => statusOf(ctx, m, stats.unlocked) === 'ACTIVE')?.id;

    if (!nextMission && currentId) {
      const mission = missions.find(m => m.id === currentId)!;
      nextMission = toMissionSummary(
        mission,
        subject.name,
        { status: 'ACTIVE' } as MissionProgressRow,
        0,
      );
    }

    return {
      subject: toSubject(subject, stats),
      nodes: missions.map(m => toLevelNode(m, ctx.progressByMission.get(m.id), m.id === currentId)),
      rewards: [
        { icon: 'star', label: `${missions.reduce((s, m) => s + m.xp_reward, 0)} XP` },
        { icon: 'gem', label: `${missions.reduce((s, m) => s + m.coins_reward, 0)} Pixeles` },
        { icon: 'badge', label: 'Insignias' },
      ],
    };
  });

  return {
    subjects,
    globalProgressPercent: totalMissions ? Math.round((totalCompleted / totalMissions) * 100) : 0,
    nextMission,
  };
}
