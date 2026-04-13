import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import type { RootState } from '../store'
import { makePick, updatePickOutcome, eliminatePlayer, deferPlayer } from '../store/playersSlice'
import { addRound, openPicks, lockPicks, processResults, completeRound } from '../store/roundsSlice'
import { completeGame, triggerRollover } from '../store/gameSlice'
import type { Match, Player, Pick as GamePick } from '../store/types'
import PlayerPicker from './PlayerPicker'
import GameLog from './GameLog'
import { baseStyles, colors } from '../styles'

interface SeasonData {
  league: string
  leagueName: string
  season: string
  matches: Match[]
}

const fixtureModules = import.meta.glob('../data/fixtures/*.json', {
  eager: true,
}) as Record<string, { default: SeasonData }>

function loadFixtureData(league: string, season: string): SeasonData | null {
  const key = `../data/fixtures/${league}_${season}.json`
  const mod = fixtureModules[key]
  return mod ? mod.default : null
}

function getMatchdayMatches(
  leagues: string[],
  season: string,
  matchday: number,
): { league: string; leagueName: string; matches: Match[] }[] {
  const result: { league: string; leagueName: string; matches: Match[] }[] = []
  for (const league of leagues) {
    const data = loadFixtureData(league, season)
    if (data) {
      const matches = data.matches.filter((m) => m.matchday === matchday)
      if (matches.length > 0) {
        result.push({ league, leagueName: data.leagueName, matches })
      }
    }
  }
  return result
}

function getAllTeamsForMatchday(
  leagues: string[],
  season: string,
  matchday: number,
): string[] {
  const teams = new Set<string>()
  for (const league of leagues) {
    const data = loadFixtureData(league, season)
    if (data) {
      for (const match of data.matches) {
        if (match.matchday === matchday) {
          teams.add(match.homeTeam)
          teams.add(match.awayTeam)
        }
      }
    }
  }
  return [...teams].sort()
}

function getPickOutcome(team: string, allMatches: Match[]): 'win' | 'loss' | 'draw' | 'postponed' {
  const match = allMatches.find(
    (m) => m.homeTeam === team || m.awayTeam === team,
  )
  if (!match) return 'loss'
  if (match.status === 'postponed') return 'postponed'
  if (match.homeScore === null || match.awayScore === null) return 'postponed'

  const isHome = match.homeTeam === team
  if (match.homeScore === match.awayScore) return 'draw'
  if (isHome) return match.homeScore > match.awayScore ? 'win' : 'loss'
  return match.awayScore > match.homeScore ? 'win' : 'loss'
}

function shortenTeam(team: string): string {
  return team.replace(/ FC$/, '').replace(/ AFC$/, '').replace(/ City$/, ' City')
}

