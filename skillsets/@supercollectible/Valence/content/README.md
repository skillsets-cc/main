Valence exists at the outer limits of your combining-power. It is an exoskeleton that **preserves intent and agency** against the grain of automated gaslighting and cognitive offloading. It's what happens when you can finally work at the speed of thought.

This workflow is what survived 3k hours of iteration: First Principles + spec-driven + test-driven + atomic tasks, in a grounded team-based skillset with formalized quality gates, adversarial reviews and auditable handoffs. The Valence team takes you from idea to reviewed, tested, documented code, while you own all key decisions. 

---

## Contents

- [Ideas](#ideas) — Design philosophy
- [Valence](#the-valence-workflow) — The workflow
- [State Tracking](#state-tracking) — Artifacts, manifests, decision auditability
- [Primitives](#primitives) — Command reference
- [Quality Gates](#quality-gates) — Validation checkpoints
- [Grounding & Navigation](#grounding--navigation) — Where agents look and what they trust
- [Meet The Team](#meet-the-team) — Agents, models, infrastructure
- [Orchestration](#orchestration) — Task patterns, agent coordination
- [Filetree](#filetree) — Repository structure
- [Usage](#usage) — Example workflow

---

## Ideas

1. **Code is a Liability; Judgement is an Asset**
Crystallize the solution architecture before a single line of syntax is written. Stress test all assumptions and swap for custom fits. Never generate implementation from a raw prompt. 

2. **Consensus through Dissensus**
Your idea is only as good as the number of bulletholes it can withstand. Have distinct models with different training data critique the same design, exposing blind spots that a single perspective would miss. Trust conflict more than agreement.

3. **Cognitive Tiering**
Intelligence is a finite resource. Route tasks based on cognitive load: high-reasoning models for strategy and design, and high-efficiency models for execution and QA. Optimize the curve between cost, speed, and quality per task.

4. **The Spec is the Source of Truth**
Conversation is ephemeral; artifacts are solid. Iterate on the Design Document. Validation is performed against the spec, not the chat. If a requirement isn't in the spec, it doesn't exist.

5. **Context is Noise**
Bigger token windows are a trap. Practice Radical Context Hygiene—give agents only the narrow, curated signal they need for their specific phase. Read the docs, not the implementation. Less context means higher IQ.

6. **Grounding, not Guessing**
Models prioritize plausibility over truth. Force active grounding to invert this. Before recommending a library or pattern, the system must verify it against library documentation, known pitfalls, and project docs. Treat documented reality as a hard constraint that overrides training data.

7. **Deterministic Execution**
Ambiguity is the enemy of automation. A plan is only valid if a worker can execute it without asking clarifying questions. Test cases are defined with the design, not after the build. Break work into atomic tasks with unambiguous acceptance criteria. If the builder has to guess, the planner failed.

8. **Audit the Auditor**
The agent that builds the code cannot be trusted to validate it. Separate context for execution and validation. Independent agents pattern-match against the design, ensuring that the implementation actually matches the intent. QA agents relitigate the build gates and retest the code in a separate context.

9. **Entropy Control**
AI-generated code defaults to verbosity and repetition. The natural state of a codebase is entropy. Treat Simplification and QA as distinct post-hoc production phases, running dedicated passes to strip out dead code, redundancy, and noise before they calcify into technical debt.

10. **Agency > Automation**
This system is an exoskeleton, not a replacement. Automation without structure is just faster tech debt. You own the vision, the Quality Gates, and the final say. Execution scales. Judgment doesn't.

---

<a id="the-valence-workflow"></a>

Valence leverages the very best of Claude Code, in a skillset that front-loads the thinking and actively flags your broken assumptions. By the time agents start building, the idea has been crystallized, the design stress-tested across training paradigms and grounded deeply, and the plan decomposed into tasks with atomic acceptance criteria. What comes out is bespoke solutions, tested, documented, and traceable. Each skill is modular, and standardized for interoperability and coordination through Claude Code's native agent team and task systems.

<a id="arm"></a>

### /arm

`/arm [initial thoughts]` — Opus extracts requirements, constraints, non-goals, style, and key concepts from fuzzy initial thoughts. Conversational QA probes for gaps, then a single structured checkpoint forces remaining decisions. Output is a synthesized brief for user confirmation.

---

<a id="arch"></a>

### /arch

`/arch [brief]` — Opus decomposes a project into subsystems with contracts, constraints, and build order. First principles analysis classifies each constraint as hard, soft, or assumption, then reconstructs the optimal decomposition from only validated truths. Project docs, style guides, Context7, and web search ground the analysis. Iterative discussion with the human until alignment, then formalized into an architecture spec with a YAML manifest that tracks project state across build phases. Includes a built-in `/ar` pass on the spec before finalizing.

---

<a id="solve"></a>

### /solve

`/solve [brief/arch spec/ar report]` — Opus designs solutions for features, subsystems, or complex changes. Works within upstream constraints from `/arch` when they exist, or standalone from an `/arm` brief. First principles deconstruction, grounded research (project docs, Context7, web search), and iterative discussion before formalizing into a design document with rationale, schemas, exact file paths, and integration points. Hands off to `/ar`.

---

<a id="ar"></a>

### /ar

`/ar [document]` — Three models critique your design in parallel, each with different bias and blind spots. The signal is where they *disagree*. Opus orchestrates — deduplicates findings, fact-checks each against the codebase, and scores by severity, probability, and remediation cost. Output is a structured report with and recommendation. Loop back to `/solve` to mitigate issues or proceed.

---

<a id="breakdown"></a>

### /breakdown

`/breakdown [design document]` — Opus transforms an approved design into execution breakdowns — one self-contained document per build agent. Tasks are grouped by agent (~5 per agent, no file conflicts between groups) to enable parallel execution. Each task includes exact file paths, code examples showing the patterns, named test cases with setup and assertions, and explicit dependencies. A quality checklist validates completeness before output.

---

<a id="pmatch"></a>

### /pmatch

`/pmatch [source of truth] [target]` — Two agents independently extract claims from a source and verify each against a target. Works in both directions — spec as source to check if code matches the contract, or code as source to check if docs are up to date. Where both agents agree on a violation, that's high confidence. Output is a claim-by-claim verdict: Matched, Gap, Partial, or Ambiguous.

---

<a id="build"></a>

### /build

`/build [execution dir]` — Opus coordinates, Sonnets build. The lead never writes code — it spawns one agent per execution document, parallel when independent, sequenced when dependent, and monitors for blockers. Each agent works through its tasks: code, test, verify acceptance criteria, cleanup. Manifest status is updated at phase boundaries. When the team finishes, `/pmatch` validates the output against the breakdown.

---

<a id="post-build"></a>

### Post-build

`/denoise [path]`, `/qf [path]`, `/qb [path]`, `/qd [path]`, `/security-review [path]` The post-build pipeline is entropy control — dedicated passes that strip dead code, enforce project patterns, update docs, and scan for vulnerabilities. Each step is a standalone primitive. Run them as an ordered pipeline — simplify before auditing, audit before docs — or swarm them in parallel against independent paths. Any combination, any scope.

---

<a id="bugfest"></a>

### /bugfest

`/bugfest [bug description or ticket ID]` — Opus debugs through structured triage, root-cause analysis, and verified fixes. Conversational probing establishes the symptom, then systematic code tracing isolates the root cause. Every bug gets a ticket in `PROCESS_DOCS/tickets/` with a YAML manifest tracker. An escalation gate classifies defects — code bugs get fixed in place; design flaws escalate to `/solve`; architectural flaws escalate to `/arch` with manifest updates. Resume any ticket by passing its ID.

---

## State Tracking

Every skill produces artifacts in `PROCESS_DOCS/` — a structured directory that accumulates as the project moves through phases. Two YAML manifests provide machine-readable state that skills read and update across phases.

### Artifacts

Each skill writes to a specific subdirectory. The artifact is the handoff — downstream skills read it directly.

```
PROCESS_DOCS/
├── briefs/                          ← /arm output
│   └── NN-slug.md                      requirements, constraints, style
├── arch/                            ← /arch output, /build + /bugfest update
│   ├── [project].md                    architecture spec (living document)
│   └── [project].manifest.yaml         build state tracker (see below)
├── solutions/                       ← /solve output
│   └── NN-solution-name.md             design doc with rationale, schemas, file paths
├── reviews/                         ← /ar output
│   └── ar_NN_design-doc.md             adversarial review report
├── breakdowns/                      ← /breakdown output, /build input
│   └── feature-name/
│       ├── 01-scope.md                 one self-contained doc per build agent
│       └── 02-scope.md
└── tickets/                         ← /bugfest output
    ├── manifest.yaml                   bug state tracker (see below)
    └── NNN-slug.md                     individual bug tickets
```

### Arch Manifest

`PROCESS_DOCS/arch/[project].manifest.yaml` — tracks global build state. Created by `/arch`, updated by `/build` at phase boundaries. `/bugfest` adds notes when debugging reveals architectural issues.

```yaml
project: my-project
spec: my-project.md
status: building              # planned → building → complete | failed
subsystems:
  - id: 0
    name: Scaffold
    status: done               # pending → building → done | failed
    notes: ""
  - id: 1
    name: Backend Core
    status: building
    notes: ""
  - id: 2
    name: Frontend
    status: pending
    notes: "blocked on backend API contracts"
```

`/build` sets subsystem status to `building` when a phase starts, `done` when it completes, `failed` when it can't proceed. Phase 0 (scaffold + feasibility) is special — if feasibility tests fail, `/build` halts, appends findings to the arch spec, and advises looping back to `/arch`. Later phases don't start until their dependencies are satisfied.

### Bug Manifest

`PROCESS_DOCS/tickets/manifest.yaml` — tracks all bugs across sessions. Created and updated by `/bugfest`. Tickets are resumable by ID.

```yaml
tickets:
  - id: 1
    title: "WebSocket drops on reconnect"
    severity: high
    status: resolved             # open → resolved | escalated
    ticket: "001-websocket-drops.md"
  - id: 2
    title: "Rate limiter allows burst bypass"
    severity: medium
    status: escalated            # → /solve (design flaw)
    ticket: "002-rate-limiter-bypass.md"
```

The escalation gate connects `/bugfest` back to the design phases. Code defects get fixed in place. Design flaws escalate to `/solve` — the ticket becomes the brief. Architectural flaws escalate to `/arch` — the arch manifest gets updated with findings.

### Decision Auditability

Every design decision is traceable through the artifact chain. `/solve` writes decision tables — each choice records the rationale, the alternatives considered, and why they were rejected. `/ar` stress-tests those decisions across three models and produces classified findings with cost/benefit analysis. `/breakdown` decomposes the approved design into execution docs that reference the original design. `/build` implements against those docs, and `/pmatch` validates the result against the plan.

The audit trail for any line of code:

```
implementation ← breakdown task ← design doc decision ← AR validation ← arch contract
     /build        /breakdown          /solve                /ar            /arch
```

Each artifact in the chain references the one before it. To understand why something was built a certain way, read the design doc's decision table. To understand why a decision survived review, read the AR report. To understand why a subsystem exists, read the arch spec.

---

## Primitives

User-invoked entry points into the workflow. Each command loads its protocol and executes the corresponding phase.

| Command | Purpose | Protocol |
|---------|---------|----------|
| `/arm [thoughts]` | Crystallize fuzzy ideas — extract reqs, constraints, style, concepts | [SKILL.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/arm/SKILL.md) |
| `/arch [brief]` | Global architecture — subsystem decomposition, contracts, build order | [SKILL.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/arch/SKILL.md) |
| `/solve [brief or spec]` | Solution design — first principles, research, design doc | [SKILL.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/solve/SKILL.md) |
| `/ar [doc.md]` | Adversarial review — orchestrates ar agents, cost/benefit for human review | [SKILL.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/ar/SKILL.md) |
| `/breakdown [design.md]` | Execution breakdown — transform design into agent-scoped task docs | [SKILL.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/breakdown/SKILL.md) |
| `/build [exec-dir/]` | Implement a plan — spawn build agents, coordinate, validate | [SKILL.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/build/SKILL.md) |
| `/pmatch [source] [target]` | Validate target against source claims | [SKILL.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/pmatch/SKILL.md) |
| `/bugfest [bug or ticket]` | Debug — triage, root-cause, fix, ticket tracking | [SKILL.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/bugfest/SKILL.md) |
| `/denoise [path]` | Post-build cleanup — invokes code-simplifier plugin | [Anthropic plugin](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/code-simplifier) |
| `/qf` `/qb [path]` | QA audit — frontend (design system, a11y) or backend (API patterns, security) | [qa-f.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/agents/qa-f.md), [qa-b.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/agents/qa-b.md) |
| `/qd [path]` | Docs QA — validates and updates documentation | [qa-docs.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/agents/qa-docs.md) |
| `/security-review` | Security audit — injection, XSS, auth flaws | [Claude Code native](https://www.anthropic.com/news/automate-security-reviews-with-claude-code) |

---

## Quality Gates

Nine checkpoints, each blocking forward progress until validation passes. The sequence matters: requirements solidify before architecture starts, architecture locks before solution design, designs finalize before planning, plans finalize before code. Later gates assume earlier gates passed—QA agents don't re-validate requirements, they trust the design gate caught that.

| Gate | Mechanism | Validates |
|------|-----------|-----------|
| **Brief** | /arm | Requirements, constraints, style, key concepts extracted |
| **Architecture** | /ar (via /arch) | Subsystem decomposition, contracts, constraint feasibility |
| **Design** | /ar | First principles, internal consistency, best practices |
| **Plan** | /pmatch | Breakdown matches design, complete acceptance criteria |
| **Per-task** | /build workflow | Acceptance criteria, test cases |
| **Code quality** | /denoise | Dead code, comments, redundancy, complexity |
| **Project patterns** | qa-f / qa-b | Design system, API patterns, accessibility |
| **Documentation** | qa-docs | Docs match implementation |
| **Security** | /security-review | Injection, XSS, auth flaws, OWASP vulnerabilities |

## Grounding & Navigation

Grounding is ontological engineering for the models — each source plays a different role and is weighted by credibility, all steer the signal away from the parametric mean toward bespoke fits. Project docs define what's true for *this* system. Library docs define what's true for the platform. Web search surfaces what's gone wrong for others.

### Source Weights

| Weight | Source | Purpose |
|--------|--------|---------|
| **1.5** | Local docs (project) | Existing patterns, constraints, conventions |
| **1.4** | Library docs (Context7) | Platform capabilities, API contracts, current patterns |
| **1.0** | Web search | Negative knowledge — known pitfalls, failure modes, near-misses |

**Local docs** follow a naming convention — agents self-navigate without custom instructions:

| Level | Location | Contains |
|-------|----------|----------|
| **System** | `ARCHITECTURE_*.md` | Data flow, key patterns, module boundaries |
| **Module** | `README_*.md` entrypoints + ARC_*.md` subsystem doc | Module purpose, public API, dependencies |
| **File** | `docs_*/*.md` | Per-file implementation details |

**Context7** is *required* for any library not already validated in the codebase. **Web search** fills gaps — especially useful for "has anyone else hit this?" questions.

### Patterns & Templates

Style guides encode decisions already made — agents reference them instead of re-inventing conventions. Templates enforce structure so artifacts are consistent across workflow phases.

| Artifact | Purpose |
|----------|---------|
| [frontend_styleguide.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/resources/frontend_styleguide.md) | Frontend component, state, styling, and testing patterns (populate for your stack) |
| [backend_styleguide.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/resources/backend_styleguide.md) | Backend API, data access, error handling, and testing patterns (populate for your stack) |
| [arch_spec_template.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/resources/arch_spec_template.md) | Architecture spec template — `/arch` output |
| [brief_template.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/resources/brief_template.md) | Brief template — `/arm` output |
| [claude-execution-template.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/resources/claude-execution-template.md) | Execution doc structure — `/breakdown` output readable by `/build` |
| [ar_report_template.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/resources/ar_report_template.md) | Adversarial review report template — `/ar` output |
| [ticket_template.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/resources/ticket_template.md) | Bug ticket template — `/bugfest` output |
| [ARC_doc_template.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/resources/ARC_doc_template.md) | Module architecture template — directory structure, data flow, integration |
| [README_module_template.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/resources/README_module_template.md) | Module README template — purpose, files, dependencies, patterns |
| [file_doc_template.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/resources/file_doc_template.md) | Per-file doc template — classes, functions, data flow, integration points |

---

## Meet The Team

The roster. Which agent runs on which model, what each one does, and the infrastructure that connects them.

### Model Selection

The cost curve: Opus is expensive but catches design flaws that compound downstream. A missed edge case in design costs more to fix in planning, more again in implementation, most in production. Sonnet is the workhorse—fast enough for iteration, capable enough for implementation. Haiku handles throwaway tasks where speed matters more than depth.

| Agent | Model | Purpose | Protocol |
|-------|-------|---------|----------|
| `arm` | Opus | Crystallize initial thoughts — extract reqs, constraints, style, concepts | [SKILL.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/arm/SKILL.md) |
| `arch` | Opus | Global architecture — subsystem decomposition, contracts, build order | [SKILL.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/arch/SKILL.md) |
| `solve` | Opus | Solution design — first principles, research, design doc | [SKILL.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/solve/SKILL.md) |
| `breakdown` | Opus | Execution breakdown — transform design into agent-scoped task docs | [SKILL.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/breakdown/SKILL.md) |
| `bugfest` | Opus | Debug — triage, root-cause, fix, ticket tracking | [SKILL.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/bugfest/SKILL.md) |
| `build` | Sonnet | Implement a plan — code, test, verify acceptance criteria, cleanup | [SKILL.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/build/SKILL.md), [build.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/agents/build.md) |
| `explore` | Haiku/Sonnet | Reader and information gatherer supporting Opus | CC native |

### Adversarial Review

Three models, same protocol, different blind spots. The value isn't any single critique—it's where they *disagree*. When Opus flags an edge case that Kimi missed, or GLM-5 questions an assumption both others accepted, that's signal. Unanimous approval means either the design is solid or all three share a blind spot.

| Agent | Model | Strength |
|-------|-------|----------|
| `ar-o` | Opus | Exhaustive edge cases, deep assumption chains |
| `ar-k` | Kimi | Broad knowledge base, fast pattern recognition |
| `ar-glm5` | GLM-5 | Alternative training distribution, cost-effective |

The orchestrator aggregates findings, deduplicates overlapping critiques, and presents cost/benefit recommendations. Human decides which critiques warrant design changes.

### Pattern Matching

Spec drift is real. The design says one thing; the code does another. Pattern matching makes this mechanical: extract claims from the spec ("the system SHALL do X"), check if the implementation satisfies each claim. Not "is the code good?" but "does it match the contract?" Two agents extract independently, then merge—consensus on violations is high confidence.

| Agent | Model | Protocol |
|-------|-------|----------|
| `pm-s` | Sonnet | [SKILL_pmatch.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/pmatch/SKILL.md) |
| `pm-k` | Kimi | [SKILL_pmatch.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/pmatch/SKILL.md) |

Output: list of claims with VALIDATED/VIOLATED/MISSING status, citations to both documents.

### QA Agents

Separated by scope: `denoise` orchestrates parallel `code-simplifier` agents that restructures and , `qa-f`/`qa-b` enforce project-specific patterns (design systems, conventions, patterns, etc), `qa-docs` maintains the documentation hierarchy, `security-review` scans for vulnerabilities. Order matters—simplify first so the pattern auditors don't waste cycles flagging noise that's about to be deleted.

| Agent | Model | Scope | Protocol |
|-------|-------|-------|----------|
| `code-simplifier` | Opus | Dead code, redundancy, type safety, comment cleanup | [Anthropic plugin](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/code-simplifier) |
| `qa-f` | Sonnet | Design system compliance, accessibility, resource cleanup | [qa-f.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/agents/qa-f.md) |
| `qa-b` | Sonnet | API patterns, data access, security, error handling | [qa-b.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/agents/qa-b.md) |
| `qa-docs` | Sonnet | Doc freshness — ARC files, READMEs match implementation | [qa-docs.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/agents/qa-docs.md) |
| `security-review` | — | Injection, XSS, auth flaws, OWASP vulnerabilities | [Claude Code native](https://www.anthropic.com/news/automate-security-reviews-with-claude-code) |

Run `/denoise` first, then `/qf` or `/qb`, then `/qd`, then `/security-review`.

### Orchestration

Every multi-agent skill uses Claude Code's **agent teams** — lead creates a team, spawns teammates, monitors progress, never writes code itself. The task system is the coordination primitive. How teammates *use* it differs.

**Requirements**:
- `tmux` installed — each teammate runs in its own tmux pane with its own permission prompt
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in environment or `.claude/settings.local.json`

**Two patterns**:

**1. Coordinated build** (`/build`) — The lead creates a team and one task per build agent, with cross-agent dependencies set via `blockedBy`. Each teammate reads its execution doc, creates its own sub-tasks from it, and works through them sequentially. The shared task list is the coordination surface — teammates self-claim unblocked work, and the lead intervenes only on blockers or failures. File isolation is enforced upstream: `/breakdown` groups tasks so no two agents edit the same file. 

```
Lead (Opus) ──── never writes code
├── TeamCreate              → shared team + task list
├── TaskCreate (×N)         → one task per agent doc, with blockedBy for sequencing
├── Task (×N)               → spawn build agents (Sonnet), each gets its execution doc path
├── [delegate mode]         → coordination-only tools from here
├── Monitor                 → watch task list, handle messages, update arch manifest at phase boundaries
└── Cleanup                 → shutdown teammates, delete team, run /pmatch validation

Build Agent (Sonnet) ──── owns one execution doc
├── Read execution doc      → ~5 tasks with acceptance criteria, code patterns, named tests
├── TaskCreate (×~5)        → creates sub-tasks from execution doc on shared list
├── For each task:
│   ├── Mark in_progress
│   ├── Implement + test    → code, test, verify acceptance criteria
│   ├── Cleanup gate        → no console.*, no magic numbers, no dead code
│   └── Mark completed
└── Message lead            → summary of what was built
```

**2. Single-task teammates** (`/ar`, `/pmatch`, `/qf`, `/qb`, `/qd`, `/denoise`) — The lead creates a team and one task per teammate, but only for tracking. Teammates don't create sub-tasks or share work through the task list. Internally they progress through phases, updating `activeForm` as a status signal. When done, they mark their single task completed and message the lead with results. All teammates run in parallel — no cross-agent dependencies.

```
Lead (Opus) ──── aggregates and synthesizes
├── TeamCreate              → shared team + task list
├── TaskCreate (×N)         → one tracking task per teammate
├── Task (×N)               → spawn teammates, each gets its work artifact path
├── Wait for messages       → teammates report findings when done
├── Synthesize              → deduplicate, validate, classify (skill-specific)
└── Cleanup                 → shutdown teammates, delete team, write report

Teammate (Sonnet/Haiku) ──── self-contained phases
├── Read work artifact      → design doc, source/target paths, file list
├── Phase 1..N              → skill-specific phases, tracked via activeForm
│   └── (no sub-tasks)      → phases are internal, not on shared list
├── Mark task completed
└── Message lead            → structured findings/report
```


| Skill | Teammates | Pattern | Task usage |
|-------|-----------|---------|------------|
| `/build` | build (×N) | Sequenced by dependency | Coordinated — sub-tasks on shared list |
| `/ar` | ar-o, ar-k, ar-glm5 | All parallel | Single-task — phases via activeForm |
| `/pmatch` | pm-s, pm-k | All parallel | Single-task — phases via activeForm |
| `/denoise` | code-simplifier (×N) | All parallel | Single-task — one file group each |
| `/qf` `/qb` `/qd` | qa-f / qa-b / qa-docs (×N) | All parallel | Single-task — one file group each |

### Multi-Model Infrastructure

Adversarial review and pattern matching require access to models outside Claude. `Valence_ext/` is a provider-agnostic Node.js external agent runner that drives external models with MCP tool access, direct API calls, and bidirectional tool-call normalization.

**Architecture**:
```
Claude Code (Opus orchestrator)
  └── spawns thin Haiku teammate (ar-k, ar-glm5, pm-k)
       └── runs: node Valence_ext/external-agent.mjs --agent <profile> --prompt <path> --output <file>
              ├── loads agent profile from external-agents.json
              ├── spawns MCP servers per profile config
              ├── normalizes MCP tools to provider format
              ├── agent loop: fetch → normalize → tool_calls? → MCP execute → repeat
              └── writes final output to --output file
```

**Provider normalization**: The `Valence_ext/providers/` layer abstracts differences between APIs. Each provider exports five functions that handle the translation between MCP tool format and the provider's native format. Currently ships with `openai-compat` (covers Kimi, OpenRouter, and any OpenAI-compatible API). Add new providers by replicating the pattern — create `providers/<name>.mjs`, register it in `providers/index.mjs`.

**Agent profiles** in `external-agents.json` define: provider type, API base URL, model, env var for the API key, max turns, MCP server access, and per-agent tool allowlists. Add new external agents by adding a profile and a thin orchestrator in `.claude/agents/`.

**Models available**:

| Model | Agent | Purpose |
|-------|-------|---------|
| `kimi-k2.5` (Moonshot) | ar-k, pm-k | Broad knowledge, fast pattern recognition |
| `glm-5` (via OpenRouter) | ar-glm5 | Alternative training distribution, cost-effective |

**MCP integration**: External agents get the same grounding capabilities as Claude agents via MCP servers:
- **Context7**: Library documentation via `resolve-library-id` and `query-docs`
- **Filesystem**: Read-only codebase access via `read_file`, `search_files`, `list_directory`

Tool access is narrowed per-agent via `toolOverrides` in the profile. Environment is allowlisted to prevent API key leakage to MCP server processes.

**Setup**:
```bash
cd Valence_ext && npm install
cp .env.example .env  # Add KIMI_API_KEY, OPENROUTER_API_KEY
source .env
```

---

## Filetree

```
your-project/
├── CLAUDE.md                      # Always in context — product vision, toolkit, architecture
├── Valence_ext/                   # External model runner (multi-model infrastructure)
│   ├── external-agent.mjs         # Runner entry point
│   ├── external-agents.json       # Agent profiles + MCP server config
│   ├── providers/                 # Provider normalization layer
│   │   ├── index.mjs              # Provider registry
│   │   └── openai-compat.mjs      # OpenAI-compatible API normalization
│   └── prompts/                   # System prompts for external agents
│       ├── adversarial-review.md  # /ar reviewer prompt
│       └── pattern-match.md       # /pmatch matcher prompt
│
└── .claude/                       # Active protocols (what Claude Code uses)
    ├── skills/                    # Skills (slash commands + full protocols)
    │   ├── arm/SKILL.md           # /arm → crystallization workflow
    │   ├── arch/SKILL.md          # /arch → global architecture workflow
    │   ├── solve/SKILL.md         # /solve → solution design workflow
    │   ├── ar/SKILL.md            # /ar → adversarial review orchestration
    │   ├── breakdown/SKILL.md     # /breakdown → execution breakdown workflow
    │   ├── build/SKILL.md         # /build → implementation workflow
    │   ├── pmatch/SKILL.md        # /pmatch → pattern matching validation
    │   ├── bugfest/SKILL.md       # /bugfest → debugging workflow
    │   ├── denoise/SKILL.md       # /denoise → code-simplifier plugin
    │   ├── qf/SKILL.md            # /qf → frontend QA agent
    │   ├── qb/SKILL.md            # /qb → backend QA agent
    │   ├── qd/SKILL.md            # /qd → docs QA agent
    │   └── [your-skill]/          # Add domain skills here
    │
    ├── agents/                    # Sub-agents (autonomous tasks)
    │   ├── build.md               # Build worker (Sonnet)
    │   ├── qa-docs.md             # Documentation freshness validator
    │   ├── qa-f.md                # Frontend module audit
    │   ├── qa-b.md                # Backend module audit
    │   ├── ar-o.md                # Adversarial review (Opus)
    │   ├── ar-k.md                # Adversarial review (Kimi via Valence_ext)
    │   ├── ar-glm5.md             # Adversarial review (GLM-5 via Valence_ext)
    │   ├── pm-s.md                # Pattern matching (Sonnet)
    │   └── pm-k.md                # Pattern matching (Kimi via Valence_ext)
    │
    └── resources/                 # Shared resources (style guides, templates)
        ├── frontend_styleguide.md
        ├── backend_styleguide.md
        ├── arch_spec_template.md
        ├── brief_template.md
        ├── claude-execution-template.md
        ├── ar_report_template.md
        ├── ticket_template.md
        ├── ARC_doc_template.md
        ├── README_module_template.md
        └── file_doc_template.md
```

---

## License

[Apache License 2.0](LICENSE) 

---
