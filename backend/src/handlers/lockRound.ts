import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getItem, updateItem } from '../lib/dynamo';
import { Keys } from '../lib/keys';
import { canTransition, applyTransition, compositeState } from '../lib/stateMachine';
import { success, notFound, badRequest, conflict, serverError } from '../lib/response';
import type { GameMetaItem } from '../types';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const gameId = event.pathParameters?.gameId;
    const roundNumStr = event.pathParameters?.roundNum;
    if (!gameId) return badRequest('gameId is required');
    if (!roundNumStr) return badRequest('roundNum is required');

    const roundNum = parseInt(roundNumStr, 10);
    const game = await getItem(Keys.gameMeta(gameId)) as GameMetaItem | undefined;
    if (!game) return notFound('Game not found');

    if (game.currentRound !== roundNum) {
      return conflict(`Round ${roundNum} is not the current round`);
    }

    if (!canTransition(game.state, game.roundState, 'DEADLINE_REACHED')) {
      return conflict(`Cannot lock round in state: ${compositeState(game.state, game.roundState)}`);
    }

    const newState = applyTransition(game.state, game.roundState, 'DEADLINE_REACHED');

    await updateItem({
      Key: Keys.gameMeta(gameId),
      UpdateExpression: 'SET roundState = :roundState, updatedAt = :now, version = version + :one',
      ExpressionAttributeValues: {
        ':roundState': newState.roundState,
        ':now': new Date().toISOString(),
        ':one': 1,
        ':ver': game.version,
      },
      ConditionExpression: 'version = :ver',
    });

    return success({ gameId, roundNum, roundState: newState.roundState });
  } catch (err: any) {
    if (err.name === 'ConditionalCheckFailedException') {
      return conflict('Game was modified concurrently, please retry');
    }
    console.error('lockRound error:', err);
    return serverError();
  }
}
