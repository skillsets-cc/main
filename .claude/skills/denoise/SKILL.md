---
name: denoise
description: Post-implementation cleanup using the code-simplifier plugin.
agents:
  - name: code-simplifier
    model: opus
---

## Phase Tracking

Create all tasks upfront using `TaskCreate`. Mark `in_progress` before starting, `completed` after finishing.

| # | Subject | activeForm |
|---|---------|------------|
| 1 | Create team and spawn simplifier | Spawning simplifier |
| 2 | Shut down team | Cleaning up |

---

## Workflow

### Step 1: Create Team and Spawn

1. Use `TeamCreate` with name `denoise`.
2. Create a task for the simplifier using `TaskCreate`.
3. Spawn one teammate using `Task` with `subagent_type: "code-simplifier"`, `model: opus`, and `team_name`.

**Prompt**:

```
Simplify and refine code in $ARGUMENTS for clarity, consistency, and maintainability while preserving all functionality. Focus on recently modified code unless instructed otherwise.

When done, mark your task as completed and message the lead with a summary.
```

If no path argument is provided, target the current working directory.

### Step 2: Clean Up

Once the teammate completes, shut them down and clean up the team.
