import type { Match, Player, PlayerStatus, PickOutcome } from '../store/types'
import { loadFixtures, getMatchdayFixtures } from './fixtures'
import { processRoundResults, determineGameEnd } from './rules'

export async function getMatchdayData(
  leagues: string[],
  season: string,
  matchday: number,
): Promise<{ league: string; matches: Match[] }[]> {
  const results: { league: string; matches: Match[] }[] = []

  for (const league of leagues) {
    const data = await loadFixtures(league, season)
    if (data) {
      const matches = getMatchdayFixtures(data, matchday)
      results.push({ league, matches })
    }
  }

  return results
}

export function getAllTeamsForMatchday(
  fixtureData: { league: string; matches: Match[] }[],
): string[] {
  const teams = new Set<string>()
  for (const { matches } of fixtureData) {
    for (const m of matches) {
      teams.add(m.homeTeam)
      teams.add(m.awayTeam)
    }
  }
  return [...teams]
}

export function resolveRound(
  players: Player[],
  allMatches: Match[],
  picks: { playerId: string; team: string }[],
): {
  outcomes: {
    playerId: string
    team: string
    outcome: PickOutcome
    match: Match | undefined
  }[]
  updatedStatuses: { playerId: string; newStatus: PlayerStatus }[]
  gameEnd:
    | { type: 'continue' }
    | { type: 'winner'; player: Player }
    | { type: 'all_eliminated' }
} {
  const { outcomes, updatedStatuses } = processRoundResults(
    players,
    allMatches,
    picks,
  )

  // Apply statuses to player copies for game-end check
  const updatedPlayers = players.map((p) => {
    const statusUpdate = updatedStatuses.find((s) => s.playerId === p.id)
    return statusUpdate ? { ...p, status: statusUpdate.newStatus } : p
  })

  const gameEnd = determineGameEnd(updatedPlayers)

  return { outcomes, updatedStatuses, gameEnd }
}
