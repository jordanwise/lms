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

// ── User ──────────────────────────────────────────────────────────────────────

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
