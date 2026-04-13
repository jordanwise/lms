import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { putItem } from '../lib/dynamo';
import { Keys, GSIKeys } from '../lib/keys';
import { created, badRequest, serverError, parseBody } from '../lib/response';
import type { CreateGameRequest, GameMetaItem } from '../types';

function generatePin(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pin = '';
  for (let i = 0; i < 8; i++) {
    pin += chars[Math.floor(Math.random() * chars.length)];
  }
  return pin;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = parseBody<CreateGameRequest>(event.body);

    if (!body.name?.trim()) return badRequest('name is required');
    if (!body.fee || body.fee < 5) return badRequest('fee must be at least 5');
    if (!body.leagues?.length) return badRequest('at least one league is required');
    if (!body.creatorId) return badRequest('creatorId is required');

    const gameId = randomUUID();
    const pin = generatePin();
    const now = new Date().toISOString();

    const item: GameMetaItem = {
      ...Keys.gameMeta(gameId),
      ...GSIKeys.pinLookup(pin),
      gameId,
      name: body.name.trim(),
      pin,
      fee: body.fee,
      leagues: body.leagues,
      rollover: body.rollover ?? false,
      splitPot: body.splitPot ?? false,
      state: 'created',
      currentRound: 0,
      creatorId: body.creatorId,
      prizePool: 0,
      playerCount: 0,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    await putItem(item as any);

    return created({
      gameId,
      pin,
      name: item.name,
      state: item.state,
      fee: item.fee,
      leagues: item.leagues,
      rollover: item.rollover,
      splitPot: item.splitPot,
    });
  } catch (err) {
    console.error('createGame error:', err);
    return serverError();
  }
}
