import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { queryItems } from '../lib/dynamo';
import { success, badRequest, serverError, parseBody } from '../lib/response';
import { sendExpoPush } from '../lib/notifications';
import type { UserProfileItem } from '../types';

interface SendNotificationRequest {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = parseBody<SendNotificationRequest>(event.body);
    if (!body.title?.trim()) return badRequest('title is required');
    if (!body.body?.trim()) return badRequest('body is required');
    if (!body.userIds?.length) return badRequest('userIds array is required');

    // Fetch push tokens for all requested users
    // Query the USER# profiles and filter for those with push tokens
    const results: Array<{ userId: string; pushToken: string; sent: boolean; error?: string }> = [];

    for (const userId of body.userIds) {
      try {
        const items = await queryItems({
          KeyConditionExpression: 'PK = :pk AND SK = :sk',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':sk': 'PROFILE',
          },
          Limit: 1,
        });

        const profile = items[0] as UserProfileItem | undefined;
        if (!profile?.pushToken) {
          results.push({ userId, pushToken: '', sent: false, error: 'No push token registered' });
          continue;
        }

        // Check notification preferences before sending
        const prefs = profile.preferences;
        if (!prefs?.notificationsEnabled) {
          results.push({ userId, pushToken: profile.pushToken, sent: false, error: 'Notifications disabled' });
          continue;
        }

        await sendExpoPush(profile.pushToken, body.title, body.body, body.data);
        results.push({ userId, pushToken: profile.pushToken, sent: true });
      } catch (err: any) {
        results.push({ userId, pushToken: '', sent: false, error: err?.message ?? 'Unknown error' });
      }
    }

    const sent = results.filter(r => r.sent).length;
    const failed = results.filter(r => !r.sent).length;

    return success({ sent, failed, total: body.userIds.length, results });
  } catch (err) {
    console.error('sendNotification error:', err);
    return serverError();
  }
}
