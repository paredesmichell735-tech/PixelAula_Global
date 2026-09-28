import type {
  Achievement, Activity, ActivityFeedEntry, AvatarConfig, AvatarOption, Badge, CalendarEvent,
  Certification, Challenge, ClassRoom, LearningGoal, LevelNodeData, LevelNodeStatus,
  Mission, MissionAttempt, MissionObjective, MissionSummary, NotificationItem, Reward,
  SavedAvatarStyle, ShopItem, Streak, Subject, TeamChallenge, User,
} from '@pixelaula/api';
import type {
  AchievementRow, ActivityRow, AttemptRow, AvatarOptionRow, AvatarStyleRow, BadgeRow,
  CalendarRow, CertificationRow, ChallengeRow, ClassRow, FeedRow, GoalRow, MissionRow,
  MissionProgressRow, NotificationRow, ObjectiveRow, ProfileRow, ShopItemRow, StreakRow,
  SubjectRow, TeamChallengeRow,
} from './rows.js';

/** XP acumulada que exige cada nivel. Debe coincidir con pa_xp_for_level. */
export const XP_PER_LEVEL = 500;
export const xpForLevel = (level: number) => Math.max(0, (level - 1) * XP_PER_LEVEL);

const pct = (value: number, total: number) =>
  total <= 0 ? 0 : Math.min(100, Math.round((value / total) * 100));

export function toUser(row: ProfileRow, avatar: AvatarConfig, streakDays: number): User {
  return {
    id: row.id,
    email: '',
    username: row.username,
    displayName: row.display_name,
    level: row.level,
    currentXp: row.current_xp,
    requiredXp: XP_PER_LEVEL,
    streakDays,
    pixelsCoins: row.pixels_coins,
    gems: row.gems,
    avatar,
    title: row.title,
    createdAt: row.created_at,
  };
}

export function toSubject(
  row: SubjectRow,
  stats: { total: number; completed: number; xp: number; unlocked: boolean },
): Subject {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    icon: row.icon,
    color: row.color,
    level: Math.max(1, Math.floor(stats.xp / 100) + 1),
    totalMissions: stats.total,
    completedMissions: stats.completed,
    totalLessons: row.total_lessons,
    totalProjects: row.total_projects,
    difficulty: row.difficulty,
    progressPercent: pct(stats.completed, stats.total),
    currentXp: stats.xp,
    requiredXp: row.required_xp,
    status: !stats.unlocked
      ? 'LOCKED'
      : stats.total > 0 && stats.completed >= stats.total
        ? 'COMPLETED'
        : 'IN_PROGRESS',
  };
}

export function toMissionSummary(
  row: MissionRow,
  subjectName: string,
  progress: MissionProgressRow | undefined,
  objectivesTotal: number,
): MissionSummary {
  return {
    id: row.id,
    subjectId: row.subject_id,
    subjectName,
    title: row.title,
    description: row.description,
    levelNumber: row.level_number,
    difficulty: row.difficulty,
    estimatedMinutes: row.estimated_minutes,
    xpReward: row.xp_reward,
    coinsReward: row.coins_reward,
    status: progress?.status ?? 'LOCKED',
    stars: progress?.stars ?? 0,
    progress: {
      completed: progress?.status === 'COMPLETED' ? objectivesTotal : 0,
      total: objectivesTotal,
    },
  };
}

export function toMission(
  row: MissionRow,
  subjectName: string,
  progress: MissionProgressRow | undefined,
  objectives: ObjectiveRow[],
  completedObjectiveIds: Set<string>,
): Mission {
  const rewards: Reward[] = [
    { type: 'XP', amount: row.xp_reward, title: `+${row.xp_reward} XP`, icon: 'star' },
    { type: 'COINS', amount: row.coins_reward, title: `+${row.coins_reward} Pixeles`, icon: 'gem' },
  ];
  if (row.gems_reward > 0) {
    rewards.push({ type: 'GEMS', amount: row.gems_reward, title: `+${row.gems_reward} gemas`, icon: 'diamond' });
  }

  return {
    ...toMissionSummary(row, subjectName, progress, objectives.length),
    objectives: objectives.map(o => toObjective(o, completedObjectiveIds.has(o.id))),
    rewards,
    activityCount: row.activity_count,
    briefing: row.briefing_md,
  };
}

export function toObjective(row: ObjectiveRow, completed: boolean): MissionObjective {
  return { id: row.id, description: row.description, completed };
}

