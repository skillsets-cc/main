/**
 * Maintainer authorization utility.
 * Checks MAINTAINER_USER_IDS environment variable (comma-separated).
 */
import type { Env } from './auth';

export function isMaintainer(env: Env, userId: string): boolean {
  const ids = (env.MAINTAINER_USER_IDS ?? '').split(',').map(s => s.trim());
  return ids.includes(userId);
}
