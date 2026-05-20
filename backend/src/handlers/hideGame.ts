import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getItem, updateItem } from '../lib/dynamo';
import { Keys } from '../lib/keys';
import { success, notFound, badRequest, conflict, serverError } from '../lib/response';
import type { GameMetaItem, PlayerItem } from '../types';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const gameId = event.pathParameters?.gameId;
    const userId = event.pathParameters?.userId;
    if (!gameId) return badRequest('gameId is required');
    if (!userId) return badRequest('userId is required');

    const [game, player] = await Promise.all([
      getItem(Keys.gameMeta(gameId)) as Promise<GameMetaItem | undefined>,
      getItem(Keys.player(gameId, userId)) as Promise<PlayerItem | undefined>,
    ]);

    if (!game) return notFound('Game not found');
    if (!player) return notFound('Player not found in this game');

    if (game.state !== 'abandoned') {
      return conflict(`Can only hide games in abandoned state, current state: ${game.state}`);
    }

    if (player.status !== 'left') {
      return conflict('Can only hide a game after leaving it');
    }

    const now = new Date().toISOString();

    await updateItem({
      Key: Keys.player(gameId, userId),
      UpdateExpression: 'SET #hidden = :true, updatedAt = :now',
      ConditionExpression: '#status = :left',
      ExpressionAttributeNames: { '#status': 'status', '#hidden': 'hidden' },
      ExpressionAttributeValues: {
        ':true': true,
        ':left': 'left',
        ':now': now,
      },
    });

    return success({ gameId, userId, hidden: true });
  } catch (err: any) {
    if (err.name === 'ConditionalCheckFailedException') {
      return conflict('Cannot hide this game');
    }
    console.error('hideGame error:', err);
    return serverError();
  }
}
