import chalk from 'chalk';
import ora from 'ora';
import { input, confirm, checkbox } from '@inquirer/prompts';
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

interface InitOptions {
  yes?: boolean;
}

const SKILLSET_YAML_TEMPLATE = `schema_version: "1.0"

# Identity
name: "{{NAME}}"
version: "1.0.0"
description: "{{DESCRIPTION}}"

author:
  handle: "{{AUTHOR_HANDLE}}"
  url: "{{AUTHOR_URL}}"

# Verification
verification:
  production_url: "{{PRODUCTION_URL}}"
  production_proof: "./PROOF.md"
  audit_report: "./AUDIT_REPORT.md"

# Discovery
tags:
{{TAGS}}

compatibility:
  claude_code_version: ">=1.0.0"
  languages:
    - "any"

# Lifecycle
status: "active"

# Content
entry_point: "./content/CLAUDE.md"
`;

const README_TEMPLATE = `# {{NAME}}

{{DESCRIPTION}}

## Installation

\`\`\`bash
npx skillsets install {{AUTHOR_HANDLE}}/{{NAME}}
\`\`\`

## Usage

[Describe how to use your skillset]

## What's Included

[List the key files and their purposes]

## License

[Your license]
`;

const PROOF_TEMPLATE = `# Production Proof

## Overview

This skillset has been verified in production.

## Production URL

{{PRODUCTION_URL}}

## Evidence

[Add screenshots, testimonials, or other evidence of production usage]

## Projects Built

[List projects or products built using this skillset]
`;

const AUDIT_SKILL_MD = `---
name: audit-skill
description: Qualitative review of skillset content against Claude Code best practices. Evaluates all primitives (skills, agents, hooks, MCP, CLAUDE.md) for proper frontmatter, descriptions, and structure. Appends analysis to AUDIT_REPORT.md.
---

# Skillset Qualitative Audit

## Task

1. Verify \`AUDIT_REPORT.md\` shows "READY FOR SUBMISSION"
2. Identify all primitives in \`content/\`:
   - Skills: \`**/SKILL.md\`
   - Agents: \`**/AGENT.md\` or \`**/*.agent.md\`
   - Hooks: \`**/hooks.json\`
   - MCP: \`**/.mcp.json\` or \`**/mcp.json\`
   - CLAUDE.md: \`CLAUDE.md\` or \`.claude/settings.json\`
3. Evaluate each against [CRITERIA.md](CRITERIA.md)
4. Append findings to \`AUDIT_REPORT.md\`

## Per-Primitive Evaluation

### Skills
- Frontmatter has \`name\` and \`description\`
- Description includes trigger phrases ("Use when...")
- Body under 500 lines
- \`allowed-tools\` if restricting access
- \`disable-model-invocation\` for side-effect commands

### Agents
- Description has \`<example>\` blocks
- System prompt has role, responsibilities, process, output format
- \`tools\` array if restricting access

### Hooks
- Valid JSON structure
- Matchers are specific (not just \`.*\`)
- Reasonable timeouts
- Prompts are actionable

### MCP
- Uses \`\${CLAUDE_PLUGIN_ROOT}\` for paths
- Env vars use \`\${VAR}\` syntax
- No hardcoded secrets

### CLAUDE.md
- Under 300 lines (check line count)
- Has WHAT/WHY/HOW sections
- Uses \`file:line\` pointers, not code snippets
- Progressive disclosure for large content

## Output

Append to \`AUDIT_REPORT.md\`:

\`\`\`markdown
---

## Qualitative Review

**Reviewed by:** Claude (Opus)
**Date:** [ISO timestamp]

### Primitives Found

| Type | Count | Files |
|------|-------|-------|
| Skills | N | [list] |
| Agents | N | [list] |
| Hooks | N | [list] |
| MCP | N | [list] |
| CLAUDE.md | Y/N | [path] |

### Issues

[List each issue with file:line and specific fix needed]

### Verdict

**[APPROVED / NEEDS REVISION]**

[If needs revision: prioritized list of must-fix items]
\`\`\`
`;

