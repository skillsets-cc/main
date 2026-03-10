Valence exists at the outer limits of your combining-power. It is an exoskeleton that **preserves intent and agency** against the grain of automated gaslighting and cognitive offloading. It leverages the very best of Claude Code, in a skillset that front-loads the thinking and actively flags your broken assumptions.

This methodology is what survived thousands of hours in with Claude: First Principles + spec-driven + test-driven + atomic tasks, in a grounded team-based skillset with formalized quality gates, adversarial reviews and auditable handoffs. The Valence team takes you from idea to reviewed, tested, documented code, while you own all key decisions. The first of its kind to integrate natively with CC's new agent teams and tasks, it's a metacognitive harness designed squarely around dev agency and output quality.

Every inference is a negotiation between what you put in and what training burned into the weights — and undertrained context loses that negotiation by default. Valence's phase structure is designed to make that outcome non-competitive: dense, validated, coherent input at each stage so the model's representational geometry has nowhere to go but where you've specified.

---

## Contents

- [Ideas](#ideas) — Design philosophy
- [Valence](#the-valence-workflow) — The workflow
- [Your Responsibilities](#your-responsibilities) — What stays with you
- [State Tracking & Auditability](#state-tracking--auditability) — Artifacts, manifests, decision auditability
- [Orchestration](#orchestration) — Task patterns, agent coordination, worktrees
- [Quality Gates](#quality-gates) — Validation checkpoints
- [Grounding & Navigation](#grounding--navigation) — Where agents look and what they trust
- [Meet The Team](#meet-the-team) — Agents and models
- [Valence_ext](#multi-model-infrastructure) — External model runner
- [Filetree](#filetree) — Repository structure

---

## Ideas

1. **Code is a Liability; Judgment is an Asset**
A model pointed at the wrong problem solves it with precision. Crystallize the architecture before syntax. Stress-test assumptions, classify constraints, reject averages. The thinking is the product. The code is the residue.

2. **Familiarity is not Evidence**
Agents don't fail the way humans do. The patterns built for human workflows encode assumptions about where things break — and those assumptions don't transfer. Mapping human-scoped solutions onto a different failure surface doesn't reduce risk; it adds overhead. The new paradigm has its own constraints. Find them, check you ego, and adapt. 

4. **Consensus through Dissensus**
Your design is only as good as the bulletholes it survives. Different models carry different training geometries and different alignment biases. Where they agree, you may have signal. Where they conflict, you have information. A single model critiquing your design is pattern-matching against its own priors. Trust conflict more than agreement.

5. **Cognitive Tiering**
Intelligence is a finite resource. Route tasks by cognitive load: high-reasoning models for strategy and design, high-efficiency models for execution and validation. This is not a cost optimization. Misrouting degrades both quality and speed. Map the curve and hold it.

6. **The Spec is the Source of Truth**
Conversation is ephemeral; artifacts are durable. Iterate on the design document. Validate against the spec, not the chat. If a requirement isn't in the spec, it doesn't exist.

7. **Context Shapes Preconditions, Not Outputs**
Context doesn't produce output — it shapes the preconditions for it. Every token in the window is material the model's transformation geometry operates on. Practice radical context hygiene: more context isn't higher IQ, it's more noise competing with signal. The context window is the availability set for everything the agent can attend to. Keep it narrow. Keep it true.

8. **Ontological Saturation**
Models are interpolation engines. Their priors — pathway geometry shaped by everything the training corpus contained — default toward averaged solutions, social performance, and outdated patterns. The fix isn't prompting harder. It's overwhelming those priors with complete, accurate, current evidence until there's no gap left for them to fill. Build the knowledge architecture. Reach the threshold.

9. **Negative Knowledge**
Knowing what's almost-right-but-wrong has asymmetric value. Documented failure modes and known anti-patterns sharpen the constraint space in ways that more examples of correct behavior cannot. Before a library is used, its known misuse patterns are as important as its API. Close off the plausible wrong answers, and the right one has nowhere left to hide.

10. **Deterministic Execution**
Ambiguity is the enemy of automation. A plan is only valid if a worker can execute it without asking clarifying questions. Test cases are defined with the design, not after the build. Atomic tasks, unambiguous acceptance criteria. If the builder guesses, the planner failed.

11. **Audit the Auditor**
The agent that builds the code cannot be trusted to validate it. Execution and validation require separate contexts. Independent agents pattern-match against the design to verify that the implementation matches intent — not just that it runs. Shared context between builder and reviewer is contaminated context.

12. **Entropy Control**
AI-generated code defaults to verbosity and repetition. The natural state of a codebase is entropy. Treat simplification and QA as distinct post-hoc production phases — dedicated passes to strip dead code, redundancy, and noise before they calcify into technical debt.

13. **Agency > Automation**
This system is an exoskeleton, not a replacement. The collaborative primitives are joint processes where you steer, not handoffs where you wait. There is no routing that tells you which one to reach for. That judgment is the work. You own the vision, the quality gates, the source hierarchy, and the final say. Execution scales. Judgment doesn't.

---

<a id="the-valence-workflow"></a>

### The Workflow

<img src="https://raw.githubusercontent.com/skillsets-cc/main/main/skillsets/%40supercollectible/Valence/assets_VALENCE/workflow-96.png"/>

Each phase produces a concrete artifact that the next phase consumes. Nothing builds until the design has been stress-tested across models with divergent evaluative biases, grounded against library docs and project conventions, and decomposed into tasks with unambiguous acceptance criteria. Multi-agent skills coordinate through Claude Code's native agent teams and task system — Opus leads never write code, Sonnet teammates execute in parallel tmux panes, and shared task lists handle sequencing and dependency tracking. Every skill is standalone — enter the workflow at any phase, skip what you don't need, or use individual skills in isolation.

<a id="arm"></a>

### [arm](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/arm/SKILL.md)

<img src="https://raw.githubusercontent.com/skillsets-cc/main/main/skillsets/%40supercollectible/Valence/assets_VALENCE/arm-flow.png"/>

`/arm [initial thoughts]` — Run this before `/arch` or `/solve` to turn raw ideas into a solid brief. Opus extracts requirements, constraints, non-goals, style, and key domain concepts — probing you on gaps and implicit assumptions rather than waiting passively. Ambiguities are resolved before they reach design phases. Output is a brief in `PROCESS_DOCS/briefs/`, ready to hand off to `/arch` for system-level decomposition or `/solve` for solution design.

---

<a id="arch"></a>

### [arch](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/arch/SKILL.md)

<img src="https://raw.githubusercontent.com/skillsets-cc/main/main/skillsets/%40supercollectible/Valence/assets_VALENCE/arch-flow.png"/>

`/arch [brief]` — Run this for greenfield projects or major restructuring. Opus decomposes your system into subsystems with contracts, constraints, and build order — but stops at the contract boundary. It defines what the subsystems are and how they relate, not how each one works internally. Each constraint is classified as hard, soft, or assumption — soft constraints get challenged, assumptions get validated. Research grounds the decomposition against project docs, library docs (Context7), and known failure modes (web search). You iterate on the architecture conversationally until alignment, then Opus formalizes it into a living spec and build manifest in `PROCESS_DOCS/arch/`. A built-in `/ar` pass stress-tests the spec before finalizing. Also the entry point for `/bugfest` tickets escalated as architectural flaws. Downstream, `/solve` designs each subsystem's internals against these contracts.

---

<a id="solve"></a>

### [solve](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/solve/SKILL.md)

<img src="https://raw.githubusercontent.com/skillsets-cc/main/main/skillsets/%40supercollectible/Valence/assets_VALENCE/solve-flow.png"/>

`/solve [brief/arch spec/ar report/escalated ticket]` — Run this to design a subsystem, feature, or complex change. Where `/arch` stops at contracts, `/solve` goes internal — data models, schemas, file structure, integration points, and implementation details. Works within upstream constraints from `/arch` when they exist, standalone from an `/arm` brief, or from a `/bugfest` ticket escalated as a subsystem design flaw. First principles deconstruction challenges assumptions, grounded research (project docs, Context7, web search) validates technical choices, and you iterate conversationally until alignment. Output is a design document in `PROCESS_DOCS/solutions/` with decision tables that record rationale and rejected alternatives. Hands off to `/ar` for stress-testing, then `/breakdown` for execution planning.

---

<a id="ar"></a>

### [ar](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/ar/SKILL.md)

<img src="https://raw.githubusercontent.com/skillsets-cc/main/main/skillsets/%40supercollectible/Valence/assets_VALENCE/ar-flow.png"/>

`/ar [document]` — Run this before `/breakdown` to validate a design under adversarial pressure. A single model can't see its own blind spots — `/ar` compensates by running three models with divergent evaluative biases in parallel. Where they disagree is where your assumptions are weakest. Opus filters noise from signal, validates each finding against the codebase, and delivers a REVISE or PROCEED recommendation. Report lands in `PROCESS_DOCS/reviews/`. Loop back to `/solve` on critical findings, or move to `/breakdown`. Ships with Kimi and GLM-5 alongside Opus — add other providers through the [external runner](#multi-model-infrastructure).

---

<a id="breakdown"></a>

### [breakdown](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/breakdown/SKILL.md)

<img src="https://raw.githubusercontent.com/skillsets-cc/main/main/skillsets/%40supercollectible/Valence/assets_VALENCE/breakdown-flow.png"/>

`/breakdown [design document]` — Run this after `/ar` approval to turn a design into build-ready execution docs. Opus splits the work into self-contained documents — one per build agent, ~5 tasks each, no file conflicts between groups — so agents can execute in parallel without stepping on each other. Each task specifies exact file paths, code examples showing the pattern, named test cases with setup and assertions, and explicit dependencies. If a build agent would need to guess, the breakdown isn't done. Output lands in `PROCESS_DOCS/breakdowns/`, ready for `/build`.

---

<a id="pmatch"></a>

### [pmatch](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/pmatch/SKILL.md)

<img src="https://raw.githubusercontent.com/skillsets-cc/main/main/skillsets/%40supercollectible/Valence/assets_VALENCE/pmatch-flow.png"/>

`/pmatch [source of truth] [target]` — Run this to check alignment between any combination of documents, directories, or files. Lighter than `/ar` — use it to validate breakdowns against designs, implementations against plans, or docs against code. Two agents (Sonnet and Kimi) independently extract claims from the source and verify each against the target. Where both agree on a violation, that's high confidence. Output is a claim-by-claim verdict: Matched, Gap, Partial, or Ambiguous. `/build` runs this automatically at the end to validate output against the breakdown.

---

<a id="build"></a>

### [build](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/build/SKILL.md)

<img src="https://raw.githubusercontent.com/skillsets-cc/main/main/skillsets/%40supercollectible/Valence/assets_VALENCE/build-flow.png"/>

`/build [execution dir]` — Run this after `/breakdown` to implement. Opus coordinates, Sonnets build — the lead never writes code. One agent per execution document, parallel when independent, sequenced when dependent, each in its own tmux pane. Agents code, test, verify acceptance criteria, and clean up per task. The build manifest updates at phase boundaries. If Phase 0 feasibility tests fail, the build halts and findings route back to `/arch`. When the team finishes, `/pmatch` validates output against the breakdown. See [Orchestration](#orchestration) for coordination patterns and [why Valence uses task-based isolation over worktrees](#why-not-worktrees).

---

<a id="post-build"></a>

### post-build

The post-build pipeline is entropy control — dedicated passes that strip dead code, enforce project patterns, update docs, and scan for vulnerabilities. Each step is a standalone primitive. Run them as an ordered pipeline — simplify before auditing, audit before docs — or swarm them in parallel against independent paths. Any combination, any scope.

<a id="denoise"></a>

#### [`/denoise`](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/code-simplifier)

<img src="https://raw.githubusercontent.com/skillsets-cc/main/main/skillsets/%40supercollectible/Valence/assets_VALENCE/denoise-flow.png"/>

`/denoise` — Run this first in the post-build pipeline. Opus orchestrates parallel `code-simplifier` agents (Anthropic plugin, not a Valence skill) that restructure recently changed code for clarity, consistency, and maintainability. Strips dead code, redundant comments, magic numbers, and unnecessary complexity. Run this before `/qf` or `/qb` so downstream auditors don't waste cycles flagging noise that's about to be deleted.

---

<a id="qa"></a>

#### [`/qf`](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/agents/qa-f.md) [`/qb`](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/agents/qa-b.md)

<img src="https://raw.githubusercontent.com/skillsets-cc/main/main/skillsets/%40supercollectible/Valence/assets_VALENCE/qa-flow.png"/>

`/qf` and `/qb` — Run these after `/denoise` to enforce project-specific patterns. Sonnet agents audit against your style guides in `.claude/resources/` — `/qf` covers frontend (design system, component patterns, accessibility, resource cleanup), `/qb` covers backend (API routes, data access, error handling, security). Populate the style guides for your stack; the agents audit against whatever conventions you define there. The style guides are living documents — keeping them fresh as your project evolves is on you.

---

<a id="qd"></a>

#### [`/qd`](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/agents/qa-docs.md)

<img src="https://raw.githubusercontent.com/skillsets-cc/main/main/skillsets/%40supercollectible/Valence/assets_VALENCE/qd-flow.png"/>

`/qd` — Run this after `/qf` or `/qb` to catch doc drift. Sonnet agents map module structure, compare each implementation against its docs, and update ARC and README files to match the current codebase. Docs that don't reflect the code are worse than no docs — `/qd` keeps them honest.

---

#### `/security-review`

> `/security-review` is a [native Claude Code command](https://www.anthropic.com/news/automate-security-reviews-with-claude-code), not a custom skill. It defaults to reviewing latest changes. To target specific files or directories, pass explicit paths: `/security-review src/auth/ src/api/routes.ts`. We are working on a custom solution for this.

---

<a id="bugfest"></a>

### [bugfest](https://github.com/skillsets-cc/main/blob/main/skillsets/%40supercollectible/Valence/content/.claude/skills/bugfest/SKILL.md)

<img src="https://raw.githubusercontent.com/skillsets-cc/main/main/skillsets/%40supercollectible/Valence/assets_VALENCE/bugfest-flow.png"/>

`/bugfest [bug description or ticket ID]` — Run this for bugs. Opus triages the symptom conversationally, traces through the code to root cause, and verifies the fix. Every bug gets a ticket in `PROCESS_DOCS/tickets/` with a persistent manifest — resume any ticket across sessions by passing its ID. An escalation gate classifies defects: code bugs get fixed in place, subsystem design flaws escalate to `/solve` (the ticket becomes the brief), architectural flaws escalate to `/arch` (the manifest gets updated with findings). The bar for escalation is high — if a code fix can resolve it, even across multiple files, it stays here.

---

## Your Responsibilities

You are the bottleneck, by design. Valence does not solve for offloading — it solves for leverage. The team surfaces structured signal and handles mechanical execution. Everything below stays with you.

- **Vision and direction.** What gets built and why — yours. The team works from your intent, not its own.
- **Complexity routing.** When to `/solve` vs `/build`, when to loop back to `/arch` vs patch in place, when to skip the workflow entirely — that's judgment, not automation.
- **Decision gates.** `/arm` produces a brief for sign-off. `/ar` surfaces critiques for triage. `/breakdown` produces a plan you approve before build agents start.
- **Style guides.** The frontend and backend style guides are living documents. Update them as your stack evolves — QA and build agents treat them as source of truth.
- **Git.** Commits, branches, rollbacks — your responsibility.
- **Supervision.** Agent teams are experimental. Expect occasional failures — missed messages, stalled tasks. Watch the team while it works. If you see `/arch`, `/solve`, or `/bugfest` going wrong — stop it. Contradicting mid-stream is cheaper than correcting a finished design doc.

---

## State Tracking & Auditability

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

<a id="orchestration"></a>

## Orchestration

Every multi-agent skill uses Claude Code's **agent teams** — lead creates a team, spawns teammates, monitors progress, never writes code itself. The task system is the coordination primitive. How teammates *use* it differs.

**Requirements**:
- `tmux` installed — each teammate runs in its own tmux pane with its own permission prompt
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in environment or `.claude/settings.local.json`

### Two Patterns

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

<a id="why-not-worktrees"></a>

### Why Not Worktrees?

Worktrees solve a human coordination failure: two developers touching the same file without realizing it. Agents don't have that failure mode. Task claiming is atomic — once claimed, scope is locked. Two agents may touch the same file (different functions, different sections) but they're writing different byte ranges. No branch means no merge means no conflict.

The critical inversion: **worktrees don't prevent conflicts — they manufacture the conditions for conflicts that didn't exist, then provide merge tooling to resolve them.** Branches require merging, merging produces conflicts. In a coordinated agent team the overhead is pure cost with zero safety benefit. Native agent teams depend on a shared working directory as their coordination surface — task list, mailbox, teammate lifecycle all assume one ground truth. Worktrees fragment that.

`/breakdown` reinforces this at plan time — tasks are grouped so no two agents edit the same file, and dependencies are explicit before any agent spawns. The isolation is proven before execution starts, not patched after the fact with merge tooling.

Worktrees still belong in the exploratory bucket: standalone subagents on spike work with no shared coordination surface. The mistake is reaching for them as the default parallel execution primitive when agents are actually coordinating. The task system is the isolation primitive for structured parallel work.

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

---

<a id="multi-model-infrastructure"></a>

## Valence_ext

`Valence_ext/` is the multi-model infrastructure that powers `/ar` and `/pmatch`. It's a provider-agnostic Node.js runner that drives external models with MCP tool access, direct API calls, and bidirectional tool-call normalization. Add any OpenAI-compatible provider by dropping in a profile.

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
| `glm-5` (via OpenRouter) | ar-glm5 | Alternative alignment, divergent priors, cost-effective |

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
