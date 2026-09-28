import type {
  AchievementCategory, ActivityType, AttemptStatus, AvatarConfig, Difficulty,
  InventoryCategory, Rarity,
} from '@pixelaula/api';

/**
 * Filas tal como viven en Postgres (snake_case). Se traducen a los tipos del
 * contrato en mappers.ts: los clientes nunca ven un nombre de columna.
 */

export interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  title: string;
  level: number;
  current_xp: number;
  total_xp: number;
  pixels_coins: number;
  gems: number;
  is_admin: boolean;
  created_at: string;
}

export interface SubjectRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  order_index: number;
  difficulty: Difficulty;
  required_xp: number;
  total_lessons: number;
  total_projects: number;
  min_level: number;
  narrative_theme: string | null;
}

export interface MissionRow {
  id: string;
  subject_id: string;
  slug: string;
  title: string;
  description: string;
  level_number: number;
  difficulty: Difficulty;
  estimated_minutes: number;
  xp_reward: number;
  coins_reward: number;
  gems_reward: number;
  activity_count: number;
  position_x: number;
  position_y: number;
  briefing_md: string | null;
  briefing_key_points: string[];
  learned_points: string[];
}

export interface ObjectiveRow {
  id: string;
  mission_id: string;
  order_index: number;
  description: string;
  activity_index: number | null;
}

/** Fila completa. `solution` y `explanation` NUNCA se serializan al cliente. */
export interface ActivityRow {
  id: string;
  mission_id: string;
  order_index: number;
  type: ActivityType;
  title: string;
  question: string;
  payload: Record<string, unknown>;
  solution: Record<string, unknown>;
  explanation: string;
  hints: string[];
  hint_cost_gems: number;
  points: number;
  concept: string | null;
}

export interface MissionProgressRow {
  user_id: string;
  mission_id: string;
  status: 'LOCKED' | 'ACTIVE' | 'COMPLETED';
  stars: number;
  best_score: number;
  attempts: number;
  completed_at: string | null;
}

export interface AttemptRow {
  id: string;
  user_id: string;
  mission_id: string;
  status: AttemptStatus;
  activity_order: string[];
  activity_index: number;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
  hints_used: number;
  score: number;
  stars: number;
  xp_awarded: number;
  coins_awarded: number;
  gems_awarded: number;
  teacher_note: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface AnswerRow {
  id: string;
  attempt_id: string;
  user_id: string;
  activity_id: string;
  client_attempt_id: string;
  answer: Record<string, unknown>;
  is_correct: boolean;
  score: number;
  hints_used: number;
  time_spent_ms: number | null;
  skipped: boolean;
  ai_feedback: { feedback?: string; siguiente_paso?: string } | null;
  explanation_md: string | null;
  created_at: string;
}

export interface AchievementRow {
  id: string;
  slug: string;
  category: AchievementCategory;
  title: string;
  description: string;
  icon: string;
  metric: string;
  target_value: number;
  reward_xp: number;
  reward_coins: number;
  is_secret: boolean;
}

export interface BadgeRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  rarity: Rarity;
}

export interface ChallengeRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: 'WEEKLY' | 'TEAM' | 'EXPLORATION' | 'STREAK';
  metric: string;
  target_value: number;
  reward_xp: number;
  reward_coins: number;
  ends_at: string | null;
}

export interface StreakRow {
  user_id: string;
  current_days: number;
  longest_days: number;
  last_activity_date: string | null;
  last_claimed_date: string | null;
  freezes_available: number;
}

export interface AvatarOptionRow {
  id: string;
  category: keyof AvatarConfig;
  slug: string;
  name: string;
  rarity: Rarity;
  asset: string;
  price_coins: number;
  is_default: boolean;
  unlock_condition: string | null;
  order_index: number;
}

export interface AvatarStyleRow {
  id: string;
  user_id: string;
  name: string;
  config: AvatarConfig;
  is_equipped: boolean;
  created_at: string;
}

export interface ShopItemRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: InventoryCategory | 'CONSUMIBLE';
  rarity: Rarity;
  price_coins: number;
  price_gems: number;
  icon: string;
  effect: { type?: string; amount?: number };
  avatar_option_id: string | null;
  is_consumable: boolean;
  min_level: number;
}

export interface InventoryRow {
  user_id: string;
  item_id: string;
  quantity: number;
  equipped: boolean;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: 'NEW_MISSION' | 'LEVEL_UP' | 'ACHIEVEMENT' | 'STREAK' | 'REWARD' | 'COMMUNITY';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface FeedRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  subtitle: string;
  icon: string;
  created_at: string;
}

export interface GoalRow {
  id: string;
  user_id: string;
  title: string;
  subject_id: string | null;
  target_value: number;
  current_value: number;
  due_date: string | null;
  completed: boolean;
}

export interface CertificationRow {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  progress_percent: number;
  issued_at: string | null;
  credential_url: string | null;
}

export interface CalendarRow {
  id: string;
  title: string;
  description: string;
  kind: 'LIVE_CLASS' | 'DEADLINE' | 'CHALLENGE';
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  teacher_name: string | null;
}

export interface ClassRow {
  id: string;
  name: string;
  code: string;
  teacher_name: string | null;
}

export interface FriendshipRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  created_at: string;
}

export interface PostRow {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
}

export interface TeamChallengeRow {
  id: string;
  class_id: string | null;
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  reward_title: string;
  ends_at: string | null;
}
