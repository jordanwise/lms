import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getItem, transactWrite, tableName } from '../lib/dynamo';
import { Keys } from '../lib/keys';
import { canTransition, applyTransition, compositeState } from '../lib/stateMachine';
import { created, notFound, badRequest, conflict, serverError, parseBody } from '../lib/response';
import type { GameMetaItem, AddRoundRequest, RoundItem } from '../types';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const gameId = event.pathParameters?.gameId;
    if (!gameId) return badRequest('gameId is required');

    const body = parseBody<AddRoundRequest>(event.body);
    if (!body.matchday) return badRequest('matchday is required');
    if (!body.leagueId) return badRequest('leagueId is required');

    const game = await getItem(Keys.gameMeta(gameId)) as GameMetaItem | undefined;
    if (!game) return notFound('Game not found');

    if (!canTransition(game.state, game.roundState, 'ADD_ROUND')) {
      return conflict(`Cannot add round in state: ${compositeState(game.state, game.roundState)}`);
    }

    const newState = applyTransition(game.state, game.roundState, 'ADD_ROUND');
    const roundNum = game.currentRound + 1;
    const now = new Date().toISOString();

    const roundItem: RoundItem = {
      ...Keys.round(gameId, roundNum),
      gameId,
      roundNum,
      state: 'pending',
      matchday: body.matchday,
      leagueId: body.leagueId,
      deadline: body.deadline,
      createdAt: now,
    };

    await transactWrite({
      TransactItems: [
        {
          Put: {
            TableName: tableName(),
            Item: roundItem as any,
          },
        },
        {
          Update: {
            TableName: tableName(),
            Key: Keys.gameMeta(gameId),
            UpdateExpression: 'SET #state = :state, roundState = :roundState, currentRound = :round, updatedAt = :now, version = version + :one',
            ExpressionAttributeNames: { '#state': 'state' },
            ExpressionAttributeValues: {
              ':state': newState.gameState,
              ':roundState': newState.roundState ?? null,
              ':round': roundNum,
              ':now': now,
              ':one': 1,
              ':ver': game.version,
            },
            ConditionExpression: 'version = :ver',
          },
        },
      ],
    });

    return created({
      gameId,
      roundNum,
      state: roundItem.state,
      matchday: roundItem.matchday,
      leagueId: roundItem.leagueId,
      deadline: roundItem.deadline,
    });
  } catch (err: any) {
    if (err.name === 'TransactionCanceledException') {
      return conflict('Game was modified concurrently, please retry');
    }
    console.error('addRound error:', err);
    return serverError();
  }
}