const AUDIT_CRITERIA_MD = `# Evaluation Criteria

Rubric for qualitative skillset review. Each primitive type has specific requirements.

---

## Skills (SKILL.md)

Skills and slash commands are now unified. File at \`.claude/skills/[name]/SKILL.md\` creates \`/name\`.

### Frontmatter Requirements

| Field | Required | Notes |
|-------|----------|-------|
| \`name\` | Yes | Becomes the \`/slash-command\`, lowercase with hyphens |
| \`description\` | Yes | **Critical for discoverability** - Claude uses this to decide when to load |
| \`version\` | No | Semver for tracking |
| \`allowed-tools\` | No | Restricts tool access (e.g., \`Read, Write, Bash(git:*)\`) |
| \`model\` | No | \`sonnet\`, \`opus\`, or \`haiku\` |
| \`disable-model-invocation\` | No | \`true\` = only user can invoke (for side-effect commands) |
| \`user-invocable\` | No | \`false\` = only Claude can invoke (background knowledge) |

### Description Quality

**GOOD:** Includes trigger phrases ("Use when reviewing PRs, checking vulnerabilities...")
**POOR:** Vague ("Helps with code review")

---

## Agents (AGENT.md)

### Frontmatter Requirements

| Field | Required | Notes |
|-------|----------|-------|
| \`name\` | Yes | Agent identifier |
| \`description\` | Yes | **Must include \`<example>\` blocks** for reliable triggering |
| \`model\` | No | \`inherit\`, \`sonnet\`, \`opus\`, \`haiku\` |
| \`color\` | No | UI color hint |
| \`tools\` | No | Array of allowed tools |

### System Prompt (Body)

- Clear role definition ("You are...")
- Core responsibilities numbered
- Process/workflow steps
- Expected output format

---

## Hooks (hooks.json)

### Event Types

| Event | When | Use For |
|-------|------|---------|
| \`PreToolUse\` | Before tool executes | Validation, security checks |
| \`PostToolUse\` | After tool completes | Feedback, logging |
| \`Stop\` | Task completion | Quality gates, notifications |
| \`SessionStart\` | Session begins | Context loading, env setup |

### Quality Checks

- Matchers are specific (avoid \`.*\` unless intentional)
- Timeouts are reasonable
- Prompts are concise and actionable

---

## MCP Servers (.mcp.json)

### Quality Checks

- Uses \`\${CLAUDE_PLUGIN_ROOT}\` for paths
- Environment variables use \`\${VAR}\` syntax
- Sensitive values reference env vars, not hardcoded

---

## CLAUDE.md

### Critical Constraints

- **Under 300 lines** (ideally <60)
- LLMs follow ~150-200 instructions; Claude Code system prompt uses ~50

### Required Content (WHAT, WHY, HOW)

- **WHAT**: Tech stack, project structure, codebase map
- **WHY**: Project purpose, component functions
- **HOW**: Dev workflows, tools, testing, verification

### What to Avoid

- Task-specific instructions
- Code style rules (use linters + hooks)
- Code snippets (use \`file:line\` pointers)
- Hardcoded dates/versions

---

## Verdict Rules

- **APPROVED**: All primitives meet requirements, minor issues only
- **NEEDS REVISION**: Missing required fields, poor descriptions, oversized files

Priority:
1. Missing/poor descriptions (affects discoverability)
2. Oversized CLAUDE.md (degrades all instructions)
3. Missing agent examples (unreliable triggering)
`;

