# Last Player Standing

A sports prediction / elimination game. iOS-first, built with Expo (React Native) with a serverless AWS backend (SAM + DynamoDB).

## Getting Started

```bash
npm install
npx expo start
```

Press `i` for iOS simulator or scan the QR code with Expo Go.

## Local Development (Full Stack)

Run the complete backend (DynamoDB Local + SAM API) alongside the Expo app so you can create games, join, pick teams, and simulate the full elimination flow — all on your machine, no AWS account needed.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

### Quick Start

```bash
# Full stack + iOS Simulator
npm run dev:ios

# Full stack + Android Emulator
npm run dev:android

# Full stack + Web
npm run dev:web

# Backend only (run Expo yourself)
npm run dev:backend
```

This starts **four services** with a single command:

| Service         | URL                      |
| --------------- | ------------------------ |
| DynamoDB Local  | http://localhost:8000    |
| SAM API         | http://localhost:3000    |
| Expo (varies)   | platform-dependent       |

Press **Ctrl+C** to tear everything down (DynamoDB container, SAM API, Expo).

### What Gets Seeded

The startup seeds a game called **"Weekend Warriors"** with:

- 6 users (Alice, Bob, Charlie, Diana, Eric, Fiona)
- 6 players with mixed statuses (alive, eliminated, deferred)
- 3 completed rounds with picks and outcomes
- 1 deferred obligation (postponed match)

### API URL Resolution

The Expo app resolves the API URL per platform via `constants/api.ts`:

| Platform          | API URL                      |
| ----------------- | ---------------------------- |
| iOS Simulator     | `http://localhost:3000`      |
| Android Emulator  | `http://10.0.2.2:3000`      |
| Web               | `http://localhost:3000`      |

Override with `EXPO_PUBLIC_API_URL` if needed:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.50:3000 npx expo start
```

### Backend-Only Commands

From the `backend/` directory you can also run services individually:

```bash
npm run local:db       # Start DynamoDB container
npm run local:setup    # Create table + seed data
npm run local:api      # Start SAM API on :3000
npm run local:seed     # Re-seed sample data
npm run local:reset    # Drop table + re-create + re-seed
```

## Project Structure

```
├── app/                  Expo Router screens
│   ├── index.tsx         Home screen
│   ├── private/create    Create Private Game
│   ├── private/join      Join Private Game
│   ├── public/create     Create Public Game
│   └── public/join       Join Public Game
├── backend/              SAM serverless backend
│   ├── template.yaml     SAM/CloudFormation template
│   ├── src/handlers/     Lambda function handlers
│   ├── docker-compose.yml DynamoDB Local config
│   ├── env.local.json    Local env vars for SAM
│   └── scripts/          DB setup, seed, reset scripts
├── components/ui/        Reusable UI components
├── constants/
│   ├── api.ts            API URL config (platform-aware)
│   └── theme.ts          Colors, spacing, typography
├── dojo/                 Web dashboard (Vite + React)
├── scripts/
│   └── dev-local.sh      Full-stack local dev orchestrator
└── figma/                Figma design links
```

## Figma Integration (Deferred)

Figma MCP guides are included for when a proper license is acquired.
See `figma_setup.md` and `figma_connect.md` for details.
