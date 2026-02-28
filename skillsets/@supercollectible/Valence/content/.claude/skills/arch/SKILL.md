---
name: arch
description: Global architecture spec. Decomposes a project into subsystems with contracts, constraints, and build order. Produces a living spec that tracks project state. Use after /arm or with a clear brief for greenfield projects.
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, WebSearch, WebFetch, AskUserQuestion, Write, Skill, mcp__context7__resolve-library-id, mcp__context7__query-docs
argument-hint: "[path/to/brief.md]"
---

# Architecture Protocol

You define global architecture at the **contract boundary** — subsystem decomposition, constraints, interfaces, and build order. You define *what the system is made of* and *how the parts relate*, not how each part works internally. Internal design is `/solve`'s job.

**Tools:** Dialog (clarifying questions), Documentation (existing docs), Research (web search for best practices), Context7 (library/platform verification).

---

## Phase Tracking

Before any work, create ALL tasks in full detail using `TaskCreate`. Pass the **subject**, **activeForm**, and **description** from each task below verbatim. Then progress through tasks sequentially — mark `in_progress` before starting, `completed` after finishing. Do not begin a task until the prior task is completed.

---

### Task 1: Clarify scope and constraints

- **activeForm**: Clarifying scope
- **description**: Start with dialog. The input is either an `/arm` brief or a raw prompt — either way, extract what you need through conversation before analyzing.

  **Probe for:**

  ```yaml
  scope_probes:
    - category: User story
      extract: Who are the users, what are they trying to achieve?
      ask: "Who uses this system and what does success look like for them?"
    - category: System purpose
      extract: What does this system do?
      ask: "What's the core problem this solves?"
    - category: Scale
      extract: Users, concurrency, throughput, storage
      ask: "How many concurrent users? What's the data volume?"
    - category: Constraints
      extract: Latency, availability, cost, platform, compliance
      ask: "Any hard platform requirements? Uptime target? Budget ceiling?"
    - category: Subsystem intuitions
      extract: What parts does the user already see?
      ask: "What are the major moving pieces in your head?"
    - category: Non-goals
      extract: What's explicitly out of scope?
      ask: "What should this NOT do?"
    - category: Dependencies
      extract: External services, APIs, existing systems
      ask: "What does this need to talk to?"
    - category: Feasibility concerns
      extract: What's unproven or risky?
      ask: "What are you least sure about?"
  ```

  Use `AskUserQuestion` for structured choices when there are clear trade-offs to resolve. Use conversational follow-ups for open-ended exploration. Drive the dialog — don't wait passively.

  **Economic termination**: Stop when you have enough to decompose. Not perfect — sufficient.

### Task 2: Analyze the problem (first principles)

- **activeForm**: Analyzing problem
- **description**: With the clarified scope, apply first-principles reasoning — reduce to fundamentals rather than reasoning by analogy.

  **2.1 Deconstruct** — "What is this actually made of?"
  - Break the system into constituent parts (data, operations, constraints)
  - Ask: What are the actual costs/values? Does this requirement make sense in context?
  - Ask: Can we achieve the same goal with fewer subsystems?

  **2.2 Challenge** — "Real constraint or assumption?"

  ```yaml
  constraint_types:
    - type: Hard
      definition: Physics/reality
      can_change: false
    - type: Soft
      definition: Policy/choice
      can_change: true
    - type: Assumption
      definition: Unvalidated belief
      can_change: maybe
  ```

  For soft constraints: *Who decided this? What if we removed it?*

  **2.3 Reconstruct** — "Given only truths, what's optimal?"
  - Build decomposition from fundamentals only — ignore form, optimize function
  - Ask: If we started fresh with only hard constraints, what subsystems would we need?

  **Avoid:** Reasoning by analogy ("X does it this way"), form fixation (improving suitcase vs inventing wheels), treating soft constraints as physics, going deeper than contract level.

### Task 3: Review project context

- **activeForm**: Reviewing project context
- **description**: Navigate docs based on what exists:

  ```yaml
  context_checks:
    - scope: Prior arch specs
      check: PROCESS_DOCS/ for existing architecture and designs
    - scope: Existing modules
      check: Module READMEs or docs_*/ARC_*.md within modules
    - scope: Patterns
      check: Style guides in .claude/resources/
  ```

### Task 4: Validate technical approach

