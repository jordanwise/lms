# Game Setup & Lifecycle — Implementation Reference

This document describes how games work from an **implementation perspective**: how they are created, stored, shared, joined, and managed. Game *rules* (elimination logic, pick resolution, state machine guards) are documented separately in `docs/game-state-diagram.md` and `constants/gameStateMachine.json`.

---

## 1. Identity & Auth (How Users Exist)

There is no real authentication. The system uses a **device-local UUID** as user identity.

**How it works:**
- `lib/userId.ts` exports `getOrCreateUserId()` and `getDisplayName()`
- On first launch, a random UUID (v4) is generated and persisted to `expo-file-system` at `lms_device_user_id.txt`
- On subsequent launches, the UUID is read back from the file
- A display name is also stored in `lms_display_name.txt` (default: `"lms_admin"`)
- **This ID is used as the `userId` in all API calls** — no auth token, no session

**Implications:**
- All games, picks, and history are tied to a device install
- Uninstalling the app (or clearing its storage) irreversibly loses all game associations
- No cross-device access or account recovery
- Every screen that needs identity calls `getOrCreateUserId()` + `getDisplayName()` on mount

---

## 2. Database Design (Single-Table DynamoDB)

All data lives in **one DynamoDB table** (`LMS`) using a single-table design with composite keys.

### Key Schema

| Key | Format | Purpose |
|-----|--------|---------|
| `PK` | `GAME#<gameId>` | Primary partition — scopes all game-related entities |
| `SK` | Varies by entity type | Primary sort — distinguishes entity types within a game |
| `GSI1PK` | `PIN#<pin>` | Global Secondary Index 1 — looking up a game by its PIN |
| `GSI2PK` | `USER#<userId>` | GSI2 partition — listing a user's games |
| `GSI2SK` | `GAME#<gameId>` | GSI2 sort — ordering within a user's games |

### Entity Types (Rows)

#### GameMetaItem — The game itself

| Field | Example | Notes |
|-------|---------|-------|
| `PK` | `GAME#<uuid>` | |
| `SK` | `META` | Always the literal string `META` |
| `GSI1PK` | `PIN#K7X3M9PH` | Enables PIN → game lookup via GSI1 |
| `gameId` | `<uuid>` | Same UUID used in PK |
| `name` | `"Weekend Warriors"` | User-supplied game name (max 32 chars) |
| `pin` | `K7X3M9PH` | 8-char alphanumeric code (auto-generated) |
| `fee` | `10` | Entry fee in GBP (£5–£200, step 5) |
| `leagues` | `["Premier League", "Championship"]` | Array of league names |
| `rollover` | `true` | If all players eliminated, collect fees again |
| `splitPot` | `false` | If all players eliminated, split pot among them |
| `state` | `"waiting_for_players"` | Current game state (see state machine) |
| `roundState` | `"picking"` | Sub-state when `state === "active"` |
| `currentRound` | `3` | 0-based; incremented each round |
| `creatorId` | `<uuid>` | The device UUID of the creator |
| `prizePool` | `50` | Total fees collected (`fee * playerCount`) |
| `playerCount` | `5` | Number of active players |
| `version` | `1` | Optimistic locking counter |
| `createdAt` | ISO 8601 string | |
| `updatedAt` | ISO 8601 string | |

#### PlayerItem — One player within a game

| Field | Example | Notes |
|-------|---------|-------|
| `PK` | `GAME#<gameId>` | Same partition as the game |
| `SK` | `PLAYER#<userId>` | |
| `GSI2PK` | `USER#<userId>` | Enables "My Games" query via GSI2 |
| `GSI2SK` | `GAME#<gameId>` | |
| `gameId` | `<uuid>` | The game this player belongs to |
| `userId` | `<uuid>` | The device UUID of this player |
| `displayName` | `"Alice"` | Display name entered when joining/creating |
| `status` | `"alive"` \| `"eliminated"` \| `"deferred"` \| `"left"` | Current player status |
| `paidFee` | `true` | Whether this player has paid |
| `gameName` | `"Weekend Warriors"` | **Denormalized** — copied from GameMetaItem at join time for GSI2 queries |
| `gameState` | `"waiting_for_players"` | **Denormalized** — snapshot at join time; NOT updated on transitions |
| `joinedAt` | ISO 8601 string | |
| `hidden` | `true` | Set when a player hides an abandoned game they left |

#### RoundItem — One round within a game

