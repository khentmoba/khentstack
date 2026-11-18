---
name: upstream-issues
description: Upstream issue triage for a fork of any project. Use when checking which upstream issues or bug reports also affect the fork, or deciding which to mirror into the fork's tracker.
---

# Upstream issues

Decide which upstream issues also affect the fork. Upstream bugs often live in code the fork inherited unchanged. But an issue may not reach the fork if the code was replaced, if the fork already fixed it, or if it was never inherited.

`scripts/scan-issues.mjs` fetches upstream GitHub issues with `gh` and gathers **evidence** for each one: which repo files the issue mentions and how the fork relates to them, plus any upstream fix commits and whether the fork has ported them. It needs Node 18+ and an authenticated `gh`, and it only reads. It picks up the remote, the branches, and the upstream repo on its own. To override any of them, read [reference/config.md](reference/config.md).

The **ledger** is the fork's record of upstream decisions. It is `FORK.md` unless the config names another file. The scan reads this marker line from it as its start date:

```
Upstream issues scanned: YYYY-MM-DD
```

## 1. Scan

The upstream remote must exist and be fetched. If it is missing, ask the human for the URL before you add it.

```bash
git fetch <upstream-remote> --tags
node <skill-dir>/scripts/scan-issues.mjs > upstream-issues.md
```

The first scan has no marker, so it pulls the 100 most recently updated issues. If that is too broad or too narrow, ask the human for a `--since` date or labels (e.g. `--label bug`). The report groups issues by signal, most actionable first:

| Signal | Meaning |
| --- | --- |
| Upstream fix not in fork | An upstream commit mentions the issue or its closing PR, and the fork hasn't ported it |
| Touches shared code | The issue mentions files the fork inherited and never changed |
| Touches fork-modified code | The issue mentions files the fork changed |
| No code references | No file names to go on |
| Referenced code absent in fork | The issue mentions files the fork doesn't have |
| Upstream fix already ported | The fork has an `Upstream: <sha>` commit for the fix |

If upstream doesn't use GitHub Issues, export the issues from its tracker and gather the same evidence yourself: the mentioned files, checked with `git ls-tree` and `git diff <merge-base>..<main-branch>`, and fix commits found with `git log --grep`.

**Done when** you have read every issue in the report.

## 2. Triage

The signal is a starting point. Before you classify an issue, read it (`gh issue view <n> -R <owner/repo> --comments`) and the fork's version of the code it describes. Classify each one:

- **Affects fork**: the fork has the faulty code path, or the reported behavior applies to the fork.
- **Fixed in fork**: the fork already has a fix, ported or written independently. Cite the commit.
- **Not affected**: the fork replaced, removed, or never had the code. Name what replaced it.
- **Needs repro**: there isn't enough evidence to tell. Write down what would settle it.

For each issue that affects the fork, also note severity (crash, data loss, security, wrong result, cosmetic) and whether an upstream fix exists. An upstream fix becomes a **Port** candidate for the `upstream-assess` skill.

**Done when** every issue in the report has a classification and a one-line reason grounded in the fork's code.

## 3. Decide

Show the human the triage table and stop. The human picks which issues to mirror into the fork's tracker and which fixes to port.

**Done when** the human has explicitly named the issues to mirror and the fixes to port.

## 4. Mirror

For each approved issue, open one in the fork's tracker. With GitHub: `gh issue create -R <fork-owner/repo>`. Write it for the fork:

- the symptom, in terms of the fork's own behavior and file paths
- a link to the upstream issue, and to the upstream fix if one exists
- the fork code that has the problem

Hand any approved fixes to `upstream-assess`, starting at its Port phase.

**Done when** every approved issue has a fork issue, and you've reported each new issue's URL to the human.

## 5. Record

In the ledger:

- Set the `Upstream issues scanned:` marker to the scan date shown in the report.
- Log each mirrored issue: `upstream #n → fork #m`.
- Log each Not affected issue with its reason, so the next scan doesn't revisit it.

**Done when** the next scan's start date equals the date of this scan.

## Guardrails

- Write only to the fork's tracker and repo. Treat upstream as read-only, including its issue comments.