export default function RoundView() {
  const dispatch = useAppDispatch()
  const config = useAppSelector((s: RootState) => s.config)
  const players = useAppSelector((s: RootState) => s.players.players)
  const rounds = useAppSelector((s: RootState) => s.rounds.rounds)
  const currentRoundNum = useAppSelector((s: RootState) => s.rounds.currentRound)
  const gameStatus = useAppSelector((s: RootState) => s.game.status)

  const currentRound = rounds.find((r) => r.number === currentRoundNum)
  const roundState = currentRound?.state ?? 'pending'
  const matchday = currentRound?.matchday ?? config.startMatchday

  const alivePlayers = players.filter((p) => p.status !== 'eliminated')

  // All teams in this matchday
  const allTeams = useMemo(
    () => getAllTeamsForMatchday(config.leagues, config.season, matchday),
    [config.leagues, config.season, matchday],
  )

  // Fixtures grouped by league
  const fixturesByLeague = useMemo(
    () => getMatchdayMatches(config.leagues, config.season, matchday),
    [config.leagues, config.season, matchday],
  )

  // All matches flat
  const allMatches = useMemo(
    () => fixturesByLeague.flatMap((g) => g.matches),
    [fixturesByLeague],
  )

  // Current picks for this matchday (latest pick per player for this matchday)
  const currentPicks = useMemo(() => {
    const picks = new Map<string, string>()
    for (const player of players) {
      const playerPicks = player.picks.filter((p) => p.matchday === matchday)
      if (playerPicks.length > 0) {
        picks.set(player.id, playerPicks[playerPicks.length - 1].team)
      }
    }
    return picks
  }, [players, matchday])

  // Available teams for a player (not previously used)
  const getAvailableTeams = useCallback(
    (player: Player) => {
      const usedTeams = new Set(
        player.picks
          .filter((p) => p.matchday !== matchday)
          .map((p) => p.team),
      )
      return allTeams.filter((t) => !usedTeams.has(t))
    },
    [allTeams, matchday],
  )

  // Auto-random picks when round opens
  const hasAutoPickedRef = useRef<number>(0)
  useEffect(() => {
    if (roundState !== 'picking') return
    if (hasAutoPickedRef.current === currentRoundNum) return
    if (alivePlayers.length === 0) return

    // Check if picks already exist for this matchday
    const existingPicks = alivePlayers.some((p) =>
      p.picks.some((pk) => pk.matchday === matchday),
    )
    if (existingPicks) {
      hasAutoPickedRef.current = currentRoundNum
      return
    }

    hasAutoPickedRef.current = currentRoundNum

    for (const player of alivePlayers) {
      const available = getAvailableTeams(player)
      if (available.length > 0) {
        const pick = available[Math.floor(Math.random() * available.length)]
        dispatch(makePick({ playerId: player.id, team: pick, matchday }))
      }
    }
  }, [roundState, currentRoundNum, alivePlayers, matchday, getAvailableTeams, dispatch])

  const handleReRandomize = () => {
    for (const player of alivePlayers) {
      const available = getAvailableTeams(player)
      if (available.length > 0) {
        const pick = available[Math.floor(Math.random() * available.length)]
        dispatch(makePick({ playerId: player.id, team: pick, matchday }))
      }
    }
  }

  const handleLock = () => {
    dispatch(lockPicks())
  }

  const handleProcessResults = () => {
    dispatch(processResults())

    // Process each alive player's pick
    for (const player of alivePlayers) {
      const playerPicks = player.picks.filter((p) => p.matchday === matchday)
      const latestPick = playerPicks[playerPicks.length - 1]
      if (!latestPick) continue

      const outcome = getPickOutcome(latestPick.team, allMatches)
      dispatch(
        updatePickOutcome({
          playerId: player.id,
          matchday,
          outcome,
        }),
      )

      if (outcome === 'loss' || outcome === 'draw') {
        dispatch(eliminatePlayer(player.id))
      } else if (outcome === 'postponed') {
        dispatch(deferPlayer(player.id))
      }
    }

    dispatch(completeRound())

    // Check game end
    const aliveAfter = players.filter((p) => {
      const playerPicks = p.picks.filter((pk) => pk.matchday === matchday)
      const latestPick = playerPicks[playerPicks.length - 1]
      if (!latestPick || p.status === 'eliminated') {
        // Player was already eliminated or has no pick
        if (p.status === 'eliminated') return false
        // No pick means they might be eliminated
        return p.status !== 'eliminated'
      }
      const outcome = getPickOutcome(latestPick.team, allMatches)
      return outcome === 'win' || outcome === 'postponed'
    })

    const allEliminated = aliveAfter.length === 0
    if (allEliminated && config.rollover) {
      dispatch(triggerRollover())
    } else if (aliveAfter.length <= 1 || allEliminated) {
      dispatch(completeGame())
    }
  }

  const handleNextRound = () => {
    dispatch(addRound(matchday + 1))
    dispatch(openPicks())
  }

  const roundStateColor: Record<string, string> = {
    pending: colors.textMuted,
    picking: colors.primary,
    locked: colors.warning,
    processing: colors.deferred,
    complete: colors.success,
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          ...baseStyles.card,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div>
          <h2 style={{ ...baseStyles.heading, marginBottom: '0.25rem' }}>
            Round {currentRoundNum}
          </h2>
          <span style={{ color: colors.textMuted }}>
            Matchday {matchday} · {config.leagues.length} league
            {config.leagues.length > 1 ? 's' : ''} · {config.season}
          </span>
        </div>
        <div style={baseStyles.flexRow}>
          <span
            style={{
              ...baseStyles.badge,
              backgroundColor: (roundStateColor[roundState] ?? colors.textMuted) + '25',
              color: roundStateColor[roundState] ?? colors.textMuted,
            }}
          >
            {roundState.toUpperCase()}
          </span>
          <span
            style={{
              ...baseStyles.badge,
              backgroundColor: colors.success + '25',
              color: colors.success,
            }}
          >
            {alivePlayers.length} alive
          </span>
          {gameStatus === 'rollover_pending' && (
            <span
              style={{
                ...baseStyles.badge,
                backgroundColor: colors.warning + '25',
                color: colors.warning,
              }}
            >
              ROLLOVER
            </span>
          )}
        </div>
      </div>

      {/* Fixtures Panel */}
      <div style={baseStyles.card}>
        <h3 style={{ ...baseStyles.heading, fontSize: '1.1rem' }}>
          ⚽ Fixtures
        </h3>
        {fixturesByLeague.length === 0 ? (
          <p style={{ color: colors.textMuted }}>
            No fixtures found for matchday {matchday}
          </p>
        ) : (
          fixturesByLeague.map((group) => (
            <div key={group.league} style={{ marginBottom: '1rem' }}>
              <h4
                style={{
                  fontSize: '0.85rem',
                  color: colors.primary,
                  marginBottom: '0.4rem',
                  fontWeight: 600,
                }}
              >
                {group.leagueName}
              </h4>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '0.3rem',
                }}
              >
                {group.matches.map((match, i) => (
                  <div
                    key={`${match.homeTeam}-${match.awayTeam}-${i}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.35rem 0.6rem',
                      backgroundColor: colors.bg,
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                    }}
                  >
                    <span style={{ flex: 1, textAlign: 'right', paddingRight: '0.5rem' }}>
                      {shortenTeam(match.homeTeam)}
                    </span>
                    {match.status === 'postponed' ? (
                      <span
                        style={{
                          color: colors.warning,
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          padding: '0.1rem 0.4rem',
                          backgroundColor: colors.warning + '20',
                          borderRadius: '4px',
                        }}
                      >
                        PPD
                      </span>
                    ) : (
                      <span
                        style={{
                          fontWeight: 700,
                          minWidth: '3rem',
                          textAlign: 'center',
                          color:
                            match.homeScore !== null ? colors.text : colors.textMuted,
                        }}
                      >
                        {match.homeScore ?? '?'} - {match.awayScore ?? '?'}
                      </span>
                    )}
                    <span style={{ flex: 1, paddingLeft: '0.5rem' }}>
                      {shortenTeam(match.awayTeam)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ ...baseStyles.flexRow, flexWrap: 'wrap', marginBottom: '1rem' }}>
        {roundState === 'picking' && (
          <>
            <button style={baseStyles.buttonSecondary} onClick={handleReRandomize}>
              🎲 Re-randomize All
            </button>
            <button
              style={{
                ...baseStyles.button,
                opacity: currentPicks.size >= alivePlayers.length ? 1 : 0.5,
              }}
              disabled={currentPicks.size < alivePlayers.length}
              onClick={handleLock}
            >
              🔒 Lock Picks
            </button>
          </>
        )}
        {roundState === 'locked' && (
          <button style={baseStyles.button} onClick={handleProcessResults}>
            ⚡ Process Results
          </button>
        )}
        {roundState === 'complete' && gameStatus === 'active' && (
          <button style={baseStyles.button} onClick={handleNextRound}>
            ➡️ Next Round
          </button>
        )}
        {roundState === 'complete' && gameStatus !== 'active' && (
          <div
            style={{
              padding: '0.8rem 1.2rem',
              backgroundColor: colors.primary + '20',
              borderRadius: '8px',
              fontWeight: 600,
            }}
          >
            {gameStatus === 'completed'
              ? '🏁 Game Over!'
              : gameStatus === 'rollover_pending'
                ? '🔄 Rollover triggered — all players eliminated!'
                : `Game status: ${gameStatus}`}
          </div>
        )}
      </div>

      {/* Player Picks Panel */}
      <div style={baseStyles.card}>
        <h3 style={{ ...baseStyles.heading, fontSize: '1.1rem' }}>
          🎯 Player Picks
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '0.5rem',
          }}
        >
          {players.map((player) => (
            <PlayerPicker
              key={player.id}
              player={player}
              matchday={matchday}
              availableTeams={getAvailableTeams(player)}
              currentPick={currentPicks.get(player.id) ?? null}
              disabled={roundState !== 'picking'}
            />
          ))}
        </div>
      </div>

      {/* Pick History */}
      <GameLog players={players} rounds={rounds} collapsible />
    </div>
  )
}
