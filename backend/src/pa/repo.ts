import { db, unwrap } from '../lib/supabase.js';
import type {
  AchievementRow, ActivityRow, AnswerRow, AttemptRow, AvatarOptionRow, AvatarStyleRow,
  BadgeRow, CalendarRow, CertificationRow, ChallengeRow, ClassRow, FeedRow, FriendshipRow,
  GoalRow, InventoryRow, MissionProgressRow, MissionRow, NotificationRow, ObjectiveRow,
  PostRow, ProfileRow, ShopItemRow, StreakRow, SubjectRow, TeamChallengeRow,
} from './rows.js';
import type { AvatarConfig } from '@pixelaula/api';

/**
 * Acceso a datos. Aquí no hay reglas de negocio: solo consultas.
 * Todo pasa por el cliente con clave secreta, que ignora RLS.
 */

async function maybe<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T | null> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as T) ?? null;
}

// ---------------------------------------------------------------- perfil

export const profiles = {
  byId: (id: string) => maybe<ProfileRow>(db.from('pa_profiles').select('*').eq('id', id).maybeSingle()),

  byUsername: (username: string) =>
    maybe<ProfileRow>(db.from('pa_profiles').select('*').eq('username', username).maybeSingle()),

  async create(row: { id: string; username: string; display_name: string }): Promise<ProfileRow> {
    return unwrap(await db.from('pa_profiles').insert(row).select('*').single());
  },

  async update(id: string, patch: Record<string, unknown>): Promise<ProfileRow> {
    return unwrap(await db.from('pa_profiles').update(patch).eq('id', id).select('*').single());
  },

  async usernameTaken(username: string, exceptId: string): Promise<boolean> {
    const row = await maybe<{ id: string }>(
      db.from('pa_profiles').select('id').eq('username', username).neq('id', exceptId).maybeSingle(),
    );
    return row !== null;
  },

  async topByXp(limit: number, userIds?: string[]): Promise<ProfileRow[]> {
    let q = db.from('pa_profiles').select('*').order('total_xp', { ascending: false }).limit(limit);
    if (userIds) q = q.in('id', userIds);
    return unwrap(await q);
  },

  async byIds(ids: string[]): Promise<ProfileRow[]> {
    if (!ids.length) return [];
    return unwrap(await db.from('pa_profiles').select('*').in('id', ids));
  },

  async search(term: string, limit = 10): Promise<ProfileRow[]> {
    return unwrap(
      await db.from('pa_profiles').select('*').ilike('username', `%${term}%`).limit(limit),
    );
  },
};

// ---------------------------------------------------------------- avatar

export const avatar = {
  async options(): Promise<AvatarOptionRow[]> {
    return unwrap(await db.from('pa_avatar_options').select('*').order('category').order('order_index'));
  },

  async optionBySlug(category: string, slug: string): Promise<AvatarOptionRow | null> {
    return maybe<AvatarOptionRow>(
      db.from('pa_avatar_options').select('*').eq('category', category).eq('slug', slug).maybeSingle(),
    );
  },

  async ownedOptionIds(userId: string): Promise<Set<string>> {
    const rows = unwrap<{ option_id: string }[]>(
      await db.from('pa_user_avatar_items').select('option_id').eq('user_id', userId),
    );
    return new Set(rows.map(r => r.option_id));
  },

  async grantOption(userId: string, optionId: string) {
    await db.from('pa_user_avatar_items').upsert({ user_id: userId, option_id: optionId });
  },

  async config(userId: string): Promise<AvatarConfig | null> {
    const row = await maybe<{ config: AvatarConfig }>(
      db.from('pa_user_avatars').select('config').eq('user_id', userId).maybeSingle(),
    );
    return row?.config ?? null;
  },

  async saveConfig(userId: string, config: AvatarConfig): Promise<AvatarConfig> {
    const row = unwrap<{ config: AvatarConfig }>(
      await db
        .from('pa_user_avatars')
        .upsert({ user_id: userId, config }, { onConflict: 'user_id' })
        .select('config')
        .single(),
    );
    return row.config;
  },

  async styles(userId: string): Promise<AvatarStyleRow[]> {
    return unwrap(
      await db.from('pa_avatar_styles').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    );
  },

  async style(userId: string, id: string): Promise<AvatarStyleRow | null> {
    return maybe<AvatarStyleRow>(
      db.from('pa_avatar_styles').select('*').eq('user_id', userId).eq('id', id).maybeSingle(),
    );
  },

  async createStyle(userId: string, name: string, config: AvatarConfig): Promise<AvatarStyleRow> {
    return unwrap(
      await db.from('pa_avatar_styles').insert({ user_id: userId, name, config }).select('*').single(),
    );
  },

  async updateStyle(userId: string, id: string, patch: Record<string, unknown>): Promise<AvatarStyleRow> {
    return unwrap(
      await db.from('pa_avatar_styles').update(patch).eq('user_id', userId).eq('id', id).select('*').single(),
    );
  },

  async deleteStyle(userId: string, id: string) {
    await db.from('pa_avatar_styles').delete().eq('user_id', userId).eq('id', id);
  },

  async unequipAll(userId: string) {
    await db.from('pa_avatar_styles').update({ is_equipped: false }).eq('user_id', userId);
  },

  async countStyles(userId: string): Promise<number> {
    const { count, error } = await db
      .from('pa_avatar_styles')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  },
};

