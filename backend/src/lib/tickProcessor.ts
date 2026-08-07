import { docClient, tableName, getItem, queryItems, updateItem, transactWrite } from './dynamo';
import { Keys, SKPrefix } from './keys';
import { canTransition, applyTransition, compositeState } from './stateMachine';
import { getResults } from './fixtures';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { GameMetaItem, PickItem, PlayerItem, RoundItem, PickOutcome, PlayerStatus, GameState, RoundState } from '../types';

// ──────────────────────────────────────────────
// Result types
// ──────────────────────────────────────────────

export interface TickGameResult {
  gameId: string;
  roundNum: number;
  matchday: string;
  pickCount: number;
  resolvedOutcomes: Array<{ userId: string; teamId: string; outcome: PickOutcome }>;
  eliminations: Array<{ userId: string; oldStatus: PlayerStatus; newStatus: PlayerStatus }>;
  gameState: GameState;
  roundState?: RoundState;
  gameEndEvent: string | null;
  error?: string;
}

export interface TickResult {
  processedAt: string;
  gamesChecked: number;
  gamesProcessed: number;
  gamesSkipped: number;
  results: TickGameResult[];
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function outcomeToStatus(outcome?: PickOutcome): PlayerStatus {
  switch (outcome) {
    case 'win':
      return 'alive';
    case 'loss':
      return 'eliminated';
    case 'draw':
      return 'eliminated';
    case 'postponed':
      return 'deferred';
    default:
      return 'eliminated'; // missed pick = eliminated
  }
}

/**
 * Process all active games with locked rounds.
 * Also handles games stuck in 'processing' state.
 * Idempotent: uses optimistic locking to prevent double-processing.
 */
export async function processTick(): Promise<TickResult> {
  const processedAt = new Date().toISOString();
  const results: TickGameResult[] = [];
  let gamesSkipped = 0;

  // 1. Scan for all games in state "active" with roundState "locked"
  //    Also scan for games stuck in "processing" state
  const [lockedResult, processingResult] = await Promise.all([
    docClient.send(
      new ScanCommand({
        TableName: tableName(),
        FilterExpression: '#state = :activeState AND roundState = :lockedState AND SK = :metaSk',
        ExpressionAttributeNames: { '#state': 'state' },
        ExpressionAttributeValues: {
          ':activeState': 'active',
          ':lockedState': 'locked',
          ':metaSk': 'META',
        },
      })
    ),
    docClient.send(
      new ScanCommand({
        TableName: tableName(),
        FilterExpression: '#state = :activeState AND roundState = :processingState AND SK = :metaSk',
        ExpressionAttributeNames: { '#state': 'state' },
        ExpressionAttributeValues: {
          ':activeState': 'active',
          ':processingState': 'processing',
          ':metaSk': 'META',
        },
      })
    ),
  ]);

  const lockedGames = (lockedResult.Items ?? []) as GameMetaItem[];
  const processingGames = (processingResult.Items ?? []) as GameMetaItem[];

  console.log(
    `[tick] Found ${lockedGames.length} locked games, ` +
    `${processingGames.length} stuck-in-processing games`
  );

  if (lockedGames.length === 0 && processingGames.length === 0) {
    console.log('[tick] No games to process');
    return {
      processedAt,
      gamesChecked: 0,
      gamesProcessed: 0,
      gamesSkipped: 0,
      results: [],
    };
  }

  // 2. Process locked games (full flow: resolve outcomes → apply results → apply eliminations)
  for (const game of lockedGames) {
    console.log(`[tick] Processing locked game ${game.gameId} (round ${game.currentRound})`);
    try {
      const gameResult = await processGame(game);
      results.push(gameResult);
    } catch (err: any) {
      console.error(`[tick] Error processing game ${game.gameId}:`, err.message);
      gamesSkipped++;
      results.push({
        gameId: game.gameId,
        roundNum: game.currentRound,
        matchday: 'unknown',
        pickCount: 0,
        resolvedOutcomes: [],
        eliminations: [],
        gameState: game.state,
        roundState: game.roundState,
        gameEndEvent: null,
        error: err.message,
      });
    }
  }

  // 3. Complete games stuck in processing state (outcomes already written, just apply eliminations)
  for (const game of processingGames) {
    console.log(`[tick] Completing stuck processing game ${game.gameId} (round ${game.currentRound})`);
    try {
      const gameResult = await completeProcessing(game);
      results.push(gameResult);
    } catch (err: any) {
      console.error(`[tick] Error completing game ${game.gameId}:`, err.message);
      gamesSkipped++;
      results.push({
        gameId: game.gameId,
        roundNum: game.currentRound,
        matchday: 'unknown',
        pickCount: 0,
        resolvedOutcomes: [],
        eliminations: [],
        gameState: game.state,
        roundState: game.roundState,
        gameEndEvent: null,
        error: err.message,
      });
    }
  }

  const gamesProcessed = results.filter((r) => !r.error).length;

  console.log(
    `[tick] Complete — ${gamesProcessed} processed, ${gamesSkipped} skipped out of ` +
    `${lockedGames.length + processingGames.length} total`
  );

  return {
    processedAt,
    gamesChecked: lockedGames.length + processingGames.length,
    gamesProcessed,
    gamesSkipped,
    results,
  };
}

/**
 * Process a single locked game: resolve outcomes, apply results, apply eliminations.
 */
async function processGame(game: GameMetaItem): Promise<TickGameResult> {
  const gameId = game.gameId;
  const roundNum = game.currentRound;

  // a. Get the current round (for matchday/leagueId)
  const round = await getItem(Keys.round(gameId, roundNum)) as RoundItem | undefined;
  if (!round) {
    throw new Error(`Round ${roundNum} not found for game ${gameId}`);
  }

  const { matchday, leagueId } = round;

  console.log(`[tick] Game ${gameId} round ${roundNum}: matchday=${matchday}, league=${leagueId}`);

  // b. Get all picks for this round
  const picks = await queryItems({
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `GAME#${gameId}`,
      ':sk': `PICK#${String(roundNum).padStart(4, '0')}#`,
    },
  }) as PickItem[];

