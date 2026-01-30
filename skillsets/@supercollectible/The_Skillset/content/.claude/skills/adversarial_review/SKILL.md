---
name: adversarial_review
description: Challenge and validate design documents through critical analysis
version: 1.0.0
---

# Adversarial Review Skill

Critically analyzes design documents to identify weaknesses, edge cases, and potential improvements before implementation.

## Purpose

Act as a "red team" to:
- Challenge assumptions and design decisions
- Identify edge cases and failure modes
- Suggest alternative approaches
- Ensure completeness and consistency
- Catch issues before implementation

## Usage

```bash
/adversarial_review PROCESS_DOCS/design/feature-design.md
```

## Process

The review examines:

1. **Completeness**: Are all requirements addressed?
2. **Correctness**: Are the technical approaches sound?
3. **Edge Cases**: What happens in failure scenarios?
4. **Security**: Are there vulnerabilities or risks?
5. **Performance**: Will it scale and perform well?
6. **Maintainability**: Is it easy to understand and modify?

## Output

Review document in `PROCESS_DOCS/reviews/{feature-name}-review.md` containing:

- **Critical Issues**: Must be addressed before implementation
- **Important Concerns**: Should be addressed or justified
- **Suggestions**: Nice-to-have improvements
- **Approval Status**: Approved / Needs Revision / Rejected

## Review Criteria

### Critical Issues (Must Fix)
- Security vulnerabilities
- Data loss risks
- Architectural flaws
- Missing critical requirements

### Important Concerns (Should Address)
- Edge cases not handled
- Performance bottlenecks
- Unclear specifications
- Missing error handling

### Suggestions (Consider)
- Alternative approaches
- Optimization opportunities
- Better naming/structure
- Additional features

## Best Practices

- Focus on high-impact issues
- Provide specific examples
- Suggest concrete improvements
- Be constructive, not just critical
- Consider trade-offs

## Example

**Input**:
```bash
/adversarial_review PROCESS_DOCS/design/github-oauth-auth-design.md
```

**Output**: Review identifying:
- Missing CSRF protection
- No handling of OAuth callback errors
- Token refresh not specified
- Session expiration not defined

## Next Steps

After adversarial review:
1. Address all Critical Issues
2. Justify or fix Important Concerns
3. Consider Suggestions
4. Update design document
5. Re-run review if major changes
6. Once approved, proceed to `/execution_plan`
