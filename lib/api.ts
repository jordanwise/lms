import { API_URL } from '@/constants/api';

type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const json = await res.json();

    if (!res.ok) {
      return { ok: false, error: json?.error ?? `HTTP ${res.status}` };
    }

    return { ok: true, data: json };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Network error' };
  }
}

// ── Game ──────────────────────────────────────────────────────────────────────

export interface CreateGameParams {
  name: string;
  fee: number;
  leagues: string[];
  rollover: boolean;
  splitPot: boolean;
  creatorId: string;
  creatorDisplayName: string;
}

export interface CreateGameResult {
  gameId: string;
  pin: string;
  name: string;
  state: string;
  fee: number;
  leagues: string[];
  rollover: boolean;
  splitPot: boolean;
}

export function createGame(params: CreateGameParams) {
  return request<CreateGameResult>('POST', '/games', {
    name: params.name,
    fee: params.fee,
    leagues: params.leagues,
    rollover: params.rollover,
    splitPot: params.splitPot,
    creatorId: params.creatorId,
    displayName: params.creatorDisplayName,
  });
}

export interface GameDetail {
  gameId: string;
  name: string;
  pin: string;
  fee: number;
  leagues: string[];
  rollover: boolean;
  splitPot: boolean;
  state: string;
  roundState?: string;
  currentRound?: number;
  prizePool: number;
  playerCount: number;
  creatorId?: string;
  players: { userId: string; displayName: string; status: string; joinedAt: string }[];
  rounds?: RoundDetail[];
  picks?: PickDetail[];
}

export function getGame(gameId: string) {
  return request<GameDetail>('GET', `/games/${gameId}`);
}

export interface GameByPinResult {
  gameId: string;
  name: string;
  pin: string;
  fee: number;
  state: string;
  playerCount: number;
  leagues: string[];
}

export function getGameByPin(pin: string) {
  return request<GameByPinResult>('GET', `/games/pin/${pin.toUpperCase()}`);
}

export function joinGame(gameId: string, userId: string, displayName: string) {
  return request<{ gameId: string; userId: string; displayName: string; status: string }>(
    'POST', `/games/${gameId}/join`, { userId, displayName }
  );
}

export function leaveGame(gameId: string, userId: string) {
  return request<{ gameId: string; userId: string; abandoned: boolean }>(
    'POST', `/games/${gameId}/leave`, { userId }
  );
}

export function restartGame(gameId: string, userId: string) {
  return request<{ gameId: string; userId: string; state: string }>(
    'POST', `/games/${gameId}/restart`, { userId }
  );
}

export function hideGame(gameId: string, userId: string) {
  return request<{ gameId: string; userId: string; hidden: boolean }>(
    'POST', `/games/${gameId}/players/${userId}/hide`, {}
  );
}



export interface UserGame {
  gameId: string;
  gameName: string;
  gameState: string;
  playerStatus: string;
  joinedAt: string;
}

export function listUserGames(userId: string) {
  return request<{ games: UserGame[] }>('GET', `/users/${userId}/games`);
}

// ── Round ────────────────────────────────────────────────────────────────────

export interface RoundDetail {
  roundNum: number;
  state: string;
  matchday: string;
  leagueId: string;
  deadline?: string;
  createdAt: string;
}

export interface PickDetail {
  roundNum: number;
  userId: string;
  teamId: string;
  teamName: string;
  outcome?: string;
  pickedAt: string;
}

export function addRound(gameId: string, matchday: string, leagueId: string, deadline?: string) {
  return request<RoundDetail>('POST', `/games/${gameId}/rounds`, { matchday, leagueId, deadline });
}

export function openPicks(gameId: string, roundNum: number) {
  return request<{ roundNum: number; state: string }>('POST', `/games/${gameId}/rounds/${roundNum}/open`);
}

export function submitPick(gameId: string, roundNum: number, userId: string, teamId: string, teamName: string) {
  return request<PickDetail>('POST', `/games/${gameId}/rounds/${roundNum}/picks`, { userId, teamId, teamName });
}

export function lockRound(gameId: string, roundNum: number) {
  return request<{ roundNum: number; state: string }>('POST', `/games/${gameId}/rounds/${roundNum}/lock`);
}

export function submitResults(gameId: string, roundNum: number, results: Array<{teamId: string, outcome: string}>) {
  return request<{ roundNum: number; state: string }>('POST', `/games/${gameId}/rounds/${roundNum}/results`, { results });
}

export function applyEliminations(gameId: string, roundNum: number) {
  return request<{ roundNum: number; state: string }>('POST', `/games/${gameId}/rounds/${roundNum}/eliminate`);
}

// ── User ──────────────────────────────────────────────────────────────────────

export interface UserProfile {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  preferences: {
    notificationsEnabled: boolean;
    notifyOnRoundOpen: boolean;
    notifyOnDeadlineReminder: boolean;
    notifyOnResults: boolean;
    notifyOnElimination: boolean;
    theme: 'dark' | 'light';
    favouriteLeagues: string[];
  };
  createdAt: string;
}

export function getUser(userId: string) {
  return request<UserProfile>('GET', `/users/${userId}`);
}

export function updatePreferences(userId: string, preferences: Record<string, unknown>) {
  return request<{ preferences: Record<string, unknown> }>(
    'PATCH',
    `/users/${userId}/preferences`,
    preferences,
  );
}

export function registerPushToken(userId: string, pushToken: string, platform: string = 'ios') {
  return request<{ userId: string; pushTokenRegistered: boolean }>(
    'PUT',
    `/users/${userId}/push-token`,
    { pushToken, platform },
  );
}
