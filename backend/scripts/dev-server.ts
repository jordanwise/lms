import { createServer } from 'node:http'

/**
 * Lightweight dev server that serves the same API shape as the SAM Lambda handlers
 * using in-memory seed data. No Docker/DynamoDB required.
 *
 * Usage: npx tsx scripts/dev-server.ts
 */

// ─── Seed data (matches seed-data.sh) ───

const game = {
  gameId: 'game-001',
  name: 'Weekend Warriors',
  pin: 'ABC12345',
  fee: 10,
  leagues: ['premier-league'],
  rollover: true,
  splitPot: false,
  state: 'active',
  roundState: 'complete',
  currentRound: 3,
  prizePool: 60,
  playerCount: 6,
  creatorId: 'user-alice',
  players: [
    { userId: 'user-alice', displayName: 'Alice', status: 'alive', joinedAt: '2026-03-10T12:00:00Z' },
    { userId: 'user-bob', displayName: 'Bob', status: 'alive', joinedAt: '2026-03-10T13:00:00Z' },
    { userId: 'user-charlie', displayName: 'Charlie', status: 'eliminated', joinedAt: '2026-03-10T14:00:00Z' },
    { userId: 'user-diana', displayName: 'Diana', status: 'alive', joinedAt: '2026-03-10T15:00:00Z' },
    { userId: 'user-eric', displayName: 'Eric', status: 'eliminated', joinedAt: '2026-03-11T08:00:00Z' },
    { userId: 'user-fiona', displayName: 'Fiona', status: 'deferred', joinedAt: '2026-03-11T09:00:00Z' },
  ],
  rounds: [
    { roundNum: 1, state: 'complete', matchday: 'GW28', leagueId: 'premier-league', deadline: '2026-03-15T12:30:00Z' },
    { roundNum: 2, state: 'complete', matchday: 'GW29', leagueId: 'premier-league', deadline: '2026-03-22T12:30:00Z' },
    { roundNum: 3, state: 'complete', matchday: 'GW30', leagueId: 'premier-league', deadline: '2026-03-29T12:30:00Z' },
  ],
  picks: [
    // Round 1
    { roundNum: 1, userId: 'user-alice', teamId: 'arsenal', teamName: 'Arsenal', outcome: 'win', pickedAt: '2026-03-15T10:00:00Z' },
    { roundNum: 1, userId: 'user-bob', teamId: 'man-city', teamName: 'Manchester City', outcome: 'win', pickedAt: '2026-03-15T11:00:00Z' },
    { roundNum: 1, userId: 'user-charlie', teamId: 'liverpool', teamName: 'Liverpool', outcome: 'win', pickedAt: '2026-03-15T09:00:00Z' },
    { roundNum: 1, userId: 'user-diana', teamId: 'chelsea', teamName: 'Chelsea', outcome: 'win', pickedAt: '2026-03-15T08:00:00Z' },
    { roundNum: 1, userId: 'user-eric', teamId: 'west-ham', teamName: 'West Ham', outcome: 'loss', pickedAt: '2026-03-15T07:00:00Z' },
    { roundNum: 1, userId: 'user-fiona', teamId: 'tottenham', teamName: 'Tottenham', outcome: 'win', pickedAt: '2026-03-15T06:00:00Z' },
    // Round 2
    { roundNum: 2, userId: 'user-alice', teamId: 'man-city', teamName: 'Manchester City', outcome: 'win', pickedAt: '2026-03-22T10:00:00Z' },
    { roundNum: 2, userId: 'user-bob', teamId: 'arsenal', teamName: 'Arsenal', outcome: 'win', pickedAt: '2026-03-22T11:00:00Z' },
    { roundNum: 2, userId: 'user-charlie', teamId: 'man-utd', teamName: 'Manchester United', outcome: 'draw', pickedAt: '2026-03-22T09:00:00Z' },
    { roundNum: 2, userId: 'user-diana', teamId: 'arsenal', teamName: 'Arsenal', outcome: 'win', pickedAt: '2026-03-22T08:00:00Z' },
    { roundNum: 2, userId: 'user-fiona', teamId: 'newcastle', teamName: 'Newcastle', outcome: 'win', pickedAt: '2026-03-22T07:00:00Z' },
    // Round 3
    { roundNum: 3, userId: 'user-alice', teamId: 'liverpool', teamName: 'Liverpool', outcome: 'win', pickedAt: '2026-03-29T10:00:00Z' },
    { roundNum: 3, userId: 'user-bob', teamId: 'chelsea', teamName: 'Chelsea', outcome: 'win', pickedAt: '2026-03-29T11:00:00Z' },
    { roundNum: 3, userId: 'user-diana', teamId: 'tottenham', teamName: 'Tottenham', outcome: 'win', pickedAt: '2026-03-29T08:00:00Z' },
    { roundNum: 3, userId: 'user-fiona', teamId: 'brighton', teamName: 'Brighton', outcome: 'postponed', pickedAt: '2026-03-29T07:00:00Z' },
  ],
}

