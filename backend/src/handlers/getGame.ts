import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getItem, queryItems } from '../lib/dynamo';
import { Keys, SKPrefix } from '../lib/keys';
import { success, notFound, badRequest, serverError } from '../lib/response';
import type { GameMetaItem, PlayerItem, RoundItem, PickItem } from '../types';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const gameId = event.pathParameters?.gameId;
    if (!gameId) return badRequest('gameId is required');

    const game = await getItem(Keys.gameMeta(gameId)) as GameMetaItem | undefined;
    if (!game) return notFound('Game not found');

    // Fetch players, rounds, and picks in parallel
    const [players, rounds, picks] = await Promise.all([
      queryItems({
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `GAME#${gameId}`,
          ':sk': SKPrefix.PLAYER,
        },
      }) as Promise<PlayerItem[]>,
      queryItems({
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `GAME#${gameId}`,
          ':sk': SKPrefix.ROUND,
        },
      }) as Promise<RoundItem[]>,
      queryItems({
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `GAME#${gameId}`,
          ':sk': SKPrefix.PICK,
        },
      }) as Promise<PickItem[]>,
    ]);

    return success({
      gameId: game.gameId,
      name: game.name,
      pin: game.pin,
      fee: game.fee,
      leagues: game.leagues,
      rollover: game.rollover,
      splitPot: game.splitPot,
      state: game.state,
      roundState: game.roundState,
      currentRound: game.currentRound,
      prizePool: game.prizePool,
      playerCount: game.playerCount,
      creatorId: game.creatorId,
      players: players.map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        status: p.status,
        joinedAt: p.joinedAt,
      })),
      rounds: rounds.map((r) => ({
        roundNum: r.roundNum,
        state: r.state,
        matchday: r.matchday,
        leagueId: r.leagueId,
        deadline: r.deadline,
      })),
      picks: picks.map((p) => ({
        roundNum: p.roundNum,
        userId: p.userId,
        teamId: p.teamId,
        teamName: p.teamName,
        outcome: p.outcome,
        pickedAt: p.pickedAt,
      })),
    });
  } catch (err) {
    console.error('getGame error:', err);
    return serverError();
  }
}
