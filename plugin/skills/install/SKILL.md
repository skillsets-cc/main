---
name: install
description: Install a production-verified skillset from skillsets.cc into the current project
argument-hint: <name>
allowed-tools: Bash(npx skillsets@latest install *), Read, Glob
---

# Install Skillset

Install a skillset from the skillsets.cc registry into the current project directory.

---

## Phase Tracking

Create ALL tasks upfront using `TaskCreate`. Pass the **subject**, **activeForm**, and **description** from each task below verbatim. Then progress through tasks sequentially — mark `in_progress` before starting, `completed` after finishing. Do not begin a task until the prior task is completed.

### Task 1: Install skillset

- **subject**: Install skillset from registry
- **activeForm**: Installing skillset
- **description**: Run `npx skillsets@latest install $ARGUMENTS`. The CLI will interactively prompt for MCP server and runtime dependency consent if the skillset declares any. Ask the user whether to `--force` (overwrite) or `--backup` (preserve existing files) if they have conflicting files. See Command Reference below for all flags.

### Task 2: Read QUICKSTART.md

- **subject**: Read QUICKSTART.md
- **activeForm**: Reading quickstart guide
- **description**: Read the installed `QUICKSTART.md` — every skillset ships one. Identify each section that needs interactive walkthrough with the user. Sections vary by skillset but typically cover project configuration, style guides, agent tuning, templates, and infrastructure setup.

### Task 3: Walk through customization

- **subject**: Walk through customization with user
- **activeForm**: Walking through customization
- **description**: Walk the user through each QUICKSTART.md section interactively. For each section: explain what needs customizing and why, help the user make decisions for their project, apply the changes, and confirm before moving on. The goal is a customized, working skillset by the end of the conversation — not just extracted files.

---

## Command Reference

### install

```
npx skillsets@latest install <skillsetId> [options]
```

The `<skillsetId>` format is `@author/name` (e.g., `@supercollectible/Valence`).

| Flag | Description |
|------|-------------|
| `-f, --force` | Overwrite existing files without prompting |
| `-b, --backup` | Backup existing files before installation |
| `--accept-mcp` | Accept MCP servers without interactive prompt |
| `--accept-deps` | Accept runtime dependencies without interactive prompt |

The CLI handles:
1. Extraction via degit (no .git folder, no full clone)
2. SHA-256 checksum verification against the search index
3. MCP server and runtime dependency consent prompts
4. Download count tracking

---

## Error Handling

- If the skillset name is not found, suggest running `/skillset:browse` to search the registry
- If checksum verification fails, warn the user and do not proceed
- If the target directory already has conflicting files, suggest `--force` or `--backup`
