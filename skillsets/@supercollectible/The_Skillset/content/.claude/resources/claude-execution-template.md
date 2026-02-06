# Execution Document Template
# Version 2.0 - Enhanced with Sonnet Feedback

This template is used by Opus during the Phase Planning Protocol to create detailed implementation plans that Sonnet can execute independently without needing clarification.

---

## Implementation Plan: [Feature Name]

### Overview
- **Objective**: [One clear sentence - what we're building and why]
- **Scope**:
  - Includes: [Explicitly list what's being built]
  - Excludes: [Explicitly list what's NOT being built - prevents scope creep]
- **Dependencies**:
  - [List ALL required packages with versions]
  - [Required services (Redis, PostgreSQL, etc.)]
  - [Existing modules this depends on]
- **Estimated Complexity**: [Low/Medium/High] - [Explain why]

### 🔧 Technical Clarifications (IMPORTANT)

#### Test Framework Configuration
```
Backend:  pytest with pytest-asyncio
Frontend: Vitest (Vite-native, faster than Jest)
Structure: Tests colocated with source (same directory)
Coverage: Minimum 80%
```

#### File Locations
```
Style Guides: TheSkillset/resources/frontend_styleguide.md, backend_styleguide.md
Agents:       TheSkillset/agents/AGENT_*.md
Skills:       TheSkillset/skills/SKILL_*.md
```

#### Environment Setup
```bash
# Copy these first:
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Then edit with actual values
```

### Technical Approach

#### Architecture Decisions
| Decision | Rationale | Alternative Considered | Why Rejected |
|----------|-----------|----------------------|--------------|
| [Decision 1] | [Why this approach] | [What else we considered] | [Why not] |
| [Decision 2] | [Why this approach] | [What else we considered] | [Why not] |

#### Module Placement
WebSocket handlers → backend/app/core/websocket_handler.py
State management  → backend/app/managers/[manager].py
Security          → backend/app/security/[security].py
External services → backend/app/services/[service].py
UI components     → frontend/src/features/[feature]/components/
State (Zustand)   → frontend/src/stores/[store].ts

#### Integration Points
- WebSocket message types needed: [List exact types]
- State updates required: [Which stores affected]
- API endpoints: [New endpoints being added]

#### Data Flow
```
Input: [Source] → [Format, size limits]
  ↓
Processing: [Step 1] → [Step 2] → [Step 3]
  ↓
Output: [Destination] → [Format, validation]
```

### 📋 Task Breakdown
(Group tasks under build agent headers for parallel execution)

## Build Agent 1: [Scope/Module Name]

#### Task 1: **[Exact Task Name]** (Module: `backend/app/[exact/path]/`)
- **Description**: [One sentence - what this accomplishes]
- **Acceptance Criteria**:
  - [ ] [Specific measurable outcome - e.g., "Connection limit of 3 per IP enforced"]
  - [ ] [Edge case handled - e.g., "Gracefully handles Redis disconnect"]
  - [ ] [Performance met - e.g., "Response time <50ms"]
  - [ ] [Test written - e.g., "test_connection_limits.py validates all cases"]
- **Files to Create**:
  ```
  backend/app/managers/
  ├── connection_manager.py         # Connection management logic
  ├── test_connection_manager.py    # Tests (SAME DIRECTORY!)
  └── __init__.py                    # Module initialization
  ```
- **Dependencies**: [Task X must be complete] or "None"
- **Configuration Required**:
  ```python
  # Exact configuration or constants
  MAX_CONNECTIONS_PER_IP = 3
  MAX_TOTAL_CONNECTIONS = 500
  CONNECTION_TIMEOUT = 86400  # 24 hours
  ```
- **Code Example**:
  ```python
  # Show the EXACT pattern to follow
  class ConnectionManager:
      def __init__(self):
          self.active_connections: Dict[str, List[WebSocket]] = {}
          self.connection_count = 0
          self.memory_threshold = 0.85

      async def can_accept(self, hashed_ip: str) -> bool:
          # Check all limits
          if self.connection_count >= self.MAX_TOTAL_CONNECTIONS:
              return False
          # ... rest of implementation
  ```
- **Test Cases** (file: `backend/app/managers/tests_managers/test_connection_manager.py`):
  - `test_connection_limit_per_ip`: Connect 3 clients from same IP → 4th rejected with 1008
  - `test_total_connection_limit`: Fill to MAX_TOTAL_CONNECTIONS → next connection rejected
  - `test_memory_threshold_cleanup`: Mock memory at 86% → triggers eviction of oldest connection
  - `test_concurrent_accept`: 10 simultaneous `can_accept()` calls → no race condition, count consistent
  - Setup: pytest-asyncio, mock WebSocket fixtures, `ConnectionManager(max_per_ip=3, max_total=500)`

#### Task 2: **[Next Task Name]** (Module: `frontend/src/[exact/path]/`)

#### Task N: **Final Polish & Documentation** (Module: `[feature_module]`)
- **Description**: Ensure code quality, cleanup, and documentation completeness across every file touched by the above tasks (run this pass on all modified files, not just the primary module).
- **Acceptance Criteria**:
  - [ ] Unused imports and variables removed (ruff/eslint)
  - [ ] All types exported and used correctly (no `any`)
  - [ ] `README_*.md` (backend) or `ARC_*.md` (frontend) updated with new feature details
  - [ ] `claude.md` patterns verified (logging, constants, error handling)
  - [ ] Tests pass and cover new logic (backend: ~100% on touched code; frontend: high coverage on new logic)
- **Files to Update/Create**:
  - Per-file docs: `backend/app/[module]/docs_[module]/filename.md`
  - Module docs: `frontend/src/[module]/docs_[module]/ARC_[module].md` and `frontend/src/[module]/README_[module].md`
  - Main architecture overview: update references in ARCHITECTURE_frontend.md and ARCHITECTURE_backend.md
- **Dependencies**: All implementation tasks complete

### 🧪 Testing Strategy (apply per module)
- Backend: colocate tests under `backend/app/[module]/tests_[module]/` (unit + integration for that module). Expect near-100% coverage for touched backend code (lines/branches); run `pytest -q --cov=app` with `asyncio_mode=auto` and strict markers. Reuse shared fixtures (e.g., `backend/app/tests/integration/conftest.py`) when needed.
- Frontend: colocate tests under `frontend/src/[module]/tests_[module]/` (e.g., `tests_adapters`, `tests_scene`, `tests_core`). Target high coverage for new logic (core utils/adapters close to backend standards; components with RTL + vitest). Run `npm test` (vitest) with jsdom env and shared `src/test/setup.ts`.
- Add targeted unit and integration cases near the changed code; avoid central mega suites. Confirm coverage deltas for the files touched by this task.



### ✅ Success Criteria

#### Functional Requirements
- [ ] [Feature works as described in user story]
- [ ] [All acceptance criteria from tasks met]
- [ ] [Integration with existing features verified]

#### Non-Functional Requirements
- [ ] All tests passing (`pytest` for backend, `npm test` for frontend)
- [ ] No linting errors (`black`, `mypy`, `eslint`)
- [ ] Performance targets met (see table above)
- [ ] Memory usage within bounds
- [ ] No PII in logs (verify with `grep -r "192.168" logs/`)

#### Documentation
- [ ] WebSocket protocol documented
- [ ] API endpoints documented
- [ ] Configuration options documented
- [ ] Deployment notes updated