// ---------------------------------------------------- materias y misiones

export const content = {
  async subjects(): Promise<SubjectRow[]> {
    return unwrap(await db.from('pa_subjects').select('*').eq('is_published', true).order('order_index'));
  },

  subject: (id: string) =>
    maybe<SubjectRow>(db.from('pa_subjects').select('*').eq('id', id).maybeSingle()),

  async missions(): Promise<MissionRow[]> {
    return unwrap(
      await db.from('pa_missions').select('*').eq('is_published', true).order('level_number'),
    );
  },

  async missionsBySubject(subjectId: string): Promise<MissionRow[]> {
    return unwrap(
      await db
        .from('pa_missions')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('is_published', true)
        .order('level_number'),
    );
  },

  mission: (id: string) => maybe<MissionRow>(db.from('pa_missions').select('*').eq('id', id).maybeSingle()),

  async updateMission(id: string, patch: Record<string, unknown>): Promise<MissionRow> {
    return unwrap(await db.from('pa_missions').update(patch).eq('id', id).select('*').single());
  },

  async objectives(missionId: string): Promise<ObjectiveRow[]> {
    return unwrap(
      await db.from('pa_mission_objectives').select('*').eq('mission_id', missionId).order('order_index'),
    );
  },

  /** Fila completa con la solución: SOLO para uso interno del servidor. */
  async activities(missionId: string): Promise<ActivityRow[]> {
    return unwrap(
      await db
        .from('pa_activities')
        .select('*')
        .eq('mission_id', missionId)
        .eq('is_active', true)
        .order('order_index'),
    );
  },

  activity: (id: string) => maybe<ActivityRow>(db.from('pa_activities').select('*').eq('id', id).maybeSingle()),

  async insertActivities(rows: Record<string, unknown>[]): Promise<ActivityRow[]> {
    return unwrap(await db.from('pa_activities').insert(rows).select('*'));
  },

  async deactivateActivities(missionId: string) {
    await db.from('pa_activities').update({ is_active: false }).eq('mission_id', missionId);
  },

  async searchMissions(term: string, limit: number): Promise<MissionRow[]> {
    return unwrap(
      await db.from('pa_missions').select('*').eq('is_published', true).ilike('title', `%${term}%`).limit(limit),
    );
  },
};

// ------------------------------------------------------------- progreso

