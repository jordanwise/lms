"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/handlers/joinGame.ts
var joinGame_exports = {};
__export(joinGame_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(joinGame_exports);

// src/lib/dynamo.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var TABLE_NAME = process.env.TABLE_NAME ?? "LMS";
var clientConfig = {};
if (process.env.DYNAMODB_ENDPOINT) {
  clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
  clientConfig.region = "local";
  clientConfig.credentials = { accessKeyId: "local", secretAccessKey: "local" };
}
var rawClient = new import_client_dynamodb.DynamoDBClient(clientConfig);
var docClient = import_lib_dynamodb.DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: { removeUndefinedValues: true }
});
function tableName() {
  return TABLE_NAME;
}
async function getItem(key) {
  const params = { TableName: TABLE_NAME, Key: key };
  const result = await docClient.send(new import_lib_dynamodb.GetCommand(params));
  return result.Item;
}
async function transactWrite(params) {
  await docClient.send(new import_lib_dynamodb.TransactWriteCommand(params));
}

// src/lib/keys.ts
var Keys = {
  // User Profile: PK=USER#<userId>, SK=PROFILE
  userProfile: (userId) => ({
    PK: `USER#${userId}`,
    SK: "PROFILE"
  }),
  // Game Meta: PK=GAME#<gameId>, SK=META
  gameMeta: (gameId) => ({
    PK: `GAME#${gameId}`,
    SK: "META"
  }),
  // Player in Game: PK=GAME#<gameId>, SK=PLAYER#<userId>
  player: (gameId, userId) => ({
    PK: `GAME#${gameId}`,
    SK: `PLAYER#${userId}`
  }),
  // Round: PK=GAME#<gameId>, SK=ROUND#<roundNum (zero-padded)>
  round: (gameId, roundNum) => ({
    PK: `GAME#${gameId}`,
    SK: `ROUND#${String(roundNum).padStart(4, "0")}`
  }),
  // Pick: PK=GAME#<gameId>, SK=PICK#<roundNum>#<userId>
  pick: (gameId, roundNum, userId) => ({
    PK: `GAME#${gameId}`,
    SK: `PICK#${String(roundNum).padStart(4, "0")}#${userId}`
  }),
  // Deferred Obligation: PK=GAME#<gameId>, SK=DEFER#<userId>#<roundNum>
  deferred: (gameId, userId, roundNum) => ({
    PK: `GAME#${gameId}`,
    SK: `DEFER#${userId}#${String(roundNum).padStart(4, "0")}`
  })
};
var GSIKeys = {
  // GSI1: PIN lookup — GSI1PK=PIN#<pin>
  pinLookup: (pin) => ({
    GSI1PK: `PIN#${pin}`
  }),
  // GSI2: User's games — GSI2PK=USER#<userId>, GSI2SK=GAME#<gameId>
  userGame: (userId, gameId) => ({
    GSI2PK: `USER#${userId}`,
    GSI2SK: `GAME#${gameId}`
  })
};

// src/lib/response.ts
function success(body) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}
function badRequest(message) {
  return {
    statusCode: 400,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: message })
  };
}
function notFound(message = "Not found") {
  return {
    statusCode: 404,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: message })
  };
}
function conflict(message) {
  return {
    statusCode: 409,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: message })
  };
}
function serverError(message = "Internal server error") {
  return {
    statusCode: 500,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: message })
  };
}
function parseBody(body) {
  if (!body) throw new Error("Request body is required");
  return JSON.parse(body);
}

// src/handlers/joinGame.ts
async function handler(event) {
  try {
    const gameId = event.pathParameters?.gameId;
    if (!gameId) return badRequest("gameId is required");
    const body = parseBody(event.body);
    if (!body.userId) return badRequest("userId is required");
    if (!body.displayName?.trim()) return badRequest("displayName is required");
    const game = await getItem(Keys.gameMeta(gameId));
    if (!game) return notFound("Game not found");
    const joiningAbandoned = game.state === "abandoned";
    if (game.state !== "waiting_for_players" && !joiningAbandoned) {
      return conflict(`Cannot join game in state: ${game.state}`);
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const playerKeys = Keys.player(gameId, body.userId);
    const gsiKeys = GSIKeys.userGame(body.userId, gameId);
    const playerItem = {
      ...playerKeys,
      ...gsiKeys,
      gameId,
      userId: body.userId,
      displayName: body.displayName.trim(),
      status: "alive",
      paidFee: true,
      gameName: game.name,
      gameState: "waiting_for_players",
      joinedAt: now
    };
    const gameUpdateExpression = joiningAbandoned ? "SET playerCount = playerCount + :one, prizePool = prizePool + :fee, updatedAt = :now, #state = :waiting" : "SET playerCount = playerCount + :one, prizePool = prizePool + :fee, updatedAt = :now";
    const gameExpressionValues = {
      ":one": 1,
      ":fee": game.fee,
      ":now": now
    };
    if (joiningAbandoned) gameExpressionValues[":waiting"] = "waiting_for_players";
    await transactWrite({
      TransactItems: [
        {
          Put: {
            TableName: tableName(),
            Item: playerItem,
            ConditionExpression: "attribute_not_exists(PK)"
          }
        },
        {
          Update: {
            TableName: tableName(),
            Key: Keys.gameMeta(gameId),
            UpdateExpression: gameUpdateExpression,
            ...joiningAbandoned && { ExpressionAttributeNames: { "#state": "state" } },
            ExpressionAttributeValues: gameExpressionValues
          }
        }
      ]
    });
    return success({
      gameId,
      userId: body.userId,
      displayName: playerItem.displayName,
      status: "alive"
    });
  } catch (err) {
    if (err.name === "TransactionCanceledException") {
      return conflict("Player has already joined this game");
    }
    console.error("joinGame error:", err);
    return serverError();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
