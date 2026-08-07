import type { APIGatewayProxyEvent } from 'aws-lambda';

// ──────────────────────────────────────────────
// Handler imports
// ──────────────────────────────────────────────
import { handler as createUser } from '../handlers/createUser';
import { handler as getUser } from '../handlers/getUser';
import { handler as updatePreferences } from '../handlers/updatePreferences';
import { handler as registerPushToken } from '../handlers/registerPushToken';
import { handler as listUserGames } from '../handlers/listUserGames';
import { handler as createGame } from '../handlers/createGame';
import { handler as getGame } from '../handlers/getGame';
import { handler as getGameByPin } from '../handlers/getGameByPin';
import { handler as shareGame } from '../handlers/shareGame';
import { handler as joinGame } from '../handlers/joinGame';
import { handler as leaveGame } from '../handlers/leaveGame';
import { handler as restartGame } from '../handlers/restartGame';
import { handler as cancelGame } from '../handlers/cancelGame';
import { handler as hideGame } from '../handlers/hideGame';
import { handler as listPlayers } from '../handlers/listPlayers';
import { handler as addRound } from '../handlers/addRound';
import { handler as openPicks } from '../handlers/openPicks';
import { handler as submitPick } from '../handlers/submitPick';
import { handler as lockRound } from '../handlers/lockRound';
import { handler as submitResults } from '../handlers/submitResults';
import { handler as applyEliminations } from '../handlers/applyEliminations';
import { handler as manualTick } from '../handlers/manualTick';
import { handler as sendNotification } from '../handlers/sendNotification';

// ──────────────────────────────────────────────
// Mock event builder
// ──────────────────────────────────────────────

function makeEvent(
  method: string,
  path: string,
  pathParams: Record<string, string>,
  body?: unknown,
): APIGatewayProxyEvent {
  return {
    httpMethod: method,
    path,
    pathParameters: Object.keys(pathParams).length > 0 ? pathParams : null,
    body: body !== undefined ? JSON.stringify(body) : null,
    headers: { 'Content-Type': 'application/json' },
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
    isBase64Encoded: false,
  };
}

// ──────────────────────────────────────────────
// Route parser
// ──────────────────────────────────────────────

interface ParsedRoute {
  handler: (event: APIGatewayProxyEvent) => any;
  pathParams: Record<string, string>;
}

