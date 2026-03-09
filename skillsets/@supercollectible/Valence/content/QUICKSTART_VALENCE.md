# Customization Guide

After copying Valence to your project, populate the templates for your stack.

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

## 1. CLAUDE.md — Project Identity

The installed `CLAUDE.md` is a template with empty sections. Fill in each one for your project.

### Sections to Populate

| Section | What to Fill In |
|---------|-----------------|
| **1. Identity & Constraints** | Your product vision, hard constraints (3-7 immutable rules), architecture overview table, data flow diagram |
| **2. Navigation and Toolkit** | Documentation map (paths to your style guides, module docs), module index table |
| **3. Code Patterns** | Project directory tree, module structure rules, key frontend/backend pattern summaries |
| **4. Testing and Logging** | Your test commands (e.g., `npm test`, `pytest`), logging conventions |
| **5. Schema & Protocol** | API contracts, data models, config schemas relevant to your project |
| **6. Deployment** | CI/CD pipeline, deploy commands, environment/secrets management |
| **7. Security Considerations** | Auth approach, input validation, sanitization, session management |
| **8. Performance & Optimization** | Caching strategy, build optimizations, runtime performance rules |
| **9. Lessons Learned** | Start empty — add entries as patterns emerge during development |

---

## 2. Frontend Style Guide

**File**: `.claude/resources/frontend_styleguide.md`

This guide is the source of truth for `/qf` audits and `/build` agents. Fill in adapt and and populate as per stack.

### Sections to Populate

| Section | What to Fill In |
|---------|-----------------|
| **Design System** | Typography (fonts, sizes), color palette (tokens), component aesthetics (radius, shadows, spacing) |
| **Framework Configuration** | Your framework config (e.g., `tailwind.config.js`, `vite.config.ts`, theme tokens) |
| **Layout Pattern** | Shell structure: sidebar, header, content area, responsive behavior |
| **Page Patterns** | Static page template, dynamic page template, data loading approach |
| **Component Patterns** | Interactive component conventions, static component conventions, component inventory table |
| **API Integration** | How frontend calls backend: fetch patterns, auth headers, error handling |
| **State Management** | Your approach: local state only, Zustand, Redux, Context, server state |
| **Global CSS** | Base styles, CSS layers, custom utilities |
| **Type Definitions** | Shared TypeScript types |
| **Build Configuration** | Framework + bundler + adapter config |
| **File Naming** | Naming conventions for components, pages, hooks, utils, tests |
| **Folder Structure** | Your `src/` tree |
| **Testing Pattern** | Framework (Vitest/Jest), patterns, shared helpers |
| **Prerender / Routing** | Which pages are static vs dynamic and why |
| **Performance Checklist** | Your frontend performance rules |
| **Accessibility Checklist** | Your accessibility standards |
| **Code Review Checklist** | Frontend-specific review criteria |

---

## 3. Backend Style Guide

**File**: `.claude/resources/backend_styleguide.md`

This guide is the source of truth for `/qb` audits and `/build` agents. Fill in adapt and populate as per you stack.

### Sections to Populate

| Section | What to Fill In |
|---------|-----------------|
| **Configuration Pattern** | How config is loaded (env vars, settings classes), secrets management |
| **API / Route Pattern** | API style (REST/GraphQL/WebSocket), standard request flow |
| **Error Handling Pattern** | Error hierarchy, retry strategies, error response format |
| **Type Hints / Type Safety** | Type annotation requirements, strictness level, tooling |
| **Dependency Injection** | Your DI approach, what's singleton vs injected |
| **Logging** | Logging framework, structured format, log levels |
| **Data Access Patterns** | Database/cache/API patterns, connection management |
| **Authentication & Authorization** | Session management, token handling, permission model |
| **Rate Limiting** | Strategy, tiers, storage |
| **Input Validation** | Where and how input is validated |
| **Security Patterns** | Sanitization, CSRF, injection prevention |
| **File Structure** | Backend source tree |
| **Testing Pattern** | Framework, fixtures, mocking, coverage targets |
| **Pre-Check Commands** | Your type check, lint, and dead code commands |
| **Code Review Checklist** | Backend-specific review criteria |

---

## 4. QA Agents

**Files**: `.claude/agents/qa-f.md`, `.claude/agents/qa-b.md`

The QA agents ship with generic audit checks. Customize to match your project's needs and directory structure.

### qa-f.md (Frontend)

Update the "Scope" section with your frontend paths:
```
Your territory:
- src/components/      ← your components directory
- src/layouts/         ← your layouts directory
- src/pages/*.astro    ← your page files
- src/styles/          ← your styles directory
- src/types/           ← your type definitions
```

### qa-b.md (Backend)

Update the "Scope" section with your backend paths:
```
Your territory:
- src/routes/          ← your API routes
- src/lib/             ← your library modules
- src/server.ts        ← your entry point
```

---

## 5. Build Agent

**File**: `.claude/agents/build.md`

The build agent references both style guides. No changes needed unless you want to customize:
- Test commands in the "Test Environment" section
- Cleanup checks in the "Cleanup Gating" section

---

## 6. Documentation Templates

**Files**: `.claude/resources/ARC_doc_template.md`, `README_module_template.md`, `file_doc_template.md`

These structure the documentation that `/qd` validates. Customize if your doc structure differs from the defaults.

---

## 7. Multi-Model Infrastructure

Required for adversarial review (`/ar`) and pattern matching (`/pmatch`). Valence_ext is a standalone Node.js agent runner — no Docker required.

```bash
cd Valence_ext && npm install
cp .env.example .env
# Add your API keys:
# - KIMI_API_KEY
# - OPENROUTER_API_KEY
# - CONTEXT7_API_KEY
source .env
```

---

## 8. Environment Setup

### Context7 MCP Server

Valence uses Context7 for live library documentation lookups during `/design` and `/ar` phases.

```bash
claude mcp add --scope user context7 -- npx -y @upstash/context7-mcp
claude mcp list  # verify
```

### Install tmux

Multi-agent skills (`/ar`, `/build`, `/pmatch`) spawn teammates in tmux panes.

```bash
# macOS
brew install tmux

# Ubuntu/Debian
sudo apt-get install tmux

# Fedora/RHEL/Arch
sudo dnf install tmux   # or: sudo pacman -S tmux
```

### Enable Agent Teams

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

**Restart Claude Code** to pick up the new environment.

### Verify

```bash
cd /path/to/your-project
claude

# Test the workflow
/arm I want to add a simple feature
```
