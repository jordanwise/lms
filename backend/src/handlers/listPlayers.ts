import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { queryItems } from '../lib/dynamo';
import { SKPrefix } from '../lib/keys';
import { success, badRequest, serverError } from '../lib/response';
import type { PlayerItem } from '../types';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const gameId = event.pathParameters?.gameId;
    if (!gameId) return badRequest('gameId is required');

    const items = await queryItems({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `GAME#${gameId}`,
        ':sk': SKPrefix.PLAYER,
      },
    }) as PlayerItem[];

    const players = items.map((p) => ({
      userId: p.userId,
      displayName: p.displayName,
      status: p.status,
      joinedAt: p.joinedAt,
    }));

    return success({ players });
  } catch (err) {
    console.error('listPlayers error:', err);
    return serverError();
  }
}
