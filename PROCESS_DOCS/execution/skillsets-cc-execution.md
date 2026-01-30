# Execution Plan: Skillsets.cc

> Transforming the approved [skillsets-cc-design.md](file:///home/nook/Documents/code/skillsets.cc/DOCS/design/skillsets-cc-design.md) into actionable task groups.

---

## Overview

- **Objective**: Build a curated registry of production-verified Claude Code workflows with a static site, GitHub-based submission workflow, and CLI installation tool.
- **Scope**:
  - Includes: GitHub mono-repo registry, Astro static site, Cloudflare Workers (OAuth + Stars), CLI npm package
  - Excludes: Paid features, versioned downloads (always latest), moderation dashboard
- **Dependencies**:
  - GitHub (OAuth app, Actions, mono-repo hosting)
  - Cloudflare (Pages, Workers, KV namespace)
  - npm (CLI package publishing)
  - degit (subfolder extraction)
- **Estimated Complexity**: **High** — 3 independent subsystems with OAuth, CI/CD, and CLI distribution

---

## Build Agent 1: Registry Foundation

**Scope**: Create the `skillsets-cc/registry` GitHub mono-repo with schema validation, CI workflows, and seed content.

### Task 1.1: Repository Structure Setup

- **Description**: Initialize the registry mono-repo with folder hierarchy.
- **Acceptance Criteria**:
  - [ ] `skillsets/` directory exists for namespace folders
  - [ ] `schema/` directory contains validation schema
  - [ ] `.github/workflows/` contains CI workflow stubs
  - [ ] Root `README.md` describes the registry purpose
- **Files to Create**:
  ```
  skillsets-cc/registry/
  ├── skillsets/
  │   └── .gitkeep
  ├── schema/
  │   └── .gitkeep
  ├── .github/
  │   └── workflows/
  │       └── .gitkeep
  └── README.md
  ```
- **Dependencies**: None

---

### Task 1.2: JSON Schema for skillset.yaml

- **Description**: Create the JSON Schema that validates all `skillset.yaml` manifests.
- **Acceptance Criteria**:
  - [ ] Schema validates required fields: `schema_version`, `name`, `version`, `description`, `author`, `verification`, `tags`
  - [ ] `name` pattern enforces `^[A-Za-z0-9_-]+$`
  - [ ] `version` pattern enforces semver `^[0-9]+\.[0-9]+\.[0-9]+$`
  - [ ] `status` enum: `["active", "deprecated", "archived"]`
  - [ ] `description` maxLength: 200 characters
- **Files to Create**:
  ```
  schema/skillset.schema.json
  ```
- **Code Example**:
  ```json
  {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": ["schema_version", "name", "version", "description", "author", "verification", "tags"],
    "properties": {
      "schema_version": { "const": "1.0" },
      "name": { "type": "string", "pattern": "^[A-Za-z0-9_-]+$" },
      "version": { "type": "string", "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+$" },
      "description": { "type": "string", "maxLength": 200 },
      "author": {
        "type": "object",
        "required": ["handle"],
        "properties": {
          "handle": { "type": "string" },
          "url": { "type": "string", "format": "uri" }
        }
      },
      "verification": {
        "type": "object",
        "required": ["production_url", "audit_report"],
        "properties": {
          "production_url": { "type": "string", "format": "uri" },
          "production_proof": { "type": "string" },
          "audit_report": { "type": "string" }
        }
      },
      "tags": {
        "type": "array",
        "items": { "type": "string" },
        "minItems": 1
      },
      "compatibility": {
        "type": "object",
        "properties": {
          "claude_code_version": { "type": "string" },
          "languages": { "type": "array", "items": { "type": "string" } }
        }
      },
      "status": { "type": "string", "enum": ["active", "deprecated", "archived"], "default": "active" },
      "entry_point": { "type": "string" }
    }
  }
  ```
- **Dependencies**: Task 1.1

---

### Task 1.3: PR Validation GitHub Action

- **Description**: Create CI workflow that validates submissions on pull request.
- **Acceptance Criteria**:
  - [ ] Triggers on PR to `main` when files in `skillsets/` change
  - [ ] Validates `skillset.yaml` against JSON Schema using `ajv-cli`
  - [ ] Checks required files exist: `README.md`, `AUDIT_REPORT.md`, `content/`
  - [ ] Verifies `content/` contains either `.claude/` or `CLAUDE.md`
  - [ ] Validates no files exceed 1MB
  - [ ] Detects and warns on binary files in `content/`
  - [ ] Scans for secret patterns (API keys, tokens, passwords)
  - [ ] Verifies author handle matches PR submitter (prevents unauthorized modifications)
  - [ ] Fails with clear error messages on validation failure
- **Files to Create**:
  ```
  .github/workflows/validate-submission.yml
  ```
- **Code Example**:
  ```yaml
  name: Validate Submission
  on:
    pull_request:
      paths:
        - 'skillsets/**'

  jobs:
    validate:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
          with:
            fetch-depth: 0

        - name: Install ajv-cli
          run: npm install -g ajv-cli

        - name: Install yq for YAML parsing
          run: |
            sudo wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
            sudo chmod +x /usr/local/bin/yq

        - name: Find changed skillsets
          id: changed
          run: |
            DIRS=$(git diff --name-only ${{ github.event.pull_request.base.sha }} HEAD | grep '^skillsets/' | cut -d'/' -f1-3 | sort -u)
            echo "dirs=$DIRS" >> $GITHUB_OUTPUT

        - name: Validate skillset.yaml against schema
          run: |
            for dir in ${{ steps.changed.outputs.dirs }}; do
              echo "Validating $dir/skillset.yaml"
              ajv validate -s schema/skillset.schema.json -d "$dir/skillset.yaml"
            done

        - name: Check required files exist
          run: |
            for dir in ${{ steps.changed.outputs.dirs }}; do
              echo "Checking required files in $dir"
              test -f "$dir/README.md" || (echo "ERROR: Missing README.md in $dir" && exit 1)
              test -f "$dir/AUDIT_REPORT.md" || (echo "ERROR: Missing AUDIT_REPORT.md in $dir" && exit 1)
              test -d "$dir/content" || (echo "ERROR: Missing content/ directory in $dir" && exit 1)
            done

        - name: Verify content structure
          run: |
            for dir in ${{ steps.changed.outputs.dirs }}; do
              echo "Verifying content structure in $dir"
              if [ ! -d "$dir/content/.claude" ] && [ ! -f "$dir/content/CLAUDE.md" ]; then
                echo "ERROR: $dir/content/ must contain either .claude/ directory or CLAUDE.md file"
                exit 1
              fi
            done

        - name: Validate file sizes and types
          run: |
            for dir in ${{ steps.changed.outputs.dirs }}; do
              echo "Checking file sizes in $dir"
              # Find files larger than 1MB
              LARGE_FILES=$(find "$dir" -type f -size +1M)
              if [ -n "$LARGE_FILES" ]; then
                echo "ERROR: Files larger than 1MB found in $dir:"
                echo "$LARGE_FILES"
                exit 1
              fi

              # Detect binary files (exclude common text files)
              BINARIES=$(find "$dir/content" -type f ! -name "*.md" ! -name "*.txt" ! -name "*.json" ! -name "*.yaml" ! -name "*.yml" ! -name "*.js" ! -name "*.ts" ! -name "*.py" ! -name "*.sh" -exec file {} \; | grep -v "text" | grep -v "empty")
              if [ -n "$BINARIES" ]; then
                echo "WARNING: Binary files detected in $dir/content:"
                echo "$BINARIES"
                echo "Binary files are discouraged. If necessary, please justify in PR description."
              fi

              # Check for common secret patterns
              echo "Scanning for potential secrets in $dir"
              if grep -r -E "(api[_-]?key|password|secret|token|bearer|authorization)['\"]?\s*[:=]\s*['\"]?[a-zA-Z0-9]{20,}" "$dir" --include="*.md" --include="*.txt" --include="*.json" --include="*.yaml" --include="*.yml"; then
                echo "ERROR: Potential secrets detected in $dir"
                echo "Remove all API keys, tokens, and secrets before submitting"
                exit 1
              fi
            done

        - name: Verify author matches GitHub handle
          run: |
            for dir in ${{ steps.changed.outputs.dirs }}; do
              echo "Verifying author in $dir"
              # Extract namespace from path (skillsets/@namespace/skillset-name)
              NAMESPACE=$(echo "$dir" | cut -d'/' -f2 | sed 's/@//')

              # Extract author handle from skillset.yaml
              AUTHOR_HANDLE=$(yq eval '.author.handle' "$dir/skillset.yaml" | sed 's/@//')

              # Get PR author
              PR_AUTHOR="${{ github.event.pull_request.user.login }}"

              echo "Namespace: $NAMESPACE"
              echo "Author handle: $AUTHOR_HANDLE"
              echo "PR author: $PR_AUTHOR"

              # For new submissions, namespace must match PR author
              if ! git diff --name-only ${{ github.event.pull_request.base.sha }} HEAD | grep -q "$dir/skillset.yaml"; then
                echo "Existing skillset - checking author matches"
                if [ "$AUTHOR_HANDLE" != "$PR_AUTHOR" ]; then
                  echo "ERROR: Only the original author ($AUTHOR_HANDLE) can modify this skillset"
                  exit 1
                fi
              else
                echo "New skillset - checking namespace matches PR author"
                if [ "$NAMESPACE" != "$PR_AUTHOR" ] && [ "$AUTHOR_HANDLE" != "$PR_AUTHOR" ]; then
                  echo "ERROR: Namespace (@$NAMESPACE) and author handle (@$AUTHOR_HANDLE) must match PR author ($PR_AUTHOR) for new submissions"
                  exit 1
                fi
              fi
            done
  ```
- **Dependencies**: Task 1.2

---

### Task 1.4: Seed with The_Skillset

- **Description**: Add the first skillset as reference implementation and proof of concept.
- **Acceptance Criteria**:
  - [ ] `@supercollectible/The_Skillset/` folder exists under `skillsets/`
  - [ ] Valid `skillset.yaml` passes schema validation
  - [ ] `README.md` provides installation/usage instructions
  - [ ] `AUDIT_REPORT.md` contains structural validation
  - [ ] `content/` folder contains `.claude/` and `CLAUDE.md` from The_Skillset repo
- **Files to Create**:
  ```
  skillsets/@supercollectible/The_Skillset/
  ├── skillset.yaml
  ├── README.md
  ├── AUDIT_REPORT.md
  └── content/
      ├── .claude/
      │   ├── skills/
      │   └── agents/
      └── CLAUDE.md
  ```
- **Dependencies**: Task 1.3

---

### Task 1.5: CONTRIBUTING.md

- **Description**: Create comprehensive submission guide for contributors.
- **Acceptance Criteria**:
  - [ ] Documents the complete submission workflow
  - [ ] Explains the `/audit_skillset` skill and where to download it
  - [ ] Lists required files and folder structure
  - [ ] Describes the PR review process (automated CI + manual maintainer review)
  - [ ] Clarifies production proof requirements and quality standards
  - [ ] Includes examples of good/bad submissions
- **Files to Create**:
  ```
  CONTRIBUTING.md
  ```
- **Dependencies**: Task 1.4

---

### Task 1.6: Maintainer Review Checklist

- **Description**: Document the manual review process for maintainers to verify production proof.
- **Acceptance Criteria**:
  - [ ] Checklist for verifying `production_url` is valid and accessible
  - [ ] Guidelines for evaluating production proof quality
  - [ ] Process for requesting additional proof if needed
  - [ ] Approval criteria before merging PR
- **Files to Create**:
  ```
  MAINTAINER_CHECKLIST.md
  ```
- **Code Example**:
  ```markdown
  # Maintainer Review Checklist

  Use this checklist when reviewing skillset submissions.

  ## Automated Checks ✓
  - [ ] CI workflow passed all validation checks
  - [ ] JSON Schema validation passed
  - [ ] Required files present (README.md, AUDIT_REPORT.md, content/)
  - [ ] Content structure valid (.claude/ or CLAUDE.md exists)
  - [ ] No files exceed 1MB
  - [ ] No secrets detected
  - [ ] Author verification passed

  ## Manual Review

  ### 1. Production Proof Verification
  - [ ] Visit `verification.production_url` from `skillset.yaml`
  - [ ] Verify the URL leads to:
    - [ ] A live deployed application/service, OR
    - [ ] A public GitHub repository with recent activity, OR
    - [ ] A case study/blog post describing production usage
  - [ ] If `verification.production_proof` file is present:
    - [ ] Review screenshots/videos for authenticity
    - [ ] Check testimonials are from verifiable sources
    - [ ] Verify proof matches the claimed use case

  ### 2. Quality Assessment
  - [ ] README.md provides clear installation/usage instructions
  - [ ] AUDIT_REPORT.md shows all checks passed
  - [ ] Skillset description accurately reflects capabilities
  - [ ] Tags are relevant and appropriate
  - [ ] No misleading claims or exaggerations

  ### 3. Content Review
  - [ ] Skills/agents are well-documented
  - [ ] No malicious code patterns detected
  - [ ] Dependencies are reasonable and justified
  - [ ] Configuration examples are provided

  ### 4. Production Proof Quality Standards

  **High Quality** (fast-track approval):
  - Public deployed service with verifiable usage
  - Open-source repository with >10 stars and activity
  - Detailed case study with metrics/outcomes

  **Acceptable**:
  - GitHub repository with README showing real usage
  - Blog post or documentation of production deployment
  - Screenshots/videos of working system

  **Needs Improvement** (request more proof):
  - Vague or generic descriptions
  - No evidence of actual production use
  - Dead links or inaccessible proof
  - Claims not supported by evidence

  ### 5. Red Flags (Reject/Request Changes)
  - [ ] production_url is unreachable or fake
  - [ ] Proof appears fabricated or misleading
  - [ ] Skillset has not been used in production
  - [ ] Security concerns in code
  - [ ] Violates community guidelines

  ## Approval Decision

  - [ ] **APPROVE**: All checks passed, production proof verified
  - [ ] **REQUEST CHANGES**: Issues found, specify in PR comments
  - [ ] **REJECT**: Fails fundamental requirements or red flags present

  ## Notes for Contributor

  _Add specific feedback here for the contributor._
  ```
- **Dependencies**: Task 1.5

---

## Build Agent 2: Static Site Core

**Scope**: Create the Astro project with Cloudflare Pages deployment, pages, and styling.

### Task 2.1: Astro Project Initialization

- **Description**: Initialize Astro 5 project with server output mode and Cloudflare adapter.
- **Acceptance Criteria**:
  - [ ] Astro 5 project created with `output: 'server'`
  - [ ] Cloudflare Pages adapter configured
  - [ ] Tailwind CSS integrated and working
  - [ ] TypeScript configured
  - [ ] Dev server runs without errors
- **Files to Create**:
  ```
  site/
  ├── astro.config.mjs
  ├── package.json
  ├── tsconfig.json
  ├── tailwind.config.cjs
  └── src/
      ├── layouts/
      │   └── BaseLayout.astro
      └── pages/
          └── index.astro
  ```
- **Configuration**:
  ```javascript
  // astro.config.mjs
  import { defineConfig } from 'astro/config';
  import cloudflare from '@astrojs/cloudflare';
  import tailwind from '@astrojs/tailwind';

  export default defineConfig({
    output: 'server',
    adapter: cloudflare(),
    integrations: [tailwind()]
  });
  ```
- **Dependencies**: None (can run in parallel with Agent 1)

---

### Task 2.2: Home Page (Browse/Search)

- **Description**: Build the landing page with skillset grid and search functionality.
- **Acceptance Criteria**:
  - [ ] Displays all skillsets in responsive grid
  - [ ] Search input with fuzzy filtering (client-side)
  - [ ] Filter by tags
  - [ ] Star counts displayed (fetched from KV)
  - [ ] Prerendered with `export const prerender = true`
- **Files to Create**:
  ```
  src/pages/index.astro
  src/components/SkillsetCard.astro
  src/components/SearchBar.astro
  src/components/TagFilter.astro
  ```
- **Dependencies**: Task 2.1

---

### Task 2.3: Skillset Detail Page

- **Description**: Build dynamic route for individual skillset pages.
- **Acceptance Criteria**:
  - [ ] Route: `/skillset/:namespace/:name`
  - [ ] Displays full description, tags, author info
  - [ ] Shows audit badge (verified indicator)
  - [ ] Proof gallery section (screenshots/videos from PROOF.md)
  - [ ] Copy-to-clipboard degit command
  - [ ] Star button (requires auth)
- **Files to Create**:
  ```
  src/pages/skillset/[namespace]/[name].astro
  src/components/ProofGallery.astro
  src/components/StarButton.astro
  src/components/CopyCommand.astro
  ```
- **Dependencies**: Task 2.2

---

### Task 2.4: Contribute Page

- **Description**: Create the contribution guide page with audit skill download.
- **Acceptance Criteria**:
  - [ ] Explains submission workflow step-by-step
  - [ ] Download link for `/audit_skillset` skill
  - [ ] Examples of good submissions
  - [ ] Link to CONTRIBUTING.md in registry
  - [ ] Prerendered with `export const prerender = true`
- **Files to Create**:
  ```
  src/pages/contribute.astro
  ```
- **Dependencies**: Task 2.1

---

### Task 2.5: Styling System

- **Description**: Establish the design system with Tailwind CSS.
- **Acceptance Criteria**:
  - [ ] Dark mode default with elegant color palette
  - [ ] Responsive breakpoints configured
  - [ ] Component utility classes for cards, buttons, badges
  - [ ] Typography scale established
  - [ ] Smooth animations for interactions
- **Files to Create**:
  ```
  src/styles/global.css
  tailwind.config.cjs (extended)
  ```
- **Code Example**:
  ```css
  /* src/styles/global.css */
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  @layer base {
    :root {
      --color-bg: 15 15 20;
      --color-surface: 25 25 35;
      --color-accent: 139 92 246;
    }
  }
  ```
- **Dependencies**: Task 2.1

---

## Build Agent 3: Authentication & Stars

**Scope**: Implement GitHub OAuth and star functionality with Cloudflare Workers + KV.

### Task 3.1: Cloudflare KV Namespace Setup

- **Description**: Configure KV namespace for stars, session storage, and rate limiting.
- **Acceptance Criteria**:
  - [ ] KV namespace `SKILLSETS_STARS` created (stores star counts, user stars, AND rate limit counters)
  - [ ] KV namespace `SKILLSETS_AUTH` created (stores OAuth state/verifiers)
  - [ ] Bindings configured in `wrangler.toml`
- **Note**: Rate limiting uses KV (custom implementation) rather than Cloudflare's native rate limiting because:
  - Need per-user rate limiting (not per-IP)
  - Already using KV for stars, so consistent storage layer
  - More control over limits and easier to adjust
  - Can use TTL feature for automatic counter expiration
- **Files to Create**:
  ```
  site/wrangler.toml
  ```
- **Configuration**:
  ```toml
  name = "skillsets-site"
  [[kv_namespaces]]
  binding = "STARS"
  id = "<kv-namespace-id>"
  
  [[kv_namespaces]]
  binding = "AUTH"
  id = "<kv-namespace-id>"
  ```
- **Dependencies**: Task 2.1

---

### Task 3.2: GitHub OAuth Worker

- **Description**: Implement OAuth flow with CSRF protection and PKCE.
- **Acceptance Criteria**:
  - [ ] `/login` initiates OAuth flow with state + code_verifier in KV (5min TTL)
  - [ ] `/callback` validates state, exchanges code with PKCE
  - [ ] JWT stored in `httpOnly` cookie (not localStorage)
  - [ ] Invalid state returns 403
  - [ ] Expired state returns clear error message
- **Files to Create**:
  ```
  src/pages/login.ts (Astro endpoint)
  src/pages/callback.ts (Astro endpoint)
  src/lib/auth.ts
  ```
- **Code Example**:
  ```typescript
  // src/lib/auth.ts
  export async function initiateOAuth(kv: KVNamespace): Promise<{ url: string }> {
    const state = crypto.randomUUID();
    const codeVerifier = generatePKCEVerifier();
    const codeChallenge = await sha256(codeVerifier);
    
    await kv.put(`auth:${state}`, codeVerifier, { expirationTtl: 300 });
    
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: CALLBACK_URL,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      scope: 'read:user'
    });
    
    return { url: `https://github.com/login/oauth/authorize?${params}` };
  }
  ```
- **Dependencies**: Task 3.1

---

### Task 3.3: Star Worker

- **Description**: Implement star/unstar API with KV-based rate limiting.
- **Acceptance Criteria**:
  - [ ] `POST /api/star` toggles star for authenticated user
  - [ ] Rate limited: 10 ops/minute per user using KV (custom implementation, not Cloudflare native)
  - [ ] Rate limit counter stored as `ratelimit:{userId}` with 60-second TTL
  - [ ] Returns 429 Too Many Requests when limit exceeded
  - [ ] Optimistic UI response (immediate 200 when successful)
  - [ ] Star counts stored as `stars:{namespace}/{name}` → count
  - [ ] User stars stored as `user:{userId}:stars` → Set of skillset IDs
  - [ ] Exponential backoff on KV 429 errors (from KV itself, not our rate limit)
- **Files to Create**:
  ```
  src/pages/api/star.ts
  src/lib/stars.ts
  ```
- **Code Example**:
  ```typescript
  // src/lib/stars.ts

  /**
   * Check and enforce rate limiting using KV.
   * Allows 10 operations per minute per user.
   * @returns true if rate limit exceeded, false if okay to proceed
   */
  export async function isRateLimited(
    kv: KVNamespace,
    userId: string
  ): Promise<boolean> {
    const rateLimitKey = `ratelimit:${userId}`;
    const currentCount = await kv.get(rateLimitKey);

    if (!currentCount) {
      // First request in this minute window
      await kv.put(rateLimitKey, '1', { expirationTtl: 60 });
      return false;
    }

    const count = parseInt(currentCount);
    if (count >= 10) {
      return true; // Rate limit exceeded
    }

    // Increment counter (keep existing TTL)
    await kv.put(rateLimitKey, (count + 1).toString(), { expirationTtl: 60 });
    return false;
  }

  /**
   * Toggle star status for a skillset.
   * Implements optimistic updates and exponential backoff on KV errors.
   */
  export async function toggleStar(
    kv: KVNamespace,
    userId: string,
    skillsetId: string
  ): Promise<{ starred: boolean; count: number }> {
    const userKey = `user:${userId}:stars`;
    const countKey = `stars:${skillsetId}`;

    // Read current state with retry logic
    const userStars = await retryKVRead(kv, userKey, []);
    const isStarred = userStars.includes(skillsetId);

    if (isStarred) {
      // Unstar operation
      const updated = userStars.filter(id => id !== skillsetId);
      await retryKVWrite(kv, userKey, JSON.stringify(updated));

      const count = await retryKVRead(kv, countKey, 0);
      const newCount = Math.max(0, count - 1);
      await retryKVWrite(kv, countKey, newCount.toString());

      return { starred: false, count: newCount };
    } else {
      // Star operation
      userStars.push(skillsetId);
      await retryKVWrite(kv, userKey, JSON.stringify(userStars));

      const count = await retryKVRead(kv, countKey, 0);
      const newCount = count + 1;
      await retryKVWrite(kv, countKey, newCount.toString());

      return { starred: true, count: newCount };
    }
  }

  /**
   * Retry KV read with exponential backoff on 429 errors.
   */
  async function retryKVRead<T>(
    kv: KVNamespace,
    key: string,
    defaultValue: T,
    maxRetries = 3
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const value = await kv.get(key);
        if (!value) return defaultValue;

        if (typeof defaultValue === 'number') {
          return parseInt(value) as T;
        }
        return JSON.parse(value) as T;
      } catch (error: any) {
        if (error?.status === 429 && i < maxRetries - 1) {
          // Exponential backoff: 100ms, 200ms, 400ms
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
          continue;
        }
        throw error;
      }
    }
    return defaultValue;
  }

  /**
   * Retry KV write with exponential backoff on 429 errors.
   */
  async function retryKVWrite(
    kv: KVNamespace,
    key: string,
    value: string,
    maxRetries = 3
  ): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await kv.put(key, value);
        return;
      } catch (error: any) {
        if (error?.status === 429 && i < maxRetries - 1) {
          // Exponential backoff: 100ms, 200ms, 400ms
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
          continue;
        }
        throw error;
      }
    }
  }
  ```

  ```typescript
  // src/pages/api/star.ts
  import type { APIRoute } from 'astro';
  import { toggleStar, isRateLimited } from '../../lib/stars';

  export const POST: APIRoute = async ({ request, locals }) => {
    // Verify authentication (JWT from cookie)
    const userId = locals.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check rate limit
    const rateLimited = await isRateLimited(locals.runtime.env.STARS, userId);
    if (rateLimited) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Maximum 10 star operations per minute. Please try again later.'
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60'
          }
        }
      );
    }

    // Parse request body
    const { skillsetId } = await request.json();
    if (!skillsetId) {
      return new Response(JSON.stringify({ error: 'Missing skillsetId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      // Toggle star
      const result = await toggleStar(
        locals.runtime.env.STARS,
        userId,
        skillsetId
      );

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Star toggle failed:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  };
  ```
- **Dependencies**: Task 3.2

---

## Build Agent 4: Build Pipeline & Search Index

**Scope**: GitHub Actions for site deployment and search index generation.

### Task 4.1: Search Index Generator

- **Description**: Create script that generates `search-index.json` from registry.
- **Acceptance Criteria**:
  - [ ] Reads all `skillset.yaml` files from registry
  - [ ] Computes SHA-256 checksums for each file in `content/`
  - [ ] Aggregates star counts via KV API
  - [ ] Outputs `search-index.json` with structure per design doc
  - [ ] Runs in GitHub Action context
- **Files to Create**:
  ```
  scripts/build-index.ts
  ```
- **Code Example**:
  ```typescript
  interface SearchIndex {
    version: string;
    generated_at: string;
    skillsets: Array<{
      id: string;
      name: string;
      description: string;
      tags: string[];
      author: string;
      stars: number;
      version: string;
      checksum: string;
      files: Record<string, string>;
    }>;
  }
  ```
- **Dependencies**: Agent 1 complete (registry exists)

---

### Task 4.2: Site Deploy Workflow

- **Description**: GitHub Action that rebuilds site when registry changes.
- **Acceptance Criteria**:
  - [ ] Triggers on push to `main` in registry repo
  - [ ] Checks out both registry and site repos (if separate) or uses monorepo structure
  - [ ] Runs `build-index.ts` to generate fresh index from registry
  - [ ] Fetches star counts from Cloudflare KV
  - [ ] Builds Astro site with index data
  - [ ] Deploys to Cloudflare Pages via Wrangler
  - [ ] Caches npm dependencies
- **Files to Create**:
  ```
  .github/workflows/deploy-site.yml (in registry repo)
  ```
- **Code Example** (assumes separate repos):
  ```yaml
  name: Deploy Site
  on:
    push:
      branches:
        - main
      paths:
        - 'skillsets/**'
        - 'schema/**'

  jobs:
    deploy:
      runs-on: ubuntu-latest
      steps:
        - name: Checkout registry repo
          uses: actions/checkout@v4
          with:
            path: registry

        - name: Checkout site repo
          uses: actions/checkout@v4
          with:
            repository: skillsets-cc/site
            token: ${{ secrets.SITE_DEPLOY_TOKEN }}
            path: site

        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
            node-version: '20'
            cache: 'npm'
            cache-dependency-path: site/package-lock.json

        - name: Install site dependencies
          working-directory: site
          run: npm ci

        - name: Build search index
          working-directory: site
          env:
            CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
            CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
            KV_NAMESPACE_ID: ${{ secrets.KV_NAMESPACE_STARS_ID }}
          run: |
            # Copy registry data to site build context
            cp -r ../registry/skillsets ./public/registry
            cp ../registry/schema/skillset.schema.json ./public/schema.json

            # Run index builder (fetches star counts from KV)
            npm run build:index

        - name: Build Astro site
          working-directory: site
          run: npm run build

        - name: Deploy to Cloudflare Pages
          working-directory: site
          env:
            CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
            CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          run: npx wrangler pages deploy dist --project-name=skillsets-site
  ```
- **Alternative** (monorepo structure):
  ```yaml
  name: Deploy Site
  on:
    push:
      branches:
        - main
      paths:
        - 'skillsets/**'
        - 'schema/**'
        - 'site/**'

  jobs:
    deploy:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4

        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
            node-version: '20'
            cache: 'npm'
            cache-dependency-path: site/package-lock.json

        - name: Install dependencies
          working-directory: site
          run: npm ci

        - name: Build search index
          working-directory: site
          env:
            CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
            CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
            KV_NAMESPACE_ID: ${{ secrets.KV_NAMESPACE_STARS_ID }}
          run: npm run build:index

        - name: Build Astro site
          working-directory: site
          run: npm run build

        - name: Deploy to Cloudflare Pages
          working-directory: site
          env:
            CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
            CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          run: npx wrangler pages deploy dist --project-name=skillsets-site
  ```
- **Dependencies**: Task 4.1

---

## Build Agent 5: CLI Tool

**Scope**: Create the `npx skillsets` CLI for search, install, and verify.

### Task 5.1: CLI Project Setup

- **Description**: Initialize the npm package with TypeScript and minimal dependencies.
- **Acceptance Criteria**:
  - [ ] Package name: `skillsets`
  - [ ] Binary: `skillsets` (via `bin` field in package.json)
  - [ ] TypeScript compilation to ESM
  - [ ] Dependencies: `degit`, `commander`, `fuse.js`, `node-fetch`
  - [ ] Dev command runs local build
- **Files to Create**:
  ```
  cli/
  ├── package.json
  ├── tsconfig.json
  └── src/
      └── index.ts
  ```
- **Configuration**:
  ```json
  {
    "name": "skillsets",
    "version": "0.1.0",
    "type": "module",
    "bin": {
      "skillsets": "./dist/index.js"
    },
    "scripts": {
      "build": "tsc",
      "dev": "tsc && node dist/index.js"
    },
    "dependencies": {
      "degit": "^2.8.4",
      "commander": "^11.1.0",
      "fuse.js": "^7.0.0"
    }
  }
  ```
- **Dependencies**: None (parallel with other agents)

---

### Task 5.2: Search Command

- **Description**: Implement `skillsets search <query>` with fuzzy matching.
- **Acceptance Criteria**:
  - [ ] Fetches `search-index.json` from CDN
  - [ ] Fuse.js fuzzy search on name, description, tags
  - [ ] Displays top 10 results with name, description, stars
  - [ ] Caches index locally for 1 hour
  - [ ] Graceful error on network failure
- **Files to Create**:
  ```
  src/commands/search.ts
  src/lib/index-cache.ts
  ```
- **Code Example**:
  ```typescript
  import Fuse from 'fuse.js';
  
  export async function search(query: string): Promise<void> {
    const index = await fetchIndex();
    const fuse = new Fuse(index.skillsets, {
      keys: ['name', 'description', 'tags'],
      threshold: 0.4
    });
    
    const results = fuse.search(query).slice(0, 10);
    
    for (const { item } of results) {
      console.log(`${item.id} ⭐${item.stars}`);
      console.log(`  ${item.description}`);
    }
  }
  ```
- **Dependencies**: Task 5.1

---

### Task 5.3: Install Command

- **Description**: Implement `skillsets install <id>` with degit and conflict handling.
- **Acceptance Criteria**:
  - [ ] Uses degit to extract `skillsets/@ns/name/content` to current directory
  - [ ] Detects existing `.claude/` or `CLAUDE.md`
  - [ ] Default behavior: error with instructions for `--force` or `--merge`
  - [ ] `--force`: overwrites existing files
  - [ ] `--merge`: creates conflict markers
  - [ ] `--backup`: moves existing to `.claude.backup/` first
  - [ ] Verifies checksum after install
- **Files to Create**:
  ```
  src/commands/install.ts
  src/lib/conflict-resolver.ts
  ```
- **Dependencies**: Task 5.2

---

### Task 5.4: Verify Command

- **Description**: Implement `skillsets verify` to check installed skillsets against registry.
- **Acceptance Criteria**:
  - [ ] Computes SHA-256 of local files
  - [ ] Compares against `search-index.json` checksums
  - [ ] Reports matching/mismatched files
  - [ ] Suggests `npx skillsets install --force` on mismatch
  - [ ] Exit code 0 on match, 1 on mismatch
- **Files to Create**:
  ```
  src/commands/verify.ts
  src/lib/checksum.ts
  ```
- **Code Example**:
  ```typescript
  import { createHash } from 'crypto';
  import { readFile } from 'fs/promises';
  
  export async function computeChecksum(filepath: string): Promise<string> {
    const content = await readFile(filepath);
    return `sha256:${createHash('sha256').update(content).digest('hex')}`;
  }
  ```
- **Dependencies**: Task 5.3

---

## Build Agent 6: Audit Skill

**Scope**: Create the `/audit_skillset` skill for contributors to run locally.

### Task 6.1: Audit Skill Implementation

- **Description**: Create downloadable Claude Code skill that validates skillset structure.
- **Acceptance Criteria**:
  - [ ] Standard skill format (`.claude/skills/audit_skillset/SKILL.md`)
  - [ ] Validates `skillset.yaml` exists and has required fields
  - [ ] Checks `README.md` present
  - [ ] Verifies `content/` contains `.claude/` or `CLAUDE.md`
  - [ ] Detects issues: large files (>1MB), binaries, secret patterns
  - [ ] Generates `AUDIT_REPORT.md` with pass/fail checklist
- **Files to Create**:
  ```
  tools/audit_skillset/
  ├── SKILL.md
  └── templates/
      └── AUDIT_REPORT_TEMPLATE.md
  ```
- **Code Example (SKILL.md snippet)**:
  ```markdown
  ---
  name: audit_skillset
  description: Validates a skillset directory before submission to skillsets.cc
  ---
  
  # Audit Skillset
  
  ## Validation Checks
  
  1. **Manifest validation**: `skillset.yaml` exists and passes schema
  2. **Required files**: `README.md`, `content/` directory
  3. **Content structure**: `content/` contains `.claude/` or `CLAUDE.md`
  4. **No blockers**: No files >1MB, no binaries, no secrets patterns
  
  ## Output
  
  Generate `AUDIT_REPORT.md` with:
  - [ ] All checks passed/failed with details
  - [ ] File inventory with sizes
  - [ ] Recommendations for fixing issues
  ```
- **Dependencies**: None (parallel with other agents)

---

## Testing Strategy

### Phase 1: Registry Testing
| Test | Command/Process |
|------|-----------------|
| Schema validation | `npx ajv validate -s schema/skillset.schema.json -d skillsets/@test/Test_Skillset/skillset.yaml` |
| CI workflow | Open test PR with valid/invalid submissions |
| File structure | Manual inspection of seed skillset |

### Phase 2: Site Testing
| Test | Command/Process |
|------|-----------------|
| Local dev | `cd site && npm run dev` → verify all routes |
| Build | `npm run build` → no errors |
| OAuth flow | Manual: click Login, authorize, verify cookie |
| Star toggle | Manual: click star, refresh, verify persisted |

### Phase 3: CLI Testing
| Test | Command/Process |
|------|-----------------|
| Search | `npx skillsets search "sdlc"` → returns results |
| Install (clean) | `cd empty-dir && npx skillsets install @supercollectible/The_Skillset` |
| Install (conflict) | `cd has-claude && npx skillsets install ...` → error |
| Verify | `npx skillsets verify` → checksum match |

### Integration Testing
| Test | Process |
|------|---------|
| Full flow | Submit PR → CI validates → merge → site rebuilds → CLI can search/install |
| Checksum integrity | Install → modify file → verify fails |

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation | Fallback |
|------|-------------|--------|------------|----------|
| Cloudflare KV rate limits | Medium | Low | User rate limiting, exponential backoff | Document eventual consistency |
| degit subfolder bugs | Low | Medium | Pin degit version, test edge cases | Fall back to full clone + copy |
| GitHub API rate limits | Medium | Low | Build-time index, avoid runtime API calls | Cache index aggressively |
| OAuth scope creep | Low | High | Request minimal `read:user` scope only | Clear docs on permissions |
| Large skillset submissions | Medium | Medium | Validate file sizes in CI, 1MB limit | Reject with clear error |

---

## Success Criteria

### Functional
- [ ] Registry accepts valid skillset PRs and rejects invalid ones
- [ ] CI validates complete JSON Schema with all required fields
- [ ] CI verifies content structure (.claude/ or CLAUDE.md)
- [ ] CI detects files >1MB, binaries, and secret patterns
- [ ] CI enforces author verification (only original author can modify)
- [ ] Maintainer review process validates production proof
- [ ] Site displays all skillsets with search/filter/star functionality
- [ ] CLI can search, install, and verify skillsets
- [ ] OAuth flow works end-to-end with secure session handling
- [ ] The_Skillset is installable and verifiable

### Non-Functional
- [ ] Site loads in <2s on cold start
- [ ] CLI search responds in <1s (cached index)
- [ ] Zero runtime GitHub API dependency for discovery
- [ ] ~110 lines of serverless code total (OAuth + Stars)

### Documentation
- [ ] CONTRIBUTING.md guides new contributors through submission process
- [ ] MAINTAINER_CHECKLIST.md provides review guidelines for maintainers
- [ ] README in registry explains the project
- [ ] CLI has `--help` for all commands
- [ ] `/contribute` page walks through submission

---

## Implementation Notes

### Critical Configuration

```bash
# GitHub OAuth App
GITHUB_CLIENT_ID=<from github oauth app>
GITHUB_CLIENT_SECRET=<from github oauth app>
CALLBACK_URL=https://skillsets.cc/callback

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=<account id>
CLOUDFLARE_API_TOKEN=<api token with Pages/Workers/KV permissions>
```

### Helpful Commands

```bash
# Registry
npx ajv compile -s schema/skillset.schema.json    # Validate schema itself

# Site
npm create astro@latest site -- --template minimal
npx wrangler kv:namespace create STARS
npx wrangler kv:namespace create AUTH

# CLI
npm link                     # Test CLI locally
npm pack                     # Create tarball for testing
npx skillsets --help         # Verify binary works
```

### Gotchas

1. **Astro SSR + Cloudflare**: Use `@astrojs/cloudflare` adapter, not `node`
2. **degit caching**: Clear cache with `degit --force` if testing updates
3. **KV eventual consistency**: Stars may be ~60s stale; document in UX
4. **PKCE in Workers**: Use Web Crypto API (`crypto.subtle.digest`)
5. **JWT in cookies**: Set `Secure; HttpOnly; SameSite=Lax`
6. **Rate limiting**: Use KV-based custom implementation (not Cloudflare native) for per-user limiting with 60s TTL counters
