---
name: full-refactor
description: Trigger this if the user says 'full refactor' or 'full simplify', or asks to refactor or simplify a whole codebase without changing behavior.
---

# Full Refactor

A `full-stop` run whose change is a **whole-codebase refactor**: the structure,
modules, and code all get simpler, and the program does exactly what it did
before. Same outputs for every input, same errors, same side effects in the
same order, same public surface.

Read [full-stop](../full-stop/SKILL.md) and follow it, including everything it
inherits from `full-send`. An explicit "full refactor" or "full simplify"
request authorizes that work, with full-stop's no-merge rules. The overrides
below replace full-send's "Finish the change" and extend its Proof, review,
PR, and handoff steps.

The **baseline** is the default branch at the commit you start from. Every
equivalence claim in this run is against the baseline.

## 1. Map

Read the whole codebase before changing any of it. Build a map:

- Entry points and the **public surface**: what anything outside the repo can
  observe. For a library, its exported names and signatures. For an app or
  service, its CLI flags, routes and responses, config keys, file and output
  formats, error messages, and persisted data. Internal module paths are not
  public surface unless the repo is a library that exposes them.
- Module layout and the dependency graph between modules, including cycles.
- Duplication across modules, dead files, unused exports, unused dependencies.
- Layers and indirection that carry no weight: wrappers that only forward,
  interfaces with one implementation and no test seam, factories that build
  one thing.
- Inconsistent patterns for the same job (error handling, config loading,
  logging, data access).

The map is done when every source file is accounted for in it.

## 2. Baseline and safety net

Run the repo's CI checks (typecheck, lint, tests, build) on the baseline and
record the result. That is the behavior contract.

Then pin behavior at the public surface with **characterization tests**:
golden-output or snapshot tests that drive the real entry points (run the CLI,
hit the routes, call the exported API) and record today's outputs, quirks
included. Cover every area the plan touches. They go first in the stack, pass
on the baseline, and are the only test additions this run makes outside new
seams the refactor needs.

## 3. Plan

From the map, write a refactor plan: an ordered list of **steps**, each one
structural theme that moves the codebase to a simpler shape. Typical steps:

- Reorganize the directory and module layout around responsibilities.
- Break dependency cycles.
- Collapse weightless layers; inline single-use abstractions.
- Merge near-duplicate modules; extract logic duplicated across modules into
  one place.
- Unify inconsistent patterns onto the one the codebase uses best.
- Replace hand-rolled code with the standard library or a dependency the
  project already has.
- Delete dead files, unused exports, unused dependencies, and dead internal
  flags.
- Line-level cleanup in what remains: flatten nesting with early returns,
  rename vague names, replace nested ternaries with `if`/`else` or `switch`,
  delete narrating comments and AI slop (defensive `try`/`catch` around code
  that cannot throw, needless `any` casts, wrappers that only forward).

Order steps so each one leaves the codebase building and green. Do moves and
renames in their own step, separate from logic changes, so reviewers can
check them mechanically. Put the plan in the first PR's description.

The goal is comprehension speed: a new reader finds things faster and holds
less in their head. Fewer lines is a side effect. Keep explicit code over
clever one-liners and keep abstractions that organize real concerns.

## 4. Execute the whole plan

Carry out every step. Each step is one PR in a **stack**: the first PR targets
the default branch, each later PR targets the one before it. Each PR is sized
for a reviewer to read in one sitting; split a step across PRs when it is
bigger.

Within a step, before removing code that looks pointless, learn why it exists
from its callers, error paths, and `git log -L` / `git blame` (Chesterton's
fence). Follow the project's conventions from `AGENTS.md`, `CLAUDE.md`, and
linter and formatter config. Commit in small increments and run the tests at
each commit. For mechanical changes across many files, use a codemod or the
language's refactor tooling.

Leave behavior alone even when it looks wrong. A bug you find goes in the
handoff as a follow-up, because fixing it changes behavior.

Each PR runs full-stop's flow on its own: proof, `review-loop`, `file-pr`,
`babysit-pr`, and the readiness gate. When an earlier PR changes, rebase the
PRs above it with `--force-with-lease` and recheck them.

The run is done when every plan step has a PR at the ready gate, or a blocker
reported for it.

## Proof

Proof for a refactor is **equivalence** with the baseline, on every PR:

- The baseline suite passes with zero edits to existing tests. An existing
  test that needs editing means behavior changed: undo that change. The one
  exception is a test that imports an internal path the refactor moved; update
  only its import and say so in the PR.
- Characterization tests pass unchanged.
- The public surface is unchanged. Diff it when the language has a tool for it
  (API extractors, `--help` output, route lists, schema dumps).
- For UI and runtime code, run the baseline and the PR side by side and compare.

## Review

Tell the `review-loop` reviewer the PR claims zero behavior change and show
it the plan step the PR implements. Any finding of behavior drift is blocking.

## Handoff additions

Each PR description states "No behavior change", its plan step, and how
equivalence was proved. The final report adds: the stack in merge order with
links, the baseline result, the characterization tests added, the plan with
each step's status, bugs found and left for follow-up, and the merge order the
stack needs.
