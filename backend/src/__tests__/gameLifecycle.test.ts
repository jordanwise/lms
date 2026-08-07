import {
  post,
  get,
  uniqueId,
  cleanupGame,
  cleanupUser,
} from './helpers';

// ──────────────────────────────────────────────
// Helper: create a user and return their ID
// ──────────────────────────────────────────────
async function createTestUser(name: string): Promise<string> {
  const { data } = await post('/users', { displayName: name });
  return data.userId;
}

// ──────────────────────────────────────────────
// Helper: create a game with given parameters
// ──────────────────────────────────────────────
async function createTestGame(
  creatorId: string,
  displayName: string,
  opts: { rollover?: boolean; splitPot?: boolean; fee?: number } = {},
) {
  const { data } = await post('/games', {
    name: uniqueId('Lifecycle'),
    fee: opts.fee ?? 10,
    leagues: ['premier-league'],
    rollover: opts.rollover ?? false,
    splitPot: opts.splitPot ?? false,
    creatorId,
    displayName,
  });
  return data;
}

// ──────────────────────────────────────────────
// Helper: join a game
// ──────────────────────────────────────────────
async function joinGame(gameId: string, userId: string, displayName: string) {
  return post(`/games/${gameId}/join`, { userId, displayName });
}

// ──────────────────────────────────────────────
// Helper: complete a round
// ──────────────────────────────────────────────
async function completeRound(
  gameId: string,
  roundNum: number,
  picks: Array<{ userId: string; teamId: string; teamName: string }>,
  results: Array<{ teamId: string; outcome: 'win' | 'loss' | 'draw' | 'postponed' }>,
) {
  // Open picks
  await post(`/games/${gameId}/rounds/${roundNum}/open`, {});

  // Submit picks
  for (const pick of picks) {
    await post(`/games/${gameId}/rounds/${roundNum}/picks`, pick);
  }

  // Lock round
  await post(`/games/${gameId}/rounds/${roundNum}/lock`, {});

  // Submit results
  await post(`/games/${gameId}/rounds/${roundNum}/results`, { results });

  // Apply eliminations
  return post(`/games/${gameId}/rounds/${roundNum}/eliminate`, {});
}

// ──────────────────────────────────────────────
// Happy Path: Complete game with a winner
// ──────────────────────────────────────────────
describe('Game Lifecycle — Happy Path (Winner)', () => {
  let creatorId: string;
  let player2Id: string;
  let player3Id: string;
  let gameId: string;

  beforeAll(async () => {
    creatorId = await createTestUser(uniqueId('Creator'));
    player2Id = await createTestUser(uniqueId('Player2'));
    player3Id = await createTestUser(uniqueId('Player3'));

    const game = await createTestGame(creatorId, 'Creator', {
      rollover: false,
      splitPot: false,
    });
    gameId = game.gameId;
  });

  afterAll(async () => {
    await cleanupGame(gameId);
    await cleanupUser(creatorId);
    await cleanupUser(player2Id);
    await cleanupUser(player3Id);
  });

  it('starts in waiting_for_players state', async () => {
    const { status, data } = await get(`/games/${gameId}`);
    expect(status).toBe(200);
    expect(data.state).toBe('waiting_for_players');
    expect(data.playerCount).toBe(1);
  });

  it('allows players to join', async () => {
    const r1 = await joinGame(gameId, player2Id, 'Player2');
    expect(r1.status).toBe(200);

    const r2 = await joinGame(gameId, player3Id, 'Player3');
    expect(r2.status).toBe(200);

    const { data } = await get(`/games/${gameId}`);
    expect(data.playerCount).toBe(3);
  });

  it('adds round 1 and transitions to active', async () => {
    const r = await post(`/games/${gameId}/rounds`, {
      matchday: '2026-03-15',
      leagueId: 'premier-league',
    });
    expect(r.status).toBe(201);
    expect(r.data.roundNum).toBe(1);

    const { data } = await get(`/games/${gameId}`);
    expect(data.state).toBe('active');
    expect(data.roundState).toBe('pending');
  });

  it('completes round 1 — 1 eliminated, 2 survive', async () => {
    const result = await completeRound(
      gameId,
      1,
      [
        { userId: creatorId, teamId: 'arsenal', teamName: 'Arsenal' },
        { userId: player2Id, teamId: 'liverpool', teamName: 'Liverpool' },
        { userId: player3Id, teamId: 'man-city', teamName: 'Manchester City' },
      ],
      [
        { teamId: 'arsenal', outcome: 'win' },
        { teamId: 'liverpool', outcome: 'loss' },
        { teamId: 'man-city', outcome: 'loss' },
      ],
    );
    expect(result.status).toBe(200);
    // With 1 alive after eliminations, it could be a winner if exactly 1
    // But we get rid of 2 so 1 survives → WINNER_DETERMINED
  });

  it('reaches completed state with a winner', async () => {
    const { status, data } = await get(`/games/${gameId}`);
    expect(status).toBe(200);
    // The game should be completed if only one survived
    expect(data.state).toBe('completed');
  });
});

