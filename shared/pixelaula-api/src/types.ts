/**
 * Modelo de dominio de PixelAula.
 *
 * Esta es LA fuente de verdad del contrato: la web y la app Android importan
 * estos mismos tipos, así que si algo cambia aquí, los dos clientes se enteran
 * en tiempo de compilación.
 *
 * Convención: todo viaja en camelCase. El backend traduce desde snake_case de
 * Postgres en la capa de mappers; los clientes nunca ven nombres de columna.
 */

// ---------------------------------------------------------------------------
// Comunes
// ---------------------------------------------------------------------------

export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export type Difficulty = 'FACIL' | 'MEDIO' | 'DIFICIL' | 'EPICO';

/** Envelope de todas las respuestas. */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: ApiErrorBody | null;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  nextCursor: string | null;
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

/** Una pieza equipada por categoría. El valor es el `id` de AvatarOption. */
export interface AvatarConfig {
  skinTone: string;
  hair: string;
  hairColor: string;
  eyes: string;
  eyebrows: string;
  expression: string;
  top: string;
  bottom: string;
  shoes: string;
  glasses: string;
  headphones: string;
  headwear: string;
  backpack: string;
  accessory: string;
  pet: string;
  effect: string;
  background: string;
}

export type AvatarCategory = keyof AvatarConfig;

export const AVATAR_CATEGORIES: AvatarCategory[] = [
  'skinTone', 'hair', 'hairColor', 'eyes', 'eyebrows', 'expression',
  'top', 'bottom', 'shoes', 'glasses', 'headphones', 'headwear',
  'backpack', 'accessory', 'pet', 'effect', 'background',
];

export interface AvatarOption {
  id: string;
  category: AvatarCategory;
  name: string;
  rarity: Rarity;
  /** Clave del sprite o color hexadecimal, según la categoría. */
  asset: string;
  priceCoins: number;
  /** Si es false, hay que comprarlo o desbloquearlo. */
  owned: boolean;
  unlockCondition: string | null;
}

export interface AvatarCatalog {
  categories: Array<{
    category: AvatarCategory;
    label: string;
    options: AvatarOption[];
  }>;
}

export interface SavedAvatarStyle {
  id: string;
  name: string;
  config: AvatarConfig;
  rarity: Rarity;
  isEquipped: boolean;
  createdAt: string;
}

export type InventoryCategory = 'ROPA' | 'ACCESORIOS' | 'MOCHILAS' | 'MASCOTAS' | 'EFECTOS';

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  rarity: Rarity;
  icon: string;
  equipped: boolean;
  owned: boolean;
  price?: number;
}

// ---------------------------------------------------------------------------
// Usuario
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  level: number;
  currentXp: number;
  requiredXp: number;
  streakDays: number;
  /** Moneda blanda: se gana jugando. */
  pixelsCoins: number;
  /** Moneda dura: paga pistas y objetos especiales. */
  gems: number;
  avatar: AvatarConfig;
  title: string;
  createdAt: string;
}

export interface UserProgress {
  totalXp: number;
  level: number;
  streakDays: number;
  completedMissionsCount: number;
  completedSubjectsCount: number;
  unlockedAchievementsCount: number;
  weeklyActivity: Array<{ day: string; xp: number }>;
}

export type ActivityFeedType =
  | 'MISSION_COMPLETED' | 'LEVEL_UP' | 'ACHIEVEMENT' | 'BADGE' | 'STREAK' | 'SUBJECT_STARTED';

export interface ActivityFeedEntry {
  id: string;
  type: ActivityFeedType;
  title: string;
  subtitle: string;
  icon: string;
  createdAt: string;
}

export type NotificationType =
  | 'NEW_MISSION' | 'LEVEL_UP' | 'ACHIEVEMENT' | 'STREAK' | 'REWARD' | 'COMMUNITY';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface LearningGoal {
  id: string;
  title: string;
  subjectId: string | null;
  targetValue: number;
  currentValue: number;
  progressPercent: number;
  dueDate: string | null;
  completed: boolean;
}

export interface Certification {
  id: string;
  title: string;
  subjectId: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  progressPercent: number;
  issuedAt: string | null;
  credentialUrl: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  kind: 'LIVE_CLASS' | 'DEADLINE' | 'CHALLENGE';
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  teacherName: string | null;
}

// ---------------------------------------------------------------------------
// Materias y mapa
// ---------------------------------------------------------------------------

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  level: number;
  totalMissions: number;
  completedMissions: number;
  totalLessons: number;
  totalProjects: number;
  difficulty: Difficulty;
  progressPercent: number;
  currentXp: number;
  requiredXp: number;
  status: 'LOCKED' | 'IN_PROGRESS' | 'COMPLETED';
}

