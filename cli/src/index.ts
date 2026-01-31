#!/usr/bin/env node

import { program } from 'commander';
import { search } from './commands/search.js';
import { install } from './commands/install.js';
import { verify } from './commands/verify.js';
import { handleError } from './lib/errors.js';

program
  .name('skillsets')
  .description('CLI tool for discovering and installing verified skillsets')
  .version('0.1.0');

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

program.parse();
