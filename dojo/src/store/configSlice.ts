import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { GameConfig } from './types'

const initialState: GameConfig = {
  leagues: [],
  season: '2024-25',
  startMatchday: 1,
  playerCount: 2,
  fee: 5,
  rollover: false,
  splitPot: true,
}

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setLeagues(state, action: PayloadAction<string[]>) {
      state.leagues = action.payload
    },

    setSeason(state, action: PayloadAction<string>) {
      state.season = action.payload
    },

    setStartMatchday(state, action: PayloadAction<number>) {
      state.startMatchday = action.payload
    },

    setPlayerCount(state, action: PayloadAction<number>) {
      state.playerCount = Math.max(2, Math.min(100, action.payload))
    },

    setFee(state, action: PayloadAction<number>) {
      state.fee = Math.max(0, action.payload)
    },

    setRollover(state, action: PayloadAction<boolean>) {
      state.rollover = action.payload
    },

    setSplitPot(state, action: PayloadAction<boolean>) {
      state.splitPot = action.payload
    },

    resetConfig() {
      return { ...initialState }
    },
  },
})

export const {
  setLeagues,
  setSeason,
  setStartMatchday,
  setPlayerCount,
  setFee,
  setRollover,
  setSplitPot,
  resetConfig,
} = configSlice.actions

export default configSlice.reducer
