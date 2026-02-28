# Claude Development Protocol

## 1. Identity & Constraints

<!-- Replace this section with your project's identity -->

**What we're building**: [One paragraph — your product vision and what makes it unique]

### Design Philosophy
- **First Principles**: Understand the system before you reach for abstractions. Know what the framework hides; know what the library costs. Custom solutions beat cargo-culted patterns. If you need a hack, your model is wrong—fix the design. Actively seek what could break it.
- **Spec-Driven**: Design precedes code. No implementation without a validated plan.
- **Test-Driven**: Tests are written *with* the code, not after. Red → Green → Refactor.
- **Atomic Tasks**: Work is broken into small, verifiable units. 10-15 tasks per feature.
- **Verification-First**: High friction ensures high quality.

### Hard Constraints (never violate)
<!-- Define 3-7 immutable rules for your project -->
- **[Constraint 1]**: [Description]
- **[Constraint 2]**: [Description]
- **[Constraint 3]**: [Description]
- **Forward-first**: No backward compatibility unless explicitly instructed

### Architecture Overview

<!-- Replace with your project's architecture -->

| Layer | Implementation |
|-------|----------------|
| **Frontend** | [Your frontend stack] |
| **Backend** | [Your backend stack] |
| **Data** | [Your data layer] |
| **Infrastructure** | [Your deployment target] |

**Data Flow**:
<!-- Add your system's data flow diagram -->
```
[Component A] → [Component B] → [Component C]
```

---

## 2. Navigation and Toolkit

### Documentation Map

**Code Documentation** (colocated with code):

Every module follows this documentation structure:
```
[module]/
├── [implementation files]
├── docs_[name]/                    # All docs live here
│   ├── ARC_[name].md               # Module architecture (data flow, patterns, integration)
│   ├── [FileName].md               # Per-file docs (public API, dependencies, key logic)
│   └── [subdir]/[FileName].md      # Nested files mirror source structure
└── README.md                       # Module index (purpose, tree, file table with doc links)
```

**Navigation order**: README → ARC → per-file docs → source code.

<!-- Add your module index -->
| Module | README | ARC | Per-file docs |
|--------|--------|-----|---------------|
| **[Module 1]** | `[path]/README.md` | `[path]/docs_[name]/ARC_[name].md` | `[path]/docs_[name]/*.md` |

### Exploration Pattern

1. Reference implementation guides (.claude/resources/) for patterns before writing code
2. Start with `README.md` for module overview and file index
3. Read `ARC_[name].md` for architecture, data flow, and integration points
4. Read per-file docs for public API and dependencies
5. Only parse source code if docs are missing or stale

---

## 3. Code Patterns

### Project Structure

<!-- Replace with your project's directory tree -->
```
your-project/
├── [module-1]/               # [Description]
│   ├── src/
│   └── ...
├── [module-2]/               # [Description]
│   ├── src/
│   └── ...
└── .github/workflows/        # CI/CD
```

### Module Structure

| Rule | Requirement |
|------|-------------|
| **Single Responsibility** | Each module has one clear purpose |
| **Dependency Direction** | [Define your dependency rules] |
| **Tests Alongside** | Tests in `tests_[module]/` or `*.test.*` files |

---

## 4. Testing and Logging

### Test Environment

<!-- Replace with your test commands -->
```bash
# Frontend
[your frontend test command]

# Backend
[your backend test command]
```

### Logging

<!-- Define your logging conventions -->
```
# Example:
# Use structured logging with appropriate levels
# Include context (session IDs, request IDs) in log entries
```

---

## 5. Schema & Protocol

<!-- Define your project's key schemas, data models, or protocols -->
<!-- Examples: API contracts, message formats, config schemas -->

---

## 6. Deployment

<!-- Document your deployment process -->
<!-- Examples: CI/CD pipeline, manual deploy commands, environment management -->

---

## 7. Security Considerations

<!-- Document security patterns specific to your project -->

| Area | Implementation |
|------|----------------|
| **[Area 1]** | [How it's implemented] |
| **[Area 2]** | [How it's implemented] |

---

## 8. Performance & Optimization

<!-- Document performance strategies specific to your project -->

| Strategy | Implementation |
|----------|----------------|
| **[Strategy 1]** | [How it's implemented] |
| **[Strategy 2]** | [How it's implemented] |

---

## 9. Lessons Learned

*Living section — add entries as patterns emerge or issues are resolved.*
