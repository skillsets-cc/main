---
name: qf
description: Frontend QA audit against frontend_styleguide.md. Migrates __tests__ to tests_[module]. Checks Tailwind compliance, component patterns, resource cleanup, security, accessibility.
argument-hint: "[path/to/file-or-dir]"
agents:
  - name: qa-f
    model: sonnet
    mode: bypassPermissions
---

## Phase Tracking

Before any work, create ALL tasks in full detail using `TaskCreate`. Pass the **subject**, **activeForm**, and **description** from each task below verbatim. Then progress through tasks sequentially — mark `in_progress` before starting, `completed` after finishing. Do not begin a task until the prior task is completed.

---

### Task 1: Evaluate scope and plan split

- **activeForm**: Evaluating scope
- **description**: Determine what needs auditing and how to split the work.

  If `$ARGUMENTS` is a directory, Glob for all implementation files under it (exclude `*.test.*`, `tests_*/`, `docs_*/`, `__tests__/`, `mocks/`). If it's a single file, audit that file only (one teammate, skip splitting).

  **Grouping rules** (apply in order):
  1. Group files by immediate parent directory.
  2. If a group has **more than 5 files**, split it into subgroups of ~5 files each.
  3. If a group has **1-2 files**, merge it with a sibling group (prefer the smallest sibling, but never exceed 5).
  4. Target: each teammate gets **3-5 files**.

  List each group with its files before proceeding.

### Task 2: Create team and spawn auditors

- **activeForm**: Spawning auditors
- **description**: Use `TeamCreate` with name `qf`. Create one task per teammate using `TaskCreate`, listing its assigned files in the task description. **Each teammate must use `subagent_type: qa-f`, `model: sonnet`, and `mode: bypassPermissions`.**

  **Spawn prompt template:**
  ```
  Audit the following frontend files:

  [LIST OF ASSIGNED FILES]

  When done, mark your task as completed and message the lead with your report.
  ```

  All teammates run in parallel — there are no dependencies between them since each owns a distinct set of files.

### Task 3: Shut down team

- **activeForm**: Cleaning up
- **description**: Once all teammates complete, send `shutdown_request` to each. After all have shut down, call `TeamDelete` to clean up the team.
