import * as FileSystem from 'expo-file-system/legacy';

const USER_ID_FILE = `${FileSystem.documentDirectory}lms_device_user_id.txt`;
const DISPLAY_NAME_FILE = `${FileSystem.documentDirectory}lms_display_name.txt`;
const DEFAULT_DISPLAY_NAME = 'lms_admin';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

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

  const id = generateUUID();
  await FileSystem.writeAsStringAsync(USER_ID_FILE, id);
  return id;
}

/** Returns the persisted display name, or the default if none is set. */
export async function getDisplayName(): Promise<string> {
  try {
    const name = await FileSystem.readAsStringAsync(DISPLAY_NAME_FILE);
    if (name?.trim()) return name.trim();
  } catch {
    // Not set yet
  }
  return DEFAULT_DISPLAY_NAME;
}

/** Saves the display name. Pass an empty/blank string to reset to default. */
export async function saveDisplayName(name: string): Promise<void> {
  const value = name.trim() || DEFAULT_DISPLAY_NAME;
  await FileSystem.writeAsStringAsync(DISPLAY_NAME_FILE, value);
}
