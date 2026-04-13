# Last Player Standing — Agent Rules

## General instructions
- DO NOT COMMIT CODE UNLESS YOU HAVE EXPLICIT PREMISSION. 
- COMMITS ARE ONLY NEEDED WHEN AN ENTIRE FEATURE IS ADDED, NOT FOR EVERY CHANGE. 
- WHEN YOU WANT TO COMMIT, ALWAYS ASK PERMISSION FIRST

## Project
- Sports prediction / elimination game
- Built with Expo (React Native) + TypeScript
- File-based routing via Expo Router

## Code conventions
- Use components from `components/ui/` — reuse, don't duplicate
- Use theme constants from `constants/theme.ts` for all colors, spacing, fonts
- No hardcoded color/spacing values in components
- Follow React Native StyleSheet patterns (no inline styles)



## Figma MCP (when connected)
- If Figma MCP returns a localhost source for an image/SVG, use it directly
- DO NOT import/add new icon packages — assets come from the Figma payload
- DO NOT create placeholders if a localhost source is provided
- Run `get_design_context` → `get_screenshot` → then implement

## Structure
- `app/` — Expo Router screens
- `components/ui/` — Reusable UI components
- `constants/theme.ts` — Design tokens (colors, spacing, typography)
- `figma/` — Figma design links (deferred)
