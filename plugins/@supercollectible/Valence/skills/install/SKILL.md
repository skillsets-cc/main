---
name: install
description: "Install Valence — Spec-driven Claude Code workflow with adversarial review, QA agents, and orchestrated builds"
allowed-tools: Bash(npx skillsets@latest *), Read, Glob
---

# Install Valence

Install Valence from the skillsets.cc registry into the current project directory.

---

## Phase Tracking

Create ALL tasks upfront using `TaskCreate`. Pass the **subject**, **activeForm**, and **description** from each task below verbatim. Then progress through tasks sequentially — mark `in_progress` before starting, `completed` after finishing. Do not begin a task until the prior task is completed.

### Task 1: Review install notes and install

- **subject**: Review install notes and install Valence
- **activeForm**: Reviewing install notes
- **description**: Read `references/INSTALL_NOTES.md`. Print: "Before installing **Valence**, review what's included:" followed by the install notes content verbatim. Then note: "This skillset declares external dependencies listed above. Proceeding will install them." Then note the external plugin dependencies listed below. Ask the user to confirm they want to proceed. If confirmed: run `npx skillsets@latest install @supercollectible/Valence --accept-mcp --accept-deps`. If declined: stop.

This skillset also uses external Claude Code plugins that are not bundled:
  - **code-simplifier** (registry:code-simplifier)
Install them separately if not already available.

### Task 2: Read QUICKSTART.md

- **subject**: Read QUICKSTART.md
- **activeForm**: Reading quickstart guide
- **description**: Read the installed `QUICKSTART.md` — every skillset ships one. Identify each section that needs interactive walkthrough with the user. Sections vary by skillset but typically cover project configuration, style guides, agent tuning, templates, and infrastructure setup.

### Task 3: Walk through customization

- **subject**: Walk through customization with user
- **activeForm**: Walking through customization
- **description**: First, ask the user whether they want a guided walkthrough or prefer to customize on their own. If they skip, mark this task completed. Otherwise, walk through each QUICKSTART.md section using `AskUserQuestion` — explain what needs customizing, present the options, and let the user decide. Only apply changes the user explicitly chooses. Never edit files autonomously — the user drives, you guide.

---

## Command Reference

### install

```
npx skillsets@latest install @supercollectible/Valence [options]
```

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

- If checksum verification fails, warn the user and do not proceed
- If the target directory already has conflicting files, suggest `--force` or `--backup`
