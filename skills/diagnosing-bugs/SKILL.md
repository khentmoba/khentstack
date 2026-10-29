---
name: diagnosing-bugs
description: Diagnose observed bugs, failed tests, crashes, and unexpected behavior before proposing fixes. Use automatically when a relevant failure appears during a task, or when the user requests debugging. Reproduce the symptom, trace its cause, test one hypothesis at a time, and verify the smallest fix. Not a continuous bug scan or permission for unrelated edits.
---

# Diagnose before fixing

Inspired by [Matt Pocock's diagnosing-bugs](https://github.com/mattpocock/skills/blob/main/skills/engineering/diagnosing-bugs/SKILL.md) and the failed-attempt safeguard in [systematic-debugging](https://github.com/obra/superpowers/blob/main/skills/systematic-debugging/SKILL.md). This is a portable adaptation, not the upstream workflow verbatim.

## Scope and authority

Model-invokable on an observed failure; also usable manually. A skill cannot guarantee invocation or find every bug. Work within the user's task and applicable repo instructions. A diagnosis-only request authorizes investigation, not application-code fixes. Inspection and local probes may proceed within existing permissions; live mutations, production instrumentation, sensitive data access, and destructive operations need separate authorization.

Inspect branch and working-tree state before changing files. Preserve unrelated edits. Use existing tools and test runners; discover actual commands from scripts/configuration rather than guessing. Do not install profilers, create schedules, delegate, commit, push, or open PRs solely because this skill was loaded.

## 1. Establish the exact failure

- Read the complete error and relevant stack trace. Record expected versus actual behavior, input, environment, and exact failing command.
- Classify application defects separately from missing dependencies, permissions, connectivity, credentials, and broken test infrastructure. A command returning nonzero is not automatically an application bug.
- Read enough source and configuration to locate the correct reproduction path. Prefer an existing failing test, then a narrow integration test, CLI/API probe, browser interaction, or captured replay.
- Execute the reproduction and confirm it catches this symptom, not a nearby failure. Record redacted output. Pin time, random seed, fixtures, and versions where relevant. For intermittent bugs, record attempts and failure frequency; one green run proves nothing.

Done when a repeatable check has actually shown the reported failure. If reproduction is blocked, state attempts and missing access/artifacts. Offer the smallest next step; label any static diagnosis unproven rather than guessing a fix.

## 2. Narrow and trace

Minimise inputs and steps while preserving the failure. Trace from the symptom backward through callers and state ownership to the first incorrect value or operation. Compare a working case and relevant recent changes; read dependency source at its actual pinned version when needed.

List plausible causes with a prediction that distinguishes them. One evidenced cause is enough for an obvious bug; use several ranked hypotheses when ambiguous. Test one variable at a time. Prefer debugger inspection or targeted boundary probes over broad logging. Tag temporary instrumentation uniquely, keep secrets out of logs and artifacts, and redact private values before sharing.

Done when execution evidence supports a cause and explains the original symptom. Reading a plausible line is evidence for a hypothesis, not proof of causation.

## 3. Fix within the authorized scope

For a requested fix, turn the repro into the smallest behavioral regression test at a seam that reaches the real failure. Run it failing before the fix. Apply one root-cause change, then run the same test and original scenario again. For races/flakes, compare repeated trials under the same conditions and report the remaining uncertainty.

Check affected callers and relevant existing regression checks. Preserve validation, error handling, and public contracts. Do not silence the failure by weakening assertions, skipping tests, adding broad catches, or replacing real behavior with a mock that cannot reproduce the bug. If an automated regression test is impossible, retain a reproducible manual check and disclose the gap.

## 4. Stop repeated guesswork

Record each attempted fix, prediction, and result. After three failed fix attempts for the same symptom, stop editing. Revisit the premise, reproduction, and state ownership; report what was ruled out and ask for a decision or missing evidence before another fix. Do not reset the count by renaming the hypothesis or starting another turn.

Undo only this task's unsuccessful experimental edits after checking the diff. Never use broad reset/clean operations or discard another agent's work. If edits overlap, stop and resolve ownership.

## 5. Verify and report

Remove only your temporary instrumentation and fixtures that are no longer needed; preserve useful regression tests and pre-existing logs. Inspect the final diff and rerun the exact repro plus relevant project checks after cleanup.

Report briefly: symptom, supported cause with `file:line`, change if authorized, exact before/after commands and results, and remaining unverified cases. Performance regressions require comparable measurements; diagnosing one does not authorize an open-ended optimization run.
