---
name: design
description: Design workflow for new features or complex changes. First principles analysis, research, iterative discussion, formal design document. Use after /arm or with a clear brief.
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, WebSearch, WebFetch, AskUserQuestion, Write, mcp__context7__resolve-library-id, mcp__context7__query-docs
argument-hint: "[brief or feature description]"
---

# Opus Design Protocol

You create detailed solution designs that define *what* to build and *why*.

**Tools:** Dialog (clarifying questions), Documentation (existing docs), Research (web search for best practices).

---

## Step 1: Analyze the Problem (First Principles)

Parse the user's request through first-principles reasoning—reduce to fundamentals rather than reasoning by analogy.

### 1.1 Deconstruct — "What is this actually made of?"
- Break the problem into constituent parts (data, operations, constraints)
- Ask: What are the actual costs/values? Does this requirement make sense in context?
- Ask: Can we achieve the same goal with less complexity?

### 1.2 Challenge — "Real constraint or assumption?"
| Type | Definition | Can Change? |
|------|------------|-------------|
| **Hard** | Physics/reality | No |
| **Soft** | Policy/choice | Yes |
| **Assumption** | Unvalidated belief | Maybe false |

For soft constraints: *Who decided this? What if we removed it?*

### 1.3 Reconstruct — "Given only truths, what's optimal?"
- Build solution from fundamentals only—ignore form, optimize function
- Ask: If we started fresh with only hard constraints, what would we build?

### 1.4 Evaluate Suggested Technologies
If the brief suggests specific libraries, frameworks, or languages:
- Why was this suggested? Is there a hard constraint or is it assumption?
- Does it fit the actual problem, or was it cargo-culted from another context?
- What are the trade-offs vs alternatives?
- Flag recommendations to challenge or validate in Step 3

### 1.5 Capture Requirements
- Clarify open questions with user
- Identify constraints (performance, privacy, cost)
- Note dependencies and edge cases

**Avoid:** Reasoning by analogy ("X does it this way"), form fixation (improving suitcase vs inventing wheels), treating soft constraints as physics.

---

## Step 2: Review Project Context

Navigate docs based on task scope:

| Scope | Check |
|-------|-------|
| System-level | `DOCS/design/skillsets-cc-design.md` for complete architecture |
| Module-level | Module READMEs or `docs_*/ARC_*.md` within modules |
| Component-level | Per-file docs in `docs_*/` directories |
| Patterns | `frontend_styleguide.md` (Astro), `workers_styleguide.md` (Cloudflare), or `cli_styleguide.md` (Node.js) |

---

## Step 3: Validate Technical Approach

### 3.1 Web Research
- Search: "[Technology] best practices 2026"
- Search: "[Technology] common pitfalls"
- Look for recent discussions, known issues

### 3.2 Library Verification (required for new dependencies)
Use Context7 to verify patterns:
```
mcp__context7__resolve-library-id("[library name]")
```

### 3.3 Cross-Reference Project Patterns
- Check style guides for existing patterns
- Look for similar implementations in codebase
- Verify alignment with core patterns (Circuit Breaker, BaseServiceManager, etc.)

### 3.4 Validate Core Constraints
- Ephemeral sessions (30-min TTL)?
- Dependency injection patterns?
- Unified streaming pipeline?
- Error handling with fallbacks?

---

## Step 4: Design Discussion Loop

Present analysis conversationally and iterate BEFORE generating the formal document.

### 4.1 Present Draft Design
- Summarize problem understanding
- Explain proposed approach, key decisions, trade-offs
- Surface risks and open questions

### 4.2 Iterate
- Ask: *"Does this capture what you need? Concerns with this direction?"*
- Use multiple choice format for options
- Refine based on feedback until alignment

### 4.3 Confirm Readiness
Explicitly ask: *"Ready to formalize into a design document?"*

Only proceed after user approval.

---

## Output: Design Document (save to `DOCS/design/`)

### Required Sections

**1. Executive Summary** — High-level impact and value

**2. Rationale** — Why this approach? Use decision table:
| Decision | Rationale | Alternative | Why Rejected |
|----------|-----------|-------------|--------------|
| ... | ... | ... | ... |

**3. Technology Stack** — Dependencies, models, libraries

**4. Architecture** — Data flow, component catalog, schemas

**5. Protocol/Schema** — Exact JSON/Pydantic definitions

**6. Implementation Details**
- File structure with explicit module placement:
  ```
  WebSocket handler → backend/app/core/websocket_handler.py
  New Service → backend/app/services/new_feature/
  ```
- Integration points
- Specific code examples
