# README Module Template

Use this template when creating module-level documentation. Place in module root as `README_[module].md`.

---

# [Module Name]

## Purpose
One paragraph describing what this module does and why it exists.

## Architecture
```
path/to/[module]/
├── file_a.ts              # Brief description
├── file_b.ts              # Brief description
├── docs_[module]/         # Documentation
│   ├── ARC_[module].md    # Architecture Reference
│   ├── file_a.md
│   └── file_b.md
└── tests_[module]/        # Unit tests
```

## Files

| File | Purpose | Documentation |
|------|---------|---------------|
| — | Architecture, data flow, key patterns | [ARC_[module].md](./docs_[module]/ARC_[module].md) |
| `file_a.ts` | Brief description of responsibility | [Docs](./docs_[module]/file_a.md) |
| `file_b.ts` | Brief description | [Docs](./docs_[module]/file_b.md) |

## Related Documentation
- [Style Guide](../.claude/resources/[relevant]_styleguide.md)
