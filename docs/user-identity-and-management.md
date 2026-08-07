# User Identity & Management — Implementation Reference

This document describes how users work from an **implementation perspective**: how identity is established, stored, and managed across the frontend and backend. It covers the disconnect between the two systems, what data is tracked per user, and how user-linked operations (games, preferences, display names) currently function.

---

## 1. The Two-Tier Identity Architecture

The user system has a fundamental split: **the frontend and backend manage user identity independently, and they are not connected.**

### Tier 1: Frontend — Device-Local Identity (`lib/userId.ts`)

| Concept | Detail |
|---------|--------|
| **Identity source** | A randomly generated UUID (v4) |
| **Storage** | `expo-file-system` → `lms_device_user_id.txt` in the app's document directory |
| **Creation** | First launch only — `getOrCreateUserId()` checks if the file exists, generates + persists a UUID if not |
| **Persistence** | Survives app backgrounding/restarts; destroyed on uninstall or app data clear |
| **Display name** | Separate file: `lms_display_name.txt` (default: `"lms_admin"`) |
| **API usage** | This UUID is passed as `userId` and `creatorId` in all API calls to the backend |

```typescript
// lib/userId.ts — the core identity functions

export async function getOrCreateUserId(): Promise<string> {
  // Reads lms_device_user_id.txt; generates + persists if missing
}

export async function getDisplayName(): Promise<string> {
  // Reads lms_display_name.txt; returns "lms_admin" if missing
}

export async function saveDisplayName(name: string): Promise<void> {
  // Writes to lms_display_name.txt
}
```

### Tier 2: Backend — DynamoDB User Profiles

The backend has a full user profile system with its own `createUser` handler and `UserProfileItem` schema. **However, the frontend never calls it.**

| Concept | Detail |
|---------|--------|
| **Schema** | `UserProfileItem` with PK=`USER#<userId>`, SK=`PROFILE` |
| **Fields** | `userId`, `displayName`, `avatarUrl`, `preferences`, `createdAt`, `updatedAt` |
| **Endpoints** | `POST /users` (create), `GET /users/{userId}` (fetch), `PATCH /users/{userId}/preferences` (update) |
| **Frontend usage** | **None** — the API client (`lib/api.ts`) never calls any `/users` endpoint except `GET /users/{userId}/games` |

**The disconnect:** When a user opens the app for the first time, a UUID is generated on-device. This UUID is used immediately to create games and join games. The backend `createUser` handler is never invoked — no `UserProfileItem` row is ever written. The backend user table remains empty. Users exist only as `PlayerItem` rows within games.

---

## 2. How Identity Flows Through the App

### On first launch

1. `getOrCreateUserId()` generates a UUID (e.g., `a1b2c3d4-...`)
2. `getDisplayName()` returns the default `"lms_admin"`
3. These values are used on every screen that needs identity

### On subsequent launches

1. `getOrCreateUserId()` reads the same UUID from the file
2. `getDisplayName()` reads the last-saved display name
3. Identity is consistent across sessions

### Screens that load identity

| Screen | Calls |
|--------|-------|
| `app/private/create.tsx` | `getOrCreateUserId()` + `getDisplayName()` on mount |
| `app/private/join.tsx` | `getOrCreateUserId()` + `getDisplayName()` on mount |
| `app/account/index.tsx` | `getOrCreateUserId()` + `getDisplayName()` + `listUserGames()` on focus |
| `app/account/settings.tsx` | `getDisplayName()` + `saveDisplayName()` |
| `app/game/[gameId].tsx` | `getOrCreateUserId()` to identify current player |

### Every API call that sends userId

All game-related API calls pass the device-local UUID:

- `createGame(params.creatorId)` — the creator's identity
- `joinGame(gameId, userId, displayName)` — the joining player
- `leaveGame(gameId, userId)` — identifying who is leaving
- `restartGame(gameId, userId)` — authorization check
- `hideGame(gameId, userId)` — identifying which player record to hide
- `listUserGames(userId)` — GSI2 lookup key

---

## 3. Backend User Profile (Unused)

### UserProfileItem Schema

| Field | Type | Notes |
|-------|------|-------|
| `PK` | `USER#<userId>` | Primary partition key |
| `SK` | `PROFILE` | Always literal `PROFILE` |
| `userId` | `string` (UUID) | Matches the device-local UUID |
| `displayName` | `string` | User's chosen display name |
| `avatarUrl` | `string?` | Optional avatar URL |
| `preferences` | `UserPreferences` object | Nestable preferences object |
| `createdAt` | ISO 8601 | |
| `updatedAt` | ISO 8601 | |

