---
name: design_spec
description: Generate comprehensive design specifications for features
version: 1.0.0
---

# Design Specification Skill

Generates comprehensive design documents for new features or major changes.

## Purpose

Create detailed design specifications before implementation to:
- Define clear requirements and constraints
- Establish architecture and component boundaries
- Document API contracts and data models
- Define success criteria
- Identify risks and mitigation strategies

## Usage

```bash
/design_spec "Feature description here"
```

## Output

Design document in `PROCESS_DOCS/design/{feature-name}-design.md` containing:

1. **Overview**: Problem statement and high-level solution
2. **Requirements**: Functional and non-functional requirements
3. **Architecture**: System components and their interactions
4. **API Design**: Endpoints, data models, contracts
5. **Data Model**: Schema definitions and relationships
6. **Success Criteria**: Measurable outcomes and acceptance tests
7. **Risks**: Potential issues and mitigation strategies
8. **Timeline**: Estimated effort and milestones

## Best Practices

- Be specific about constraints and requirements
- Include concrete examples in API designs
- Define measurable success criteria
- Consider edge cases in risk analysis
- Keep scope manageable (split large features)

## Example

**Input**:
```bash
/design_spec "Add user authentication with GitHub OAuth"
```

**Output**:
`PROCESS_DOCS/design/github-oauth-auth-design.md` with complete specification

## Next Steps

After generating a design:
1. Review and refine the design document
2. Run `/adversarial_review` to validate
3. Incorporate feedback and update design
4. Once approved, run `/execution_plan`
