import type { Match } from '../store/types'

export interface SeasonData {
  league: string
  leagueName: string
  season: string
  matches: Match[]
}

export interface ManifestEntry {
  league: string
  season: string
  filename: string
  matchCount: number
}

export interface ManifestData {
  generatedAt: string
  totalMatches: number
  seasons: string[]
  leagues: Record<string, string>
  files: ManifestEntry[]
  missing: { league: string; season: string }[]
}

const fixtureModules = import.meta.glob('../data/fixtures/*.json', {
  eager: true,
}) as Record<string, { default: SeasonData } | SeasonData>

const manifestModule = import.meta.glob('../data/fixtures/manifest.json', {
  eager: true,
}) as Record<string, { default: ManifestData } | ManifestData>

function resolveModule<T>(mod: { default: T } | T): T {
  if (mod && typeof mod === 'object' && 'default' in mod) {
    return mod.default
  }
  return mod
}

export async function loadFixtures(
  league: string,
  season: string,
): Promise<SeasonData | null> {
  const key = `../data/fixtures/${league}_${season}.json`
  const mod = fixtureModules[key]
  if (!mod) return null
  return resolveModule(mod)
}

export function getMatchdayFixtures(
  data: SeasonData,
  matchday: number,
): Match[] {
  return data.matches.filter((m) => m.matchday === matchday)
}

export function getAvailableMatchdays(data: SeasonData): number[] {
  const matchdays = new Set(data.matches.map((m) => m.matchday))
  return [...matchdays].sort((a, b) => a - b)
}

export function getTeamsForMatchday(
  data: SeasonData,
  matchday: number,
): string[] {
  const matches = getMatchdayFixtures(data, matchday)
  const teams = new Set<string>()
  for (const m of matches) {
    teams.add(m.homeTeam)
    teams.add(m.awayTeam)
  }
  return [...teams]
}

export async function loadManifest(): Promise<ManifestData> {
  const key = '../data/fixtures/manifest.json'
  const mod = manifestModule[key]
  if (!mod) throw new Error('Manifest not found')
  return resolveModule(mod)
}

export function getAvailableSeasons(
  manifest: ManifestData,
  league: string,
): string[] {
  return manifest.files
    .filter((f) => f.league === league)
    .map((f) => f.season)
    .sort()
}

export function getAvailableLeagues(manifest: ManifestData): string[] {
  return Object.keys(manifest.leagues)
}
