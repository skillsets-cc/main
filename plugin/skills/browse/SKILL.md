---
name: browse
description: Browse and search the skillsets.cc registry of production-verified Claude Code workflows. Use when the user wants to find, explore, or compare skillsets.
argument-hint: [search query]
allowed-tools: Bash(npx skillsets@latest list *), Bash(npx skillsets@latest search *), Bash(npx skillsets@latest view *)
---

# Browse Skillsets

Search or browse the skillsets.cc registry of production-verified Claude Code workflows.

## Behavior

**If the user provided a search query:**

```
npx skillsets@latest search $ARGUMENTS
```

**If no query (or user wants to browse all):**

```
npx skillsets@latest list
```

**To see details about a specific skillset:**

```
npx skillsets@latest view <name>
```

## Guidelines

- Present results conversationally. Highlight what makes each skillset relevant to the user's current project if context is available.
- Use `npx skillsets@latest view` to show README content, tags, compatibility, and verification status when the user wants to learn more about a specific entry.
- The registry is intentionally small and curated. Every listed skillset has passed structural validation, qualitative Opus review, and human maintainer approval with production proof.
