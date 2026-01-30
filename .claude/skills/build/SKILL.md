---
name: build
description: Implementation workflow. Orchestrates Sonnet build agents to implement execution plans. Use after /plan and /pmatch validation.
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Task, Bash, Write, Edit
argument-hint: "[path/to/execution-doc.md]"
---

# Opus Build Orchestration Protocol

## Your Role
You orchestrate Sonnet build agents to implement prevalidated execution plans. The document contains delegated sections for multiple build agents. Your job is to spawn agents for each section, monitor their progress, and validate their output.

## Orchestration Workflow

### Phase 1: Identify Execution Sections and Dependencies

#### 1. Load Execution Document
The user provides a single execution document from `/plan`:
- The doc contains top-level headers for each build agent (e.g., `## Build Agent 1`)
- Each section is self-contained and ready for implementation
- All tasks, dependencies, and acceptance criteria are already validated

#### 2. Validate Execution Order
Validate the stated dependencies between agent sections:
- **Sequential**: If Section B depends on Section A, spawn agents in order
- **Parallel**: If sections are independent, spawn agents concurrently

#### 3. Spawn Sonnet Build Agent Per Section
For each agent section in the execution document:
```typescript
// Conceptual - actual implementation uses Claude Code agent spawning
SpawnAgent({
  agent: "build-agent",
  model: "sonnet",
  protocol: "AGENT_build.md",
  context: [
    "DOCS/execution/[execution-doc].md", // The single execution doc
    ".claude/resources/frontend_styleguide.md", // or workers_styleguide.md or cli_styleguide.md
    "CLAUDE.md"
  ],
  instruction: "Implement the section '## Build Agent X' in the execution document following AGENT_build.md protocol"
})
```

### Phase 2: Monitor
Monitor agents for critical failures or stalls. If an agent gets stuck or reports a blocker, intervene. Otherwise, let them work.

### Phase 3: Validation
Once all agents complete, run the post-match validation:

```bash
/pmatch [execution_doc.md] [relevant modules]
```

This validates that the implementation matches the plan.

## Success Criteria

The build orchestration is successful when:
1. ✅ All execution sections completed by build agents
2. ✅ All acceptance criteria from all sections verified
3. ✅ All tests passing (unit, integration, e2e as specified)
4. ✅ No linting or type checking errors
5. ✅ Success metrics from all sections achieved
6. ✅ Build report generated with validation results
7. ✅ Cleanup pipeline initiated

## Remember

- **One agent per section** - Don't chunk further, `/plan` already did that
- **Respect dependencies** - Spawn agents sequentially if sections depend on each other
- **Document deviations** - If agents deviate from the plan, understand why
- **Integrate carefully** - Ensure all sections work together as a cohesive whole

---

## Reference

- [Frontend Style Guide](../../resources/frontend_styleguide.md)
- [Backend Style Guide](../../resources/backend_styleguide.md)
