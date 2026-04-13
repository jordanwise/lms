import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { updateItem } from '../lib/dynamo';
import { Keys } from '../lib/keys';
import { success, badRequest, notFound, serverError, parseBody } from '../lib/response';
import type { UpdatePreferencesRequest } from '../types';

const ALLOWED_KEYS = new Set([
  'notificationsEnabled',
  'notifyOnRoundOpen',
  'notifyOnDeadlineReminder',
  'notifyOnResults',
  'notifyOnElimination',
  'theme',
  'favouriteLeagues',
]);

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const userId = event.pathParameters?.userId;
    if (!userId) return badRequest('userId is required');

    const body = parseBody<UpdatePreferencesRequest>(event.body);
    const entries = Object.entries(body).filter(([k]) => ALLOWED_KEYS.has(k));

    if (entries.length === 0) {
      return badRequest('No valid preference keys provided');
    }

    // Build SET expression for partial preference update
    const expressionParts: string[] = [];
    const expressionNames: Record<string, string> = {};
    const expressionValues: Record<string, unknown> = {};

    entries.forEach(([key, value], i) => {
      expressionParts.push(`preferences.#key${i} = :val${i}`);
      expressionNames[`#key${i}`] = key;
      expressionValues[`:val${i}`] = value;
    });

    expressionParts.push('updatedAt = :now');
    expressionValues[':now'] = new Date().toISOString();

    const result = await updateItem({
      Key: Keys.userProfile(userId),
      UpdateExpression: `SET ${expressionParts.join(', ')}`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      ConditionExpression: 'attribute_exists(PK)',
      ReturnValues: 'ALL_NEW',
    });

    if (!result) return notFound('User not found');

    return success({ preferences: result.preferences });
  } catch (err: any) {
    if (err.name === 'ConditionalCheckFailedException') {
      return notFound('User not found');
    }
    console.error('updatePreferences error:', err);
    return serverError();
  }
}
