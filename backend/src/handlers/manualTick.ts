import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { processTick } from '../lib/tickProcessor';
import { success, serverError } from '../lib/response';

/**
 * HTTP endpoint to manually trigger a tick.
 * POST /tick
 *
 * Same core logic as the scheduled TickFunction but returns JSON
 * with detailed results instead of void.
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Manual tick triggered via HTTP');

  try {
    const result = await processTick();

    console.log(
      `[manualTick] Processed ${result.gamesProcessed} games, ` +
      `skipped ${result.gamesSkipped}, ` +
      `checked ${result.gamesChecked} total`
    );

    return success(result);
  } catch (err: any) {
    console.error('[manualTick] Error:', err);
    return serverError(err.message ?? 'Tick processing failed');
  }
}
