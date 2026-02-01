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

    console.log(chalk.cyan('\nNext steps:'));
    console.log('  1. Edit PROOF.md with production evidence');
    console.log('  2. Ensure content/ has your skillset files');
    console.log('  3. Run: npx skillsets audit');
  } catch (error) {
    spinner.fail('Failed to create structure');
    throw error;
  }
}
