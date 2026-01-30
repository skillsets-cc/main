---
name: quality_gate
description: Verify all acceptance criteria are met before marking feature complete
version: 1.0.0
---

# Quality Gate Skill

Validates that all acceptance criteria are met and the feature is ready for production.

## Purpose

Ensure high quality through verification:
- All tasks completed
- All tests passing
- Acceptance criteria verified
- Documentation complete
- No linting errors
- Code coverage targets met

## Usage

```bash
/quality_gate PROCESS_DOCS/execution/feature-execution.md
```

## Validation Checks

### 1. Task Completion
- [ ] All tasks marked complete
- [ ] All acceptance criteria checked
- [ ] No tasks skipped or partially done

### 2. Test Suite
- [ ] Unit tests written for all components
- [ ] Integration tests cover main flows
- [ ] All tests passing
- [ ] No skipped or disabled tests
- [ ] Code coverage meets threshold (default: 90%)

### 3. Code Quality
- [ ] No linting errors
- [ ] No type errors (TypeScript/MyPy)
- [ ] No security warnings
- [ ] Follows project code style

### 4. Documentation
- [ ] README updated if needed
- [ ] API documentation complete
- [ ] Complex logic has comments
- [ ] CHANGELOG updated

### 5. Build & Deploy
- [ ] Build succeeds without errors
- [ ] No breaking changes
- [ ] Environment variables documented
- [ ] Deployment steps documented

## Output

Quality gate report with:
- **Status**: PASS / FAIL
- **Passed Checks**: List of successful validations
- **Failed Checks**: Issues that must be fixed
- **Warnings**: Non-blocking concerns

## Pass Criteria

Feature must meet ALL of:
- ✅ 100% of tasks complete
- ✅ 100% of tests passing
- ✅ 90%+ code coverage (configurable)
- ✅ 0 linting errors
- ✅ 0 type errors
- ✅ Documentation complete

## Fail Scenarios

Gate FAILS if:
- ❌ Any task incomplete
- ❌ Any test failing
- ❌ Coverage below threshold
- ❌ Linting or type errors
- ❌ Critical documentation missing

## Example

**Input**:
```bash
/quality_gate PROCESS_DOCS/execution/github-oauth-auth-execution.md
```

**Output** (PASS):
```
✅ Quality Gate: PASSED

Task Completion: ✅ 12/12 tasks complete
Test Suite: ✅ 47 tests, 0 failures
Code Coverage: ✅ 94% (threshold: 90%)
Code Quality: ✅ 0 errors, 0 warnings
Documentation: ✅ All docs updated
Build: ✅ Successful

Status: READY FOR MERGE
```

**Output** (FAIL):
```
❌ Quality Gate: FAILED

Task Completion: ✅ 12/12 tasks complete
Test Suite: ❌ 47 tests, 3 failures
Code Coverage: ❌ 78% (threshold: 90%)
Code Quality: ✅ 0 errors, 0 warnings
Documentation: ❌ API docs missing

Failed Checks:
- 3 tests failing in auth-flow.test.ts
- Coverage 12% below threshold (need 10 more tests)
- Missing API documentation for /callback endpoint

Status: NOT READY - FIX ISSUES ABOVE
```

## Best Practices

- Run quality gate before requesting review
- Fix all issues before moving to next feature
- Don't lower thresholds to pass gate
- Update execution doc if requirements changed
- Re-run gate after fixing issues

## Configuration

Customize thresholds in your project's `CLAUDE.md`:

```markdown
## Quality Gate Configuration

- **Coverage Threshold**: 95%
- **Max Function Length**: 50 lines
- **Max File Size**: 500 lines
- **Required Docs**: README, API docs, CHANGELOG
```

## Next Steps

After passing quality gate:
1. Commit all changes
2. Push to feature branch
3. Open pull request
4. Link to execution document in PR
5. Request code review
