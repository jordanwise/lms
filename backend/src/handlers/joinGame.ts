import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getItem, transactWrite } from '../lib/dynamo';
import { Keys, GSIKeys } from '../lib/keys';
import { tableName } from '../lib/dynamo';
import { success, notFound, badRequest, conflict, serverError, parseBody } from '../lib/response';
import type { GameMetaItem, JoinGameRequest, PlayerItem } from '../types';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const gameId = event.pathParameters?.gameId;
    if (!gameId) return badRequest('gameId is required');

    const body = parseBody<JoinGameRequest>(event.body);
    if (!body.userId) return badRequest('userId is required');
    if (!body.displayName?.trim()) return badRequest('displayName is required');

    const game = await getItem(Keys.gameMeta(gameId)) as GameMetaItem | undefined;
    if (!game) return notFound('Game not found');

    const joiningAbandoned = game.state === 'abandoned';
    if (game.state !== 'waiting_for_players' && !joiningAbandoned) {
      return conflict(`Cannot join game in state: ${game.state}`);
    }

    const now = new Date().toISOString();
    const playerKeys = Keys.player(gameId, body.userId);
    const gsiKeys = GSIKeys.userGame(body.userId, gameId);

    const playerItem: PlayerItem = {
      ...playerKeys,
      ...gsiKeys,
      gameId,
      userId: body.userId,
      displayName: body.displayName.trim(),
      status: 'alive',
      paidFee: true,
      gameName: game.name,
      gameState: 'waiting_for_players',
      joinedAt: now,
    };

    const gameUpdateExpression = joiningAbandoned
      ? 'SET playerCount = playerCount + :one, prizePool = prizePool + :fee, updatedAt = :now, #state = :waiting'
      : 'SET playerCount = playerCount + :one, prizePool = prizePool + :fee, updatedAt = :now';

    const gameExpressionValues: Record<string, any> = {
      ':one': 1,
      ':fee': game.fee,
      ':now': now,
    };
    if (joiningAbandoned) gameExpressionValues[':waiting'] = 'waiting_for_players';

    await transactWrite({
      TransactItems: [
        {
          Put: {
            TableName: tableName(),
            Item: playerItem as any,
            ConditionExpression: 'attribute_not_exists(PK)',
          },
        },
        {
          Update: {
            TableName: tableName(),
            Key: Keys.gameMeta(gameId),
            UpdateExpression: gameUpdateExpression,
            ...(joiningAbandoned && { ExpressionAttributeNames: { '#state': 'state' } }),
            ExpressionAttributeValues: gameExpressionValues,
          },
        },
      ],
    });

    return success({
      gameId,
      userId: body.userId,
      displayName: playerItem.displayName,
      status: 'alive',
    });
  } catch (err: any) {
    if (err.name === 'TransactionCanceledException') {
      return conflict('Player has already joined this game');
    }
    console.error('joinGame error:', err);
    return serverError();
  }
}
