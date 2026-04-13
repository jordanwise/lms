import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { DeferredObligation, PickOutcome, Player } from './types'

interface PlayersSliceState {
  players: Player[]
}

const initialState: PlayersSliceState = {
  players: [],
}

let nextId = 0
function generateId(): string {
  return `player-${++nextId}`
}

const playersSlice = createSlice({
  name: 'players',
  initialState,
  reducers: {
    setPlayers(state, action: PayloadAction<string[]>) {
      state.players = action.payload.map((name) => ({
        id: generateId(),
        name,
        status: 'alive',
        picks: [],
        deferredObligations: [],
      }))
    },

    makePick(
      state,
      action: PayloadAction<{
        playerId: string
        team: string
        matchday: number
      }>,
    ) {
      const { playerId, team, matchday } = action.payload
      const player = state.players.find((p) => p.id === playerId)
      if (player) {
        const existingIdx = player.picks.findIndex((p) => p.matchday === matchday)
        if (existingIdx !== -1) {
          player.picks[existingIdx] = { playerId, team, matchday, outcome: null }
        } else {
          player.picks.push({ playerId, team, matchday, outcome: null })
        }
      }
    },

    updatePickOutcome(
      state,
      action: PayloadAction<{
        playerId: string
        matchday: number
        outcome: PickOutcome
      }>,
    ) {
      const { playerId, matchday, outcome } = action.payload
      const player = state.players.find((p) => p.id === playerId)
      if (player) {
        const pick = player.picks.find((p) => p.matchday === matchday)
        if (pick) {
          pick.outcome = outcome
        }
      }
    },

    eliminatePlayer(state, action: PayloadAction<string>) {
      const player = state.players.find((p) => p.id === action.payload)
      if (player) {
        player.status = 'eliminated'
      }
    },

    deferPlayer(state, action: PayloadAction<string>) {
      const player = state.players.find((p) => p.id === action.payload)
      if (player) {
        player.status = 'deferred'
        const postponedPick = player.picks.find(
          (p) => p.outcome === 'postponed',
        )
        if (postponedPick) {
          const obligation: DeferredObligation = {
            originalPick: { ...postponedPick },
            resolved: false,
            rescheduledOutcome: null,
          }
          player.deferredObligations.push(obligation)
        }
      }
    },

    resolveDeferral(
      state,
      action: PayloadAction<{ playerId: string; outcome: PickOutcome }>,
    ) {
      const { playerId, outcome } = action.payload
      const player = state.players.find((p) => p.id === playerId)
      if (player) {
        const unresolved = player.deferredObligations.find((d) => !d.resolved)
        if (unresolved) {
          unresolved.resolved = true
          unresolved.rescheduledOutcome = outcome
        }
      }
    },

    revivePlayer(state, action: PayloadAction<string>) {
      const player = state.players.find((p) => p.id === action.payload)
      if (player) {
        player.status = 'alive'
      }
    },

    resetAllPlayers(state) {
      for (const player of state.players) {
        player.status = 'alive'
        player.picks = []
        player.deferredObligations = []
      }
    },
  },
})

export const {
  setPlayers,
  makePick,
  updatePickOutcome,
  eliminatePlayer,
  deferPlayer,
  resolveDeferral,
  revivePlayer,
  resetAllPlayers,
} = playersSlice.actions

export default playersSlice.reducer
