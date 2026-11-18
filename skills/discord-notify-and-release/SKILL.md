---
name: discord-notify-and-release
description: >
  Project-neutral entry point for publishing releases and announcing them on
  Discord with downloadable artifacts and clean bullet-point changelogs.
  Use when asked to release a project or send its release announcement; resolve
  the project's release skill first, otherwise use its existing scripts and CI.
---

# Discord Notify and Release

## Resolve the project workflow first

Establish the active repository and read its applicable `AGENTS.md`. Follow any
referenced project release skill or shipping runbook. Otherwise inspect local
skill catalogs such as `.agents/skills/`, `.agent/skills/`, `.codex/skills/`,
`.claude/skills/`, `.pi/skills/`, and `.pi/agent/skills/` for instructions whose
stated purpose covers releasing, publishing artifacts, or Discord release posts.
Read candidates in full and choose by purpose, not filename alone. Resolve paths
in the active checkout/worktree; discover other checkouts through Git only when
the selected project workflow requires them.

- One matching workflow: follow its versioning, build, checks, branching, merge,
  publication, and notification steps. Retain the shared announcement format below
  where the project does not explicitly override it.
- No matching workflow: inspect release docs, package scripts, and CI; use the
  existing supported release path with the defaults below. Creating a local skill
  is optional, not a prerequisite to releasing.
- Conflicting workflows: apply instruction precedence and ask only if the conflict
  remains. A missing referenced skill is a blocker to resolve, not permission to
  silently bypass it.

State the chosen workflow and path. Read project skills in the current task;
if one points back here, continue without recursion. A notification-only request
uses the existing release and does not authorize a rebuild, version bump, or merge.
A request to edit these instructions does not authorize a live release or post.

## Prepare and publish

1. Inspect the branch, working tree, remotes, version sources, existing release,
   and CI triggers. Identify the intended version/ref, artifact(s), destination,
   and required checks from the request and project configuration. Preserve
   unrelated edits. Inspect scripts before running them: a build may also post,
   commit, merge, push, or tag automatically.
2. Update version sources before version-dependent builds using the project's
   mechanism. Follow its required checks and merge order. Use explicit task files
   when committing. Reuse existing PR workflows when required rather than
   bypassing them. Continue through the merge described in **Merge the release PR**
   below; push only as the request and project rules allow.
3. Build/package from the intended release commit and configuration, or reuse
   artifacts whose provenance matches them. Use the project's actual artifact
   types and platforms; derive product names, branches, paths, and release targets
   from the repository. A hosted service can announce a deployment URL instead of
   attaching a binary. Verify successful publication and working download targets.
4. Prepare the announcement below from the actual released changes. Reuse the
   project's notifier or CI integration. If its payload differs from the requested
   format, update that existing integration within the task scope and preview it
   before posting; avoid a second notification implementation alongside it.
5. Determine which component owns the Discord post. If CI or a build hook already
   sends it, verify that post instead of sending another. Otherwise send once to
   the configured project destination, retaining the returned message ID/link when
   available. After an uncertain response, check for the post before retrying;
   stop if delivery cannot be determined. Edit an identified existing post when
   correcting a release; remove duplicates only when authorized.

## Merge the release PR

A release request is the user's explicit authorization to merge the PR that
carries this release, including where a project workflow says merging needs
separate approval. Merge it and continue publishing in the same task instead of
stopping to ask. Use the project's merge method (squash, merge commit, or
rebase) and its PR skill when one exists.

Merge only when all of these hold:

- The PR contains the release changes (version bump, changelog, release fixes)
  and nothing unrelated the user has not seen.
- Required checks are green. Wait for pending checks; fix failures caused by the
  release changes, then wait again.
- The PR is mergeable: no conflicts, no requested changes, branch protection
  satisfied without admin override or force-push.

If any condition fails and you cannot fix it within the release scope, stop and
report the blocker. After merging, sync the local default branch, confirm the
merge commit is the release ref, and run publication from it (tag, CI release
trigger, or build). This authorization covers only the release PR; other open
PRs still need their own approval, and a notification-only request merges nothing.

Use the project's configured credentials through its environment/secret store or
ignored local configuration. Keep tokens and webhook URLs out of source, command
output, payload previews, and responses. If a required target or credential is
missing, finish the local preparation and report exactly what remains blocked.

## Shared Discord announcement format

Use the same release layout across projects, filling values from the real release:

- Sender: `<Product> Release Bot`, unless project branding specifies another name.
- Content: `New Release: **<Product> <Version>** is now available!` Do not include
  instructions (such as download, install, open, or update instructions).
- Embed title: `Release: <Product> <Version>`.
- Embed color: blue `#4296FA` (decimal `4363994`).
- Description: one short sentence summarizing the release, without download or
  installation instructions.
- Inline fields: `Version`; `Configuration` when meaningful (actual platform/build);
  and `Attached File` with filename and size, or a clearly named download/visit link.
  List multiple artifacts only when the release actually provides them.
- Full-width field: `What's New`, containing Markdown `- ` bullet points.
- Footer: `<Product> Automated Release System`, with the actual UTC timestamp.
- Disable unsolicited mentions (for webhook payloads, `allowed_mentions.parse: []`).

Attach the verified release artifact directly when the configured Discord upload
limit allows it. Otherwise use the verified release asset URL. Match wording to
what was actually delivered; a link must not be described as an attached file.
Preview the rendered text/payload with existing dry-run or offline checks before
sending. Respect current Discord payload limits; split notes into additional
fields or keep the main bullets and link to full notes, preserving complete bullets.

## Clean changelog bullets

Derive notes from the released diff, maintained changelog, or release notes. Write
one concrete user-facing change per bullet in plain English. Use short active
sentences; an optional bold feature label can help scanning. Keep technical detail
only when users need it to understand compatibility, setup, or a breaking change.
Load the `unslop` skill when available to clean the final wording.

```markdown
- **Window controls:** Hover near the top edge to show the menu.
- Fixed saved settings resetting after a restart.
- Added a keyboard shortcut to open the menu.
```

Replace examples with verified changes. Remove redundant headings, raw commit/PR
lists, author metadata, repeated download instructions, and filler from the
`What's New` field. Normalize `*` or other bullet markers to `- `. Rewrite prose or
numbered summaries as bullets while preserving their meaning. Keep changelog
source entries compatible with the project parser; detailed engineering handoffs
can remain outside the announcement section. If changes cannot be established,
report that gap rather than inventing generic improvements.

## Completion

Report the version and release commit, the merged release PR URL when there was one, publication/artifact URLs, Discord message
link or ID when available, checks performed, and any remaining failure separately.
An upload confirms delivery; claim install/update/runtime success only when tested.
