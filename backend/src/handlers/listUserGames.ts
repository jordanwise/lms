import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { queryItems } from '../lib/dynamo';
import { success, badRequest, serverError } from '../lib/response';
import type { PlayerItem } from '../types';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const userId = event.pathParameters?.userId;
    if (!userId) return badRequest('userId is required');

    const items = await queryItems({
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: { ':pk': `USER#${userId}` },
    }) as PlayerItem[];

    const games = items
      .filter((item) => !item.hidden)
      .map((item) => ({
        gameId: item.gameId,
        gameName: item.gameName,
        gameState: item.gameState,
        playerStatus: item.status,
        joinedAt: item.joinedAt,
      }));

    return success({ games });
  } catch (err) {
    console.error('listUserGames error:', err);
    return serverError();
  }
}
