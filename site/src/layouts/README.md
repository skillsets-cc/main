# Layouts

## Purpose
Base HTML layout providing consistent page structure, expanding icon sidebar, ambient canvas background, and global styles for all pages across the site.

## Architecture
```
layouts/
├── docs_layouts/
│   ├── ARC_layouts.md          # Module architecture
│   └── BaseLayout.md           # BaseLayout.astro documentation
├── BaseLayout.astro            # Base HTML layout with sidebar navigation
└── README.md                   # This file
```

## Files
| File | Purpose | Documentation |
|------|---------|---------------|
| — | Architecture overview | [ARC_layouts.md](./docs_layouts/ARC_layouts.md) |
| `BaseLayout.astro` | Base HTML layout with expanding icon sidebar, ghost terminal canvas background, mobile FABs, and View Transitions. Used by all pages. | [Docs](./docs_layouts/BaseLayout.md) |
