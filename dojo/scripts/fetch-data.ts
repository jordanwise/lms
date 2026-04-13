import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ─── Configuration ───────────────────────────────────────────────────────────

const SEASONS = [
  '2015-16', '2016-17', '2017-18', '2018-19', '2019-20',
  '2020-21', '2021-22', '2022-23', '2023-24', '2024-25',
]

// Leagues available from openfootball/football.json (GitHub raw)
const FOOTBALL_JSON_LEAGUES: Record<string, string> = {
  'en.1': 'Premier League',
  'en.2': 'Championship',
  'en.3': 'League One',
  'en.4': 'League Two',
  'sco.1': 'Scottish Premiership',
}

// National League uses a different source (openfootball.github.io/england)
const NATIONAL_LEAGUE_KEY = 'en.5'
const NATIONAL_LEAGUE_NAME = 'National League'

const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'data', 'fixtures')

// ─── Types ───────────────────────────────────────────────────────────────────

interface RawMatch {
  round?: string
  date: string
  time?: string
  team1: string
  team2: string
  score?: {
    ft?: [number, number]
    ht?: [number, number]
  }
}

interface RawSeason {
  name: string
  matches: RawMatch[]
}

interface NormalizedMatch {
  date: string
  matchday: number
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  status: 'completed' | 'postponed'
}

interface NormalizedSeason {
  league: string
  leagueName: string
  season: string
  matches: NormalizedMatch[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseMatchday(round: string | undefined): number {
  if (!round) return 0
  const match = round.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

function normalizeMatches(raw: RawSeason, league: string, leagueName: string, season: string): NormalizedSeason {
  const matches: NormalizedMatch[] = raw.matches.map(m => {
    const hasScore = m.score?.ft != null
    return {
      date: m.date,
      matchday: parseMatchday(m.round),
      homeTeam: m.team1,
      awayTeam: m.team2,
      homeScore: hasScore ? m.score!.ft![0] : null,
      awayScore: hasScore ? m.score!.ft![1] : null,
      status: hasScore ? 'completed' as const : 'postponed' as const,
    }
  })

  return { league, leagueName, season, matches }
}

async function fetchJson(url: string): Promise<RawSeason | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return null
    }
    return await response.json() as RawSeason
  } catch {
    return null
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🏟️  LMS Dojo — Fetching fixture data from OpenFootball\n')

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const results: { league: string; season: string; matches: number; status: string }[] = []
  let totalMatches = 0

  for (const season of SEASONS) {
    console.log(`\n📅 Season: ${season}`)

    // Fetch standard leagues from football.json repo
    for (const [leagueKey, leagueName] of Object.entries(FOOTBALL_JSON_LEAGUES)) {
      const url = `https://raw.githubusercontent.com/openfootball/football.json/master/${season}/${leagueKey}.json`
      const raw = await fetchJson(url)

      if (raw) {
        const normalized = normalizeMatches(raw, leagueKey, leagueName, season)
        const filename = `${leagueKey}_${season}.json`
        const filepath = path.join(OUTPUT_DIR, filename)
        fs.writeFileSync(filepath, JSON.stringify(normalized, null, 2))

        const completedCount = normalized.matches.filter(m => m.status === 'completed').length
        const postponedCount = normalized.matches.filter(m => m.status === 'postponed').length

        console.log(`  ✅ ${leagueName}: ${normalized.matches.length} matches (${completedCount} completed, ${postponedCount} postponed)`)
        results.push({ league: leagueKey, season, matches: normalized.matches.length, status: 'ok' })
        totalMatches += normalized.matches.length
      } else {
        console.log(`  ❌ ${leagueName}: not available`)
        results.push({ league: leagueKey, season, matches: 0, status: 'missing' })
      }

      // Small delay to be polite to GitHub
      await delay(100)
    }

    // Fetch National League from openfootball.github.io/england
    const nlUrl = `https://openfootball.github.io/england/${season}/5-nationalleague.json`
    const nlRaw = await fetchJson(nlUrl)

    if (nlRaw) {
      const normalized = normalizeMatches(nlRaw, NATIONAL_LEAGUE_KEY, NATIONAL_LEAGUE_NAME, season)
      const filename = `${NATIONAL_LEAGUE_KEY}_${season}.json`
      const filepath = path.join(OUTPUT_DIR, filename)
      fs.writeFileSync(filepath, JSON.stringify(normalized, null, 2))

      const completedCount = normalized.matches.filter(m => m.status === 'completed').length
      const postponedCount = normalized.matches.filter(m => m.status === 'postponed').length

      console.log(`  ✅ ${NATIONAL_LEAGUE_NAME}: ${normalized.matches.length} matches (${completedCount} completed, ${postponedCount} postponed)`)
      results.push({ league: NATIONAL_LEAGUE_KEY, season, matches: normalized.matches.length, status: 'ok' })
      totalMatches += normalized.matches.length
    } else {
      console.log(`  ❌ ${NATIONAL_LEAGUE_NAME}: not available`)
      results.push({ league: NATIONAL_LEAGUE_KEY, season, matches: 0, status: 'missing' })
    }

    await delay(100)
  }

  // Generate manifest
  const manifest = {
    generatedAt: new Date().toISOString(),
    totalMatches,
    seasons: SEASONS,
    leagues: { ...FOOTBALL_JSON_LEAGUES, [NATIONAL_LEAGUE_KEY]: NATIONAL_LEAGUE_NAME },
    files: results.filter(r => r.status === 'ok').map(r => ({
      league: r.league,
      season: r.season,
      filename: `${r.league}_${r.season}.json`,
      matchCount: r.matches,
    })),
    missing: results.filter(r => r.status === 'missing').map(r => ({
      league: r.league,
      season: r.season,
    })),
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  )

  // Summary
  console.log('\n' + '═'.repeat(60))
  console.log(`📊 Summary:`)
  console.log(`   Total matches fetched: ${totalMatches}`)
  console.log(`   Successful files: ${results.filter(r => r.status === 'ok').length}`)
  console.log(`   Missing files: ${results.filter(r => r.status === 'missing').length}`)

  if (manifest.missing.length > 0) {
    console.log(`\n⚠️  Missing data:`)
    for (const m of manifest.missing) {
      const name = { ...FOOTBALL_JSON_LEAGUES, [NATIONAL_LEAGUE_KEY]: NATIONAL_LEAGUE_NAME }[m.league]
      console.log(`   - ${name} ${m.season}`)
    }
  }

  console.log(`\n✅ Data saved to ${OUTPUT_DIR}`)
  console.log(`📋 Manifest saved to ${path.join(OUTPUT_DIR, 'manifest.json')}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
