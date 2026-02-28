---
name: solve
description: Solution design for features, subsystems, or complex changes. First principles analysis, research, iterative discussion, formal design document. Use after /arm or /arch, or standalone with a clear brief.
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, WebSearch, WebFetch, AskUserQuestion, Write, mcp__context7__resolve-library-id, mcp__context7__query-docs
argument-hint: "[brief/arch spec/ar report]"
---

# Solution Design Protocol

You create detailed solution architectures that define *what* to build and *how* to build it.

If the argument includes an arch spec or other upstream context, work within those constraints — don't re-derive what's already been decided. Challenge upstream decisions only if the solution-level analysis reveals a concrete problem.

**Tools:** Dialog (clarifying questions), Documentation (existing docs),  Context7 (library/platform verification), Research (web search for common gotchas and pitfalls).

---

## Phase Tracking

Before any work, create ALL tasks in full detail using `TaskCreate`. Pass the **subject**, **activeForm**, and **description** from each task below verbatim. Then progress through tasks sequentially — mark `in_progress` before starting, `completed` after finishing. Do not begin a task until the prior task is completed.

---

### Task 1: Clarify requirements

- **activeForm**: Clarifying requirements
- **description**: Start with dialog. The input is a brief, arch spec reference, or raw prompt — either way, extract what you need through conversation before analyzing.

  **Probe for:**

  ```yaml
  requirement_probes:
    - category: User story
      extract: Who is the user, what are they doing, why does it matter?
      ask: "Who uses this and what's their workflow?"
    - category: Behavior
      extract: What should this do, concretely?
      ask: "Walk me through the happy path."
    - category: Edge cases
      extract: What can go wrong, what's unusual?
      ask: "What happens when X fails or Y is missing?"
    - category: Constraints
      extract: Performance, privacy, cost, compatibility
      ask: "Any hard limits? What's the error budget?"
    - category: Non-goals
      extract: What's explicitly out of scope?
      ask: "What should this NOT do?"
    - category: Dependencies
      extract: What does this touch, integrate with, or break?
      ask: "What existing code does this affect?"
  ```

  Use `AskUserQuestion` for structured choices when there are clear trade-offs to resolve. Use conversational follow-ups for open-ended exploration. Drive the dialog — don't wait passively.

  **Economic termination**: Stop when you have enough to design. Not perfect — sufficient.

### Task 2: Analyze the problem (first principles)

- **activeForm**: Analyzing problem
- **description**: With the clarified requirements, apply first-principles reasoning — reduce to fundamentals rather than reasoning by analogy.

  **2.1 Deconstruct** — "What is this actually made of?"
  - Break the problem into constituent parts (data, operations, constraints)
  - Ask: What are the actual costs/values? Does this requirement make sense in context?
  - Ask: Can we achieve the same goal with less complexity?

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
  - Build solution from fundamentals only — ignore form, optimize function
  - Ask: If we started fresh with only hard constraints, what would we build?

  **2.4 Evaluate Suggested Technologies**
  If the brief suggests specific libraries, frameworks, or languages:
  - Why was this suggested? Is there a hard constraint or is it assumption?
  - Does it fit the actual problem, or was it cargo-culted from another context?
  - What are the trade-offs vs alternatives?
  - Flag recommendations to challenge or validate in Task 4

  **Avoid:** Reasoning by analogy ("X does it this way"), form fixation (improving suitcase vs inventing wheels), treating soft constraints as physics.

### Task 3: Review project context

- **activeForm**: Reviewing project context
- **description**: Navigate docs based on task scope:

  ```yaml
  context_checks:
    - scope: System-level
      check: PROCESS_DOCS/ for existing designs and architecture
    - scope: Module-level
      check: Module READMEs or docs_*/ARC_*.md within modules
    - scope: Component-level
      check: Per-file docs in docs_*/ directories
    - scope: Patterns
      check: Style guides in .claude/resources/
  ```

### Task 4: Validate technical approach

- **activeForm**: Validating technical approach
- **description**: Validate the solution design choices through grounded research. Sources are weighted — when sources conflict, higher-weight sources win.

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

  **4.2 Library Verification** (weight 1.4, required for new dependencies)
  Use Context7 to verify patterns:
  ```
  mcp__context7__resolve-library-id("[library name]")
  ```

  **4.3 Web Search** (weight 1.0, primarily negative knowledge)
  - Search: "[Technology] pitfalls production issues"
  - Search: "[Technology] common gotchas"
  - Focus on what goes wrong, not what to do — local and library docs handle the positive case

### Task 5: Design discussion loop

- **activeForm**: Iterating on design
- **description**: Present analysis conversationally and iterate BEFORE generating the formal document.

  **5.1 Present Draft Design**
  - Summarize problem understanding
  - Explain proposed approach, key decisions, trade-offs
  - Surface risks and open questions

  **5.2 Iterate**
  - Use `AskUserQuestion` to drive structured feedback: *"Does this capture what you need? Concerns with this direction?"*
  - Use multiple choice format for trade-offs and design decisions
  - Refine based on feedback until alignment

  **5.3 Confirm Readiness**
  Explicitly ask: *"Ready to formalize into a design document?"*

  Only proceed after user approval.

### Task 6: Write design document

- **activeForm**: Writing design document
- **description**: Save to `PROCESS_DOCS/solutions/NN-[solution-name].md` (e.g., `03-user-auth.md`). Check existing files in the directory to determine the next number.

  **Required Sections:**

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
    Handler → module/path/handler.py
    Service → module/path/services/feature/
    ```
  - Integration points
  - Specific code examples

  **Phase 0 designs** (scaffold + feasibility): Success criteria and findings sections MUST use conditional branching, not unconditional spec amendment. The build agent needs to know what to do in each case:
  - **If feasibility passes**: Mark Phase 0 done, proceed to Phase 1. Do NOT amend the arch spec — the architecture held.
  - **If feasibility fails**: Append failure findings to the arch spec (what failed, why, which assumption was invalidated). Halt — loop back to `/arch` to revisit the architecture.

  Never write "amend arch spec accordingly" or "write findings back to spec" as unconditional instructions. Findings only go back to the spec when something breaks.

---

## Handoff

When the design document is written, suggest next steps:
- `/ar PROCESS_DOCS/solutions/NN-[name].md` — adversarial review to stress-test the design
- `/breakdown PROCESS_DOCS/solutions/NN-[name].md` — execution planning (after `/ar` approval)
