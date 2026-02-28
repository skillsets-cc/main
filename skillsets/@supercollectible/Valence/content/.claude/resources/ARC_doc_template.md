# [Directory Name]

## Purpose
[One paragraph describing what this module/directory handles]

## Architecture
```
[directory]/
├── __init__.py           # [Exports and initialization]
├── [core_file].py        # [Main logic/entry point]
├── [support_file].py     # [Supporting functionality]
├── [manager_file].py     # [State/resource management]
└── tests/
    ├── test_[core].py    # [Core logic tests]
    └── test_[support].py # [Support tests]
```

## Files

### Core Components
| File | Purpose | Documentation |
|------|---------|---------------|
| `[file1].py` | [One line description] | [📄 Docs](./[file1].md) |
| `[file2].py` | [One line description] | [📄 Docs](./[file2].md) |

### Supporting Files
| File | Purpose | Documentation |
|------|---------|---------------|
| `[util].py` | [One line description] | [📄 Docs](./[util].md) |

### Test Files
| File | Coverage | Key Tests |
|------|----------|-----------|
| `test_[file].py` | [X%] | [What it validates] |

## Dependencies
- **External**: [Key packages this module depends on]
- **Internal**: [Other app modules used]
- **Services**: [Redis, DB, external APIs]

## Data Flow
```
[Entry point] → [Processing] → [Output/Next module]

Example:
WebSocket → voice_handler.py → STT service → LLM pipeline
```

## Key Patterns
- **[Pattern name]**: [How it's used in this module]
- **Dependency Injection**: [How DI is implemented]
- **Error Handling**: [Common approach]

## Configuration
| Variable | Purpose | Default |
|----------|---------|---------|
| `[ENV_VAR]` | [What it controls] | [Default value] |

## API/Interface
### Public Functions
```python
# Main entry points exposed by __init__.py
from .[module] import [function1], [function2]
```

### WebSocket Messages (if applicable)
| Type | Direction | Purpose |
|------|-----------|---------|
| `[message_type]` | Client→Server | [What it does] |

### Events (if applicable)
| Event | Trigger | Consumers |
|-------|---------|-----------|
| `[event_name]` | [When fired] | [Who listens] |

## Integration Points
- **Upstream**: [What calls this module]
- **Downstream**: [What this module calls]
- **Parallel**: [Related modules at same level]

## Testing
```bash
# Run all tests for this module
venv/bin/pytest app/[module]/ -v

# Run with coverage
venv/bin/pytest app/[module]/ --cov=app/[module]
```

## Monitoring
- **Metrics**: [Key metrics tracked]
- **Logs**: [Important log points]
- **Health**: [Health check endpoints]

## Common Issues
- **[Issue]**: [Solution]
- **[Gotcha]**: [How to avoid]

## Related Documentation
- [Overall architecture](../architecture.md)
- [Parent module](../[parent]/README.md)
- [Related module](../[related]/README.md)