export function toLevelNode(
  row: MissionRow,
  progress: MissionProgressRow | undefined,
  isCurrent: boolean,
): LevelNodeData {
  let status: LevelNodeStatus = 'LOCKED';
  if (progress?.status === 'COMPLETED') status = progress.stars >= 3 ? 'PERFECT' : 'COMPLETED';
  else if (isCurrent) status = 'CURRENT';
  else if (progress?.status === 'ACTIVE') status = 'AVAILABLE';

  return {
    id: row.id,
    missionId: row.id,
    levelNumber: row.level_number,
    title: row.title,
    status,
    stars: progress?.stars ?? 0,
    rewardXp: row.xp_reward,
    rewardCoins: row.coins_reward,
    positionX: Number(row.position_x),
    positionY: Number(row.position_y),
  };
}

/**
 * REGLA ANTITRAMPA: esta es la única forma en que una actividad llega al
 * cliente. `solution` y `explanation` se quedan fuera a propósito.
 */
export function toPublicActivity(
  row: ActivityRow,
  index: number,
  total: number,
  hintsUsed: number,
): Activity {
  const payload = row.payload as Record<string, unknown>;

  const base: Activity = {
    id: row.id,
    missionId: row.mission_id,
    index,
    total,
    type: row.type,
    title: row.title,
    question: row.question,
    hintsAvailable: Math.max(0, row.hints.length - hintsUsed),
    hintCostGems: row.hint_cost_gems,
  };

  switch (row.type) {
    case 'MULTIPLE_CHOICE':
    case 'IMAGE_SELECTION':
      // Se reconstruyen las opciones para no arrastrar un `isCorrect` colado.
      base.options = ((payload.options as Array<{ id: string; label: string }>) ?? []).map(o => ({
        id: o.id,
        label: o.label,
      }));
      break;
    case 'ORDERING':
      base.orderingItems = (payload.items as string[]) ?? [];
      break;
    case 'MATCHING':
      base.matchingPairs = (payload.pairs as Array<{ concept: string; definition: string }>) ?? [];
      break;
    case 'SQL_CHALLENGE':
      base.sqlData = {
        queryTemplate: String(payload.queryTemplate ?? ''),
        blankSlot: String(payload.blankSlot ?? '___'),
        options: (payload.options as string[]) ?? [],
      };
      break;
    case 'NETWORK_SIMULATION':
      base.networkData = {
        devices: (payload.devices as never) ?? [],
        requiredConnections: (payload.requiredConnections as never) ?? [],
      };
      break;
    case 'CIRCUIT_SIMULATION':
      base.circuitData = {
        components: (payload.components as never) ?? [],
        requiredCircuitState: 'CLOSED',
      };
      break;
    case 'DRAG_DROP':
      base.options = ((payload.options as Array<{ id: string; label: string }>) ?? []).map(o => ({
        id: o.id,
        label: o.label,
      }));
      break;
    case 'TRUE_FALSE':
      break;
  }

  return base;
}

export function toAttempt(row: AttemptRow, objectives: MissionObjective[]): MissionAttempt {
  return {
    id: row.id,
    missionId: row.mission_id,
    status: row.status,
    activityIndex: row.activity_index,
    activityTotal: row.activity_order.length,
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
    skippedCount: row.skipped_count,
    hintsUsed: row.hints_used,
    score: row.score,
    stars: row.stars,
    objectives,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

export function toAchievement(
  row: AchievementRow,
  state: { current_value: number; unlocked_at: string | null } | undefined,
): Achievement {
  const current = state?.current_value ?? 0;
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    description: row.description,
    icon: row.icon,
    progressPercent: pct(current, row.target_value),
    currentValue: current,
    targetValue: row.target_value,
    unlocked: Boolean(state?.unlocked_at),
    unlockedAt: state?.unlocked_at ?? undefined,
    rewardXp: row.reward_xp,
    rewardCoins: row.reward_coins,
  };
}

export function toBadge(row: BadgeRow, unlockedAt: string | null | undefined): Badge {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    icon: row.icon,
    rarity: row.rarity,
    unlocked: Boolean(unlockedAt),
    unlockedAt: unlockedAt ?? undefined,
  };
}

