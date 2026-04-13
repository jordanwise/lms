import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getItem, putItem, queryItems } from '../lib/dynamo';
import { Keys, SKPrefix } from '../lib/keys';
import { created, notFound, badRequest, conflict, serverError, parseBody } from '../lib/response';
import type { GameMetaItem, SubmitPickRequest, PickItem, RoundItem } from '../types';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const gameId = event.pathParameters?.gameId;
    const roundNumStr = event.pathParameters?.roundNum;
    if (!gameId) return badRequest('gameId is required');
    if (!roundNumStr) return badRequest('roundNum is required');

    const roundNum = parseInt(roundNumStr, 10);
    const body = parseBody<SubmitPickRequest>(event.body);
    if (!body.userId) return badRequest('userId is required');
    if (!body.teamId) return badRequest('teamId is required');
    if (!body.teamName) return badRequest('teamName is required');

    // Validate game state
    const game = await getItem(Keys.gameMeta(gameId)) as GameMetaItem | undefined;
    if (!game) return notFound('Game not found');

    if (game.state !== 'active' || game.roundState !== 'picking') {
      return conflict('Picks are not open for this round');
    }
    if (game.currentRound !== roundNum) {
      return conflict(`Round ${roundNum} is not the current round`);
    }

    // Validate player is alive
    const player = await getItem(Keys.player(gameId, body.userId));
    if (!player) return notFound('Player not found in this game');
    if (player.status === 'eliminated') {
      return conflict('Player has been eliminated');
    }

    // Check no-repeat pick: query all picks for this user in this game
    const existingPicks = await queryItems({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `GAME#${gameId}`,
        ':sk': SKPrefix.PICK,
      },
    }) as PickItem[];

    const userPicks = existingPicks.filter((p) => p.userId === body.userId);
    const alreadyPickedTeams = new Set(userPicks.map((p) => p.teamId));

    if (alreadyPickedTeams.has(body.teamId)) {
      return conflict(`You have already picked ${body.teamName} in a previous round`);
    }

    // Check deadline
    const round = await getItem(Keys.round(gameId, roundNum)) as RoundItem | undefined;
    if (round?.deadline && new Date(round.deadline) < new Date()) {
      return conflict('The pick deadline has passed');
    }

    // Write pick (condition: no existing pick for this user in this round)
    const now = new Date().toISOString();
    const pickItem: PickItem = {
      ...Keys.pick(gameId, roundNum, body.userId),
      gameId,
      roundNum,
      userId: body.userId,
      teamId: body.teamId,
      teamName: body.teamName,
      pickedAt: now,
    };

    await putItem(
      pickItem as any,
      'attribute_not_exists(PK)'
    );

    return created({
      gameId,
      roundNum,
      userId: body.userId,
      teamId: body.teamId,
      teamName: body.teamName,
    });
  } catch (err: any) {
    if (err.name === 'ConditionalCheckFailedException') {
      return conflict('You have already submitted a pick for this round');
    }
    console.error('submitPick error:', err);
    return serverError();
  }
}
