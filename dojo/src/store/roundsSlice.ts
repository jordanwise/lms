import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Round } from './types'

interface RoundsSliceState {
  rounds: Round[]
  currentRound: number
}

const initialState: RoundsSliceState = {
  rounds: [],
  currentRound: 0,
}

const roundsSlice = createSlice({
  name: 'rounds',
  initialState,
  reducers: {
    addRound(state, action: PayloadAction<number>) {
      const matchday = action.payload
      const roundNumber = state.rounds.length + 1
      const newRound: Round = {
        number: roundNumber,
        state: 'pending',
        matchday,
        picks: [],
      }
      state.rounds.push(newRound)
      state.currentRound = roundNumber
    },

    openPicks(state) {
      const round = state.rounds.find((r) => r.number === state.currentRound)
      if (round) {
        round.state = 'picking'
      }
    },

    lockPicks(state) {
      const round = state.rounds.find((r) => r.number === state.currentRound)
      if (round) {
        round.state = 'locked'
      }
    },

    processResults(state) {
      const round = state.rounds.find((r) => r.number === state.currentRound)
      if (round) {
        round.state = 'processing'
      }
    },

    completeRound(state) {
      const round = state.rounds.find((r) => r.number === state.currentRound)
      if (round) {
        round.state = 'complete'
      }
    },

    resetRounds(state) {
      state.rounds = []
      state.currentRound = 0
    },
  },
})

export const {
  addRound,
  openPicks,
  lockPicks,
  processResults,
  completeRound,
  resetRounds,
} = roundsSlice.actions

export default roundsSlice.reducer
