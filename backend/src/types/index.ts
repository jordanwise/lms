// Game types duplicated from /types/game.ts to avoid rootDir issues.
// Keep in sync with the frontend types.

export type GameState =
  | 'created'
  | 'waiting_for_players'
  | 'active'
  | 'completed'
  | 'rollover_pending'
  | 'cancelled'
  | 'abandoned';

export type RoundState =
  | 'pending'
  | 'picking'
  | 'locked'
  | 'processing'
  | 'complete';

export type PlayerStatus = 'alive' | 'eliminated' | 'deferred' | 'left';

export type PickOutcome = 'win' | 'loss' | 'draw' | 'postponed';

// ──────────────────────────────────────────────
// User Profile
// ──────────────────────────────────────────────

export interface UserPreferences {
  notificationsEnabled: boolean;
  notifyOnRoundOpen: boolean;
  notifyOnDeadlineReminder: boolean;
  notifyOnResults: boolean;
  notifyOnElimination: boolean;
  theme: 'dark' | 'light';
  favouriteLeagues: string[];
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  notificationsEnabled: true,
  notifyOnRoundOpen: true,
  notifyOnDeadlineReminder: true,
  notifyOnResults: true,
  notifyOnElimination: true,
  theme: 'dark',
  favouriteLeagues: [],
};

export interface UserProfileItem {
  PK: string;       // USER#<userId>
  SK: string;       // 'PROFILE'
  userId: string;
  displayName: string;
  avatarUrl?: string;
  preferences: UserPreferences;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

// ──────────────────────────────────────────────
// Game Meta
// ──────────────────────────────────────────────

export interface GameMetaItem {
  PK: string;        // GAME#<gameId>
  SK: string;        // 'META'
  GSI1PK: string;    // PIN#<pin>
  gameId: string;
  name: string;
  pin: string;
  fee: number;
  leagues: string[];
  rollover: boolean;
  splitPot: boolean;
  state: GameState;
  roundState?: RoundState;
  currentRound: number;
  creatorId: string;
  prizePool: number;
  playerCount: number;
  version: number;   // optimistic locking
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────
// Player (in a game)
// ──────────────────────────────────────────────

export interface PlayerItem {
  PK: string;        // GAME#<gameId>
  SK: string;        // PLAYER#<userId>
  GSI2PK: string;    // USER#<userId>
  GSI2SK: string;    // GAME#<gameId>
  gameId: string;
  userId: string;
  displayName: string;
  status: PlayerStatus;
  paidFee: boolean;
  // Denormalized for "My Games" GSI2 queries
  gameName: string;
  gameState: GameState;
  joinedAt: string;
  hidden?: boolean;
}

// ──────────────────────────────────────────────
// Round
// ──────────────────────────────────────────────

export interface RoundItem {
  PK: string;        // GAME#<gameId>
  SK: string;        // ROUND#<roundNum>
  gameId: string;
  roundNum: number;
  state: RoundState;
  matchday: string;
  leagueId: string;
  deadline?: string;  // ISO 8601
  createdAt: string;
}

// ──────────────────────────────────────────────
// Pick
// ──────────────────────────────────────────────

export interface PickItem {
  PK: string;        // GAME#<gameId>
  SK: string;        // PICK#<roundNum>#<userId>
  gameId: string;
  roundNum: number;
  userId: string;
  teamId: string;
  teamName: string;
  outcome?: PickOutcome;
  pickedAt: string;
}

// ──────────────────────────────────────────────
// Deferred Obligation (postponed match)
// ──────────────────────────────────────────────

export interface DeferredItem {
  PK: string;        // GAME#<gameId>
  SK: string;        // DEFER#<userId>#<roundNum>
  gameId: string;
  userId: string;
  roundNum: number;
  originalTeamId: string;
  rescheduledRoundNum?: number;
  resolved: boolean;
}

// ──────────────────────────────────────────────
// API request/response types
// ──────────────────────────────────────────────

export interface CreateGameRequest {
  name: string;
  fee: number;
  leagues: string[];
  rollover: boolean;
  splitPot: boolean;
  creatorId: string;
  displayName: string;
}

export interface JoinGameRequest {
  userId: string;
  displayName: string;
}

export interface AddRoundRequest {
  matchday: string;
  leagueId: string;
  deadline?: string;
}

export interface SubmitPickRequest {
  userId: string;
  teamId: string;
  teamName: string;
}

export interface SubmitResultsRequest {
  results: Array<{
    teamId: string;
    outcome: PickOutcome;
  }>;
}

export interface CreateUserRequest {
  displayName: string;
  avatarUrl?: string;
}

export interface UpdatePreferencesRequest {
  [key: string]: unknown;
}

// Standard API response envelope
export interface ApiResponse<T = unknown> {
  statusCode: number;
  body: T;
}
