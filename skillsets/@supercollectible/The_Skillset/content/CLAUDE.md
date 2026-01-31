# The_Skillset: Spec-Driven SDLC Protocol

This skillset implements a rigorous, spec-driven software development lifecycle that ensures production-ready code through adversarial review, quality gates, and multi-model validation.

## Core Principles

1. **Design Before Code**: No implementation without an approved design document
2. **Adversarial Validation**: Every design is challenged before implementation
3. **Atomic Tasks**: Work is broken into small, verifiable units (10-15 per feature)
4. **Test-Driven Development**: Tests written with code, not after
5. **Quality-Gated Progress**: High friction ensures high quality

## Workflow Phases

### Phase 1: Design & Specification

Use the `/design_spec` skill to create comprehensive design documents:

```bash
/design_spec "Feature description here"
```

**Output**: Design document in `PROCESS_DOCS/design/` containing:
- Problem statement and requirements
- Architecture and component design
- API contracts and data models
- Success criteria and acceptance tests
- Risk analysis and mitigation strategies

**Agent**: `@opus_designer` — Leverages Claude Opus for architectural thinking

### Phase 2: Adversarial Review

Challenge the design with `/adversarial_review` to catch issues early:

```bash
/adversarial_review PROCESS_DOCS/design/your-design.md
```

**What it does**:
- Identifies edge cases and failure modes
- Challenges assumptions and design decisions
- Suggests improvements and alternatives
- Ensures completeness and consistency

**Agent**: `@adversarial_reviewer` — Takes an oppositional stance to find weaknesses

**Outcome**: Design is either approved (with improvements) or sent back for revision

### Phase 3: Execution Planning

Convert approved design into actionable tasks with `/execution_plan`:

```bash
/execution_plan PROCESS_DOCS/design/your-design.md
```

**Output**: Execution document in `PROCESS_DOCS/execution/` with:
- 10-15 atomic tasks per feature
- Clear acceptance criteria for each task
- Dependencies and execution order
- Test requirements
- Quality gate checkpoints

**Agent**: `@opus_designer` — Breaks complexity into manageable chunks

### Phase 4: Implementation

Execute the plan with `@sonnet_builder` agent:

```bash
@sonnet_builder implement PROCESS_DOCS/execution/your-execution.md
```

**Process**:
1. Agent reads execution document
2. Implements tasks sequentially
3. Writes tests alongside code
4. Verifies acceptance criteria
5. Reports progress and blockers

**Agent**: `@sonnet_builder` — Leverages Claude Sonnet for efficient implementation

### Phase 5: Quality Gates

Verify completion with `/quality_gate`:

```bash
/quality_gate PROCESS_DOCS/execution/your-execution.md
```

**Checks**:
- All tasks completed
- All tests passing
- Acceptance criteria met
- Documentation complete
- No linting errors
- Code coverage targets hit

**Outcome**: Feature approved for merge or sent back for fixes

## Skills Reference

### `/design_spec`
**Purpose**: Generate comprehensive design specifications
**Input**: Feature description and requirements
**Output**: Design document in `PROCESS_DOCS/design/`
**When to use**: At the start of any new feature or major change

### `/adversarial_review`
**Purpose**: Challenge and validate design decisions
**Input**: Path to design document
**Output**: Review report with issues and improvements
**When to use**: After design document is complete, before implementation

### `/execution_plan`
**Purpose**: Break design into actionable implementation tasks
**Input**: Path to approved design document
**Output**: Execution plan in `PROCESS_DOCS/execution/`
**When to use**: After design is approved by adversarial review

### `/quality_gate`
**Purpose**: Verify all acceptance criteria are met
**Input**: Path to execution document
**Output**: Pass/fail report with missing items
**When to use**: Before marking feature complete or merging to main

## Agents Reference

### `@opus_designer`
**Model**: Claude Opus
**Specialty**: Architecture and design
**Use for**:
- Creating design specifications
- Breaking work into execution plans
- High-level system architecture

### `@sonnet_builder`
**Model**: Claude Sonnet
**Specialty**: Implementation and coding
**Use for**:
- Executing implementation tasks
- Writing tests
- Refactoring and optimization

### `@adversarial_reviewer`
**Model**: Claude Opus
**Specialty**: Critical analysis
**Use for**:
- Reviewing design documents
- Identifying edge cases
- Challenging assumptions

## Project Structure

The_Skillset expects and maintains this structure:

```
your-project/
├── PROCESS_DOCS/
│   ├── design/              # Design specifications
│   ├── execution/           # Execution plans
│   └── reviews/             # Adversarial review results
├── .claude/
│   ├── skills/              # Skillset skills
│   └── agents/              # Skillset agents
├── src/                     # Your source code
├── tests/                   # Your tests
└── CLAUDE.md               # This file
```

## Configuration

### Customizing for Your Project

Edit this file to add:
- Project-specific constraints
- Tech stack details
- Code style preferences
- Custom quality thresholds

### Example Customizations

```markdown
## Project-Specific Constraints

- **Language**: TypeScript (strict mode)
- **Framework**: React + Astro
- **Test Coverage**: Minimum 90%
- **Max Function Length**: 50 lines
- **No External Dependencies**: Without justification in design doc
```

## Best Practices

### Do's
✅ Always start with design document
✅ Run adversarial review before implementation
✅ Break work into atomic tasks (can finish in 1-2 hours)
✅ Write tests alongside code
✅ Verify quality gates before marking complete
✅ Update design docs if requirements change

### Don'ts
❌ Don't skip adversarial review "just this once"
❌ Don't implement without execution plan
❌ Don't merge without passing quality gates
❌ Don't create tasks larger than ~15 subtasks
❌ Don't write code before tests
❌ Don't ignore edge cases raised in review

## Success Metrics

Track these metrics to measure The_Skillset's effectiveness:

- **Test Coverage**: Target 90%+
- **Bug Rate**: Target <0.1 bugs per 100 lines
- **Feature Completion**: Target 95% hit criteria on first pass
- **Rework Rate**: Target <5%
- **Time to Production**: Measure from design to deploy

## Troubleshooting

### Design Documents Too Large
**Problem**: Design docs exceed 2000 lines
**Solution**: Break feature into smaller features, create separate designs

### Adversarial Review Too Harsh
**Problem**: Every design gets rejected
**Solution**: Adjust reviewer agent to focus on critical issues only

### Execution Plans Too Granular
**Problem**: 50+ tasks for simple feature
**Solution**: Combine related tasks, aim for 10-15 tasks total

### Quality Gates Always Failing
**Problem**: Can't pass quality gates
**Solution**: Review acceptance criteria, ensure they're achievable

## Integration with Other Tools

The_Skillset works with:
- **Git**: Commit after each completed task
- **CI/CD**: Run quality gates in pipeline
- **Issue Trackers**: Link tasks to tickets
- **Documentation**: Auto-generate from design docs

## Support

For issues or questions:
- Check the [README](../README.md)
- Review the [PROOF](../PROOF.md) for examples
- Visit [skillsets.cc](https://skillsets.cc)
- Open issues on the [registry](https://github.com/skillsets-cc/main)

## License

MIT License - see individual skill/agent files for details

---

**Version**: 1.0.0
**Last Updated**: 2026-01-30
**Author**: @supercollectible
