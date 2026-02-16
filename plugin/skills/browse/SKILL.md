---
name: browse
description: Browse and search the skillsets.cc registry of production-verified Claude Code workflows. Use when the user wants to find, explore, or compare skillsets.
argument-hint: [search query]
allowed-tools: Bash(npx skillsets@latest list *), Bash(npx skillsets@latest search *), Bash(npx skillsets@latest view *), Skill
---

# Browse Skillsets

Search or browse the skillsets.cc registry of production-verified Claude Code workflows.

---

## Phase Tracking

Create ALL tasks upfront using `TaskCreate`. Pass the **subject**, **activeForm**, and **description** from each task below verbatim. Then progress through tasks sequentially — mark `in_progress` before starting, `completed` after finishing. Do not begin a task until the prior task is completed.

### Task 1: Run discovery command

- **subject**: Run discovery command
- **activeForm**: Querying registry
- **description**: Determine what the user wants from $ARGUMENTS and context, then run the appropriate command from the Command Reference below. Use flags to tailor results (e.g., `--sort stars` for popular, `--tags` to filter, `--limit` to constrain). If the user named a specific skillset, go straight to `view`.

### Task 2: Present results

- **subject**: Present results and suggest next actions
- **activeForm**: Presenting results
- **description**: Present results conversationally. Highlight what makes each skillset relevant to the user's current project if context is available. Suggest follow-up actions: `view` for details on a specific entry, install directly via `/skillset:install <name>` (invoke with the Skill tool), or refine the search with different flags or query. If the user wants to install, invoke `/skillset:install` immediately — no need to ask them to run it separately.

---

## Command Reference

### list

Browse all available skillsets in the registry.

```
npx skillsets@latest list [options]
```

| Flag | Description |
|------|-------------|
| `-l, --limit <number>` | Limit number of results (default: unlimited) |
| `-s, --sort <field>` | Sort by: `name`, `stars`, `downloads` (default: `name`) |
| `--json` | Output as JSON |

### search

Fuzzy search by name, description, tags, or author handle.

```
npx skillsets@latest search <query> [options]
```

| Flag | Description |
|------|-------------|
| `-t, --tags <tags...>` | Filter by tags (space-separated) |
| `-l, --limit <number>` | Limit results (default: `10`) |

### view

Display a skillset's README, tags, compatibility, and verification status.

```
npx skillsets@latest view <skillsetId>
```

The `<skillsetId>` format is `@author/name` (e.g., `@supercollectible/Valence`).

---

## Guidelines

- The registry is intentionally small and curated. Every listed skillset has passed structural validation, qualitative Opus review, and human maintainer approval with production proof.
- When the user wants to compare entries, run multiple `view` commands and summarize the differences.
- If no results match, suggest broadening the query or browsing all with `list`.