export type LevelNodeStatus = 'LOCKED' | 'AVAILABLE' | 'CURRENT' | 'COMPLETED' | 'PERFECT';

export interface LevelNodeData {
  id: string;
  missionId: string;
  levelNumber: number;
  title: string;
  status: LevelNodeStatus;
  stars: number;
  rewardXp: number;
  rewardCoins: number;
  positionX: number;
  positionY: number;
}

/** Todo el mapa en una llamada: es lo que pinta la pantalla de Niveles. */
export interface LearningMap {
  subjects: Array<{
    subject: Subject;
    nodes: LevelNodeData[];
    rewards: Array<{ icon: string; label: string }>;
  }>;
  globalProgressPercent: number;
  nextMission: MissionSummary | null;
}

// ---------------------------------------------------------------------------
// Misiones y actividades
// ---------------------------------------------------------------------------

export interface MissionObjective {
  id: string;
  description: string;
  completed: boolean;
}

export interface Reward {
  type: 'XP' | 'COINS' | 'GEMS' | 'BADGE' | 'AVATAR_ITEM';
  amount?: number;
  itemId?: string;
  title: string;
  icon: string;
}

export interface MissionSummary {
  id: string;
  subjectId: string;
  subjectName: string;
  title: string;
  description: string;
  levelNumber: number;
  difficulty: Difficulty;
  estimatedMinutes: number;
  xpReward: number;
  coinsReward: number;
  status: 'LOCKED' | 'ACTIVE' | 'COMPLETED';
  stars: number;
  progress: { completed: number; total: number };
}

export interface Mission extends MissionSummary {
  objectives: MissionObjective[];
  rewards: Reward[];
  /** Cuántas actividades tiene. El detalle llega actividad a actividad. */
  activityCount: number;
  /** Texto de la lección previa, en markdown. */
  briefing: string | null;
}

export type ActivityType =
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'ORDERING'
  | 'MATCHING'
  | 'DRAG_DROP'
  | 'IMAGE_SELECTION'
  | 'SQL_CHALLENGE'
  | 'NETWORK_SIMULATION'
  | 'CIRCUIT_SIMULATION';

export interface ActivityOption {
  id: string;
  label: string;
  /** Nunca llega al cliente antes de responder. */
  isCorrect?: boolean;
}

export interface SQLChallengeData {
  queryTemplate: string;
  blankSlot: string;
  options: string[];
}

export interface NetworkSimulationData {
  devices: Array<{
    id: string;
    type: 'PC' | 'SWITCH' | 'ROUTER' | 'SERVER' | 'INTERNET';
    label: string;
    ip?: string;
    gateway?: string;
  }>;
  requiredConnections: Array<{ from: string; to: string }>;
}

export interface CircuitSimulationData {
  components: Array<{
    id: string;
    type: 'BATTERY' | 'WIRE' | 'CORNER_WIRE' | 'SWITCH' | 'BULB';
    label: string;
    state?: 'OPEN' | 'CLOSED';
  }>;
  requiredCircuitState: 'CLOSED';
}

/**
 * Actividad tal como la ve el cliente. ANTITRAMPA: aquí no hay `correctAnswer`,
 * `correctOrder` ni `explanation`. Esos campos existen solo en la fila de la
 * base de datos y nunca se serializan antes de responder.
 */
export interface Activity {
  id: string;
  missionId: string;
  index: number;
  total: number;
  type: ActivityType;
  title: string;
  question: string;
  options?: ActivityOption[];
  matchingPairs?: Array<{ concept: string; definition: string }>;
  orderingItems?: string[];
  sqlData?: SQLChallengeData;
  networkData?: NetworkSimulationData;
  circuitData?: CircuitSimulationData;
  hintsAvailable: number;
  hintCostGems: number;
}

// ---------------------------------------------------------------------------
// Intentos de misión
// ---------------------------------------------------------------------------

export type AttemptStatus = 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'ABANDONED';

export interface MissionAttempt {
  id: string;
  missionId: string;
  status: AttemptStatus;
  activityIndex: number;
  activityTotal: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  hintsUsed: number;
  score: number;
  stars: number;
  objectives: MissionObjective[];
  startedAt: string;
  finishedAt: string | null;
}

/** Lo que devuelve responder una actividad. */
export interface AnswerResult {
  duplicate: boolean;
  correct: boolean;
  score: number;
  feedback: string;
  nextStep: string | null;
  answerId: string;
  canExplain: boolean;
  objectives: MissionObjective[];
  attempt: MissionAttempt;
  nextActivity: Activity | null;
  finished: boolean;
  result: MissionResult | null;
}

