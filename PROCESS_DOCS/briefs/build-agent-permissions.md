# Brief: Background Build Agents Cannot Write Files

## Context

The `/build` skill spawns Sonnet build agents via the `Task` tool with `run_in_background: true` to enable parallel execution. During the ghost-entries build, both Agent 2 (API Routes) and Agent 3 (Frontend) completed their research and produced correct implementations — but every Write, Edit, and Bash call was auto-denied:

```
Permission to use Write has been auto-denied (prompts unavailable).
Permission to use Bash has been auto-denied (prompts unavailable).
```

The agents burned ~110k tokens across both runs doing read-only research, then returned their implementations as text in the completion message. The orchestrator had to manually write all files.

## Root Cause

Background subagents (`run_in_background: true`) cannot prompt the user for tool permissions. When the user's permission mode requires interactive approval for Write/Bash/Edit, those tools are auto-denied because there is no interactive prompt channel available to a background task.

This is a Claude Code platform constraint, not a configuration bug.

## Impact

- Build agents are effectively read-only when running in background
- Parallel execution (the main benefit of background agents) is wasted — orchestrator must write everything sequentially anyway
- Token waste: agents do full research passes then fail at the write step
- Agent 1 succeeded in a prior session (likely ran in foreground or had pre-approved permissions)

## Options

### Option A: Run agents in foreground (sequential)

Remove `run_in_background: true` from agent spawns. Agents run one at a time, can prompt for permissions, and write their own files.

- **Pro**: Works with any permission mode, agents are fully autonomous
- **Con**: Loses parallelism. Agent 2 and 3 would run sequentially instead of concurrently.

### Option B: Pre-approve tools via allowedPrompts

The `/build` skill's `ExitPlanMode` call can declare `allowedPrompts` to pre-authorize Write/Bash/Edit for the session. Background agents would then inherit these approvals.

- **Pro**: Preserves parallelism
- **Con**: Requires understanding and using the `allowedPrompts` API correctly. May not work — needs testing.

### Option C: Hybrid — sequential for dependent, foreground for independent

Run Agent 1 in foreground (it's a dependency anyway). Run Agents 2 and 3 in foreground sequentially after. Accept the loss of parallelism as acceptable given the alternative is manual file-writing.

- **Pro**: Simple, reliable, no platform workarounds
- **Con**: Slower than true parallel

### Option D: User sets permissive tool mode before running /build

Document that `/build` requires pre-approved Write/Bash/Edit permissions (e.g., `--dangerously-skip-permissions` or tool allow-listing in settings). The orchestrator warns if permissions aren't set.

- **Pro**: Preserves parallelism, agents work autonomously
- **Con**: Requires user action before each build session

## Recommendation

**Option A (foreground sequential)** as the default, with a note in SKILL.md that parallel execution requires pre-approved tool permissions. The parallelism gain is modest (agents typically take 1-2 minutes each) compared to the cost of silent failure and manual intervention.

## Action Items

- [ ] Update `/build` SKILL.md to remove `run_in_background: true` from agent spawns
- [ ] Add a note in SKILL.md about pre-approving permissions for parallel mode
- [ ] Record this lesson in MEMORY.md