  console.log(`[tick] Game ${gameId}: ${picks.length} picks found`);

  // c. Resolve outcomes from mock fixtures
  const pickTeamIds = picks.map((p) => p.teamId);
  const fixtureResults = getResults(pickTeamIds, matchday, leagueId);

  const resolvedOutcomes: Array<{ userId: string; teamId: string; outcome: PickOutcome }> = [];
  const missingResults: string[] = [];

  for (const pick of picks) {
    const outcome = fixtureResults[pick.teamId];
    if (!outcome) {
      missingResults.push(pick.teamId);
      continue;
    }
    resolvedOutcomes.push({
      userId: pick.userId,
      teamId: pick.teamId,
      outcome,
    });
  }

  // If some fixtures don't have results yet, skip this game
  if (missingResults.length > 0) {
    console.log(
      `[tick] Game ${gameId}: skipping — no fixture results for teams: ${missingResults.join(', ')}`
    );
    throw new Error(`Missing fixture results for: ${missingResults.join(', ')}`);
  }

  // d. Update pick outcomes + transition locked → processing
  //    Use optimistic locking on game version to prevent concurrent processing
  if (!canTransition(game.state, game.roundState, 'RESULTS_AVAILABLE')) {
    throw new Error(
      `Cannot transition from ${compositeState(game.state, game.roundState)} with RESULTS_AVAILABLE`
    );
  }

  const processingState = applyTransition(game.state, game.roundState, 'RESULTS_AVAILABLE');

  // Update all picks with outcomes + transition game in a transaction
  const pickUpdates = picks.map((pick) => {
    const outcome = fixtureResults[pick.teamId];
    return {
      Update: {
        TableName: tableName(),
        Key: { PK: pick.PK, SK: pick.SK },
        UpdateExpression: 'SET outcome = :outcome',
        ExpressionAttributeValues: { ':outcome': outcome ?? 'loss' },
      },
    };
  });

