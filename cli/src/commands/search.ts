import Fuse from 'fuse.js';
import chalk from 'chalk';
import { fetchSearchIndex } from '../lib/api.js';
import { DEFAULT_SEARCH_LIMIT } from '../lib/constants.js';

interface SearchOptions {
  tags?: string[];
  limit?: string;
}

export async function search(query: string, options: SearchOptions): Promise<void> {
  console.log(chalk.blue(`Searching for: ${query}`));

  // Fetch index from CDN
  const index = await fetchSearchIndex();

  // Filter by tags if provided
  let filtered = index.skillsets;
  if (options.tags && options.tags.length > 0) {
    filtered = filtered.filter((skillset) =>
      options.tags!.some((tag) => skillset.tags.includes(tag))
    );
  }

  // Fuzzy search
  const fuse = new Fuse(filtered, {
    keys: ['name', 'description', 'tags', 'author.handle'],
    threshold: 0.3,
    includeScore: true,
  });

  const results = fuse.search(query);
  const limit = parseInt(options.limit || DEFAULT_SEARCH_LIMIT.toString(), 10);

  if (results.length === 0) {
    console.log(chalk.yellow('No results found.'));
    return;
  }

  console.log(chalk.green(`\nFound ${results.length} result(s):\n`));

  results.slice(0, limit).forEach(({ item }) => {
    console.log(chalk.bold(item.name));
    console.log(`  ${item.description}`);
    console.log(`  ${chalk.gray(`by ${item.author.handle}`)}`);
    console.log(`  ${chalk.yellow(`★ ${item.stars}`)} ${chalk.gray(`• v${item.version}`)}`);
    console.log(`  ${chalk.cyan(`npx skillsets install ${item.id}`)}`);
    console.log();
  });

  if (results.length > limit) {
    console.log(chalk.gray(`... and ${results.length - limit} more`));
  }
}
