import { Router } from 'express';
import { ENDPOINTS } from '@pixelaula/api';
import {
  answerSchema, avatarConfigSchema, createAvatarStyleSchema, createGoalSchema, createPostSchema,
  feedQuerySchema, friendRequestSchema, idParam, inventoryQuerySchema, joinClassSchema,
  leaderboardQuerySchema, missionsQuerySchema, purchaseSchema, registerProfileSchema,
  searchQuerySchema, updateAvatarStyleSchema, updateGoalSchema, updateMeSchema, useItemSchema,
} from '@pixelaula/api/schemas';
import { h, ok } from '../lib/http.js';
import { requireAdmin, requireAuth, requireProfile, userId } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import * as attemptService from './attempt.service.js';
import * as avatarService from './avatar.service.js';
import * as economyService from './economy.service.js';
import * as learning from './learning.service.js';
import * as profile from './profile.service.js';
import * as social from './social.service.js';
import { content } from './repo.js';
import { err } from '../lib/errors.js';

/**
 * Rutas de PixelAula. El orden y las rutas salen de ENDPOINTS, el catálogo
 * compartido: si algo no cuadra, la web y la app lo notan al compilar.
 *
 * Los handlers son de una línea a propósito: toda la lógica vive en los
 * servicios, no aquí.
 */
export const apiRouter = Router();

const path = (name: keyof typeof ENDPOINTS) => ENDPOINTS[name].path;

// ---------------------------------------------------------------- públicas

apiRouter.get(
  path('health'),
  h(async (_req, res) => ok(res, { status: 'ok', uptimeS: Math.round(process.uptime()) })),
);

apiRouter.get(
  path('assetManifest'),
  h(async (_req, res) => ok(res, await profile.getAssetManifest())),
);

// A partir de aquí todo exige el JWT de Supabase Auth.
apiRouter.use(requireAuth);

// ------------------------------------------------------------ sesión y alta

apiRouter.get(
  path('session'),
  h(async (req, res) => ok(res, await profile.getMe(userId(req), req.user?.email))),
);

apiRouter.post(
  path('registerProfile'),
  validate({ body: registerProfileSchema }),
  h(async (req, res) => ok(res, await profile.registerProfile(userId(req), req.body, req.user?.email), 201)),
);

// El resto necesita el alta terminada.
apiRouter.use(requireProfile);

// ------------------------------------------------------------------- perfil

apiRouter.get(path('me'), h(async (req, res) => ok(res, await profile.getMe(userId(req), req.user?.email))));

apiRouter.patch(
  path('updateMe'),
  validate({ body: updateMeSchema }),
  h(async (req, res) => ok(res, await profile.updateMe(userId(req), req.body, req.user?.email))),
);

apiRouter.get(path('myProgress'), h(async (req, res) => ok(res, await profile.getProgress(userId(req)))));

apiRouter.get(
  path('myActivity'),
  validate({ query: feedQuerySchema }),
  h(async (req, res) => {
    const { limit, cursor } = req.query as unknown as { limit: number; cursor?: string };
    return ok(res, await profile.getActivityFeed(userId(req), limit, cursor));
  }),
);

apiRouter.get(
  path('dashboard'),
  h(async (req, res) => ok(res, await profile.getDashboard(userId(req), req.user?.email))),
);

// ----------------------------------------------------------- notificaciones

apiRouter.get(path('notifications'), h(async (req, res) => ok(res, await profile.listNotifications(userId(req)))));

apiRouter.post(
  path('readNotification'),
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await profile.readNotification(userId(req), req.params.id!))),
);

apiRouter.post(
  path('readAllNotifications'),
  h(async (req, res) => ok(res, await profile.readAllNotifications(userId(req)))),
);

// ------------------------------------------- objetivos, certificados, agenda

apiRouter.get(path('goals'), h(async (req, res) => ok(res, await profile.listGoals(userId(req)))));

apiRouter.post(
  path('createGoal'),
  validate({ body: createGoalSchema }),
  h(async (req, res) => ok(res, await profile.createGoal(userId(req), req.body), 201)),
);

apiRouter.patch(
  path('updateGoal'),
  validate({ params: idParam, body: updateGoalSchema }),
  h(async (req, res) => ok(res, await profile.updateGoal(userId(req), req.params.id!, req.body))),
);

apiRouter.delete(
  path('deleteGoal'),
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await profile.deleteGoal(userId(req), req.params.id!))),
);

apiRouter.get(path('certifications'), h(async (req, res) => ok(res, await profile.listCertifications(userId(req)))));
apiRouter.get(path('calendar'), h(async (_req, res) => ok(res, await profile.listCalendar())));

// ------------------------------------------------------------------- avatar

