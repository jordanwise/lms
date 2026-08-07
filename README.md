# Last Player Standing

A sports prediction / elimination game. iOS-first, built with Expo (React Native) with a serverless AWS backend (SAM + DynamoDB), emulated locally via localstack.

---

## Prerequisites

Install these on a fresh machine:

| Tool | Check | Install |
|------|-------|---------|
| Node.js 20+ | `node --version` | `brew install node` or [nodejs.org](https://nodejs.org) |
| Docker | `docker --version` | [Docker Desktop](https://docs.docker.com/get-docker/) |
| AWS CLI | `aws --version` | `brew install awscli` |
| AWS SAM CLI | `sam --version` | `brew install aws-sam-cli` |
| Maestro (UI tests) | `maestro --version` | `curl -Ls "https://get.maestro.mobile.dev" \| bash` |
| Xcode (iOS) | `xcodebuild -version` | App Store |

---

## 1. Clone & Install

```bash
git clone git@github.com:YOUR_USER/lms.git lms   # ← replace with actual repo URL
cd lms

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install dev tools dependencies
cd dev-tools && npm install && cd ..
```

---

## 2. Start Backend (localstack + SAM API)

```bash
cd backend

# Start localstack (Docker) — DynamoDB, EventBridge, SQS, SNS on port 4566
docker compose up -d

# Wait for localstack to be ready, then create the LMS table + seed data
npm run local:setup

# Start SAM local API on port 3000
npm run local:api
```

**Verification:**
```bash
curl http://localhost:3000/games/pin/ABC12345
# → should return seed game "Weekend Warriors"
```

---

## 3. Run Backend Tests

```bash
cd backend
npm test          # all 122 tests (state machine, API, lifecycle, tick)
npm run test:e2e  # game lifecycle tests only (16 tests)
```

Tests run against localstack — no external services needed.

---

## 4. Start Frontend (Expo)

```bash
cd lms
npx expo start
```

Press `i` for iOS simulator.

The app connects to `http://localhost:3000` automatically (configured in `constants/api.ts`).

**Seeded test game:** PIN `ABC12345` — enter this on the Join screen to explore the app.

---

## 5. Dev Tools Admin App

```bash
cd lms/dev-tools
npm run dev
# Opens http://localhost:5173
```

Six tabbed panels:
- **Game Creator** — create games with configurable fee, leagues, rollover/split
- **Players** — create test users, join games, bulk submit picks
- **Round Manager** — add rounds, open picks, lock rounds
- **Result Injector** — mock 10 fixtures per matchday, enter outcomes, apply eliminations
- **Tick Trigger** — step-by-step or full-cycle tick processing
- **Game Explorer** — fetch game by ID or PIN, view full state

Use the dev tools to inject game events while the iOS app is open to test reactive UI updates.

---

## 6. Maestro UI Tests (iOS Simulator)

Requires an iOS simulator running with the Expo dev client installed.

```bash
# Build the Expo dev client for iOS (one-time)
cd lms
npx expo run:ios

# In another terminal, start the backend
cd lms/backend
docker compose up -d
npm run local:setup && npm run local:api

# Run Maestro tests
cd lms/maestro
./run-tests.sh
```

Or via npm:
```bash
cd lms
npm run test:ui
```

---

## 7. All-in-One Quick Start

```bash
cd lms

# Terminal 1: Backend (localstack + SAM API)
cd backend
docker compose up -d && npm run local:setup && cd .. && npm run dev:backend

# Terminal 2: Dev tools
cd dev-tools && npm run dev

# Terminal 3: Expo
npx expo start
# Press i for iOS

# Terminal 4: Backend tests
cd backend && npm test
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  iOS Simulator (Expo / React Native)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Create   │  │ Join     │  │ Game Detail      │  │
│  │ Game     │  │ by PIN   │  │ (rounds, picks,  │  │
│  │          │  │          │  │  results)         │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│  ┌──────────────────────────────────────────────┐   │
│  │ Account (history, stats, settings)            │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP :3000
┌──────────────────────▼──────────────────────────────┐
│  SAM Local API Gateway (:3000)                       │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌────────┐   │
│  │ create  │ │  join   │ │ addRound │ │  tick  │   │
│  │ Game    │ │  Game   │ │ openPick │ │ manual │   │
│  └─────────┘ └─────────┘ └──────────┘ └────────┘   │
│  ... 21 Lambda handlers total ...                    │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  localstack (:4566)                                  │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ DynamoDB │  │ EventBridge  │  │ SQS / SNS    │   │
│  │ (LMS)    │  │ (tick/5min)  │  │ (notify)     │   │
│  └──────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────┘
```

| Service | URL | Purpose |
|---------|-----|---------|
| SAM API | `http://localhost:3000` | All game/user/tick endpoints |
| localstack | `http://localhost:4566` | DynamoDB, EventBridge, SQS, SNS |
| Dev Tools | `http://localhost:5173` | Admin UI for game event injection |
| Expo | `http://localhost:8081` | Metro bundler |

---

## Project Structure

```
lms/
├── app/                    Expo Router screens
│   ├── index.tsx           Home screen
│   ├── _layout.tsx         Root layout + deep link handler
│   ├── private/            Create/Join/Confirm Private Game
│   ├── public/             Create/Join Public Game (stubs)
│   ├── account/            Account, History, Statistics, Settings
│   └── game/[gameId]/      Game detail, Rounds, Pick, Results
├── backend/                SAM serverless backend
│   ├── template.yaml       SAM template (21 functions)
│   ├── docker-compose.yml  localstack config
│   ├── env.local.json      Local env vars for all functions
│   ├── src/
│   │   ├── handlers/       21 Lambda handlers
│   │   ├── lib/            DynamoDB, state machine, fixtures, tick processor
│   │   ├── types/          TypeScript types
│   │   └── __tests__/      122 tests (4 suites)
│   └── scripts/            Setup, seed, reset, start-local, dev-server
├── dev-tools/              Admin web app (Vite + JS)
│   └── src/panels/         Game Creator, Players, Round Manager, Result Injector,
│                           Tick Trigger, Game Explorer
├── maestro/                iOS UI tests
│   ├── .maestro/config.yaml
│   ├── common/             Shared sub-flows + API helper
│   └── flows/              7 test flows
├── components/ui/          Reusable UI components
├── constants/              Theme, API URL, state machine
├── lib/                    API client, userId, notifications
└── scripts/                dev-local.sh orchestrator
```

---

## Known Limitations

- **No auth** — device-local UUID as identity, no cross-device access
- **Stale gameState** on PlayerItem (denormalized snapshot); frontend fetches fresh state as workaround
- **PIN uniqueness** not enforced (extremely unlikely collision in practice)
- **Push notifications** infrastructure built but requires Expo Push API + real device for end-to-end testing
- **No AWS account required** — everything runs locally via localstack

