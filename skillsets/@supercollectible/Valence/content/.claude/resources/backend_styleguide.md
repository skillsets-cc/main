# Backend Style Guide

<!-- Populate each section with your project's backend patterns. -->
<!-- This file is the source of truth for /qb audits and /build agents. -->

---

## Configuration Pattern

<!-- How configuration is loaded: env vars, config files, settings classes -->
<!-- Document your secrets management approach -->

---

## API / Route Pattern

<!-- Your API style: REST, GraphQL, WebSocket, RPC -->
<!-- Standard request/response flow: auth → validate → business logic → response -->

---

## Error Handling Pattern

<!-- Error hierarchy, retry strategies, fallback behavior -->
<!-- Define your error response format -->

---

## Type Hints / Type Safety

<!-- Type annotation requirements for your language -->
<!-- Strictness level, tooling (mypy, pyright, tsc, etc.) -->

---

## Dependency Injection

<!-- Your DI approach: constructor injection, framework-provided, module-level -->
<!-- What's allowed as a singleton vs. what must be injected -->

---

## Logging

<!-- Logging framework, structured logging format, appropriate levels -->

---

## Data Access Patterns

<!-- Database, cache, external API access patterns -->
<!-- Connection management, query patterns, transaction handling -->

---

## Authentication & Authorization

<!-- Session management, token handling, permission checks -->

---

## Rate Limiting

<!-- Rate limiting strategy, tiers, storage backend -->

---

## Input Validation

<!-- Where and how input is validated before processing -->

---

## Security Patterns

<!-- Sanitization, CSRF protection, injection prevention -->

---

## File Structure

<!-- Your backend source tree and module organization -->
```
[module]/
├── [implementation files]
├── docs_[name]/
│   └── ARC_[name].md
└── tests_[name]/
    └── test_[file].*
```

---

## Testing Pattern

<!-- Test framework, fixtures, mocking approach, coverage targets -->

---

## Pre-Check Commands

<!-- Linting, type checking, dead code detection commands -->
```bash
# Type check
[your type check command]

# Lint
[your lint command]

# Dead code detection
[your dead code detection command]
```

---

## Code Review Checklist

<!-- Backend-specific review criteria -->

- [ ] Type annotations on all functions
- [ ] Error handling with specific exceptions
- [ ] No hardcoded values (use config/constants)
- [ ] Logging instead of print statements
- [ ] DI pattern followed (no global singletons for business logic)
- [ ] Env vars documented in .env.example
- [ ] No commented-out code
- [ ] No magic numbers (extract to constants)
- [ ] Tests colocated with source
