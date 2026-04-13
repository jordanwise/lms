import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { putItem } from '../lib/dynamo';
import { Keys } from '../lib/keys';
import { created, badRequest, serverError, parseBody } from '../lib/response';
import type { CreateUserRequest, UserProfileItem } from '../types';
import { DEFAULT_PREFERENCES } from '../types';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = parseBody<CreateUserRequest>(event.body);

    if (!body.displayName?.trim()) {
      return badRequest('displayName is required');
    }

    const userId = randomUUID();
    const now = new Date().toISOString();

    const item: UserProfileItem = {
      ...Keys.userProfile(userId),
      userId,
      displayName: body.displayName.trim(),
      avatarUrl: body.avatarUrl,
      preferences: { ...DEFAULT_PREFERENCES },
      createdAt: now,
      updatedAt: now,
    };

    await putItem(item as any);

    return created({ userId, displayName: item.displayName, preferences: item.preferences });
  } catch (err) {
    console.error('createUser error:', err);
    return serverError();
  }
}
