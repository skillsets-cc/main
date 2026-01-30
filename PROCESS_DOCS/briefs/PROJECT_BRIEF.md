# Concept: Skillsets.cc
> *The Verified Registry of Agentic Workflows*

**Vision**: A community-driven registry for proven, interoperable sets of agent skills. Unlike `skillsmp.com` which indexes individual atomic skills, `skillsets.cc` indexes **complete production stacks**—validated combinations of tools, prompts, and configurations that have shipped real software.

## The Core Problem
- **Fragmentation**: Individual skills often conflict (namespace collisions, context window hogging).
- **Theory vs. Practice**: Many skills work in isolation or simple demos but fail in complex production environments.
- **Missing Glue**: The value isn't just the tools (e.g., "Browser Use" + "File Writer"), but the *orchestration strategies* and *context bridging* between them.

## The "Skillset" Unit
A "Skillset" is not just a list of links. It is a reproducible configuration verified by Intelligence.

### The Manifest (`skillset.yaml`)
The index card that makes the repo searchable.

schema_version: "1.0"
name: "The_Skillset"
description: "The original First Principles Verified Skillset. Specs > Prompts."
author:
  handle: "@supercollectible"
  url: "https://github.com/supercollectible"

# The "High Friction" Verification Proofs
verification:
  production_url: "https://github.com/supercollectible/The_Skillset"
  audit_report_path: "./AUDIT_REPORT.md"
  validation_cert_path: "./VALIDATION_CERT.md"

# Technical Compatibility
tags: ["general", "planning", "agentic"]
compatibility:
  claude_code_version: ">=0.2.0"
  languages: ["any"]
```

### The Content Structure
```text
@supercollectible/
└── The_Skillset/
    ├── skillset.yaml          # The Manifest above
    ├── README.md              # User instructions
    ├── AUDIT_REPORT.md        # Opus Instance A's report
    ├── VALIDATION_CERT.md     # Opus Instance B's certificate
    └── content/               # The actual files to install
        ├── .claude/           # Agents & Skills
        ├── TheSkillset/       # Definitions & Resources
        ├── docker/            # Infrastructure (LiteLLM, MCP, etc.)
        └── CLAUDE.md          # Root config
```

## Verification: The Filter
**Goal**: A highly curated collection, not an endless dump. We use high friction to ensure high quality.

**The Filter**:
1.  **Submitter Burden**: The submitter must burn the tokens to run the Double Self-Audit. This filters out low-effort spam.
2.  **Proof of Production**: Submissions must link to a live, shipped product built with the skillset.
3.  **Team Review**: Maintainers only review submissions that pass the Double Audit and show real Production history.
3.  **Curation**: Not everything Verified gets in. It must be useful, novel, and robust.

## Minimal Implementation (The "Community Building" MVP)
We don't need a complex backend. We need a standard and a repo.

### Phase 1: The Git Registry (The Backend)
- **Architecture**: A single GitHub 'Mono-repo' (`skillsets-cc/registry`).
- **Storage Strategy**: **Folders, not Zips.**
  - *Why*: Allows diffing of code in PRs (critical for verification) and keeps the repo size small (text vs binary history).
- **Auth**: Native GitHub Auth (via PRs). No custom user database.

### Phase 2: The Static Site (Discovery & Trust)
- **Role**: The "Showroom".
- **Stack**: Astro (Static Site Generator).
- **Source**: Fetches content from GitHub API at build time.
- **Hosting**: GitHub Pages.
- **Key Features**:
  - **Proof Gallery**: Embeds the video/screenshots from the repo.
  - **Audit Badges**: Visual indicator that `VALIDATION_CERT.md` passed.
  - **Download Options**:
    - "Copy Install Command" (for CLI users).
    - "Download Zip" (Direct browser download generated from GitHub API).

### Phase 3: The CLI (`npx skillsets`)
- **Role**: The "Delivery System".
- **Philosophy**: "The Registry is the API."
- **Stack**: Minimal Node.js CLI.
- **Functionality**:
  - `npx skillsets search "react"` -> Queries GitHub API for folders with that tag.
  - `npx skillsets install @user/stack` -> Uses `degit` to fetch the cached folder to your current directory.
  - `npx skillsets verify` -> Runs a checksum against the registry to ensure you haven't drifted.
- **Why this beats a website**:
  - Context switching: Users are already in their terminal coding.
  - Speed: Text is faster than HTML.
  - Maintenance: A 200-line CLI script vs a whole web project.


## Analysis of Merits
### Why this matters now
- **The "Toy" Phase is ending**: The market is flooded with "Hello World" agents. The next phase is industrial-grade agent engineering.
- **Orchestration is the new Code**: The value is shifting from the LLM model to the *system* of prompts and tools.
- **Trust Shortage**: developers don't trust random prompts. They trust *shipping records*.

### Community Building Mechanics
This is not just a repo; it's a guild.
- **"Shipped" Badge**: The highest honor. Only granted if the detailed `PROOF.md` is verified by 2+ maintainers.
- **Curators**: Community members who specialize in specific stacks (e.g., "The Python/FastAPI Curator").
- **Missions**: Periodic challenges (e.g., "Build a Snake game using this exact skillset to verify it still works").

