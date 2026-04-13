import { useEffect, useState, useMemo } from 'react'
import { fetchGame } from '../api/client'
import type { GameDetail, GamePick, GamePlayer, GameRound } from '../api/client'
import { baseStyles, colors, outcomeEmoji, statusEmoji } from '../styles'

function shortenTeam(team: string): string {
  return team
    .replace(/ FC$/, '')
    .replace(/ AFC$/, '')
    .replace(/ City$/, ' City')
}

const statusColor = (status: string) => {
  switch (status) {
    case 'alive':
      return colors.success
    case 'eliminated':
      return colors.error
    case 'deferred':
      return colors.deferred
    default:
      return colors.textMuted
  }
}

export default function GameHistory() {
  const [game, setGame] = useState<GameDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGame('game-001')
      .then(setGame)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const picksByRound = useMemo(() => {
    if (!game) return new Map<number, GamePick[]>()
    const map = new Map<number, GamePick[]>()
    for (const pick of game.picks) {
      const existing = map.get(pick.roundNum) ?? []
      existing.push(pick)
      map.set(pick.roundNum, existing)
    }
    return map
  }, [game])

  const playerMap = useMemo(() => {
    if (!game) return new Map<string, GamePlayer>()
    return new Map(game.players.map((p) => [p.userId, p]))
  }, [game])

  // Determine which players were eliminated before each round
  const eliminatedBefore = useMemo(() => {
    if (!game) return new Map<number, Set<string>>()
    const map = new Map<number, Set<string>>()
    const eliminated = new Set<string>()

    const sortedRounds = [...game.rounds].sort(
      (a, b) => a.roundNum - b.roundNum,
    )
    for (const round of sortedRounds) {
      map.set(round.roundNum, new Set(eliminated))
      const roundPicks = picksByRound.get(round.roundNum) ?? []
      for (const pick of roundPicks) {
        if (pick.outcome === 'loss' || pick.outcome === 'draw') {
          eliminated.add(pick.userId)
        }
      }
    }
    return map
  }, [game, picksByRound])

  // Stats
  const stats = useMemo(() => {
    if (!game) return null
    const totalPicks = game.picks.length
    const wins = game.picks.filter((p) => p.outcome === 'win').length
    const teamCounts = new Map<string, number>()
    for (const pick of game.picks) {
      teamCounts.set(
        pick.teamName,
        (teamCounts.get(pick.teamName) ?? 0) + 1,
      )
    }
    const sortedTeams = [...teamCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    return { totalPicks, wins, sortedTeams, roundsPlayed: game.rounds.length }
  }, [game])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: colors.textMuted }}>
        ⏳ Loading game history...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ ...baseStyles.card, textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
        <p style={{ color: colors.error, fontWeight: 600 }}>
          Failed to load game data
        </p>
        <p style={{ color: colors.textMuted, fontSize: '0.85rem', marginTop: '0.5rem' }}>
          {error}
        </p>
        <p style={{ color: colors.textMuted, fontSize: '0.8rem', marginTop: '1rem' }}>
          Make sure the backend is running:{' '}
          <code style={{ color: colors.primary }}>
            backend/scripts/start-local.sh
          </code>
        </p>
      </div>
    )
  }

  if (!game) return null

  const survivors = game.players.filter(
    (p) => p.status === 'alive' || p.status === 'deferred',
  )
  const sortedRounds = [...game.rounds].sort(
    (a, b) => a.roundNum - b.roundNum,
  )

  return (
    <div>
      {/* Game Header */}
      <div
        style={{
          ...baseStyles.card,
          background: `linear-gradient(135deg, ${colors.primary}15, ${colors.card})`,
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h2 style={{ ...baseStyles.heading, fontSize: '1.5rem', marginBottom: '0.3rem' }}>
              {game.name}
            </h2>
            <div style={{ fontSize: '0.85rem', color: colors.textMuted }}>
              PIN: <span style={{ color: colors.primary, fontWeight: 600 }}>{game.pin}</span>
              {' · '}State:{' '}
              <span
                style={{
                  color:
                    game.state === 'active'
                      ? colors.success
                      : game.state === 'completed'
                        ? colors.primary
                        : colors.textMuted,
                  fontWeight: 600,
                }}
              >
                {game.state}
                {game.roundState ? `.${game.roundState}` : ''}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: colors.success }}>
              £{game.prizePool}
            </div>
            <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
              {game.playerCount} players · £{game.fee} entry
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '1rem',
            marginTop: '1rem',
            flexWrap: 'wrap',
          }}
        >
          {game.rollover && (
            <span
              style={{
                ...baseStyles.badge,
                backgroundColor: colors.warning + '25',
                color: colors.warning,
              }}
            >
              🔄 Rollover
            </span>
          )}
          {game.splitPot && (
            <span
              style={{
                ...baseStyles.badge,
                backgroundColor: colors.primary + '25',
                color: colors.primary,
              }}
            >
              🤝 Split Pot
            </span>
          )}
          {game.leagues.map((league) => (
            <span
              key={league}
              style={{
                ...baseStyles.badge,
                backgroundColor: colors.border,
                color: colors.text,
              }}
            >
              ⚽ {league}
            </span>
          ))}
        </div>
      </div>

      {/* Result Banner */}
      {game.state === 'completed' && (
        <div
          style={{
            ...baseStyles.card,
            textAlign: 'center',
            padding: '1.5rem',
            background:
              survivors.length === 1
                ? `linear-gradient(135deg, ${colors.success}15, ${colors.card})`
                : `linear-gradient(135deg, ${colors.primary}15, ${colors.card})`,
          }}
        >
          {survivors.length === 1 ? (
            <>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.3rem' }}>🏆</div>
              <h3 style={{ ...baseStyles.heading, fontSize: '1.3rem' }}>
                Winner: {survivors[0].displayName}
              </h3>
              <p style={{ color: colors.textMuted }}>
                Last player standing after {game.rounds.length} round
                {game.rounds.length !== 1 ? 's' : ''} · Wins £{game.prizePool}
              </p>
            </>
          ) : survivors.length > 1 ? (
            <>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.3rem' }}>🤝</div>
              <h3 style={{ ...baseStyles.heading, fontSize: '1.3rem' }}>
                {game.splitPot ? 'Split Pot!' : 'Multiple Survivors'}
              </h3>
              <p style={{ color: colors.textMuted }}>
                {survivors.map((s) => s.displayName).join(', ')} survived
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.3rem' }}>💀</div>
              <h3 style={{ ...baseStyles.heading, fontSize: '1.3rem' }}>
                No Survivors
              </h3>
              <p style={{ color: colors.textMuted }}>
                All players eliminated
              </p>
            </>
          )}
        </div>
      )}

      {/* Players Table */}
      <div style={baseStyles.card}>
        <h3 style={{ ...baseStyles.heading, fontSize: '1.1rem' }}>
          👥 Players
        </h3>
        <table style={baseStyles.table}>
          <thead>
            <tr>
              <th style={baseStyles.th}>Player</th>
              <th style={baseStyles.th}>Status</th>
              <th style={baseStyles.th}>Rounds Played</th>
              <th style={baseStyles.th}>Wins</th>
              <th style={baseStyles.th}>Teams Used</th>
            </tr>
          </thead>
          <tbody>
            {game.players.map((player) => {
              const playerPicks = game.picks.filter(
                (p) => p.userId === player.userId,
              )
              const winCount = playerPicks.filter(
                (p) => p.outcome === 'win',
              ).length
              return (
                <tr key={player.userId}>
                  <td style={baseStyles.td}>
                    {statusEmoji[player.status] ?? '⚪'} {player.displayName}
                  </td>
                  <td
                    style={{
                      ...baseStyles.td,
                      color: statusColor(player.status),
                      fontWeight: 600,
                    }}
                  >
                    {player.status}
                  </td>
                  <td style={baseStyles.td}>{playerPicks.length}</td>
                  <td style={baseStyles.td}>{winCount}</td>
                  <td
                    style={{
                      ...baseStyles.td,
                      fontSize: '0.85rem',
                      color: colors.textMuted,
                    }}
                  >
                    {playerPicks
                      .map((p) => shortenTeam(p.teamName))
                      .join(', ') || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Round-by-Round Breakdown */}
      <div style={baseStyles.card}>
        <h3 style={{ ...baseStyles.heading, fontSize: '1.1rem' }}>
          📋 Round-by-Round Picks
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={baseStyles.table}>
            <thead>
              <tr>
                <th style={baseStyles.th}>Round</th>
                <th style={baseStyles.th}>Matchday</th>
                {game.players.map((p) => (
                  <th key={p.userId} style={baseStyles.th}>
                    {statusEmoji[p.status] ?? '⚪'} {p.displayName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRounds.map((round) => {
                const roundPicks = picksByRound.get(round.roundNum) ?? []
                const pickMap = new Map(
                  roundPicks.map((p) => [p.userId, p]),
                )
                const elimBefore = eliminatedBefore.get(round.roundNum) ?? new Set()

                return (
                  <tr key={round.roundNum}>
                    <td style={{ ...baseStyles.td, fontWeight: 600 }}>
                      R{round.roundNum}
                    </td>
                    <td style={{ ...baseStyles.td, color: colors.textMuted }}>
                      {round.matchday}
                    </td>
                    {game.players.map((player) => {
                      const pick = pickMap.get(player.userId)
                      const wasEliminated = elimBefore.has(player.userId)

                      return (
                        <td
                          key={player.userId}
                          style={{
                            ...baseStyles.td,
                            opacity: wasEliminated ? 0.3 : 1,
                            color: wasEliminated
                              ? colors.textMuted
                              : colors.text,
                          }}
                        >
                          {pick ? (
                            <span>
                              {shortenTeam(pick.teamName)}{' '}
                              {pick.outcome
                                ? (outcomeEmoji[pick.outcome] ?? '')
                                : '⏳'}
                            </span>
                          ) : wasEliminated ? (
                            <span style={{ color: colors.textMuted }}>—</span>
                          ) : (
                            '—'
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div style={{ ...baseStyles.card, ...baseStyles.grid2 }}>
          <div>
            <h3 style={{ ...baseStyles.heading, fontSize: '1.1rem' }}>
              📊 Statistics
            </h3>
            <div style={{ fontSize: '0.9rem' }}>
              <div style={{ marginBottom: '0.4rem' }}>
                <span style={{ color: colors.textMuted }}>Rounds played: </span>
                <strong>{stats.roundsPlayed}</strong>
              </div>
              <div style={{ marginBottom: '0.4rem' }}>
                <span style={{ color: colors.textMuted }}>Total picks: </span>
                <strong>{stats.totalPicks}</strong>
              </div>
              <div style={{ marginBottom: '0.4rem' }}>
                <span style={{ color: colors.textMuted }}>Total wins: </span>
                <strong>{stats.wins}</strong>
              </div>
              <div>
                <span style={{ color: colors.textMuted }}>Win rate: </span>
                <strong>
                  {stats.totalPicks > 0
                    ? Math.round((stats.wins / stats.totalPicks) * 100)
                    : 0}
                  %
                </strong>
              </div>
            </div>
          </div>
          <div>
            <h3 style={{ ...baseStyles.heading, fontSize: '1.1rem' }}>
              🔥 Most Picked Teams
            </h3>
            <div style={{ fontSize: '0.9rem' }}>
              {stats.sortedTeams.map(([team, count], i) => (
                <div key={team} style={{ marginBottom: '0.3rem' }}>
                  <span style={{ color: colors.textMuted }}>{i + 1}. </span>
                  {shortenTeam(team)}{' '}
                  <span style={{ color: colors.primary }}>({count}×)</span>
                </div>
              ))}
              {stats.sortedTeams.length === 0 && (
                <span style={{ color: colors.textMuted }}>No picks yet</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
