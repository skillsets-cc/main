# README_[module].md Template

Use this template when creating module-level documentation. Place in module root as `README_[module_name].md`.

---

# [Module Name]

## Purpose
One paragraph describing what this module does and why it exists. Focus on the *what* and *why*, not implementation details.

## Architecture
```
path/to/module/
├── __init__.py              # Public exports
├── main_component.py        # Core logic description
├── secondary_component.py   # Supporting logic
├── types.py                 # Type definitions (if any)
├── errors.py                # Module-specific exceptions
├── docs_[module]/           # Documentation
│   ├── ARC_[module].md      # Architecture reference
│   └── [component].md       # Per-file docs
└── tests_[module]/          # Unit tests
```

## Files

### Core Components
| File | Purpose | Documentation |
|------|---------|---------------|
| `main_component.py` | Brief description of responsibility | [Docs](./docs_module/main_component.md) |
| `secondary_component.py` | Brief description | [Docs](./docs_module/secondary_component.md) |

### Infrastructure
| File | Purpose | Documentation |
|------|---------|---------------|
| `errors.py` | Module-specific exception types | [Docs](./docs_module/errors.md) |
| `types.py` | Shared type definitions | — |

## Dependencies
- **External**: `library1`, `library2`
- **Internal**: `app.module1`, `app.module2`
- **Services**: ServiceA, ServiceB (injected)

## Data Flow
```
Input
    │
    ▼
┌─────────────────┐
│  ComponentA     │◄── Note about role
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│ Path A │ │ Path B │
└────┬───┘ └────┬───┘
     │          │
     └────┬─────┘
          ▼
       Output
```

## Key Patterns
- **Pattern Name**: Brief explanation of how/why this pattern is used
- **Another Pattern**: Explanation

## Configuration
*Include if module has configurable behavior*

| Variable | Default | Description |
|----------|---------|-------------|
| `ENV_VAR_NAME` | `default` | What it controls |

## Testing
*Include if module has tests*

```bash
# Run module tests
pytest path/to/module/tests_[module]/ -v
```

## Related Documentation
- [Architecture Reference](./docs_module/ARC_module.md)
- [Related Module](../other_module/README_other.md)

---

## Template Notes

**Required sections**: Purpose, Architecture, Files, Dependencies, Data Flow, Key Patterns, Related Documentation

**Optional sections**: Configuration (if env vars), Testing (if tests exist)

**Naming**: File should be `README_[module_name].md` matching the directory name

**Placement**: Module root directory, alongside `__init__.py`
