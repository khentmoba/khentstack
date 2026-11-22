---
name: file-pr
description: File a concise pull request. Use when the user asks to file, open, or create a PR.
---

# File PR

Create the PR, verify its checks, and return its URL. Merging, tagging, publishing,
and deployment require explicit authorization beyond creating a PR. This skill
also covers release PRs.

## 0. Resolve the project's PR workflow

Before editing, staging, committing, or pushing, establish the active repository
and read its applicable `AGENTS.md` instructions. Look there for a project PR skill
or shipping runbook. If none is referenced, inspect the repository's local skill
catalogs (such as `.agents/skills/`, `.agent/skills/`, `.claude/skills/`, and
`.pi/skills/`) for a skill explicitly describing PR creation. Read candidate files;
choose by their stated purpose, not by filename alone. Resolve local paths within
the active checkout or worktree, not another checkout of the same project.

- **One matching project workflow:** Read it in full and follow its branch rules,
  checks, evidence requirements, and PR body format. For example, Everglow uses
  `everglow-pr`, while Cinder uses its local `create-pr` skill.
- **No matching workflow:** Use the global steps below and `pr-template`, adapting
  checks to the repo's actual scripts and CI. No new project skill is required.
- **Conflicting or ambiguous workflows:** Follow applicable instruction precedence;
  ask if the conflict remains. If a referenced file is missing, report the blocker
  rather than silently treating it as no project workflow.

State the chosen workflow and path briefly. Project-specific requirements replace
corresponding generic defaults below; retain the remaining global safeguards.
Read the project skill as instructions in this task, not as a new agent or a
second invocation of `file-pr`. If it points back here, do not recurse.
PR creation alone never authorizes merging, releasing, or deployment, even when
a project shipping skill also describes those operations.

## 1. Establish the shipping path

Read the repo's `AGENTS.md`, contribution/release docs, package scripts, and relevant
CI workflows. Inspect the branch, working tree, remotes, and existing PRs. Identify:

- The intended base branch (usually `origin/main`) and changes belonging to this task.
- The actual local checks and required remote checks.
- Which events start CI, which refs it checks, and whether opening a PR deploys
  or publishes anything. Disclose such side effects before triggering them.

Use a topic branch; preserve unrelated edits and other worktrees. Check whether a
PR for this branch already exists and reuse it rather than creating a duplicate.
If the target or scope cannot be determined safely, ask before committing or pushing.

## 2. Prepare one coherent change

Implement the requested scope and run the relevant local checks from the repo.
Record exact commands and results, including checks not run.

**Release PR:** choose the intended version from the request or repo policy; ask
if ambiguous. Update all version sources and lockfiles using the repo's supported
mechanism before any version-dependent build. Read release scripts before executing
or sourcing them: sourcing may run the entire release. Use an existing prepare-only
mode if available; otherwise make the version edits without invoking publication.

Keep expensive installer packaging/signing for the approved merged commit. Run a
pre-merge build when needed for correctness, but identify it as validation rather
than a publishable release. Reuse unchanged engine assets only when the repo's
integrity/compatibility checks support it.

Review the diff locally against the base branch to make sure its contents match
the goal. Done when the diff contains only the intended change, versions agree if
applicable, and local results are recorded honestly. Run the **no-comments** skill
(`../no-comments/SKILL.md`) for comment-only cleanup of the task diff. Preserve
constraints and tool directives; propose behavioral changes separately. Resolve
sibling skill paths relative to this skill directory.

## 3. Write the title and body

**Title.** PR titles usually become commit messages, so follow the repository's
title conventions. Look at recently merged PRs and Git history for examples.
Prefer a concise, human-readable title that explains why the change matters:

BAD

> ❌ perf(server): negotiate permessage-deflate on the websocket

GOOD

> ✅ perf(server): cut websocket frame size by 70%+ with gzipping

**Body format.** Use the selected project workflow's PR body format. If it does
not specify one, read the sibling [pr-template skill](../pr-template/SKILL.md) and
use its Summary, Evidence, and Merge Danger sections.

