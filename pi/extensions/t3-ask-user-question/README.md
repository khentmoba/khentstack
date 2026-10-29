# T3 question companion

A Pi extension for T3 Code's native RPC dialogs. It registers `ask_user_question` with the familiar structured question schema, alongside the existing `t3-goal` and `t3-subagents` companions. It also works in standalone Pi using the same dialog primitives.

The installed RPIV RPC fallback turns multi-select questions into an input prompt containing numbered choices. This extension always sends choices through `ctx.ui.select(title, options)`, so T3 receives real selectable rows. It never asks the user to type option numbers.

- Single-select: click a choice, or type a custom answer using the host's free-text response.
- Multi-select: click choices to toggle `[ ]` / `[x]`, then click `Done`. Each toggle opens a fresh native dialog because Pi RPC supports one selection per request, not checkbox arrays. An empty selection is allowed.
- `Type something.` opens a text input. Multi-select keeps that text alongside selected choices until Done; `Clear custom answer` removes it. Cancelling or submitting blank custom input returns to the choices.
- Dismissing the option dialog cancels the questionnaire and preserves earlier answers as partial results. Aborting the run throws instead of pretending the user declined.
- Questions appear sequentially. Previews stay in their option rows; their visual wrapping depends on T3. There is no custom terminal overlay or side-by-side preview pane.
- Invalid/duplicate/reserved labels fail before any dialog. No UI returns an explicit failure; it does not invent an answer or fall back to a wall of choices in chat.

## Installation

Copy `t3-ask-user-question/` to `~/.pi/agent/extensions/`. Disable the original package's extensions in `~/.pi/agent/settings.json` so only one tool owns the name:

```json
{"source":"npm:@juicesharp/rpiv-ask-user-question","extensions":[]}
```

The package remains installed for rollback. Restart the Pi session in T3 Code to load the new tool. Standalone Pi also supports `/reload`. Existing running sessions keep the old extension until restarted/reloaded.

To revert, remove the companion directory and restore the package entry to `"npm:@juicesharp/rpiv-ask-user-question"`, then restart.

## Original verification

The source project ran these checks; its test suite is not included in this snapshot.

```sh
node --test tests/questions.test.mjs
node tests/rpc-smoke.mjs
```

Uses the actual installed Pi 1.4.0 extension loader. The upstream reproduction test proves RPIV emits a text input for multi-select. Regression tests cover selectable rows, custom text, partial cancellation, validation, previews and abort handling. The smoke test runs a real Pi RPC process, triggers a test command without any model calls, reads native UI requests, sends matching responses and checks the selected result.

Tests verify the extension and RPC wire behavior. The T3 desktop's visual rendering has not been inspected in this session. The user should see clickable rows on the next question after restarting Pi; multi-select deliberately requires a click per toggle and a final Done.

Source and tests were developed in a separate local T3 scratch project. This snapshot contains the installed extension and this usage reference.
