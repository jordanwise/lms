import * as SecureStore from 'expo-secure-store';

const USER_ID_KEY = 'lms_device_user_id';

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
  let id = await SecureStore.getItemAsync(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    await SecureStore.setItemAsync(USER_ID_KEY, id);
  }
  return id;
}