const users = [
  { userId: 'user-alice', displayName: 'Alice' },
  { userId: 'user-bob', displayName: 'Bob' },
  { userId: 'user-charlie', displayName: 'Charlie' },
  { userId: 'user-diana', displayName: 'Diana' },
  { userId: 'user-eric', displayName: 'Eric' },
  { userId: 'user-fiona', displayName: 'Fiona' },
]

// ─── Router ───

type RouteHandler = (params: Record<string, string>) => { status: number; body: unknown }

const routes: Array<{ method: string; pattern: RegExp; handler: RouteHandler }> = [
  {
    method: 'GET',
    pattern: /^\/games\/([^/]+)$/,
    handler: (params) => {
      if (params.gameId === game.gameId) {
        return { status: 200, body: game }
      }
      return { status: 404, body: { message: 'Game not found' } }
    },
  },
  {
    method: 'GET',
    pattern: /^\/games\/pin\/([^/]+)$/,
    handler: (params) => {
      if (params.pin === game.pin) {
        return { status: 200, body: game }
      }
      return { status: 404, body: { message: 'Game not found' } }
    },
  },
  {
    method: 'GET',
    pattern: /^\/games\/([^/]+)\/players$/,
    handler: (params) => {
      if (params.gameId === game.gameId) {
        return { status: 200, body: { players: game.players } }
      }
      return { status: 404, body: { message: 'Game not found' } }
    },
  },
  {
    method: 'GET',
    pattern: /^\/users\/([^/]+)$/,
    handler: (params) => {
      const user = users.find((u) => u.userId === params.userId)
      if (user) return { status: 200, body: user }
      return { status: 404, body: { message: 'User not found' } }
    },
  },
  {
    method: 'GET',
    pattern: /^\/users\/([^/]+)\/games$/,
    handler: (params) => {
      const player = game.players.find((p) => p.userId === params.userId)
      if (player) {
        return {
          status: 200,
          body: {
            games: [
              {
                gameId: game.gameId,
                gameName: game.name,
                gameState: game.state,
                playerStatus: player.status,
              },
            ],
          },
        }
      }
      return { status: 200, body: { games: [] } }
    },
  },
]

function matchRoute(method: string, url: string) {
  for (const route of routes) {
    if (route.method !== method) continue
    const match = url.match(route.pattern)
    if (!match) continue

    // Extract named params based on route
    const params: Record<string, string> = {}
    if (url.startsWith('/games/pin/')) {
      params.pin = match[1]
    } else if (url.startsWith('/games/')) {
      params.gameId = match[1]
    } else if (url.startsWith('/users/')) {
      params.userId = match[1]
    }

    return { handler: route.handler, params }
  }
  return null
}

// ─── Server ───

const PORT = Number(process.env.PORT ?? 3000)

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const matched = matchRoute(req.method ?? 'GET', url.pathname)

  if (matched) {
    const result = matched.handler(matched.params)
    res.writeHead(result.status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(result.body))
    console.log(`  ${req.method} ${url.pathname} → ${result.status}`)
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: 'Not found' }))
    console.log(`  ${req.method} ${url.pathname} → 404 (no route)`)
  }
})

server.listen(PORT, () => {
  console.log(`\n🚀 LMS Dev Server running on http://localhost:${PORT}`)
  console.log(`   Serving seed data for game: ${game.name} (${game.gameId})`)
  console.log(`   ${game.players.length} players, ${game.rounds.length} rounds, ${game.picks.length} picks\n`)
})
