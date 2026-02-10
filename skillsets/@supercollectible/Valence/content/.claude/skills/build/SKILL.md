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

> **Requires** `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings or environment.

---

## Phase Tracking

Before any work, create all phase tasks upfront using `TaskCreate`. Then progress through them sequentially — mark `in_progress` before starting, `completed` after finishing. Do not begin a phase until the prior phase is completed.

| # | Subject | activeForm |
|---|---------|------------|
| 1 | Load execution doc and validate dependencies | Loading execution doc |
| 2 | Spawn build teammates | Spawning build teammates |
| 3 | Monitor teammates for failures | Monitoring teammates |
| 4 | Run post-build validation | Validating build output |

---

## Orchestration Workflow

### Phase 1: Load and Validate

#### 1. Load Execution Document
The user provides a single execution document from `/plan`:
- The doc contains top-level headers for each build agent (e.g., `## Build Agent 1`)
- Each section is self-contained and ready for implementation
- All tasks, dependencies, and acceptance criteria are already validated

#### 2. Validate Execution Order
Validate the stated dependencies between agent sections:
- **Parallel**: Independent sections → spawn teammates concurrently
- **Sequential**: If Section B depends on Section A → set task dependencies so B is blocked until A completes

#### 3. Create Tasks for Each Section
Create a task per execution section using `TaskCreate`. These are the **teammate tasks** — distinct from the phase tracking tasks above. Set `addBlockedBy` for any sequential dependencies so teammates can self-claim unblocked work.

### Phase 2: Spawn Teammates

Create an agent team and spawn one teammate per execution section. Use Sonnet for each teammate.

**CRITICAL: Pass the doc path, not the content.** The teammate reads the execution doc itself. Do NOT summarize, paraphrase, or re-encode the doc content into the spawn prompt. Summaries are lossy — the execution doc contains exact line numbers, exact code blocks, and exact acceptance criteria that must be read verbatim.

**Spawn prompt template** (use this exactly):

```
Read the execution document at [ABSOLUTE_PATH_TO_EXECUTION_DOC].
Implement the section "## Build Agent N: [Title]".
Working directory: [WORKING_DIRECTORY]

When done, mark your task as completed and message the lead with a summary.
```

After spawning all teammates, enter **delegate mode** (Shift+Tab) to restrict yourself to coordination-only tools: spawning, messaging, shutting down teammates, and managing tasks. Leads should lead, not code.

#### File Ownership
Ensure no two teammates edit the same file. The `/plan` execution doc already groups tasks to avoid file conflicts between sections. If you detect overlap, sequence those sections with task dependencies instead of running them in parallel.

### Phase 3: Monitor

While teammates work:
- Watch for messages from teammates reporting blockers or failures
- If a teammate gets stuck, message them with guidance or spawn a replacement
- If a teammate finishes, verify their task is marked completed and check for newly unblocked tasks
- Let teammates self-claim unblocked tasks — intervene only when needed

### Phase 4: Validation

Once all teammates complete and all tasks are marked done:

1. **Shut down teammates**: Ask each teammate to shut down gracefully
2. **Clean up the team**: Run team cleanup to remove shared resources
3. **Run post-build validation**:

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
