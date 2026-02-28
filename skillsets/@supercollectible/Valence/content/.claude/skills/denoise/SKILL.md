---
name: denoise
description: Post-implementation cleanup using the code-simplifier plugin.
argument-hint: "[path/to/file-or-dir]"
agents:
  - name: code-simplifier
    model: opus
    mode: bypassPermissions
---

# Denoise Protocol

## Phase Tracking

Before any work, create ALL tasks in full detail using `TaskCreate`. Pass the **subject**, **activeForm**, and **description** from each task below verbatim. Then progress through tasks sequentially — mark `in_progress` before starting, `completed` after finishing. Do not begin a task until the prior task is completed.

---

### Task 1: Evaluate scope and plan split

- **activeForm**: Evaluating scope
- **description**: Determine what needs simplifying and how to split the work.

  If `$ARGUMENTS` is a directory, Glob for all source files under it (exclude `docs_*/`). If it's a single file, simplify that file only (one teammate, skip splitting). For directories, split by immediate parent directory — one teammate per directory. Directories with only 1-2 files can be merged with a sibling. List each group with its files before proceeding.

### Task 2: Create team and spawn simplifiers

- **activeForm**: Spawning simplifiers
- **description**: Use `TeamCreate` with name `denoise`. Create one task per teammate using `TaskCreate`, listing its assigned files in the task description. Spawn teammates using `subagent_type`, `model`, and `mode` from the `agents` field in this skill's frontmatter.

  **Spawn prompt template:**
  ```
  Simplify and refine the following files for clarity, consistency, and maintainability while preserving all functionality:

  [LIST OF ASSIGNED FILES]

  When done, mark your task as completed and message the lead with a summary.
  ```

  All teammates run in parallel — there are no dependencies between them since each owns a distinct set of files.

### Task 3: Shut down team

- **activeForm**: Cleaning up
- **description**: Once all teammates complete, send `shutdown_request` to each. After all have shut down, call `TeamDelete` to clean up the team.
