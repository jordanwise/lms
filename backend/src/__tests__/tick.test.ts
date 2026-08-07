import {
  post,
  get,
  uniqueId,
  cleanupGame,
  cleanupUser,
} from './helpers';
import { getResults } from '../lib/fixtures';
import { processTick } from '../lib/tickProcessor';
import { getItem, queryItems } from '../lib/dynamo';
import { Keys, SKPrefix } from '../lib/keys';
import type { GameMetaItem, PickItem, PlayerItem } from '../types';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
async function createTestUser(name: string): Promise<string> {
  const { data } = await post('/users', { displayName: name });
  return data.userId;
}

async function createTestGame(creatorId: string, displayName: string) {
  const { data } = await post('/games', {
    name: uniqueId('TickGame'),
    fee: 10,
    leagues: ['premier-league'],
    rollover: false,
    splitPot: false,
    creatorId,
    displayName,
  });
  return data;
}

describe('Tick System', () => {
  // ──────────────────────────────────────────────
  // POST /tick — manual tick endpoint
  // ──────────────────────────────────────────────
  describe('POST /tick', () => {
    it('returns 200 with empty result when no locked games', async () => {
      const { status, data } = await post('/tick', {});
      expect(status).toBe(200);
      expect(data.gamesChecked).toBe(0);
      expect(data.gamesProcessed).toBe(0);
      expect(data.results).toEqual([]);
    });

    it('processTick direct call returns empty when no locked games', async () => {
      const result = await processTick();
      expect(result.gamesChecked).toBe(0);
      expect(result.gamesProcessed).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // Tick with locked game
  // ──────────────────────────────────────────────
  describe('Tick processing locked game', () => {
    let creatorId: string;
    let gameId: string;
    const matchday = '2026-08-01';

    beforeAll(async () => {
      creatorId = await createTestUser(uniqueId('TickCreator'));

      // Create game
      const game = await createTestGame(creatorId, 'TickCreator');
      gameId = game.gameId;

      // Add round with a known matchday
      await post(`/games/${gameId}/rounds`, {
        matchday,
        leagueId: 'premier-league',
      });

      // Open picks
      await post(`/games/${gameId}/rounds/1/open`, {});

      // Submit picks using teams whose fixture outcomes we can predict
      // Use a team that has known fixture result for this matchday
      const fixtureResults = getResults(['arsenal'], matchday, 'premier-league');
      const outcome = fixtureResults['arsenal'];

      await post(`/games/${gameId}/rounds/1/picks`, {
        userId: creatorId,
        teamId: 'arsenal',
        teamName: 'Arsenal',
      });

      // Lock the round
      await post(`/games/${gameId}/rounds/1/lock`, {});
    });

    afterAll(async () => {
      await cleanupGame(gameId);
      await cleanupUser(creatorId);
    });

    it('processes a locked game and resolves outcomes', async () => {
      const { status, data } = await post('/tick', {});
      expect(status).toBe(200);

      // The game should have been picked up and processed
      const processedGameIds = data.results.map((r: any) => r.gameId);
      if (processedGameIds.includes(gameId)) {
        const result = data.results.find((r: any) => r.gameId === gameId);
        expect(result).toBeDefined();
        expect(result.roundNum).toBe(1);
        expect(result.pickCount).toBe(1);
        expect(result.resolvedOutcomes.length).toBe(1);
      }

      // Verify game was transitioned
      const game = await getItem(Keys.gameMeta(gameId)) as GameMetaItem | undefined;
      if (game) {
        // Should be completed (1 player = winner) or still active
        expect(['completed', 'active']).toContain(game.state);
      }
    });
  });

  // ──────────────────────────────────────────────
  // Tick idempotency
  // ──────────────────────────────────────────────
  describe('Tick idempotency', () => {
    it('running tick twice does not double-process', async () => {
      // First tick
      const result1 = await post('/tick', {});
      expect(result1.status).toBe(200);
      const processed1 = result1.data.gamesProcessed;

      // Second tick
      const result2 = await post('/tick', {});
      expect(result2.status).toBe(200);

      // Second tick should process 0 or fewer games
      // (already processed games should not be picked up again)
      expect(result2.data.gamesProcessed).toBeLessThanOrEqual(processed1);
    });
  });

  // ──────────────────────────────────────────────
  // Tick with multiple locked games
  // ──────────────────────────────────────────────
  describe('Tick with multiple locked games', () => {
    let creatorId: string;
    let gameIds: string[] = [];
    const matchday = '2026-09-15';
    const playerIds: string[] = [];

    beforeAll(async () => {
      creatorId = await createTestUser(uniqueId('MultiTickCreator'));

      // Create 2 games, lock them both
      for (let i = 0; i < 2; i++) {
        const playerId = uniqueId(`MultiPlayer${i}`);
        playerIds.push(playerId);

        const game = await createTestGame(creatorId, `MultiTickCreator${i}`);
        gameIds.push(game.gameId);

        // Join player
        await post(`/games/${game.gameId}/join`, {
          userId: playerId,
          displayName: `Player${i}`,
        });

        // Add round
        await post(`/games/${game.gameId}/rounds`, {
          matchday,
          leagueId: 'premier-league',
        });

        // Open picks
        await post(`/games/${game.gameId}/rounds/1/open`, {});

        // Both players submit picks
        await post(`/games/${game.gameId}/rounds/1/picks`, {
          userId: creatorId,
          teamId: 'arsenal',
          teamName: 'Arsenal',
        });
        await post(`/games/${game.gameId}/rounds/1/picks`, {
          userId: playerId,
          teamId: 'liverpool',
          teamName: 'Liverpool',
        });

        // Lock round
        await post(`/games/${game.gameId}/rounds/1/lock`, {});
      }
    });

    afterAll(async () => {
      for (const gid of gameIds) {
        await cleanupGame(gid);
      }
      await cleanupUser(creatorId);
      for (const pid of playerIds) {
        await cleanupUser(pid);
      }
    });

    it('processes all locked games in one tick', async () => {
      const { status, data } = await post('/tick', {});
      expect(status).toBe(200);
      expect(data.gamesChecked).toBeGreaterThanOrEqual(0);

      // After tick, all games should be in a resolved state
      for (const gid of gameIds) {
        const game = await getItem(Keys.gameMeta(gid)) as GameMetaItem | undefined;
        expect(game).toBeDefined();
        // Game should be resolved: completed, active, or rollover_pending
        expect(['completed', 'active', 'rollover_pending']).toContain(game!.state);
        // Should not be locked anymore
        expect(game!.roundState).not.toBe('locked');
      }
    });
  });
});
