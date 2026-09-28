/**
 * Códigos de error del contrato. Los clientes hacen `switch` sobre el código,
 * nunca sobre el mensaje: el mensaje puede reescribirse, el código no.
 */
export const ERROR_CODES = {
  // Autenticación y permisos
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  PROFILE_REQUIRED: 'PROFILE_REQUIRED',
  USERNAME_TAKEN: 'USERNAME_TAKEN',

  // Genéricos
  NOT_FOUND: 'NOT_FOUND',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_JSON: 'INVALID_JSON',
  RATE_LIMITED: 'RATE_LIMITED',
  AI_RATE_LIMITED: 'AI_RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',

  // Progresión
  SUBJECT_LOCKED: 'SUBJECT_LOCKED',
  MISSION_LOCKED: 'MISSION_LOCKED',
  MISSION_LEVEL_TOO_LOW: 'MISSION_LEVEL_TOO_LOW',
  NO_CONTENT_AVAILABLE: 'NO_CONTENT_AVAILABLE',

  // Intentos
  ATTEMPT_ALREADY_FINISHED: 'ATTEMPT_ALREADY_FINISHED',
  ATTEMPT_NOT_ACTIVE: 'ATTEMPT_NOT_ACTIVE',
  NO_CURRENT_ACTIVITY: 'NO_CURRENT_ACTIVITY',
  NO_MORE_HINTS: 'NO_MORE_HINTS',
  ANSWER_WAS_CORRECT: 'ANSWER_WAS_CORRECT',

  // Economía
  INSUFFICIENT_COINS: 'INSUFFICIENT_COINS',
  INSUFFICIENT_GEMS: 'INSUFFICIENT_GEMS',
  ITEM_NOT_OWNED: 'ITEM_NOT_OWNED',
  ITEM_ALREADY_OWNED: 'ITEM_ALREADY_OWNED',
  LEVEL_TOO_LOW: 'LEVEL_TOO_LOW',

  // Meta
  STREAK_ALREADY_CLAIMED: 'STREAK_ALREADY_CLAIMED',
  DAILY_REWARD_ALREADY_CLAIMED: 'DAILY_REWARD_ALREADY_CLAIMED',

  // Comunidad
  FRIEND_REQUEST_EXISTS: 'FRIEND_REQUEST_EXISTS',
  ALREADY_FRIENDS: 'ALREADY_FRIENDS',
  CANNOT_FRIEND_SELF: 'CANNOT_FRIEND_SELF',
  CLASS_CODE_INVALID: 'CLASS_CODE_INVALID',
  ALREADY_IN_CLASS: 'ALREADY_IN_CLASS',

  // Contenido generado
  AI_GENERATION_FAILED: 'AI_GENERATION_FAILED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Error tipado que lanza el cliente. Mismo objeto en web y en móvil. */
export class PixelAulaError extends Error {
  constructor(
    public readonly code: ErrorCode | string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'PixelAulaError';
  }

  /** ¿Merece la pena reintentar sin cambiar nada? */
  get isRetryable(): boolean {
    return (
      this.code === ERROR_CODES.NETWORK_ERROR ||
      this.code === ERROR_CODES.TIMEOUT ||
      this.status >= 500
    );
  }

  get isAuthError(): boolean {
    return this.code === ERROR_CODES.UNAUTHORIZED || this.status === 401;
  }
}

/** Mensajes por defecto en español, por si el cliente quiere uno propio. */
export const ERROR_MESSAGES: Partial<Record<string, string>> = {
  [ERROR_CODES.UNAUTHORIZED]: 'Tu sesión expiró. Vuelve a entrar.',
  [ERROR_CODES.FORBIDDEN]: 'No tienes permiso para esto.',
  [ERROR_CODES.PROFILE_REQUIRED]: 'Primero completa tu perfil.',
  [ERROR_CODES.USERNAME_TAKEN]: 'Ese nombre de usuario ya está ocupado.',
  [ERROR_CODES.NOT_FOUND]: 'No encontramos lo que buscabas.',
  [ERROR_CODES.VALIDATION_ERROR]: 'Revisa los datos que enviaste.',
  [ERROR_CODES.RATE_LIMITED]: 'Vas muy rápido. Espera un momento.',
  [ERROR_CODES.AI_RATE_LIMITED]: 'Estás pidiendo ayuda muy seguido. Respira y vuelve en un minuto.',
  [ERROR_CODES.SUBJECT_LOCKED]: 'Esta materia todavía no está disponible.',
  [ERROR_CODES.MISSION_LOCKED]: 'Completa la misión anterior para desbloquear esta.',
  [ERROR_CODES.NO_CONTENT_AVAILABLE]: 'Esta misión aún no tiene actividades.',
  [ERROR_CODES.ATTEMPT_ALREADY_FINISHED]: 'Esta misión ya terminó.',
  [ERROR_CODES.NO_MORE_HINTS]: 'Ya usaste todas las pistas de esta actividad.',
  [ERROR_CODES.INSUFFICIENT_COINS]: 'No tienes suficientes Pixeles.',
  [ERROR_CODES.INSUFFICIENT_GEMS]: 'No tienes suficientes gemas.',
  [ERROR_CODES.ITEM_NOT_OWNED]: 'Todavía no tienes ese objeto.',
  [ERROR_CODES.STREAK_ALREADY_CLAIMED]: 'Ya reclamaste tu recompensa de hoy.',
  [ERROR_CODES.CLASS_CODE_INVALID]: 'Ese código de clase no existe.',
  [ERROR_CODES.NETWORK_ERROR]: 'Sin conexión. Revisa tu internet.',
  [ERROR_CODES.TIMEOUT]: 'El servidor tardó demasiado. Inténtalo otra vez.',
  [ERROR_CODES.INTERNAL_ERROR]: 'Algo falló de nuestro lado. Inténtalo de nuevo.',
};

export function messageFor(code: string, fallback: string): string {
  return ERROR_MESSAGES[code] ?? fallback;
}
