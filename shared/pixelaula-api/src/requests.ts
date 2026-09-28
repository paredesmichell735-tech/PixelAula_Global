import type {
  AvatarConfig,
  InventoryCategory,
  LeaderboardPeriod,
  LeaderboardScope,
} from './types.js';

/**
 * Cuerpos de petición. El backend valida estos mismos shapes con Zod
 * (ver schemas.ts), así que si un cliente manda otra cosa recibe 422 con
 * el detalle del campo que falla.
 */

export interface RegisterProfileBody {
  username: string;
  displayName: string;
}

export interface UpdateMeBody {
  username?: string;
  displayName?: string;
  title?: string;
}

/**
 * Respuesta a una actividad. El `type` tiene que coincidir con el de la
 * actividad actual: así el servidor sabe cómo evaluarla y el cliente no
 * puede colar un formato que salte la validación.
 */
export type ActivityAnswer =
  | { type: 'MULTIPLE_CHOICE'; optionId: string }
  | { type: 'IMAGE_SELECTION'; optionId: string }
  | { type: 'TRUE_FALSE'; value: boolean }
  | { type: 'ORDERING'; order: string[] }
  | { type: 'MATCHING'; pairs: Array<{ concept: string; definition: string }> }
  | { type: 'DRAG_DROP'; placements: Record<string, string> }
  | { type: 'SQL_CHALLENGE'; value: string }
  | {
      type: 'NETWORK_SIMULATION';
      connections: Array<{ from: string; to: string }>;
      deviceConfig?: Record<string, { ip?: string; gateway?: string }>;
    }
  | {
      type: 'CIRCUIT_SIMULATION';
      components: Array<{ id: string; state: 'OPEN' | 'CLOSED' | 'PLACED' }>;
      connections: Array<{ from: string; to: string }>;
    };

export interface AnswerBody {
  /** UUID que genera el cliente. Hace la petición idempotente. */
  clientAttemptId: string;
  answer: ActivityAnswer;
  timeSpentMs?: number;
}

export interface PurchaseBody {
  itemId: string;
  quantity?: number;
  currency?: 'COINS' | 'GEMS';
}

export interface CreateAvatarStyleBody {
  name: string;
  /** Si se omite, guarda el look que tienes puesto. */
  config?: AvatarConfig;
}

export interface CreateGoalBody {
  title: string;
  subjectId?: string;
  targetValue: number;
  dueDate?: string;
}

export interface UpdateGoalBody {
  title?: string;
  currentValue?: number;
  targetValue?: number;
  dueDate?: string | null;
  completed?: boolean;
}

export interface JoinClassBody {
  code: string;
}

export interface FriendRequestBody {
  username: string;
}

export interface CreatePostBody {
  message: string;
}

// ---------------------------------------------------------------------------
// Query strings
// ---------------------------------------------------------------------------

export interface MissionsQuery {
  subjectId?: string;
  status?: 'LOCKED' | 'ACTIVE' | 'COMPLETED';
  limit?: number;
  cursor?: string;
}

export interface LeaderboardQuery {
  scope?: LeaderboardScope;
  period?: LeaderboardPeriod;
  classId?: string;
  limit?: number;
}

export interface ActivityFeedQuery {
  limit?: number;
  cursor?: string;
}

export interface InventoryQuery {
  category?: InventoryCategory;
  ownedOnly?: boolean;
}

export interface SearchQuery {
  q: string;
  limit?: number;
}