export interface MissionResult {
  attemptId: string;
  missionId: string;
  missionTitle: string;
  subjectName: string;
  outcome: 'COMPLETED' | 'FAILED';
  score: number;
  maxScore: number;
  stars: number;
  accuracyPercent: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  xpAwarded: number;
  coinsAwarded: number;
  gemsAwarded: number;
  leveledUp: boolean;
  newLevel: number;
  objectives: MissionObjective[];
  unlockedBadges: Badge[];
  unlockedAchievements: Achievement[];
  /** "Lo que aprendiste" de la pantalla de resultados. */
  learnedPoints: string[];
  teacherNote: string | null;
  nextMissionId: string | null;
}

export interface HintResult {
  hint: string;
  hintLevel: number;
  hintsRemaining: number;
  gemsSpent: number;
  gemsRemaining: number;
  scoreMultiplier: number;
}

export interface Explanation {
  answerId: string;
  diagnosis: string;
  steps: Array<{ title: string; detail: string }>;
  solution: string;
  generalRule: string;
  encouragement: string;
  markdown: string;
  cached: boolean;
}

// ---------------------------------------------------------------------------
// Logros, insignias, racha, retos
// ---------------------------------------------------------------------------

export type AchievementCategory = 'APRENDIZAJE' | 'EXPLORACION' | 'CONSTANCIA' | 'CREATIVIDAD' | 'ESPECIALES';

export interface Achievement {
  id: string;
  category: AchievementCategory;
  title: string;
  description: string;
  icon: string;
  progressPercent: number;
  currentValue: number;
  targetValue: number;
  unlocked: boolean;
  unlockedAt?: string;
  rewardXp: number;
  rewardCoins: number;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: Rarity;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface Streak {
  currentDays: number;
  longestDays: number;
  lastActivityDate: string | null;
  claimedToday: boolean;
  freezesAvailable: number;
  /** Los siete días de la semana, para pintar la fila de palomitas. */
  week: Array<{ day: string; active: boolean }>;
  nextMilestone: { days: number; rewardXp: number; rewardCoins: number } | null;
}

export interface StreakClaimResult {
  currentDays: number;
  coinsAwarded: number;
  gemsAwarded: number;
  claimedDate: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  kind: 'WEEKLY' | 'TEAM' | 'EXPLORATION' | 'STREAK';
  currentValue: number;
  targetValue: number;
  rewardXp: number;
  rewardCoins: number;
  completed: boolean;
  joined: boolean;
  endsAt: string | null;
}

// ---------------------------------------------------------------------------
// Comunidad
// ---------------------------------------------------------------------------

export type LeaderboardScope = 'global' | 'friends' | 'class';
export type LeaderboardPeriod = 'week' | 'month' | 'all';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatar: AvatarConfig;
  level: number;
  xp: number;
  streakDays: number;
  isCurrentUser?: boolean;
}

export interface Leaderboard {
  scope: LeaderboardScope;
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
}

export interface ClassRoom {
  id: string;
  name: string;
  code: string;
  teacherName: string | null;
  memberCount: number;
  totalXp: number;
  rank: number | null;
  joined: boolean;
}

export type FriendStatus = 'PENDING_IN' | 'PENDING_OUT' | 'ACCEPTED';

export interface Friend {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatar: AvatarConfig;
  level: number;
  xp: number;
  streakDays: number;
  presence: 'ONLINE' | 'IN_CLASS' | 'OFFLINE';
  status: FriendStatus;
}

export interface CommunityPost {
  id: string;
  author: { userId: string; displayName: string; avatar: AvatarConfig; level: number };
  message: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface TeamChallenge {
  id: string;
  title: string;
  description: string;
  currentValue: number;
  targetValue: number;
  rewardTitle: string;
  endsAt: string | null;
  classId: string | null;
}

// ---------------------------------------------------------------------------
// Tienda y assets
// ---------------------------------------------------------------------------

export interface ShopItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: InventoryCategory | 'CONSUMIBLE';
  rarity: Rarity;
  priceCoins: number;
  priceGems: number;
  icon: string;
  owned: boolean;
  minLevel: number;
}

export interface PurchaseResult {
  itemId: string;
  quantityOwned: number;
  coinsSpent: number;
  gemsSpent: number;
  coinsRemaining: number;
  gemsRemaining: number;
}

export interface AssetManifest {
  version: number;
  updatedAt: string | null;
  bucket: string;
  isPublic: boolean;
  expiresIn: number | null;
  assets: Record<string, { path: string; url: string | null; w?: number; h?: number }>;
}

export interface SearchResults {
  subjects: Subject[];
  missions: MissionSummary[];
  achievements: Achievement[];
}

/** Todo lo que necesita el panel de inicio, en una sola llamada. */
export interface DashboardData {
  user: User;
  progress: UserProgress;
  subjects: Subject[];
  activeMissions: MissionSummary[];
  recentActivity: ActivityFeedEntry[];
  upcomingEvent: CalendarEvent | null;
  badges: Badge[];
  streak: Streak;
}