| Field | Notes |
|-------|-------|
| `PK` | `GAME#<gameId>` |
| `SK` | `ROUND#0001` (zero-padded to 4 digits) |
| `roundNum` | 1-based round number |
| `state` | `"pending"` \| `"picking"` \| `"locked"` \| `"processing"` \| `"complete"` |
| `matchday` | Fixture identifier string |
| `leagueId` | League identifier |
| `deadline` | ISO 8601 — pick deadline |
| `createdAt` | ISO 8601 | |

#### PickItem — One player's pick in one round

| Field | Notes |
|-------|-------|
| `PK` | `GAME#<gameId>` |
| `SK` | `PICK#0001#<userId>` |
| `roundNum` | 1-based |
| `userId` | The picking player |
| `teamId` | Identifier of the chosen team |
| `teamName` | Human-readable team name |
| `outcome` | `"win"` \| `"loss"` \| `"draw"` \| `"postponed"` (set after results) |
| `pickedAt` | ISO 8601 | |

#### DeferredItem — A postponed-match obligation

| Field | Notes |
|-------|-------|
| `PK` | `GAME#<gameId>` |
| `SK` | `DEFER#<userId>#0001` |
| `userId` | The player with the obligation |
| `roundNum` | Round where the postponement occurred |
| `originalTeamId` | The team whose match was postponed |
| `rescheduledRoundNum` | Round where the rescheduled fixture falls |
| `resolved` | `boolean` | |

### Query Patterns

| Use Case | Access Method |
|----------|---------------|
| Get a game by ID | `GetItem` on `PK=GAME#<gameId>, SK=META` |
| Find a game by PIN | `Query` on GSI1 with `GSI1PK=PIN#<pin>` |
| List a user's games | `Query` on GSI2 with `GSI2PK=USER#<userId>` |
| List players in a game | `Query` on main table: `PK=GAME#<gameId>, SK begins_with PLAYER#` |
| List rounds in a game | `Query` on main table: `PK=GAME#<gameId>, SK begins_with ROUND#` |
| List picks in a game | `Query` on main table: `PK=GAME#<gameId>, SK begins_with PICK#` |
| Get full game detail | `GetItem` game meta + parallel `Query` for players, rounds, picks |

---

## 3. How a Game is Created (Full Flow)

### Step 1: User fills in the Create form (`app/private/create.tsx`)

The form collects:

| Input | Component | Constraints |
|-------|-----------|-------------|
| Display name | Auto-loaded from `getDisplayName()` | Non-empty |
| Game name | `FormInput` | Required, max 32 chars |
| Entry fee | `FeeStepper` | £5–£200, step £5; custom >£200 allowed |
| Leagues | `LeagueSelector` | At least one required; 6 options (Premier League, Championship, L1, L2, National League, Scottish Prem) |
| Rollover | `Checkbox` | Boolean; mutually exclusive with Split Pot |
| Split Pot | `Checkbox` | Boolean; mutually exclusive with Rollover |

The form is wrapped in `KeyboardAvoidingView` + `ScrollView` for iOS keyboard handling. The "Create" button is disabled until all validation passes.

### Step 2: `lib/api.ts` → `POST /games`

The frontend calls `createGame()` which sends:

```json
{
  "name": "Weekend Warriors",
  "fee": 10,
  "leagues": ["Premier League", "Championship"],
  "rollover": true,
  "splitPot": false,
  "creatorId": "<device-UUID>",
  "displayName": "Alice"
}
```

### Step 3: Backend `createGame` handler

1. **Validates** all required fields (`name`, `fee >= 5`, `leagues` non-empty, `creatorId`, `displayName`)
2. **Generates** a random `gameId` (UUID v4) and an 8-character `pin` (from charset `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` — excludes ambiguous characters like I/1, O/0)
3. **Creates two items in a DynamoDB transaction** (both succeed or both fail):
   - `GameMetaItem` — the game record, starting in `waiting_for_players` state (skipping the `created` state)
   - `PlayerItem` — the creator as the first player, with status `alive`, `paidFee: true`
4. The creator's game fee is immediately added to `prizePool`
5. **Returns** `{ gameId, pin, name, state, fee, leagues, rollover, splitPot }` with HTTP 201

**Notable design decision:** The game goes straight to `waiting_for_players` rather than `created`. The `shareGame` handler (which transitions `created → waiting_for_players`) exists but is currently **bypassed**. This means there is no "draft mode" — the game is immediately joinable after creation.

### Step 4: Navigate to Confirm screen (`app/private/confirm.tsx`)

The frontend navigates to `/private/confirm` with route params:

