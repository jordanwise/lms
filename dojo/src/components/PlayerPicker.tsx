import { useAppDispatch } from '../store'
import { makePick } from '../store/playersSlice'
import type { Player } from '../store/types'
import { baseStyles, colors, statusEmoji } from '../styles'

interface PlayerPickerProps {
  player: Player
  matchday: number
  availableTeams: string[]
  currentPick: string | null
  disabled: boolean
}

function shortenTeam(team: string): string {
  return team
    .replace(/ FC$/, '')
    .replace(/ AFC$/, '')
    .replace(/ City$/, ' City')
}

export default function PlayerPicker({
  player,
  matchday,
  availableTeams,
  currentPick,
  disabled,
}: PlayerPickerProps) {
  const dispatch = useAppDispatch()
  const isEliminated = player.status === 'eliminated'
  const isInactive = isEliminated || disabled

  // Teams available: not used before by this player in a prior round
  const selectableTeams = availableTeams

  const handleChange = (team: string) => {
    if (isInactive) return
    // Remove existing pick for this matchday first (Redux handles by pushing new pick)
    dispatch(makePick({ playerId: player.id, team, matchday }))
  }

  const statusColor = isEliminated
    ? colors.error
    : player.status === 'deferred'
      ? colors.deferred
      : colors.success

  return (
    <div
      style={{
        ...baseStyles.card,
        opacity: isEliminated ? 0.5 : 1,
        borderColor: currentPick ? statusColor + '60' : colors.border,
        padding: '1rem',
        marginBottom: '0.5rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem',
        }}
      >
        <span style={{ fontWeight: 600 }}>
          {statusEmoji[player.status]} {player.name}
        </span>
        <span
          style={{
            ...baseStyles.badge,
            backgroundColor: statusColor + '25',
            color: statusColor,
          }}
        >
          {player.status}
        </span>
      </div>

      {isEliminated ? (
        <div style={{ color: colors.textMuted, fontSize: '0.85rem' }}>
          Eliminated — no pick needed
        </div>
      ) : (
        <select
          style={{
            ...baseStyles.select,
            width: '100%',
            backgroundColor: currentPick ? colors.primary + '15' : '#16162B',
          }}
          value={currentPick ?? ''}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isInactive}
        >
          <option value="">Select a team...</option>
          {selectableTeams.map((team) => (
            <option key={team} value={team}>
              {shortenTeam(team)}
            </option>
          ))}
        </select>
      )}

      {currentPick && !isEliminated && (
        <div
          style={{
            marginTop: '0.4rem',
            fontSize: '0.8rem',
            color: colors.primary,
          }}
        >
          Picking: <strong>{shortenTeam(currentPick)}</strong>
        </div>
      )}

      {/* Show previously used teams */}
      {player.picks.length > 0 && (
        <div
          style={{
            marginTop: '0.4rem',
            fontSize: '0.75rem',
            color: colors.textMuted,
          }}
        >
          Used:{' '}
          {player.picks
            .filter((p) => p.matchday !== matchday)
            .map((p) => shortenTeam(p.team))
            .join(', ') || 'none'}
        </div>
      )}
    </div>
  )
}
