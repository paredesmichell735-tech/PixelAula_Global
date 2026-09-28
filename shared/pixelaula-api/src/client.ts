import { ENDPOINTS, buildPath, type EndpointSpec } from './endpoints.js';
import { ERROR_CODES, PixelAulaError } from './errors.js';
import type {
  Achievement, ActivityFeedEntry, Activity, AnswerResult, AssetManifest, AvatarCatalog,
  AvatarConfig, Badge, CalendarEvent, Certification, Challenge, ClassRoom, CommunityPost,
  DashboardData, Explanation, Friend, HintResult, InventoryItem, Leaderboard, LeaderboardEntry, LearningGoal,
  LearningMap, Mission, MissionAttempt, MissionResult, MissionSummary, NotificationItem,
  Paginated, PurchaseResult, SavedAvatarStyle, SearchResults, ShopItem, Streak,
  StreakClaimResult, Subject, TeamChallenge, User, UserProgress,
} from './types.js';
import type {
  ActivityFeedQuery, AnswerBody, CreateAvatarStyleBody, CreateGoalBody, CreatePostBody,
  FriendRequestBody, InventoryQuery, JoinClassBody, LeaderboardQuery, MissionsQuery,
  PurchaseBody, RegisterProfileBody, SearchQuery, UpdateGoalBody, UpdateMeBody,
} from './requests.js';

export interface ClientOptions {
  /** Ej: http://localhost:3000/api/v1 · en el emulador Android: http://10.0.2.2:3000/api/v1 */
  baseUrl: string;
  /**
   * Devuelve el access token vigente de Supabase. Se llama en CADA petición
   * a propósito: el SDK de Supabase refresca por su cuenta y guardar el token
   * al arrancar deja sesiones caducadas.
   */
  getToken: () => string | null | Promise<string | null>;
  /** Se llama ante un 401 para forzar refresco. Devuelve el token nuevo o null. */
  onRefresh?: () => Promise<string | null>;
  /** Se llama cuando la sesión es irrecuperable: el cliente debe ir al login. */
  onAuthError?: () => void;
  /** Timeout normal en ms (por defecto 15 s). */
  timeoutMs?: number;
  /** Timeout de los endpoints marcados `slow` (por defecto 60 s). */
  slowTimeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** Cualquier objeto plano sirve como query string. */
type QueryInput = Record<string, unknown> | object;

interface RequestOptions {
  params?: Record<string, string | number>;
  query?: QueryInput;
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * Cliente de la API de PixelAula.
 *
 * Sin dependencias: usa `fetch` y `AbortController`, que existen tanto en el
 * navegador como en React Native. Web y app llaman exactamente a los mismos
 * métodos, así que un cambio de flujo se hace una vez.
 */
export class PixelAulaClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  // ------------------------------------------------------------------ núcleo

  private buildUrl(spec: EndpointSpec, opts: RequestOptions): string {
    const path = buildPath(spec.path, opts.params);
    const url = `${this.baseUrl}${path}`;
    if (!opts.query) return url;

    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(opts.query as Record<string, unknown>)) {
      if (value === undefined || value === null || value === '') continue;
      search.append(key, String(value));
    }
    const qs = search.toString();
    return qs ? `${url}?${qs}` : url;
  }

