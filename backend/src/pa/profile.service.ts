import type {
  ActivityFeedEntry, AssetManifest, CalendarEvent, Certification, DashboardData,
  LearningGoal, NotificationItem, Paginated, SearchResults, User, UserProgress,
} from '@pixelaula/api';
import { env } from '../config/env.js';
import { err } from '../lib/errors.js';
import { clearProfileCache } from '../middleware/auth.js';
import {
  toCalendarEvent, toCertification, toFeedEntry, toGoal, toMissionSummary,
  toNotification, toUser,
} from './mappers.js';
import { getConfig } from './avatar.service.js';
import { listMissions, listSubjects } from './learning.service.js';
import { attempts, content, meta, personal, profiles, progress } from './repo.js';
import { getStreak, listAchievements, listBadges } from './social.service.js';

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------

export async function getMe(userId: string, email?: string): Promise<User> {
  const row = await profiles.byId(userId);
  if (!row) throw err.profileRequired();

  const [avatarConfig, streak] = await Promise.all([getConfig(userId), meta.streak(userId)]);
  const user = toUser(row, avatarConfig, streak?.current_days ?? 0);
  return { ...user, email: email ?? '' };
}

/**
 * Completa el alta cuando el trigger no pudo (por ejemplo, si el usuario se
 * registró antes de que existiera). Es idempotente.
 */
export async function registerProfile(
  userId: string,
  body: { username: string; displayName: string },
  email?: string,
): Promise<User> {
  const existing = await profiles.byId(userId);
  if (existing) return getMe(userId, email);

  if (await profiles.usernameTaken(body.username, userId)) throw err.usernameTaken();

  await profiles.create({ id: userId, username: body.username, display_name: body.displayName });
  clearProfileCache(userId);
  await meta.upsertStreak(userId, { current_days: 0, longest_days: 0 });
  await personal.notify(userId, 'REWARD', '¡Bienvenido a PixelAula!', 'Tu aventura empieza aquí.');

  return getMe(userId, email);
}

export async function updateMe(
  userId: string,
  body: { username?: string; displayName?: string; title?: string },
  email?: string,
): Promise<User> {
  if (body.username && (await profiles.usernameTaken(body.username, userId))) throw err.usernameTaken();

  const patch: Record<string, unknown> = {};
  if (body.username) patch.username = body.username;
  if (body.displayName) patch.display_name = body.displayName;
  if (body.title) patch.title = body.title;

  await profiles.update(userId, patch);
  return getMe(userId, email);
}

// ---------------------------------------------------------------------------
// Progreso
// ---------------------------------------------------------------------------

export async function getProgress(userId: string): Promise<UserProgress> {
  const [profile, rows, missions, achievements, streak, xpByDay] = await Promise.all([
    profiles.byId(userId),
    progress.byUser(userId),
    content.missions(),
    meta.userAchievements(userId),
    meta.streak(userId),
    meta.xpByDay(userId, new Date(Date.now() - 7 * 86_400_000).toISOString()),
  ]);
  if (!profile) throw err.profileRequired();

  const completed = rows.filter(r => r.status === 'COMPLETED');
  const byMission = new Map(missions.map(m => [m.id, m.subject_id]));

  // Materias terminadas: todas sus misiones completadas.
  const bySubject = new Map<string, { total: number; done: number }>();
  for (const mission of missions) {
    const entry = bySubject.get(mission.subject_id) ?? { total: 0, done: 0 };
    entry.total++;
    bySubject.set(mission.subject_id, entry);
  }
  for (const row of completed) {
    const subjectId = byMission.get(row.mission_id);
    if (!subjectId) continue;
    const entry = bySubject.get(subjectId)!;
    entry.done++;
  }

  // XP por día de esta semana, de lunes a domingo.
  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  const weekly = days.map((day, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const key = date.toISOString().slice(0, 10);
    return { day, xp: xpByDay.get(key) ?? 0 };
  });

  return {
    totalXp: profile.total_xp,
    level: profile.level,
    streakDays: streak?.current_days ?? 0,
    completedMissionsCount: completed.length,
    completedSubjectsCount: [...bySubject.values()].filter(s => s.total > 0 && s.done >= s.total).length,
    unlockedAchievementsCount: achievements.filter(a => a.unlocked_at).length,
    weeklyActivity: weekly,
  };
}

export async function getActivityFeed(
  userId: string,
  limit: number,
  cursor?: string,
): Promise<Paginated<ActivityFeedEntry>> {
  const rows = await personal.feed(userId, limit + 1, cursor);
  const page = rows.slice(0, limit);
  return {
    items: page.map(toFeedEntry),
    total: page.length,
    nextCursor: rows.length > limit ? (page[page.length - 1]?.created_at ?? null) : null,
  };
}

