# Frontend Style Guide

<!-- Populate each section with your project's frontend patterns. -->
<!-- This file is the source of truth for /qf audits and /build agents. -->

---

## Design System

### Typography
<!-- Define your font choices, sizes, and hierarchy -->

### Color Palette
<!-- Define your color tokens and usage rules -->

### Component Aesthetics
<!-- Define visual conventions: border radius, shadows, spacing, etc. -->

---

## Framework Configuration

<!-- Your framework and build tool configuration -->
<!-- Examples: tailwind.config.js, theme tokens, vite.config.ts -->

---

## Layout Pattern

<!-- Define your layout structure: shell, sidebar, header, content area -->

---

## Page Patterns

### Static Pages
<!-- How static/prerendered pages are structured -->

### Dynamic Pages
<!-- How server-rendered or client-routed pages are structured -->

### Data Loading
<!-- How pages load data: build-time, runtime, client-side fetch -->

---

## Component Patterns

### Interactive Components
<!-- Patterns for stateful, interactive components -->

### Static Components
<!-- Patterns for presentational, server-rendered components -->

### Component Inventory
<!-- List your components, their type, purpose, and hydration strategy -->

| Component | Type | Purpose | Notes |
|-----------|------|---------|-------|

---

## API Integration

<!-- How frontend communicates with backend: fetch patterns, error handling, auth -->

---

## State Management

<!-- Your state management approach: local state, global stores, server state -->

---

## Portal / Overlay Pattern

<!-- How modals, drawers, tooltips, and fixed UI elements are positioned -->

---

## Global CSS

<!-- Base styles, CSS layers, custom utilities -->

---

## Type Definitions

<!-- Shared TypeScript types used across the frontend -->

---

## Build Configuration

<!-- Framework config, bundler config, adapter config -->

---

## File Naming

<!-- Naming conventions for components, pages, hooks, utils, tests -->

---

## Folder Structure

<!-- Your frontend source tree -->
```
src/
├── components/
├── layouts/
├── pages/
├── lib/
├── types/
└── styles/
```

---

## Testing Pattern

<!-- Test framework, patterns, conventions, shared helpers -->

---

## Prerender / Routing Decision Matrix

<!-- Which pages are static vs dynamic and why -->

| Page | Static/Dynamic | Reason |
|------|----------------|--------|

---

## Performance Checklist

<!-- Performance rules specific to your frontend -->

- [ ] [Rule 1]
- [ ] [Rule 2]

---

## Accessibility Checklist

<!-- Accessibility standards for your project -->

- [ ] Semantic HTML5 elements
- [ ] `aria-label` on icon-only buttons
- [ ] Keyboard navigation for interactive elements
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Alt text on all images

---

## Code Review Checklist

<!-- Frontend-specific review criteria -->

- [ ] Type safety (no `any` types)
- [ ] Styling follows design system
- [ ] Loading states on async operations
- [ ] User content sanitized before rendering
- [ ] Tests for interactive components
