import type { Player } from '../store/types'
import { getUsedTeams } from './rules'

export function generateSingleRandomPick(
  player: Player,
  availableTeams: string[],
): string | null {
  const used = new Set(getUsedTeams(player))
  const valid = availableTeams.filter((t) => !used.has(t))
  if (valid.length === 0) return null
  return valid[Math.floor(Math.random() * valid.length)]
}

export function generateRandomPicks(
  players: Player[],
  availableTeams: string[],
  existingPicks?: { playerId: string; team: string }[],
): { playerId: string; team: string }[] {
  const existingMap = new Map(
    (existingPicks ?? []).map((p) => [p.playerId, p.team]),
  )

  const result: { playerId: string; team: string }[] = []

  const activePlayers = players.filter(
    (p) => p.status === 'alive' || p.status === 'deferred',
  )

  for (const player of activePlayers) {
    const existing = existingMap.get(player.id)
    if (existing) {
      result.push({ playerId: player.id, team: existing })
      continue
    }

    const pick = generateSingleRandomPick(player, availableTeams)
    if (pick) {
      result.push({ playerId: player.id, team: pick })
    }
  }

  return result
}
