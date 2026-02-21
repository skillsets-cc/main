---
name: qf
description: Frontend QA audit against frontend_styleguide.md. Migrates __tests__ to tests_[module]. Checks Tailwind compliance, component patterns, resource cleanup, security, accessibility.
agents:
  - name: qa-f
    model: sonnet
---

## Phase Tracking

Create all tasks upfront using `TaskCreate`. Mark `in_progress` before starting, `completed` after finishing.

| # | Subject | activeForm |
|---|---------|------------|
| 1 | Create team and spawn frontend auditor | Spawning auditor |
| 2 | Shut down team | Cleaning up |

---

## Workflow

### Step 1: Create Team and Spawn

1. Use `TeamCreate` with name `qf`.
2. Create a task for the auditor using `TaskCreate`.
3. Spawn one teammate using `Task` with `subagent_type: "qa-f"`, `model: sonnet`, and `team_name`.

**Prompt**:

```
Audit the frontend module at $ARGUMENTS

When done, mark your task as completed and message the lead with your report.
```

### Step 2: Clean Up

Once the teammate completes, shut them down and clean up the team.
