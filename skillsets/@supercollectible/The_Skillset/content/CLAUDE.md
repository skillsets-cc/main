# Claude Development Protocol - SuperCollectible.dev

## 1. Identity & Constraints

**What we're building**: A narrative physics engine that transforms stories into immersive interfaces where voice, graphics, video, and generative UI are seamlessly choreographed around user intent.

**Your role**: You operate in a grounded multi-agent workflow with strict quality gates and formalized protocols and handoffs.

### Design Philosophy
- **First Principles**: Understand the system before you reach for abstractions. Know what the framework hides; know what the library costs. Custom solutions beat cargo-culted patterns. If you need a hack, your model is wrong—fix the design. Actively seek what could break it.
- **Spec-Driven**: Design precedes code. No implementation without a validated plan.
- **Test-Driven**: Tests are written *with* the code, not after. Red → Green → Refactor.
- **Atomic Tasks**: Work is broken into small, verifiable units. 10-15 tasks per feature.
- **Human-Agent Co-Citizenship**: Humans and agents are co-equal consumers of the same system, each with bespoke interfaces.

### Hard Constraints (never violate)
- **Ephemeral Sessions**: Redis-backed, 30-min TTL, no persistent storage
- **Unified Streaming**: Single pipeline for all inputs (STT→LLM→TTS), no dual-path
- **Headless Core + Adapters**: Business logic in framework-agnostic `HeadlessCore`, UI in React view layer
- **Circuit Breakers**: External APIs wrapped with failure isolation and fallback
- **Forward-first**: No backward compatibility unless explicitly instructed

### Architecture Overview
| Layer | Implementation |
|-------|----------------|
| **Backend** | FastAPI streaming server with unified pipeline (STT→LLM→TTS) |
| **Frontend** | HeadlessCore engine + React view + Three.js scene |
| **State** | Redis-backed sessions, WebSocket bidirectional sync |
| **Intelligence** | Claude LLM with MCP tools, hybrid RAG (FAISS + BM25) |

---

## 2. Navigation and Toolkit

### Documentation Map
| Area | Entry Point |
|------|-------------|
| **Architecture** | [ARCHITECTURE_backend.md](DOCS/ARCHITECTURE_backend.md), [ARCHITECTURE_frontend.md](DOCS/ARCHITECTURE_frontend.md) |
| **Module Docs** | Backend: `README_*.md` (main) + `docs_*/ARC_*.md` (supplementary)<br>Frontend: `docs_*/ARC_*.md` within each module |
| **Per-File Docs** | Individual file docs in `docs_*/` (e.g., `streaming_pipeline.md`, `ChatWidget.md`) |
| **Style Guides** | [Frontend](TheSkillset/resources/frontend_styleguide.md), [Backend](TheSkillset/resources/backend_styleguide.md) |
| **Protocols** | `TheSkillset/` — skills, agents, resources |
| **Deployment** | [DEPLOY_AND_AUTH.md](DOCS/DEPLOY_AND_AUTH.md) |

### Exploration Pattern
1. Start with ARCHITECTURE files for system overview
2. Drill into module ARC files for component details
3. Reference style guides for implementation patterns
4. Dont parse code if you can read docs

### Plugins
LSP plugins (`pyright`, `vtsls`) enable precise code navigation. Requires `export ENABLE_LSP_TOOL=1`.

| Use Case | Operation | Benefit |
|----------|-----------|---------|
| Find where function is defined | `goToDefinition` | Jump directly instead of grep |
| Check if code is used anywhere | `findReferences` | Confident dead code detection |
| Get type info without reading file | `hover` | Quick context, fewer tokens |
| Map file structure | `documentSymbol` | Understand module at a glance |
| Search across codebase | `workspaceSymbol` | Find by name, not pattern |
| Check for errors before running | `getDiagnostics` | Catch issues early |

### Domain Skills
Knowledge modules loaded on demand. Add to `.claude/skills/` as needed—ensure patterns don't conflict with style guides.

| Skill | Triggers |
|-------|----------|
| *Add project-specific skills* | *Your domain keywords* |

