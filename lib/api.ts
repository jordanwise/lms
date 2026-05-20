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
  prizePool: number;
  playerCount: number;
  players: { userId: string; displayName: string; status: string; joinedAt: string }[];
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
