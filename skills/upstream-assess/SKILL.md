---
name: upstream-assess
description: Upstream triage for a fork of any project. Use when deciding which upstream commits or open (unmerged) pull requests are worth porting, running an upstream scan, or porting a chosen upstream change into the fork.
---

# Upstream assess

Bring selected upstream changes into a fork. A change is either a **merged commit** on the upstream branch or an **open PR**: an upstream pull request not merged yet, so it never shows up in the commit range. Each change you port becomes a **fork-original commit**: you read the upstream diff and re-implement what it was trying to do on top of the fork's code. You never merge or cherry-pick upstream ranges.

The scripts live in `scripts/` next to this file. They need Node 18+ and no dependencies, and they only read: they run git (and `gh` for open PRs) and print markdown. They work out the remote, the branches, and the baseline on their own. If they guess wrong, or the project has identity rules or verify commands, read [reference/config.md](reference/config.md).

The **ledger** is the fork's record of upstream decisions. It is `FORK.md` unless the config names another file. The scan reads two kinds of line from it:

```
Upstream tip SHA: <full sha>
PR #<n> @ <head sha>: <Recommendation> (<reason>)
```

The marker is the baseline for merged commits. A `PR #` line records the decision on an open PR at the head it had when you judged it. The scan uses those lines to sort open PRs into new, head moved, and unchanged.

## 1. Scan

The upstream remote must exist. If it is missing, ask the human for the URL before you add it.

```bash
git fetch <upstream-remote> --tags
node <skill-dir>/scripts/scan-upstream.mjs > upstream-scan.md
```

Read the whole report.

- **Merged commits** since the baseline, grouped three ways: likely coupled efforts (`[tag]` subjects or the config's `clusterPatterns`), primary area, and change type. A commit tagged `ledger: decided as open PR #n` merged after you judged it as an open PR. Triage it against that earlier decision (see Record).
- **Open PRs** against the scanned branch, sorted as **New**, **Head moved** (pushed to since its ledger line), and **Unchanged** (decided; no action). This section needs a GitHub upstream and an authenticated `gh`. If the report says it could not list them, run the command it prints. For any other host, list open PRs/MRs with that host's tool.

**Done when** you have read every merged commit and every New or Head moved open PR.

## 2. Triage

Size each candidate's overlap with the fork:

- Merged commit or cluster: `node <skill-dir>/scripts/intersection.mjs <sha>` (or `<base>..<tip>`).
- Open PR: fetch it with the `git fetch` line the report prints, then `node <skill-dir>/scripts/intersection.mjs --pr <n>`. That counts only what the PR adds on top of upstream.

Then write:

- **What it does**: one or two sentences, based on the commit message or PR description and the diff.
- **Overlap**: what `intersection` reported.
- **Effort**: `Trivial` (additive, no overlap), `Moderate` (overlap; the intent has to be merged by hand), or `Significant` (structural or cross-cutting).
- **Risk**: `Low` (isolated), `Medium` (shared types, protocols, config), or `High` (shared-surface overlap, or anything in `identityRules`).
- **Recommendation**:
  - **Port**: re-implement it now.
  - **Skip**: never port it. The reason goes in the ledger so the next scan doesn't revisit it.
  - **Defer**: worth porting, but tied to a named fork milestone.
  - **Watch**: an intermediate step of an upstream effort that's still moving. Port the net result once upstream stabilizes. Clusters start here until you confirm the commits are independent.

Weigh benefit against porting cost. Bug and security fixes in shared code rank highest. A refactor of code the fork has heavily diverged from ranks low. A change to an area the fork deliberately replaced is a Skip.

Open PRs start at **Watch**: upstream review can still reshape them or close them, and a merged PR comes back as a commit in a later scan. Port an open PR early only when the fork needs it before upstream lands it, such as a fix for a bug the fork's users hit or a security fix. Drafts and stale PRs (no activity in months) rank lower.

**Done when** every merged commit has a recommendation, on its own or through its cluster, and so does every New or Head moved open PR.

## 3. Decide

Show the human the scan summary and the triage table, with merged commits and open PRs in separate sections. Then stop and wait. Selective porting only works when the human chooses each port deliberately.

**Done when** the human has explicitly named the changes to port.

## 4. Port

For each approved change:

```bash
git switch <main-branch> && git pull origin <main-branch>
git switch -c port-upstream/<short-description>
git show <upstream-sha>                                 # merged commit
git diff <upstream-ref>...<upstream-remote>/pr/<n>      # open PR
```

Re-implement the change using the fork's own conventions. Keep the fork's deliberate differences and everything in `identityRules` as they are. Put the upstream source in the commit body:

```
fix: port upstream session timeout fix

Upstream: abc1234, def5678
Upstream: PR #123 @ 9f8e7d6 (unmerged)
```

Verify the port with `verifyCommands`. If there are none, ask the human how the project builds and tests, then run that. Land the branch the way the project normally does, through a PR or a direct push.

**Done when** every approved change is committed and verification passes.

## 5. Record

In the ledger:

- Set the `Upstream tip SHA:` marker to the tip you scanned.
- Add one line per merged-commit port: `upstream-sha → fork-sha (description)`.
- Log each Skip with its reason, and each Watch with what would count as upstream stabilizing.
- Write a `PR #<n> @ <head sha>: <Recommendation> (<reason>)` line for every open PR you triaged, adding `→ fork-sha` for a port. When you re-triage a Head moved PR, replace its line; the scan reads the last one.
- For a merged commit tagged `ledger: decided as open PR #n`: if you ported the PR, diff the merged version against the head you ported, and port whatever changed in review. Then record the commit as ported and drop the `PR #n` line.

If the project keeps a changelog, update it too.

**Done when** the next scan's baseline equals the tip you just scanned, and that scan shows none of your triaged open PRs as New.

## Guardrails

- Push only to the fork's own remotes. Treat upstream as read-only.
- Keep secrets out of commits.

## Without Node

```bash
git log --no-merges --oneline <base>..<upstream-ref>
gh pr list -R <owner/repo> --state open --base <upstream-branch> --json number,title,headRefOid
git fetch <upstream-remote> pull/<n>/head:refs/remotes/<upstream-remote>/pr/<n>
git diff --name-only <sha>^..<sha>
git diff --name-only <upstream-ref>...<upstream-remote>/pr/<n>
git diff --name-only $(git merge-base <main-branch> <upstream-ref>)..<main-branch>
```

These commands list merged upstream work and open PRs, show what one change touched, and show what the fork changed. The phases stay the same.
