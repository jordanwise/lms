const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

// ─── Response types (mirrors backend entities) ───

export interface GamePlayer {
  userId: string
  displayName: string
  status: 'alive' | 'eliminated' | 'deferred'
  joinedAt: string
}

export interface GameRound {
  roundNum: number
  state: 'pending' | 'picking' | 'locked' | 'processing' | 'complete'
  matchday: string
  leagueId: string
  deadline?: string
}

export interface GamePick {
  roundNum: number
  userId: string
  teamId: string
  teamName: string
  outcome?: 'win' | 'loss' | 'draw' | 'postponed'
  pickedAt: string
}

export interface GameDetail {
  gameId: string
  name: string
  pin: string
  fee: number
  leagues: string[]
  rollover: boolean
  splitPot: boolean
  state: string
  roundState?: string
  currentRound: number
  prizePool: number
  playerCount: number
  creatorId: string
  players: GamePlayer[]
  rounds: GameRound[]
  picks: GamePick[]
}

export interface UserGame {
  gameId: string
  gameName: string
  gameState: string
  playerStatus: string
}

// ─── API client ───

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json()
}

export async function fetchGame(gameId: string): Promise<GameDetail> {
  return fetchJson<GameDetail>(`/games/${gameId}`)
}

export async function fetchGameByPin(pin: string): Promise<GameDetail> {
  return fetchJson<GameDetail>(`/games/pin/${pin}`)
}

export async function fetchPlayers(
  gameId: string,
): Promise<{ players: GamePlayer[] }> {
  return fetchJson<{ players: GamePlayer[] }>(`/games/${gameId}/players`)
}

export async function fetchUserGames(
  userId: string,
): Promise<{ games: UserGame[] }> {
  return fetchJson<{ games: UserGame[] }>(`/users/${userId}/games`)
}
