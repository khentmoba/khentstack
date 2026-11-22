---
name: rate-loop
description: Use when the user says "rate loop".
---

# rate-loop

Improve something in rounds until a blind rater scores it high enough.
Each round, a fresh no-context subagent researches what the community
considers best-in-class, compares our version against it, rates it out of
10, and lists improvements. You implement them, verify, and start the next
blind round. The user starts the loop and walks away; run it to the end
without asking them anything.

## Inputs

Parse from the user's message; use the default for anything missing:

The usual form is `rate loop <goal> <target>`, e.g. "rate loop improve our
manga reader's UI/UX 9.5". The goal names only what to improve; community
research and the comparison against the best always come from the brief,
whether or not the user mentions them.

- **Goal**: the subject and what to improve (e.g. "our manga reader's
  UI/UX"). Required. If it is missing or
  you cannot tell what subject it names, ask once before starting; after
  that, never ask again until the loop ends.
- **Target**: the score that stops the loop. Default `9.5`.
- **Round cap**: default `15`.
- **Floor**: minimum score required to finish on a plateau or at the round
  cap. Default target minus `0.5`.
- **Finish**: what to do on success. Default: invoke `full-stop`. The user
  can name another finish (`full-send`, "just commit", "leave it").
- **Rater model**: default Hy4 Flash Free (see 2).

## Rules

- **Blind.** Every round is a new subagent with no history: no previous
  scores, no list of what you changed, no hint that earlier rounds exist.
  It sees only the frozen brief, the cached research rubric (Rounds 2+),
  any pre-captured screenshots, and the current code.
- **Frozen brief.** Write the brief once in step 1 and send it verbatim
  every round, so scores stay comparable. Do not tune it to chase a score.
  Rounds 2+ may only attach the cached rubric path and refreshed screenshot
  paths.
- **The rater decides the score.** Never tell it a target, never ask it to
  be generous, never stop on your own estimate.
- **Rater is read-only.** It researches and inspects; you make every edit.
  One rater at a time; it must not start subagents.
- **Ledger.** Keep one in the conversation: round, overall score, category
  scores, plateau status (improved vs. plateau and whether actionable
  High/Medium findings remained), findings implemented, findings declined
  with reason, commit SHA. Copy scores from the rater's report; never guess
  them.

## 1. Set up

Find the subject in the repo: entry files, related components, how to run
it, and which checks cover it (typecheck, build, tests). Install
dependencies if the worktree lacks them. Run the checks once so you know
the baseline. Work on the current task branch; if you are on the default
branch, create one first.

Write the frozen brief from the goal (T3 children get no history):

```
You are an independent, strict reviewer. Read-only: do not edit, commit,
push, or start subagents. Search only inside Repo.
On Windows PowerShell 5.1: use ; not &&, git grep not grep/rg/Select-String <dir>, and never > to write text files (UTF-16LE breaks read).
Tool economy: use git ls-files <dir> instead of fffind "*" (caps at 5 matches); pass limit: 250 on read for >300-line files if a sidecar cap triggers.
Repo: <abs path>
Subject: <what it is, entry files to start from>
Goal: <what the user wants it to excel at, for whom, on which devices>
Rubric: <omit in Round 1; in Rounds 2+, abs path to cached rubric file>
Screenshots: <optional; abs paths to pre-captured screenshots>
1. Research community consensus: which <subject kind> do users and
   reviewers consider best-in-class, and which concrete features, ergonomics,
   visual details, and polish make them loved. Use live web search and
   cite sources. If a Rubric path is provided above, read that file and
   skip live web scraping.
2. Inspect our implementation thoroughly: the entry files and everything
   they import. If Screenshots are provided above, inspect them directly
   instead of writing new browser/Playwright capture scripts. Otherwise you
   may run it headless (no visible windows, muted audio) to see it; stop
   anything you start before replying.
3. Compare ours against the best, dimension by dimension. Choose the
   dimensions from your research (or the provided Rubric).
4. Rate strictly against the very best, not against average. Give a score
   per dimension and an overall score.
5. List concrete improvements that would raise the score, grouped High
   Impact, Medium Impact, Polish. Name files and the specific defect or gap.
Reply with the full report, and make the first line exactly:
Overall Rating: X.X / 10
```

If the project already has a proof or screenshot CLI, capture fresh
screenshots before Round 1 (and after each round's changes) and pass their
paths in `Screenshots:` so blind raters do not reinvent Playwright scripts
every round.

## 2. Start a rater

Use Hy4 Flash Free unless the user named another model. Run it even if
you are Hy4 yourself; the rater starts with no history. In T3, call
`orchestrator_capabilities` once to confirm the route, then start each round
with a fresh `delegate_task`:

```
role: "review", mode: "async", isolation: "shared",
title: "<Subject> blind rating — Round <n>",
target: { providerInstanceId: "opencode", model: "opencode/hy4-flash-free",
          options: { variant: "high" } }
```

If OpenCode or that model is not listed, use the Pi route for the same
model instead (its only effort is `low`):

```
target: { providerInstanceId: "pi",
          model: "magpie/our-free-model/hy4-flash-free",
          options: { thinking: "low" } }
```

Keep the same route for the whole loop unless the quota fallback below
applies. If the active route fails with a free-tier quota or rate-limit error
("Free usage limit reached", HTTP 429, or quota exhaustion), fall back
automatically instead of failing the loop:

1. Switch to the other Hy4 Flash Free route (`pi` if `opencode` hit quota, or
   vice versa).
2. If both Hy4 Flash Free routes hit quota or are unavailable, pick the
   strongest available review/reasoning model from `orchestrator_capabilities`
   (preferring a different provider/model than your own when available),
   record the fallback and reason in the ledger and final report, and keep it
   for the rest of the loop.

Only report a blocker and stop if no capable model is available in
`orchestrator_capabilities`. New `clientRequestId` per round. Do not use
`t3_thread_send`, `create_threads`, or `t3_thread_launch` for raters.

After starting the rater, end your turn. Its completion notice resumes you;
then read the report with `t3_thread_read` (`threadId: childThreadId`,
`view: "messages"`). Do not poll and do not edit the subject while a round
runs. On error, timeout, or a report without a parseable
`Overall Rating`, `task_cancel` it and restart the same round once; a
failed run does not count as a round.

## 3. Check the score

After Round 1, cache the rater's community research, dimensions, and cited
sources (never scores, findings, or round numbers) to an untracked scratch
file (e.g. `$(git rev-parse --git-path rate-loop-rubric.md)`) and pass its
absolute path in `Rubric:` for Rounds 2+ so later rounds skip redundant web
scraping.

Record the score in the ledger, then apply the **hard stop** — stop
immediately if any of these hold:

- `score ≥ target`: **success** — stop immediately; never run extra rounds
  after hitting target.
- 2 consecutive plateau rounds (score does not improve over the prior round
  and no new actionable High/Medium findings remain): **plateau** — stop
  immediately instead of burning remaining rounds.
- `round ≥ round cap` and `score ≥ floor`: **success**.
- `round ≥ round cap` and `score < floor`: **out of budget**.

Otherwise continue to step 4.

## 4. Implement

Check every finding against the code yourself; the rater is blind, so it
may re-raise something already done or misread the code.

- Real gap or defect: implement it. Do all High Impact items, then Medium,
  then Polish where it is cheap. Fix the whole class of problem, not one
  instance.
- Already done, wrong, or against the goal: decline in one line with
  evidence (file:line). It goes in the ledger, not to the next rater.
- Bugs before features: a reported correctness bug outranks a missing
  feature.

Add or update tests for behavior you change when the project has a test
setup. Run the checks; every one must pass before the next round, because
the rater should never judge broken code. If you pass pre-captured
screenshots, refresh them after checks pass. Commit on the task branch:
`rate-loop round <n>: <score> -> <one-line summary>`.

Post a short progress line to the user (round, score, what changed), then go
back to step 2 for round `n + 1`.

## 5. Finish

- **Success** (or **Plateau** with `score ≥ floor`): run the chosen finish.
  The default `full-stop` is authorized by this invocation: it takes the
  branch to a PR ready for the user to merge.
- **Out of budget** (or **Plateau** with `score < floor`): do not run the
  finish. Leave the commits on the branch and report.

Report: goal, target, floor, round cap, how it ended, score per round, the
rater model and route, the biggest changes, declined findings with reasons,
checks run and their results, and the PR link if one was made.
