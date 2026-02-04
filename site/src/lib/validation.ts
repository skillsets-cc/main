/** Validate skillset ID format to prevent KV key injection. */
export function isValidSkillsetId(id: string): boolean {
  return /^@?[\w-]+\/[\w-]+$/.test(id);
}
