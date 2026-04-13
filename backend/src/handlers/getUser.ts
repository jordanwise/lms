import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getItem } from '../lib/dynamo';
import { Keys } from '../lib/keys';
import { success, notFound, badRequest, serverError } from '../lib/response';
import type { UserProfileItem } from '../types';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const userId = event.pathParameters?.userId;
    if (!userId) return badRequest('userId is required');

    const item = await getItem(Keys.userProfile(userId)) as UserProfileItem | undefined;
    if (!item) return notFound('User not found');

    return success({
      userId: item.userId,
      displayName: item.displayName,
      avatarUrl: item.avatarUrl,
      preferences: item.preferences,
      createdAt: item.createdAt,
    });
  } catch (err) {
    console.error('getUser error:', err);
    return serverError();
  }
}