/** Todo el panel de inicio en una llamada: la app móvil lo pide una sola vez. */
export async function getDashboard(userId: string, email?: string): Promise<DashboardData> {
  const [user, userProgress, subjects, feed, calendar, badges, streak, active] =
    await Promise.all([
      getMe(userId, email),
      getProgress(userId),
      listSubjects(userId),
      personal.feed(userId, 6),
      personal.calendar(),
      listBadges(userId),
      getStreak(userId),
      // Pasa por listMissions y no por las filas guardadas: un usuario nuevo
      // no tiene progreso en la tabla, pero la primera misión de cada materia
      // ya está disponible. Si leyéramos las filas, el panel saldría vacío.
      listMissions(userId, { status: 'ACTIVE' }),
    ]);

  const activeMissions = active.slice(0, 3);

  return {
    user,
    progress: userProgress,
    subjects,
    activeMissions,
    recentActivity: feed.map(toFeedEntry),
    upcomingEvent: calendar.length ? toCalendarEvent(calendar[0]!) : null,
    badges: badges.filter(b => b.unlocked).slice(0, 6),
    streak,
  };
}

// ---------------------------------------------------------------------------
// Avisos, objetivos, certificados, calendario
// ---------------------------------------------------------------------------

export async function listNotifications(userId: string): Promise<NotificationItem[]> {
  return (await personal.notifications(userId)).map(toNotification);
}

export async function readNotification(userId: string, id: string): Promise<NotificationItem> {
  return toNotification(await personal.readNotification(userId, id));
}

export async function readAllNotifications(userId: string) {
  return { updated: await personal.readAllNotifications(userId) };
}

export async function listGoals(userId: string): Promise<LearningGoal[]> {
  return (await personal.goals(userId)).map(toGoal);
}

export async function createGoal(
  userId: string,
  body: { title: string; subjectId?: string; targetValue: number; dueDate?: string },
): Promise<LearningGoal> {
  const row = await personal.createGoal({
    user_id: userId,
    title: body.title,
    subject_id: body.subjectId ?? null,
    target_value: body.targetValue,
    due_date: body.dueDate ?? null,
  });
  return toGoal(row);
}

export async function updateGoal(
  userId: string,
  id: string,
  body: Record<string, unknown>,
): Promise<LearningGoal> {
  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.currentValue !== undefined) patch.current_value = body.currentValue;
  if (body.targetValue !== undefined) patch.target_value = body.targetValue;
  if (body.dueDate !== undefined) patch.due_date = body.dueDate;
  if (body.completed !== undefined) patch.completed = body.completed;

  return toGoal(await personal.updateGoal(userId, id, patch));
}

export async function deleteGoal(userId: string, id: string) {
  await personal.deleteGoal(userId, id);
  return { deleted: id };
}

export async function listCertifications(userId: string): Promise<Certification[]> {
  return (await personal.certifications(userId)).map(toCertification);
}

export async function listCalendar(): Promise<CalendarEvent[]> {
  return (await personal.calendar()).map(toCalendarEvent);
}

// ---------------------------------------------------------------------------
// Assets y búsqueda
// ---------------------------------------------------------------------------

export async function getAssetManifest(): Promise<AssetManifest> {
  const row = await personal.assetManifest();
  const assets = row?.assets ?? {};

  const entries = Object.entries(assets).map(([key, meta]) => [
    key,
    {
      ...meta,
      url: env.ASSETS_PUBLIC
        ? `${env.SUPABASE_URL}/storage/v1/object/public/${env.ASSETS_BUCKET}/${meta.path}`
        : null,
    },
  ]);

  return {
    version: row?.version ?? 1,
    updatedAt: row?.updated_at ?? null,
    bucket: env.ASSETS_BUCKET,
    isPublic: env.ASSETS_PUBLIC,
    expiresIn: env.ASSETS_PUBLIC ? null : env.ASSETS_SIGNED_URL_TTL,
    assets: Object.fromEntries(entries),
  };
}

export async function search(userId: string, term: string, limit: number): Promise<SearchResults> {
  const [subjects, missionRows, achievements] = await Promise.all([
    listSubjects(userId),
    content.searchMissions(term, limit),
    listAchievements(userId),
  ]);

  const lower = term.toLowerCase();
  const subjectNames = new Map(subjects.map(s => [s.id, s.name]));
  const rows = await progress.byUser(userId);
  const progressByMission = new Map(rows.map(r => [r.mission_id, r]));

  return {
    subjects: subjects.filter(s => s.name.toLowerCase().includes(lower)).slice(0, limit),
    missions: missionRows.map(m =>
      toMissionSummary(m, subjectNames.get(m.subject_id) ?? '', progressByMission.get(m.id), 0),
    ),
    achievements: achievements.filter(a => a.title.toLowerCase().includes(lower)).slice(0, limit),
  };
}
