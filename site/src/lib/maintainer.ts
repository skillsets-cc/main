/**
 * Maintainer authorization utility.
 *
 * Determines if a user is a maintainer based on MAINTAINER_USER_IDS environment variable.
 */
import type { Env } from './auth';

/**
 * Check if a user is a maintainer based on MAINTAINER_USER_IDS env var.
 *
 * @param env - Environment containing MAINTAINER_USER_IDS (comma-separated list)
 * @param userId - GitHub numeric user ID to check
 * @returns true if userId is in the maintainer list, false otherwise
 */
export function isMaintainer(env: Env, userId: string): boolean {
  const ids = (env.MAINTAINER_USER_IDS ?? '').split(',').map(s => s.trim());
  return ids.includes(userId);
}
