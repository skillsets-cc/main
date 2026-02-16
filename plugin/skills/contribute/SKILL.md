---
name: contribute
description: Walk through the full skillsets.cc submission process. Guides scaffold, validation, and submission of a new skillset.
allowed-tools: Bash(npx skillsets@latest audit *), Read, Glob, Grep, Edit
---

# Contribute a Skillset

Guide the user through submitting a skillset to the skillsets.cc registry. This is a multi-step process with mixed execution — some commands require the user's GitHub authentication and must be run by the user directly.

## Prerequisites

- Node.js installed (for npx)
- GitHub CLI (`gh`) installed and authenticated
- An existing Claude Code workflow with `.claude/` primitives (skills, agents, hooks, etc.)
- Evidence of production use (shipped software, deployed applications)

## Step 1: Initialize (User Runs)

**The user must run this command themselves** — it requires gh cli:

```
npx skillsets@latest init
```

Tell the user to run this in their terminal. It will:
- Scaffold `skillset.yaml` and the submission directory structure
- Detect existing `.claude/` structure and offer to copy it into `content/`
- Reserve a ghost slot on skillsets.cc (requires GitHub auth)
- Install the `/audit-skill` for qualitative review

Wait for the user to confirm they've completed this step before proceeding.

## Step 2: Prepare Content

Help the user prepare their skillset content:

1. Review `skillset.yaml` — verify all fields are filled correctly
2. Review `content/CLAUDE.md` — should be under 300 lines, clear structure
3. Review `content/README.md` — should explain the workflow, link to primitives
4. Review `content/QUICKSTART.md` — must cover customization steps for every installed primitive (project config, style guides, agents, templates, infrastructure). This is what `/skillset:install` walks end users through.
5. Review `PROOF.md` — must include links to production usage, metrics, evidence
6. Check that `content/.claude/` contains the primitives claimed in the README

Flag any issues. Help the user fix them.

## Step 3: Structural Audit (Claude Runs)

Run the tier 1 structural validation:

```
npx skillsets@latest audit
```

This validates:
- Manifest schema compliance
- Required files present
- Content structure
- Secrets scanning
- MCP server consistency
- Version comparison (for updates)

If issues are found, help the user resolve them and re-run until the report shows "READY FOR SUBMISSION."

## Step 4: Qualitative Review (User Runs)

The `/audit-skill` is a project-level skill installed by `npx skillsets init` in Step 1 — it's not part of this plugin. It lives at `.claude/skills/audit-skill/SKILL.md` in the user's skillset directory. Run:

```
/audit-skill [AUDIT_REPORT.md] [path/to/reference-repo]
```

This is the tier 2 Opus review — it evaluates primitive quality, researches MCP server reputation, scans for safety issues, runtime dependencies, and verifies workflow artifacts in the reference repo. It appends findings to `AUDIT_REPORT.md` and `skillset.yaml`

The user should iterate on feedback until the verdict is APPROVED.

## Step 5: Submit (User Runs)

**The user must run this command themselves** — it requires GitHub CLI authentication to fork the registry and open a PR:

```
npx skillsets@latest submit
```

Tell the user to run this in their terminal. It will:
- Validate the version (must be higher than existing for updates)
- Fork the registry repo
- Create a branch
- Copy the submission
- Open a PR

After submission, CI runs `npx skillsets audit --check` to re-validate, and a maintainer reviews the production proof.

