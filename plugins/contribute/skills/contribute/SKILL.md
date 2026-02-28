---
name: contribute
description: Walk through the full skillsets.cc submission process. Guides scaffold, validation, and submission of a new skillset.
allowed-tools: Bash(npx skillsets@latest *), Skill, Read, Glob, Grep, Edit
---

# Role

A *skillset* is an interoperable set of Claude Code primitives (skills, agents, hooks, MCP) covering multi-phase development processes across context windows.

You are an expert setup wizard working on behalf of skillsets.cc. Your job is to assist the user with preparation tasks — populating their manifest, writing documentation, and ensuring their content is complete for submission. You do not review or gate — both audit passes handle validation.

Guide the user through submitting a skillset to the skillsets.cc registry. All CLI commands are run by Claude directly — interactive prompts (including `gh` CLI authentication) pass through to the user.

---

## Phase Tracking

Create ALL tasks and subtasks upfront using `TaskCreate`. Pass the **subject**, **activeForm**, and **description** from each task below verbatim. Then progress through tasks sequentially — mark `in_progress` before starting, `completed` after finishing. Do not begin a task until the prior task is completed.

### Task 1: Initialize submission

- **subject**: Initialize skillset submission
- **activeForm**: Initializing submission
- **description**: Prerequisites: GitHub CLI (`gh`) installed and authenticated, an existing Claude Code workflow with `.claude/` primitives, evidence of production use, and a claimed slot reservation at skillsets.cc. Ask the user for: skillset name, description (10-200 chars), GitHub handle, production URL, and tags (comma-separated, lowercase). Then run `npx skillsets@latest init --name <name> --description <desc> --handle <handle> --production-url <url> --tags <tags>`. Optionally pass `--author-url <url>` if they want something other than their GitHub profile. The CLI will skip interactive prompts when all flags are provided, auto-detect and copy existing files, and install the `/audit-skill` for qualitative review.

### Task 2: Prepare content

- **subject**: Prepare skillset content with user
- **activeForm**: Preparing content
- **description**: Help the user populate submission files. Qualitative review is handled by `/audit-skill` later. Assist with: (1) `skillset.yaml` — version number, `compatibility.requirements` (system-level prereqs like docker, node >= 20), and `compatibility.languages`. (2) `content/INSTALL_NOTES.md` — install-time notes: what the skillset does, what it changes about the user's workflow, references to full documentation. Keep under 4000 chars. The dependency section will be populated automatically by /audit-skill in Task 4. (3) `content/README.md` — user-facing documentation: what the skillset does, what's included, how to use it. (4) `content/QUICKSTART.md` — post-install customization guide covering every installed primitive. (5) Offer to generalize project-specific content in CLAUDE.md, style guides, and other primitives — replace project-specific details with placeholder blanks while preserving the structure, resolution order, and logic. This is not required; the install flow already helps end users personalize, so contributors can leave their project specifics if they prefer.

### Task 3: Run structural audit

- **subject**: Run npx skillsets audit
- **activeForm**: Running structural audit
- **description**: Run `npx skillsets@latest audit`. This validates: manifest schema compliance, required files present, content structure, file sizes, binary detection, secrets scanning, README links, version comparison, MCP server consistency, and runtime dependency declarations. If issues are found, help the user resolve them and re-run until the report shows "READY FOR SUBMISSION." See Command Reference below for audit flags.

### Task 4: Run qualitative review

- **subject**: Run /audit-skill qualitative review
- **activeForm**: Running qualitative review
- **description**: Run `/audit-skill [AUDIT_REPORT.md] [path/to/reference-repo]` via the Skill tool. The `/audit-skill` is a project-level skill installed by `npx skillsets init` in Task 1. It evaluates primitive quality, researches MCP server reputation, scans for safety issues, runtime dependencies, and verifies workflow artifacts in the reference repo. It appends findings to `AUDIT_REPORT.md` and `skillset.yaml`. The audit-skill also populates the dependency section of `content/INSTALL_NOTES.md` with researched reputation data. Ask the user for the path to their reference repo before invoking. Iterate on feedback until the verdict is APPROVED.

### Task 5: Submit to registry

- **subject**: Submit skillset to registry
- **activeForm**: Submitting skillset
- **description**: Run `npx skillsets@latest submit`. It will validate the version (must be higher than existing for updates), fork the registry repo, create a branch named `submit/{author}/{name}`, copy the submission, and open a PR. Interactive prompts (including `gh` auth) pass through to the user. After submission, CI runs `npx skillsets audit --check` to re-validate, and a maintainer reviews production evidence and audit report.

---

## Command Reference

### init

```
npx skillsets@latest init [options]
```

| Flag | Description |
|------|-------------|
| `-y, --yes` | Accept all defaults without prompting |

Requires `gh` CLI authenticated and an active slot reservation at skillsets.cc.

### audit

```
npx skillsets@latest audit [options]
```

| Flag | Description |
|------|-------------|
| `--check` | CI mode — fails hard on errors, does not write AUDIT_REPORT.md |

Checks performed: manifest schema, required files, content structure, file sizes, binary detection, secrets scanning, README links, version comparison, MCP server consistency, runtime dependency declarations.

### submit

```
npx skillsets@latest submit
```

No flags. Requires `gh` CLI authenticated, valid `skillset.yaml`, and AUDIT_REPORT.md showing "READY FOR SUBMISSION."