**Lead with the problem.** Within that format, open with a simple explanation of
the problem based on the user's original prompt, then briefly explain the
solution. Do not lead with an implementation inventory:

BAD

> ❌ Removed implicit workspace carry-over from every "new thread" entry point (cmd+n / cmd+shift+o, sidebar v1/v2 buttons, command palette). New threads inherit only the project from context; branch, worktree, and env mode always come from the configured defaults. Deleted buildContextualThreadOptions, startNewThreadInProjectFromContext, and the v1 sidebar's seed-context machinery.

GOOD

> ✅ My "new worktree" default was ignored when starting new threads on existing worktrees. Super unintuitive. Now your preferences always apply.

- **Unslop:** Run the title and body through the [unslop skill](../unslop/SKILL.md) to strip AI jargon, robot formatting, superficial `-ing` clauses, and chatbot filler.
- **Blast Radius:** Follow the [blast-radius skill](../blast-radius/SKILL.md) to prove the one safety fact with code/tests rather than speculative text.
- Apply pr-template's screenshot requirements for visible UI changes; skip
  screenshots when the UI is irrelevant or unchanged. Include actual before/after
  evidence; mark missing baseline evidence or unrun tests explicitly instead of
  inventing results.
- For a release PR, include the target version and post-merge release steps.
- Do not add model, harness, or AI attribution to the PR.

Before submission, check the title, description, quotes, and attachments for
secrets and private details.

## 4. Open the PR

Stage explicit task files, commit, push the topic branch, and create/update the PR
against the identified base (use `gh pr create --body-file` when GitHub CLI is the
repo's tool). When calling T3 `pull_request_read`/`review`/`update`/`respond`/`merge`
or `ci_logs`, pass `repository` (`owner/repo`) alongside `number` (`link_pull_request`
and `read_pull_request_guide` accept `url`). Open a real PR rather than a
draft so review bots run. If `gh pr create` fails because the GraphQL rate limit
is used up, open it through REST with
`gh api repos/<owner>/<repo>/pulls -f title=... -f head=... -f base=... -F body=@<file>`.

Inspect the resulting base/head and diff. Report any blocker rather than silently
changing scope or bypassing a check.

Do not post a follow-up PR comment unless it serves the user's request. When a
comment is needed, use the `leaving-pr-comments` skill.

## 5. Verify CI exists, then wait

If the user also asked to babysit the PR, continue with the `babysit-pr` skill
instead of this section.

Inspect remote checks for the current PR head SHA before waiting. A successful
older run is not evidence for the current change.

- If PR events start CI, locate that run and track it.
- If CI is manual-only, inspect its inputs and dispatch the actual workflow against
  the topic branch when supported and authorized by the PR request. Verify the
  resulting run's SHA. Never substitute a run on the base branch.
- If required CI has no safe trigger, report the configuration gap. An empty check
  list is not a pass; do not wait repeatedly for a run that cannot start.

Use bounded waits on a known run. If still running at the time budget, return the
PR and run links with pending status. On failure, fix within scope, rerun relevant
checks, and verify the new head. Avoid duplicate active runs for the same SHA.

Done when checks for the current head are passed, failed, pending, or explicitly
blocked—not merely absent. Return the PR URL, check status, and merge risks.

## 6. Only when merging/releasing is explicitly requested

Honor the repo's merge policy and required checks. When merging via CLI, use
`gh pr merge --subject` (not `--title`), and omit `--delete-branch` inside a
git worktree where the default branch is already checked out elsewhere. After
merging, identify the exact merged SHA and validate any required checks on that
SHA; squash/rebase merges can produce a different commit from the PR head.

Build/sign the release once from a clean checkout of that commit with the agreed
version. Reuse an existing artifact only if provenance matches that exact commit
and configuration. Publish through the repo's supported release path, then verify
the tag, release assets, installer size, and update manifest/signature. Report
publication separately from runtime testing; an uploaded installer is not proof
that install/update works.
