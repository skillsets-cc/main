# validate-deps.ts

## Purpose
Bidirectional runtime dependency validation. Scans content/ for dependency manifests (package.json, requirements.txt, etc.) and validates consistency with skillset.yaml `runtime_dependencies` declarations.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `DepsValidationResult` | interface | Validation result with valid flag and error list |
| `ContentDependency` | interface | Dependency file discovered in content/ |
| `validateRuntimeDeps` | function | Bidirectional validation of content vs manifest |
| `collectContentDeps` | function | Scan content/ for dependency files |

## Dependencies
- Internal: `lib/errors.ts` (error message extraction)
- External: `js-yaml` (YAML parsing), `fs`, `path`

## Integration Points
- Used by: `commands/audit.ts` (validates runtime dependencies during audit)

## Key Logic

### Supported Dependency Managers
| Manager | File(s) | Package Extraction | Install Script Detection |
|---------|---------|-------------------|-------------------------|
| `npm` | package.json | dependencies + devDependencies | preinstall/install/postinstall/prepare scripts |
| `pip` | requirements.txt, pyproject.toml | Line-by-line parsing, TOML [project] dependencies | setuptools or build-system sections |
| `cargo` | Cargo.toml | [dependencies] and [dev-dependencies] | [build] section or build.rs file |
| `go` | go.mod | require block parsing | N/A (no lifecycle scripts) |
| `bundler` | Gemfile | gem declarations | N/A |

### Bidirectional Validation
**Content → Manifest:**
- Every dependency file in content/ must be declared in skillset.yaml
- Manager type must match
- All packages in content file must be listed in manifest
- Lifecycle scripts presence must match `has_install_scripts` flag

**Manifest → Content:**
- Every `runtime_dependencies` entry must have corresponding file in content/

### Validation Flow
1. Scan content/ recursively for known dependency file patterns
2. Parse skillset.yaml `runtime_dependencies` array
3. Cross-validate both directions
4. Return list of inconsistencies (empty list = valid)
