# init.ts

## Purpose
Interactive scaffold for new skillset submission with ghost entry reservation lookup, auto-detection of existing skillset files, and degit-based audit skill installation. Validates GitHub authentication and active reservation before proceeding.

## Dependencies
- **External**: `chalk`, `ora`, `@inquirer/prompts`, `fs`, `path`, `degit`, `child_process`
- **Internal**: None

## Key Components

### Functions
| Function | Purpose | Inputs → Output |
|----------|---------|-----------------|
| `init` | Interactive skillset scaffold | `InitOptions` → `void` |
| `copyDirRecursive` | Copy directory tree | `src, dest` → `void` |

### Templates
| Template | Generated File |
|----------|----------------|
| `SKILLSET_YAML_TEMPLATE` | `skillset.yaml` (with auto-populated batch_id) |
| `README_TEMPLATE` | `content/README.md` |
| `QUICKSTART_TEMPLATE` | `content/QUICKSTART.md` |
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
init() → Verify gh CLI auth → Get GitHub user ID → Look up reservation → Detect existing files → Prompt user → Generate templates → Copy content → Install audit-skill via degit
```

### Reservation Lookup Flow
1. Runs `gh api user` to get authenticated GitHub user ID
2. Calls `GET /api/reservations/lookup?githubId={id}`
3. Exits if no active reservation found (user must claim slot first)
4. Auto-populates `batch_id` field in `skillset.yaml` with returned batch ID

## Integration Points
- **Called by**: `index.ts` (CLI entry point)
- **Calls**:
  - `gh auth status` (verify GitHub CLI authentication)
  - `gh api user` (get GitHub user ID and login)
  - `GET /api/reservations/lookup` (reservation lookup by GitHub ID)
  - `degit` (install audit-skill from skillsets-cc/main/tools/audit-skill)

## Generated Structure
```
./
├── skillset.yaml           # Manifest with auto-populated batch_id
├── PROOF.md                # Production evidence template
├── .claude/skills/
│   └── audit-skill/        # Installed via degit from registry
│       ├── SKILL.md        # Opus qualitative review instructions
│       └── (other skill files)
└── content/                # Installable files
    ├── README.md           # Generated if not detected
    ├── QUICKSTART.md       # Generated if not detected
    └── (copied .claude/, CLAUDE.md, .mcp.json, docker/, etc.)
```

## Key Logic

### Auto-Detection
Scans for existing skillset files:
- `CLAUDE.md`
- `README.md`
- `.claude/` directory
- `.mcp.json`
- `docker/` directory

User selects which files to copy to `content/` via checkbox prompt.

### Audit Skill Installation
Uses degit to install `tools/audit-skill` from the main registry repo:
- Target: `skillsets-cc/main/tools/audit-skill`
- Destination: `.claude/skills/audit-skill/`
- Options: `cache: false, force: true` (always fresh)

### Validation
All prompts have inline validation:
- Name: Alphanumeric + hyphens/underscores, 1-100 chars
- Description: 10-200 chars
- Author handle: Must start with `@`
- URLs: Valid URL format
- Tags: 1-10 tags, lowercase, alphanumeric + hyphens

## Error Handling
- Exits if gh CLI not authenticated (directs to `gh auth login`)
- Exits if no active reservation found (directs to skillsets.cc)
- Exits if network error during lookup
- Prompts to overwrite if `skillset.yaml` already exists
