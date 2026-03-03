# Styles Module

## Purpose
Global CSS configuration and design system foundation for skillsets.cc. Provides Tailwind integration, typography system (Outfit + JetBrains Mono), custom scrollbar styling, sticky header condensing, and reusable utility classes.

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
- **16px base**: Tailwind default
- **Body**: Outfit sans-serif
- **Optical balancing**: Monospace (JetBrains Mono) scaled to 0.90em / weight 500
- **Stable scrollbar**: Prevents layout shift on scroll

### Design Tokens
All styles reference Tailwind theme tokens from `site/tailwind.config.js`:
- Background: `colors.surface.*`
- Borders: `colors.border.*`
- Text: `colors.text.*`
- Accent: `colors.accent.*`

### Utility Classes
- `.scrollbar-hide` - Hide scrollbar while maintaining scroll functionality
- `.glow-border-hover` - Orange glow box-shadow on hover
