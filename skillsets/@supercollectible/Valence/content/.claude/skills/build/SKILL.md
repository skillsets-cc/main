---
name: build
description: Implementation workflow. Orchestrates an agent team to implement execution breakdowns. Use after /breakdown and /pmatch validation.
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Task, Bash, Write, Edit
argument-hint: "[path/to/execution-dir/]"
agents:
  - name: build
    model: sonnet
    mode: bypassPermissions
---

# Opus Build Orchestration Protocol

## Your Role
You are the **team lead**. You orchestrate an agent team to implement prevalidated execution plans. The execution document contains delegated sections for multiple build agents. Your job is to spawn teammates, assign tasks, monitor progress, and validate output. **You do not write code yourself** — you coordinate.

---

## Phase Tracking

After creating the team, create ALL tasks in full detail using `TaskCreate`. Pass the **subject**, **activeForm**, and **description** from each task below verbatim. Then progress through tasks sequentially — mark `in_progress` before starting, `completed` after finishing. Do not begin a task until the prior task is completed.

---

### Task 1: Create team

- **activeForm**: Creating team
- **description**: The user provides a path to an execution directory (e.g., `PROCESS_DOCS/breakdowns/feature-name/`). This directory contains one self-contained doc per build agent: `01-<scope>.md`, `02-<scope>.md`, etc.

  List the agent docs to determine how many teammates to spawn. Use `TeamCreate` with a descriptive name (e.g., `build-[feature]`).

### Task 2: Validate execution order and create teammate tasks

- **activeForm**: Creating teammate tasks
- **description**: Read each numbered agent doc's **Dependencies** section to determine execution order:
  - **Parallel**: Docs with "None (parallel)" → will spawn teammates concurrently
  - **Sequential**: If `02-frontend.md` depends on `01-backend.md` → set task dependencies so the frontend task is blocked until backend completes

  **Locate the arch manifest**: Check `PROCESS_DOCS/arch/` for a `.manifest.yaml` file. If found, note the path — you'll update it at phase boundaries (Task 4). If no manifest exists, skip manifest updates (the project may not use `/arch`).

  Create one task per agent doc using `TaskCreate`. Set `addBlockedBy` for any sequential dependencies so teammates can self-claim unblocked work.

### Task 3: Spawn build teammates

- **activeForm**: Spawning build teammates
- **description**: Send a single message with one `Task` tool call per agent doc. Use `subagent_type`, `model`, and `mode` from the `agents` field in this skill's frontmatter.

  **CRITICAL: Pass the doc path, not the content.** The teammate reads its agent doc itself. Do NOT summarize, paraphrase, or re-encode any doc content into the spawn prompt. The docs contain exact code blocks, exact acceptance criteria, and exact file paths that must be read verbatim.

  **Spawn prompt template** (use this exactly):

  ```
  Read the execution document at [ABSOLUTE_PATH_TO_DIR]/[NN-scope.md].
  Implement all tasks in this document.
  Working directory: [WORKING_DIRECTORY]

  When done, mark your task as completed and message the lead with a summary.
  ```

  After spawning all teammates, enter **delegate mode** (Shift+Tab) to restrict yourself to coordination-only tools: spawning, messaging, shutting down teammates, and managing tasks. Leads should lead, not code.

  **File Ownership**: Ensure no two teammates edit the same file. The `/breakdown` execution docs already group tasks to avoid file conflicts between agents. If you detect overlap, sequence those agents with task dependencies instead of running them in parallel.

### Task 4: Monitor teammates and update manifest

- **activeForm**: Monitoring teammates
- **description**: While teammates work:
  - Watch for messages from teammates reporting blockers or failures
  - If a teammate gets stuck, message them with guidance or spawn a replacement
  - If a teammate finishes, verify their task is marked completed and check for newly unblocked tasks
  - Let teammates self-claim unblocked tasks — intervene only when needed

  **Manifest updates** (if arch manifest was found in Task 2):
  - When a phase **starts**: set the corresponding subsystem status to `building`
  - When a phase **completes**: set status to `done`
  - When a phase **fails**: set status to `failed` and add notes describing what went wrong
  - Update top-level `status` to `building` when first phase starts, `complete` when all phases finish, `failed` on any failure that halts the build

  **Phase 0 — scaffold + feasibility:**
  The first execution chunk (Phase 0) scaffolds the project and runs feasibility tests against the architecture's assumptions. Phase 0 has two outcomes:

  **If feasibility passes**: Update manifest — set Phase 0 to `done`. Mark Phase 0 task as completed. Proceed to later phases normally.

  **If feasibility fails**: The architecture's constraints or contracts don't hold. Do NOT continue to later phases. Instead:
  1. Collect the failure details from the teammate (what failed, why, which architectural assumption was invalidated)
  2. Update manifest — set Phase 0 to `failed` with notes summarizing the failure
  3. Append detailed findings to the arch spec (`PROCESS_DOCS/arch/[project-name].md`) under a `## Feasibility Failures` section
  4. Shut down all teammates and clean up the team
  5. Advise the user: *"Phase 0 feasibility tests failed. Manifest and arch spec updated. Loop back to `/arch` to revisit the architecture before re-planning."*

### Task 5: Shut down teammates and clean up team

- **activeForm**: Shutting down team
- **description**: Send `shutdown_request` to all build teammates. After all have shut down, call `TeamDelete` to clean up the team.

### Task 6: Run post-build validation

- **activeForm**: Validating build output
- **description**: Run post-build validation to confirm the implementation matches the plan:

  ```
  /pmatch [execution_dir/] [relevant modules]
  ```

  This validates that the implementation matches the plan.

## Success Criteria

The build orchestration is successful when:
1. All execution sections completed by teammates
2. All acceptance criteria from all sections verified
3. All tests passing (unit, integration, e2e as specified)
4. No linting or type checking errors
5. Success metrics from all sections achieved
6. Team cleaned up, no orphaned sessions
7. Post-build /pmatch validation passed

## Remember

- **You are the lead, not a builder** — delegate mode, don't write code
- **One teammate per agent doc** — don't chunk further, `/breakdown` already did that
- **Pass the doc path** — teammates read their agent doc themselves
- **Respect dependencies** — use task `blockedBy` for sequential sections
- **Avoid file conflicts** — two teammates editing the same file = overwrites
- **Document deviations** — if teammates deviate from the plan, understand why
- **Clean up** — shut down teammates before cleaning up the team
- **Phase 0 failures are architecture failures** — update the manifest, append findings to the arch spec, and advise `/arch` — don't push through
- **Update the manifest** — if an arch manifest exists, keep it current at every phase boundary

---

## Reference

- [Agent Teams Docs](https://code.claude.com/docs/en/agent-teams)
- [Frontend Style Guide](../../resources/frontend_styleguide.md)
- [Backend Style Guide](../../resources/backend_styleguide.md)
