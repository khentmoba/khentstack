---
name: retro
description: "Conduct a retrospective across every T3 thread in the current project."
disable-model-invocation: true
---

The user has asked for a **retrospective**. You are suggesting improvements to the coding agent's **environment** to improve future runs. The subject is the current T3 **project**: every thread in it, whichever thread you were launched from. A **ledger** per project records which threads earlier retros already covered, so each retro reads only new work.

## Steps

1. Call the Skill tool with `writing-for-agents` for the writing style guide.

2. Resolve the project. `t3_thread_list` with no `projectId` returns `projectId` and `currentThreadId` for the thread you run in; `t3_project_read` gives its title. T3 tools are deferred in some harnesses: load them with tool search before calling. If no T3 tools exist after that, you are outside T3: retro the current session alone, as the user specifies, and skip the ledger steps.

3. Read the ledger at `~/.t3/retros/<projectId>.md` (format under **Ledger** below). A missing file means no thread has been retroed yet.

4. Build the **queue**: page `t3_thread_list` for the project (follow `cursor` until it runs out, `includeSubagents: true`). A thread joins the queue when it is absent from the ledger, or its `updatedAt` is newer than the ledger's. Leave out the current thread and any thread whose `status` is `running`, `starting`, `queued` or `waiting`; name those in the report as skipped. Done when every page is listed and each thread is queued, skipped, or already covered. If the queue is empty, tell the user and stop.

5. Read each queued thread with `t3_thread_read`, `view: "activity"`, from `afterPosition` set to the ledger's position for that thread (`-1` for a new one), paging with `nextPosition` until `hasMore` is false. Keep the last `position` read and the `updatedAt` per thread for the ledger. A thread's `worktreePath` and the project's `workspaceRoot` locate the repo files the findings cite. With more than 5 queued threads, dispatch a subagent per thread when your harness has one, each returning candidates with thread link and position as evidence, so the raw transcripts stay out of your window. Done when every queued thread is read to its end.

6. Look for candidates for improvement in these categories. A pattern seen in two or more threads outranks a one-off.

- **Navigation**: how easy was it for the agent to find the right files? Are there hidden dependencies between files? Would a **navigation pointer** make it easier? _Use when_ the session took a long time to find a piece of information.
- **Automated checks**: are there automated checks that could catch errors the agent made? Linting, typing, tests, filesystem linters? Read the repo's own check command first (its `package.json`/build-tool `lint`/`check` scripts, its CI workflow), so a check that already exists but sits unwired or silently broken is the finding, not a reinvention. A repo with no **guardrail** (no pre-commit hook and no CI job running its lint/typecheck/test command) is itself a finding: an un-linted repo is a standing missed opportunity, not a neutral default. _Use when_ the agent made a mistake an automated check could have caught, or the repo has no guardrail at all.
- **Coding standards**: should the **reviewer agent** be given a new rule to enforce? Should an existing rule be removed or clarified? Classify the violation first: a **mechanical** one (a fixed syntactic pattern, a banned API, an import shape, a file-location rule) gets a deterministic check, full stop: a custom rule in the repo's own linter, a new pre-commit hook, or a new CI job, whichever the repo's language and existing guardrail make cheapest. Default to building the check over writing the rule. Reserve `CODING_STANDARDS.md` for genuine **judgement calls** (cross-file consistency, "matches the surrounding style," anything no guardrail could ever substitute for). _Use when_ the reviewer agent failed to catch a mistake.
- **Global AGENTS.md**: are there any steering instructions that should be moved to coding standards (or automated checks) instead? _Use when_ the AGENTS.md file is particularly large - in the repo OR the user's global scope.
- **Tool economy**: did the agent make expensive tool calls that could be streamlined? Is there any custom tooling (CLI's, MCP's) that is particularly token-inefficient? _Use when_ the agent made an expensive tool call.
- **No-ops**: look for instructions in steering files that don't modify the agent's behavior. _Use when_ the steering files are large and unwieldy.
- **Information access**: look for opportunities to increase the agent's access to information. Teeing dev server logs, readonly access to third-party services. _Use when_ a crucial piece of information was not available to the agent.

7. Present these candidates to the user, in order of severity. Cite each by thread `link` (verbatim from T3) and position. Close with the threads reviewed and the threads skipped.

8. Update the ledger: one row per thread read in step 5, replacing that thread's old row. Done when every thread read has a row with its last position and `updatedAt`.

## Reference

### Ledger

`~/.t3/retros/<projectId>.md`, one file per project, kept outside the repo so it survives worktrees and leaves git clean. Create the folder and file when missing.

```markdown
# Retro ledger: <project title>

Project id: <projectId>

| Thread id | Title | Last position | Thread updatedAt | Retro date |
| --- | --- | --- | --- | --- |
| 914de1ea-bd34-491c-b789-eb23e734e6d0 | Assessment Skill Unmerged PR Support | 79 | 2026-11-18T12:54:53.939Z | 2026-11-18 |
```

A thread that gains new messages after its retro gets a newer `updatedAt`, so the next retro reads it again from `Last position` onward.

### Implementation vs Review

Remember that all work goes through two stages: implementation and review. The implementation agent has the most **context pressure**. They are responsible for exploration, writing code, and debugging failures.

The review agent has the least context pressure - it receives a diff, so no exploration needed. It often does not need to write code or debug.

This means that the review agent should be responsible for imposing coding standards, not the implementation agent.

### Files

You have access to several files in the repo:

- `CLAUDE.md`/`AGENTS.md`: these files are pushed to the context window of any agent working in this repo. They should be used incredibly sparingly, usually only for **navigation pointers** to other files.
- `CODING_STANDARDS.md`: this file is read during review, not implementation. Add **navigation pointers** to docs folders if the standards file gets more than 1,000 lines long.
- Docs: use docs as references files, pointed to by other files. Look for existing docs before writing new ones.
- Skills: use skills for docs (since their description goes into the agent's context window), or for user-invoked commands. Follow the advice in the `writing-for-agents` skill.