  const now = new Date().toISOString();

  // Build transaction: pick updates + game state transition
  let transactItems: any[] = [
    ...pickUpdates,
    {
      Update: {
        TableName: tableName(),
        Key: Keys.gameMeta(gameId),
        UpdateExpression:
          'SET roundState = :roundState, updatedAt = :now, version = version + :one',
        ExpressionAttributeValues: {
          ':roundState': processingState.roundState,
          ':now': now,
          ':one': 1,
          ':ver': game.version,
        },
        ConditionExpression: 'version = :ver',
      },
    },
  ];

  // DynamoDB transactions limited to 100 items
  if (transactItems.length <= 100) {
    await transactWrite({ TransactItems: transactItems });
  } else {
    // Unlikely for a single round's picks, but handle gracefully
    const gameUpdate = transactItems.pop();
    const batchSize = 99;
    for (let i = 0; i < transactItems.length; i += batchSize) {
      const batch = transactItems.slice(i, i + batchSize);
      await transactWrite({ TransactItems: batch });
    }
    await transactWrite({ TransactItems: [gameUpdate] });
  }

  console.log(`[tick] Game ${gameId}: updated ${picks.length} picks, transitioned to processing`);

  // e. Apply eliminations — transition processing → complete

  // Re-fetch game with updated version
  const updatedGame = await getItem(Keys.gameMeta(gameId)) as GameMetaItem | undefined;
  if (!updatedGame) {
    throw new Error(`Game ${gameId} disappeared during processing`);
  }

  if (!canTransition(updatedGame.state, updatedGame.roundState, 'ELIMINATIONS_APPLIED')) {
    throw new Error(
      `Cannot transition from ${compositeState(updatedGame.state, updatedGame.roundState)} with ELIMINATIONS_APPLIED`
    );
  }

