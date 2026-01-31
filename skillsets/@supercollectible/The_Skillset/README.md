# The Skillset

A complete, spec-driven Software Development Lifecycle (SDLC) workflow for Claude Code that emphasizes adversarial review, quality gates, and multi-model validation.

## What This Skillset Provides

The_Skillset implements a rigorous development process that ensures production-ready code through:

- **Specification-First Design**: All features start with detailed design documents before implementation
- **Adversarial Review**: Built-in "red team" agents challenge designs and catch edge cases
- **Quality Gates**: Automated checkpoints prevent unfinished or untested code from progressing
- **Multi-Model Validation**: Leverage different Claude models for specialized tasks (Opus for design, Sonnet for implementation)
- **Execution Chunking**: Break large projects into manageable, verifiable units

## Installation

### Using the CLI (Recommended)

```bash
# Install to current directory
npx skillsets install @supercollectible/The_Skillset

# Verify installation
npx skillsets verify
```

### Manual Installation

```bash
# Clone the registry and copy content
git clone https://github.com/skillsets-cc/main.git
cp -r registry/skillsets/@supercollectible/The_Skillset/content/* .
```

## What Gets Installed

```
your-project/
├── .claude/
│   ├── skills/
│   │   ├── design_spec/          # Generate design specifications
│   │   ├── adversarial_review/   # Challenge and validate designs
│   │   ├── execution_plan/       # Break specs into tasks
│   │   └── quality_gate/         # Verify completion criteria
│   └── agents/
│       ├── opus_designer/        # Design and architecture agent
│       ├── sonnet_builder/       # Implementation agent
│       └── adversarial_reviewer/ # Critical review agent
└── CLAUDE.md                     # Project-level instructions
```

## Usage Workflow

### 1. Design Phase
```bash
# Use the design_spec skill to create detailed design documents
/design_spec "Build a user authentication system"
```

This generates a comprehensive design document in `PROCESS_DOCS/design/` with:
- Architecture overview
- Component specifications
- API contracts
- Success criteria

### 2. Adversarial Review
```bash
# Challenge the design with adversarial_review skill
/adversarial_review PROCESS_DOCS/design/auth-system-design.md
```

The adversarial reviewer will:
- Identify edge cases and failure modes
- Challenge assumptions
- Suggest improvements
- Ensure completeness

### 3. Execution Planning
```bash
# Break the approved design into implementation tasks
/execution_plan PROCESS_DOCS/design/auth-system-design.md
```

This creates an execution document in `PROCESS_DOCS/execution/` with:
- Task breakdown (10-15 tasks per feature)
- Acceptance criteria for each task
- Dependencies and ordering
- Quality gates

### 4. Implementation
```bash
# Use Sonnet builder agent to implement tasks
@sonnet_builder implement PROCESS_DOCS/execution/auth-system-execution.md
```

The builder agent:
- Follows the execution plan exactly
- Writes tests alongside code
- Verifies acceptance criteria
- Reports progress

### 5. Quality Gates
```bash
# Verify all criteria are met before marking complete
/quality_gate PROCESS_DOCS/execution/auth-system-execution.md
```

Quality checks include:
- All tests passing
- Acceptance criteria verified
- Documentation complete
- No linting errors

## Key Principles

1. **Design Before Code**: No implementation without an approved design document
2. **Adversarial Validation**: Every design is challenged before implementation
3. **Atomic Tasks**: Work is broken into small, verifiable units
4. **Test-Driven**: Tests written with code, not after
5. **Quality-Gated**: High friction ensures high quality

## Production Proof

The_Skillset has been used to build:

- **[skillsets.cc](https://skillsets.cc)**: This very platform (meta!)
- Multiple production web applications with thousands of lines of code
- Backend APIs with comprehensive test coverage
- CLI tools distributed via npm

See [PROOF.md](./PROOF.md) for detailed evidence including:
- Screenshots of deployed applications
- GitHub repositories showing The_Skillset in action
- Metrics on code quality and test coverage
- Testimonials from users

## Configuration

### Customizing for Your Project

Edit `.claude/CLAUDE.md` to:
- Add project-specific constraints
- Define your tech stack
- Set code style preferences
- Configure quality thresholds

### Agent Customization

Each agent in `.claude/agents/` can be customized:
- Adjust model selection (Opus vs Sonnet)
- Modify system prompts
- Add project-specific knowledge
- Configure tool access

## Compatibility

- **Claude Code Version**: 1.0.0 or higher
- **Languages**: Language-agnostic (works with any language)
- **Project Types**: Web apps, APIs, CLI tools, libraries

## Support & Community

- **Issues**: Report issues via the [registry](https://github.com/skillsets-cc/main/issues)
- **Discussions**: Share experiences on [GitHub Discussions](https://github.com/skillsets-cc/main/discussions)
- **Updates**: Star on skillsets.cc to track updates

## License

MIT License - see LICENSE file in the content directory

## Author

Created by [@supercollectible](https://github.com/supercollectible)

Part of the [skillsets.cc](https://skillsets.cc) registry of production-verified Claude Code workflows.