### UserPreferences Object

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `notificationsEnabled` | `boolean` | `true` | Master notification toggle |
| `notifyOnRoundOpen` | `boolean` | `true` | When picks open for a round |
| `notifyOnDeadlineReminder` | `boolean` | `true` | Before pick deadline |
| `notifyOnResults` | `boolean` | `true` | When match results are in |
| `notifyOnElimination` | `boolean` | `true` | When user is eliminated |
| `theme` | `"dark"` \| `"light"` | `"dark"` | UI theme preference |
| `favouriteLeagues` | `string[]` | `[]` | Preferred league names |

### Backend Handlers

#### `POST /users` — createUser

- Generates a new UUID for `userId` (ignores any client-provided ID)
- Creates a `UserProfileItem` with default preferences
- Does NOT check for duplicates
- **Never called from the frontend**

#### `GET /users/{userId}` — getUser

- Fetches `UserProfileItem` by PK/SK
- Returns `{ userId, displayName, avatarUrl, preferences, createdAt }`
- **Never called from the frontend**

#### `PATCH /users/{userId}/preferences` — updatePreferences

- Accepts a partial preferences object
- Whitelists keys: `notificationsEnabled`, `notifyOnRoundOpen`, `notifyOnDeadlineReminder`, `notifyOnResults`, `notifyOnElimination`, `theme`, `favouriteLeagues`
- Updates individual preference fields using `SET preferences.#key = :val`
- Returns updated preferences
- **Never called from the frontend**

---

## 4. User ↔ Game Relationship

Users relate to games exclusively through the `PlayerItem` entity — one row per user per game.

### How a user's games are listed

`GET /users/{userId}/games` queries **GSI2** on DynamoDB:

```
GSI2PK = USER#<userId>  →  returns all PlayerItem rows for that user
```

The handler filters out rows with `hidden: true` and maps to:

```json
{
  "games": [
    {
      "gameId": "<uuid>",
      "gameName": "Weekend Warriors",
      "gameState": "waiting_for_players",
      "playerStatus": "alive",
      "joinedAt": "2026-03-28T..."
    }
  ]
}
```

**Key detail:** The `gameName` and `gameState` fields on `PlayerItem` are **denormalized snapshots** written at join time. They are NOT updated when the game changes state. This means the account screen may show stale game state labels.

### PlayerItem fields relevant to user identity

| Field | Source | Notes |
|-------|--------|-------|
| `userId` | Device-local UUID | The user's identity |
| `displayName` | Entered at join/create time | Copied from what the user typed |
| `status` | Game-driven | `alive`, `eliminated`, `deferred`, or `left` |
| `gameName` | Denormalized from GameMetaItem | Snapshot at join time |
| `gameState` | Denormalized from GameMetaItem | Snapshot at join time (stale) |
| `hidden` | Set by hideGame handler | Hides the game from the user's list |

---

## 5. Display Name Management

### Where display names are set

| Context | How |
|---------|-----|
| **First launch** | Default `"lms_admin"` |
| **Account Settings** | `app/account/settings.tsx` — editable text field + Save button |
| **When creating a game** | The current display name is shown and sent as `creatorDisplayName` |
| **When joining a game** | The current display name is shown as "Joining as X" and sent to the API |

### Account Settings screen (`app/account/settings.tsx`)

- Loads current display name via `getDisplayName()` on focus
- Provides a `FormInput` (max 32 chars) to edit the name
- On save, calls `saveDisplayName(name)` which persists to `lms_display_name.txt`
- Shows "Saved ✓" button state after successful save

### Display name in game context

When creating a game, the display name is:
- Shown on the create form as "Playing as: **Alice**"
- Sent to the backend as `displayName` (stored in `PlayerItem.displayName`)
- Not stored in any user profile (since `UserProfileItem` is never created)

When joining a game, the display name is:
- Shown below the preview card as "Joining as **Alice**"
- Sent to the backend as `displayName` (stored in `PlayerItem.displayName`)

---

## 6. Account Screen (`app/account/index.tsx`)

The account screen is the primary user-facing view of identity + game membership.

### Layout

