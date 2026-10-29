# Pi + T3 companions

Two user-level Pi extensions for Pi running inside T3 Code. Tested against the locally installed Pi 1.3.0 extension API. They do not modify Pi or T3 internals.

## Goal tracker

```text
/goal set Ship the fix | Regression test passes | Existing tests pass
/goal show
/goal add Documentation updated
/goal check 1 node --test: 12 tests passed
/goal uncheck 1
/goal block Waiting for user approval
/goal resume
/goal done Regression and existing tests passed; documentation reviewed
/goal clear
```

The model can use `t3_goal` for the same actions. Indexes start at 1. Every check requires evidence; completion requires at least one criterion, all checked, and completion evidence. Evidence is recorded, not independently certified by the extension. `set` replaces the current goal.

Goals live in Pi session entries, follow the active session branch, survive reload/resume and compaction, and are not shared across unrelated sessions. TUI/RPC status support depends on the host. The current goal is added to model requests without replacing T3's system instructions. Completed and cleared goals stop producing reminders. No turn loops, background processes, schedulers, or automatic completion claims.

## T3 subagents

Ask Pi normally: “Delegate a read-only review using T3 subagents.” The model uses `t3_subagents`:

```json
{"action":"capabilities"}
{"action":"delegate","task":"Read the changed files and report regressions. Do not edit.","requestId":"review-1","role":"review"}
{"action":"status","taskId":"<returned T3 taskId>"}
{"action":"cancel","taskId":"<returned T3 taskId>","reason":"User requested cancellation"}
```

- Live T3 provider/model/options catalog; inherits the parent's selection unless overridden. Explicit `target.options: {}` clears inherited options. Options use the live catalog IDs.
- T3 owns child agents, worktrees, approvals, completion notifications and cancellation. No local `pi` subprocesses or top-level thread creation.
- Async by default; no polling timers. `mode: "wait"` is an explicit bounded wait; a wait timeout does not cancel the task. Inspect `workState`/pending fields as well as `status`.
- `isolation: "worktree"` requests a T3-prepared checkout from the parent's local commit; uncommitted edits are not copied. Omitted isolation shares the checkout.
- Active goal context is included by default, but conversation history is not. Use `includeGoal: false` to omit it. Blocked/completed goals are not forwarded.
- A pre-launch receipt freezes the exact request. Retry an uncertain call with identical arguments and the same `requestId`; use a fresh ID for new work or each independent review round. T3's idempotency remains authoritative. Conflict checks cover all branches in this Pi session because T3 tasks survive branch navigation; the history display follows only the active branch. Do not replay old IDs from an unrelated thread.
- `/subagents` shows historical receipts, **not** live status. `/subagents help` shows operating rules. Use returned task IDs with status when needed; T3 automatically delivers completion.
- Questions and approval requests remain in T3. Use native T3 pending-request tools for questions, and leave permission decisions with the existing approval holder.
- Works with either normalized `mcp__t3_code__*` or `mcp__t3-code__*` tool names. Uses Pi's nested-tool API so validation, hooks, and approvals still run. Missing/disallowed T3 tools fail explicitly; no shell transport or permission-bypassing fallback.

Each extension also works without the other. The optional goal brief is exchanged through Pi's extension event bus.

## Install / remove

Install directories `t3-goal` and `t3-subagents` under `~/.pi/agent/extensions/`. Pi discovers each `index.ts` automatically; no settings or bundled dependencies are needed. Restart the Pi-backed T3 thread to load them. In a standalone Pi TUI, `/reload` also loads extensions; T3 clients may not forward slash commands, so natural-language requests and model tools are the primary interface.

Remove either directory and restart to disable it. Removing the subagent extension does not cancel T3 tasks. Cancel tasks explicitly first if appropriate. Session history remains intact.

## Original verification

The source project ran these checks; its test suite is not included in this snapshot.

```sh
node --test tests/extensions.test.mjs
```

Tests use the real installed Pi extension loader and mocked nested T3 responses, without model calls or task launches. Set `PI_HOST_DIR` to the installed `@earendil-works/pi-coding-agent` package directory if it is not under `~/.local/node_modules/`. Tests cover loading, branch/reload reconstruction, evidence gates, goal forwarding, exact selection validation, cross-branch retry receipts, denied tools, cancellation, and abort signals. A live T3-owned Pi child also successfully exercised the installed goal set/check/done tools and the subagent extension's nested capabilities transport. They are not an end-to-end certification of every T3 version.