function parseRoute(method: string, path: string): ParsedRoute {
  const segments = path.replace(/^\/+|\/+$/g, '').split('/');

  // POST /users
  if (method === 'POST' && segments[0] === 'users' && segments.length === 1) {
    return { handler: createUser, pathParams: {} };
  }

  // GET /users/{userId}
  if (method === 'GET' && segments[0] === 'users' && segments.length === 2) {
    return { handler: getUser, pathParams: { userId: segments[1] } };
  }

  // PATCH /users/{userId}/preferences
  if (method === 'PATCH' && segments[0] === 'users' && segments[2] === 'preferences') {
    return { handler: updatePreferences, pathParams: { userId: segments[1] } };
  }

  // PUT /users/{userId}/push-token
  if (method === 'PUT' && segments[0] === 'users' && segments[2] === 'push-token') {
    return { handler: registerPushToken, pathParams: { userId: segments[1] } };
  }

  // GET /users/{userId}/games
  if (method === 'GET' && segments[0] === 'users' && segments[2] === 'games') {
    return { handler: listUserGames, pathParams: { userId: segments[1] } };
  }

  // POST /games
  if (method === 'POST' && segments[0] === 'games' && segments.length === 1) {
    return { handler: createGame, pathParams: {} };
  }

  // GET /games/{gameId}
  if (method === 'GET' && segments[0] === 'games' && segments.length === 2) {
    return { handler: getGame, pathParams: { gameId: segments[1] } };
  }

  // GET /games/pin/{pin}
  if (method === 'GET' && segments[0] === 'games' && segments[1] === 'pin') {
    return { handler: getGameByPin, pathParams: { pin: segments[2] } };
  }

  // POST /games/{gameId}/players/{userId}/hide
  if (method === 'POST' && segments[0] === 'games' && segments[2] === 'players' && segments[4] === 'hide') {
    return { handler: hideGame, pathParams: { gameId: segments[1], userId: segments[3] } };
  }

  // POST /games/{gameId}/rounds/{n}/open
  if (method === 'POST' && segments[0] === 'games' && segments[2] === 'rounds' && segments[4] === 'open') {
    return { handler: openPicks, pathParams: { gameId: segments[1], roundNum: segments[3] } };
  }

  // POST /games/{gameId}/rounds/{n}/picks
  if (method === 'POST' && segments[0] === 'games' && segments[2] === 'rounds' && segments[4] === 'picks') {
    return { handler: submitPick, pathParams: { gameId: segments[1], roundNum: segments[3] } };
  }

  // POST /games/{gameId}/rounds/{n}/lock
  if (method === 'POST' && segments[0] === 'games' && segments[2] === 'rounds' && segments[4] === 'lock') {
    return { handler: lockRound, pathParams: { gameId: segments[1], roundNum: segments[3] } };
  }

  // POST /games/{gameId}/rounds/{n}/results
  if (method === 'POST' && segments[0] === 'games' && segments[2] === 'rounds' && segments[4] === 'results') {
    return { handler: submitResults, pathParams: { gameId: segments[1], roundNum: segments[3] } };
  }

  // POST /games/{gameId}/rounds/{n}/eliminate
  if (method === 'POST' && segments[0] === 'games' && segments[2] === 'rounds' && segments[4] === 'eliminate') {
    return { handler: applyEliminations, pathParams: { gameId: segments[1], roundNum: segments[3] } };
  }

  // POST /games/{gameId}/{action} (share, join, leave, restart, cancel, rounds)
  if (method === 'POST' && segments[0] === 'games' && segments.length === 3) {
    const action = segments[2];
    switch (action) {
      case 'share': return { handler: shareGame, pathParams: { gameId: segments[1] } };
      case 'join': return { handler: joinGame, pathParams: { gameId: segments[1] } };
      case 'leave': return { handler: leaveGame, pathParams: { gameId: segments[1] } };
      case 'restart': return { handler: restartGame, pathParams: { gameId: segments[1] } };
      case 'cancel': return { handler: cancelGame, pathParams: { gameId: segments[1] } };
      case 'rounds': return { handler: addRound, pathParams: { gameId: segments[1] } };
    }
  }

  // GET /games/{gameId}/players
  if (method === 'GET' && segments[0] === 'games' && segments[2] === 'players') {
    return { handler: listPlayers, pathParams: { gameId: segments[1] } };
  }

  // POST /tick
  if (method === 'POST' && segments[0] === 'tick') {
    return { handler: manualTick, pathParams: {} };
  }

  // POST /notifications
  if (method === 'POST' && segments[0] === 'notifications') {
    return { handler: sendNotification, pathParams: {} };
  }

  throw new Error(`No handler found for ${method} ${path}`);
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

export interface ApiResponse {
  status: number;
  data: any;
}

export async function api(method: string, path: string, body?: unknown): Promise<ApiResponse> {
  const { handler, pathParams } = parseRoute(method, path);
  const event = makeEvent(method, path, pathParams, body);
  const result = await handler(event);

  let data: any;
  try {
    data = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
  } catch {
    data = result.body;
  }

  return { status: result.statusCode, data };
}

export async function get(path: string): Promise<ApiResponse> {
  return api('GET', path);
}

export async function post(path: string, body: unknown): Promise<ApiResponse> {
  return api('POST', path, body);
}

export async function patch(path: string, body: unknown): Promise<ApiResponse> {
  return api('PATCH', path, body);
}

export async function put(path: string, body: unknown): Promise<ApiResponse> {
  return api('PUT', path, body);
}

// ──────────────────────────────────────────────
// Unique ID generator
// ──────────────────────────────────────────────

let testCounter = 0;

export function uniqueId(prefix: string): string {
  return `${prefix}-${++testCounter}-${Date.now()}`;
}

// ──────────────────────────────────────────────
// Cleanup helpers — delete test data from DynamoDB
// ──────────────────────────────────────────────

import { deleteItem, queryItems } from '../lib/dynamo';
import { Keys, SKPrefix } from '../lib/keys';

export async function cleanupGame(gameId: string): Promise<void> {
  const pk = `GAME#${gameId}`;
  try {
    const items = await queryItems({
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': pk },
    });
    for (const item of items) {
      await deleteItem({ PK: item.PK, SK: item.SK });
    }
  } catch {
    // best effort
  }
}

export async function cleanupUser(userId: string): Promise<void> {
  const pk = `USER#${userId}`;
  try {
    const items = await queryItems({
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': pk },
    });
    for (const item of items) {
      await deleteItem({ PK: item.PK, SK: item.SK });
    }
  } catch {
    // best effort
  }
}

// ──────────────────────────────────────────────
// Direct handler access for advanced tests
// ──────────────────────────────────────────────

export const handlers = {
  createUser,
  getUser,
  updatePreferences,
  registerPushToken,
  listUserGames,
  createGame,
  getGame,
  getGameByPin,
  shareGame,
  joinGame,
  leaveGame,
  restartGame,
  cancelGame,
  hideGame,
  listPlayers,
  addRound,
  openPicks,
  submitPick,
  lockRound,
  submitResults,
  applyEliminations,
  manualTick,
  sendNotification,
};
