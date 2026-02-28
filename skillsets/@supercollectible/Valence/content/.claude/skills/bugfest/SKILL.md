---
name: bugfest
description: Debugging protocol. Triage, root-cause, and fix bugs. Creates tickets in PROCESS_DOCS/tickets/ with YAML manifest tracker. Use for known bugs, regressions, or unexpected behavior.
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, AskUserQuestion, WebSearch, WebFetch, mcp__context7__resolve-library-id, mcp__context7__query-docs
argument-hint: "[bug description or ticket ID to resume]"
---

# Debugging Protocol

You diagnose and fix bugs through structured triage, root-cause analysis, and verified fixes. Every bug gets a ticket. Every ticket gets tracked in the manifest.

**Input**: Either a bug description (new ticket) or a ticket ID (resume existing). If given a ticket ID, read the ticket and resume from the earliest incomplete section.

**Tools:** Code navigation (Read, Glob, Grep), execution (Bash for tests only), editing (Edit, Write), dialog (AskUserQuestion), research (WebSearch, Context7).

---

## Phase Tracking

Before any work, create ALL tasks in full detail using `TaskCreate`. Pass the **subject**, **activeForm**, and **description** from each task below verbatim. Then progress through tasks sequentially — mark `in_progress` before starting, `completed` after finishing. Do not begin a task until the prior task is completed.

---

### Task 1: Triage the bug

- **activeForm**: Triaging bug
- **description**: Start with dialog. The input is a bug description, error output, or vague "something's broken" — either way, extract what you need through conversation before writing anything down.

  **Probe for:**

  ```yaml
  triage_probes:
    - category: Symptom
      extract: What exactly happens? What did the user see?
      ask: "What's the actual error or wrong behavior?"
    - category: Expected
      extract: What should happen instead?
      ask: "What were you expecting to see?"
    - category: Reproduction
      extract: Steps to trigger it, how reliably
      ask: "Can you reproduce it? What's the exact sequence?"
    - category: Context
      extract: When it started, what changed recently
      ask: "Did this work before? What changed?"
    - category: Scope
      extract: How widespread, who's affected
      ask: "Does this happen everywhere or just in one case?"
    - category: Attempts
      extract: What the user already tried
      ask: "Have you tried anything to fix or work around it?"
  ```

  Use `AskUserQuestion` for structured choices when narrowing down the area (e.g., "Which module does this touch?"). Use conversational follow-ups for open-ended exploration. Drive the dialog — don't wait passively.

  **Economic termination**: The user sets the floor. If they arrive with a stack trace and exact repro steps, acknowledge what they've given you and move on — don't re-ask what's already answered. If they arrive with "it feels broken," probe until you have enough to start. Minimum viable triage: a symptom you can act on and a rough idea of where to look. Reproduction and severity can be established during context (Task 3) if the user doesn't have them upfront.

### Task 2: Create ticket and manifest entry

- **activeForm**: Creating ticket
- **description**: Now that the bug is understood, write it down. Diagnosis comes later — this is symptom recording with the clarity gained from triage.

  **2.1 Determine ticket ID**
  Read `PROCESS_DOCS/tickets/manifest.yaml`. If it doesn't exist, create it with an empty `tickets: []` list. Find the highest existing ID and increment by 1.

  **2.2 Create ticket file**
  Write `PROCESS_DOCS/tickets/NNN-slug.md` using the template at `.claude/resources/ticket_template.md`. Fill in:
  - **Title**: concise description of the symptom
  - **Reported Symptom**: what the user described, distilled from triage
  - **Reproduction Steps**: from triage conversation
  - **Severity**: `critical` | `high` | `medium` | `low` — established during triage
  - Leave Root Cause, Affected Surface, Fix Plan, and Resolution sections empty

  **2.3 Add manifest entry**
  Append to `PROCESS_DOCS/tickets/manifest.yaml`:
  ```yaml
  - id: [N]
    title: "[symptom summary]"
    severity: [level]
    status: open
    ticket: "NNN-slug.md"
  ```

### Task 3: Establish context

- **activeForm**: Establishing context
- **description**: Understand the system around the bug before diagnosing it. You need to know what *should* happen before you can find where it diverges.

  **Source weights** (when sources conflict, higher weight wins):

  ```yaml
  source_weights:
    - weight: 1.5
      source: Local docs (project)
      purpose: Module ARCs, per-file docs, existing patterns
    - weight: 1.4
      source: Library docs (Context7)
      purpose: Platform behavior, API contracts
    - weight: 1.0
      source: Web search
      purpose: Known issues, failure modes, similar bugs
  ```

  **3.1 Map the affected area**
  - Identify which module(s) the symptom touches
  - Read the module README and ARC doc for architecture context
  - Read per-file docs for the specific files involved
  - Read relevant tests — what's already covered?

  **3.2 Understand the contract**
  - What is this code supposed to do? What are the inputs and outputs?
  - What invariants should hold?
  - Where does this module connect to others?

  **3.3 Update ticket**
  Fill in the **Affected Surface** section of the ticket:
  - Modules involved
  - Key files and functions
  - Data flow through the affected area
  - Relevant contracts and invariants

### Task 4: Root cause analysis

