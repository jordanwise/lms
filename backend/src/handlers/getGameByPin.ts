import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { queryItems, getItem } from '../lib/dynamo';
import { Keys } from '../lib/keys';
import { success, notFound, badRequest, serverError } from '../lib/response';
import type { GameMetaItem } from '../types';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const pin = event.pathParameters?.pin;
    if (!pin) return badRequest('pin is required');

    const items = await queryItems({
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': `PIN#${pin.toUpperCase()}` },
    });

    if (items.length === 0) return notFound('No game found with that PIN');

    const game = items[0] as GameMetaItem;

    return success({
      gameId: game.gameId,
      name: game.name,
      pin: game.pin,
      fee: game.fee,
      state: game.state,
      playerCount: game.playerCount,
      leagues: game.leagues,
    });
  } catch (err) {
    console.error('getGameByPin error:', err);
    return serverError();
  }
}
