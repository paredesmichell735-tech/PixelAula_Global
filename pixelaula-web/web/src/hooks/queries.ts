import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PixelAulaError } from '@pixelaula/api';
import { api } from '../lib/api';

/**
 * Consultas a la API. Las claves están centralizadas para poder invalidar
 * con precisión: al terminar una misión cambian el perfil, el mapa, la racha
 * y los logros a la vez.
 */
export const keys = {
  me: ['me'] as const,
  dashboard: ['dashboard'] as const,
  progress: ['progress'] as const,
  activity: ['activity'] as const,
  subjects: ['subjects'] as const,
  map: ['map'] as const,
  mission: (id: string) => ['mission', id] as const,
  subjectMissions: (id: string) => ['subject-missions', id] as const,
  attempt: (id: string) => ['attempt', id] as const,
  achievements: ['achievements'] as const,
  badges: ['badges'] as const,
  challenges: ['challenges'] as const,
  streak: ['streak'] as const,
  leaderboard: (scope: string, period: string) => ['leaderboard', scope, period] as const,
  friends: ['friends'] as const,
  classes: ['classes'] as const,
  feed: ['community-feed'] as const,
  shop: ['shop'] as const,
  inventory: ['inventory'] as const,
  avatarCatalog: ['avatar-catalog'] as const,
  avatarStyles: ['avatar-styles'] as const,
  notifications: ['notifications'] as const,
};

/** No tiene sentido reintentar un 403 o un 409: el servidor ya decidió. */
function retry(failureCount: number, error: unknown): boolean {
  if (error instanceof PixelAulaError && !error.isRetryable) return false;
  return failureCount < 2;
}

const common = { retry, staleTime: 30_000 };

export const useMe = () => useQuery({ queryKey: keys.me, queryFn: () => api.me(), ...common });
export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: () => api.dashboard(), ...common });
export const useProgress = () => useQuery({ queryKey: keys.progress, queryFn: () => api.myProgress(), ...common });
export const useSubjects = () => useQuery({ queryKey: keys.subjects, queryFn: () => api.subjects(), ...common });
export const useLearningMap = () => useQuery({ queryKey: keys.map, queryFn: () => api.learningMap(), ...common });
export const useAchievements = () => useQuery({ queryKey: keys.achievements, queryFn: () => api.achievements(), ...common });
export const useBadges = () => useQuery({ queryKey: keys.badges, queryFn: () => api.badges(), ...common });
export const useChallenges = () => useQuery({ queryKey: keys.challenges, queryFn: () => api.challenges(), ...common });
export const useStreak = () => useQuery({ queryKey: keys.streak, queryFn: () => api.streak(), ...common });
export const useFriends = () => useQuery({ queryKey: keys.friends, queryFn: () => api.friends(), ...common });
export const useClasses = () => useQuery({ queryKey: keys.classes, queryFn: () => api.classes(), ...common });
export const useShopItems = () => useQuery({ queryKey: keys.shop, queryFn: () => api.shopItems(), ...common });
export const useInventory = () => useQuery({ queryKey: keys.inventory, queryFn: () => api.inventory(), ...common });
export const useAvatarCatalog = () => useQuery({ queryKey: keys.avatarCatalog, queryFn: () => api.avatarCatalog(), ...common });
export const useAvatarStyles = () => useQuery({ queryKey: keys.avatarStyles, queryFn: () => api.avatarStyles(), ...common });
export const useNotifications = () => useQuery({ queryKey: keys.notifications, queryFn: () => api.notifications(), ...common });
export const useActivityFeed = () => useQuery({ queryKey: keys.activity, queryFn: () => api.myActivity({ limit: 8 }), ...common });

export const useMission = (id: string | undefined) =>
  useQuery({ queryKey: keys.mission(id ?? ''), queryFn: () => api.mission(id!), enabled: Boolean(id), ...common });

export const useSubjectMissions = (id: string | undefined) =>
  useQuery({
    queryKey: keys.subjectMissions(id ?? ''),
    queryFn: () => api.subjectMissions(id!),
    enabled: Boolean(id),
    ...common,
  });

export const useLeaderboard = (scope: 'global' | 'friends' | 'class', period: 'week' | 'month' | 'all') =>
  useQuery({ queryKey: keys.leaderboard(scope, period), queryFn: () => api.leaderboard({ scope, period }), ...common });

export const useCommunityFeed = () =>
  useQuery({ queryKey: keys.feed, queryFn: () => api.communityFeed({ limit: 10 }), ...common });

// ---------------------------------------------------------------------------
// Mutaciones
// ---------------------------------------------------------------------------

/** Lo que cambia cuando se completa una misión o se gana algo. */
function invalidateProgress(qc: ReturnType<typeof useQueryClient>) {
  for (const key of [keys.me, keys.dashboard, keys.progress, keys.map, keys.subjects,
                     keys.achievements, keys.badges, keys.streak, keys.activity]) {
    void qc.invalidateQueries({ queryKey: key });
  }
}

export function useClaimStreak() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.claimStreak(),
    onSuccess: () => invalidateProgress(qc),
  });
}

export function useSaveAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveAvatar.bind(api),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.me });
      void qc.invalidateQueries({ queryKey: keys.avatarCatalog });
    },
  });
}

export function useCreateAvatarStyle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.createAvatarStyle({ name }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.avatarStyles }),
  });
}

export function usePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => api.purchase({ itemId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.me });
      void qc.invalidateQueries({ queryKey: keys.shop });
      void qc.invalidateQueries({ queryKey: keys.inventory });
    },
  });
}

export function useJoinClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.joinClass({ code }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.classes });
      void qc.invalidateQueries({ queryKey: keys.leaderboard('class', 'all') });
    },
  });
}

export function useLikePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => api.likePost(postId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.feed }),
  });
}

export { invalidateProgress };
