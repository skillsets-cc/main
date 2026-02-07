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

**CRITICAL: Pass the doc path, not the content.** The build agent reads the execution doc itself. The orchestrator MUST NOT summarize, paraphrase, or re-encode the execution doc content into the agent prompt. Summaries are lossy — the execution doc contains exact line numbers, exact code blocks, and exact acceptance criteria that must be read verbatim by the agent.

For each agent section, use the Task tool with `subagent_type: "build"` and a prompt that contains ONLY:
1. The execution doc file path
2. The section header to implement (e.g., `## Build Agent 1: ...`)
3. The working directory

```
Task prompt template (use this exactly):

  Read the execution document at [ABSOLUTE_PATH_TO_EXECUTION_DOC].
  Implement the section "## Build Agent N: [Title]".
  Working directory: [WORKING_DIRECTORY]
```

The build agent protocol (AGENT_build.md) handles everything else — it will read the doc, create todos from the tasks, implement them in order, and run tests. Do not duplicate that logic in the prompt.

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