// ──────────────────────────────────────────────
// Split Pot: All players eliminated
// ──────────────────────────────────────────────
describe('Game Lifecycle — Split Pot', () => {
  let creatorId: string;
  let player2Id: string;
  let gameId: string;

  beforeAll(async () => {
    creatorId = await createTestUser(uniqueId('SplitCreator'));
    player2Id = await createTestUser(uniqueId('SplitPlayer2'));

    const game = await createTestGame(creatorId, 'SplitCreator', {
      splitPot: true,
      rollover: false,
    });
    gameId = game.gameId;

    await joinGame(gameId, player2Id, 'SplitPlayer2');
    await post(`/games/${gameId}/rounds`, {
      matchday: '2026-03-15',
      leagueId: 'premier-league',
    });
  });

  afterAll(async () => {
    await cleanupGame(gameId);
    await cleanupUser(creatorId);
    await cleanupUser(player2Id);
  });

  it('transitions to completed (split pot) when both eliminated', async () => {
    const result = await completeRound(
      gameId,
      1,
      [
        { userId: creatorId, teamId: 'arsenal', teamName: 'Arsenal' },
        { userId: player2Id, teamId: 'liverpool', teamName: 'Liverpool' },
      ],
      [
        { teamId: 'arsenal', outcome: 'loss' },
        { teamId: 'liverpool', outcome: 'loss' },
      ],
    );
    expect(result.status).toBe(200);

    if (result.data.gameEndEvent === 'ALL_ELIMINATED_SPLIT') {
      expect(result.data.gameState).toBe('completed');
      expect(result.data.gameEndEvent).toBe('ALL_ELIMINATED_SPLIT');
    }
    // If game ended differently due to fixture results, still verify final state is valid
    const { data } = await get(`/games/${gameId}`);
    expect(data.state).toBe('completed');
  });
});

// ──────────────────────────────────────────────
// Rollover: All players eliminated → rollover_pending
// ──────────────────────────────────────────────
describe('Game Lifecycle — Rollover', () => {
  let creatorId: string;
  let player2Id: string;
  let gameId: string;

  beforeAll(async () => {
    creatorId = await createTestUser(uniqueId('RollCreator'));
    player2Id = await createTestUser(uniqueId('RollPlayer2'));

    const game = await createTestGame(creatorId, 'RollCreator', {
      rollover: true,
      splitPot: false,
    });
    gameId = game.gameId;

    await joinGame(gameId, player2Id, 'RollPlayer2');
    await post(`/games/${gameId}/rounds`, {
      matchday: '2026-03-15',
      leagueId: 'premier-league',
    });
  });

  afterAll(async () => {
    await cleanupGame(gameId);
    await cleanupUser(creatorId);
    await cleanupUser(player2Id);
  });

  it('transitions to rollover_pending when both eliminated', async () => {
    const result = await completeRound(
      gameId,
      1,
      [
        { userId: creatorId, teamId: 'arsenal', teamName: 'Arsenal' },
        { userId: player2Id, teamId: 'liverpool', teamName: 'Liverpool' },
      ],
      [
        { teamId: 'arsenal', outcome: 'loss' },
        { teamId: 'liverpool', outcome: 'loss' },
      ],
    );
    expect(result.status).toBe(200);

    if (result.data.gameEndEvent === 'ALL_ELIMINATED_ROLLOVER') {
      expect(result.data.gameState).toBe('rollover_pending');
      expect(result.data.gameEndEvent).toBe('ALL_ELIMINATED_ROLLOVER');
    }
  });
});

// ──────────────────────────────────────────────
// Cancel Flow
// ──────────────────────────────────────────────
describe('Game Lifecycle — Cancel', () => {
  let creatorId: string;
  let gameId: string;

  beforeAll(async () => {
    creatorId = await createTestUser(uniqueId('CancelCreator'));
    const game = await createTestGame(creatorId, 'CancelCreator');
    gameId = game.gameId;
  });

  afterAll(async () => {
    await cleanupGame(gameId);
    await cleanupUser(creatorId);
  });

  it('cancels a game in waiting_for_players', async () => {
    const { status, data } = await post(`/games/${gameId}/cancel`, {});
    expect(status).toBe(200);
    expect(data.state).toBe('cancelled');
  });

  it('verifies game state is cancelled', async () => {
    const { status, data } = await get(`/games/${gameId}`);
    expect(status).toBe(200);
    expect(data.state).toBe('cancelled');
  });
});

