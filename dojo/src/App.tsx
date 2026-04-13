import { useState } from 'react'
import { useAppSelector } from './store'
import type { RootState } from './store'
import GameSetup from './components/GameSetup'
import RoundView from './components/RoundView'
import ResultsSummary from './components/ResultsSummary'
import GameHistory from './components/GameHistory'
import { baseStyles, colors } from './styles'

type Tab = 'dojo' | 'history'

export default function App() {
  const gameStatus = useAppSelector((s: RootState) => s.game.status)
  const [activeTab, setActiveTab] = useState<Tab>('dojo')

  const tabStyle = (tab: Tab) => ({
    padding: '0.5rem 1.2rem',
    fontSize: '0.9rem',
    fontWeight: 600 as const,
    cursor: 'pointer' as const,
    border: 'none',
    borderBottom:
      activeTab === tab
        ? `2px solid ${colors.primary}`
        : '2px solid transparent',
    background: 'transparent',
    color: activeTab === tab ? colors.primary : colors.textMuted,
    transition: 'color 0.2s, border-color 0.2s',
  })

  return (
    <div style={baseStyles.container}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0',
          paddingBottom: '1rem',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '1.8rem',
            fontWeight: 800,
            background: `linear-gradient(135deg, ${colors.primary}, #9D8CFF)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          🥋 LMS Dojo
        </h1>
        <span style={{ fontSize: '0.8rem', color: colors.textMuted }}>
          Last Player Standing · Testing Environment
        </span>
      </header>

      {/* Tab Navigation */}
      <nav
        style={{
          display: 'flex',
          gap: '0.25rem',
          marginBottom: '1.5rem',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <button style={tabStyle('dojo')} onClick={() => setActiveTab('dojo')}>
          🥋 Dojo
        </button>
        <button
          style={tabStyle('history')}
          onClick={() => setActiveTab('history')}
        >
          📜 History
        </button>
      </nav>

      {/* Tab Content */}
      {activeTab === 'dojo' && (
        <>
          {gameStatus === 'created' && <GameSetup />}
          {gameStatus === 'active' && <RoundView />}
          {(gameStatus === 'completed' ||
            gameStatus === 'rollover_pending') && <ResultsSummary />}
        </>
      )}

      {activeTab === 'history' && <GameHistory />}
    </div>
  )
}
