#!/usr/bin/env node

import { program } from 'commander';
import { search } from './commands/search.js';
import { list } from './commands/list.js';
import { install } from './commands/install.js';
import { verify } from './commands/verify.js';
import { init } from './commands/init.js';
import { audit } from './commands/audit.js';
import { submit } from './commands/submit.js';
import { handleError } from './lib/errors.js';

program
  .name('skillsets')
  .description('CLI tool for discovering and installing verified skillsets')
  .version('0.1.0');

// === Discovery Commands ===

program
  .command('list')
  .description('List all available skillsets')
  .option('-l, --limit <number>', 'Limit results')
  .option('-s, --sort <field>', 'Sort by: name, stars, downloads (default: name)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      await list(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('search')
  .description('Search for skillsets by name, description, or tags')
  .argument('<query>', 'Search query')
  .option('-t, --tags <tags...>', 'Filter by tags')
  .option('-l, --limit <number>', 'Limit results (default: 10)', '10')
  .action(async (query, options) => {
    try {
      await search(query, options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('install')
  .description('Install a skillset to the current directory')
  .argument('<skillsetId>', 'Skillset ID (e.g., @user/skillset-name)')
  .option('-f, --force', 'Overwrite existing files')
  .option('-b, --backup', 'Backup existing files before install')
  .action(async (skillsetId, options) => {
    try {
      await install(skillsetId, options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('verify')
  .description('Verify installed skillset checksums against registry')
  .option('-d, --dir <path>', 'Directory to verify (default: current)', '.')
  .action(async (options) => {
    try {
      await verify(options);
    } catch (error) {
      handleError(error);
    }
  });

// === Contribution Commands ===

program
  .command('init')
  .description('Initialize a new skillset submission')
  .option('-y, --yes', 'Accept defaults without prompting')
  .action(async (options) => {
    try {
      await init(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('audit')
  .description('Validate skillset and generate audit report')
  .action(async () => {
    try {
      await audit();
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('submit')
  .description('Submit skillset to registry via GitHub PR')
  .action(async () => {
    try {
      await submit();
    } catch (error) {
      handleError(error);
    }
  });

program.parse();
