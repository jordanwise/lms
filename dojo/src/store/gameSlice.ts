import { createSlice } from '@reduxjs/toolkit'
import type { GameState } from './types'

interface GameSliceState {
  status: GameState
}

const initialState: GameSliceState = {
  status: 'created',
}

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    shareGame(state) {
      state.status = 'waiting_for_players'
    },
    startGame(state) {
      state.status = 'active'
    },
    completeGame(state) {
      state.status = 'completed'
    },
    triggerRollover(state) {
      state.status = 'rollover_pending'
    },
    rolloverComplete(state) {
      state.status = 'active'
    },
    cancelGame(state) {
      state.status = 'cancelled'
    },
    resetGame(state) {
      state.status = 'created'
    },
  },
})

export const {
  shareGame,
  startGame,
  completeGame,
  triggerRollover,
  rolloverComplete,
  cancelGame,
  resetGame,
} = gameSlice.actions

export default gameSlice.reducer
