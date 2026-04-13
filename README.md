# Last Player Standing

A sports prediction / elimination game. iOS-first, built with Expo (React Native).

## Getting Started

```bash
cd lms
npm install
npx expo start
```

Press `i` for iOS simulator or scan the QR code with Expo Go.

## Project Structure

```
├── app/                  Expo Router screens
│   ├── index.tsx         Home screen
│   ├── private/create    Create Private Game
│   ├── private/join      Join Private Game
│   ├── public/create     Create Public Game
│   └── public/join       Join Public Game
├── components/ui/        Reusable UI components
├── constants/theme.ts    Colors, spacing, typography
├── figma/                Figma design links (for later)
├── figma_setup.md        Figma MCP setup guide
└── figma_connect.md      Figma MCP connection guide
```

## Figma Integration (Deferred)

Figma MCP guides are included for when a proper license is acquired.
See `figma_setup.md` and `figma_connect.md` for details.
