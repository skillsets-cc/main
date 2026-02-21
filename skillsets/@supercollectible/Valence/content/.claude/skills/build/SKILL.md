---
name: build
description: Implementation workflow. Orchestrates an agent team to implement execution plans. Use after /plan and /pmatch validation.
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Task, Bash, Write, Edit
argument-hint: "[path/to/execution-doc.md]"
agents:
  - name: build
    model: sonnet
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
- **description**: Read the execution document provided by the user. The doc contains top-level headers for each build agent (e.g., `## Build Agent 1`). Each section is self-contained and ready for implementation. All tasks, dependencies, and acceptance criteria are already validated. Use `TeamCreate` with a descriptive name (e.g., `build-[feature]`).

### Task 2: Validate execution order and create teammate tasks

- **activeForm**: Creating teammate tasks
- **description**: Validate the stated dependencies between agent sections:
  - **Parallel**: Independent sections → will spawn teammates concurrently
  - **Sequential**: If Section B depends on Section A → set task dependencies so B is blocked until A completes

  Create one task per execution section using `TaskCreate`. These are the **teammate tasks** the build agents will complete. Set `addBlockedBy` for any sequential dependencies so teammates can self-claim unblocked work.

### Task 3: Spawn build teammates

- **activeForm**: Spawning build teammates
- **description**: Send a single message with one `Task` tool call per execution section. Use Sonnet for each teammate (from the `agents` field in this skill's headmatter).

  | Agent | `subagent_type` | `model` | `mode` |
  |-------|-----------------|---------|--------|
  | Build agent N | `build` | `sonnet` | (default) |

  **CRITICAL: Pass the doc path, not the content.** The teammate reads the execution doc itself. Do NOT summarize, paraphrase, or re-encode the doc content into the spawn prompt. Summaries are lossy — the execution doc contains exact line numbers, exact code blocks, and exact acceptance criteria that must be read verbatim.

  **Spawn prompt template** (use this exactly):

  ```
  Read the execution document at [ABSOLUTE_PATH_TO_EXECUTION_DOC].
  Implement the section "## Build Agent N: [Title]".
  Working directory: [WORKING_DIRECTORY]

  When done, mark your task as completed and message the lead with a summary.
  ```

  After spawning all teammates, enter **delegate mode** (Shift+Tab) to restrict yourself to coordination-only tools: spawning, messaging, shutting down teammates, and managing tasks. Leads should lead, not code.

  **File Ownership**: Ensure no two teammates edit the same file. The `/plan` execution doc already groups tasks to avoid file conflicts between sections. If you detect overlap, sequence those sections with task dependencies instead of running them in parallel.

### Task 4: Monitor teammates for failures

- **activeForm**: Monitoring teammates
- **description**: While teammates work:
  - Watch for messages from teammates reporting blockers or failures
  - If a teammate gets stuck, message them with guidance or spawn a replacement
  - If a teammate finishes, verify their task is marked completed and check for newly unblocked tasks
  - Let teammates self-claim unblocked tasks — intervene only when needed

### Task 5: Shut down teammates and clean up team

- **activeForm**: Shutting down team
- **description**: Send `shutdown_request` to all build teammates. After all have shut down, call `TeamDelete` to clean up the team.

### Task 6: Run post-build validation

- **activeForm**: Validating build output
- **description**: Run post-build validation to confirm the implementation matches the plan:

  ```
  /pmatch [execution_doc.md] [relevant modules]
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
- **One teammate per section** — don't chunk further, `/plan` already did that
- **Pass the doc path** — teammates read the execution doc themselves
- **Respect dependencies** — use task `blockedBy` for sequential sections
- **Avoid file conflicts** — two teammates editing the same file = overwrites
- **Document deviations** — if teammates deviate from the plan, understand why
- **Clean up** — shut down teammates before cleaning up the team

---

## Reference

- [Agent Teams Docs](https://code.claude.com/docs/en/agent-teams)
- [Frontend Style Guide](../../resources/frontend_styleguide.md)
- [Backend Style Guide](../../resources/backend_styleguide.md)
