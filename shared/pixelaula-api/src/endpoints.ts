/**
 * Catálogo de endpoints de PixelAula.
 *
 * Es la lista completa que consumen por igual la web y la app. Sirve de tres
 * cosas a la vez: documentación, fuente de las rutas del cliente y checklist
 * de lo que el backend tiene que implementar.
 *
 * `slow: true` marca los que pueden llamar al modelo de IA: los clientes les
 * dan un timeout largo (60 s) y el backend les aplica el rate limit estricto.
 */

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface EndpointSpec {
  method: HttpMethod;
  /** Ruta relativa a /api/v1. `:param` marca los segmentos variables. */
  path: string;
  summary: string;
  /** false solo en salud, manifiesto de assets y catálogo público. */
  auth: boolean;
  slow?: boolean;
}

export const ENDPOINTS = {
  // ---------------------------------------------------------------- Sistema
  health: { method: 'GET', path: '/health', summary: 'Estado del servicio', auth: false },
  assetManifest: { method: 'GET', path: '/assets/manifest', summary: 'Manifiesto de sprites con versión', auth: false },

  // ------------------------------------------------------------ Sesión y yo
  session: { method: 'GET', path: '/auth/session', summary: 'Usuario de la sesión actual', auth: true },
  registerProfile: { method: 'POST', path: '/auth/profile', summary: 'Completar el alta tras el registro', auth: true },
  me: { method: 'GET', path: '/me', summary: 'Mi usuario completo', auth: true },
  updateMe: { method: 'PATCH', path: '/me', summary: 'Actualizar nombre visible, username o título', auth: true },
  myProgress: { method: 'GET', path: '/me/progress', summary: 'Resumen de progreso y actividad semanal', auth: true },
  myActivity: { method: 'GET', path: '/me/activity', summary: 'Actividad reciente', auth: true },
  dashboard: { method: 'GET', path: '/me/dashboard', summary: 'Todo el panel de inicio en una llamada', auth: true },

  // ------------------------------------------------------------ Notificaciones
  notifications: { method: 'GET', path: '/me/notifications', summary: 'Mis notificaciones', auth: true },
  readNotification: { method: 'POST', path: '/me/notifications/:id/read', summary: 'Marcar una como leída', auth: true },
  readAllNotifications: { method: 'POST', path: '/me/notifications/read-all', summary: 'Marcar todas como leídas', auth: true },

  // --------------------------------------------------- Objetivos y certificados
  goals: { method: 'GET', path: '/me/goals', summary: 'Mis objetivos de aprendizaje', auth: true },
  createGoal: { method: 'POST', path: '/me/goals', summary: 'Crear un objetivo', auth: true },
  updateGoal: { method: 'PATCH', path: '/me/goals/:id', summary: 'Actualizar un objetivo', auth: true },
  deleteGoal: { method: 'DELETE', path: '/me/goals/:id', summary: 'Borrar un objetivo', auth: true },
  certifications: { method: 'GET', path: '/me/certifications', summary: 'Mis certificaciones', auth: true },
  calendar: { method: 'GET', path: '/me/calendar', summary: 'Clases en vivo y próximas fechas', auth: true },

  // -------------------------------------------------------------------- Avatar
  avatarCatalog: { method: 'GET', path: '/avatar/catalog', summary: 'Catálogo de piezas por categoría', auth: true },
  myAvatar: { method: 'GET', path: '/me/avatar', summary: 'Mi configuración de avatar', auth: true },
  saveAvatar: { method: 'PUT', path: '/me/avatar', summary: 'Guardar la configuración del avatar', auth: true },
  avatarStyles: { method: 'GET', path: '/me/avatar/styles', summary: 'Mis estilos guardados', auth: true },
  createAvatarStyle: { method: 'POST', path: '/me/avatar/styles', summary: 'Guardar el look actual como estilo', auth: true },
  updateAvatarStyle: { method: 'PATCH', path: '/me/avatar/styles/:id', summary: 'Renombrar un estilo', auth: true },
  deleteAvatarStyle: { method: 'DELETE', path: '/me/avatar/styles/:id', summary: 'Borrar un estilo', auth: true },
  equipAvatarStyle: { method: 'POST', path: '/me/avatar/styles/:id/equip', summary: 'Equipar un estilo guardado', auth: true },
  randomAvatar: { method: 'POST', path: '/me/avatar/random', summary: 'Generar un look aleatorio con lo que tengo', auth: true },

  // ------------------------------------------------------------------ Materias
  subjects: { method: 'GET', path: '/subjects', summary: 'Catálogo de materias con mi progreso', auth: true },
  subject: { method: 'GET', path: '/subjects/:id', summary: 'Detalle de una materia', auth: true },
  subjectMissions: { method: 'GET', path: '/subjects/:id/missions', summary: 'Misiones de una materia', auth: true },
  learningMap: { method: 'GET', path: '/map', summary: 'Mapa de aprendizaje completo', auth: true },

  // ------------------------------------------------------------------ Misiones
  missions: { method: 'GET', path: '/missions', summary: 'Misiones filtrables por materia y estado', auth: true },
  mission: { method: 'GET', path: '/missions/:id', summary: 'Detalle de misión con objetivos y recompensas', auth: true },
  missionBriefing: { method: 'GET', path: '/missions/:id/briefing', summary: 'Lección previa (la genera la IA si falta)', auth: true, slow: true },
  startMission: { method: 'POST', path: '/missions/:id/attempts', summary: 'Iniciar o reanudar un intento', auth: true, slow: true },

  // ------------------------------------------------------------------ Intentos
  attempt: { method: 'GET', path: '/attempts/:id', summary: 'Estado del intento, para reanudar', auth: true },
  currentActivity: { method: 'GET', path: '/attempts/:id/current', summary: 'Actividad actual, sin la respuesta correcta', auth: true },
  answer: { method: 'POST', path: '/attempts/:id/answer', summary: 'Enviar respuesta (idempotente)', auth: true, slow: true },
  hint: { method: 'POST', path: '/attempts/:id/hint', summary: 'Pedir la siguiente pista (cuesta gemas)', auth: true },
  skipActivity: { method: 'POST', path: '/attempts/:id/skip', summary: 'Saltar la actividad actual', auth: true },
  abandonAttempt: { method: 'POST', path: '/attempts/:id/abandon', summary: 'Abandonar el intento', auth: true },
  finishAttempt: { method: 'POST', path: '/attempts/:id/finish', summary: 'Cerrar el intento y calcular resultado', auth: true },
  attemptResult: { method: 'GET', path: '/attempts/:id/result', summary: 'Pantalla de misión completada', auth: true },
  explainAnswer: { method: 'POST', path: '/answers/:id/explain', summary: 'Explicación paso a paso del fallo', auth: true, slow: true },

  // -------------------------------------------------------- Logros e insignias
  achievements: { method: 'GET', path: '/achievements', summary: 'Logros con mi progreso', auth: true },
  badges: { method: 'GET', path: '/badges', summary: 'Insignias', auth: true },
  challenges: { method: 'GET', path: '/challenges', summary: 'Retos activos', auth: true },
  joinChallenge: { method: 'POST', path: '/challenges/:id/join', summary: 'Unirse a un reto', auth: true },

  // ---------------------------------------------------------------- Racha
  streak: { method: 'GET', path: '/streak', summary: 'Mi racha', auth: true },
  claimStreak: { method: 'POST', path: '/streak/claim', summary: 'Reclamar la recompensa diaria', auth: true },

  // ---------------------------------------------------------------- Economía
  shopItems: { method: 'GET', path: '/shop/items', summary: 'Catálogo de la tienda', auth: true },
  purchase: { method: 'POST', path: '/shop/purchase', summary: 'Comprar un objeto', auth: true },
  inventory: { method: 'GET', path: '/me/inventory', summary: 'Mi inventario', auth: true },
  equipItem: { method: 'POST', path: '/me/inventory/:id/equip', summary: 'Equipar un objeto', auth: true },
  useItem: { method: 'POST', path: '/me/inventory/:id/use', summary: 'Usar un consumible', auth: true },

  // --------------------------------------------------------------- Comunidad
  leaderboard: { method: 'GET', path: '/leaderboard', summary: 'Ranking por alcance y periodo', auth: true },
  friends: { method: 'GET', path: '/friends', summary: 'Mis amigos y solicitudes', auth: true },
  sendFriendRequest: { method: 'POST', path: '/friends/requests', summary: 'Enviar solicitud de amistad', auth: true },
  acceptFriendRequest: { method: 'POST', path: '/friends/requests/:id/accept', summary: 'Aceptar solicitud', auth: true },
  rejectFriendRequest: { method: 'POST', path: '/friends/requests/:id/reject', summary: 'Rechazar solicitud', auth: true },
  removeFriend: { method: 'DELETE', path: '/friends/:id', summary: 'Eliminar amistad', auth: true },
  classes: { method: 'GET', path: '/classes', summary: 'Ranking de clases', auth: true },
  classDetail: { method: 'GET', path: '/classes/:id', summary: 'Detalle de una clase', auth: true },
  joinClass: { method: 'POST', path: '/classes/join', summary: 'Unirse a una clase por código', auth: true },
  leaveClass: { method: 'POST', path: '/classes/:id/leave', summary: 'Salir de una clase', auth: true },
  communityFeed: { method: 'GET', path: '/community/feed', summary: 'Actividad de la comunidad', auth: true },
  createPost: { method: 'POST', path: '/community/feed', summary: 'Publicar en la comunidad', auth: true },
  likePost: { method: 'POST', path: '/community/feed/:id/like', summary: 'Dar o quitar me gusta', auth: true },
  teamChallenges: { method: 'GET', path: '/community/team-challenges', summary: 'Desafíos por equipos', auth: true },

  // ------------------------------------------------------------------ Búsqueda
  search: { method: 'GET', path: '/search', summary: 'Buscar materias, misiones y logros', auth: true },

  // ---------------------------------------------------------------- Admin
  adminGenerateMission: { method: 'POST', path: '/admin/missions/:id/generate', summary: 'Regenerar el contenido de una misión', auth: true, slow: true },
  adminCreateSubject: { method: 'POST', path: '/admin/subjects', summary: 'Crear materia', auth: true },
  adminUpdateSubject: { method: 'PATCH', path: '/admin/subjects/:id', summary: 'Actualizar materia', auth: true },
  adminCreateMission: { method: 'POST', path: '/admin/missions', summary: 'Crear misión', auth: true },
  adminUpdateMission: { method: 'PATCH', path: '/admin/missions/:id', summary: 'Actualizar misión', auth: true },
  adminAiCosts: { method: 'GET', path: '/admin/ai-costs', summary: 'Gasto de IA de los últimos 30 días', auth: true },
} as const satisfies Record<string, EndpointSpec>;

export type EndpointName = keyof typeof ENDPOINTS;

/** Sustituye `:param` por valores reales. */
export function buildPath(path: string, params: Record<string, string | number> = {}): string {
  return path.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_match, key: string) => {
    const value = params[key];
    if (value === undefined) throw new Error(`Falta el parámetro de ruta "${key}" en "${path}"`);
    return encodeURIComponent(String(value));
  });
}

/** Lista plana, útil para generar documentación o comprobar cobertura. */
export const ENDPOINT_LIST: Array<EndpointSpec & { name: EndpointName }> = (
  Object.entries(ENDPOINTS) as Array<[EndpointName, EndpointSpec]>
).map(([name, spec]) => ({ name, ...spec }));
