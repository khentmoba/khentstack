---
name: review-loop
description: Use when the user says "review loop".
---

# review-loop

This is a workflow for making your code changes more correct before (or
sometimes after) filing a pull request. tl;dr - use Hy4 Flash Free via
OpenCode at high thinking to review your code in a loop, with a triage pass
that marks findings you can ignore.

Make the most minimal possible changes to appease the Hy4 Flash Free
reviewers. Be careful of scope creep and don't be scared to push back.

## Loop

- **Budget.** Default: 3 rounds. Extend to 5 only for security,
  permissions, auth, data loss, or state/concurrency, while a blocker or
  should stays open with evidence. Or when the user asks. A round is one
  review pass; triage passes do not count toward the budget.
- **Stop on nits.** The loop ends on `VERDICT: SHIP`, or on any round whose
  findings left open after triage are all nits, whatever the verdict.
- **Step back.** After three rounds without SHIP, the reviewer asks you to
  step back and reconsider the approach (see 5).
- **Diff-only re-review.** Rounds 1-2 review the full base diff. From round
  3, the reviewer reads only the change since the last round plus open ids.
- **Flag the class of bug.** Every finding names its bug class and every
  instance in the change, so you fix all of them, not one line.
- **No repeats.** Findings already in the ledger (fixed, disagreed, declined,
  ignored) are never posted again. A real regression cites the old id.
- **Ignore check.** After each round with findings, a triage reviewer answers
  one yes/no question per finding: "Can I ignore this comment?" Yes means
  the finding is closed as `ignored`, and later rounds must not raise it.
- The reviewer decides on its own whether the change is ready to merge. Do not
  tell it to approve. End the loop only on SHIP or a nit-only round, never by
  declaring it done yourself.
- Declined nits, ignored findings, and comment, doc, or format-only fixes
  need no new round.
- One reviewer per pass, run one at a time. The reviewer must not start subagents
  or reviewers.
- Keep a ledger: id, class, severity, triage answer, outcome, usage if
  returned. Never guess it.

## 1. Scope

Run `git status --short`. Do not stash, discard, or include unrelated
changes. Limit review to the change paths if they separate cleanly.
Otherwise stop and ask.

Find the base after `git fetch origin`:

- PR: `gh pr view <n> --json baseRefName,headRefOid`. Check out the branch
  only if clean. Confirm `HEAD` is the PR head, or ahead only by this
  change. Base: `git merge-base HEAD origin/<baseRefName>`.
- Local: `git merge-base HEAD origin/<default-branch>`. No remote: a base
  the user names, or `HEAD` for uncommitted changes only.

The change is base to working tree in those paths, with untracked files.
Use one diff command all rounds. State intent and out-of-scope in 1-2
sentences. Run covering checks. Do not send code this change breaks. Note
missing or pre-failing checks in the brief.

Before each round, snapshot the working tree so later rounds can get a
diff-only view (works with uncommitted and untracked files):

```
export GIT_INDEX_FILE="$(git rev-parse --git-path review-loop-index)"
git read-tree HEAD && git add -A [-- <paths>] && git write-tree   # -> T<n>
unset GIT_INDEX_FILE
```

Record `T<n>` in the ledger. The round-to-round diff is
`git diff T<n-1> T<n> [-- <paths>]`.

## 2. Start the reviewer

Use Hy4 Flash Free via OpenCode at high thinking unless the user names another
model or effort. Run it even if you are Hy4 yourself; the reviewer starts with
no history. In T3, call `orchestrator_capabilities` once to confirm it is
available, then use `delegate_task` for every review and triage pass
(`role: "review"`, `mode: "wait"`, `timeoutMs: 240000`) with:

```
target: { providerInstanceId: "opencode",
          model: "opencode/hy4-flash-free",
          options: { variant: "high" } }
```

If OpenCode is missing or the model is not listed, use the Pi route for Hy4
Flash Free at high thinking instead:

```
target: { providerInstanceId: "pi",
          model: "magpie/workbuddy-ai/hy4flash-free",
          options: { thinking: "high" } }
```

