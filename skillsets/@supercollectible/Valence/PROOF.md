# Production Proof

## Overview

Valence is a spec-driven, multi-agent SDLC workflow that has been used to build production software. Its core value proposition—preserving intent through formalized quality gates and adversarial review—has been validated through real-world usage.

## Production URL

https://skillsets.cc

## Projects Built

### skillsets.cc

The Skillsets.cc registry platform itself was designed and built using the Valence workflow:

- **Design phase**: `/design` skill used to create the system architecture, including the mono-repo registry structure, Astro SSR site, and CLI tooling
- **Adversarial review**: `/ar` skill orchestrated multi-model critique of the design document before implementation
- **Execution**: `/plan` and `/build` skills used for atomic task breakdown and implementation

Design artifacts:
- [skillsets-cc-design.md](DOCS/design/skillsets-cc-design.md) - Full design document
- [skillsets-cc-ar-review.md](DOCS/reviews/skillsets-cc-ar-review.md) - Adversarial review output

## Evidence

The design documents in this repository demonstrate the workflow in action—crystallizing requirements, validating architecture decisions against multiple models, and breaking execution into atomic tasks with clear acceptance criteria.
