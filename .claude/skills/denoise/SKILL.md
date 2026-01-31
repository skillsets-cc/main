---
name: denoise
description: Post-implementation cleanup using the code-simplifier plugin.
---

Use the Task tool to invoke the `code-simplifier:code-simplifier` agent with the following prompt:

"Simplify and refine code in $ARGUMENTS for clarity, consistency, and maintainability while preserving all functionality. Focus on recently modified code unless instructed otherwise."

If no path argument is provided, target the current working directory.
