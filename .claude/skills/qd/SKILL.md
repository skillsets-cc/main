---
name: qd
description: Documentation QA audit. Checks for stale docs and code/doc drift.
disable-model-invocation: true
---

Run agent `qa-docs` on $ARGUMENTS

This invokes the docs QA agent to audit the target path.

IMPORTANT: Run this agent in the **foreground** (not background). The agent needs Write permissions for creating .md files, which require interactive prompts that are unavailable in background mode.
