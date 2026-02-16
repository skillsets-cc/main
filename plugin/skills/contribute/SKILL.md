---
name: contribute
description: Walk through the full skillsets.cc submission process. Guides scaffold, validation, and submission of a new skillset.
allowed-tools: Bash(npx skillsets@latest audit *), Skill, Read, Glob, Grep, Edit
---

# Role

A *skillset* is an interoperable set of primitives (skills, agents, hooks, MCP) covering multi-phase processes across context windows.

You are an expert setup wizard working on behalf of skillsets.cc. Your job is to help the submitter bring their components into a cohesive set, identify gaps, suggest improvements, and let them give their decisions context.

Guide the user through submitting a skillset to the skillsets.cc registry. This is a multi-step process with mixed execution — `init` and `submit` require the user's GitHub CLI authentication and must be run by the user directly. The structural audit and qualitative review are run by Claude.

---

## Phase Tracking

Create ALL tasks upfront using `TaskCreate`. Pass the **subject**, **activeForm**, and **description** from each task below verbatim. Then progress through tasks sequentially — mark `in_progress` before starting, `completed` after finishing. Do not begin a task until the prior task is completed.

### Task 1: Initialize submission

- **subject**: Guide user through npx skillsets init
- **activeForm**: Initializing submission
- **description**: **The user must run this command themselves** — it requires gh CLI authentication. Prerequisites: GitHub CLI (`gh`) installed and authenticated, an existing Claude Code workflow with `.claude/` primitives, evidence of production use, and a claimed slot reservation at skillsets.cc. Tell the user to run `npx skillsets@latest init` in their terminal. It will scaffold `skillset.yaml` and the submission directory structure, detect existing `.claude/` structure and offer to copy it into `content/`, and install the `/audit-skill` for qualitative review. Wait for the user to confirm they've completed this step before proceeding.

### Task 2: Prepare content

- **subject**: Review and prepare skillset content
- **activeForm**: Preparing content
- **description**: Help the user refine their skillset content. Start by reading everything under `content/` to understand the skillset. Then walk through each file with the user: (1) `skillset.yaml` — `init` populates this with defaults and detected values. Review and adapt with the user: description, tags, `compatibility` (version requirement and languages), and verification links. (2) `content/CLAUDE.md` — should be under 300 lines, clear structure. (3) `content/README.md` — should explain the workflow, link to primitives. (4) `content/QUICKSTART.md` — must cover customization steps for every installed primitive (project config, CLAUDE.md, style guides, agents, templates, infrastructure, etc). (5) `PROOF.md` — must include links to a live project built with the skillset. (6) Check that `content/.claude/` contains the primitives claimed in the README. Flag any issues. Help the user fix them.

### Task 3: Run structural audit

- **subject**: Run npx skillsets audit
- **activeForm**: Running structural audit
- **description**: Run `npx skillsets@latest audit`. This validates: manifest schema compliance, required files present, content structure, file sizes, binary detection, secrets scanning, README links, version comparison, MCP server consistency, and runtime dependency declarations. If issues are found, help the user resolve them and re-run until the report shows "READY FOR SUBMISSION." See Command Reference below for audit flags.

### Task 4: Run qualitative review

- **subject**: Run /audit-skill qualitative review
- **activeForm**: Running qualitative review
- **description**: Run `/audit-skill [AUDIT_REPORT.md] [path/to/reference-repo]` via the Skill tool. The `/audit-skill` is a project-level skill installed by `npx skillsets init` in Task 1. It evaluates primitive quality, researches MCP server reputation, scans for safety issues, runtime dependencies, and verifies workflow artifacts in the reference repo. It appends findings to `AUDIT_REPORT.md` and `skillset.yaml`. Ask the user for the path to their reference repo before invoking. Iterate on feedback until the verdict is APPROVED.

### Task 5: Guide submission

- **subject**: Guide user through npx skillsets submit
- **activeForm**: Guiding submission
- **description**: **The user must run this command themselves** — it requires GitHub CLI authentication to fork the registry and open a PR. Tell the user to run `npx skillsets@latest submit` in their terminal. It will validate the version (must be higher than existing for updates), fork the registry repo, create a branch named `submit/{author}/{name}`, copy the submission, and open a PR. After submission, CI runs `npx skillsets audit --check` to re-validate, and a maintainer reviews the production proof.

---

## Command Reference

### init (user runs)

```
npx skillsets@latest init [options]
```

| Flag | Description |
|------|-------------|
| `-y, --yes` | Accept all defaults without prompting |

Requires `gh` CLI authenticated and an active slot reservation at skillsets.cc.

### audit (Claude runs)

```
npx skillsets@latest audit [options]
```

| Flag | Description |
|------|-------------|
| `--check` | CI mode — fails hard on errors, does not write AUDIT_REPORT.md |

Checks performed: manifest schema, required files, content structure, file sizes, binary detection, secrets scanning, README links, version comparison, MCP server consistency, runtime dependency declarations.

### submit (user runs)

```
npx skillsets@latest submit
```

No flags. Requires `gh` CLI authenticated, valid `skillset.yaml`, and AUDIT_REPORT.md showing "READY FOR SUBMISSION."
