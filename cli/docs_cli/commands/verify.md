# verify.ts

## Overview
**Purpose**: Verify installed skillset checksums against registry to detect tampering or corruption

## Dependencies
- External: `chalk`, `ora`
- Internal: `lib/checksum`, `lib/filesystem`

## Key Components

### Functions
| Function | Purpose | Inputs → Output |
|----------|---------|-----------------|
| `verify` | Detect skillset and verify files | `VerifyOptions` → `void` |

### Options
| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `dir` | `string` | `process.cwd()` | Directory to verify |

## Data Flow
```
verify() → detectSkillset() → verifyChecksums() → Display results
```

## Integration Points
- Called by: `index.ts`
- Calls: `lib/filesystem.detectSkillset()`, `lib/checksum.verifyChecksums()`

## Critical Paths
**Primary Flow**: Read skillset.yaml → Fetch expected checksums → Compare files

## Error Handling
- No skillset.yaml: Fail with error
- Mismatch: Show diff, suggest reinstall

## Testing
- Test file: N/A (integration with checksum tests)
