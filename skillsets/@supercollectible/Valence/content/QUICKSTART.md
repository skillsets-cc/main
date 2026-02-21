# Customization Guide

After installing via `npx skillsets install @supercollectible/Valence`, customize the workflow for your project.

---

## What Was Installed

```
your-project/
├── .claude/
│   ├── skills/           # Workflow skills (/arm, /design, /build, etc.)
│   ├── agents/           # Sub-agent definitions (ar-*, pm-*, qa-*, build)
│   └── resources/        # Style guides & templates
├── CLAUDE.md             # Project config ← START HERE
└── Valence_ext/          # External agent runner (optional, for /ar and /pmatch)
```

---

## CLAUDE.md

The installed `CLAUDE.md` is a template. Replace the placeholder content with your project's specifics.

### Sections to Customize

| Section | What to Change |
|---------|----------------|
| **Identity & Constraints** | Your project vision, hard constraints, architecture overview |
| **Documentation Map** | Paths to your architecture docs, module docs, style guides |
| **Code Patterns** | Your module structure, frontend/backend patterns |
| **Lessons Learned** | Start empty, add entries as patterns emerge |

### Identity & Constraints Template

```markdown
## Identity & Constraints

**What we're building**: [One paragraph - your product vision]

### Design Philosophy
- Keep or modify the defaults (First Principles, Spec-Driven, Atomic Tasks, etc.)

### Hard Constraints (never violate)
- [ ] Define 3-5 immutable rules for your project
- [ ] Examples: data residency, auth requirements, no-PII, etc.

### Architecture Overview
| Layer | Implementation |
|-------|----------------|
| **Backend** | [Your stack] |
| **Frontend** | [Your stack] |
| **State** | [Your approach] |
| **External** | [APIs, services] |
```

---

## Style Guides

Located in `.claude/resources/`. These encode your coding standards so agents follow them.

| File | Customize For |
|------|---------------|
| `frontend_styleguide.md` | Component patterns, state management, styling approach, test conventions |
| `backend_styleguide.md` | API patterns, DI approach, error handling, logging conventions |

### What to Define

**Frontend:**
- Component structure (hooks, props, state)
- State management (Zustand, Redux, Context)
- Styling (CSS-in-JS, Tailwind, CSS Modules)
- Test patterns (Vitest, Jest, RTL)

**Backend:**
- API patterns (REST, GraphQL, WebSocket)
- Dependency injection approach
- Error handling and logging
- Test patterns (pytest fixtures, mocking)

---

## Agents

Located in `.claude/agents/`. Customize for your stack.

| File | Customize For |
|------|---------------|
| `qa-f.md` | Frontend audit: your design system, component patterns, accessibility rules, etc |
| `qa-b.md` | Backend audit: your DI patterns, logging format, error handling conventions, etc |
| `qa-docs.md` | Documentation audit: your doc structure, ARC/README templates |
| `build.md` | Build workflow: test commands, environment setup, cleanup checks |

### build.md Checklist

- [ ] Update test environment commands for your stack
- [ ] Set style guide references to your guides
- [ ] Customize cleanup checks (linting, type checking)
- [ ] Update success metrics for your project

---

## Documentation Templates

Located in `.claude/resources/`. Structure for generated docs.

| Template | Customize If... |
|----------|-----------------|
| `ARC_doc_template.md` | Your module architecture docs differ |
| `README_module_template.md` | Your README structure differs |
| `file_doc_template.md` | Your per-file docs need different sections |
| `claude-execution-template.md` | Your execution plans need different structure |

---

## Multi-Model Infrastructure

Required only for adversarial review (`/ar`) and pattern matching (`/pmatch`). Valence_ext is a standalone Node.js agent runner — no Docker required.

```bash
cd Valence_ext && npm install
cp .env.example .env
# Add your API keys:
# - KIMI_API_KEY
# - OPENROUTER_API_KEY
source .env
```

### External Agents

Located in `.claude/agents/`. These run via the Valence_ext external agent runner.

| File | Model | Used By |
|------|-------|---------|
| `ar-k.md` | Kimi | `/ar` |
| `ar-glm5.md` | GLM-5 (via OpenRouter) | `/ar` |
| `pm-k.md` | Kimi | `/pmatch` |

**What you can customize:**

1. **Swap models** — Edit `Valence_ext/external-agents.json`:
   ```json
   {
     "kimi-review": {
       "provider": "openai-compat",
       "baseURL": "https://your-provider.com/v1",
       "model": "your-model",
       "apiKeyEnv": "YOUR_API_KEY",
       "mcpServers": ["filesystem", "context7"]
     }
   }
   ```

2. **Add a new provider** — Create `Valence_ext/providers/<name>.mjs` exporting the 5 normalization functions, register in `providers/index.mjs`

---

## Environment Setup

These steps configure your Claude Code session for Valence. Do these last — the final step requires a restart.

### 1. Context7 MCP Server

Valence uses Context7 for live library documentation lookups during `/design` and `/ar` phases. Add it to your Claude Code session:

```bash
claude mcp add --scope user context7 -- npx -y @upstash/context7-mcp
```

Verify it's registered:

```bash
claude mcp list
```

### 2. Install tmux

Multi-agent skills (`/ar`, `/build`, `/pmatch`) spawn teammates in tmux panes.

```bash
# macOS
brew install tmux

# Ubuntu/Debian
sudo apt-get install tmux

# Fedora/RHEL/Arch
sudo dnf install tmux   # or: sudo pacman -S tmux
```

### 3. Enable Agent Teams

Add to your shell profile (`.bashrc`, `.zshrc`, etc.):

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

Or set it in `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

**Restart Claude Code** to pick up the new environment. When a skill spawns teammates, each gets its own tmux pane with its own permission prompt.

---