export function toChallenge(
  row: ChallengeRow,
  state: { current_value: number; completed_at: string | null } | undefined,
): Challenge {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    kind: row.kind,
    currentValue: state?.current_value ?? 0,
    targetValue: row.target_value,
    rewardXp: row.reward_xp,
    rewardCoins: row.reward_coins,
    completed: Boolean(state?.completed_at),
    joined: state !== undefined,
    endsAt: row.ends_at,
  };
}

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function toStreak(row: StreakRow | null, activeDates: Set<string>): Streak {
  const today = new Date();
  const monday = new Date(today);
  // getDay(): 0 = domingo. Retrocedemos hasta el lunes de esta semana.
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  const week = DAYS.map((day, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return { day, active: activeDates.has(date.toISOString().slice(0, 10)) };
  });

  const current = row?.current_days ?? 0;
  const milestones = [3, 7, 14, 30, 60];
  const next = milestones.find(m => m > current);

  return {
    currentDays: current,
    longestDays: row?.longest_days ?? 0,
    lastActivityDate: row?.last_activity_date ?? null,
    claimedToday: row?.last_claimed_date === new Date().toISOString().slice(0, 10),
    freezesAvailable: row?.freezes_available ?? 0,
    week,
    nextMilestone: next ? { days: next, rewardXp: next * 20, rewardCoins: next * 10 } : null,
  };
}

/**
 * Una pieza es tuya si la compraste, si viene por defecto, o si es gratis y no
 * exige desbloqueo. Sin esa última regla quedaban opciones a 0 Pixeles que no
 * se podían equipar, como las expresiones o los "Ninguno" de cada categoría.
 */
export function isOptionOwned(row: AvatarOptionRow, purchased: boolean): boolean {
  return purchased || row.is_default || (row.price_coins === 0 && !row.unlock_condition);
}

export function toAvatarOption(row: AvatarOptionRow, purchased: boolean): AvatarOption {
  return {
    id: row.slug,
    category: row.category,
    name: row.name,
    rarity: row.rarity,
    asset: row.asset,
    priceCoins: row.price_coins,
    owned: isOptionOwned(row, purchased),
    unlockCondition: row.unlock_condition,
  };
}

export function toAvatarStyle(row: AvatarStyleRow, rarity: SavedAvatarStyle['rarity']): SavedAvatarStyle {
  return {
    id: row.id,
    name: row.name,
    config: row.config,
    rarity,
    isEquipped: row.is_equipped,
    createdAt: row.created_at,
  };
}

export function toShopItem(row: ShopItemRow, owned: boolean): ShopItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    rarity: row.rarity,
    priceCoins: row.price_coins,
    priceGems: row.price_gems,
    icon: row.icon,
    owned,
    minLevel: row.min_level,
  };
}

export function toNotification(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    timestamp: row.created_at,
    read: row.read,
  };
}

export function toFeedEntry(row: FeedRow): ActivityFeedEntry {
  return {
    id: row.id,
    type: row.type as ActivityFeedEntry['type'],
    title: row.title,
    subtitle: row.subtitle,
    icon: row.icon,
    createdAt: row.created_at,
  };
}

export function toGoal(row: GoalRow): LearningGoal {
  return {
    id: row.id,
    title: row.title,
    subjectId: row.subject_id,
    targetValue: row.target_value,
    currentValue: row.current_value,
    progressPercent: pct(row.current_value, row.target_value),
    dueDate: row.due_date,
    completed: row.completed,
  };
}

export function toCertification(row: CertificationRow): Certification {
  return {
    id: row.id,
    title: row.title,
    subjectId: row.subject_id,
    status: row.status,
    progressPercent: row.progress_percent,
    issuedAt: row.issued_at,
    credentialUrl: row.credential_url,
  };
}

export function toCalendarEvent(row: CalendarRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    kind: row.kind,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location: row.location,
    teacherName: row.teacher_name,
  };
}

export function toClassRoom(
  row: ClassRow,
  stats: { memberCount: number; totalXp: number; rank: number | null; joined: boolean },
): ClassRoom {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    teacherName: row.teacher_name,
    memberCount: stats.memberCount,
    totalXp: stats.totalXp,
    rank: stats.rank,
    joined: stats.joined,
  };
}

export function toTeamChallenge(row: TeamChallengeRow): TeamChallenge {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    currentValue: row.current_value,
    targetValue: row.target_value,
    rewardTitle: row.reward_title,
    endsAt: row.ends_at,
    classId: row.class_id,
  };
}
