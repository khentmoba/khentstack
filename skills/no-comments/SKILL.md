---
name: no-comments
description: Remove redundant narration and commented-out dead code from the supplied diff without changing behavior. Use for comment cleanup or before committing code.
argument-hint: "[files or diff]"
---

# Comment cleanup

Review the supplied files or current task diff. Remove only comments that plainly repeat the code, decorative separators, and confirmed commented-out dead code.

Preserve license headers, public API documentation, tool directives, lint/type/formatter suppressions, issue links, safety warnings, and explanations of non-obvious constraints. Preserve `shortcut:` notes required by ponytail. Keep uncertain comments and report why they need investigation.

Treat comments consumed by compilers, linters, generators, coverage tools, or bundlers as functional code. Do not remove or weaken them during cleanup.

This pass changes comments only. Do not refactor, add casts/assertions, remove guards, or alter runtime behavior to justify deleting a comment. Propose those changes separately and wait for approval. For approved follow-up work, prove the constraint is protected before removing its explanation.

Inspect the resulting diff and run relevant existing checks if the edited syntax could affect tooling. Report removed comments, uncertain comments kept, and any separate proposals. A PR hook authorizes cleanup only within the task diff, not a repository-wide sweep.