```
┌─────────────────────────┐
│   👤 Person icon        │
│   Alice                 │  ← display name from device storage
├─────────────────────────┤
│ Current Games           │
│ ┌─────────────────────┐ │
│ │ Weekend Warriors    │ │  ← tappable game card
│ │ waiting_for_players │ │
│ │         · alive   > │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ My Account              │
│ ┌─────────────────────┐ │
│ │ 🕐 Game History   > │ │  ← navigation stubs
│ │ 📊 Statistics     > │ │
│ │ ⚙️  Settings      > │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### Behavior
- Reloads on every focus (via `useFocusEffect`)
- Shows loading spinner while fetching
- Shows error state if API call fails
- Shows empty state if no games exist
- Game cards navigate to `/game/{gameId}`

### Navigation stubs

| Route | Screen | Status |
|-------|--------|--------|
| `/account/history` | Game History | Stub — placeholder icon + text |
| `/account/statistics` | Player Statistics | Stub — placeholder icon + text |
| `/account/settings` | Account Settings | **Functional** — display name editing |

---

## 7. User-Related Operations (on Game Detail Screen)

The game detail screen (`app/game/[gameId].tsx`) identifies the current user by matching `userId` against the game's player list. Based on the user's relationship to the game, it exposes different actions:

| Condition | Available Actions |
|-----------|-------------------|
| Game is `waiting_for_players` and user is a player (not left) | **Leave Game** button |
| Game is `abandoned` | **Restart Game** + **Remove from History** buttons |
| Any other state | Read-only view |

### Leave Game (`POST /games/{gameId}/leave`)
- User-visible: Confirmation alert ("Are you sure? Your entry fee will be refunded.")
- Backend: Player status → `left`, prize pool reduced, player count decremented
- If last player: game transitions to `abandoned`

### Restart Game (`POST /games/{gameId}/restart`)
- Only shown on `abandoned` games
- Sets player back to `alive`, game back to `waiting_for_players`
- Only callable by a player whose status is `left`

### Remove from History (`POST /games/{gameId}/players/{userId}/hide`)
- Only shown on `abandoned` games
- Sets `hidden: true` on the PlayerItem
- After hiding, navigates back — game disappears from account list

---

## 8. What "Authorization" Exists

There is **no authentication or authorization** in the traditional sense:

- The `userId` parameter is passed in the request body or URL — it is **not validated** against a session or token
- Any client can call `GET /users/{userId}/games` with any UUID and see that user's games
- Any client can call `POST /games/{gameId}/join` with any `userId` and join as that user
- The `leaveGame` and `restartGame` handlers check that the player record exists and has the correct status, but do not verify that the caller "owns" that `userId`
- The `hideGame` handler checks that the player has `status: left` and the game is `abandoned`, but does not authenticate the caller
- The `shareGame` handler uses optimistic locking (`version`) to prevent concurrent modification, but does not check that the caller is the game creator

**The only identity "security"** is that the device-local UUID file is stored in the app's private document directory, inaccessible to other apps.

---

## 9. User ↔ Creator Relationship

The `GameMetaItem` stores a `creatorId` field — the UUID of the user who created the game. However:

- **No backend handler checks `creatorId`** for authorization. The creator has no elevated privileges — any player can call `leaveGame`, `restartGame`, or `hideGame` if they meet the status conditions.
- **No "my created games" query** exists. The creator can only see their created games through the same GSI2 query as any other player.
- The `cancelGame` handler exists in the backend but does not check `creatorId` either.

---

## 10. Summary of Disconnects & Gaps

### Frontend ↔ Backend disconnect

| Frontend does | Backend expects | Status |
|---------------|-----------------|--------|
| Generates UUID on device | `POST /users` creates profile row | **Never connected** — no UserProfileItem exists |
| Stores display name locally | `UserProfileItem.displayName` | **Disconnected** — display name lives only in the device file and on PlayerItem rows |
| No preferences UI | `UserPreferences` object with 7 fields | **Backend-only** — preferences are defined but never set or read |
| No theme toggle | `preferences.theme` = dark/light | **Unused** — app hardcodes dark theme in `constants/theme.ts` |
| No notification system | Notification preference fields | **Unused** — no push notification infrastructure exists |

### Known gaps

1. **No authentication** — identity is a plaintext file; no login, no sessions, no tokens
2. **No account recovery** — uninstalling the app loses all game history permanently
3. **No cross-device access** — cannot play the same games from a different phone
4. **No user profile in DynamoDB** — `createUser` handler exists but is never called; the user table is empty
5. **No device-to-profile linking** — even if `createUser` were called, the device UUID wouldn't match the server-generated UUID
6. **Display name inconsistency** — the name on the device might differ from the name stored on existing `PlayerItem` rows from previous games
7. **Stale game state on PlayerItem** — the account screen may show outdated game state labels
8. **No authorization** — any client can act as any user by passing a different `userId`
9. **No creator privileges** — `creatorId` is stored but never used for access control
10. **Preferences are dead code** — fully implemented in the backend but unreachable from the frontend
