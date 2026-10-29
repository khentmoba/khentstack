---
name: retro
description: >
  End-of-session and cross-thread retrospective that turns agent mistakes into
  deterministic guards instead of prose. Audits recent work across T3 threads,
  groups repeat mistakes into classes, and applies the 4-level enforcement hierarchy
  (Architecture -> Types/CI Lint -> Behavior Tests -> Docs last). Use when the user
  says "retro", "retrospective", "correct", "what should we improve about how you worked",
  or asks for a post-session/multi-thread review.
disable-model-invocation: true
---

# Retro & Correction Engine

Adapted from [mattpocock/skills](https://github.com/mattpocock/skills) (`retro`) and [poteto/pstack](https://github.com/cursor/plugins/tree/main/pstack) (`correct`).

You are looking for structural improvements to the agent's **environment and codebase**, so future sessions and threads go better. Not a code review, not a self-apology: an actionable list of guards and fixes worth changing.

Report only by default. Do not edit files, change settings, commit, or apply fixes unless the user explicitly requests implementation. A request to audit or run `retro` or `correct` is not implementation approval.

---

## 1. Establish Ground Truth

Run the commands for the active repository:
- `git status --short --branch` and `git log --oneline -20`.
- List existing guard checks (e.g. `ls tool/ci/` in Everglow, or npm/cargo scripts in Cinder/CLIProxyAPI).
- Read the repo's `AGENTS.md` and project PR contract (e.g. `everglow-pr`, `create-pr`, or `file-pr`).

When auditing **multiple T3 threads or past sessions**:
1. Establish the requested project, thread set, and time range. If unspecified, use the current project's recent threads and state that scope.
2. Discover T3 tools with `tool_search` if needed. Use `t3_thread_list` with the project ID and paginate through the requested scope. Use `t3_thread_search` for focused discovery only; its bounded results are not a complete inventory.
3. Read each selected thread with `t3_thread_read`. Follow `nextPosition` while `hasMore` is true; recover truncated items using `itemId` and `textOffset`. Start with messages and use activity when tool/check evidence is needed.
4. Corroborate claims with commits, reverts, review comments, and actual check results. Cite the exact thread link (`t3-thread://v1/<threadId>`) plus message/item ID or commit and file location. Keep private thread content out of public artifacts.
5. Group recurrent failures into mistake classes. A chronic class requires two independent occurrences, not two retellings of the same incident. Single incidents may still merit findings.
6. List threads reviewed and any unreadable, truncated, or excluded history. If T3 access is unavailable, report the gap and limit conclusions to accessible evidence. Never imply a cross-thread audit occurred from the current conversation alone.

---

## 2. The 4-Level Enforcement Hierarchy

When proposing or implementing fixes for mistake classes, always apply this strict hierarchy:

1. **Eliminate it with Architecture:**
   Give each piece of state one owner and each task one supported path. Hide internals so the wrong import fails. Delete old ways and dead code an agent would copy.
2. **Enforce it with Types or CI Linters:**
   Make the bad state unrepresentable in the type system. If bad code still compiles, add a deterministic CI check (e.g. `tool/ci/check_<name>.dart`, ESLint rule, or Clippy check) whose error output explicitly names the exact file, type, or function to use instead.
3. **Test the Behavior:**
   Add a unit or integration test asserting observable behavior. Ensure the test fails when the behavior breaks and stays green when only internals change.
4. **Agent Instructions & Docs Last:**
   Reserve prose in `AGENTS.md` strictly for genuine human judgement calls that no machine check can catch. Writing rules in docs is the weakest level: agents skip or misunderstand prose.

---

## 3. Categories to Evaluate

- **Automated checks (Highest value):** Did the agent make a mistake a machine guard could catch? A mechanical rule without a guard behind it is a standing missed opportunity.
- **Mechanical vs Judgement:** Classify first. Mechanical rules (import shapes, naming rules, banned methods, forbidden strings) get automated guards. Only true judgement calls belong in prose.
- **Navigation:** Did finding files waste tool calls? Add a 1-line exact path pointer in `AGENTS.md`.
- **AGENTS.md Bloat:** Is `AGENTS.md` bloated with rules that can be moved into CI checks? Keep only the rules that never bend, plus navigation.
- **Proof Honesty:** Did a claim outrun its evidence? (e.g., claiming interaction worked when only UI appearance was proven). Fix with a sharper PR gate.
- **Task Size & Scope Creep:** Did a small fix expand into an unapproved refactor?

---

## 4. Rules for the Report

- Present candidates **worst / most frequent first**.
- Each candidate must cite:
  1. **What happened:** Real file, commit SHA, or moment in the thread.
  2. **Recurrence:** Single session vs repeat chronic pattern.
  3. **Selected Level (1–4):** The highest applicable level from the enforcement hierarchy.
  4. **The smallest concrete change:** The exact guard, type constraint, or check to add.
- If the session was clean and no changes are needed, say so plainly. An empty retro is a valid result; padded findings are worse than useless.
- If implementation is explicitly requested, use the repository's branch and PR rules. Keep fixes scoped and prove each new guard fails against the actual past mistake and passes after the fix. Report exact commands and results, or mark the protection unproven.
