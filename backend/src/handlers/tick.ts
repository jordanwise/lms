import type { EventBridgeEvent } from 'aws-lambda';
import { processTick } from '../lib/tickProcessor';

interface TickEvent {
  version: string;
  id: string;
  'detail-type': string;
  source: string;
  account: string;
  time: string;
  region: string;
  resources: string[];
}

/**
 * Periodically triggered by EventBridge (every 5 minutes) to discover
 * games in `active` state with `roundState: 'locked'` that need processing.
 *
 * Scans for locked rounds, resolves outcomes from mock fixtures,
 * applies results and eliminations, and updates game state.
 */
export async function handler(event: EventBridgeEvent<'Scheduled Event', TickEvent>): Promise<void> {
  const timestamp = event.time ?? new Date().toISOString();
  console.log(`Tick triggered at ${timestamp}`);

  try {
    const result = await processTick();

    console.log(
      `[tick] Processed ${result.gamesProcessed} games, ` +
      `skipped ${result.gamesSkipped}, ` +
      `checked ${result.gamesChecked} total`
    );

    for (const gameResult of result.results) {
      if (gameResult.error) {
        console.warn(`[tick] Game ${gameResult.gameId}: ${gameResult.error}`);
      } else {
        console.log(
          `[tick] Game ${gameResult.gameId}: ` +
          `round ${gameResult.roundNum} → ${gameResult.gameState}` +
          (gameResult.gameEndEvent ? ` (${gameResult.gameEndEvent})` : '')
        );
      }
    }

    console.log('[tick] Tick complete');
  } catch (err) {
    console.error('[tick] Error during tick:', err);
  }
}
