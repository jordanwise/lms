import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getItem, updateItem, queryItems } from '../lib/dynamo';
import { Keys, SKPrefix } from '../lib/keys';
import { canTransition, applyTransition, compositeState } from '../lib/stateMachine';
import { success, notFound, badRequest, conflict, serverError, parseBody } from '../lib/response';
import type { GameMetaItem, SubmitResultsRequest, PickItem } from '../types';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const gameId = event.pathParameters?.gameId;
    const roundNumStr = event.pathParameters?.roundNum;
    if (!gameId) return badRequest('gameId is required');
    if (!roundNumStr) return badRequest('roundNum is required');

    const roundNum = parseInt(roundNumStr, 10);
    const body = parseBody<SubmitResultsRequest>(event.body);
    if (!body.results?.length) return badRequest('results array is required');

    const game = await getItem(Keys.gameMeta(gameId)) as GameMetaItem | undefined;
    if (!game) return notFound('Game not found');

    if (!canTransition(game.state, game.roundState, 'RESULTS_AVAILABLE')) {
      return conflict(`Cannot submit results in state: ${compositeState(game.state, game.roundState)}`);
    }

    // Get all picks for this round
    const picks = await queryItems({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `GAME#${gameId}`,
        ':sk': `PICK#${String(roundNum).padStart(4, '0')}#`,
      },
    }) as PickItem[];

    // Build outcome map: teamId → outcome
    const outcomeMap = new Map(body.results.map((r) => [r.teamId, r.outcome]));

    // Update each pick with its outcome
    const updatePromises = picks.map((pick) => {
      const outcome = outcomeMap.get(pick.teamId);
      if (!outcome) return Promise.resolve();

      return updateItem({
        Key: { PK: pick.PK, SK: pick.SK },
        UpdateExpression: 'SET outcome = :outcome',
        ExpressionAttributeValues: { ':outcome': outcome },
      });
    });

    await Promise.all(updatePromises);

    // Transition game state
    const newState = applyTransition(game.state, game.roundState, 'RESULTS_AVAILABLE');

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

    return success({
      gameId,
      roundNum,
      roundState: newState.roundState,
      updatedPicks: picks.length,
    });
  } catch (err: any) {
    if (err.name === 'ConditionalCheckFailedException') {
      return conflict('Game was modified concurrently, please retry');
    }
    console.error('submitResults error:', err);
    return serverError();
  }
}
