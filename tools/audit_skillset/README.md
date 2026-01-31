# Audit Skillset Tool

A Claude Code skill that validates skillset directories before submission to skillsets.cc registry.

## Purpose

The `/audit_skillset` skill performs comprehensive pre-submission validation to ensure skillsets meet all registry requirements. This catches issues early and streamlines the PR review process.

## What It Validates

1. **Manifest Schema** - `skillset.yaml` against JSON Schema
2. **Required Files** - README, content directory, audit report path
3. **Content Structure** - Presence of `.claude/` or `CLAUDE.md`
4. **File Sizes** - Flags files over 1MB
5. **Binary Files** - Detects non-text files in content
6. **Secrets** - Scans for API keys, tokens, passwords

## Installation

Contributors download this skill from the `/contribute` page on skillsets.cc:

```bash
# Option 1: Direct download
curl -o SKILL.md https://skillsets.cc/tools/audit_skillset/SKILL.md

# Option 2: Using degit
npx degit skillsets-cc/main/tools/audit_skillset
```

## Usage

1. Navigate to your skillset directory:
   ```bash
   cd my-skillset/
   ```

2. Ensure your directory structure matches:
   ```
   my-skillset/
   ├── skillset.yaml
   ├── README.md
   └── content/
       ├── .claude/        # OR
       └── CLAUDE.md       # At least one required
   ```

3. Run the skill in Claude Code:
   ```
   /audit_skillset
   ```

4. Review the generated `AUDIT_REPORT.md`

5. Fix any FAILED checks and re-run

6. Include the passing `AUDIT_REPORT.md` in your PR

## Output

The skill generates `AUDIT_REPORT.md` with:

- Validation summary table
- Detailed findings for each check
- File inventory with sizes
- Recommendations for fixing issues
- Ready-for-submission status

## Example Success Output

```
Audit Skillset - Validation Complete

Skillset: The_Skillset v1.0.0
Author: @supercollectible

✓ PASS - Manifest validation
✓ PASS - Required files present
✓ PASS - Content structure valid
✓ PASS - No large files detected
✓ PASS - No binary files detected
✓ PASS - No secrets detected

Status: READY FOR SUBMISSION

Generated: AUDIT_REPORT.md
```

## Common Issues and Fixes

### Manifest Validation Failed

**Issue:** Invalid `skillset.yaml` format

**Fix:**
- Check all required fields are present
- Verify version follows semver (e.g., 1.0.0)
- Ensure author handle has @ prefix
- Validate URLs are properly formatted

### Missing Required Files

**Issue:** `README.md` or `content/` not found

**Fix:**
- Create `README.md` with installation instructions
- Create `content/` directory
- Move skillset files into `content/`

### Invalid Content Structure

**Issue:** Neither `.claude/` nor `CLAUDE.md` found

**Fix:**
- Add `.claude/` directory with skills/agents, OR
- Add `CLAUDE.md` with project instructions
- At least one must be present in `content/`

### Large Files Detected

**Issue:** Files exceed 1MB limit

**Fix:**
- Compress or split large files
- Move large assets to external hosting
- Link to external resources in README
- Justify if files must be large

### Secrets Detected

**Issue:** API keys or tokens found in files

**Fix:**
- Remove all actual secrets
- Use placeholder values (e.g., `YOUR_API_KEY`)
- Create `.env.example` instead of `.env`
- Document required environment variables

## Integration with CI

The GitHub Actions workflow in the registry runs similar validation checks:

- Schema validation with `ajv-cli`
- Required file checks
- Content structure verification
- File size limits
- Binary file warnings
- Secret pattern scanning
- Author verification

The `/audit_skillset` skill catches these issues locally before submission, reducing CI failures and review cycles.

## Files

```
tools/audit_skillset/
├── README.md                           # This file
├── SKILL.md                            # The skill definition
└── templates/
    └── AUDIT_REPORT_TEMPLATE.md        # Template for generated reports
```

## Development

The skill is designed to be:

- **Standalone** - No dependencies beyond Claude Code
- **Comprehensive** - Matches CI validation logic
- **Clear** - Provides actionable error messages
- **Fast** - Local validation, no network calls

## Contributing

Improvements to the audit skill:

1. Add new validation checks as registry requirements evolve
2. Improve error messages and remediation guidance
3. Keep in sync with JSON Schema changes
4. Update templates to match current standards

Submit changes via PR to the main registry repository.

## License

Part of the skillsets.cc registry. See main repository for license details.
