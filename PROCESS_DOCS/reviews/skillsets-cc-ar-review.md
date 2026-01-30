# Adversarial Review: Skillsets.cc Design

**Document**: `DOCS/design/skillsets-cc-design.md`
**Date**: 2026-01-30
**Reviewers**: ar-o (Opus), ar-d (Deepseek), ar-g (Gemini/Antigravity - prior review)
**Orchestrator**: Opus

---

## Summary

The design for Skillsets.cc presents a sound ZeroOps architecture leveraging GitHub + Cloudflare. The differentiation from SkillsMP (verified production stacks vs. atomic skills) is compelling. However, **three critical specification gaps** must be resolved before implementation can proceed safely.

---

## Critical (Must Address)

### 1. Search Architecture (GitHub API Rate Limits)
**Raised by**: ar-o, ar-d, ar-g (unanimous)

CLI search "Query GitHub API for matching skillsets" will fail at scale:
- Unauthenticated: 60 requests/hour
- Authenticated: 5,000 requests/hour
- Popular CLI with concurrent users will hit ceiling immediately

**Impact**: Core user journey (discover → install) breaks under normal usage.

**Mitigation**: Build-time search index:
- Generate `search-index.json` during site build (name, description, tags, author, stars)
- CLI fetches index from CDN (Cloudflare Pages serves static files)
- Client-side fuzzy search via Fuse.js or similar
- Zero runtime GitHub API dependency for discovery

### 2. Checksum Verification Specification Missing
**Raised by**: ar-o, ar-d, ar-g (unanimous)

`npx skillsets verify` is mentioned but completely unspecified:
- Checksum algorithm? (SHA-256 recommended)
- Where stored? (registry index? per-skillset file?)
- When computed? (PR merge? build time?)
- What on mismatch? (error? warning? auto-reinstall?)

**Impact**: `degit` downloads tarballs with no cryptographic verification. Without this, supply chain attacks are trivial.

**Mitigation**: Explicit specification:
```yaml
# In search-index.json or skillsets-index.json
{
  "@supercollectible/The_Skillset": {
    "checksum": "sha256:abc123...",
    "computed_at": "2026-01-30T12:00:00Z",
    "files": {
      "content/CLAUDE.md": "sha256:def456...",
      "skillset.yaml": "sha256:ghi789..."
    }
  }
}
```
CLI verify computes local file hashes and compares against registry. Mismatch = error + reinstall prompt.

### 3. OAuth CSRF Protection Unspecified
**Raised by**: ar-o, ar-d

"GitHub OAuth via Cloudflare Worker (~30 lines)" omits critical security requirements:
- `state` parameter for CSRF protection (required by OAuth 2.0 spec)
- Session binding for state validation
- PKCE for public clients (required by OAuth 2.1)

**Impact**: OAuth flow vulnerable to CSRF attacks. Attacker could link victim's GitHub account to attacker's session.

**Mitigation**: Document OAuth flow explicitly:
1. Login redirect generates cryptographically random `state`, stores in KV with TTL
2. GitHub callback validates `state` matches stored value
3. Implement PKCE (`code_verifier` / `code_challenge`)
4. Session token stored in httpOnly cookie, not localStorage

---

## Recommended (High Value)

### 4. Versioning Strategy Absent
**Raised by**: ar-o, ar-d, prior review (unanimous)

Schema has no `version` field for skillset content. Breaking changes silently affect all users.

**Mitigation**:
- Add `version` field to `skillset.yaml` (semver)
- Support pinned installs: `npx skillsets install @user/set@1.2.0`
- Consider storing version history in registry

### 5. Conflict Resolution Undefined
**Raised by**: ar-d

When installing into a project with existing `.claude/` or `CLAUDE.md`, what happens? degit fails on existing files unless forced.

**Mitigation**: Specify merge strategy:
- Error by default with instructions
- `--force` to overwrite
- `--merge` to combine (with conflict markers)

### 6. KV Write Rate Limits for Stars
**Raised by**: ar-o, ar-d

Cloudflare KV has 1 write/second per key soft limit. Rapid star/unstar on popular skillset could fail.

**Mitigation**:
- Add Cloudflare rate limiting binding (10 star ops/minute per user)
- Queue writes with exponential backoff
- Optimistic UI updates (show star immediately, reconcile async)

