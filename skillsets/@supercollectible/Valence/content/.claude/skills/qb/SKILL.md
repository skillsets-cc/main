---
name: qb
description: Backend QA audit. Audits against backend_styleguide.md (API routes, data access, security). Migrates __tests__ to tests_[module].
argument-hint: "[path/to/file-or-dir]"
agents:
  - name: qa-b
    model: sonnet
    mode: bypassPermissions
---

## Phase Tracking

Before any work, create ALL tasks in full detail using `TaskCreate`. Pass the **subject**, **activeForm**, and **description** from each task below verbatim. Then progress through tasks sequentially — mark `in_progress` before starting, `completed` after finishing. Do not begin a task until the prior task is completed.

---

### Task 1: Evaluate scope and plan split

- **activeForm**: Evaluating scope
- **description**: Determine what needs auditing and how to split the work.

  If `$ARGUMENTS` is a directory, Glob for all implementation files under it (exclude `*.test.*`, `tests_*/`, `docs_*/`, `__tests__/`, `mocks/`). If it's a single file, audit that file only (one teammate, skip splitting). For directories, split by immediate parent directory — one teammate per directory. Directories with only 1-2 files can be merged with a sibling. List each group with its files before proceeding.

### Task 2: Create team and spawn auditors

- **activeForm**: Spawning auditors
- **description**: Use `TeamCreate` with name `qb`. Create one task per teammate using `TaskCreate`, listing its assigned files in the task description. Spawn teammates using `Task` with `subagent_type: qa-b`, `model: sonnet`, and `mode: bypassPermissions`.

  **Spawn prompt template:**
  ```
  Audit the following backend files:

  [LIST OF ASSIGNED FILES]

  When done, mark your task as completed and message the lead with your report.
  ```

  All teammates run in parallel — there are no dependencies between them since each owns a distinct set of files.

### Task 3: Shut down team

- **activeForm**: Cleaning up
- **description**: Once all teammates complete, send `shutdown_request` to each. After all have shut down, call `TeamDelete` to clean up the team.
