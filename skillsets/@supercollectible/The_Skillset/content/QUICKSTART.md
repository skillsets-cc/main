# Quick Start

Copy The Skillset's workflow infrastructure to your project, then customize for your stack.

---

## 0. Installation

### Prerequisites
- Node.js 18+
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed (`npm install -g @anthropic-ai/claude-code`)
- Anthropic API key configured

### Copy to Your Project

```bash
# Clone The Skillset
git clone https://github.com/nooqta/The_Skillset.git

# Copy to your project
cp -r The_Skillset/.claude /path/to/your-project/
cp -r The_Skillset/TheSkillset /path/to/your-project/
cp The_Skillset/claude.md.example /path/to/your-project/CLAUDE.md

# Optional: multi-model infrastructure
cp -r The_Skillset/docker /path/to/your-project/
```

### What You Just Copied

```
your-project/
├── .claude/
│   ├── skills/           # Workflow skills (/arm, /design, /build, etc.)
│   │   ├── arm/          # Add domain skills here as needed
│   │   ├── design/
│   │   └── ...
│   └── agents/           # Sub-agent definitions (build, qa-*, ar-*, pm-*)
├── TheSkillset/
│   ├── skills/           # Skill protocols (SKILL_*.md)
│   ├── agents/           # Agent protocols (AGENT_*.md)
│   └── resources/        # Style guides & templates ← CUSTOMIZE
├── CLAUDE.md             # Project config ← CUSTOMIZE
└── docker/litellm/       # Multi-model proxy (optional)
```

---

## 1. CLAUDE.md (Required)

Copy `claude.md.example` to `CLAUDE.md` in your project root. This is always in context and defines how Claude operates.

### Sections to Customize

| Section | What to Change |
|---------|----------------|
| **Identity & Constraints** | Your project vision, hard constraints, architecture overview |
| **Documentation Map** | Paths to your architecture docs, module docs, style guides |
| **Domain Skills** | Keep/remove skills relevant to your stack |
| **Code Patterns** | Your module structure, frontend/backend patterns |
| **Lessons Learned** | Start empty, add entries as patterns emerge |

### Identity & Constraints Checklist

```markdown
## 1. Identity & Constraints

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

## 2. Style Guides (Required)

Located in `TheSkillset/resources/`. These encode your coding standards so agents follow them.

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

## 3. Domain Skills (Optional)

Located in `.claude/skills/`. Knowledge modules loaded on demand. None included by default—add your own as needed.

### To Add a Domain Skill

```
.claude/skills/your-skill/
├── SKILL.md              # Entry point (required)
├── reference1.md         # Supporting docs
└── reference2.md         # Examples, patterns
```

Reference in your CLAUDE.md:
```markdown
| [Your Skill](.claude/skills/your-skill/SKILL.md) | Triggers: keyword1, keyword2 |
```

### Style Guide Conflicts

Domain skills provide context and patterns for specific technologies. If a skill recommends patterns that conflict with your style guides, the **style guide wins**—it defines your project's constraints. Either:
- Modify the skill to align with your style guide
- Don't add the skill if the conflict is fundamental

---

## 4. QA Agents (Recommended)

Located in `TheSkillset/agents/`. Project-specific audit patterns.

| File | Customize For |
|------|---------------|
| `AGENT_qa-f.md` | Frontend audit: your design system, component patterns, accessibility rules |
| `AGENT_qa-b.md` | Backend audit: your DI patterns, logging format, error handling conventions |
| `AGENT_build.md` | Build workflow: test commands, environment setup, cleanup checks |

### AGENT_build.md Checklist

- [ ] Update test environment commands for your stack
- [ ] Set style guide references to your guides
- [ ] Customize cleanup checks (linting, type checking)
- [ ] Update success metrics for your project

---

## 5. Documentation Templates (Optional)

Located in `TheSkillset/resources/`. Structure for generated docs.

| Template | Customize If... |
|----------|-----------------|
| `ARC_doc_template.md` | Your module architecture docs differ |
| `README_module_template.md` | Your README structure differs |
| `file_doc_template.md` | Your per-file docs need different sections |
| `claude-execution-template.md` | Your execution plans need different structure |

---

## 6. Multi-Model Infrastructure (Optional)

Required only for adversarial review (`/ar`) and pattern matching (`/pmatch`).

```bash
cd /path/to/your-project/docker/litellm
cp .env.example .env
# Add your API keys:
# - GEMINI_API_KEY
# - DEEPSEEK_API_KEY
docker-compose up -d
```

Skip if you only need single-model workflow (design → plan → build).

---

## Verification

After setup, test the workflow:

```bash
# Should load your CLAUDE.md context
claude

# Test crystallization
/arm I want to add [simple feature]

# Test design (if /arm works)
/design [output from arm]
```

If agents reference wrong paths or patterns, update your CLAUDE.md and style guides.
