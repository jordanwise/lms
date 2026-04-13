import { useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import type { RootState } from '../store'
import { resetGame } from '../store/gameSlice'
import { resetAllPlayers } from '../store/playersSlice'
import { resetRounds } from '../store/roundsSlice'
import { resetConfig } from '../store/configSlice'
import GameLog from './GameLog'
import { baseStyles, colors, statusEmoji } from '../styles'

function shortenTeam(team: string): string {
  return team.replace(/ FC$/, '').replace(/ AFC$/, '').replace(/ City$/, ' City')
}

export default function ResultsSummary() {
  const dispatch = useAppDispatch()
  const players = useAppSelector((s: RootState) => s.players.players)
  const rounds = useAppSelector((s: RootState) => s.rounds.rounds)
  const config = useAppSelector((s: RootState) => s.config)
  const gameStatus = useAppSelector((s: RootState) => s.game.status)

  const winners = players.filter((p) => p.status !== 'eliminated')
  const pot = config.fee * config.playerCount
  const isRollover = gameStatus === 'rollover_pending'

  // Players eliminated in the final round (for split-pot display when no survivors)
  const lastRoundPlayers = useMemo(() => {
    if (winners.length > 0 || rounds.length === 0) return []
    const lastMatchday = rounds[rounds.length - 1].matchday
    return players.filter((p) =>
      p.picks.some((pk) => pk.matchday === lastMatchday),
    )
  }, [players, winners, rounds])

  // Stats
  const stats = useMemo(() => {
    const teamCounts = new Map<string, number>()
    for (const player of players) {
      for (const pick of player.picks) {
        teamCounts.set(pick.team, (teamCounts.get(pick.team) ?? 0) + 1)
      }
    }
    const sortedTeams = [...teamCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    const totalPicks = players.reduce((sum, p) => sum + p.picks.length, 0)
    const wins = players.reduce(
      (sum, p) => sum + p.picks.filter((pk) => pk.outcome === 'win').length,
      0,
    )

    return { sortedTeams, totalPicks, wins, roundsPlayed: rounds.length }
  }, [players, rounds])

  const handleNewGame = () => {
    dispatch(resetRounds())
    dispatch(resetAllPlayers())
    dispatch(resetConfig())
    dispatch(resetGame())
  }

  return (
    <div>
      {/* Outcome Banner */}
      <div
        style={{
          ...baseStyles.card,
          textAlign: 'center',
          padding: '2rem',
          background: isRollover
            ? `linear-gradient(135deg, ${colors.warning}15, ${colors.card})`
            : winners.length === 1
              ? `linear-gradient(135deg, ${colors.success}15, ${colors.card})`
              : `linear-gradient(135deg, ${colors.primary}15, ${colors.card})`,
        }}
      >
        {isRollover ? (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔄</div>
            <h2 style={{ ...baseStyles.heading, fontSize: '1.8rem' }}>
              Rollover!
            </h2>
            <p style={{ color: colors.textMuted }}>
              All players eliminated — everyone revives for the next round
              {pot > 0 ? ` · Pot doubles to £${pot * 2}` : ''}
            </p>
          </>
        ) : winners.length === 1 ? (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏆</div>
            <h2 style={{ ...baseStyles.heading, fontSize: '1.8rem' }}>
              Winner: {winners[0].name}
            </h2>
            <p style={{ color: colors.textMuted }}>
              Last player standing after {stats.roundsPlayed} round
              {stats.roundsPlayed !== 1 ? 's' : ''}
              {pot > 0 ? ` · Wins £${pot}` : ''}
            </p>
          </>
        ) : winners.length > 1 ? (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
              {config.splitPot ? '🤝' : '🏆'}
            </div>
            <h2 style={{ ...baseStyles.heading, fontSize: '1.8rem' }}>
              {config.splitPot ? 'Split Pot!' : 'Multiple Survivors'}
            </h2>
            <p style={{ color: colors.textMuted }}>
              {winners.map((w) => w.name).join(', ')} survived{' '}
              {stats.roundsPlayed} round{stats.roundsPlayed !== 1 ? 's' : ''}
              {pot > 0 && winners.length > 0
                ? ` · £${pot} / ${winners.length} = £${Math.floor(pot / winners.length)} each`
                : ''}
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
              {config.splitPot ? '🤝' : '💀'}
            </div>
            <h2 style={{ ...baseStyles.heading, fontSize: '1.8rem' }}>
              {config.splitPot ? 'Split Pot — No Survivors!' : 'No Survivors'}
            </h2>
            <p style={{ color: colors.textMuted }}>
              All players eliminated in round {stats.roundsPlayed}
              {stats.roundsPlayed !== 1 ? '' : ''}
            </p>
            {config.splitPot && lastRoundPlayers.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <p style={{ color: colors.text, fontWeight: 600 }}>
                  Pot split between {lastRoundPlayers.length} player
                  {lastRoundPlayers.length !== 1 ? 's' : ''}:
                </p>
                <p style={{ color: colors.primary, fontWeight: 500, margin: '0.4rem 0' }}>
                  {lastRoundPlayers.map((p) => p.name).join(', ')}
                </p>
                {pot > 0 && (
                  <p style={{ color: colors.success, fontSize: '1.1rem', fontWeight: 700 }}>
                    £{pot} / {lastRoundPlayers.length} = £{Math.floor(pot / lastRoundPlayers.length)} each
                  </p>
                )}
              </div>
            )}
            {!config.splitPot && pot > 0 && (
              <p style={{ color: colors.warning, marginTop: '0.5rem' }}>
                💰 £{pot} pot unclaimed — no split enabled
              </p>
            )}
          </>
        )}
      </div>

      {/* Player Summary */}
      <div style={baseStyles.card}>
        <h3 style={{ ...baseStyles.heading, fontSize: '1.1rem' }}>
          👥 Player Summary
        </h3>
        <table style={baseStyles.table}>
          <thead>
            <tr>
              <th style={baseStyles.th}>Player</th>
              <th style={baseStyles.th}>Status</th>
              <th style={baseStyles.th}>Rounds</th>
              <th style={baseStyles.th}>Wins</th>
              <th style={baseStyles.th}>Teams Used</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => {
              const winCount = player.picks.filter(
                (p) => p.outcome === 'win',
              ).length
              return (
                <tr key={player.id}>
                  <td style={baseStyles.td}>
                    {statusEmoji[player.status]} {player.name}
                  </td>
                  <td
                    style={{
                      ...baseStyles.td,
                      color:
                        player.status === 'alive'
                          ? colors.success
                          : player.status === 'deferred'
                            ? colors.deferred
                            : colors.error,
                    }}
                  >
                    {player.status}
                  </td>
                  <td style={baseStyles.td}>
                    {new Set(player.picks.map((p) => p.matchday)).size}
                  </td>
                  <td style={baseStyles.td}>{winCount}</td>
                  <td
                    style={{
                      ...baseStyles.td,
                      fontSize: '0.85rem',
                      color: colors.textMuted,
                    }}
                  >
                    {player.picks.map((p) => shortenTeam(p.team)).join(', ')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Statistics */}
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

      {/* Full Game Log */}
      <GameLog players={players} rounds={rounds} />

      {/* New Game Button */}
      <button
        style={{
          ...baseStyles.button,
          width: '100%',
          padding: '1rem',
          fontSize: '1.1rem',
          marginTop: '0.5rem',
        }}
        onClick={handleNewGame}
      >
        🆕 New Game
      </button>
    </div>
  )
}
