import { ERROR_CODES } from '@pixelaula/api';

/**
 * Errores de dominio. El `code` es contrato público: los clientes hacen
 * switch sobre él, nunca sobre el mensaje. La lista vive en el paquete
 * compartido, así que web y app conocen todos los códigos posibles.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const err = {
  unauthorized: (msg = 'Tu sesión expiró. Vuelve a entrar.') =>
    new AppError(ERROR_CODES.UNAUTHORIZED, msg, 401),
  forbidden: (msg = 'No tienes permiso para esto.') =>
    new AppError(ERROR_CODES.FORBIDDEN, msg, 403),
  notFound: (what = 'Recurso') =>
    new AppError(ERROR_CODES.NOT_FOUND, `${what} no encontrado.`, 404),
  validation: (details: unknown) =>
    new AppError(ERROR_CODES.VALIDATION_ERROR, 'Revisa los datos que enviaste.', 422, details),
  conflict: (code: string, msg: string) => new AppError(code, msg, 409),
  internal: (msg = 'Algo falló de nuestro lado. Inténtalo de nuevo.') =>
    new AppError(ERROR_CODES.INTERNAL_ERROR, msg, 500),

  profileRequired: () =>
    new AppError(ERROR_CODES.PROFILE_REQUIRED, 'Primero completa tu perfil.', 409),
  usernameTaken: () =>
    new AppError(ERROR_CODES.USERNAME_TAKEN, 'Ese nombre de usuario ya está ocupado.', 409),

  subjectLocked: () =>
    new AppError(ERROR_CODES.SUBJECT_LOCKED, 'Esta materia todavía no está disponible.', 403),
  missionLocked: () =>
    new AppError(ERROR_CODES.MISSION_LOCKED, 'Completa la misión anterior para desbloquear esta.', 403),
  levelTooLow: (level: number) =>
    new AppError(ERROR_CODES.MISSION_LEVEL_TOO_LOW, `Necesitas ser nivel ${level} para entrar aquí.`, 403),
  noContent: () =>
    new AppError(ERROR_CODES.NO_CONTENT_AVAILABLE, 'Esta misión aún no tiene actividades.', 409),

  attemptFinished: () =>
    new AppError(ERROR_CODES.ATTEMPT_ALREADY_FINISHED, 'Esta misión ya terminó.', 409),
  noCurrentActivity: () =>
    new AppError(ERROR_CODES.NO_CURRENT_ACTIVITY, 'No queda ninguna actividad pendiente.', 409),
  noMoreHints: () =>
    new AppError(ERROR_CODES.NO_MORE_HINTS, 'Ya usaste todas las pistas de esta actividad.', 409),
  answerWasCorrect: () =>
    new AppError(ERROR_CODES.ANSWER_WAS_CORRECT, 'Esa respuesta fue correcta: no hay nada que explicar.', 409),

  insufficientCoins: () =>
    new AppError(ERROR_CODES.INSUFFICIENT_COINS, 'No tienes suficientes Pixeles.', 409),
  insufficientGems: () =>
    new AppError(ERROR_CODES.INSUFFICIENT_GEMS, 'No tienes suficientes gemas.', 409),
  itemNotOwned: () =>
    new AppError(ERROR_CODES.ITEM_NOT_OWNED, 'Todavía no tienes ese objeto.', 409),

  streakClaimed: () =>
    new AppError(ERROR_CODES.STREAK_ALREADY_CLAIMED, 'Ya reclamaste tu recompensa de hoy.', 409),

  aiFailed: (details?: unknown) =>
    new AppError(ERROR_CODES.AI_GENERATION_FAILED, 'No pudimos generar el contenido. Inténtalo de nuevo.', 502, details),
};

/** Traduce las excepciones que levantan las funciones Postgres. */
const PG_CODES: Record<string, () => AppError> = {
  ATTEMPT_NOT_FOUND: () => err.notFound('Intento'),
  ATTEMPT_ALREADY_FINISHED: () => err.attemptFinished(),
  INSUFFICIENT_COINS: () => err.insufficientCoins(),
  INSUFFICIENT_GEMS: () => err.insufficientGems(),
  ITEM_NOT_FOUND: () => err.notFound('Objeto'),
  LEVEL_TOO_LOW: () => new AppError(ERROR_CODES.LEVEL_TOO_LOW, 'Tu nivel aún no alcanza para esto.', 409),
  INVALID_QUANTITY: () => err.validation({ quantity: 'Cantidad inválida.' }),
  CANNOT_MODIFY_ADMIN_FLAG: () => err.forbidden('No puedes cambiar tus propios permisos.'),
};

export function fromPostgres(message: string | undefined): AppError {
  for (const [code, build] of Object.entries(PG_CODES)) {
    if (message?.includes(code)) return build();
  }
  // Un mensaje que no reconocemos NO se traga: se conserva para el log y,
  // fuera de producción, viaja en `details`. Perder la causa deja un 500
  // imposible de diagnosticar.
  return new AppError(
    ERROR_CODES.INTERNAL_ERROR,
    'Algo falló de nuestro lado. Inténtalo de nuevo.',
    500,
    { postgres: message ?? 'sin mensaje' },
  );
}
