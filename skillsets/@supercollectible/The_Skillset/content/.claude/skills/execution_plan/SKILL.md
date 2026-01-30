---
name: execution_plan
description: Break approved designs into actionable implementation tasks
version: 1.0.0
---

# Execution Plan Skill

Converts approved design documents into detailed execution plans with atomic tasks and acceptance criteria.

## Purpose

Break complex features into manageable implementation chunks:
- Create 10-15 atomic tasks per feature
- Define clear acceptance criteria
- Establish dependencies and ordering
- Specify test requirements
- Set quality gate checkpoints

## Usage

```bash
/execution_plan PROCESS_DOCS/design/feature-design.md
```

## Prerequisites

- Design document must exist
- Adversarial review must be complete
- Critical issues must be resolved

## Output

Execution document in `PROCESS_DOCS/execution/{feature-name}-execution.md` containing:

### Task Structure
Each task includes:
- **Task ID**: Unique identifier (e.g., 1.1, 1.2)
- **Description**: Clear, actionable task description
- **Acceptance Criteria**: Measurable checkboxes for completion
- **Dependencies**: Which tasks must complete first
- **Estimated Effort**: Time estimate (15min - 2hr optimal)
- **Test Requirements**: What tests must be written

### Execution Phases
Tasks grouped into logical phases:
1. **Setup**: Infrastructure, dependencies, configuration
2. **Core Implementation**: Main functionality
3. **Integration**: Connect components
4. **Testing**: Comprehensive test coverage
5. **Documentation**: README, API docs, comments

## Task Guidelines

### Good Tasks
✅ Can be completed in 1-2 hours
✅ Have 3-5 clear acceptance criteria
✅ Include test requirements
✅ Single responsibility
✅ Independently verifiable

### Bad Tasks
❌ "Implement entire authentication system"
❌ "Fix all bugs"
❌ "Make it work"
❌ Vague or unmeasurable criteria
❌ Multiple unrelated responsibilities

## Example

**Input**:
```bash
/execution_plan PROCESS_DOCS/design/github-oauth-auth-design.md
```

**Output**: Execution plan with tasks like:

**Task 1.1: OAuth Configuration**
- [ ] Create GitHub OAuth app in settings
- [ ] Store client ID and secret in environment
- [ ] Configure callback URL
- [ ] Verify connection with test endpoint

**Task 1.2: OAuth Initiation**
- [ ] Create `/login` endpoint
- [ ] Generate CSRF state token
- [ ] Store state in KV with TTL
- [ ] Redirect to GitHub with params
- [ ] Test: Verify redirect includes state

## Best Practices

- Keep tasks atomic (one clear purpose)
- Make criteria measurable and specific
- Include test requirements for each task
- Order tasks by dependencies
- Plan for failure cases
- Budget time for testing and docs

## Next Steps

After generating execution plan:
1. Review task breakdown for completeness
2. Verify dependencies are correct
3. Assign to `@sonnet_builder` for implementation
4. Track progress through each task
5. Run `/quality_gate` when complete