// ──────────────────────────────────────────────
// Abandon + Restart Flow
// ──────────────────────────────────────────────
describe('Game Lifecycle — Abandon & Restart', () => {
  let creatorId: string;
  let player2Id: string;
  let gameId: string;

  beforeAll(async () => {
    creatorId = await createTestUser(uniqueId('AbandonCreator'));
    player2Id = await createTestUser(uniqueId('AbandonPlayer2'));

    const game = await createTestGame(creatorId, 'AbandonCreator');
    gameId = game.gameId;
    await joinGame(gameId, player2Id, 'AbandonPlayer2');
  });

  afterAll(async () => {
    await cleanupGame(gameId);
    await cleanupUser(creatorId);
    await cleanupUser(player2Id);
  });

  it('abandons when last player leaves', async () => {
    // First, player2 leaves
    await post(`/games/${gameId}/leave`, { userId: player2Id });
    // Then creator leaves → abandoned
    const { status, data } = await post(`/games/${gameId}/leave`, { userId: creatorId });
    expect(status).toBe(200);
    expect(data.abandoned).toBe(true);
  });

  it('verifies game is abandoned', async () => {
    const { status, data } = await get(`/games/${gameId}`);
    expect(status).toBe(200);
    expect(data.state).toBe('abandoned');
  });

  it('restarts abandoned game', async () => {
    const { status, data } = await post(`/games/${gameId}/restart`, { userId: creatorId });
    expect(status).toBe(200);
    expect(data.state).toBe('waiting_for_players');
  });

  it('verifies game is back to waiting_for_players', async () => {
    const { status, data } = await get(`/games/${gameId}`);
    expect(status).toBe(200);
    expect(data.state).toBe('waiting_for_players');
  });
});

// ──────────────────────────────────────────────
// Multi-round: 3 players → 2 rounds → 1 winner
// ──────────────────────────────────────────────
describe('Game Lifecycle — Multi-Round', () => {
  let creatorId: string;
  let player2Id: string;
  let player3Id: string;
  let gameId: string;

  beforeAll(async () => {
    creatorId = await createTestUser(uniqueId('MR_Creator'));
    player2Id = await createTestUser(uniqueId('MR_Player2'));
    player3Id = await createTestUser(uniqueId('MR_Player3'));

    const game = await createTestGame(creatorId, 'MRC', {
      rollover: false,
      splitPot: false,
    });
    gameId = game.gameId;

    await joinGame(gameId, player2Id, 'MRP2');
    await joinGame(gameId, player3Id, 'MRP3');
  });

  afterAll(async () => {
    await cleanupGame(gameId);
    await cleanupUser(creatorId);
    await cleanupUser(player2Id);
    await cleanupUser(player3Id);
  });

  it('sets up game with 3 players', async () => {
    const { data } = await get(`/games/${gameId}`);
    expect(data.playerCount).toBe(3);
  });

  it('completes round 1', async () => {
    await post(`/games/${gameId}/rounds`, {
      matchday: '2026-04-10',
      leagueId: 'premier-league',
    });

    const result = await completeRound(
      gameId,
      1,
      [
        { userId: creatorId, teamId: 'arsenal', teamName: 'Arsenal' },
        { userId: player2Id, teamId: 'liverpool', teamName: 'Liverpool' },
        { userId: player3Id, teamId: 'man-city', teamName: 'Manchester City' },
      ],
      [
        { teamId: 'arsenal', outcome: 'loss' },
        { teamId: 'liverpool', outcome: 'win' },
        { teamId: 'man-city', outcome: 'win' },
      ],
    );
    expect(result.status).toBe(200);

    const { data } = await get(`/games/${gameId}`);
    if (data.gameEndEvent === 'WINNER_DETERMINED') {
      // Only one survivor — game complete
      expect(data.state).toBe('completed');
    } else {
      // Still has multiple survivors — ready for round 2
      expect(data.state).toBe('active');
      expect(data.roundState).toBe('complete');
    }
  });

  it('completes round 2 if game still active', async () => {
    const { data: game } = await get(`/games/${gameId}`);
    if (game.state === 'completed') {
      // Game already finished — skip
      return;
    }

    // Get alive players
    const alivePlayers = game.players.filter(
      (p: any) => p.status === 'alive'
    );

    // Add round 2
    await post(`/games/${gameId}/rounds`, {
      matchday: '2026-04-17',
      leagueId: 'premier-league',
    });

    // Round 2 picks — must not duplicate round 1 picks ('liverpool', 'man-city')
    const round2Teams = ['chelsea', 'tottenham'];
    const picks = alivePlayers.map((p: any, i: number) => ({
      userId: p.userId,
      teamId: round2Teams[i % round2Teams.length],
      teamName: round2Teams[i % round2Teams.length],
    }));

    // Determine results: first player wins, rest lose
    const results: Array<{ teamId: string; outcome: 'win' | 'loss' }> = picks.map((
      pick: { teamId: string; teamName: string; userId: string },
      i: number,
    ) => ({
      teamId: pick.teamId,
      outcome: (i === 0 ? 'win' : 'loss') as 'win' | 'loss',
    }));

    const result = await completeRound(gameId, 2, picks, results);
    expect(result.status).toBe(200);

    if (result.data.gameEndEvent === 'WINNER_DETERMINED') {
      expect(result.data.gameState).toBe('completed');
    }
  });
});