### 7. Astro 5 Output Mode Clarification
**Raised by**: ar-o

Astro 5 removed `output: "hybrid"`. Must explicitly choose `static` or `server`.

**Mitigation**: Specify `output: 'server'` with `export const prerender = true` on static pages (home, contribute) and dynamic routes (dashboard, detail pages) render on-demand.

---

## Noted (Awareness)

### 8. Mono-repo Size Growth
At scale (1000+ skillsets), Git operations slow. Set size limits per skillset (e.g., 1MB content). Document archival strategy.

### 9. KV Eventual Consistency
Stars may show ~60s stale. Use optimistic UI updates. Document in UX.

### 10. CLI Typosquatting Risk
`skillsets` is close to `skillset`, `skill-sets`. Consider defensive package registration.

### 11. Local Development Story
KV, OAuth not accessible in local Astro dev. Document Miniflare or `wrangler dev --remote` workflow.

### 12. Missing Error Handling Specifications
What happens when: GitHub down during build? KV write fails? OAuth callback fails? degit fails mid-download? Need graceful degradation strategy.

### 13. Entry Point Optional vs Required
Schema shows `entry_point` not in `required` array but example includes it. Clarify default behavior when omitted.

---

## Validated (Sound Decisions)

| Decision | Assessment |
|----------|------------|
| GitHub mono-repo for registry | Correct - enables PR diffing, single source of truth |
| degit over git clone | Correct for UX - no .git folder, subfolder extraction. Risk mitigated by checksums |
| Cloudflare Pages + Workers | Correct - ZeroOps, generous free tier, integrated KV |
| Astro for static-first | Correct - content-driven with interactive islands |
| GitHub OAuth for identity | Correct - prevents anonymous gaming, users already have accounts |
| Tailwind CSS | Standard choice, good Astro integration |
| The_Skillset as first entry | Excellent - dogfooding establishes credibility |

---

## Agent Concordance Matrix

| Issue | ar-o (Opus) | ar-d (Deepseek) | ar-g (Gemini) |
|-------|-------------|-----------------|---------------|
| Search rate limits | Critical | Critical | **Anti-Pattern** |
| Checksum spec missing | Critical | High | Critical |
| OAuth CSRF | Critical | High | - |
| Versioning absent | High | Critical | Critical |
| Conflict resolution | - | High | - |
| KV rate limits | Medium | High | Minor |
| Astro output mode | Medium | Low | - |

**Convergence**: 3/3 reviewers flagged search rate limits and checksum verification. 2/3 flagged OAuth and versioning.

---

## Trust Model Clarification

The following concerns were initially flagged but **dismissed** after understanding the actual trust model:

| Dismissed | Why |
|-----------|-----|
| Audit report forgery | Audit is structural QA (schema/files), not a trust signal |
| Production proof spoofing | If it doesn't work, nobody uses it—self-correcting |
| Namespace squatting | Submissions tied to GitHub profiles; reputation matters |

**The actual trust model:**
- **Friction** — submission process raises the bar (audit + proof + PR review)
- **Honor system** — contributors stake their GitHub reputation
- **User responsibility** — users verify/adapt like any OSS, no guarantees
- **Market forces** — broken skillsets don't get used

This isn't npm trying to serve millions. It's a curated collection where quality > quantity.

---

## Recommendation

**[ ] REVISE** — Critical issues require design changes before /plan

Three critical specification gaps must be addressed:

1. **Search architecture**: Specify build-time index (not GitHub API at runtime)
2. **Checksum verification**: Fully specify algorithm, storage, timing, mismatch handling
3. **OAuth CSRF**: Document state parameter + PKCE requirements

Once these three items are specified in the design document, the architecture is sound and ready for implementation planning.

---

## Sources

- ar-o (Opus): Live review 2026-01-30
- ar-d (Deepseek): Live review 2026-01-30
- ar-g (Gemini/Antigravity): `DOCS/reviews/skillsets-cc-design-review.md` (2026-01-29)
- Context7: Astro docs, Cloudflare Workers docs
- Web: Snyk degit vulnerabilities, npm supply chain attack reports, OWASP OAuth security
