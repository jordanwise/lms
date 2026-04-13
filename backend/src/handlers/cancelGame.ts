import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getItem, updateItem } from '../lib/dynamo';
import { Keys } from '../lib/keys';
import { canTransition, compositeState } from '../lib/stateMachine';
import { success, notFound, badRequest, conflict, serverError } from '../lib/response';
import type { GameMetaItem } from '../types';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const gameId = event.pathParameters?.gameId;
    if (!gameId) return badRequest('gameId is required');

    const game = await getItem(Keys.gameMeta(gameId)) as GameMetaItem | undefined;
    if (!game) return notFound('Game not found');

    if (!canTransition(game.state, game.roundState, 'CANCEL')) {
      return conflict(`Cannot cancel game in state: ${compositeState(game.state, game.roundState)}`);
    }

    await updateItem({
      Key: Keys.gameMeta(gameId),
      UpdateExpression: 'SET #state = :state, updatedAt = :now, version = version + :one',
      ExpressionAttributeNames: { '#state': 'state' },
      ExpressionAttributeValues: {
        ':state': 'cancelled',
        ':now': new Date().toISOString(),
        ':one': 1,
        ':ver': game.version,
      },
      ConditionExpression: 'version = :ver',
    });

    return success({ gameId, state: 'cancelled' });
  } catch (err: any) {
    if (err.name === 'ConditionalCheckFailedException') {
      return conflict('Game was modified concurrently, please retry');
    }
    console.error('cancelGame error:', err);
    return serverError();
  }
}
