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
- **Floor**: from the round cap onward, a score at or above this also stops
  the loop. Default target minus `0.5`.
- **Finish**: what to do on success. Default: invoke `full-stop`. The user
  can name another finish (`full-send`, "just commit", "leave it").
- **Rater model**: default Hy4 Flash Free (see 2).

## Rules

- **Blind.** Every round is a new subagent with no history: no previous
  scores, no list of what you changed, no hint that earlier rounds exist.
  It sees only the frozen brief and the current code.
- **Frozen brief.** Write the brief once in step 1 and send it verbatim
  every round, so scores stay comparable. Do not tune it to chase a score.
- **The rater decides the score.** Never tell it a target, never ask it to
  be generous, never stop on your own estimate.
- **Rater is read-only.** It researches and inspects; you make every edit.
  One rater at a time; it must not start subagents.
- **Ledger.** Keep one in the conversation: round, overall score, category
  scores, findings implemented, findings declined with reason, commit SHA.
  Copy scores from the rater's report; never guess them.

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
Repo: <abs path>
Subject: <what it is, entry files to start from>
Goal: <what the user wants it to excel at, for whom, on which devices>
1. Research community consensus: which <subject kind> do users and
   reviewers consider best-in-class, and which concrete features, ergonomics,
   visual details, and polish make them loved. Use live web search and
   cite sources.
2. Inspect our implementation thoroughly: the entry files and everything
   they import. You may run it headless (no visible windows, muted audio)
   to see it; stop anything you start before replying.
3. Compare ours against the best, dimension by dimension. Choose the
   dimensions from your research.
4. Rate strictly against the very best, not against average. Give a score
   per dimension and an overall score.
5. List concrete improvements that would raise the score, grouped High
   Impact, Medium Impact, Polish. Name files and the specific defect or gap.
Reply with the full report, and make the first line exactly:
Overall Rating: X.X / 10
```

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

Keep the same route for the whole loop. If neither route lists the model,
report the blocker and stop; do not substitute another model. New
`clientRequestId` per round. Do not use `t3_thread_send`,
`create_threads`, or `t3_thread_launch` for raters.

After starting the rater, end your turn. Its completion notice resumes you;
then read the report with `t3_thread_read` (`threadId: childThreadId`,
`view: "messages"`). Do not poll and do not edit the subject while a round
runs. On error, timeout, or a report without a parseable
`Overall Rating`, `task_cancel` it and restart the same round once; a
failed run does not count as a round.

## 3. Check the score

Record the score in the ledger, then stop if any of these hold:

- score ≥ target: **success**.
- round ≥ round cap and score ≥ floor: **success**.
- round ≥ round cap and score < floor: **out of budget**.

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
the rater should never judge broken code. Commit on the task branch:
`rate-loop round <n>: <score> -> <one-line summary>`.

Post a short progress line to the user (round, score, what changed), then go
back to step 2 for round `n + 1`.

## 5. Finish

- **Success**: run the chosen finish. The default `full-stop` is authorized
  by this invocation: it takes the branch to a PR ready for the user to
  merge.
- **Out of budget**: do not run the finish. Leave the commits on the
  branch and report.

Report: goal, target, floor, round cap, how it ended, score per round, the
rater model and route, the biggest changes, declined findings with reasons,
checks run and their results, and the PR link if one was made.
