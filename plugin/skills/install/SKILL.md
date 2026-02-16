---
name: install
description: Install a production-verified skillset from skillsets.cc into the current project
disable-model-invocation: true
argument-hint: <name>
allowed-tools: Bash(npx skillsets@latest install *), Read, Glob
---

# Install Skillset

Install a skillset from the skillsets.cc registry into the current project directory.

## Execution

```
npx skillsets@latest install $ARGUMENTS
```

The CLI handles:
1. Extraction via degit (no .git folder, no full clone)
2. SHA-256 checksum verification against the search index
3. Download count tracking
4. Warnings about MCP servers and runtime dependencies

## Post-Install

After successful installation:

1. Read the installed `QUICKSTART.md` — every skillset ships one.
2. Walk the user through each section interactively. Sections vary by skillset but typically cover project configuration, style guides, agent tuning, templates, and infrastructure setup.
3. For each section, explain what needs customizing and why, help the user make decisions for their project, and confirm before moving on.

The goal is a customized, working skillset by the end of the conversation, not just extracted files.

## Error Handling

- If the skillset name is not found, suggest running `/skillset:browse` to search the registry
- If checksum verification fails, warn the user and do not proceed
- If the target directory already has conflicting files, the CLI will offer backup options