  private async request<T>(spec: EndpointSpec, opts: RequestOptions = {}, isRetry = false): Promise<T> {
    const url = this.buildUrl(spec, opts);
    const timeout = spec.slow
      ? (this.options.slowTimeoutMs ?? 60_000)
      : (this.options.timeoutMs ?? 15_000);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    // Permite que el llamante cancele (por ejemplo, al desmontar una pantalla).
    opts.signal?.addEventListener('abort', () => controller.abort(), { once: true });

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

    if (spec.auth) {
      const token = await this.options.getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: spec.method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: controller.signal,
      });
    } catch (cause) {
      clearTimeout(timer);
      if (controller.signal.aborted) {
        throw new PixelAulaError(ERROR_CODES.TIMEOUT, 'El servidor tardó demasiado en responder.', 0, cause);
      }
      throw new PixelAulaError(ERROR_CODES.NETWORK_ERROR, 'No pudimos conectar con el servidor.', 0, cause);
    } finally {
      clearTimeout(timer);
    }

    // Sesión caducada: refrescamos una sola vez y repetimos.
    if (response.status === 401 && spec.auth && !isRetry) {
      const fresh = this.options.onRefresh ? await this.options.onRefresh() : null;
      if (fresh) return this.request<T>(spec, opts, true);
      this.options.onAuthError?.();
    }

    let payload: unknown = null;
    const text = await response.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new PixelAulaError(ERROR_CODES.INTERNAL_ERROR, 'El servidor devolvió una respuesta ilegible.', response.status);
      }
    }

    const envelope = payload as { success?: boolean; data?: T; error?: { code: string; message: string; details?: unknown } } | null;

    if (!response.ok || envelope?.success === false) {
      const code = envelope?.error?.code ?? ERROR_CODES.INTERNAL_ERROR;
      const message = envelope?.error?.message ?? `Error ${response.status}`;
      throw new PixelAulaError(code, message, response.status, envelope?.error?.details);
    }

    return (envelope?.data ?? null) as T;
  }

  // ----------------------------------------------------------------- sistema

  health() { return this.request<{ status: string; uptimeS: number }>(ENDPOINTS.health); }
  assetManifest() { return this.request<AssetManifest>(ENDPOINTS.assetManifest); }

  // -------------------------------------------------------------- sesión y yo

  session() { return this.request<User>(ENDPOINTS.session); }
  registerProfile(body: RegisterProfileBody) { return this.request<User>(ENDPOINTS.registerProfile, { body }); }
  me() { return this.request<User>(ENDPOINTS.me); }
  updateMe(body: UpdateMeBody) { return this.request<User>(ENDPOINTS.updateMe, { body }); }
  myProgress() { return this.request<UserProgress>(ENDPOINTS.myProgress); }
  myActivity(query: ActivityFeedQuery = {}) { return this.request<Paginated<ActivityFeedEntry>>(ENDPOINTS.myActivity, { query }); }
  dashboard() { return this.request<DashboardData>(ENDPOINTS.dashboard); }

  // ----------------------------------------------------------- notificaciones

  notifications() { return this.request<NotificationItem[]>(ENDPOINTS.notifications); }
  readNotification(id: string) { return this.request<NotificationItem>(ENDPOINTS.readNotification, { params: { id } }); }
  readAllNotifications() { return this.request<{ updated: number }>(ENDPOINTS.readAllNotifications); }

  // ------------------------------------------------- objetivos y certificados

  goals() { return this.request<LearningGoal[]>(ENDPOINTS.goals); }
  createGoal(body: CreateGoalBody) { return this.request<LearningGoal>(ENDPOINTS.createGoal, { body }); }
  updateGoal(id: string, body: UpdateGoalBody) { return this.request<LearningGoal>(ENDPOINTS.updateGoal, { params: { id }, body }); }
  deleteGoal(id: string) { return this.request<{ deleted: string }>(ENDPOINTS.deleteGoal, { params: { id } }); }
  certifications() { return this.request<Certification[]>(ENDPOINTS.certifications); }
  calendar() { return this.request<CalendarEvent[]>(ENDPOINTS.calendar); }

  // ------------------------------------------------------------------ avatar

  avatarCatalog() { return this.request<AvatarCatalog>(ENDPOINTS.avatarCatalog); }
  myAvatar() { return this.request<AvatarConfig>(ENDPOINTS.myAvatar); }
  saveAvatar(config: AvatarConfig) { return this.request<AvatarConfig>(ENDPOINTS.saveAvatar, { body: config }); }
  avatarStyles() { return this.request<SavedAvatarStyle[]>(ENDPOINTS.avatarStyles); }
  createAvatarStyle(body: CreateAvatarStyleBody) { return this.request<SavedAvatarStyle>(ENDPOINTS.createAvatarStyle, { body }); }
  updateAvatarStyle(id: string, body: { name: string }) { return this.request<SavedAvatarStyle>(ENDPOINTS.updateAvatarStyle, { params: { id }, body }); }
  deleteAvatarStyle(id: string) { return this.request<{ deleted: string }>(ENDPOINTS.deleteAvatarStyle, { params: { id } }); }
  equipAvatarStyle(id: string) { return this.request<AvatarConfig>(ENDPOINTS.equipAvatarStyle, { params: { id } }); }
  randomAvatar() { return this.request<AvatarConfig>(ENDPOINTS.randomAvatar); }

  // ---------------------------------------------------------------- materias

  subjects() { return this.request<Subject[]>(ENDPOINTS.subjects); }
  subject(id: string) { return this.request<Subject>(ENDPOINTS.subject, { params: { id } }); }
  subjectMissions(id: string) { return this.request<MissionSummary[]>(ENDPOINTS.subjectMissions, { params: { id } }); }
  learningMap() { return this.request<LearningMap>(ENDPOINTS.learningMap); }

  // ---------------------------------------------------------------- misiones

  missions(query: MissionsQuery = {}) { return this.request<MissionSummary[]>(ENDPOINTS.missions, { query }); }
  mission(id: string) { return this.request<Mission>(ENDPOINTS.mission, { params: { id } }); }
  missionBriefing(id: string) { return this.request<{ missionId: string; markdown: string; keyPoints: string[] }>(ENDPOINTS.missionBriefing, { params: { id } }); }
  startMission(id: string) {
    return this.request<{ attempt: MissionAttempt; activity: Activity | null; resumed: boolean }>(
      ENDPOINTS.startMission, { params: { id } },
    );
  }

  // ---------------------------------------------------------------- intentos

  attempt(id: string) { return this.request<MissionAttempt>(ENDPOINTS.attempt, { params: { id } }); }
  currentActivity(id: string) { return this.request<Activity>(ENDPOINTS.currentActivity, { params: { id } }); }
  answer(attemptId: string, body: AnswerBody) { return this.request<AnswerResult>(ENDPOINTS.answer, { params: { id: attemptId }, body }); }
  hint(attemptId: string) { return this.request<HintResult>(ENDPOINTS.hint, { params: { id: attemptId } }); }
  skipActivity(attemptId: string) { return this.request<AnswerResult>(ENDPOINTS.skipActivity, { params: { id: attemptId } }); }
  abandonAttempt(attemptId: string) { return this.request<MissionAttempt>(ENDPOINTS.abandonAttempt, { params: { id: attemptId } }); }
  finishAttempt(attemptId: string) { return this.request<MissionResult>(ENDPOINTS.finishAttempt, { params: { id: attemptId } }); }
  attemptResult(attemptId: string) { return this.request<MissionResult>(ENDPOINTS.attemptResult, { params: { id: attemptId } }); }
  explainAnswer(answerId: string) { return this.request<Explanation>(ENDPOINTS.explainAnswer, { params: { id: answerId } }); }

  // ------------------------------------------------------- logros e insignias

  achievements() { return this.request<Achievement[]>(ENDPOINTS.achievements); }
  badges() { return this.request<Badge[]>(ENDPOINTS.badges); }
  challenges() { return this.request<Challenge[]>(ENDPOINTS.challenges); }
  joinChallenge(id: string) { return this.request<Challenge>(ENDPOINTS.joinChallenge, { params: { id } }); }

  // ------------------------------------------------------------------- racha

  streak() { return this.request<Streak>(ENDPOINTS.streak); }
  claimStreak() { return this.request<StreakClaimResult>(ENDPOINTS.claimStreak); }

  // ---------------------------------------------------------------- economía

  shopItems() { return this.request<ShopItem[]>(ENDPOINTS.shopItems); }
  purchase(body: PurchaseBody) { return this.request<PurchaseResult>(ENDPOINTS.purchase, { body }); }
  inventory(query: InventoryQuery = {}) { return this.request<InventoryItem[]>(ENDPOINTS.inventory, { query }); }
  equipItem(id: string) { return this.request<InventoryItem>(ENDPOINTS.equipItem, { params: { id } }); }
  useItem(id: string, body: { attemptId?: string } = {}) { return this.request<{ effect: string; itemId: string }>(ENDPOINTS.useItem, { params: { id }, body }); }

  // --------------------------------------------------------------- comunidad

  leaderboard(query: LeaderboardQuery = {}) { return this.request<Leaderboard>(ENDPOINTS.leaderboard, { query }); }
  friends() { return this.request<Friend[]>(ENDPOINTS.friends); }
  sendFriendRequest(body: FriendRequestBody) { return this.request<Friend>(ENDPOINTS.sendFriendRequest, { body }); }
  acceptFriendRequest(id: string) { return this.request<Friend>(ENDPOINTS.acceptFriendRequest, { params: { id } }); }
  rejectFriendRequest(id: string) { return this.request<{ rejected: string }>(ENDPOINTS.rejectFriendRequest, { params: { id } }); }
  removeFriend(id: string) { return this.request<{ removed: string }>(ENDPOINTS.removeFriend, { params: { id } }); }
  classes() { return this.request<ClassRoom[]>(ENDPOINTS.classes); }
  classDetail(id: string) { return this.request<ClassRoom & { members: LeaderboardEntry[] }>(ENDPOINTS.classDetail, { params: { id } }); }
  joinClass(body: JoinClassBody) { return this.request<ClassRoom>(ENDPOINTS.joinClass, { body }); }
  leaveClass(id: string) { return this.request<{ left: string }>(ENDPOINTS.leaveClass, { params: { id } }); }
  communityFeed(query: ActivityFeedQuery = {}) { return this.request<Paginated<CommunityPost>>(ENDPOINTS.communityFeed, { query }); }
  createPost(body: CreatePostBody) { return this.request<CommunityPost>(ENDPOINTS.createPost, { body }); }
  likePost(id: string) { return this.request<CommunityPost>(ENDPOINTS.likePost, { params: { id } }); }
  teamChallenges() { return this.request<TeamChallenge[]>(ENDPOINTS.teamChallenges); }

  // --------------------------------------------------------------- búsqueda

  search(query: SearchQuery) { return this.request<SearchResults>(ENDPOINTS.search, { query }); }

  // ------------------------------------------------------------------ admin

  adminGenerateMission(id: string) { return this.request<{ missionId: string; activitiesGenerated: number }>(ENDPOINTS.adminGenerateMission, { params: { id } }); }
  adminAiCosts() { return this.request<{ periodDays: number; totalCostUsd: number; totalCalls: number }>(ENDPOINTS.adminAiCosts); }
}
