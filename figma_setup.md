# Figma → Multi-Platform App with MCP Agents

## Problem Statement

You want a workflow where you design an app in Figma and then use AI coding agents (e.g., Claude Code) to build implementations for **Android**, **iOS**, and **Web** — leveraging the new Figma MCP (Model Context Protocol) server to bridge design and code generation.

## What is the Figma MCP Server?

The **Figma MCP server** is Figma's official remote MCP service (`https://mcp.figma.com/mcp`) that exposes your Figma designs as structured data to AI coding agents. It launched as a beta feature and is distinct from third-party community servers.

### Key Advantages of the Figma MCP Connection

1. **Structured Design Data, Not Screenshots** — Instead of pasting screenshots, the MCP server sends structured layout, styling, spacing, typography, and component hierarchy information directly to the AI model. This produces dramatically more accurate code than vision-based approaches.

2. **Framework-Agnostic Output** — The default output is React + Tailwind, but you can prompt for **any framework**: SwiftUI (iOS), Jetpack Compose (Android), Vue, plain HTML/CSS, Flutter, etc. One Figma design → multiple platform implementations.

3. **Design Token Extraction** — The `get_variable_defs` tool pulls variables (colors, spacing, typography, radii) directly from your Figma file, so generated code can reference real tokens instead of hardcoded values.

4. **Code Connect Integration** — You can link Figma components to your actual codebase components. When the AI generates code, it reuses your existing components rather than creating duplicates.

5. **Write Back to Figma** — The `use_figma` tool (beta, currently free) lets agents create and modify native Figma content directly — frames, components, variables, auto layout — from your coding agent.

6. **Design System Search** — The `search_design_system` tool searches connected design libraries for components, variables, and styles, ensuring agents reuse existing design system elements.

7. **Screenshot Reference** — The `get_screenshot` tool captures visual references to verify layout fidelity alongside the structured data.

8. **Rate Limits** — Users with Dev or Full seats on Professional/Organization/Enterprise plans get per-minute rate limits (Tier 1 REST API limits). Free/Starter plans are limited to 6 tool calls/month.

### Available MCP Tools

| Tool | Purpose |
|------|---------|
| `get_design_context` | Structured representation of a Figma selection (layout, styles, components) |
| `get_variable_defs` | Extract design tokens (colors, spacing, typography) |
| `get_code_connect_map` | Map Figma nodes to code components |
| `add_code_connect_map` | Create new Figma-to-code mappings |
| `get_code_connect_suggestions` | Auto-detect possible Code Connect mappings |
| `get_screenshot` | Visual reference of a selection |
| `get_metadata` | Lightweight XML layout overview (for large designs) |
| `search_design_system` | Search connected design libraries |
| `create_design_system_rules` | Generate agent rules aligned to your design system |
| `create_new_file` | Create new Figma files from the agent |
| `use_figma` | General-purpose write tool (create/edit/delete objects) |
| `generate_figma_design` | Convert web pages into Figma designs |
| `generate_diagram` | Create FigJam diagrams from Mermaid syntax |

### Figma MCP vs. Community Alternatives

| Feature | Figma Official MCP | Framelink (GLips/Figma-Context-MCP) |
|---------|-------------------|--------------------------------------|
| Stars | Official product | ~14K GitHub stars |
| Server type | Remote (hosted by Figma) | Local (npx, needs API key) |
| Auth | OAuth via browser | Personal access token |
| Write to Figma | ✅ (beta) | ❌ Read-only |
| Code Connect | ✅ Native | ❌ |
| Design system search | ✅ | ❌ |
| Rate limits | Plan-based | API key limits |
| Best for | Full design-to-code workflow | Quick reads, simpler setup |

**Recommendation**: Use the **official Figma MCP server** for this project — it has the richest feature set, especially write-back and Code Connect.

---

## What You Need to Set Up

### 1. Figma Account & Plan

- **Minimum**: Figma Professional plan with a **Dev or Full seat** (for reasonable rate limits)
- Free/Starter plans only get 6 MCP tool calls/month — not viable for real work
- Ensure your Figma file uses **components, auto layout, and variables** for best results

### 2. Claude Code with Figma MCP Plugin

**Recommended method (plugin)**:
```bash
claude plugin install figma@claude-plugins-official
```

This installs the MCP server config + Agent Skills for common workflows.

**Manual method**:
```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
```

**Verify**:
```bash
claude mcp list
```

### 3. Project Structure (Multi-Platform Monorepo)

```
manning/
├── figma/                    # Figma links, design tokens, rules
│   ├── DESIGN_LINKS.md       # Figma file/frame URLs for each screen
│   └── tokens/               # Exported design tokens (optional)
├── web/                      # Web app (React/Next.js, Vue, etc.)
│   ├── src/
│   │   ├── components/ui/    # Shared UI components
│   │   └── pages/            # Page implementations
│   └── package.json
├── android/                  # Android app (Jetpack Compose)
│   ├── app/src/main/
│   │   ├── java/.../ui/      # Compose UI components
│   │   └── res/              # Resources
│   └── build.gradle.kts
├── ios/                      # iOS app (SwiftUI)
│   ├── App/
│   │   ├── Views/            # SwiftUI views
│   │   └── Components/       # Reusable components
│   └── Package.swift or .xcodeproj
├── shared/                   # Shared design tokens / constants
│   └── tokens.json           # Design tokens in platform-neutral format
├── .claude/
│   └── INSTRUCTIONS.md       # Claude Code project rules (Figma MCP rules)
└── README.md
```

