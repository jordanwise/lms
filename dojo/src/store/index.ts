import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import gameReducer from './gameSlice'
import playersReducer from './playersSlice'
import roundsReducer from './roundsSlice'
import configReducer from './configSlice'

export const store = configureStore({
  reducer: {
    game: gameReducer,
    players: playersReducer,
    rounds: roundsReducer,
    config: configReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
