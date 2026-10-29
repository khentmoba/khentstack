# khentstack maintenance

This repository stores reusable Pi skills, extensions, and sanitized configuration. Use `SETUP.md` when changing installation instructions or resource locations.

Keep the live Pi environment separate from this snapshot. Change repository files first; updating user-level resources is a separate operation that needs task authorization.

Store credentials as environment-variable references in examples. Keep authentication stores, sessions, memories, caches, dependency directories, downloaded executables, and machine identifiers outside version control. Before publishing, inspect staged content for secrets and local paths.

Preserve bundled skill references, executable permissions, attribution, and license notices. Use the writing-for-agents skill when changing agent instructions or skills. Record source and package version changes under `docs/`.

The copies of third-party skills are configuration assets. Do not treat historical commands in their documentation as checks for this repository; run only checks applicable to the current change. For a snapshot update, validate JSON, verify the expected resources and relative references exist, and review the staged diff.
