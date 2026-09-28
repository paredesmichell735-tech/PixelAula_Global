import type {
  Achievement, Badge, Challenge, ClassRoom, CommunityPost, Friend, Leaderboard,
  LeaderboardEntry, LeaderboardPeriod, LeaderboardScope, Paginated, Streak,
  StreakClaimResult, TeamChallenge,
} from '@pixelaula/api';
import { err } from '../lib/errors.js';
import { toAchievement, toBadge, toChallenge, toClassRoom, toStreak, toTeamChallenge } from './mappers.js';
import { attempts, avatar, community, content, meta, personal, profiles, progress } from './repo.js';
import type { ProfileRow } from './rows.js';

const DAY_MS = 86_400_000;
const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);

// ---------------------------------------------------------------------------
// Racha
// ---------------------------------------------------------------------------

export async function getStreak(userId: string): Promise<Streak> {
  const [row, dates] = await Promise.all([
    meta.streak(userId),
    meta.activeDates(userId, new Date(Date.now() - 8 * DAY_MS).toISOString()),
  ]);
  return toStreak(row, dates);
}

/**
 * Registra actividad del día. Se llama sola al completar una misión; el botón
 * diario usa el mismo cálculo a través de claimStreak.
 */
export async function touchStreak(userId: string) {
  const row = await meta.streak(userId);
  const day = today();
  if (row?.last_activity_date === day) return row;

  let current = 1;
  let freezes = row?.freezes_available ?? 0;

  if (row?.last_activity_date) {
    const gap = daysBetween(row.last_activity_date, day);
    if (gap === 1) {
      current = row.current_days + 1;
    } else if (gap > 1 && freezes >= gap - 1) {
      // Los congeladores cubren los días perdidos y la racha sobrevive.
      freezes -= gap - 1;
      current = row.current_days + 1;
    }
  }

  const patch = {
    current_days: current,
    longest_days: Math.max(row?.longest_days ?? 0, current),
    last_activity_date: day,
    freezes_available: freezes,
  };
  await meta.upsertStreak(userId, patch);
  return { ...(row ?? { user_id: userId, last_claimed_date: null }), ...patch };
}

/** Recompensa diaria: 10 Pixeles por día de racha, tope 100, más una gema cada 7. */
export async function claimStreak(userId: string): Promise<StreakClaimResult> {
  const row = await meta.streak(userId);
  const day = today();
  if (row?.last_claimed_date === day) throw err.streakClaimed();

  const updated = await touchStreak(userId);
  const coins = Math.min(100, updated.current_days * 10);
  const gems = updated.current_days % 7 === 0 ? 1 : 0;

  const profile = await profiles.byId(userId);
  if (profile) {
    await profiles.update(userId, {
      pixels_coins: profile.pixels_coins + coins,
      gems: profile.gems + gems,
    });
  }

  await meta.addXpEvent(userId, 'streak_claim', 0, coins, gems);
  await meta.upsertStreak(userId, { ...updated, last_claimed_date: day });

  return { currentDays: updated.current_days, coinsAwarded: coins, gemsAwarded: gems, claimedDate: day };
}

// ---------------------------------------------------------------------------
// Logros e insignias
// ---------------------------------------------------------------------------

async function metricValue(userId: string, metric: string): Promise<number> {
  switch (metric) {
    case 'missions_completed':
      return progress.completedCount(userId);
    case 'correct_answers':
      return attempts.correctCount(userId);
    case 'perfect_missions': {
      const rows = await progress.byUser(userId);
      return rows.filter(r => r.stars === 3).length;
    }
    case 'streak_days':
      return (await meta.streak(userId))?.current_days ?? 0;
    case 'level':
      return (await profiles.byId(userId))?.level ?? 1;
    case 'subjects_started': {
      const [rows, missions] = await Promise.all([progress.byUser(userId), content.missions()]);
      const byMission = new Map(missions.map(m => [m.id, m.subject_id]));
      const touched = new Set(rows.filter(r => r.status !== 'LOCKED').map(r => byMission.get(r.mission_id)));
      touched.delete(undefined);
      return touched.size;
    }
    case 'avatar_styles':
      return avatar.countStyles(userId);
    default:
      return 0;
  }
}

