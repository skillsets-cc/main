# Maintainer Review

Skillsets.cc uses high-friction contributor gating. By the time a PR reaches you:

- **Tier 1** (`npx skillsets audit`): Structure validated
- **Tier 2** (`/audit-skill`): Opus qualitative review passed
- **CI**: Schema, files, secrets, author verification passed

Your job is curation, not QA. The question isn't "is this valid?" - it's "is this worth including?"

---

## Curation Check

1. **Is it a real workflow?** Not just a prompt dump or thin wrapper
2. **Does it add something new?** Not duplicating what's already in the registry
3. **Is it novel or clever?** Interesting approach, useful pattern, worth sharing

---

## Practical Workflow

- Skim the README (or ask Claude to summarize if long)
- Read deeper if it looks interesting
- Check production URL - does it work, is it relevant?
- Glance at PROOF.md and AUDIT_REPORT.md
- Make a call

---

## Decision

| Action | When |
|--------|------|
| **Approve** | Real workflow, adds value, proof checks out |
| **Request changes** | Promising but needs specific fixes |
| **Reject** | Not a real workflow, duplicate, spam, fabricated proof |

---

## Notes

- Max 15-20 min per PR
- Automated gating handles validity - trust it
- skillsets.cc provides no guarantees; users have normal OSS review responsibilities

---

**Last Updated**: 2025-01-30