  // Get all alive/deferred players
  const players = await queryItems({
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `GAME#${gameId}`,
      ':sk': SKPrefix.PLAYER,
    },
  }) as PlayerItem[];

  const alivePlayers = players.filter(
    (p) => p.status === 'alive' || p.status === 'deferred'
  );

  // Build pick map: userId → pick
  const pickMap = new Map(picks.map((p) => [p.userId, p]));

  // Determine new status for each alive/deferred player
  const statusUpdates: Array<{
    userId: string;
    oldStatus: PlayerStatus;
    newStatus: PlayerStatus;
  }> = [];

  for (const player of alivePlayers) {
    const pick = pickMap.get(player.userId);
    const newStatus = outcomeToStatus(pick?.outcome);
    statusUpdates.push({
      userId: player.userId,
      oldStatus: player.status,
      newStatus,
    });
  }

  // All alive players with no picks who are alive/deferred will be caught above:
  // outcomeToStatus(undefined) returns 'eliminated'

  const survivorCount = statusUpdates.filter((u) => u.newStatus === 'alive').length;
  const deferredCount = statusUpdates.filter((u) => u.newStatus === 'deferred').length;
  const totalAlive = survivorCount + deferredCount;

  console.log(
    `[tick] Game ${gameId}: ${survivorCount} survivors, ${deferredCount} deferred, ${statusUpdates.length - totalAlive} eliminated`
  );

  // Build transaction: player status updates + game state transition
  const playerUpdates = statusUpdates.map((update) => ({
    Update: {
      TableName: tableName(),
      Key: Keys.player(gameId, update.userId),
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': update.newStatus },
    },
  }));

  // Apply round complete transition
  const roundCompleteState = applyTransition(
    updatedGame.state,
    updatedGame.roundState,
    'ELIMINATIONS_APPLIED'
  );

  // f. Check game outcome
  const guardCtx = {
    alivePlayers: totalAlive,
    totalPlayers: updatedGame.playerCount,
    rollover: updatedGame.rollover,
    splitPot: updatedGame.splitPot,
  };

  let finalState = roundCompleteState;
  let gameEndEvent: string | null = null;

  if (totalAlive === 1) {
    gameEndEvent = 'WINNER_DETERMINED';
  } else if (totalAlive === 0 && updatedGame.rollover) {
    gameEndEvent = 'ALL_ELIMINATED_ROLLOVER';
  } else if (totalAlive === 0 && updatedGame.splitPot) {
    gameEndEvent = 'ALL_ELIMINATED_SPLIT';
  }

  if (gameEndEvent) {
    finalState = applyTransition(
      roundCompleteState.gameState,
      roundCompleteState.roundState,
      gameEndEvent,
      guardCtx
    );
  }

  console.log(
    `[tick] Game ${gameId}: final state=${finalState.gameState}, roundState=${finalState.roundState ?? 'none'}, event=${gameEndEvent ?? 'none'}`
  );

  // Update game meta with final state
  const now2 = new Date().toISOString();
  const allTransactItems: any[] = [
    ...playerUpdates,
    {
      Update: {
        TableName: tableName(),
        Key: Keys.gameMeta(gameId),
        UpdateExpression:
          'SET #state = :state, roundState = :roundState, updatedAt = :now, version = version + :one',
        ExpressionAttributeNames: { '#state': 'state' },
        ExpressionAttributeValues: {
          ':state': finalState.gameState,
          ':roundState': finalState.roundState ?? null,
          ':now': now2,
          ':one': 1,
          ':ver': updatedGame.version,
        },
        ConditionExpression: 'version = :ver',
      },
    },
  ];

  if (allTransactItems.length <= 100) {
    await transactWrite({ TransactItems: allTransactItems });
  } else {
    const gameUpdate = allTransactItems.pop();
    const batchSize = 99;
    for (let i = 0; i < allTransactItems.length; i += batchSize) {
      const batch = allTransactItems.slice(i, i + batchSize);
      await transactWrite({ TransactItems: batch });
    }
    await transactWrite({ TransactItems: [gameUpdate] });
  }

  console.log(`[tick] Game ${gameId}: eliminations applied, ${statusUpdates.length} players updated`);

  return {
    gameId,
    roundNum,
    matchday,
    pickCount: picks.length,
    resolvedOutcomes,
    eliminations: statusUpdates,
    gameState: finalState.gameState,
    roundState: finalState.roundState,
    gameEndEvent,
  };
}

/**
 * Complete a game that's stuck in processing state (outcomes already written,
 * just apply eliminations).
 */
