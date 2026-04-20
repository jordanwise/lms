import * as FileSystem from 'expo-file-system';

const USER_ID_FILE = `${FileSystem.documentDirectory}lms_device_user_id.txt`;

/**
 * Returns the persisted device-local user ID, creating and storing one if it
 * doesn't exist yet.
 *
 * ⚠️  TEMPORARY: This is a placeholder until real authentication is added.
 *     The ID is tied to this device/install. Uninstalling or clearing app
 *     storage will generate a new ID, losing any association with previous games.
 *     See README § "Auth & Identity (TODO)" for the full plan.
 */
export async function getOrCreateUserId(): Promise<string> {
  try {
    const existing = await FileSystem.readAsStringAsync(USER_ID_FILE);
    if (existing?.trim()) return existing.trim();
  } catch {
    // File doesn't exist yet — fall through to create
  }

  const id = crypto.randomUUID();
  await FileSystem.writeAsStringAsync(USER_ID_FILE, id);
  return id;
}
