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

    if (game.state !== 'abandoned') {
      return conflict(`Cannot restart a game in state: ${game.state}`);
    }

    if (player.status !== 'left') {
      return conflict('Only a player who previously left can restart this game');
    }

    const now = new Date().toISOString();

    await transactWrite({
      TransactItems: [
        {
          Update: {
            TableName: tableName(),
            Key: Keys.player(gameId, body.userId),
            UpdateExpression: 'SET #status = :alive, gameState = :waiting, updatedAt = :now',
            ConditionExpression: '#status = :left',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':alive': 'alive',
              ':left': 'left',
              ':waiting': 'waiting_for_players',
              ':now': now,
            },
          },
        },
        {
          Update: {
            TableName: tableName(),
            Key: Keys.gameMeta(gameId),
            UpdateExpression: 'SET #state = :waiting, playerCount = playerCount + :one, prizePool = prizePool + :fee, updatedAt = :now',
            ConditionExpression: '#state = :abandoned',
            ExpressionAttributeNames: { '#state': 'state' },
            ExpressionAttributeValues: {
              ':waiting': 'waiting_for_players',
              ':abandoned': 'abandoned',
              ':one': 1,
              ':fee': game.fee,
              ':now': now,
            },
          },
        },
      ],
    });

    return success({ gameId, userId: body.userId, state: 'waiting_for_players' });
  } catch (err: any) {
    if (err.name === 'TransactionCanceledException') {
      return conflict('Game state changed, please try again');
    }
    console.error('restartGame error:', err);
    return serverError();
  }
}