### 4. Claude Code Project Rules (`.claude/INSTRUCTIONS.md`)

Create a rules file so agents consistently handle Figma data:

```markdown
# Figma MCP Integration Rules

## Required flow for every Figma-driven change
1. Run `get_design_context` first for the exact node(s)
2. If response is too large, use `get_metadata` first, then re-fetch specific nodes
3. Run `get_screenshot` for visual reference
4. Only after both, download assets and start implementation
5. Translate output into this project's conventions and framework
6. Validate against Figma for 1:1 visual parity

## Figma MCP server rules
- If Figma MCP returns a localhost source for an image/SVG, use it directly
- DO NOT import/add new icon packages — all assets come from the Figma payload
- DO NOT create placeholders if a localhost source is provided

## Implementation rules
- Reuse existing components instead of duplicating
- Use design tokens from Figma (via get_variable_defs) — no hardcoded values
- Follow WCAG accessibility requirements
- Platform-specific conventions:
  - Web: React + Tailwind (or your chosen framework)
  - Android: Jetpack Compose + Material 3
  - iOS: SwiftUI + SF Symbols
```

### 5. Design System Setup in Figma

For best agent output:
- **Use components** for all reusable elements (buttons, cards, inputs)
- **Use variables** for colors, spacing, radius, typography
- **Name layers semantically** (`CardContainer`, not `Group 5`)
- **Use auto layout** everywhere for responsive intent
- **Set up Code Connect** to link Figma components → your code components
- **Add annotations/dev resources** for behavior that isn't visible

### 6. Platform-Specific Scaffolding

| Platform | Framework | Init Command |
|----------|-----------|-------------|
| Web | Next.js + React + Tailwind | `npx create-next-app@latest web --typescript --tailwind` |
| Android | Jetpack Compose | Android Studio → New Compose Project |
| iOS | SwiftUI | Xcode → New SwiftUI App |

---

## Workflow: Design → Build with Agents

### Step 1: Design in Figma
Create your app screens using components, auto layout, and variables. Structure your file with one page per major flow.

### Step 2: Copy Frame Links
Right-click a frame in Figma → "Copy link to selection". You'll use these links when prompting the agent.

### Step 3: Generate Web Implementation
```
Implement the design at [Figma frame URL] using React + Tailwind.
Use components from src/components/ui. Follow our project rules.
```

### Step 4: Generate Android Implementation
```
Implement the design at [Figma frame URL] as Jetpack Compose with Material 3.
Use components from app/src/main/.../ui/components/.
```

### Step 5: Generate iOS Implementation
```
Implement the design at [Figma frame URL] as SwiftUI views.
Use components from App/Components/. Follow iOS HIG conventions.
```

### Step 6: Extract & Share Design Tokens
```
Get the variables used in [Figma frame URL] and save them as a
shared tokens.json that can be consumed by all three platforms.
```

### Step 7: Iterate
Use Code Connect to map generated components back to Figma, then iterate on both design and code with the agent maintaining sync.

---

## Todos

1. **figma-account-setup** — Ensure Figma Professional plan with Dev/Full seat; create/organize the design file with proper components, auto layout, and variables
2. **claude-mcp-setup** — Install Figma MCP plugin in Claude Code; verify connection with `claude mcp list`
3. **project-scaffold** — Initialize the monorepo structure with web (Next.js), android (Compose), and ios (SwiftUI) projects
4. **agent-rules** — Create `.claude/INSTRUCTIONS.md` with Figma MCP rules and platform conventions
5. **design-tokens** — Extract design tokens from Figma and set up shared token pipeline for all platforms
6. **code-connect** — Set up Code Connect mappings between Figma components and code components
7. **web-implementation** — Generate web app from Figma designs using agent
8. **android-implementation** — Generate Android app from Figma designs using agent
9. **ios-implementation** — Generate iOS app from Figma designs using agent

## Notes & Considerations

- **Rate limits matter**: On Professional plans, you get per-minute rate limits. Break large designs into smaller frame selections to stay efficient.
- **Write-to-canvas is beta**: The `use_figma` tool is currently free but will become a paid usage-based feature.
- **Code Connect is the secret weapon**: Without it, the model guesses which components to use. With it, generated code directly references your actual codebase components.
- **Prompt specificity**: Always specify the target framework in your prompt. The default output is React + Tailwind — you must explicitly ask for SwiftUI or Jetpack Compose.
- **Framelink as fallback**: If you hit rate limits or want simpler local setup, the community Framelink MCP (14K stars) is an excellent read-only alternative that uses a personal access token instead of OAuth.