- **activeForm**: Validating technical approach
- **description**: Validate the global architecture choices through grounded research. Sources are weighted — when sources conflict, higher-weight sources win.

  **Source weights:**

  ```yaml
  source_weights:
    - weight: 1.5
      source: Local docs (project)
      purpose: Existing patterns, constraints, conventions
    - weight: 1.4
      source: Library docs (Context7)
      purpose: Platform capabilities, API contracts, current patterns
    - weight: 1.0
      source: Web search
      purpose: Negative knowledge — known pitfalls, failure modes, near-misses
  ```

  **4.1 Local Docs** (weight 1.5)
  - Check style guides for existing patterns
  - Look for similar implementations in codebase
  - Verify alignment with established conventions
  - If the project has prior art, it overrides external recommendations

  **4.2 Library/Platform Docs** (weight 1.4, required for new technology choices)
  Use Context7 to verify patterns and capabilities:
  ```
  mcp__context7__resolve-library-id("[library name]")
  ```
  - Confirm platform supports the proposed contracts
  - Check for limits, quotas, or constraints that affect subsystem boundaries
  - Verify current API patterns (not outdated blog posts)

  **4.3 Web Search** (weight 1.0, primarily negative knowledge)
  - Search: "[Technology] pitfalls production issues"
  - Search: "[Platform] limitations gotchas"
  - Search: "[Architecture pattern] failure modes at scale"
  - Focus on what goes wrong, not what to do — local and library docs handle the positive case

  **4.4 Phase 0: Scaffold & Feasibility**
  Phase 0 is always the first build phase. It has two jobs: lay the project foundation and prove out risky assumptions. Define both in the spec.

  **Scaffold** — what later phases need to exist before they can start:
  - Project structure, build system, configs
  - Shared infrastructure (CI, linting, test harness, dev tooling)
  - Dependencies and environment setup

  **Feasibility** — what's unproven and needs a spike:
  - Can each subsystem deliver its contract given the global constraints?
  - Are the interfaces between subsystems compatible?
  - Are there known hard problems that need a spike to prove out?

  If Phase 0 feasibility tests fail at build time, the architecture is wrong — `/build` will halt and append findings to the spec for rework.

### Task 5: Architecture discussion loop

- **activeForm**: Iterating on architecture
- **description**: Present analysis conversationally and iterate BEFORE generating the formal document.

  **5.1 Present Draft Architecture**
  - Summarize system decomposition
  - Explain subsystem boundaries and why they're drawn there
  - Present contracts between subsystems
  - Surface risks, open questions, and feasibility concerns
  - Propose build order with rationale

  **5.2 Iterate**
  - Use `AskUserQuestion` to drive structured feedback: *"Does this decomposition capture the system? Concerns with the boundaries?"*
  - Use multiple choice format for trade-offs and boundary decisions
  - Refine based on feedback until alignment

  **5.3 Confirm Readiness**
  Explicitly ask: *"Ready to formalize into an architecture spec?"*

  Only proceed after user approval.

### Task 6: Write architecture spec and manifest

- **activeForm**: Writing architecture spec
- **description**: Write `PROCESS_DOCS/arch/[project-name].md` using the template at `.claude/resources/arch_spec_template.md`.

  Single file — everything in one place. `/solve` reads the full spec, gets the system overview for context, and works on its assigned subsystem. `/solve` amends this file directly when findings emerge (constraint revisions, new learnings).

  Stay at the contract boundary — do NOT specify internal architecture, data models, file structures, or implementation details (that's `/solve`).

  After writing the spec, create `PROCESS_DOCS/arch/[project-name].manifest.yaml` — the global build state tracker. Seed it from the Subsystem Map:

  ```yaml
  project: [project-name]
  spec: [project-name].md
  status: planned
  subsystems:
    - id: 0
      name: Scaffold
      status: pending
      notes: ""
    - id: 1
      name: [Subsystem Name]
      status: pending
      notes: ""
  ```

  The manifest is the source of truth for build state. `/build` updates subsystem status at phase boundaries. `/bugfest` adds notes when architectural issues are discovered during debugging.

### Task 7: Run adversarial review

- **activeForm**: Running adversarial review
- **description**: Invoke `/ar` on the global spec. Before invoking, tell the user:

  *"Running adversarial review scoped to the architecture boundary. Reviewers will evaluate subsystem decomposition, contract completeness, constraint feasibility, and dependency graph. They will NOT evaluate implementation details."*

  Then run `/ar PROCESS_DOCS/arch/[project-name].md`.

  `/ar` will create its own subtasks on this task list and produce a review report. Wait for it to complete.

### Task 8: Incorporate review findings

- **activeForm**: Incorporating findings
- **description**: After `/ar` completes:

  1. Read the AR report
  2. For **Critical** findings: amend the arch spec directly
  3. For **Recommended** findings: discuss with user, amend if agreed
  4. For **Noted** findings: acknowledge in revision log if relevant
  5. Update the revision log with changes made

  If Critical findings require significant rework, return to Task 5 (discussion loop) before rewriting.

---

## Boundary Rules

`/arch` defines **what** the subsystems are and **how they relate**. It does NOT define internal design — that's `/solve`.

```yaml
boundary:
  in_scope:
    - Subsystem purpose and boundaries
    - Input/output contracts
    - Global constraints
    - Build order and dependencies
    - Cross-cutting concerns (boundary-level)
    - Technology stack (global)
  out_of_scope:  # → /solve
    - Internal module structure
    - Data models and schemas
    - Per-subsystem configuration
    - File paths and code patterns
    - Implementation of cross-cutting concerns
    - Library choices per subsystem
```
