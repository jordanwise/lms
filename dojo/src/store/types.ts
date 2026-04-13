export type GameState =
  | 'created'
  | 'waiting_for_players'
  | 'active'
  | 'completed'
  | 'rollover_pending'
  | 'cancelled'

export type RoundState =
  | 'pending'
  | 'picking'
  | 'locked'
  | 'processing'
  | 'complete'

export type PlayerStatus = 'alive' | 'eliminated' | 'deferred'

export type PickOutcome = 'win' | 'loss' | 'draw' | 'postponed'

export interface Pick {
  playerId: string
  team: string
  matchday: number
  outcome: PickOutcome | null
}

export interface DeferredObligation {
  originalPick: Pick
  resolved: boolean
  rescheduledOutcome: PickOutcome | null
}

export interface Player {
  id: string
  name: string
  status: PlayerStatus
  picks: Pick[]
  deferredObligations: DeferredObligation[]
}

export interface Round {
  number: number
  state: RoundState
  matchday: number
  picks: Pick[]
}

export interface GameConfig {
  leagues: string[]
  season: string
  startMatchday: number
  playerCount: number
  fee: number
  rollover: boolean
  splitPot: boolean
}

export interface Match {
  date: string
  matchday: number
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  status: 'completed' | 'postponed'
}
