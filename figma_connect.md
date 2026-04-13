# Figma MCP Connection Guide

A comprehensive step-by-step guide for connecting Figma to your AI coding agent via the Model Context Protocol (MCP).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Figma Account Setup](#figma-account-setup)
3. [Create a Figma API Token](#create-a-figma-api-token)
4. [Connect the Official Figma MCP Server](#connect-the-official-figma-mcp-server)
5. [Alternative: Framelink Community MCP](#alternative-framelink-community-mcp)
6. [Verify Your Connection](#verify-your-connection)
7. [Authentication & OAuth Flow](#authentication--oauth-flow)
8. [Preparing Your Figma File for MCP](#preparing-your-figma-file-for-mcp)
9. [Using the MCP Tools](#using-the-mcp-tools)
10. [Setting Up Code Connect](#setting-up-code-connect)
11. [Rate Limits & Pricing](#rate-limits--pricing)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Requirement | Details |
|-------------|---------|
| **Figma account** | Professional, Organization, or Enterprise plan recommended |
| **Figma seat type** | Dev or Full seat (for reasonable rate limits) |
| **AI coding agent** | Claude Code, Claude Desktop, Cursor, VS Code Copilot, or any MCP-compatible client |
| **Node.js** | v18+ (only needed for Framelink alternative) |

---

## Figma Account Setup

### Check your current plan and seat

1. Go to [figma.com](https://figma.com) → click your avatar (top-right) → **Settings**
2. Under **Plan**, check which plan you're on
3. Under your team/org, check your **seat type**

### Recommended: Dev or Full seat on Professional+

| Plan | Seat | MCP Rate Limit |
|------|------|----------------|
| Starter / Free | Any | **6 tool calls per month** (not viable) |
| Professional | View or Collab | **6 tool calls per month** |
| Professional | **Dev or Full** | **Per-minute** (Tier 1 REST API limits) |
| Organization | **Dev or Full** | **Per-minute** (Tier 1 REST API limits) |
| Enterprise | **Dev or Full** | **Per-minute** (Tier 1 REST API limits) |

> **Important**: If you're on a Starter plan or have a View/Collab seat, you'll hit the 6-call/month limit almost immediately. Upgrade before starting.

---

## Create a Figma API Token

A personal access token is needed for the **Framelink** alternative. The official Figma MCP server uses OAuth instead, but having a token is useful for testing.

1. Go to [figma.com](https://figma.com) → **Settings** → **Personal access tokens**
2. Click **Generate new token**
3. Give it a descriptive name (e.g., `mcp-dev`)
4. Set the expiration (90 days recommended for development)
5. Set scopes:
   - **File content**: Read-only (minimum)
   - **File content**: Read and write (if you want write-back features)
   - **Dev resources**: Read and write (for Code Connect)
6. Click **Generate token**
7. **Copy the token immediately** — you won't be able to see it again

Store it securely:
```bash
# Option 1: Environment variable (add to ~/.zshrc or ~/.bashrc)
export FIGMA_API_KEY="figd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Option 2: .env file in your project (already in .gitignore)
echo "FIGMA_API_KEY=figd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" >> .env
```

---

## Connect the Official Figma MCP Server

The official Figma MCP server is a **remote server** hosted by Figma at `https://mcp.figma.com/mcp`. It uses OAuth for authentication (your browser opens automatically on first use).

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "figma": {
      "url": "https://mcp.figma.com/mcp"
    }
  }
}
```

Then **restart Claude Desktop**.

### Claude Code (CLI)

**Recommended — install the plugin:**
```bash
claude plugin install figma@claude-plugins-official
```

This installs MCP config + Agent Skills automatically.

**Manual method:**
```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
```

**Verify:**
```bash
claude mcp list
```

### VS Code (GitHub Copilot Chat)

1. Press `⌘ Shift P` → search `MCP: Add Server`
2. Select `HTTP`
3. Paste: `https://mcp.figma.com/mcp`
4. Enter server ID: `figma`
5. Choose global or workspace scope

This creates/updates `.vscode/mcp.json`:
```json
{
  "servers": {
    "figma": {
      "type": "http",
      "url": "https://mcp.figma.com/mcp"
    }
  }
}
```

6. Open chat (`⌥⌘B` or `⌃⌘I`) → switch to **Agent** mode
7. Type `#get_design_context` to verify tools are available

### Cursor

**Recommended — install the plugin:**
```
/add-plugin figma
```
Type this in Cursor's agent chat. It installs MCP config + skills + rules.

**Manual method:**
Open **Cursor → Settings → Cursor Settings → MCP tab → + Add new global MCP server**, then enter:

```json
{
  "mcpServers": {
    "figma": {
      "url": "https://mcp.figma.com/mcp"
    }
  }
}
```

### Windsurf / Other Editors

Any editor supporting **Streamable HTTP** MCP transport can connect:

```json
{
  "mcpServers": {
    "figma": {
      "url": "https://mcp.figma.com/mcp"
    }
  }
}
```

Check your editor's documentation for where to place MCP configuration.

---

## Alternative: Framelink Community MCP

[Framelink](https://github.com/GLips/Figma-Context-MCP) (14K+ GitHub stars) is a community-built MCP server. It runs **locally** via npx and uses a personal access token instead of OAuth.

### When to use Framelink instead

- You want a simpler local setup
- You're hitting rate limits on the official server
- You don't need write-back or Code Connect features
- You prefer token-based auth over OAuth

### Setup

```json
{
  "mcpServers": {
    "framelink-figma": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp", "--figma-api-key=YOUR_TOKEN", "--stdio"]
    }
  }
}
```

Replace `YOUR_TOKEN` with your Figma personal access token.

### Comparison

| Feature | Official Figma MCP | Framelink |
|---------|-------------------|-----------|
| Hosting | Remote (Figma servers) | Local (npx) |
| Auth | OAuth (browser) | Personal access token |
| Write to Figma | ✅ | ❌ |
| Code Connect | ✅ | ❌ |
| Design system search | ✅ | ❌ |
| Simplifies API response | Partially | ✅ (optimized for less context) |
| Works offline | ❌ | ❌ (still calls Figma API) |

---

## Verify Your Connection

### Quick test (any client)

1. Open your AI agent's chat
2. Open a Figma file in your browser
3. Select a frame → right-click → **Copy link to selection**
4. Prompt the agent:
   ```
   Get the design context for this Figma frame: [PASTE LINK]
   ```
5. The agent should call `get_design_context` and return structured layout data

### Claude Desktop verification

After restarting Claude Desktop:
1. Start a new conversation
2. Look for the MCP tools icon (🔌) in the input area
3. Click it to confirm "figma" server is listed
4. Ask: "Use the Figma MCP to check who I am" (triggers `whoami`)

### Claude Code verification

```bash
claude mcp list
# Should show: figma - https://mcp.figma.com/mcp
```

---

## Authentication & OAuth Flow

The official Figma MCP server uses **OAuth 2.0**:

1. **First request**: When the agent first calls a Figma MCP tool, your browser opens automatically
2. **Figma login**: Log in to Figma (if not already)
3. **Authorize**: Grant the MCP server access to your Figma account
4. **Redirect**: Browser redirects back, and the token is stored by your MCP client
5. **Subsequent requests**: Authentication is cached — no browser needed

### Token refresh

OAuth tokens expire periodically. If you get auth errors:
- Claude Desktop: Restart the app; it will re-trigger OAuth
- Claude Code: Run `claude mcp remove figma && claude mcp add --transport http figma https://mcp.figma.com/mcp`
- Cursor: Remove and re-add the MCP server in settings

---

## Preparing Your Figma File for MCP

The quality of generated code depends heavily on how your Figma file is structured.

### Must-do checklist

- [ ] **Use components** for all reusable elements (buttons, cards, inputs, nav items)
- [ ] **Use auto layout** on every frame — this communicates responsive intent to the agent
- [ ] **Use variables** for colors, spacing, border-radius, and typography
- [ ] **Name layers semantically** — `CardContainer`, `PrimaryButton`, not `Group 5`, `Rectangle 12`
- [ ] **Resize frames** to test that auto layout behaves correctly before generating code

### Strongly recommended

- [ ] **Use a component library / design system** — the agent can search it with `search_design_system`
- [ ] **Add annotations** for behavior that can't be inferred from visuals (hover states, transitions, validation)
- [ ] **Add dev resources** (links to docs, API endpoints, etc.) as Figma annotations
- [ ] **Structure pages** by flow (Login, Dashboard, Settings) for easy frame selection

### What to avoid

- ❌ Absolute positioning everywhere (use auto layout instead)
- ❌ Unnamed layers (`Group 1`, `Frame 23`)
- ❌ Hardcoded colors instead of variables
- ❌ Giant frames with entire app flows (break into individual screens/components)

---

## Using the MCP Tools

### Core workflow (3 tools)

```
1. get_design_context  → Structured layout + style data
2. get_screenshot      → Visual reference image
3. get_variable_defs   → Design tokens (colors, spacing, typography)
```

### Example prompts by platform

**Web (React + Tailwind):**
```
Implement the design at [FIGMA_LINK] using React + Tailwind.
Use components from web/src/components/ui/.
```

**Android (Jetpack Compose):**
```
Implement the design at [FIGMA_LINK] as Jetpack Compose with Material 3.
Place composables in the ui/components/ package.
```

**iOS (SwiftUI):**
```
Implement the design at [FIGMA_LINK] as SwiftUI views.
Place views in App/Views/ and reusable components in App/Components/.
```

**Extract tokens only:**
```
Get the variables used in [FIGMA_LINK] and output them as a JSON tokens file.
```

### All available tools

| Tool | Read/Write | Description |
|------|-----------|-------------|
| `get_design_context` | Read | Structured layout, styles, and components for a selection |
| `get_screenshot` | Read | Visual screenshot of a frame or selection |
| `get_variable_defs` | Read | Design tokens (colors, spacing, typography, radii) |
| `get_metadata` | Read | Lightweight XML overview (for large files) |
| `get_code_connect_map` | Read | Existing Figma-to-code component mappings |
| `add_code_connect_map` | Write | Create new component mappings |
| `get_code_connect_suggestions` | Read | Auto-detect possible mappings |
| `send_code_connect_mappings` | Write | Confirm suggested mappings |
| `search_design_system` | Read | Search connected design libraries |
| `create_design_system_rules` | Write | Generate agent rules from your design system |
| `create_new_file` | Write | Create new Figma files |
| `use_figma` | Write | General-purpose create/edit/delete in Figma |
| `generate_figma_design` | Write | Convert web pages into Figma designs |
| `generate_diagram` | Write | Create FigJam diagrams from Mermaid syntax |
| `whoami` | Read | Check authenticated user info |

---

## Setting Up Code Connect

Code Connect links Figma components to your actual code components. This is the single most impactful thing you can do for code generation quality.

### Why Code Connect matters

**Without Code Connect:**
```
Agent sees Figma "Button" component → generates a new <button> from scratch
```

**With Code Connect:**
```
Agent sees Figma "Button" component → uses your existing <Button> from src/components/ui/Button.tsx
```

### Setup steps

1. **Install Code Connect CLI** (for React projects):
   ```bash
   npm install -D @figma/code-connect
   ```

2. **Create a figma.config.json** in your project root:
   ```json
   {
     "codeConnect": {
       "parser": "react",
       "include": ["web/src/components/**/*.tsx"],
       "importPaths": {
         "web/src/components/*": "@/components/*"
       }
     }
   }
   ```

3. **Create a Code Connect file** for each component:
   ```tsx
   // web/src/components/ui/Button.figma.tsx
   import figma from "@figma/code-connect";
   import { Button } from "./Button";

   figma.connect(Button, "FIGMA_COMPONENT_URL", {
     props: {
       label: figma.string("Label"),
       variant: figma.enum("Variant", {
         Primary: "primary",
         Secondary: "secondary",
       }),
       disabled: figma.boolean("Disabled"),
     },
     example: (props) => (
       <Button variant={props.variant} disabled={props.disabled}>
         {props.label}
       </Button>
     ),
   });
   ```

4. **Publish your mappings**:
   ```bash
   npx figma connect publish
   ```

5. **Or let the agent do it**: Ask the agent to use `get_code_connect_suggestions` and `send_code_connect_mappings` to auto-detect and create mappings.

### Learn more

- [Figma Code Connect documentation](https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect)
- [Code Connect GitHub repo](https://github.com/figma/code-connect)

---

## Rate Limits & Pricing

### Current limits (as of March 2026)

| Plan & Seat | Read tools limit | Write tools (`use_figma`) |
|-------------|-----------------|--------------------------|
| Starter / View / Collab | 6 calls/month | Not available |
| Professional (Dev/Full) | Per-minute (Tier 1) | Free during beta |
| Organization (Dev/Full) | Per-minute (Tier 1) | Free during beta |
| Enterprise (Dev/Full) | Per-minute (Tier 1) | Free during beta |

### Tips to stay within limits

1. **Break large designs into small selections** — select individual frames, not entire pages
2. **Use `get_metadata` first** for large files — it returns a lightweight overview so you can target specific nodes
3. **Cache results locally** — save `get_design_context` output to a file for repeated reference
4. **Use Framelink as fallback** — if you hit official limits, switch to the community MCP

### Future pricing

Figma has announced that `use_figma` (write-to-canvas) will become a **usage-based paid feature** after the beta period. Read tools are expected to remain within existing API rate limits.

---

## Troubleshooting

### "No MCP tools available"

- **Claude Desktop**: Restart the app after editing `claude_desktop_config.json`
- **VS Code**: Restart VS Code; check `.vscode/mcp.json` syntax
- **Cursor**: Check Settings → MCP tab; ensure server URL is correct

### "Authentication failed" or browser doesn't open

- Check your Figma plan and seat type
- Clear browser cookies for figma.com and try again
- For Claude Code: remove and re-add the server
  ```bash
  claude mcp remove figma
  claude mcp add --transport http figma https://mcp.figma.com/mcp
  ```

### "Rate limit exceeded"

- Check your plan/seat (6 calls/month on Starter/View/Collab)
- Wait for the rate limit window to reset (per-minute on Dev/Full seats)
- Switch to Framelink for additional calls
- Break large selections into smaller frames

### "Response too large" or truncated output

- Select a **smaller frame** (individual component, not entire page)
- Use `get_metadata` first, then `get_design_context` on specific nodes
- Ask the agent to focus on one section at a time

### "Generated code doesn't match the design"

- Check that Figma layers are **named semantically**
- Ensure **auto layout** is used (absolute positioning gives poor results)
- Use **variables** for colors/spacing (not hardcoded values)
- Add a `get_screenshot` call to your prompt for visual reference
- Set up **Code Connect** so the agent uses your actual components

### "MCP server not found" in config

- Official server URL is exactly: `https://mcp.figma.com/mcp`
- Ensure the JSON is valid (no trailing commas, proper quoting)
- Ensure your editor/client supports **Streamable HTTP** transport

### Connection works but output quality is poor

1. Revisit the [Preparing Your Figma File](#preparing-your-figma-file-for-mcp) section
2. Add project-level rules (see `.claude/INSTRUCTIONS.md` in this repo)
3. Be explicit in prompts about framework, file paths, and component reuse
4. Use `create_design_system_rules` to generate rules from your Figma design system
