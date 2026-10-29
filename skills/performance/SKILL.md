---
name: performance
description: User-invoked only. Investigate or optimize performance only when the user explicitly requests it, not automatically on CI alerts or test failures. Uses measured baselines, profiling, bounded experiments, and correctness gates.
disable-model-invocation: true
---

# Measured performance improvement

Inspired by pstack's [hillclimb](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/hillclimb.md) and [benchmark checklist](https://github.com/cursor/plugins/blob/main/pstack/skills/benchmark-checklist/SKILL.md). This standalone adaptation needs neither poteto-mode nor its subagents.

## Invocation and scope

User-invoked only. An automatic test failure or CI performance alert is not permission to start optimization. If a harness does not enforce the frontmatter flag, still require an explicit user request to investigate or improve performance. An investigation-only request produces findings, not application-code changes.

Read repo instructions and inspect branch/working-tree state. Preserve unrelated work. Work locally and sequentially by default; delegation, dependency installation, production experiments, scheduling, commits, PRs, and publishing need their own authorization. Existing tests and profilers come before new tooling.

## 1. Define a bounded experiment

Name the user-visible operation, realistic workload, metric and units, improvement direction, and correctness constraints. Use the user's target and budget when supplied. If the operation or metric is ambiguous, ask before editing.

For a clear one-off request without an explicit budget, use at most three optimization experiments. Stop earlier when the target is reached, measurement is blocked, or cheap evidence-backed ideas are exhausted. Ask before extending the run. Do not invent a required speedup or silently relax a target.

Choose profiling tools supported by the actual platform and project. For example: Flutter DevTools in profile mode on a representative device, browser performance traces, Node's CPU profiler, or an available native Rust/Windows profiler. Verify availability first; do not assume Linux tracing commands work on Windows.

## 2. Establish and freeze the baseline

- Read the measurement code. Confirm real work executes and its output is consumed, including awaiting async operations. Count completed work, errors, retries, and timeouts; fast rejection is not a speedup.
- Use representative data sizes, concurrency, versions, build mode, machine, power settings, and cache state. Compare equivalent release/profile configurations, not debug against release. Keep intended cold-start and warm-path measurements separate.
- Verify the benchmark responds to meaningful workload changes. Profile separately from reported timing runs so instrumentation overhead does not bias the claim. Locate a measured bottleneck and map it to source.
- Run existing correctness checks. Record any baseline failures rather than attributing them to later experiments.
- Record the exact command, workload/configuration, revision plus local diff identity, and baseline samples. Freeze these for comparison. If the harness changes, discard the old comparison and rerun both sides.

Done when a repeatable command measures the intended operation, checks work and errors, and has a usable baseline. If profiling or representative execution is unavailable, report the gap and stop short of claiming an improvement.

## 3. Change one thing and compare

Prefer eliminating unnecessary work, avoiding repeated work, or reducing data movement before adding caches, concurrency, dependencies, or complexity. Each experiment must name a bottleneck-backed hypothesis and preserve required behavior.

Keep a short local experiment record: hypothesis, scoped diff, command/configuration, before/after samples, correctness results, and keep/undo verdict. Use an existing scratch/artifact location outside tracked source when possible; creating a permanent logging framework is unnecessary.

Run each side at least five times for an improvement claim, interleaving equivalent baseline and candidate runs to reduce drift. Use separate temporary build outputs or isolated copies where needed, never destructive checkout switching. Match warmup and cache conditions. Report median and range; use appropriate tail metrics only with enough samples. A difference inside observed variation is no measurable improvement, not a win. A single run requested as a quick estimate must be labeled as such and cannot justify keeping an optimization.

Check both the targeted metric and relevant end-to-end behavior. Include workload/error counts, relevant tests, and plausible memory/resource trade-offs. Sanity-check the result against the fraction of time the changed code consumed. Distinguish latency reduction `(before-after)/before` from throughput increase `(after-before)/before`; state units and direction.

## 4. Keep or undo safely

Keep a candidate only when repeated results exceed noise, relevant correctness checks pass, and the trade-off fits the request. Undo this experiment's edits otherwise. Never keep speculative complexity because it might help.

Review the diff before undoing. Restore only your owned experimental changes, preserving existing edits and earlier accepted improvements. Avoid `git reset --hard`, broad checkout/restore, and `git clean`. If another writer overlaps the files, stop and resolve ownership rather than overwriting work.

## 5. Final verification

Rerun the original workload and relevant project checks after cleanup. Retain a small benchmark or regression check only when useful for this task; do not add flaky timing thresholds to ordinary unit tests. Automated regression budgets belong in a controlled environment with an established baseline and agreed noise tolerance.

Lead with faster, slower, no measurable difference, or inconclusive. Give baseline and final values with units, sample counts, variation, percent change, workload/build details, bottleneck evidence, accepted/rejected experiments, and exact check commands. Disclose baseline failures, measurement limits, and resource trade-offs. No proof of representative end-to-end benefit means no broad claim that the app is faster.