export const progress = {
  async byUser(userId: string): Promise<MissionProgressRow[]> {
    return unwrap(await db.from('pa_user_mission_progress').select('*').eq('user_id', userId));
  },

  forMission: (userId: string, missionId: string) =>
    maybe<MissionProgressRow>(
      db
        .from('pa_user_mission_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('mission_id', missionId)
        .maybeSingle(),
    ),

  async upsert(userId: string, missionId: string, patch: Record<string, unknown>) {
    await db
      .from('pa_user_mission_progress')
      .upsert({ user_id: userId, mission_id: missionId, ...patch }, { onConflict: 'user_id,mission_id' });
  },

  async completedCount(userId: string): Promise<number> {
    const { count, error } = await db
      .from('pa_user_mission_progress')
      .select('mission_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'COMPLETED');
    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  async recordConcept(userId: string, concept: string, correct: boolean) {
    const row = await maybe<{ correct_count: number; wrong_count: number; mastery_level: number }>(
      db.from('pa_concept_mastery').select('*').eq('user_id', userId).eq('concept', concept).maybeSingle(),
    );
    // Media móvil: el resultado reciente pesa un 30%.
    const prev = row?.mastery_level ?? 0.5;
    const next = Math.min(1, Math.max(0, prev * 0.7 + (correct ? 1 : 0) * 0.3));

    await db.from('pa_concept_mastery').upsert(
      {
        user_id: userId,
        concept,
        correct_count: (row?.correct_count ?? 0) + (correct ? 1 : 0),
        wrong_count: (row?.wrong_count ?? 0) + (correct ? 0 : 1),
        mastery_level: Number(next.toFixed(3)),
        last_practiced_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,concept' },
    );
  },

  async weakConcepts(userId: string, concepts: string[], limit = 3) {
    if (!concepts.length) return [];
    return unwrap<{ concept: string; mastery_level: number }[]>(
      await db
        .from('pa_concept_mastery')
        .select('concept, mastery_level')
        .eq('user_id', userId)
        .in('concept', concepts)
        .lt('mastery_level', 0.6)
        .order('mastery_level', { ascending: true })
        .limit(limit),
    );
  },
};

// -------------------------------------------------------------- intentos

export const attempts = {
  async create(row: Record<string, unknown>): Promise<AttemptRow> {
    return unwrap(await db.from('pa_mission_attempts').insert(row).select('*').single());
  },

  byId: (id: string) => maybe<AttemptRow>(db.from('pa_mission_attempts').select('*').eq('id', id).maybeSingle()),

  activeForMission: (userId: string, missionId: string) =>
    maybe<AttemptRow>(
      db
        .from('pa_mission_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('mission_id', missionId)
        .eq('status', 'ACTIVE')
        .maybeSingle(),
    ),

  async update(id: string, patch: Record<string, unknown>): Promise<AttemptRow> {
    return unwrap(await db.from('pa_mission_attempts').update(patch).eq('id', id).select('*').single());
  },

  async wonBossCount(userId: string): Promise<number> {
    const { count, error } = await db
      .from('pa_mission_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'COMPLETED');
    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  // ---- objetivos del intento

  async seedObjectives(attemptId: string, objectiveIds: string[]) {
    if (!objectiveIds.length) return;
    await db
      .from('pa_attempt_objectives')
      .upsert(objectiveIds.map(id => ({ attempt_id: attemptId, objective_id: id, completed: false })));
  },

  async objectives(attemptId: string): Promise<{ objective_id: string; completed: boolean }[]> {
    return unwrap(
      await db.from('pa_attempt_objectives').select('objective_id, completed').eq('attempt_id', attemptId),
    );
  },

  async completeObjective(attemptId: string, objectiveId: string) {
    await db
      .from('pa_attempt_objectives')
      .upsert({ attempt_id: attemptId, objective_id: objectiveId, completed: true });
  },

  // ---- respuestas

  byClientId: (attemptId: string, clientAttemptId: string) =>
    maybe<AnswerRow>(
      db
        .from('pa_attempt_answers')
        .select('*')
        .eq('attempt_id', attemptId)
        .eq('client_attempt_id', clientAttemptId)
        .maybeSingle(),
    ),

  async insertAnswer(row: Record<string, unknown>): Promise<AnswerRow> {
    return unwrap(await db.from('pa_attempt_answers').insert(row).select('*').single());
  },

  answer: (id: string) => maybe<AnswerRow>(db.from('pa_attempt_answers').select('*').eq('id', id).maybeSingle()),

  async answers(attemptId: string): Promise<AnswerRow[]> {
    return unwrap(
      await db.from('pa_attempt_answers').select('*').eq('attempt_id', attemptId).order('created_at'),
    );
  },

  async saveExplanation(id: string, markdown: string) {
    await db
      .from('pa_attempt_answers')
      .update({ explanation_md: markdown, explained_at: new Date().toISOString() })
      .eq('id', id);
  },

  async correctCount(userId: string): Promise<number> {
    const { count, error } = await db
      .from('pa_attempt_answers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_correct', true);
    if (error) throw new Error(error.message);
    return count ?? 0;
  },
};

// ------------------------------------------------------------- gamificación

export const meta = {
  async achievements(): Promise<AchievementRow[]> {
    return unwrap(await db.from('pa_achievements').select('*').order('order_index'));
  },

  async userAchievements(userId: string) {
    return unwrap<{ achievement_id: string; current_value: number; unlocked_at: string | null }[]>(
      await db.from('pa_user_achievements').select('*').eq('user_id', userId),
    );
  },

  async upsertAchievement(userId: string, achievementId: string, value: number, unlocked: boolean) {
    await db.from('pa_user_achievements').upsert(
      {
        user_id: userId,
        achievement_id: achievementId,
        current_value: value,
        unlocked_at: unlocked ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id,achievement_id' },
    );
  },

  async badges(): Promise<BadgeRow[]> {
    return unwrap(await db.from('pa_badges').select('*').order('order_index'));
  },

  async userBadges(userId: string) {
    return unwrap<{ badge_id: string; unlocked_at: string }[]>(
      await db.from('pa_user_badges').select('*').eq('user_id', userId),
    );
  },

  async grantBadge(userId: string, badgeId: string) {
    await db.from('pa_user_badges').upsert({ user_id: userId, badge_id: badgeId });
  },

  async badgeBySlug(slug: string): Promise<BadgeRow | null> {
    return maybe<BadgeRow>(db.from('pa_badges').select('*').eq('slug', slug).maybeSingle());
  },

  async challenges(): Promise<ChallengeRow[]> {
    return unwrap(await db.from('pa_challenges').select('*').order('ends_at', { nullsFirst: false }));
  },

  async userChallenges(userId: string) {
    return unwrap<{ challenge_id: string; current_value: number; completed_at: string | null }[]>(
      await db.from('pa_user_challenges').select('*').eq('user_id', userId),
    );
  },

  async joinChallenge(userId: string, challengeId: string) {
    await db.from('pa_user_challenges').upsert({ user_id: userId, challenge_id: challengeId });
  },

  streak: (userId: string) =>
    maybe<StreakRow>(db.from('pa_streaks').select('*').eq('user_id', userId).maybeSingle()),

  async upsertStreak(userId: string, patch: Record<string, unknown>) {
    await db.from('pa_streaks').upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' });
  },

  async addXpEvent(userId: string, source: string, xp: number, coins = 0, gems = 0) {
    await db.from('pa_xp_events').insert({ user_id: userId, source, xp, coins, gems });
  },

  async xpSince(since: string, userIds?: string[]) {
    let q = db.from('pa_xp_events').select('user_id, xp').gte('created_at', since);
    if (userIds) q = q.in('user_id', userIds);
    return unwrap<{ user_id: string; xp: number }[]>(await q);
  },

  /** XP sumada por dia, para la grafica semanal. */
  async xpByDay(userId: string, sinceIso: string): Promise<Map<string, number>> {
    const rows = unwrap<{ created_at: string; xp: number }[]>(
      await db.from('pa_xp_events').select('created_at, xp').eq('user_id', userId).gte('created_at', sinceIso),
    );
    const byDay = new Map<string, number>();
    for (const row of rows) {
      const day = row.created_at.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + row.xp);
    }
    return byDay;
  },

  async activeDates(userId: string, sinceIso: string): Promise<Set<string>> {
    const rows = unwrap<{ created_at: string }[]>(
      await db.from('pa_xp_events').select('created_at').eq('user_id', userId).gte('created_at', sinceIso),
    );
    return new Set(rows.map(r => r.created_at.slice(0, 10)));
  },
};

// ------------------------------------------------------------- economía

export const economy = {
  async items(): Promise<ShopItemRow[]> {
    return unwrap(await db.from('pa_shop_items').select('*').eq('is_available', true).order('price_coins'));
  },

  item: (id: string) => maybe<ShopItemRow>(db.from('pa_shop_items').select('*').eq('id', id).maybeSingle()),

  async inventory(userId: string): Promise<Array<InventoryRow & { item: ShopItemRow }>> {
    return unwrap(
      await db.from('pa_inventory').select('*, item:pa_shop_items(*)').eq('user_id', userId).gt('quantity', 0),
    ) as unknown as Array<InventoryRow & { item: ShopItemRow }>;
  },

  async inventoryEntry(userId: string, itemId: string) {
    return maybe<InventoryRow & { item: ShopItemRow }>(
      db
        .from('pa_inventory')
        .select('*, item:pa_shop_items(*)')
        .eq('user_id', userId)
        .eq('item_id', itemId)
        .maybeSingle(),
    ) as Promise<(InventoryRow & { item: ShopItemRow }) | null>;
  },

  async setQuantity(userId: string, itemId: string, quantity: number) {
    await db.from('pa_inventory').update({ quantity }).eq('user_id', userId).eq('item_id', itemId);
  },

  async setEquipped(userId: string, itemId: string, equipped: boolean) {
    await db.from('pa_inventory').update({ equipped }).eq('user_id', userId).eq('item_id', itemId);
  },
};

// ------------------------------------------------------------- comunidad

export const community = {
  async classes(): Promise<ClassRow[]> {
    return unwrap(await db.from('pa_classes').select('*').order('name'));
  },

  classById: (id: string) => maybe<ClassRow>(db.from('pa_classes').select('*').eq('id', id).maybeSingle()),
  classByCode: (code: string) =>
    maybe<ClassRow>(db.from('pa_classes').select('*').eq('code', code.toUpperCase()).maybeSingle()),

  async classMembers(classId: string): Promise<string[]> {
    const rows = unwrap<{ user_id: string }[]>(
      await db.from('pa_class_members').select('user_id').eq('class_id', classId),
    );
    return rows.map(r => r.user_id);
  },

  async allClassMembers(): Promise<{ class_id: string; user_id: string }[]> {
    return unwrap(await db.from('pa_class_members').select('class_id, user_id'));
  },

  async myClasses(userId: string): Promise<string[]> {
    const rows = unwrap<{ class_id: string }[]>(
      await db.from('pa_class_members').select('class_id').eq('user_id', userId),
    );
    return rows.map(r => r.class_id);
  },

  async joinClass(classId: string, userId: string) {
    await db.from('pa_class_members').upsert({ class_id: classId, user_id: userId });
  },

  async leaveClass(classId: string, userId: string) {
    await db.from('pa_class_members').delete().eq('class_id', classId).eq('user_id', userId);
  },

  async friendships(userId: string): Promise<FriendshipRow[]> {
    return unwrap(
      await db.from('pa_friendships').select('*').or(`user_id.eq.${userId},friend_id.eq.${userId}`),
    );
  },

  friendship: (id: string) =>
    maybe<FriendshipRow>(db.from('pa_friendships').select('*').eq('id', id).maybeSingle()),

  async createFriendship(userId: string, friendId: string): Promise<FriendshipRow> {
    return unwrap(
      await db.from('pa_friendships').insert({ user_id: userId, friend_id: friendId }).select('*').single(),
    );
  },

  async updateFriendship(id: string, status: string): Promise<FriendshipRow> {
    return unwrap(await db.from('pa_friendships').update({ status }).eq('id', id).select('*').single());
  },

  async deleteFriendship(id: string) {
    await db.from('pa_friendships').delete().eq('id', id);
  },

  async posts(limit: number, before?: string): Promise<PostRow[]> {
    let q = db.from('pa_community_posts').select('*').order('created_at', { ascending: false }).limit(limit);
    if (before) q = q.lt('created_at', before);
    return unwrap(await q);
  },

  async createPost(userId: string, message: string): Promise<PostRow> {
    return unwrap(
      await db.from('pa_community_posts').insert({ user_id: userId, message }).select('*').single(),
    );
  },

  post: (id: string) => maybe<PostRow>(db.from('pa_community_posts').select('*').eq('id', id).maybeSingle()),

  async likes(postIds: string[]): Promise<{ post_id: string; user_id: string }[]> {
    if (!postIds.length) return [];
    return unwrap(await db.from('pa_post_likes').select('post_id, user_id').in('post_id', postIds));
  },

  async toggleLike(postId: string, userId: string): Promise<boolean> {
    const existing = await maybe<{ post_id: string }>(
      db.from('pa_post_likes').select('post_id').eq('post_id', postId).eq('user_id', userId).maybeSingle(),
    );
    if (existing) {
      await db.from('pa_post_likes').delete().eq('post_id', postId).eq('user_id', userId);
      return false;
    }
    await db.from('pa_post_likes').insert({ post_id: postId, user_id: userId });
    return true;
  },

  async teamChallenges(): Promise<TeamChallengeRow[]> {
    return unwrap(await db.from('pa_team_challenges').select('*'));
  },
};

// ------------------------------------------ avisos, objetivos, certificados

export const personal = {
  async notifications(userId: string): Promise<NotificationRow[]> {
    return unwrap(
      await db
        .from('pa_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
    );
  },

  async readNotification(userId: string, id: string): Promise<NotificationRow> {
    return unwrap(
      await db
        .from('pa_notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('id', id)
        .select('*')
        .single(),
    );
  },

  async readAllNotifications(userId: string): Promise<number> {
    const rows = unwrap<{ id: string }[]>(
      await db
        .from('pa_notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)
        .select('id'),
    );
    return rows.length;
  },

  async notify(userId: string, type: string, title: string, message: string) {
    await db.from('pa_notifications').insert({ user_id: userId, type, title, message });
  },

  async feed(userId: string, limit: number, before?: string): Promise<FeedRow[]> {
    let q = db
      .from('pa_activity_feed')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (before) q = q.lt('created_at', before);
    return unwrap(await q);
  },

  async addFeed(userId: string, type: string, title: string, subtitle: string, icon: string) {
    await db.from('pa_activity_feed').insert({ user_id: userId, type, title, subtitle, icon });
  },

  async goals(userId: string): Promise<GoalRow[]> {
    return unwrap(await db.from('pa_learning_goals').select('*').eq('user_id', userId).order('created_at'));
  },

  async createGoal(row: Record<string, unknown>): Promise<GoalRow> {
    return unwrap(await db.from('pa_learning_goals').insert(row).select('*').single());
  },

  async updateGoal(userId: string, id: string, patch: Record<string, unknown>): Promise<GoalRow> {
    return unwrap(
      await db.from('pa_learning_goals').update(patch).eq('user_id', userId).eq('id', id).select('*').single(),
    );
  },

  async deleteGoal(userId: string, id: string) {
    await db.from('pa_learning_goals').delete().eq('user_id', userId).eq('id', id);
  },

  async certifications(userId: string): Promise<CertificationRow[]> {
    return unwrap(await db.from('pa_certifications').select('*').eq('user_id', userId));
  },

  async calendar(): Promise<CalendarRow[]> {
    return unwrap(
      await db
        .from('pa_calendar_events')
        .select('*')
        .gte('starts_at', new Date(Date.now() - 86_400_000).toISOString())
        .order('starts_at')
        .limit(20),
    );
  },

  async assetManifest() {
    return maybe<{ version: number; assets: Record<string, { path: string; w?: number; h?: number }>; updated_at: string }>(
      db.from('pa_asset_manifest').select('*').eq('id', 1).maybeSingle(),
    );
  },
};
