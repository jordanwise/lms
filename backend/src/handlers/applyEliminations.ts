import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getItem, queryItems, transactWrite, tableName } from '../lib/dynamo';
import { Keys, SKPrefix } from '../lib/keys';
import { canTransition, applyTransition, compositeState } from '../lib/stateMachine';
import { success, notFound, badRequest, conflict, serverError } from '../lib/response';
import type { GameMetaItem, PickItem, PlayerItem, PickOutcome, PlayerStatus } from '../types';

function outcomeToStatus(outcome?: PickOutcome): PlayerStatus {
  switch (outcome) {
    case 'win': return 'alive';
    case 'loss': return 'eliminated';
    case 'draw': return 'eliminated';
    case 'postponed': return 'deferred';
    default: return 'eliminated'; // missed pick = eliminated
  }
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const gameId = event.pathParameters?.gameId;
    const roundNumStr = event.pathParameters?.roundNum;
    if (!gameId) return badRequest('gameId is required');
    if (!roundNumStr) return badRequest('roundNum is required');

    const roundNum = parseInt(roundNumStr, 10);
    const game = await getItem(Keys.gameMeta(gameId)) as GameMetaItem | undefined;
    if (!game) return notFound('Game not found');

    if (!canTransition(game.state, game.roundState, 'ELIMINATIONS_APPLIED')) {
      return conflict(`Cannot apply eliminations in state: ${compositeState(game.state, game.roundState)}`);
    }

    // Get picks for this round and current alive players
    const [picks, players] = await Promise.all([
      queryItems({
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `GAME#${gameId}`,
          ':sk': `PICK#${String(roundNum).padStart(4, '0')}#`,
        },
      }) as Promise<PickItem[]>,
      queryItems({
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `GAME#${gameId}`,
          ':sk': SKPrefix.PLAYER,
        },
      }) as Promise<PlayerItem[]>,
    ]);

    // Build pick map: userId → pick
    const pickMap = new Map(picks.map((p) => [p.userId, p]));

    // Determine new status for each alive/deferred player
    const alivePlayers = players.filter(
      (p) => p.status === 'alive' || p.status === 'deferred'
    );
    const statusUpdates: Array<{ userId: string; newStatus: PlayerStatus }> = [];

    for (const player of alivePlayers) {
      const pick = pickMap.get(player.userId);
      const newStatus = outcomeToStatus(pick?.outcome);
      statusUpdates.push({ userId: player.userId, newStatus });
    }

    // Count survivors after eliminations
    const survivorCount = statusUpdates.filter((u) => u.newStatus === 'alive').length;
    const deferredCount = statusUpdates.filter((u) => u.newStatus === 'deferred').length;
    const totalAlive = survivorCount + deferredCount;

    // Build transaction: update player statuses + game state
    const transactItems: any[] = statusUpdates.map((update) => ({
      Update: {
        TableName: tableName(),
        Key: Keys.player(gameId, update.userId),
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': update.newStatus },
      },
    }));

    // Apply round complete transition first
    const roundCompleteState = applyTransition(
      game.state, game.roundState, 'ELIMINATIONS_APPLIED'
    );

    // Determine game-end transition
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

    // Update game meta
    transactItems.push({
      Update: {
        TableName: tableName(),
        Key: Keys.gameMeta(gameId),
        UpdateExpression: 'SET #state = :state, roundState = :roundState, updatedAt = :now, version = version + :one',
        ExpressionAttributeNames: { '#state': 'state' },
        ExpressionAttributeValues: {
          ':state': finalState.gameState,
          ':roundState': finalState.roundState ?? null,
          ':now': new Date().toISOString(),
          ':one': 1,
          ':ver': game.version,
        },
        ConditionExpression: 'version = :ver',
      },
    });

    // DynamoDB transactions limited to 100 items
    // For games with many players, batch in groups
    if (transactItems.length <= 100) {
      await transactWrite({ TransactItems: transactItems });
    } else {
      // Update players in batches, then update game
      const gameUpdate = transactItems.pop();
      const batchSize = 99;
      for (let i = 0; i < transactItems.length; i += batchSize) {
        const batch = transactItems.slice(i, i + batchSize);
        await transactWrite({ TransactItems: batch });
      }
      await transactWrite({ TransactItems: [gameUpdate] });
    }

    return success({
      gameId,
      roundNum,
      gameState: finalState.gameState,
      roundState: finalState.roundState,
      gameEndEvent,
      eliminations: statusUpdates.map((u) => ({
        userId: u.userId,
        newStatus: u.newStatus,
      })),
      survivorCount: totalAlive,
    });
  } catch (err: any) {
    if (err.name === 'TransactionCanceledException') {
      return conflict('Game was modified concurrently, please retry');
    }
    console.error('applyEliminations error:', err);
    return serverError();
  }
}
