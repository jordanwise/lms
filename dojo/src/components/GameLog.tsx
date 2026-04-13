import type { Player, Round } from '../store/types'
import { baseStyles, colors, outcomeEmoji, statusEmoji } from '../styles'

interface GameLogProps {
  players: Player[]
  rounds: Round[]
  collapsible?: boolean
}

function shortenTeam(team: string): string {
  return team
    .replace(/ FC$/, '')
    .replace(/ AFC$/, '')
    .replace(/ City$/, ' City')
}

export default function GameLog({
  players,
  rounds,
  collapsible = false,
}: GameLogProps) {
  if (rounds.length === 0) return null

  const completedRounds = rounds.filter(
    (r) => r.state === 'complete' || r.state === 'processing',
  )
  if (completedRounds.length === 0) return null

  const content = (
    <div style={{ overflowX: 'auto' }}>
      <table style={baseStyles.table}>
        <thead>
          <tr>
            <th style={baseStyles.th}>Round</th>
            <th style={baseStyles.th}>MD</th>
            {players.map((p) => (
              <th key={p.id} style={baseStyles.th}>
                {statusEmoji[p.status]} {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {completedRounds.map((round) => {
            const eliminatedBefore = new Set<string>()
            // Check if player was eliminated before this round
            for (const prevRound of completedRounds) {
              if (prevRound.number >= round.number) break
              for (const p of players) {
                const pick = p.picks.find(
                  (pk) => pk.matchday === prevRound.matchday,
                )
                if (
                  pick &&
                  (pick.outcome === 'loss' || pick.outcome === 'draw')
                ) {
                  eliminatedBefore.add(p.id)
                }
              }
            }

            return (
              <tr key={round.number}>
                <td style={{ ...baseStyles.td, fontWeight: 600 }}>
                  R{round.number}
                </td>
                <td style={{ ...baseStyles.td, color: colors.textMuted }}>
                  MD{round.matchday}
                </td>
                {players.map((player) => {
                  const pick = player.picks.find(
                    (pk) => pk.matchday === round.matchday,
                  )
                  const isEliminated = eliminatedBefore.has(player.id)

                  return (
                    <td
                      key={player.id}
                      style={{
                        ...baseStyles.td,
                        opacity: isEliminated ? 0.3 : 1,
                        color: isEliminated ? colors.textMuted : colors.text,
                      }}
                    >
                      {pick ? (
                        <span>
                          {shortenTeam(pick.team)}{' '}
                          {pick.outcome ? outcomeEmoji[pick.outcome] : '⏳'}
                        </span>
                      ) : isEliminated ? (
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
  )

  if (collapsible) {
    return (
      <details style={{ ...baseStyles.card, cursor: 'pointer' }}>
        <summary
          style={{
            fontWeight: 700,
            fontSize: '1rem',
            marginBottom: '0.5rem',
            listStyle: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          📋 Pick History ({completedRounds.length} round
          {completedRounds.length !== 1 ? 's' : ''})
        </summary>
        {content}
      </details>
    )
  }

  return (
    <div style={baseStyles.card}>
      <h3 style={{ ...baseStyles.heading, fontSize: '1.1rem' }}>
        📋 Full Game Log
      </h3>
      {content}
    </div>
  )
}
