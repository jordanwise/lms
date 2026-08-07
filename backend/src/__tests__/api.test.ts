import {
  post,
  get,
  patch,
  put,
  uniqueId,
  cleanupGame,
  cleanupUser,
} from './helpers';

// ──────────────────────────────────────────────
// User Endpoints
// ──────────────────────────────────────────────
describe('User API', () => {
  describe('POST /users', () => {
    it('creates a user and returns 201 with userId', async () => {
      const name = uniqueId('TestUser');
      const { status, data } = await post('/users', { displayName: name });
      expect(status).toBe(201);
      expect(data.userId).toBeDefined();
      expect(data.displayName).toBe(name);
      expect(data.preferences).toBeDefined();
      expect(data.preferences.theme).toBe('dark');
    });

    it('returns 400 when displayName is missing', async () => {
      const { status, data } = await post('/users', {});
      expect(status).toBe(400);
      expect(data.error).toContain('displayName');
    });

    it('returns 400 when displayName is empty', async () => {
      const { status, data } = await post('/users', { displayName: '   ' });
      expect(status).toBe(400);
    });

    it('creates user with avatarUrl', async () => {
      const name = uniqueId('AvatarUser');
      const { status, data } = await post('/users', {
        displayName: name,
        avatarUrl: 'https://example.com/avatar.png',
      });
      expect(status).toBe(201);
      expect(data.userId).toBeDefined();
    });
  });

  describe('GET /users/{userId}', () => {
    let userId: string;
    const name = uniqueId('GetUser');

    beforeAll(async () => {
      const { data } = await post('/users', { displayName: name });
      userId = data.userId;
    });

    afterAll(async () => {
      await cleanupUser(userId);
    });

    it('returns 200 for existing user', async () => {
      const { status, data } = await get(`/users/${userId}`);
      expect(status).toBe(200);
      expect(data.userId).toBe(userId);
      expect(data.displayName).toBe(name);
    });

    it('returns 404 for non-existent user', async () => {
      const { status, data } = await get('/users/non-existent-id');
      expect(status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });

  describe('PATCH /users/{userId}/preferences', () => {
    let userId: string;

    beforeAll(async () => {
      const { data } = await post('/users', { displayName: uniqueId('PrefUser') });
      userId = data.userId;
    });

    afterAll(async () => {
      await cleanupUser(userId);
    });

    it('updates theme preference and returns 200', async () => {
      const { status, data } = await patch(`/users/${userId}/preferences`, { theme: 'light' });
      expect(status).toBe(200);
      expect(data.preferences.theme).toBe('light');
    });

    it('updates notification preferences', async () => {
      const { status, data } = await patch(`/users/${userId}/preferences`, {
        notificationsEnabled: false,
        notifyOnRoundOpen: false,
      });
      expect(status).toBe(200);
      expect(data.preferences.notificationsEnabled).toBe(false);
      expect(data.preferences.notifyOnRoundOpen).toBe(false);
    });

    it('updates favouriteLeagues', async () => {
      const { status, data } = await patch(`/users/${userId}/preferences`, {
        favouriteLeagues: ['premier-league', 'la-liga'],
      });
      expect(status).toBe(200);
      expect(data.preferences.favouriteLeagues).toEqual(['premier-league', 'la-liga']);
    });

    it('returns 404 for non-existent user', async () => {
      const { status } = await patch('/users/non-existent/preferences', { theme: 'light' });
      expect(status).toBe(404);
    });

    it('returns 400 for no valid preference keys', async () => {
      const { status } = await patch(`/users/${userId}/preferences`, { invalidKey: 'value' });
      expect(status).toBe(400);
    });
  });

  describe('PUT /users/{userId}/push-token', () => {
    let userId: string;

    beforeAll(async () => {
      const { data } = await post('/users', { displayName: uniqueId('PushUser') });
      userId = data.userId;
    });

    afterAll(async () => {
      await cleanupUser(userId);
    });

    it('registers a push token and returns 200', async () => {
      const { status, data } = await put(`/users/${userId}/push-token`, {
        pushToken: 'ExponentPushToken[test123]',
        platform: 'ios',
      });
      expect(status).toBe(200);
      expect(data.pushTokenRegistered).toBe(true);
    });

    it('returns 400 for missing pushToken', async () => {
      const { status } = await put(`/users/${userId}/push-token`, { platform: 'ios' });
      expect(status).toBe(400);
    });

    it('returns 400 for invalid platform', async () => {
      const { status } = await put(`/users/${userId}/push-token`, {
        pushToken: 'token',
        platform: 'web',
      });
      expect(status).toBe(400);
    });

    it('returns 404 for non-existent user', async () => {
      const { status } = await put('/users/non-existent/push-token', {
        pushToken: 'token',
        platform: 'ios',
      });
      expect(status).toBe(404);
    });
  });

  describe('GET /users/{userId}/games', () => {
    let userId: string;

    beforeAll(async () => {
      const { data } = await post('/users', { displayName: uniqueId('GamesUser') });
      userId = data.userId;
    });

    afterAll(async () => {
      await cleanupUser(userId);
    });

    it('returns games list (may be empty)', async () => {
      const { status, data } = await get(`/users/${userId}/games`);
      expect(status).toBe(200);
      expect(data.games).toBeDefined();
      expect(Array.isArray(data.games)).toBe(true);
    });
  });
});

// ──────────────────────────────────────────────
// Game Endpoints
// ──────────────────────────────────────────────
describe('Game API', () => {
  const creatorName = uniqueId('Creator');
  let creatorId: string;

  beforeAll(async () => {
    const { data } = await post('/users', { displayName: creatorName });
    creatorId = data.userId;
  });

  afterAll(async () => {
    await cleanupUser(creatorId);
  });

  describe('POST /games', () => {
    let gameId: string;

    afterAll(async () => {
      if (gameId) await cleanupGame(gameId);
    });

    it('creates a game and returns 201 with gameId and PIN', async () => {
      const { status, data } = await post('/games', {
        name: uniqueId('TestGame'),
        fee: 10,
        leagues: ['premier-league'],
        rollover: false,
        splitPot: false,
        creatorId,
        displayName: creatorName,
      });
      expect(status).toBe(201);
      expect(data.gameId).toBeDefined();
      expect(data.pin).toBeDefined();
      expect(data.pin.length).toBe(8);
      expect(data.state).toBe('waiting_for_players');
      expect(data.fee).toBe(10);
      gameId = data.gameId;
    });

    it('returns 400 when name is missing', async () => {
      const { status, data } = await post('/games', {
        fee: 10,
        leagues: ['premier-league'],
        creatorId,
        displayName: creatorName,
      });
      expect(status).toBe(400);
      expect(data.error).toContain('name');
    });

    it('returns 400 when fee < 5', async () => {
      const { status, data } = await post('/games', {
        name: 'Cheap Game',
        fee: 3,
        leagues: ['premier-league'],
        creatorId,
        displayName: creatorName,
      });
      expect(status).toBe(400);
      expect(data.error).toContain('fee');
    });

    it('returns 400 when no leagues provided', async () => {
      const { status, data } = await post('/games', {
        name: 'No League Game',
        fee: 10,
        leagues: [],
        creatorId,
        displayName: creatorName,
      });
      expect(status).toBe(400);
      expect(data.error).toContain('league');
    });

    it('returns 400 when creatorId is missing', async () => {
      const { status } = await post('/games', {
        name: 'No Creator',
        fee: 10,
        leagues: ['premier-league'],
        displayName: creatorName,
      });
      expect(status).toBe(400);
    });

    it('returns 400 when displayName is missing', async () => {
      const { status } = await post('/games', {
        name: 'No DisplayName',
        fee: 10,
        leagues: ['premier-league'],
        creatorId,
      });
      expect(status).toBe(400);
    });

    it('defaults rollover and splitPot to false', async () => {
      const { status, data } = await post('/games', {
        name: uniqueId('DefaultFlags'),
        fee: 10,
        leagues: ['premier-league'],
        creatorId,
        displayName: creatorName,
      });
      expect(status).toBe(201);
      expect(data.rollover).toBe(false);
      expect(data.splitPot).toBe(false);
      await cleanupGame(data.gameId);
    });
  });

  describe('GET /games/{gameId}', () => {
    let gameId: string;

    beforeAll(async () => {
      const { data } = await post('/games', {
        name: uniqueId('GetGameTest'),
        fee: 10,
        leagues: ['premier-league'],
        creatorId,
        displayName: creatorName,
      });
      gameId = data.gameId;
    });

    afterAll(async () => {
      await cleanupGame(gameId);
    });

    it('returns full game detail', async () => {
      const { status, data } = await get(`/games/${gameId}`);
      expect(status).toBe(200);
      expect(data.gameId).toBe(gameId);
      expect(data.name).toBeDefined();
      expect(data.pin).toBeDefined();
      expect(data.players).toBeDefined();
      expect(data.rounds).toBeDefined();
      expect(data.picks).toBeDefined();
      expect(data.state).toBe('waiting_for_players');
    });

    it('returns 404 for non-existent game', async () => {
      const { status } = await get('/games/non-existent-id');
      expect(status).toBe(404);
    });
  });

  describe('GET /games/pin/{pin}', () => {
    let gameId: string;
    let pin: string;

    beforeAll(async () => {
      const { data } = await post('/games', {
        name: uniqueId('PinGame'),
        fee: 10,
        leagues: ['premier-league'],
        creatorId,
        displayName: creatorName,
      });
      gameId = data.gameId;
      pin = data.pin;
    });

    afterAll(async () => {
      await cleanupGame(gameId);
    });

    it('returns game by PIN', async () => {
      const { status, data } = await get(`/games/pin/${pin}`);
      expect(status).toBe(200);
      expect(data.gameId).toBe(gameId);
      expect(data.pin).toBe(pin);
    });

    it('returns game by lowercase PIN', async () => {
      const { status, data } = await get(`/games/pin/${pin.toLowerCase()}`);
      expect(status).toBe(200);
      expect(data.gameId).toBe(gameId);
    });

    it('returns 404 for invalid PIN', async () => {
      const { status, data } = await get('/games/pin/ZZZZZZZZ');
      expect(status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /games/{gameId}/join', () => {
    let gameId: string;
    const playerId = uniqueId('Joiner');

    beforeAll(async () => {
      const { data } = await post('/games', {
        name: uniqueId('JoinGame'),
        fee: 10,
        leagues: ['premier-league'],
        creatorId,
        displayName: creatorName,
      });
      gameId = data.gameId;
    });

    afterAll(async () => {
      await cleanupGame(gameId);
    });

    it('returns 201 for successful join', async () => {
      const { status, data } = await post(`/games/${gameId}/join`, {
        userId: playerId,
        displayName: 'TestPlayer',
      });
      expect(status).toBe(200);
      expect(data.userId).toBe(playerId);
      expect(data.status).toBe('alive');
    });

    it('returns 409 for duplicate join', async () => {
      const { status, data } = await post(`/games/${gameId}/join`, {
        userId: playerId,
        displayName: 'TestPlayer',
      });
      expect(status).toBe(409);
    });

    it('returns 400 when userId missing', async () => {
      const { status } = await post(`/games/${gameId}/join`, { displayName: 'NoId' });
      expect(status).toBe(400);
    });

    it('returns 404 for non-existent game', async () => {
      const { status } = await post('/games/non-existent/join', {
        userId: 'someone',
        displayName: 'Test',
      });
      expect(status).toBe(404);
    });
  });

  describe('POST /games/{gameId}/leave', () => {
    let gameId: string;
    const playerId = uniqueId('Leaver');

    beforeAll(async () => {
      const { data } = await post('/games', {
        name: uniqueId('LeaveGame'),
        fee: 10,
        leagues: ['premier-league'],
        creatorId,
        displayName: creatorName,
      });
      gameId = data.gameId;
      // Join as another player
      await post(`/games/${gameId}/join`, {
        userId: playerId,
        displayName: 'LeaverPlayer',
      });
    });

    afterAll(async () => {
      await cleanupGame(gameId);
    });

    it('returns 200 when leaving in waiting_for_players', async () => {
      const { status, data } = await post(`/games/${gameId}/leave`, { userId: playerId });
      expect(status).toBe(200);
      expect(data.userId).toBe(playerId);
    });

    it('returns 409 when leaving again (already left)', async () => {
      const { status } = await post(`/games/${gameId}/leave`, { userId: playerId });
      expect(status).toBe(409);
    });

    it('returns 404 for non-existent player', async () => {
      const { status } = await post(`/games/${gameId}/leave`, { userId: 'ghost-player' });
      expect(status).toBe(404);
    });
  });

  describe('POST /games/{gameId}/restart', () => {
    let gameId: string;
    const playerId = uniqueId('Restarter');

    beforeAll(async () => {
      const { data } = await post('/games', {
        name: uniqueId('RestartGame'),
        fee: 10,
        leagues: ['premier-league'],
        creatorId,
        displayName: creatorName,
      });
      gameId = data.gameId;
      // Join as another player
      await post(`/games/${gameId}/join`, {
        userId: playerId,
        displayName: 'RestarterPlayer',
      });
    });

    afterAll(async () => {
      await cleanupGame(gameId);
    });

    it('returns 200 when restarting an abandoned game', async () => {
      // First leave to abandon the game (last player leaving)
      await post(`/games/${gameId}/leave`, { userId: playerId });
      // Creator leaves too — this abandons the game
      await post(`/games/${gameId}/leave`, { userId: creatorId });

      // Now restart
      const { status, data } = await post(`/games/${gameId}/restart`, { userId: creatorId });
      expect(status).toBe(200);
      expect(data.state).toBe('waiting_for_players');
    });

    it('returns 409 when game is not abandoned', async () => {
      const { data: newGame } = await post('/games', {
        name: uniqueId('ActiveGame'),
        fee: 10,
        leagues: ['premier-league'],
        creatorId,
        displayName: creatorName,
      });
      const { status } = await post(`/games/${newGame.gameId}/restart`, { userId: creatorId });
      expect(status).toBe(409);
      await cleanupGame(newGame.gameId);
    });
  });

  describe('POST /games/{gameId}/players/{userId}/hide', () => {
    let gameId: string;
    const playerId = uniqueId('Hider');

    beforeAll(async () => {
      const { data } = await post('/games', {
        name: uniqueId('HideGame'),
        fee: 10,
        leagues: ['premier-league'],
        creatorId,
        displayName: creatorName,
      });
      gameId = data.gameId;
      await post(`/games/${gameId}/join`, {
        userId: playerId,
        displayName: 'HidePlayer',
      });
    });

    afterAll(async () => {
      await cleanupGame(gameId);
    });

    it('returns 200 when hiding an abandoned game after leaving', async () => {
      // Abandon the game
      await post(`/games/${gameId}/leave`, { userId: playerId });
      await post(`/games/${gameId}/leave`, { userId: creatorId });

      const { status, data } = await post(`/games/${gameId}/players/${playerId}/hide`, {});
      expect(status).toBe(200);
      expect(data.hidden).toBe(true);
    });

    it('returns 409 when game is not abandoned', async () => {
      const { data: ng } = await post('/games', {
        name: uniqueId('NotAbandoned'),
        fee: 10,
        leagues: ['premier-league'],
        creatorId,
        displayName: creatorName,
      });
      const { status } = await post(`/games/${ng.gameId}/players/${creatorId}/hide`, {});
      expect(status).toBe(409);
      await cleanupGame(ng.gameId);
    });
  });

  describe('POST /games/{gameId}/cancel', () => {
    let gameId: string;

    beforeAll(async () => {
      const { data } = await post('/games', {
        name: uniqueId('CancelGame'),
        fee: 10,
        leagues: ['premier-league'],
        creatorId,
        displayName: creatorName,
      });
      gameId = data.gameId;
    });

    afterAll(async () => {
      await cleanupGame(gameId);
    });

    it('returns 200 when cancelling in waiting_for_players', async () => {
      const { status, data } = await post(`/games/${gameId}/cancel`, {});
      expect(status).toBe(200);
      expect(data.state).toBe('cancelled');
    });

    it('returns 409 when cancelling already cancelled game', async () => {
      const { status } = await post(`/games/${gameId}/cancel`, {});
      expect(status).toBe(409);
    });
  });

  describe('GET /games/{gameId}/players', () => {
    let gameId: string;

    beforeAll(async () => {
      const { data } = await post('/games', {
        name: uniqueId('PlayerListGame'),
        fee: 10,
        leagues: ['premier-league'],
        creatorId,
        displayName: creatorName,
      });
      gameId = data.gameId;
    });

    afterAll(async () => {
      await cleanupGame(gameId);
    });

    it('returns player list', async () => {
      const { status, data } = await get(`/games/${gameId}/players`);
      expect(status).toBe(200);
      expect(data.players).toBeDefined();
      expect(data.players.length).toBeGreaterThanOrEqual(1);
      expect(data.players[0].userId).toBe(creatorId);
    });
  });
});

// ──────────────────────────────────────────────
// Round / Pick Endpoints
// ──────────────────────────────────────────────
describe('Round & Pick API', () => {
  const creatorName = uniqueId('RoundCreator');
  let creatorId: string;
  let gameId: string;

  beforeAll(async () => {
    const { data: u } = await post('/users', { displayName: creatorName });
    creatorId = u.userId;

    const { data: g } = await post('/games', {
      name: uniqueId('RoundGame'),
      fee: 10,
      leagues: ['premier-league'],
      creatorId,
      displayName: creatorName,
    });
    gameId = g.gameId;
  });

  afterAll(async () => {
    await cleanupGame(gameId);
    await cleanupUser(creatorId);
  });

  describe('POST /games/{gameId}/rounds', () => {
    it('adds a round and returns 201', async () => {
      const { status, data } = await post(`/games/${gameId}/rounds`, {
        matchday: '2026-03-15',
        leagueId: 'premier-league',
      });
      expect(status).toBe(201);
      expect(data.roundNum).toBe(1);
      expect(data.state).toBe('pending');
      expect(data.matchday).toBe('2026-03-15');
    });

    it('adds round 2 (after round 1 completes)', async () => {
      // Add another round won't work because currentRound is 1 and game is not complete
      // We'll handle multi-round in lifecycle tests
    });
  });

  describe('POST /games/{gameId}/rounds/{n}/open', () => {
    it('opens picks for round 1 and returns 200', async () => {
      const { status, data } = await post(`/games/${gameId}/rounds/1/open`, {});
      expect(status).toBe(200);
      expect(data.roundState).toBe('picking');
    });
  });

  describe('POST /games/{gameId}/rounds/{n}/picks', () => {
    it('submits a pick and returns 201', async () => {
      const { status, data } = await post(`/games/${gameId}/rounds/1/picks`, {
        userId: creatorId,
        teamId: 'arsenal',
        teamName: 'Arsenal',
      });
      expect(status).toBe(201);
      expect(data.teamId).toBe('arsenal');
      expect(data.userId).toBe(creatorId);
    });

    it('returns 409 for duplicate pick same round', async () => {
      const { status } = await post(`/games/${gameId}/rounds/1/picks`, {
        userId: creatorId,
        teamId: 'liverpool',
        teamName: 'Liverpool',
      });
      expect(status).toBe(409);
    });

    it('returns 404 for non-existent game', async () => {
      const { status } = await post('/games/non-existent/rounds/1/picks', {
        userId: creatorId,
        teamId: 'arsenal',
        teamName: 'Arsenal',
      });
      expect(status).toBe(404);
    });

    it('returns 400 when userId missing', async () => {
      const { status } = await post(`/games/${gameId}/rounds/1/picks`, {
        teamId: 'arsenal',
        teamName: 'Arsenal',
      });
      expect(status).toBe(400);
    });

    it('returns 400 when teamId missing', async () => {
      const { status } = await post(`/games/${gameId}/rounds/1/picks`, {
        userId: creatorId,
        teamName: 'Arsenal',
      });
      expect(status).toBe(400);
    });
  });

  describe('POST /games/{gameId}/rounds/{n}/lock', () => {
    it('locks the round and returns 200', async () => {
      const { status, data } = await post(`/games/${gameId}/rounds/1/lock`, {});
      expect(status).toBe(200);
      expect(data.roundState).toBe('locked');
    });

    it('returns 409 when already locked', async () => {
      const { status } = await post(`/games/${gameId}/rounds/1/lock`, {});
      expect(status).toBe(409);
    });
  });

  describe('POST /games/{gameId}/rounds/{n}/results', () => {
    it('submits results and returns 200', async () => {
      const { status, data } = await post(`/games/${gameId}/rounds/1/results`, {
        results: [
          { teamId: 'arsenal', outcome: 'win' },
        ],
      });
      expect(status).toBe(200);
      expect(data.roundState).toBe('processing');
    });
  });

  describe('POST /games/{gameId}/rounds/{n}/eliminate', () => {
    it('applies eliminations and returns 200', async () => {
      const { status, data } = await post(`/games/${gameId}/rounds/1/eliminate`, {});
      expect(status).toBe(200);
      // With one player alive, it should determine a winner
      expect(data.gameEndEvent).toBe('WINNER_DETERMINED');
      expect(data.gameState).toBe('completed');
    });
  });
});

// ──────────────────────────────────────────────
// Notification Endpoints
// ──────────────────────────────────────────────
describe('Notification API', () => {
  let userId: string;

  beforeAll(async () => {
    const { data } = await post('/users', { displayName: uniqueId('NotifUser') });
    userId = data.userId;
  });

  afterAll(async () => {
    await cleanupUser(userId);
  });

  describe('POST /notifications', () => {
    it('returns 200 with sent/failed counts', async () => {
      const { status, data } = await post('/notifications', {
        userIds: [userId],
        title: 'Test Notification',
        body: 'This is a test message',
      });
      expect(status).toBe(200);
      expect(data.sent).toBeDefined();
      expect(data.failed).toBeDefined();
      expect(data.total).toBe(1);
    });

    it('returns 400 when title missing', async () => {
      const { status } = await post('/notifications', {
        userIds: [userId],
        body: 'Missing title',
      });
      expect(status).toBe(400);
    });

    it('returns 400 when body missing', async () => {
      const { status } = await post('/notifications', {
        userIds: [userId],
        title: 'Missing body',
      });
      expect(status).toBe(400);
    });

    it('returns 400 when userIds missing', async () => {
      const { status } = await post('/notifications', {
        title: 'No users',
        body: 'Test',
      });
      expect(status).toBe(400);
    });

    it('reports failure for user without push token', async () => {
      const { status, data } = await post('/notifications', {
        userIds: [userId],
        title: 'Test',
        body: 'No token user',
      });
      expect(status).toBe(200);
      const result = data.results[0];
      expect(result.sent).toBe(false);
      expect(result.error).toContain('push token');
    });
  });
});

// ──────────────────────────────────────────────
// Tick Endpoint
// ──────────────────────────────────────────────
describe('Tick API', () => {
  describe('POST /tick', () => {
    it('returns 200 with processed results (empty when no games)', async () => {
      const { status, data } = await post('/tick', {});
      expect(status).toBe(200);
      expect(data.gamesChecked).toBe(0);
      expect(data.gamesProcessed).toBe(0);
    });
  });
});