```typescript
router.push({
  pathname: '/private/confirm',
  params: {
    gameName: result.data.name,
    gamePin: result.data.pin,
    fee: String(result.data.fee),
    leagues: JSON.stringify(result.data.leagues),
    rollover: String(result.data.rollover),
    splitPot: String(result.data.splitPot),
  },
});
```

The confirm screen displays:
- A success banner with checkmark icon
- A summary card showing all game details
- Three share buttons: **WhatsApp**, **Text**, **Messenger** — all currently **stubbed** with `Alert.alert('Coming Soon', ...)` (no actual sharing implemented yet)

---

## 4. How a Game is Shared

Sharing is **not yet implemented** in a functional sense. There are two pieces:

### Frontend: Confirm screen share stubs
- WhatsApp button → shows "Coming Soon" alert
- Text button → shows "Coming Soon" alert  
- Messenger button → shows "Coming Soon" alert

No native share sheet, no deep link generation, no PIN copy-to-clipboard exists yet.

### Backend: `shareGame` handler (`POST /games/{gameId}/share`)
- Exists and is functional — transitions game state from `created` to `waiting_for_players` via the state machine
- Uses `canTransition()` / `applyTransition()` with guard evaluation
- Uses optimistic locking (`ConditionExpression: 'version = :ver'`)
- **Not currently called** because `createGame` skips the `created` state

**How sharing is intended to work (not yet implemented):**
1. Creator creates a game → game is in `created` state (draft)
2. Creator shares → `POST /games/{gameId}/share` transitions to `waiting_for_players`
3. Share UI would generate a deep link or copy the PIN to clipboard
4. Recipients use the PIN to join

---

## 5. How a Game is Joined

### Step 1: User enters a PIN (`app/private/join.tsx`)

- Text input field accepts exactly 8 characters (alphanumeric, auto-capitalized, stripped of invalid chars)
- "Find" button (search icon) is active once PIN length ≥ 6
- Pressing the button calls `getGameByPin(pin)`

### Step 2: PIN lookup → `GET /games/pin/{pin}` 

The backend queries GSI1 with `GSI1PK=PIN#<pin>`. Returns:

```json
{
  "gameId": "<uuid>",
  "name": "Weekend Warriors",
  "pin": "K7X3M9PH",
  "fee": 10,
  "state": "waiting_for_players",
  "playerCount": 3,
  "leagues": ["Premier League"]
}
```

If not found, the UI shows "No game found with that PIN."

### Step 3: Game preview card

If found, the join screen renders a preview card showing the game name, PIN, status, fee, player count, and leagues. If the game state is NOT `waiting_for_players` or `abandoned`, a warning is shown and the "Join" button is disabled.

### Step 4: Join → `POST /games/{gameId}/join`

The join handler:

1. **Validates** the game exists and is in `waiting_for_players` (or `abandoned`)
2. **Creates a PlayerItem** with `status: alive`, `paidFee: true`, and denormalized `gameName`/`gameState`
3. **Updates the game meta**: increments `playerCount`, adds fee to `prizePool`
4. Uses a **DynamoDB transaction** — if the player already exists (`attribute_not_exists(PK)` condition fails), a `TransactionCanceledException` triggers a "Player has already joined" error
5. If joining an `abandoned` game, also transitions state back to `waiting_for_players`

After joining, the user is navigated to `/game/{gameId}`.

---

## 6. How Games are Listed (Account Screen)

### `GET /users/{userId}/games`

Queries GSI2 with `GSI2PK=USER#<userId>`. Returns all `PlayerItem` rows for that user, filtered to exclude hidden games:

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

### Account screen (`app/account/index.tsx`)

- Uses `useFocusEffect` to reload every time the screen gains focus
- Shows a player header (icon + display name)
- Lists all active games as tappable cards (game name + status badge)
- Tapping navigates to `/game/{gameId}`
- Shows empty state when no games exist
- Has navigation rows to: Game History, Player Statistics, Account Settings (all stubs)

---

## 7. Full Game Lifecycle (State Transitions)

### States

| State | Meaning |
|-------|---------|
| `created` | Game exists but hasn't been shared (bypassed — see §3) |
| `waiting_for_players` | Players can join; creator auto-joined |
| `active` | Game in progress; rounds are being played |
| `completed` | Game finished — winner or split pot |
| `rollover_pending` | All players eliminated, collecting re-buys |
| `cancelled` | Creator cancelled the game |
| `abandoned` | Last player left during `waiting_for_players` |

### Round Sub-States (within `active`)

| Sub-State | Meaning |
|-----------|---------|
| `pending` | Round created, picks not yet open |
| `picking` | Players selecting teams |
| `locked` | Deadline passed, matches in play |
| `processing` | Results available, calculating eliminations |
| `complete` | Eliminations applied, round finished |

