# templates.ts

## Purpose
Template strings for scaffolding new skillsets via the `init` command.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `SKILLSET_YAML_TEMPLATE` | string | Template for skillset.yaml manifest with placeholder variables |
| `README_TEMPLATE` | string | Template for skillset README.md documentation |
| `QUICKSTART_TEMPLATE` | string | Template for QUICKSTART.md installation guide |
| `INSTALL_NOTES_TEMPLATE` | string | Template for content/INSTALL_NOTES.md pre-install notes |

## Dependencies
- Internal: None
- External: None

## Integration Points
- Used by: `commands/init`
- Emits/Consumes: None

## Key Logic
Templates use `{{PLACEHOLDER}}` syntax for variable substitution. The init command replaces placeholders like:
- `{{NAME}}` - Skillset name
- `{{DESCRIPTION}}` - Skillset description
- `{{AUTHOR_HANDLE}}` - GitHub handle
- `{{AUTHOR_URL}}` - Author profile URL
- `{{PRODUCTION_URL}}` - Production deployment URL
- `{{BATCH_ID}}` - Unique batch identifier
- `{{TAGS}}` - YAML-formatted tag list
