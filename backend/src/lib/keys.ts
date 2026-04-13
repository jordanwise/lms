// PK/SK key builders for the single-table DynamoDB design

export const Keys = {
  // User Profile: PK=USER#<userId>, SK=PROFILE
  userProfile: (userId: string) => ({
    PK: `USER#${userId}`,
    SK: 'PROFILE',
  }),

  // Game Meta: PK=GAME#<gameId>, SK=META
  gameMeta: (gameId: string) => ({
    PK: `GAME#${gameId}`,
    SK: 'META',
  }),

  // Player in Game: PK=GAME#<gameId>, SK=PLAYER#<userId>
  player: (gameId: string, userId: string) => ({
    PK: `GAME#${gameId}`,
    SK: `PLAYER#${userId}`,
  }),

  // Round: PK=GAME#<gameId>, SK=ROUND#<roundNum (zero-padded)>
  round: (gameId: string, roundNum: number) => ({
    PK: `GAME#${gameId}`,
    SK: `ROUND#${String(roundNum).padStart(4, '0')}`,
  }),

  // Pick: PK=GAME#<gameId>, SK=PICK#<roundNum>#<userId>
  pick: (gameId: string, roundNum: number, userId: string) => ({
    PK: `GAME#${gameId}`,
    SK: `PICK#${String(roundNum).padStart(4, '0')}#${userId}`,
  }),

  // Deferred Obligation: PK=GAME#<gameId>, SK=DEFER#<userId>#<roundNum>
  deferred: (gameId: string, userId: string, roundNum: number) => ({
    PK: `GAME#${gameId}`,
    SK: `DEFER#${userId}#${String(roundNum).padStart(4, '0')}`,
  }),
} as const;

// GSI key builders
export const GSIKeys = {
  // GSI1: PIN lookup — GSI1PK=PIN#<pin>
  pinLookup: (pin: string) => ({
    GSI1PK: `PIN#${pin}`,
  }),

  // GSI2: User's games — GSI2PK=USER#<userId>, GSI2SK=GAME#<gameId>
  userGame: (userId: string, gameId: string) => ({
    GSI2PK: `USER#${userId}`,
    GSI2SK: `GAME#${gameId}`,
  }),
} as const;

// SK prefix constants for query begins_with
export const SKPrefix = {
  PLAYER: 'PLAYER#',
  ROUND: 'ROUND#',
  PICK: 'PICK#',
  DEFER: 'DEFER#',
} as const;

// Extract the entity ID from a composite key
export function extractId(compositeKey: string): string {
  const parts = compositeKey.split('#');
  return parts[parts.length - 1];
}