**Full workflow docs**: [README.md](README.md) in The Skillset repo

---

## 3. Code Patterns

### Module Structure
| Rule | Requirement |
|------|-------------|
| **Single Responsibility** | Each module has one clear purpose |
| **Services** | Independent, reusable; no cross-service imports |
| **Managers** | Coordinate services but don't implement business logic |
| **Features** | Self-contained with own tests and docs |
| **Core** | Framework-agnostic; no React/FastAPI imports in core logic |

**Dependency Direction**: `Features → Core → Services → External APIs` (with Shared/Managers/Security as cross-cutting)


### Frontend Patterns
| Pattern | Requirement |
|---------|-------------|
| **Constants Extraction** | No magic numbers—extract to `*Constants.ts` in each module (e.g., `chatConstants.ts`, `layoutConstants.ts`) |
| **Theme Tokens** | Use `colors.*`, `spacing.*`, `zIndex.*` from `view/theme/tokens.ts`—never hardcode |
| **Logger, not console** | Use `logger` from `@core/utils/logger` with `[ModuleName]` prefix |
| **Tests Alongside** | Write tests with implementation, not after; tests live in `tests_*/` subdirectory |
| **Resource Cleanup** | Clean up event listeners, timers, RAF, subscriptions in useEffect cleanup; use `isUnmountingRef` guard |
| **Barrel Exports** | Each module has `index.ts` exporting public API; internal files not exposed |
| **ARC Documentation** | Each module has `docs_*/ARC_*.md` documenting purpose, patterns, and dependencies |
| **Minimal Comments** | LSP provides types/signatures; comment only *why*, never *what*. Architecture in `docs_*/ARC_*.md` |

**Shared State**:
- **Zustand Store**: Mirrors `CoreState` via `useCoreSync`; view-only state (drawers, panels) managed separately
- **Shared Navigation**: Navigation state is read/write from both user (keyboard/wheel/text) and agent (backend tools)
- **Immer Middleware**: Mutable-style updates with immutable semantics

### Backend Patterns
| Pattern | Requirement |
|---------|-------------|
| **Dependency Injection** | All services injected via FastAPI `Depends`; no global state; all dependencies explicit in function signatures |
| **Circuit Breaker** | External APIs (LLM, TTS, STT) wrapped with `circuit_breaker.py`—CLOSED/OPEN/HALF_OPEN states for resilience |
| **Layered Intelligence** | Three-tier context: (1) summary ~500 tokens, (2) structured JSON data via tools, (3) RAG only for deep search |
| **BaseServiceManager** | Heavy resources (ML models, Redis) use lazy-initialized singletons via `BaseServiceManager` pattern |
| **Constants Organization** | Extract to `config/constants.py` organized by domain (WebSocket, Audio, VAD, Session) |
| **Logger with Context** | Use `logging.getLogger(__name__)` with `extra={"session_id": sid}` for structured logging |
| **Tests Alongside** | Tests in `tests_*/` subdirectory or `tests/` folder; use pytest fixtures in `conftest.py` for mocks |
| **ARC Documentation** | Each module has `docs_*/ARC_*.md` or `README_*.md` documenting purpose and patterns |

**Resilience**:
- **TTS Fallback**: ElevenLabs → MiniMax with circuit breaker integration and character tracking
- **Barge-In Coordination**: Client VAD → server cancel → immediate STT restart → context preserved
- **Rate Limiting**: IP-based limits with Redis-backed counters and fail-open on infrastructure errors

---
## Testing and Logging

### Test Environment
```bash
# Backend: .venv MUST be active
cd backend && source .venv/bin/activate && pytest

# Frontend
cd frontend && npm test
```

### Logging Examples
```typescript
// Frontend - use logger, not console
import { logger } from '@core/utils/logger';
logger.debug('[Module] action:', data);
```

```python
# Backend
import logging
logger = logging.getLogger(__name__)
logger.info("Action", extra={"session_id": sid})
```

---

### Design Decisions
**Update [ARD.md](ARD.md) when making significant architecture decisions.**

---

## 4. Lessons Learned

*Living section - add entries as patterns emerge or issues are resolved.*