/** Reevalúa los logros y devuelve los que se desbloquearon ahora. */
export async function evaluateAchievements(userId: string): Promise<Achievement[]> {
  const [all, owned] = await Promise.all([meta.achievements(), meta.userAchievements(userId)]);
  const byId = new Map(owned.map(o => [o.achievement_id, o]));
  const cache = new Map<string, number>();
  const unlockedNow: Achievement[] = [];

  let xp = 0;
  let coins = 0;

  for (const achievement of all) {
    if (byId.get(achievement.id)?.unlocked_at) continue;

    if (!cache.has(achievement.metric)) {
      cache.set(achievement.metric, await metricValue(userId, achievement.metric));
    }
    const value = cache.get(achievement.metric)!;
    const unlocked = value >= achievement.target_value;

    await meta.upsertAchievement(userId, achievement.id, value, unlocked);

    if (unlocked) {
      xp += achievement.reward_xp;
      coins += achievement.reward_coins;
      unlockedNow.push(toAchievement(achievement, { current_value: value, unlocked_at: new Date().toISOString() }));
      await personal.notify(userId, 'ACHIEVEMENT', '¡Logro desbloqueado!', achievement.title);
      await personal.addFeed(userId, 'ACHIEVEMENT', `Ganaste el logro "${achievement.title}"`, achievement.description, achievement.icon);
    }
  }

  if (xp || coins) {
    const profile = await profiles.byId(userId);
    if (profile) {
      await profiles.update(userId, {
        total_xp: profile.total_xp + xp,
        current_xp: profile.current_xp + xp,
        pixels_coins: profile.pixels_coins + coins,
      });
      await meta.addXpEvent(userId, 'achievement', xp, coins);
    }
  }

  return unlockedNow;
}

export async function listAchievements(userId: string): Promise<Achievement[]> {
  const [all, owned] = await Promise.all([meta.achievements(), meta.userAchievements(userId)]);
  const byId = new Map(owned.map(o => [o.achievement_id, o]));
  return all
    .filter(a => !a.is_secret || byId.get(a.id)?.unlocked_at)
    .map(a => toAchievement(a, byId.get(a.id)));
}

export async function listBadges(userId: string): Promise<Badge[]> {
  const [all, owned] = await Promise.all([meta.badges(), meta.userBadges(userId)]);
  const byId = new Map(owned.map(o => [o.badge_id, o.unlocked_at]));
  return all.map(b => toBadge(b, byId.get(b.id)));
}

export async function listChallenges(userId: string): Promise<Challenge[]> {
  const [all, mine] = await Promise.all([meta.challenges(), meta.userChallenges(userId)]);
  const byId = new Map(mine.map(c => [c.challenge_id, c]));
  return all.map(c => toChallenge(c, byId.get(c.id)));
}