### Transitions (backend `stateMachine.ts`)

The `shareGame`, `addRound`, `openPicks`, `lockRound`, `submitResults`, `applyEliminations`, `cancelGame`, and `submitPick` handlers each use `canTransition()` → `applyTransition()` to validate and execute state changes. Guards include:

- `hasMultipleSurvivors` — more than one player still alive
- `exactlyOneSurvivor` — winner determined
- `allEliminatedAndSplitPot` — all players out + splitPot enabled
- `allEliminatedAndRollover` — all players out + rollover enabled

Detailed transitions are in `constants/gameStateMachine.json` and visualized in `docs/diagrams/`.

---

## 8. Player Management Operations

### Leave (`POST /games/{gameId}/leave`)

- Only allowed when game is in `waiting_for_players` state
- Player status changed to `left` (not deleted)
- `prizePool` decreased by the fee, `playerCount` decremented
- **If it was the last player**, game transitions to `abandoned` state
- Uses a transaction with `ConditionExpression` to prevent race conditions

### Restart (`POST /games/{gameId}/restart`)

- Only works on `abandoned` games
- Only callable by a player whose status is `left`
- Transitions game back to `waiting_for_players`, re-adds the player as `alive`, re-adds their fee to the prize pool

### Hide (`POST /games/{gameId}/players/{userId}/hide`)

- Only works on `abandoned` games
- Only works if the player has already `left`
- Sets `hidden: true` on the PlayerItem — filtered out of GSI2 queries in `listUserGames`

---

## 9. API Endpoint Summary

| Method | Path | Handler | Status |
|--------|------|---------|--------|
| `GET` | `/games/{gameId}` | `getGame` | Implemented |
| `GET` | `/games/pin/{pin}` | `getGameByPin` | Implemented |
| `POST` | `/games` | `createGame` | Implemented |
| `POST` | `/games/{gameId}/share` | `shareGame` | Implemented (not wired) |
| `POST` | `/games/{gameId}/join` | `joinGame` | Implemented |
| `POST` | `/games/{gameId}/leave` | `leaveGame` | Implemented |
| `POST` | `/games/{gameId}/restart` | `restartGame` | Implemented |
| `POST` | `/games/{gameId}/players/{userId}/hide` | `hideGame` | Implemented |
| `GET` | `/games/{gameId}/players` | `listPlayers` | Implemented |
| `POST` | `/games/{gameId}/rounds` | `addRound` | Implemented |
| `POST` | `/games/{gameId}/rounds/{n}/open` | `openPicks` | Implemented |
| `POST` | `/games/{gameId}/rounds/{n}/picks` | `submitPick` | Implemented |
| `POST` | `/games/{gameId}/rounds/{n}/lock` | `lockRound` | Implemented |
| `POST` | `/games/{gameId}/rounds/{n}/results` | `submitResults` | Implemented |
| `POST` | `/games/{gameId}/rounds/{n}/eliminate` | `applyEliminations` | Implemented |
| `POST` | `/games/{gameId}/cancel` | `cancelGame` | Implemented |
| `POST` | `/users` | `createUser` | Implemented |
| `GET` | `/users/{userId}` | `getUser` | Implemented |
| `PATCH` | `/users/{userId}/preferences` | `updatePreferences` | Implemented |
| `GET` | `/users/{userId}/games` | `listUserGames` | Implemented |

---

## 10. Key Observations & Gaps

### What works end-to-end
- Create a game with validation → stored in DynamoDB → confirm screen shown
- Join a game by PIN → PIN lookup via GSI1 → player added in transaction
- Account screen lists games from GSI2

### What is not yet wired frontend ↔ backend
- **Sharing** — confirm screen has stubs only; `shareGame` handler exists but `createGame` skips the `created` state it needs
- **Round management** — all round/pick/results/elimination handlers implemented but no frontend screens consume them
- **User profiles** — `createUser`/`getUser`/`updatePreferences` handlers exist but no user management screens use them

### Known gaps (from README)
- **PIN uniqueness** — not enforced with conditional writes; collision is extremely unlikely (2.8 trillion combinations) but possible
- **Stale `gameState` on PlayerItem** — the denormalized `gameState` field on `PlayerItem` is a snapshot at join time and is NOT updated when the game transitions state. The account screen may show stale state labels
- **No authentication** — device-local UUID, no login/logout, no cross-device access
- **Paid fee is always true** — no payment integration; all joins auto-mark `paidFee: true`
