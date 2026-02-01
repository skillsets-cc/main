# init.ts

## Overview
**Purpose**: Interactive scaffold for new skillset submission with auto-detection of existing .claude/ and CLAUDE.md

## Dependencies
- External: `chalk`, `ora`, `@inquirer/prompts`, `fs`
- Internal: None

## Key Components

### Functions
| Function | Purpose | Inputs → Output |
|----------|---------|-----------------|
| `init` | Interactive skillset scaffold | `InitOptions` → `void` |
| `copyDirRecursive` | Copy directory tree | `src, dest` → `void` |

### Templates
| Template | Generated File |
|----------|----------------|
| `SKILLSET_YAML_TEMPLATE` | `skillset.yaml` |
| `README_TEMPLATE` | `README.md` |
| `PROOF_TEMPLATE` | `PROOF.md` |

### Prompts
| Field | Validation |
|-------|------------|
| `name` | Alphanumeric, hyphens, underscores |
| `description` | 10-200 characters |
| `authorHandle` | Starts with `@` |
| `authorUrl` | Valid URL |
| `productionUrl` | Valid URL |
| `tags` | 1-10 lowercase tags |

## Data Flow
```
init() → Detect existing files → Prompt user → Generate templates → Copy content
```

## Integration Points
- Called by: `index.ts`
- Calls: None (self-contained)

## Generated Structure
```
./
├── skillset.yaml
├── README.md
├── PROOF.md
└── content/
    └── (copied .claude/ or CLAUDE.md)
```

## Testing
- Test file: `__tests__/init.test.ts`
- Key tests: File creation, validation, auto-detect copy
