# Styles Module

## Purpose
Global CSS configuration and design system foundation for skillsets.cc. Provides Tailwind integration, typography system (Crimson Pro + JetBrains Mono), custom scrollbar styling, and reusable utility classes.

## Architecture
```
styles/
├── global.css              # Global styles, Tailwind layers, typography, scrollbar
├── README.md               # This file
└── docs_styles/
    ├── ARC_styles.md       # Architecture overview
    └── global.css.md       # global.css documentation
```

## Files
| File | Purpose | Documentation |
|------|---------|---------------|
| — | Architecture overview | [ARC_styles.md](./docs_styles/ARC_styles.md) |
| `global.css` | Global CSS setup, Tailwind layers, typography system, scrollbar | [Docs](./docs_styles/global.css.md) |

## Key Concepts

### Typography System
- **18px base**: Compensates for Crimson Pro's smaller x-height
- **Optical balancing**: Monospace scaled to 0.95em to match serif visually
- **Stable scrollbar**: Prevents layout shift on scroll

### Design Tokens
All styles reference Tailwind theme tokens from `site/tailwind.config.js`:
- Background: `colors.bg.*`
- Borders: `colors.border.*`
- Text: `colors.text.*`

### Utility Classes
- `.scrollbar-hide` - Hide scrollbar while maintaining scroll functionality
