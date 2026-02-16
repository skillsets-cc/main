#!/usr/bin/env node

import { createRequire } from 'node:module';
import { program } from 'commander';
import { search } from './commands/search.js';
import { list } from './commands/list.js';
import { view } from './commands/view.js';
import { install } from './commands/install.js';
import { init } from './commands/init.js';
import { audit } from './commands/audit.js';
import { submit } from './commands/submit.js';
import { handleError } from './lib/errors.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

/** Wraps an async command action with unified error handling. */
function run<T extends unknown[]>(fn: (...args: T) => Promise<void>) {
  return (...args: T) => fn(...args).catch(handleError);
}

program
  .name('skillsets')
  .description('CLI tool for discovering and installing verified skillsets')
  .version(version);

// === Discovery Commands ===

program
  .command('list')
  .description('List all available skillsets')
  .option('-l, --limit <number>', 'Limit results')
  .option('-s, --sort <field>', 'Sort by: name, stars, downloads (default: name)')
  .option('--json', 'Output as JSON')
  .action(run(list));

program
  .command('search')
  .description('Search for skillsets by name, description, or tags')
  .argument('<query>', 'Search query')
  .option('-t, --tags <tags...>', 'Filter by tags')
  .option('-l, --limit <number>', 'Limit results (default: 10)', '10')
  .action(run(search));

program
  .command('view')
  .description('View a skillset README before installing')
  .argument('<skillsetId>', 'Skillset ID (e.g., @user/skillset-name)')
  .action(run(view));

program
  .command('install')
  .description('Install a skillset to the current directory')
  .argument('<skillsetId>', 'Skillset ID (e.g., @user/skillset-name)')
  .option('-f, --force', 'Overwrite existing files')
  .option('-b, --backup', 'Backup existing files before install')
  .option('--accept-mcp', 'Accept MCP servers without prompting (required for non-interactive environments)')
  .option('--accept-deps', 'Accept runtime dependencies without prompting')
  .action(run(install));

// === Contribution Commands ===

program
  .command('init')
  .description('Initialize a new skillset submission')
  .option('-y, --yes', 'Accept defaults without prompting')
  .option('--name <name>', 'Skillset name')
  .option('--description <desc>', 'Description (10-200 chars)')
  .option('--handle <handle>', 'GitHub handle (e.g., @username)')
  .option('--author-url <url>', 'Author URL')
  .option('--production-url <url>', 'Production URL')
  .option('--tags <tags>', 'Comma-separated tags')
  .action(run(init));

program
  .command('audit')
  .description('Validate skillset and generate audit report')
  .option('--check', 'Validate without writing AUDIT_REPORT.md (used by CI)')
  .action(run(audit));

program
  .command('submit')
  .description('Submit skillset to registry via GitHub PR')
  .action(run(submit));

program.parse();