apiRouter.get(path('avatarCatalog'), h(async (req, res) => ok(res, await avatarService.getCatalog(userId(req)))));
apiRouter.get(path('myAvatar'), h(async (req, res) => ok(res, await avatarService.getConfig(userId(req)))));

apiRouter.put(
  path('saveAvatar'),
  validate({ body: avatarConfigSchema }),
  h(async (req, res) => ok(res, await avatarService.saveConfig(userId(req), req.body))),
);

apiRouter.get(path('avatarStyles'), h(async (req, res) => ok(res, await avatarService.listStyles(userId(req)))));

apiRouter.post(
  path('createAvatarStyle'),
  validate({ body: createAvatarStyleSchema }),
  h(async (req, res) => ok(res, await avatarService.createStyle(userId(req), req.body.name, req.body.config), 201)),
);

apiRouter.patch(
  path('updateAvatarStyle'),
  validate({ params: idParam, body: updateAvatarStyleSchema }),
  h(async (req, res) => ok(res, await avatarService.renameStyle(userId(req), req.params.id!, req.body.name))),
);

apiRouter.delete(
  path('deleteAvatarStyle'),
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await avatarService.deleteStyle(userId(req), req.params.id!))),
);

apiRouter.post(
  path('equipAvatarStyle'),
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await avatarService.equipStyle(userId(req), req.params.id!))),
);

apiRouter.post(path('randomAvatar'), h(async (req, res) => ok(res, await avatarService.randomConfig(userId(req)))));

// ----------------------------------------------------------------- materias

apiRouter.get(path('subjects'), h(async (req, res) => ok(res, await learning.listSubjects(userId(req)))));

apiRouter.get(
  path('subject'),
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await learning.getSubject(userId(req), req.params.id!))),
);

apiRouter.get(
  path('subjectMissions'),
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await learning.listMissions(userId(req), { subjectId: req.params.id! }))),
);

apiRouter.get(path('learningMap'), h(async (req, res) => ok(res, await learning.getLearningMap(userId(req)))));

// ----------------------------------------------------------------- misiones

apiRouter.get(
  path('missions'),
  validate({ query: missionsQuerySchema }),
  h(async (req, res) => ok(res, await learning.listMissions(userId(req), req.query as never))),
);

apiRouter.get(
  path('mission'),
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await learning.getMission(userId(req), req.params.id!))),
);

apiRouter.get(
  path('missionBriefing'),
  aiLimiter,
  validate({ params: idParam }),
  h(async (req, res) => {
    await learning.assertMissionUnlocked(userId(req), req.params.id!);
    const mission = await content.mission(req.params.id!);
    if (!mission) throw err.notFound('Misión');
    return ok(res, {
      missionId: mission.id,
      markdown: mission.briefing_md ?? mission.description,
      keyPoints: mission.briefing_key_points,
    });
  }),
);

apiRouter.post(
  path('startMission'),
  aiLimiter,
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await attemptService.startMission(userId(req), req.params.id!), 201)),
);

// ----------------------------------------------------------------- intentos

apiRouter.get(
  path('attempt'),
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await attemptService.getAttempt(userId(req), req.params.id!))),
);

apiRouter.get(
  path('currentActivity'),
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await attemptService.getCurrentActivity(userId(req), req.params.id!))),
);

apiRouter.post(
  path('answer'),
  aiLimiter,
  validate({ params: idParam, body: answerSchema }),
  h(async (req, res) => ok(res, await attemptService.submitAnswer(userId(req), req.params.id!, req.body))),
);

apiRouter.post(
  path('hint'),
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await attemptService.requestHint(userId(req), req.params.id!))),
);

apiRouter.post(
  path('skipActivity'),
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await attemptService.skipActivity(userId(req), req.params.id!))),
);

apiRouter.post(
  path('abandonAttempt'),
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await attemptService.abandonAttempt(userId(req), req.params.id!))),
);

apiRouter.post(
  path('finishAttempt'),
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await attemptService.finishAttempt(userId(req), req.params.id!))),
);

apiRouter.get(
  path('attemptResult'),
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await attemptService.getResult(userId(req), req.params.id!))),
);

apiRouter.post(
  path('explainAnswer'),
  aiLimiter,
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await attemptService.explainAnswer(userId(req), req.params.id!))),
);

// -------------------------------------------------------- logros y retos

apiRouter.get(path('achievements'), h(async (req, res) => ok(res, await social.listAchievements(userId(req)))));
apiRouter.get(path('badges'), h(async (req, res) => ok(res, await social.listBadges(userId(req)))));
apiRouter.get(path('challenges'), h(async (req, res) => ok(res, await social.listChallenges(userId(req)))));

apiRouter.post(
  path('joinChallenge'),
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await social.joinChallenge(userId(req), req.params.id!))),
);

