---
name: qb
description: Backend/CLI QA audit. For site/ paths audits against workers_styleguide.md (API routes, KV, security). For cli/ paths audits against cli_styleguide.md (commands, error handling, install security). Migrates __tests__ to tests_[module].
agents:
  - name: qa-b
    model: sonnet
  - name: qa-cli
    model: sonnet
---

## Phase Tracking

Create all tasks upfront using `TaskCreate`. Mark `in_progress` before starting, `completed` after finishing.

| # | Subject | activeForm |
|---|---------|------------|
| 1 | Create team and spawn auditor | Spawning auditor |
| 2 | Shut down team | Cleaning up |

---

## Scope Detection

Determine the agent from `$ARGUMENTS`:

| Argument contains | Agent | Styleguide |
|-------------------|-------|------------|
| `cli` | `qa-cli` | `cli_styleguide.md` |
| anything else | `qa-b` | `workers_styleguide.md` |

## Workflow

### Step 1: Create Team and Spawn

1. Use `TeamCreate` with name `qb`.
2. Create a task for the auditor using `TaskCreate`.
3. Detect scope from `$ARGUMENTS` per the table above.
4. Spawn one teammate using `Task` with the detected `subagent_type`, `model: sonnet`, and `team_name`.

**Prompt**:

```
Audit the module at $ARGUMENTS

When done, mark your task as completed and message the lead with your report.
```

### Step 2: Clean Up

Once the teammate completes, shut them down and clean up the team.