function copyDirRecursive(src: string, dest: string): void {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

export async function init(options: InitOptions): Promise<void> {
  console.log(chalk.blue('\n📦 Initialize a new skillset submission\n'));

  const cwd = process.cwd();

  // Check if already initialized
  if (existsSync(join(cwd, 'skillset.yaml'))) {
    console.log(chalk.yellow('⚠ skillset.yaml already exists in this directory.'));
    const overwrite = await confirm({
      message: 'Overwrite existing files?',
      default: false,
    });
    if (!overwrite) {
      console.log(chalk.gray('Aborted.'));
      return;
    }
  }

  // Gather information
  const name = await input({
    message: 'Skillset name (alphanumeric, hyphens, underscores):',
    validate: (value) => {
      if (!/^[A-Za-z0-9_-]+$/.test(value)) {
        return 'Name must be alphanumeric with hyphens/underscores only';
      }
      if (value.length < 1 || value.length > 100) {
        return 'Name must be 1-100 characters';
      }
      return true;
    },
  });

  const description = await input({
    message: 'Description (10-200 characters):',
    validate: (value) => {
      if (value.length < 10 || value.length > 200) {
        return 'Description must be 10-200 characters';
      }
      return true;
    },
  });

  const authorHandle = await input({
    message: 'GitHub handle (e.g., @username):',
    validate: (value) => {
      if (!/^@[A-Za-z0-9_-]+$/.test(value)) {
        return 'Handle must start with @ followed by alphanumeric characters';
      }
      return true;
    },
  });

  const authorUrl = await input({
    message: 'Author URL (GitHub profile or website):',
    default: `https://github.com/${authorHandle.slice(1)}`,
  });

  const productionUrl = await input({
    message: 'Production URL (live deployment, repo, or case study):',
    validate: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return 'Must be a valid URL';
      }
    },
  });

  const tagsInput = await input({
    message: 'Tags (comma-separated, lowercase, e.g., sdlc,planning,multi-agent):',
    validate: (value) => {
      const tags = value.split(',').map((t) => t.trim());
      if (tags.length < 1 || tags.length > 10) {
        return 'Must have 1-10 tags';
      }
      for (const tag of tags) {
        if (!/^[a-z0-9-]+$/.test(tag)) {
          return `Tag "${tag}" must be lowercase alphanumeric with hyphens only`;
        }
      }
      return true;
    },
  });

  const tags = tagsInput.split(',').map((t) => t.trim());

  // Auto-detect existing files
  const detectedFiles: string[] = [];
  if (existsSync(join(cwd, '.claude'))) {
    detectedFiles.push('.claude/');
  }
  if (existsSync(join(cwd, 'CLAUDE.md'))) {
    detectedFiles.push('CLAUDE.md');
  }

  let filesToCopy: string[] = [];
  if (detectedFiles.length > 0) {
    console.log(chalk.green('\n✓ Detected existing skillset files:'));
    detectedFiles.forEach((f) => console.log(`  - ${f}`));

    filesToCopy = await checkbox({
      message: 'Select files to copy to content/:',
      choices: detectedFiles.map((f) => ({ name: f, value: f, checked: true })),
    });
  }

  // Create structure
  const spinner = ora('Creating skillset structure...').start();

  try {
    // Create content directory
    mkdirSync(join(cwd, 'content'), { recursive: true });

    // Copy selected files to content/
    for (const file of filesToCopy) {
      const src = join(cwd, file);
      const dest = join(cwd, 'content', file);

      if (file.endsWith('/')) {
        // Directory
        copyDirRecursive(src.slice(0, -1), dest.slice(0, -1));
      } else {
        // File
        copyFileSync(src, dest);
      }
    }

    // Generate skillset.yaml
    const tagsYaml = tags.map((t) => `  - "${t}"`).join('\n');
    const skillsetYaml = SKILLSET_YAML_TEMPLATE
      .replace('{{NAME}}', name)
      .replace('{{DESCRIPTION}}', description)
      .replace('{{AUTHOR_HANDLE}}', authorHandle)
      .replace('{{AUTHOR_URL}}', authorUrl)
      .replace('{{PRODUCTION_URL}}', productionUrl)
      .replace('{{TAGS}}', tagsYaml);

    writeFileSync(join(cwd, 'skillset.yaml'), skillsetYaml);

    // Generate README.md (if not copying existing)
    if (!existsSync(join(cwd, 'README.md'))) {
      const readme = README_TEMPLATE
        .replace(/\{\{NAME\}\}/g, name)
        .replace(/\{\{DESCRIPTION\}\}/g, description)
        .replace(/\{\{AUTHOR_HANDLE\}\}/g, authorHandle);

      writeFileSync(join(cwd, 'README.md'), readme);
    }

    // Generate PROOF.md
    const proof = PROOF_TEMPLATE.replace('{{PRODUCTION_URL}}', productionUrl);
    writeFileSync(join(cwd, 'PROOF.md'), proof);

    // Install audit-skill skill to .claude/skills/
    const skillDir = join(cwd, '.claude', 'skills', 'audit-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), AUDIT_SKILL_MD);
    writeFileSync(join(skillDir, 'CRITERIA.md'), AUDIT_CRITERIA_MD);

    spinner.succeed('Skillset structure created');

    // Summary
    console.log(chalk.green('\n✓ Initialized skillset submission:\n'));
    console.log('  skillset.yaml     - Manifest (edit as needed)');
    console.log('  README.md         - Documentation');
    console.log('  PROOF.md          - Production evidence (add details)');
    console.log('  content/          - Installable files');
    if (filesToCopy.length > 0) {
      filesToCopy.forEach((f) => console.log(`    └── ${f}`));
    } else {
      console.log('    └── (add your .claude/ and/or CLAUDE.md here)');
    }
    console.log('  .claude/skills/   - Audit skill installed');
    console.log('    └── audit-skill/');

    console.log(chalk.cyan('\nNext steps:'));
    console.log('  1. Edit PROOF.md with production evidence');
    console.log('  2. Ensure content/ has your skillset files');
    console.log('  3. Run: npx skillsets audit');
    console.log('  4. Run: /audit-skill [AUDIT_REPORT.md] [path/to/reference-repo]');
  } catch (error) {
    spinner.fail('Failed to create structure');
    throw error;
  }
}