- **activeForm**: Analyzing root cause
- **description**: Find where reality diverges from the contract. Apply first-principles debugging — don't assume the bug is where it looks like it is.

  **4.1 Trace** — follow the data flow from input to symptom
  - Start from the entry point (user action, API call, CLI command)
  - Trace through each layer until you find where the actual behavior diverges from the expected behavior
  - Use Grep and Read to follow the code path — don't guess

  **4.2 Challenge** — is this the real cause?

  ```yaml
  challenge_questions:
    - question: Is the symptom the bug, or downstream of the bug?
      why: Fixing the symptom without fixing the cause means it recurs
    - question: Is this a code defect or a design flaw?
      why: Code defects get fixed here; design flaws escalate at Task 5
    - question: Could this be a dependency issue?
      why: Check library versions, platform behavior changes
    - question: Is the test suite wrong?
      why: Sometimes the test encodes the bug as "correct" behavior
  ```

  **4.3 Isolate** — confirm the root cause
  - Can you construct the minimal input that triggers the divergence?
  - Does the explanation account for ALL observed symptoms?
  - Are there other code paths affected by the same root cause?

  **4.4 Update ticket**
  Fill in the **Root Cause** section:
  - The actual defect (not the symptom)
  - Why it happens (the mechanism)
  - Whether it's a code defect or design flaw

### Task 5: Escalation gate

- **activeForm**: Evaluating escalation
- **description**: After root cause analysis, classify the defect and route accordingly. Most bugs are code defects — the default is to continue. Escalation is the exception, not the rule.

  **5.1 Classify the defect**

  ```yaml
  classification:
    fix_here:  # → proceed to Task 6
      - type: Code defect
        signal: Design is correct, code is wrong. Contract holds, implementation doesn't match.
        examples: [wrong conditional, off-by-one, missing null check, misused API, stale cache, race condition]
      - type: Missing edge case
        signal: Happy path works, valid input or state not handled. Design accounts for it or should trivially.
        examples: [unhandled error code, missing boundary validation, timeout not set]
      - type: Regression
        signal: Previously working code broken by recent change. Design didn't change, implementation drifted.
        examples: [refactor broke a caller, dependency update changed behavior]
      - type: Test gap
        signal: Behavior is wrong but no test covers it. Fix is code + test.
        examples: [untested branch, missing integration test]
      - type: Dependency-induced
        signal: Library or platform behaves differently than expected. Fix is adapting our code, not redesigning.
        examples: [API deprecation, version incompatibility, platform quirk]
    escalate:
      - type: Solve-level flaw
        signal: Internal subsystem design is wrong. Arch contract is fine, but subsystem can't deliver it with current internal structure.
        examples: [wrong data model, wrong algorithm choice, abstraction that can't handle actual data shape]
        route: /solve
      - type: Arch-level flaw
        signal: Macro decomposition is wrong. Wrong contract, wrong subsystem boundary, or constraint that can't hold.
        examples: [subsystem needs data it has no contract to receive, circular dependency, physically impossible constraint]
        route: /arch
  ```

  **The bar for escalation is high.** If the root cause can be fixed by changing code within the existing design — even if the fix is ugly, even if it reveals a test gap, even if it touches multiple files — it's a code defect. Escalate only when a code fix would be a patch over a structural problem that will recur.

  **If code defect** (including edge cases, regressions, test gaps, dependency issues): Proceed to Task 6.

  **If solve-level flaw**:
  1. Expand the ticket's Root Cause section with the design findings — what's wrong with the internal design, what needs to change, and why a code fix won't hold. The ticket becomes the `/solve` brief.
  2. Update the ticket status to `escalated` in `PROCESS_DOCS/tickets/manifest.yaml`
  3. Tell the user: *"Root cause is a design flaw in [subsystem]. Ticket expanded as a `/solve` brief."*
  4. Stop — do not proceed to Task 6.

  **If arch-level flaw**:
  1. Update the arch manifest (`PROCESS_DOCS/arch/[project].manifest.yaml`) — add notes to the affected subsystem describing the finding
  2. Expand the ticket's Root Cause section with the architectural finding
  3. Update the ticket status to `escalated` in `PROCESS_DOCS/tickets/manifest.yaml`
  4. Tell the user: *"Root cause is an architecture-level flaw in [subsystem]. Arch manifest updated. This needs `/arch`."*
  5. Stop — do not proceed to Task 6.

### Task 6: Design fix

- **activeForm**: Designing fix
- **description**: Plan the fix before implementing it. Minimal, targeted changes — fix the bug, don't refactor the neighborhood.

  **6.1 Determine changes**
  - What's the minimal set of changes that fixes the root cause?
  - List exact files and functions to modify

  **6.2 Assess blast radius**
  - What else touches the code you're changing?
  - What tests cover this code path?
  - What could regress?

  **6.3 Update ticket**
  Fill in the **Fix Plan** section:
  - Files to change, with specific descriptions
  - New or modified tests
  - Blast radius assessment

  **6.4 Confirm with user**
  Present the fix plan conversationally. Use `AskUserQuestion` if there are trade-offs to resolve. Get explicit approval before implementing.

### Task 7: Implement and verify

- **activeForm**: Implementing fix
- **description**: Make the changes. Run the tests. Confirm the fix.

  **7.1 Implement**
  - Make the changes described in the fix plan
  - Write or update tests to cover the bug — the test should fail without the fix and pass with it
  - Keep changes minimal and focused

  **7.2 Verify**
  - Run the relevant test suite (`cd [module] && npm test` or equivalent)
  - Confirm the symptom is resolved
  - Confirm no regressions in related tests
  - If tests fail: diagnose, fix, re-run. Do not proceed with failing tests.

### Task 8: Close ticket and update manifest

- **activeForm**: Closing ticket
- **description**: Wrap up the ticket with a resolution record and update the manifest.

  **8.1 Update ticket**
  Fill in the **Resolution** section:
  - What was changed (file list with one-line summaries)
  - Tests added or modified
  - If the fix revealed something systemic (a pattern of bugs, a fragile module, missing test coverage), add a **Postmortem** note — that's signal for future `/arch` or `/solve` work

  **8.2 Update manifest**
  Set ticket status to `resolved` in `PROCESS_DOCS/tickets/manifest.yaml`.

