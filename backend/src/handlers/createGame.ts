import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { transactWrite, tableName } from '../lib/dynamo';
import { Keys, GSIKeys } from '../lib/keys';
import { created, badRequest, serverError, parseBody } from '../lib/response';
import type { CreateGameRequest, GameMetaItem, PlayerItem } from '../types';

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
    if (!body.displayName?.trim()) return badRequest('displayName is required');

    const gameId = randomUUID();
    const pin = generatePin();
    const now = new Date().toISOString();
    const table = tableName();

    // Game starts in waiting_for_players — creator is auto-joined as first player.
    // NOTE: This skips the created→waiting_for_players state transition that
    // shareGame.ts was designed to handle. Revisit when the full game lifecycle
    // (invite flow, draft mode) is implemented.
    const gameMeta: GameMetaItem = {
      ...Keys.gameMeta(gameId),
      ...GSIKeys.pinLookup(pin),
      gameId,
      name: body.name.trim(),
      pin,
      fee: body.fee,
      leagues: body.leagues,
      rollover: body.rollover ?? false,
      splitPot: body.splitPot ?? false,
      state: 'waiting_for_players',
      currentRound: 0,
      creatorId: body.creatorId,
      prizePool: body.fee,
      playerCount: 1,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    const creatorPlayer: PlayerItem = {
      ...Keys.player(gameId, body.creatorId),
      ...GSIKeys.userGame(body.creatorId, gameId),
      gameId,
      userId: body.creatorId,
      displayName: body.displayName.trim(),
      status: 'alive',
      paidFee: true,
      gameName: gameMeta.name,
      gameState: gameMeta.state,
      joinedAt: now,
    };

    await transactWrite({
      TransactItems: [
        { Put: { TableName: table, Item: gameMeta as any } },
        { Put: { TableName: table, Item: creatorPlayer as any } },
      ],
    });

    return created({
      gameId,
      pin,
      name: gameMeta.name,
      state: gameMeta.state,
      fee: gameMeta.fee,
      leagues: gameMeta.leagues,
      rollover: gameMeta.rollover,
      splitPot: gameMeta.splitPot,
    });
  } catch (err) {
    console.error('createGame error:', err);
    return serverError();
  }
}