// -------------------------------------------------------------------- racha

apiRouter.get(path('streak'), h(async (req, res) => ok(res, await social.getStreak(userId(req)))));
apiRouter.post(path('claimStreak'), h(async (req, res) => ok(res, await social.claimStreak(userId(req)))));

// ----------------------------------------------------------------- economía

apiRouter.get(path('shopItems'), h(async (req, res) => ok(res, await economyService.listShopItems(userId(req)))));

apiRouter.post(
  path('purchase'),
  validate({ body: purchaseSchema }),
  h(async (req, res) => ok(res, await economyService.purchase(userId(req), req.body), 201)),
);

apiRouter.get(
  path('inventory'),
  validate({ query: inventoryQuerySchema }),
  h(async (req, res) => ok(res, await economyService.listInventory(userId(req), req.query as never))),
);

apiRouter.post(
  path('equipItem'),
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await economyService.equipItem(userId(req), req.params.id!))),
);

apiRouter.post(
  path('useItem'),
  validate({ params: idParam, body: useItemSchema.default({}) }),
  h(async (req, res) => ok(res, await economyService.useItem(userId(req), req.params.id!, req.body?.attemptId))),
);

// ---------------------------------------------------------------- comunidad

apiRouter.get(
  path('leaderboard'),
  validate({ query: leaderboardQuerySchema }),
  h(async (req, res) => {
    const q = req.query as unknown as {
      scope: 'global' | 'friends' | 'class';
      period: 'week' | 'month' | 'all';
      limit: number;
      classId?: string;
    };
    return ok(res, await social.getLeaderboard(userId(req), q.scope, q.period, q.limit, q.classId));
  }),
);

apiRouter.get(path('friends'), h(async (req, res) => ok(res, await social.listFriends(userId(req)))));

apiRouter.post(
  path('sendFriendRequest'),
  validate({ body: friendRequestSchema }),
  h(async (req, res) => ok(res, await social.sendFriendRequest(userId(req), req.body.username), 201)),
);

apiRouter.post(
  path('acceptFriendRequest'),
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await social.respondFriendRequest(userId(req), req.params.id!, true))),
);

apiRouter.post(
  path('rejectFriendRequest'),
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await social.respondFriendRequest(userId(req), req.params.id!, false))),
);

apiRouter.delete(
  path('removeFriend'),
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await social.removeFriend(userId(req), req.params.id!))),
);

apiRouter.get(path('classes'), h(async (req, res) => ok(res, await social.listClasses(userId(req)))));

apiRouter.get(
  path('classDetail'),
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await social.getClass(userId(req), req.params.id!))),
);

apiRouter.post(
  path('joinClass'),
  validate({ body: joinClassSchema }),
  h(async (req, res) => ok(res, await social.joinClass(userId(req), req.body.code), 201)),
);

apiRouter.post(
  path('leaveClass'),
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await social.leaveClass(userId(req), req.params.id!))),
);

apiRouter.get(
  path('communityFeed'),
  validate({ query: feedQuerySchema }),
  h(async (req, res) => {
    const { limit, cursor } = req.query as unknown as { limit: number; cursor?: string };
    return ok(res, await social.getCommunityFeed(userId(req), limit, cursor));
  }),
);

apiRouter.post(
  path('createPost'),
  validate({ body: createPostSchema }),
  h(async (req, res) => ok(res, await social.createPost(userId(req), req.body.message), 201)),
);

apiRouter.post(
  path('likePost'),
  validate({ params: idParam }),
  h(async (req, res) => ok(res, await social.likePost(userId(req), req.params.id!))),
);

apiRouter.get(path('teamChallenges'), h(async (_req, res) => ok(res, await social.listTeamChallenges())));

// ---------------------------------------------------------------- búsqueda

apiRouter.get(
  path('search'),
  validate({ query: searchQuerySchema }),
  h(async (req, res) => {
    const { q, limit } = req.query as unknown as { q: string; limit: number };
    return ok(res, await profile.search(userId(req), q, limit));
  }),
);

// ------------------------------------------------------------------- admin

const admin = Router();
admin.use(requireAdmin);

admin.post(
  '/missions/:id/generate',
  aiLimiter,
  validate({ params: idParam }),
  h(async (req, res) => {
    // Sin proveedor de IA activo se responde con lo que ya hay cacheado.
    const activities = await content.activities(req.params.id!);
    return ok(res, { missionId: req.params.id, activitiesGenerated: activities.length });
  }),
);

admin.get(
  '/ai-costs',
  h(async (_req, res) => ok(res, { periodDays: 30, totalCostUsd: 0, totalCalls: 0 })),
);

apiRouter.use('/admin', admin);