export async function joinChallenge(userId: string, challengeId: string): Promise<Challenge> {
  const all = await meta.challenges();
  const challenge = all.find(c => c.id === challengeId);
  if (!challenge) throw err.notFound('Reto');

  await meta.joinChallenge(userId, challengeId);
  const value = await metricValue(userId, challenge.metric);
  return toChallenge(challenge, { current_value: value, completed_at: null });
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

async function entriesFrom(rows: ProfileRow[], meId: string, xpOverride?: Map<string, number>): Promise<LeaderboardEntry[]> {
  const avatars = await Promise.all(rows.map(r => avatar.config(r.id)));
  const streaks = await Promise.all(rows.map(r => meta.streak(r.id)));

  return rows
    .map((row, i) => ({
      rank: 0,
      userId: row.id,
      username: row.username,
      displayName: row.display_name,
      avatar: avatars[i] ?? ({} as LeaderboardEntry['avatar']),
      level: row.level,
      xp: xpOverride?.get(row.id) ?? row.total_xp,
      streakDays: streaks[i]?.current_days ?? 0,
      isCurrentUser: row.id === meId,
    }))
    .sort((a, b) => b.xp - a.xp)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

export async function getLeaderboard(
  userId: string,
  scope: LeaderboardScope,
  period: LeaderboardPeriod,
  limit: number,
  classId?: string,
): Promise<Leaderboard> {
  let userIds: string[] | undefined;

  if (scope === 'friends') {
    const rows = await community.friendships(userId);
    userIds = [userId, ...rows.filter(r => r.status === 'ACCEPTED').map(r => (r.user_id === userId ? r.friend_id : r.user_id))];
  } else if (scope === 'class') {
    const classes = classId ? [classId] : await community.myClasses(userId);
    const members = await Promise.all(classes.map(c => community.classMembers(c)));
    userIds = [...new Set(members.flat())];
    if (!userIds.length) userIds = [userId];
  }

  let entries: LeaderboardEntry[];

  if (period === 'all') {
    entries = await entriesFrom(await profiles.topByXp(limit, userIds), userId);
  } else {
    const since = new Date(Date.now() - (period === 'week' ? 7 : 30) * DAY_MS).toISOString();
    const events = await meta.xpSince(since, userIds);

    const totals = new Map<string, number>();
    for (const e of events) totals.set(e.user_id, (totals.get(e.user_id) ?? 0) + e.xp);

    const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
    const rows = await profiles.byIds(top.map(([id]) => id));
    entries = await entriesFrom(rows, userId, totals);
  }

  return { scope, period, entries, me: entries.find(e => e.isCurrentUser) ?? null };
}

// ---------------------------------------------------------------------------
// Amigos
// ---------------------------------------------------------------------------

export async function listFriends(userId: string): Promise<Friend[]> {
  const rows = await community.friendships(userId);
  if (!rows.length) return [];

  const otherIds = rows.map(r => (r.user_id === userId ? r.friend_id : r.user_id));
  const [people, avatars] = await Promise.all([
    profiles.byIds(otherIds),
    Promise.all(otherIds.map(id => avatar.config(id))),
  ]);
  const avatarById = new Map(otherIds.map((id, i) => [id, avatars[i]] as const));

  return rows
    .map((row): Friend | null => {
      const otherId = row.user_id === userId ? row.friend_id : row.user_id;
      const person = people.find(p => p.id === otherId);
      if (!person) return null;

      const status: Friend['status'] =
        row.status === 'ACCEPTED' ? 'ACCEPTED' : row.user_id === userId ? 'PENDING_OUT' : 'PENDING_IN';

      return {
        id: row.id,
        userId: person.id,
        username: person.username,
        displayName: person.display_name,
        avatar: avatarById.get(otherId) ?? ({} as Friend['avatar']),
        level: person.level,
        xp: person.total_xp,
        streakDays: 0,
        presence: 'OFFLINE',
        status,
      };
    })
    .filter((f): f is Friend => f !== null);
}

export async function sendFriendRequest(userId: string, username: string): Promise<Friend> {
  const target = await profiles.byUsername(username);
  if (!target) throw err.notFound('Usuario');
  if (target.id === userId) throw err.conflict('CANNOT_FRIEND_SELF', 'No puedes agregarte a ti mismo.');

  const existing = (await community.friendships(userId)).find(
    r => r.friend_id === target.id || r.user_id === target.id,
  );
  if (existing) {
    throw err.conflict(
      existing.status === 'ACCEPTED' ? 'ALREADY_FRIENDS' : 'FRIEND_REQUEST_EXISTS',
      existing.status === 'ACCEPTED' ? 'Ya son amigos.' : 'Ya hay una solicitud pendiente.',
    );
  }

  const row = await community.createFriendship(userId, target.id);
  await personal.notify(target.id, 'COMMUNITY', 'Nueva solicitud de amistad', `${username} quiere ser tu amigo.`);

  return {
    id: row.id,
    userId: target.id,
    username: target.username,
    displayName: target.display_name,
    avatar: (await avatar.config(target.id)) ?? ({} as Friend['avatar']),
    level: target.level,
    xp: target.total_xp,
    streakDays: 0,
    presence: 'OFFLINE',
    status: 'PENDING_OUT',
  };
}

export async function respondFriendRequest(userId: string, id: string, accept: boolean) {
  const row = await community.friendship(id);
  // Solo quien recibe la solicitud puede aceptarla.
  if (!row || row.friend_id !== userId) throw err.notFound('Solicitud');

  if (!accept) {
    await community.deleteFriendship(id);
    return { rejected: id };
  }

  await community.updateFriendship(id, 'ACCEPTED');
  return (await listFriends(userId)).find(f => f.id === id)!;
}

export async function removeFriend(userId: string, id: string) {
  const row = await community.friendship(id);
  if (!row || (row.user_id !== userId && row.friend_id !== userId)) throw err.notFound('Amistad');
  await community.deleteFriendship(id);
  return { removed: id };
}

// ---------------------------------------------------------------------------
// Clases
// ---------------------------------------------------------------------------

export async function listClasses(userId: string): Promise<ClassRoom[]> {
  const [classes, members, mine] = await Promise.all([
    community.classes(),
    community.allClassMembers(),
    community.myClasses(userId),
  ]);

  const memberIds = [...new Set(members.map(m => m.user_id))];
  const people = await profiles.byIds(memberIds);
  const xpById = new Map(people.map(p => [p.id, p.total_xp]));

  const stats = classes.map(c => {
    const ids = members.filter(m => m.class_id === c.id).map(m => m.user_id);
    return {
      row: c,
      memberCount: ids.length,
      totalXp: ids.reduce((sum, id) => sum + (xpById.get(id) ?? 0), 0),
      joined: mine.includes(c.id),
    };
  });

  return stats
    .sort((a, b) => b.totalXp - a.totalXp)
    .map((s, i) => toClassRoom(s.row, { ...s, rank: i + 1 }));
}

export async function getClass(userId: string, classId: string) {
  const row = await community.classById(classId);
  if (!row) throw err.notFound('Clase');

  const memberIds = await community.classMembers(classId);
  const people = await profiles.byIds(memberIds);
  const members = await entriesFrom(people, userId);
  const mine = await community.myClasses(userId);

  return {
    ...toClassRoom(row, {
      memberCount: memberIds.length,
      totalXp: people.reduce((s, p) => s + p.total_xp, 0),
      rank: null,
      joined: mine.includes(classId),
    }),
    members,
  };
}

export async function joinClass(userId: string, code: string): Promise<ClassRoom> {
  const row = await community.classByCode(code);
  if (!row) throw err.conflict('CLASS_CODE_INVALID', 'Ese código de clase no existe.');

  const mine = await community.myClasses(userId);
  if (mine.includes(row.id)) throw err.conflict('ALREADY_IN_CLASS', 'Ya estás en esa clase.');

  await community.joinClass(row.id, userId);
  const memberIds = await community.classMembers(row.id);
  const people = await profiles.byIds(memberIds);

  return toClassRoom(row, {
    memberCount: memberIds.length,
    totalXp: people.reduce((s, p) => s + p.total_xp, 0),
    rank: null,
    joined: true,
  });
}

export async function leaveClass(userId: string, classId: string) {
  await community.leaveClass(classId, userId);
  return { left: classId };
}

// ---------------------------------------------------------------------------
// Feed de la comunidad
// ---------------------------------------------------------------------------

async function toPosts(rows: Awaited<ReturnType<typeof community.posts>>, userId: string): Promise<CommunityPost[]> {
  if (!rows.length) return [];

  const authorIds = [...new Set(rows.map(r => r.user_id))];
  const [people, avatars, likes] = await Promise.all([
    profiles.byIds(authorIds),
    Promise.all(authorIds.map(id => avatar.config(id))),
    community.likes(rows.map(r => r.id)),
  ]);
  const avatarById = new Map(authorIds.map((id, i) => [id, avatars[i]] as const));

  return rows.map(row => {
    const author = people.find(p => p.id === row.user_id);
    const postLikes = likes.filter(l => l.post_id === row.id);
    return {
      id: row.id,
      author: {
        userId: row.user_id,
        displayName: author?.display_name ?? 'Estudiante',
        avatar: avatarById.get(row.user_id) ?? ({} as CommunityPost['author']['avatar']),
        level: author?.level ?? 1,
      },
      message: row.message,
      createdAt: row.created_at,
      likeCount: postLikes.length,
      commentCount: 0,
      likedByMe: postLikes.some(l => l.user_id === userId),
    };
  });
}

export async function getCommunityFeed(
  userId: string,
  limit: number,
  cursor?: string,
): Promise<Paginated<CommunityPost>> {
  const rows = await community.posts(limit + 1, cursor);
  const page = rows.slice(0, limit);
  return {
    items: await toPosts(page, userId),
    total: page.length,
    nextCursor: rows.length > limit ? (page[page.length - 1]?.created_at ?? null) : null,
  };
}

export async function createPost(userId: string, message: string): Promise<CommunityPost> {
  const row = await community.createPost(userId, message);
  return (await toPosts([row], userId))[0]!;
}

export async function likePost(userId: string, postId: string): Promise<CommunityPost> {
  const row = await community.post(postId);
  if (!row) throw err.notFound('Publicación');
  await community.toggleLike(postId, userId);
  return (await toPosts([row], userId))[0]!;
}

export async function listTeamChallenges(): Promise<TeamChallenge[]> {
  return (await community.teamChallenges()).map(toTeamChallenge);
}
