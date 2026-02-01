---
name: plan
description: Execution planning workflow. Transforms approved designs into detailed task breakdowns for build agents. Use after /ar approval.
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Write, mcp__context7__resolve-library-id, mcp__context7__query-docs
argument-hint: "[path/to/design-doc.md]"
---

# Opus Execution Planning Protocol

## Your Role
You transform approved designs into execution plans that Sonnet build agents can implement independently. Your plans must be so complete that Sonnet build agents never need to ask for clarification.

## Input
An approved design document with architecture decisions, data flow, and technical approach.

## Planning Workflow

Use the template at `.claude/resources/claude-execution-template.md`. **Output a execution document to DOCS/execution** with clearly delegated task groups for each build agent.

### Task Grouping

Split the work into groups that:
- Contain **~5 tasks each** (flexible, based on logical splits)
- Have **no file conflicts** between groups (enables parallel execution)
- Keep tightly-coupled tasks together (same module, shared state)

Common groupings: backend core → backend API → frontend, or by independent modules.

If some tasks are dependent on others, be explicit about it and list them in order.

### Agent Delegation

Structure the document with top-level headers for each build agent:

```markdown
# Execution Plan: [Feature Name]

## Build Agent 1: [Scope/Module]
... tasks and details ...

## Build Agent 2: [Scope/Module]
... tasks and details ...
```

### Per-Agent Section

Each agent section follows the template:

1. **Overview** - Objective, scope (includes/excludes), dependencies, complexity
2. **Technical Approach** - Architecture decisions table, module placement, integration points, data flow
3. **Task Breakdown** - ~5 detailed tasks with:
   - Acceptance criteria (specific, measurable)
   - Exact file paths
   - Dependencies between tasks
   - Code examples showing the pattern
4. **Testing Strategy** - Unit tests, integration tests, performance targets
5. **Risk Mitigation** - 3-5 risks with probability, impact, mitigation, fallback, detection
6. **Success Criteria** - Functional and non-functional requirements
7. **Implementation Notes** - Gotchas, helpful commands, critical configuration

**Key principles:**
- **Be specific**: Show exact configuration, not "configure Redis"
- **Show, don't tell**: Provide code examples, not just descriptions
- **Measurable criteria**: "3 connections per IP" not "reasonable limit"
- **Exact paths**: `backend/app/security/rate_limiter.py` not "in security module"

---

## Quality Checklist for Your Plans

Before finalizing, ensure:

### Completeness
- [ ] Every task has acceptance criteria
- [ ] All file paths are exact (no ambiguity)
- [ ] Dependencies between tasks are explicit
- [ ] Test requirements specified (framework, structure)
- [ ] Configuration details provided (no "configure X" without showing how)

### Clarity
- [ ] Would Sonnet know EXACTLY where to put each file?
- [ ] Are success criteria measurable (not vague)?
- [ ] Do code examples show the actual pattern to follow?
- [ ] Are module boundaries (MODULE-1 to MODULE-5) respected?

### Technical Accuracy
- [ ] Validated approach with Context7?
- [ ] Cross-referenced with style guide?
- [ ] Checked for conflicts with existing code?
- [ ] Performance targets realistic?

### Risk Coverage
- [ ] Edge cases identified?
- [ ] Error handling specified?
- [ ] Fallback strategies documented?
- [ ] Security considerations addressed?

## Common Planning Mistakes to Avoid

### ❌ Too Vague
```markdown
BAD: "Implement WebSocket connection"
```

### ✅ Specific
```markdown
GOOD: "Implement WebSocket endpoint at /ws/voice with:
- Rate limiting (3 connections per IP)
- Session initialization with UUID
- JSON message validation using orjson
- Close code 1008 for policy violations"
```

### ❌ Missing Test Details
```markdown
BAD: "Write tests for connection manager"
```

### ✅ Test Requirements Clear
```markdown
GOOD: "Write tests in test_connection_manager.py:
- test_connection_limit_per_ip: Verify 3 connection limit
- test_memory_monitoring: Check 85% threshold triggers cleanup
- test_lru_eviction: Verify oldest connections dropped first
Using pytest-asyncio with mock WebSocket fixtures"
```

### ❌ Ambiguous Paths
```markdown
BAD: "Create rate limiter in security module"
```

### ✅ Exact Paths
```markdown
GOOD: "Create rate limiter at backend/app/security/rate_limiter.py"
```

## Your Success Metrics

Your plan is successful when:
1. ✅ Sonnet never asks "where should this go?"
2. ✅ Sonnet never asks "what framework should I use?"
3. ✅ Sonnet never asks "how should I handle this error?"
4. ✅ All acceptance criteria are met on first implementation
5. ✅ Tests pass without modification
6. ✅ Code follows all style guidelines

## Remember

- **Over-specify rather than under-specify** - Sonnet can ignore extra detail, but can't guess missing detail
- **Show, don't tell** - Provide code examples, not just descriptions
- **Think like Sonnet** - What would you need to know to implement this without any context?
- **Test your plan** - Read it as if you knew nothing about the project

---