async function completeProcessing(game: GameMetaItem): Promise<TickGameResult> {
  const gameId = game.gameId;
  const roundNum = game.currentRound;

  // Get the round for matchday/leagueId
  const round = await getItem(Keys.round(gameId, roundNum)) as RoundItem | undefined;
  const matchday = round?.matchday ?? 'unknown';
  const leagueId = round?.leagueId ?? 'unknown';

  // Get picks (outcomes should already be set)
  const picks = await queryItems({
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `GAME#${gameId}`,
      ':sk': `PICK#${String(roundNum).padStart(4, '0')}#`,
    },
  }) as PickItem[];

  // Get already-resolved outcomes from the pick data
  const resolvedOutcomes: Array<{ userId: string; teamId: string; outcome: PickOutcome }> = [];
  for (const pick of picks) {
    if (pick.outcome) {
      resolvedOutcomes.push({
        userId: pick.userId,
        teamId: pick.teamId,
        outcome: pick.outcome,
      });
    }
  }

  if (!canTransition(game.state, game.roundState, 'ELIMINATIONS_APPLIED')) {
    throw new Error(
      `Cannot transition from ${compositeState(game.state, game.roundState)} with ELIMINATIONS_APPLIED`
    );
  }

  // Get all alive/deferred players
  const players = await queryItems({
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `GAME#${gameId}`,
      ':sk': SKPrefix.PLAYER,
    },
  }) as PlayerItem[];

  const alivePlayers = players.filter(
    (p) => p.status === 'alive' || p.status === 'deferred'
  );

  const pickMap = new Map(picks.map((p) => [p.userId, p]));

  const statusUpdates: Array<{
    userId: string;
    oldStatus: PlayerStatus;
    newStatus: PlayerStatus;
  }> = [];

  for (const player of alivePlayers) {
    const pick = pickMap.get(player.userId);
    const newStatus = outcomeToStatus(pick?.outcome);
    statusUpdates.push({
      userId: player.userId,
      oldStatus: player.status,
      newStatus,
    });
  }

  const survivorCount = statusUpdates.filter((u) => u.newStatus === 'alive').length;
  const deferredCount = statusUpdates.filter((u) => u.newStatus === 'deferred').length;
  const totalAlive = survivorCount + deferredCount;

  console.log(
    `[tick] Game ${gameId} (stuck): ${survivorCount} survivors, ${deferredCount} deferred, ` +
    `${statusUpdates.length - totalAlive} eliminated`
  );

  // Build player status updates
  const playerUpdates = statusUpdates.map((update) => ({
    Update: {
      TableName: tableName(),
      Key: Keys.player(gameId, update.userId),
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': update.newStatus },
    },
  }));

  // Apply round complete transition
  const roundCompleteState = applyTransition(
    game.state,
    game.roundState,
    'ELIMINATIONS_APPLIED'
  );

  // Check game outcome
  const guardCtx = {
    alivePlayers: totalAlive,
    totalPlayers: game.playerCount,
    rollover: game.rollover,
    splitPot: game.splitPot,
  };

  let finalState = roundCompleteState;
  let gameEndEvent: string | null = null;

  if (totalAlive === 1) {
    gameEndEvent = 'WINNER_DETERMINED';
  } else if (totalAlive === 0 && game.rollover) {
    gameEndEvent = 'ALL_ELIMINATED_ROLLOVER';
  } else if (totalAlive === 0 && game.splitPot) {
    gameEndEvent = 'ALL_ELIMINATED_SPLIT';
  }

  if (gameEndEvent) {
    finalState = applyTransition(
      roundCompleteState.gameState,
      roundCompleteState.roundState,
      gameEndEvent,
      guardCtx
    );
  }

  console.log(
    `[tick] Game ${gameId} (stuck): final state=${finalState.gameState}, ` +
    `roundState=${finalState.roundState ?? 'none'}, event=${gameEndEvent ?? 'none'}`
  );

  // Update game meta with final state
  const now = new Date().toISOString();
  const allTransactItems: any[] = [
    ...playerUpdates,
    {
      Update: {
        TableName: tableName(),
        Key: Keys.gameMeta(gameId),
        UpdateExpression:
          'SET #state = :state, roundState = :roundState, updatedAt = :now, version = version + :one',
        ExpressionAttributeNames: { '#state': 'state' },
        ExpressionAttributeValues: {
          ':state': finalState.gameState,
          ':roundState': finalState.roundState ?? null,
          ':now': now,
          ':one': 1,
          ':ver': game.version,
        },
        ConditionExpression: 'version = :ver',
      },
    },
  ];

  if (allTransactItems.length <= 100) {
    await transactWrite({ TransactItems: allTransactItems });
  } else {
    const gameUpdate = allTransactItems.pop();
    const batchSize = 99;
    for (let i = 0; i < allTransactItems.length; i += batchSize) {
      const batch = allTransactItems.slice(i, i + batchSize);
      await transactWrite({ TransactItems: batch });
    }
    await transactWrite({ TransactItems: [gameUpdate] });
  }

  console.log(`[tick] Game ${gameId} (stuck): eliminations applied, ${statusUpdates.length} players updated`);

  return {
    gameId,
    roundNum,
    matchday,
    pickCount: picks.length,
    resolvedOutcomes,
    eliminations: statusUpdates,
    gameState: finalState.gameState,
    roundState: finalState.roundState,
    gameEndEvent,
  };
}
