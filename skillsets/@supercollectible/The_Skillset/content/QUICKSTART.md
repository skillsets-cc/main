# Customization Guide

After installing via `npx skillsets install @supercollectible/The_Skillset`, customize the workflow for your project.

---

## What Was Installed

```
your-project/
├── .claude/
│   ├── skills/           # Workflow skills (/arm, /design, /build, etc.)
│   ├── agents/           # Sub-agent definitions (ar-*, pm-*, qa-*, build)
│   └── resources/        # Style guides & templates
├── CLAUDE.md             # Project config ← START HERE
└── docker/litellm/       # Multi-model proxy (optional)
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

Required only for adversarial review (`/ar`) and pattern matching (`/pmatch`).

```bash
cd docker/litellm
cp .env.example .env
# Add your API keys:
# - KIMI_API_KEY
# - DEEPSEEK_API_KEY
docker-compose up -d
```

### External Agents

Located in `.claude/agents/`. These run via LiteLLM proxy.

| File | Model | Used By |
|------|-------|---------|
| `ar-k.md` | Kimi | `/ar` |
| `ar-d.md` | Deepseek | `/ar` |
| `pm-k.md` | Kimi | `/pmatch` |

**What you can customize:**

1. **Swap models** — Edit `docker/litellm/config.yaml` and `.env`:
   ```yaml
   # config.yaml
   - model_name: kimi-review
     litellm_params:
       model: your-preferred-model  # Any LiteLLM-supported model
       api_key: os.environ/YOUR_API_KEY
   ```
   ```bash
   # .env
   YOUR_API_KEY=sk-...
   ```

2. **Change endpoint** — If running LiteLLM elsewhere, update agent frontmatter:
   ```yaml
   endpoint: http://your-host:4000/chat/completions
   ```

---

