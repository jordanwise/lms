import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getItem, transactWrite, tableName } from '../lib/dynamo';
import { Keys } from '../lib/keys';
import { success, notFound, badRequest, conflict, serverError, parseBody } from '../lib/response';
import type { GameMetaItem, PlayerItem } from '../types';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const gameId = event.pathParameters?.gameId;
    if (!gameId) return badRequest('gameId is required');

    const body = parseBody<{ userId: string }>(event.body);
    if (!body.userId) return badRequest('userId is required');

    const [game, player] = await Promise.all([
      getItem(Keys.gameMeta(gameId)) as Promise<GameMetaItem | undefined>,
      getItem(Keys.player(gameId, body.userId)) as Promise<PlayerItem | undefined>,
    ]);

    if (!game) return notFound('Game not found');
    if (!player) return notFound('Player not found in this game');

    if (game.state !== 'waiting_for_players') {
      return conflict(`Cannot leave a game in state: ${game.state}. You can only leave games that are waiting for players.`);
    }

    if (player.status === 'left') {
      return conflict('You have already left this game');
    }

    const isLastPlayer = game.playerCount === 1;
    const now = new Date().toISOString();

    await transactWrite({
      TransactItems: [
        {
          Update: {
            TableName: tableName(),
            Key: Keys.player(gameId, body.userId),
            UpdateExpression: 'SET #status = :left, gameState = :newGameState, updatedAt = :now',
            ConditionExpression: '#status <> :left',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':left': 'left',
              ':newGameState': isLastPlayer ? 'abandoned' : game.state,
              ':now': now,
            },
          },
        },
        {
          Update: {
            TableName: tableName(),
            Key: Keys.gameMeta(gameId),
            UpdateExpression: isLastPlayer
              ? 'SET playerCount = playerCount - :one, prizePool = prizePool - :fee, #state = :abandoned, updatedAt = :now'
              : 'SET playerCount = playerCount - :one, prizePool = prizePool - :fee, updatedAt = :now',
            ConditionExpression: 'playerCount = :expectedCount AND #state = :waitingState',
            ExpressionAttributeNames: { '#state': 'state' },
            ExpressionAttributeValues: {
              ':one': 1,
              ':fee': game.fee,
              ':expectedCount': game.playerCount,
              ':waitingState': 'waiting_for_players',
              ...(isLastPlayer ? { ':abandoned': 'abandoned' } : {}),
              ':now': now,
            },
          },
        },
      ],
    });

    return success({ gameId, userId: body.userId, abandoned: isLastPlayer });
  } catch (err: any) {
    if (err.name === 'TransactionCanceledException') {
      return conflict('Game state changed, please try again');
    }
    console.error('leaveGame error:', err);
    return serverError();
  }
}
