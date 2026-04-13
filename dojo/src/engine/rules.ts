import type { Match, Pick, PickOutcome, Player, PlayerStatus } from '../store/types'

export function getPickOutcome(team: string, match: Match): PickOutcome {
  if (match.status === 'postponed') return 'postponed'

  const { homeTeam, awayTeam, homeScore, awayScore } = match
  if (homeScore === null || awayScore === null) return 'postponed'

  if (homeScore === awayScore) return 'draw'
  if (team === homeTeam && homeScore > awayScore) return 'win'
  if (team === awayTeam && awayScore > homeScore) return 'win'
  return 'loss'
}

export function findMatchForTeam(
  matches: Match[],
  team: string,
): Match | undefined {
  return matches.find((m) => m.homeTeam === team || m.awayTeam === team)
}

export function getUsedTeams(player: Player): string[] {
  return player.picks.map((p: Pick) => p.team)
}

export function getAvailableTeamsForPlayer(
  allTeams: string[],
  player: Player,
): string[] {
  const used = new Set(getUsedTeams(player))
  return allTeams.filter((t) => !used.has(t))
}

export function determineGameEnd(
  players: Player[],
):
  | { type: 'continue' }
  | { type: 'winner'; player: Player }
  | { type: 'all_eliminated' } {
  const alive = players.filter((p) => p.status === 'alive' || p.status === 'deferred')

  if (alive.length === 0) return { type: 'all_eliminated' }
  if (alive.length === 1) return { type: 'winner', player: alive[0] }
  return { type: 'continue' }
}

export function processRoundResults(
  players: Player[],
  matches: Match[],
  picks: { playerId: string; team: string }[],
): {
  outcomes: {
    playerId: string
    team: string
    outcome: PickOutcome
    match: Match | undefined
  }[]
  updatedStatuses: { playerId: string; newStatus: PlayerStatus }[]
} {
  const outcomes: {
    playerId: string
    team: string
    outcome: PickOutcome
    match: Match | undefined
  }[] = []

  const updatedStatuses: { playerId: string; newStatus: PlayerStatus }[] = []

  for (const pick of picks) {
    const match = findMatchForTeam(matches, pick.team)
    let outcome: PickOutcome

    if (!match) {
      outcome = 'postponed'
    } else {
      outcome = getPickOutcome(pick.team, match)
    }

    outcomes.push({
      playerId: pick.playerId,
      team: pick.team,
      outcome,
      match,
    })

    let newStatus: PlayerStatus
    switch (outcome) {
      case 'win':
        newStatus = 'alive'
        break
      case 'loss':
      case 'draw':
        newStatus = 'eliminated'
        break
      case 'postponed':
        newStatus = 'deferred'
        break
    }

    updatedStatuses.push({ playerId: pick.playerId, newStatus })
  }

  return { outcomes, updatedStatuses }
}
