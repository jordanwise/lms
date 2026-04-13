import { useState, useMemo } from 'react'
import { useAppDispatch } from '../store'
import {
  setLeagues,
  setSeason,
  setStartMatchday,
  setPlayerCount,
  setFee,
  setRollover,
  setSplitPot,
} from '../store/configSlice'
import { setPlayers } from '../store/playersSlice'
import { startGame } from '../store/gameSlice'
import { addRound, openPicks } from '../store/roundsSlice'
import manifest from '../data/fixtures/manifest.json'
import { baseStyles, colors } from '../styles'

const leagueNames = manifest.leagues as Record<string, string>
const allLeagueKeys = Object.keys(leagueNames)

function getAvailableSeasons(selectedLeagues: string[]): string[] {
  if (selectedLeagues.length === 0) return manifest.seasons
  return manifest.seasons.filter((season) =>
    selectedLeagues.every((league) =>
      manifest.files.some(
        (f) => f.league === league && f.season === season,
      ),
    ),
  )
}

export default function GameSetup() {
  const dispatch = useAppDispatch()

  const [selectedLeagues, setSelectedLeagues] = useState<string[]>(['en.1'])
  const [selectedSeason, setSelectedSeason] = useState('2024-25')
  const [startMd, setStartMd] = useState(1)
  const [playerCount, setPlayerCountLocal] = useState(4)
  const [playerNames, setPlayerNames] = useState<string[]>(
    Array.from({ length: 100 }, (_, i) => `Player ${i + 1}`),
  )
  const [rollover, setRolloverLocal] = useState(false)
  const [splitPot, setSplitPotLocal] = useState(true)
  const [fee, setFeeLocal] = useState(5)

  const availableSeasons = useMemo(
    () => getAvailableSeasons(selectedLeagues),
    [selectedLeagues],
  )

  const handleLeagueToggle = (league: string) => {
    setSelectedLeagues((prev) =>
      prev.includes(league)
        ? prev.filter((l) => l !== league)
        : [...prev, league],
    )
  }

  const handlePlayerNameChange = (index: number, name: string) => {
    setPlayerNames((prev) => {
      const next = [...prev]
      next[index] = name
      return next
    })
  }

  const handleStart = () => {
    if (selectedLeagues.length === 0) return
    if (!availableSeasons.includes(selectedSeason)) return

    dispatch(setLeagues(selectedLeagues))
    dispatch(setSeason(selectedSeason))
    dispatch(setStartMatchday(startMd))
    dispatch(setPlayerCount(playerCount))
    dispatch(setFee(fee))
    dispatch(setRollover(rollover))
    dispatch(setSplitPot(splitPot))
    dispatch(setPlayers(playerNames.slice(0, playerCount)))
    dispatch(startGame())
    dispatch(addRound(startMd))
    dispatch(openPicks())
  }

  const isValid =
    selectedLeagues.length > 0 && availableSeasons.includes(selectedSeason)

  return (
    <div>
      <h2 style={{ ...baseStyles.heading, fontSize: '1.5rem' }}>
        ⚙️ Game Setup
      </h2>

      {/* Leagues */}
      <div style={{ ...baseStyles.card }}>
        <label style={baseStyles.label}>Leagues</label>
        <div style={baseStyles.flexWrap}>
          {allLeagueKeys.map((key) => (
            <label
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                backgroundColor: selectedLeagues.includes(key)
                  ? colors.primary + '30'
                  : 'transparent',
                border: `1px solid ${
                  selectedLeagues.includes(key) ? colors.primary : colors.border
                }`,
                transition: 'all 0.2s',
              }}
            >
              <input
                type="checkbox"
                checked={selectedLeagues.includes(key)}
                onChange={() => handleLeagueToggle(key)}
                style={{ accentColor: colors.primary }}
              />
              <span style={{ fontSize: '0.9rem' }}>{leagueNames[key]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Season, Matchday & Fee */}
      <div style={{ ...baseStyles.card, ...baseStyles.grid3 }}>
        <div>
          <label style={baseStyles.label}>Season</label>
          <select
            style={{ ...baseStyles.select, width: '100%' }}
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
          >
            {availableSeasons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={baseStyles.label}>Start Matchday</label>
          <input
            type="number"
            min={1}
            max={46}
            value={startMd}
            onChange={(e) => setStartMd(Number(e.target.value))}
            style={baseStyles.input}
          />
        </div>
        <div>
          <label style={baseStyles.label}>Fee (£)</label>
          <input
            type="number"
            min={0}
            max={200}
            value={fee}
            onChange={(e) => setFeeLocal(Math.max(0, Number(e.target.value)))}
            style={baseStyles.input}
          />
        </div>
      </div>

      {/* Player Count */}
      <div style={baseStyles.card}>
        <label style={baseStyles.label}>Players ({playerCount})</label>
        <div style={{ ...baseStyles.flexRow, marginBottom: '1rem', alignItems: 'center' }}>
          <input
            type="range"
            min={2}
            max={100}
            value={playerCount}
            onChange={(e) => setPlayerCountLocal(Number(e.target.value))}
            style={{ flex: 1, accentColor: colors.primary }}
          />
          <input
            type="number"
            min={2}
            max={100}
            value={playerCount}
            onChange={(e) => setPlayerCountLocal(Math.max(2, Math.min(100, Number(e.target.value))))}
            style={{ ...baseStyles.input, width: '5rem', textAlign: 'center' }}
          />
        </div>

        <details style={{ cursor: 'pointer', marginTop: '0.5rem' }}>
          <summary style={{ color: colors.textMuted, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            Edit player names
          </summary>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '0.4rem',
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
          {Array.from({ length: playerCount }, (_, i) => (
            <input
              key={i}
              style={baseStyles.input}
              value={playerNames[i]}
              onChange={(e) => handlePlayerNameChange(i, e.target.value)}
              placeholder={`Player ${i + 1}`}
            />
          ))}
          </div>
        </details>
      </div>

      {/* Options */}
      <div style={{ ...baseStyles.card, ...baseStyles.grid2 }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={rollover}
            onChange={(e) => setRolloverLocal(e.target.checked)}
            style={{ accentColor: colors.primary, width: '18px', height: '18px' }}
          />
          <span>
            <strong>Rollover</strong>
            <br />
            <small style={{ color: colors.textMuted }}>
              All eliminated → everyone revived
            </small>
          </span>
        </label>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={splitPot}
            onChange={(e) => setSplitPotLocal(e.target.checked)}
            style={{ accentColor: colors.primary, width: '18px', height: '18px' }}
          />
          <span>
            <strong>Split Pot</strong>
            <br />
            <small style={{ color: colors.textMuted }}>
              Multiple survivors share the win
            </small>
          </span>
        </label>
      </div>

      {/* Start Button */}
      <button
        style={{
          ...baseStyles.button,
          width: '100%',
          padding: '1rem',
          fontSize: '1.1rem',
          opacity: isValid ? 1 : 0.4,
          marginTop: '0.5rem',
        }}
        disabled={!isValid}
        onClick={handleStart}
      >
        🚀 Start Game
      </button>
    </div>
  )
}