Either route counts as Hy4 Flash Free. Keep the same route for the whole loop
unless the quota fallback below applies.

If the active route fails with a free-tier quota or rate-limit error ("Free
usage limit reached", HTTP 429, or quota exhaustion), fall back automatically
instead of skipping the review:

1. Switch to the other Hy4 Flash Free route (`pi` if `opencode` hit quota, or
   vice versa).
2. If both Hy4 Flash Free routes hit quota or are unavailable, pick the
   strongest available review/reasoning model from `orchestrator_capabilities`
   (preferring a different provider/model than your own when available),
   record the fallback and reason in the ledger and final report, and keep it
   for the rest of the loop.

Each pass blocks up to 4 minutes (under the 300s HTTP fetch limit). If
`waitTimedOut: true` is returned, follow up with `t3_thread_wait`
(`threadId: childThreadId`, `timeoutMs: 240000`) until it finishes, then
`t3_thread_read` (`threadId: childThreadId`, `view: "messages"`). A pass can
take 30 to 40 minutes total.

Only report a blocker if no capable model is available in
`orchestrator_capabilities`. Save `taskId`. New
`clientRequestId` per pass. `childThreadId` is storage, not the next
target. Do not use `t3_thread_send`, `create_threads`, or
`t3_thread_launch` for review.

If T3 tools are not listed, try one direct capability call. Outside T3, use
a native subagent set up for Hy4 Flash Free (or the strongest available
fallback on quota/429), and keep its ID. If no route is available, report the
blocker.

Do not edit scoped files while a pass runs. Do not poll or start a parallel
reviewer. Timeout, error, or no reply is not approval. On timeout or failure,
call `task_cancel`, confirm the status is `interrupted`, kill any `find`, `grep`,
or `rg` process the reviewer left running, then restart with the ledger.

Before a brief quotes a commit or tree ID, confirm it with `git rev-parse <id>`
and quote the resolved SHA. Do not copy an ID from memory or an earlier message.

Round 1 brief (T3 children get no history):

```
Review only. Do not edit, commit, push, comment on PRs, or start subagents.
Search only inside Repo. Never run find, grep, or rg against / or a drive root.
On Windows PowerShell 5.1: use ; not &&, git grep not grep/rg/Select-String <dir>, and never > to write text files (UTF-16LE breaks read).
Tool economy: use git ls-files <dir> instead of fffind "*" (caps at 5 matches); pass limit: 250 on read for >300-line files if a sidecar cap triggers.
Repo: <abs path> Base: <sha> Intent: <intent> Out of scope: <scope> Checks: <results>
See: git diff <base> [-- <paths>] (if rtk compacts output, run rtk bypass git diff ... or RTK_DISABLED=1 git diff ... on POSIX); git status --short (read untracked).
Read surrounding code. Find bugs, broken callers, mismatch with intent.
Skip style unless it hides a bug. Hold to the smallest change. Flag code,
tests, or guards the intent does not need. Other paths, rare cases, small
perf, extra compat: nits.
blocker = intended case wrong. should = real bug callers will hit, in intent. nit = rest.
For each finding, name the class of bug and list every instance of that
class in the change (file:line each), so all of them get fixed in one go.
Decide yourself whether this is ready to merge. SHIP only if you find no
open blocker or should. Nits alone do not block SHIP.
Reply:
VERDICT: SHIP or CHANGES
D1 [blocker|should|nit] Class: <bug class> At: <file:line>, <file:line> <claim>. Fix: <suggestion> (stable ids)
```

## 3. Ignore check

Skip only if the round returned no findings. Triage every finding, nits
included, even under a SHIP verdict. Start one triage pass (fresh
`delegate_task`, same target, `mode: "wait"`, `timeoutMs: 240000`) before you
answer anything:

```
Triage only. Do not edit, commit, push, comment on PRs, or start subagents.
Search only inside Repo. Never run find, grep, or rg against / or a drive root.
On Windows PowerShell 5.1: use ; not &&, git grep not grep/rg/Select-String <dir>, and never > to write text files (UTF-16LE breaks read).
Tool economy: use git ls-files <dir> instead of fffind "*" (caps at 5 matches); pass limit: 250 on read for >300-line files if a sidecar cap triggers.
Repo: <abs path> Base: <sha> Intent: <intent> Out of scope: <scope>
See: git diff <base> [-- <paths>] (if rtk compacts output, run rtk bypass git diff ... or RTK_DISABLED=1 git diff ... on POSIX). Read the code each finding points at.
Findings: <this round's findings verbatim>
For each finding answer one question: can the author ignore this comment?
yes = wrong, already handled, out of scope, or not worth a change for this intent.
no = a real problem in the intent that the author must fix or rebut.
Do not add new findings. Do not change ids.
Reply, one line per id:
D1 IGNORE: yes|no - <one-line reason with file:line>
```

- `yes`: mark the id `ignored: <reason>` in the ledger. No fix, no reply.
  If you have your own evidence it is a real bug, you may still fix it;
  then record it as `fixed`.
- `no`: answer it in step 4.
- A missing or unparseable answer counts as `no`.

## 4. Answer findings

Check each `no` finding and its severity yourself. Another path, rare case,
or small cost is a nit, whatever label it came with.

- Agree: fix every listed instance of the class, plus any other instance you
  find in the change (`rg` for the pattern). Smallest fix each. Prefer delete
  or narrow over new lock, cache, helper, or option. Stay in the change and
  the callers it touches. Add one focused test that fails without the fix,
  if intent needs it.
- Disagree: say why, with evidence (file:line, test, output).
- Out of scope or nit: decline in one line. List as follow-up.

Update the ledger. Re-run checks and `git diff --shortstat <base>`. If
review grew the diff, cut first. Do not agree just to end the loop.

## 5. Next round

Start one only if budget remains and either a blocker or should is open
after triage, or behavior code changed after the last SHIP. If the last
round was SHIP or nit-only and the behavior diff is unchanged since, stop:
do not start another round. Severity is your call from step 4, not the
label the reviewer gave.
Snapshot `T<n>`, then use a fresh `delegate_task` in T3, or follow up the
saved native ID.

Every later brief sends the round 1 brief, the ledger (`fixed:` /
`disagree:` / `declined:` / `ignored:` + evidence), and this block:

```
No repeats: do not post any finding already in the ledger, in any wording.
Ignored, declined, and disagreed ids are closed; do not reopen them unless
the new change broke them again, and then cite the old id.
Mark each open id `resolved` or `still open: <reason>`. New findings get new ids.
```

- **Round 2:** full review. Also send `git diff T1 T2`.
- **Round 3 onward (diff-only):** replace the "See:" line with
  `See: git diff T<n-1> T<n> [-- <paths>]` and tell the reviewer to review only
  that diff and the open ids. It may read the full base diff only for
  context or STEP BACK, not for new findings outside the changed code.
- **Step back (round 3 onward):** add to the brief:

  ```
  If your verdict is CHANGES, add a section:
  STEP BACK: <is the approach itself wrong? name the simpler approach, or say "keep approach" and why>
  ```

  Before the next round, reconsider in 2-3 lines and record it in the
  ledger. If you switch approach, the new diff is a new change: take a new
  snapshot and run the next round as a full review (round 1 brief + ledger).
  If you keep it, say why, and continue diff-only.

## 6. Stop and ship

Agreed: the reviewer returns SHIP, or a round leaves only nits open, on the
current behavior diff, with no blocker or should open (ignored ids are
closed) and no concern of your own. Stuck: an item stays disputed after two
replies, or the budget ends with a blocker or should open. Show both sides
in 2-3 lines each. The user decides. Budget end is not approval.

Do not push during the loop. Push after agreement only if the user asked
to push, ship, or update the PR. Do not add model, harness, or AI attribution
to the PR.

Report: rounds and budget (extended or not, and why), how it ended (SHIP
or nit-only round), model and effort, what the review changed, diff size
before/after, fixed, declined, and ignored findings with reasons, any step
back and what you decided, usage if exposed (else say not), pushed or not.
