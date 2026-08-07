import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { updateItem, getItem } from '../lib/dynamo';
import { Keys } from '../lib/keys';
import { success, badRequest, notFound, serverError, parseBody } from '../lib/response';
import type { UserProfileItem } from '../types';

interface RegisterPushTokenRequest {
  pushToken: string;
  platform: 'ios' | 'android';
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const userId = event.pathParameters?.userId;
    if (!userId) return badRequest('userId is required');

    const body = parseBody<RegisterPushTokenRequest>(event.body);
    if (!body.pushToken?.trim()) return badRequest('pushToken is required');
    if (!['ios', 'android'].includes(body.platform)) return badRequest('platform must be ios or android');

    // Verify user exists
    const existing = await getItem(Keys.userProfile(userId)) as UserProfileItem | undefined;
    if (!existing) return notFound('User not found');

    const now = new Date().toISOString();

    await updateItem({
      Key: Keys.userProfile(userId),
      UpdateExpression: 'SET pushToken = :token, pushTokenPlatform = :platform, updatedAt = :now',
      ExpressionAttributeValues: {
        ':token': body.pushToken.trim(),
        ':platform': body.platform,
        ':now': now,
      },
    });

    return success({ userId, pushTokenRegistered: true });
  } catch (err) {
    console.error('registerPushToken error:', err);
    return serverError();
  }
}
