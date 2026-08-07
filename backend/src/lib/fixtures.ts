// Mock fixtures for testing — in production this would call an external API

export interface Fixture {
  teamId: string;
  teamName: string;
  homeTeam: string;
  awayTeam: string;
  matchday: string;
  leagueId: string;
  scheduledDate: string; // ISO 8601
  result?: 'home' | 'away' | 'draw' | 'postponed';
}

// 20 Premier League teams
export const PREMIER_LEAGUE_TEAMS = [
  { id: 'arsenal', name: 'Arsenal' },
  { id: 'aston-villa', name: 'Aston Villa' },
  { id: 'bournemouth', name: 'Bournemouth' },
  { id: 'brentford', name: 'Brentford' },
  { id: 'brighton', name: 'Brighton' },
  { id: 'chelsea', name: 'Chelsea' },
  { id: 'crystal-palace', name: 'Crystal Palace' },
  { id: 'everton', name: 'Everton' },
  { id: 'fulham', name: 'Fulham' },
  { id: 'ipswich', name: 'Ipswich Town' },
  { id: 'leicester', name: 'Leicester City' },
  { id: 'liverpool', name: 'Liverpool' },
  { id: 'man-city', name: 'Manchester City' },
  { id: 'man-utd', name: 'Manchester United' },
  { id: 'newcastle', name: 'Newcastle United' },
  { id: 'nottingham-forest', name: 'Nottingham Forest' },
  { id: 'southampton', name: 'Southampton' },
  { id: 'tottenham', name: 'Tottenham Hotspur' },
  { id: 'west-ham', name: 'West Ham United' },
  { id: 'wolves', name: 'Wolverhampton' },
] as const;

/**
 * Simple deterministic hash for a string.
 */
function hashStr(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Generate mock fixtures for any matchday.
 * Pairs up all 20 teams into 10 fixtures with deterministic results.
 */
export function generateFixtures(matchday: string, leagueId: string): Fixture[] {
  // Derive a stable offset from the matchday so pairings rotate weekly
  const mdHash = hashStr(matchday);
  const shift = mdHash % 19; // 0..18

  // Rotate the team list by the hash-derived shift
  const teams = [...PREMIER_LEAGUE_TEAMS];
  const rotated = [...teams.slice(shift), ...teams.slice(0, shift)];

  const fixtures: Fixture[] = [];
  for (let i = 0; i < rotated.length; i += 2) {
    const home = rotated[i];
    const away = rotated[i + 1];
    const teamId = home.id;

    // Determine result deterministically from teamId + matchday
    const outcomeHash = hashStr(`${teamId}:${matchday}`);
    // 60% win, 20% draw, 15% loss, 5% postponed
    const roll = outcomeHash % 100;
    let result: Fixture['result'];
    if (roll < 60) {
      result = 'home';
    } else if (roll < 80) {
      result = 'draw';
    } else if (roll < 95) {
      result = 'away';
    } else {
      result = 'postponed';
    }

    fixtures.push({
      teamId: home.id,
      teamName: home.name,
      homeTeam: home.name,
      awayTeam: away.name,
      matchday,
      leagueId,
      scheduledDate: `2026-${String(3 + Math.floor(hashStr(matchday) % 3)).padStart(2, '0')}-${String(15 + (hashStr(matchday) % 14)).padStart(2, '0')}T15:00:00Z`,
      result,
    });
  }

  return fixtures;
}

/**
 * Get results for a specific set of teams in a matchday.
 * Returns a map of teamId → outcome (from the perspective of the team whose
 * home/away status we track in the pick).
 *
 * Outcome mapping for the picked team:
 * - If picked team is home and result is 'home' → 'win'
 * - If picked team is away and result is 'away' → 'win'
 * - If result is 'draw' → 'draw'
 * - If result is 'postponed' → 'postponed'
 * - Otherwise → 'loss'
 */
export function getResults(
  teamIds: string[],
  matchday: string,
  leagueId: string
): Record<string, 'win' | 'loss' | 'draw' | 'postponed'> {
  const fixtures = generateFixtures(matchday, leagueId);
  const fixtureMap = new Map(fixtures.map((f) => [f.teamId, f]));

  const results: Record<string, 'win' | 'loss' | 'draw' | 'postponed'> = {};

  for (const teamId of teamIds) {
    const fixture = fixtureMap.get(teamId);
    if (!fixture || !fixture.result) {
      results[teamId] = 'loss';
      continue;
    }

    // The picked team's ID matches the home team in our generated fixtures
    const result = fixture.result;
    if (result === 'home') {
      results[teamId] = 'win';
    } else if (result === 'away') {
      results[teamId] = 'loss';
    } else if (result === 'draw') {
      results[teamId] = 'draw';
    } else {
      results[teamId] = 'postponed';
    }
  }

  return results;
}
