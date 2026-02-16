export const SKILLSET_YAML_TEMPLATE = `schema_version: "1.0"
batch_id: "{{BATCH_ID}}"

# Identity
name: "{{NAME}}"
version: "1.0.0"
description: "{{DESCRIPTION}}"

author:
  handle: "{{AUTHOR_HANDLE}}"
  url: "{{AUTHOR_URL}}"

# Verification
verification:
  production_links:
    - url: "{{PRODUCTION_URL}}"
  production_proof: "./PROOF.md"
  audit_report: "./AUDIT_REPORT.md"

# Discovery
tags:
{{TAGS}}

compatibility:
  claude_code_version: ">=1.0.0"
  languages:
    - "any"

# Lifecycle
status: "active"

# Content
entry_point: "./content/CLAUDE.md"
`;

export const README_TEMPLATE = `# {{NAME}}

{{DESCRIPTION}}

## Installation

\`\`\`bash
npx skillsets install {{AUTHOR_HANDLE}}/{{NAME}}
\`\`\`

## Usage

[Describe how to use your skillset]

## What's Included

[List the key files and their purposes]

## License

[Your license]
`;

export const QUICKSTART_TEMPLATE = `# Quickstart

After installing via \`npx skillsets install {{AUTHOR_HANDLE}}/{{NAME}}\`, customize the workflow for your project.

---

## What Was Installed

\`\`\`
your-project/
├── .claude/          # Skills, agents, resources
├── CLAUDE.md         # Project config ← START HERE
└── README.md         # Documentation
\`\`\`

---

## Getting Started

1. **Edit CLAUDE.md** — Replace placeholder content with your project's specifics
2. **Customize .claude/** — Adapt skills, agents, and resources for your stack
3. **Run** — \`claude\` to start using the skillset

---

## Customization Checklist

- [ ] Update Identity & Constraints in CLAUDE.md
- [ ] Configure style guides in .claude/resources/
- [ ] Adapt agent definitions in .claude/agents/
- [ ] Set up any required infrastructure (Docker, API keys, etc.)

---

## Resources

[Add links to documentation, examples, or support channels]
`;

export const PROOF_TEMPLATE = `# Production Proof

## Overview

This skillset has been verified in production.

## Production URL

{{PRODUCTION_URL}}

## Evidence

[Add screenshots, testimonials, or other evidence of production usage]

## Projects Built

[List projects or products built using this skillset]
`;
