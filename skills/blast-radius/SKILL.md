---
name: blast-radius
description: Find what a change could break somewhere else before it ships, beyond the diff, and prove the one fact it's safe because of by running real code instead of writing it up. Use for 'blast radius of X', 'what could this break', or reviewing a diff you don't trust yet.
argument-hint: "[target symbol, commit, or branch]"
---

# Blast Radius

Find what a change breaks somewhere else, before it ships. Use for "blast radius of X", "what could this break", or reviewing a diff you don't trust yet.

Listing callers is not the job. Grep does that in a second. The job is finding the breakage grep won't show you.

## Don't trust your own writeup

A blast-radius writeup that sounds right is worthless. It reads as convincing whether or not it's true. Do not hand back an unverified writeup. Find the one or two facts the whole change depends on, and prove them by running code.

### How sure are you?

For each fact the change's safety depends on, get it as far down this hierarchy as is cheap, and say where it stopped:

1. **You said so.** Worthless on its own.
2. **You pointed at the line.** A real `file:line`, or the dependency's own source code.
3. **You showed the bad case cannot happen.** Walked the failure branch step by step and proved it unreachable.
4. **You ran it.** A script, unit test, or probe that calls the real code and fails loudly if wrong.
5. **You reproduced it in the running app.** Real end-to-end execution.

Level 4 is usually one small script, test, or probe that imports the project code, calls the exact function or payload you're worried about, and verifies the outcome.

## Steps

1. **Read the change.** The diff, symbols added, modified, or deleted, and what it now does differently, including what the diff does not spell out. Check `git diff` against base.
2. **Find the one fact it's safe because of.** Most changes that look risky are safe because of a single invariant (e.g. *"this call only evicts expired cache entries and never drops active sessions"*). Find that core fact. If it holds, most risky cases clear at once. Spend your time here, not on a long speculative list of "maybes."
3. **Look where grep stops.**
   - What symbol search misses: JSON serialized over the network, DB columns / Firestore schemas, wire formats, IPC channels, another language or process reading the same bytes.
   - Execution timing: microtasks, race conditions, async unmount/teardown, debounce windows.
   - Transitive downstream: callers 2 or 3 hops away, event listeners, streams, reactive providers.
   - Pinned dependency versions and local patches.
4. **Be honest about each risk.** State the failure mechanism, the exact `file:line`, the likelihood, and the cost. Keep confirmed risks separate from cleared ones. Never invent a caller or an API.
5. **Prove the one fact.** Write a quick test or script that executes the actual code path. Run it and record what happened.
6. **Apply unslop.** Format findings plainly and concisely without filler or exaggerated danger.

## What to hand back

- **What it does:** Concrete behavioral change, including non-obvious effects.
- **The one fact it's safe because of:** State it, report the verification level reached (1–5), and paste the proof. If not provable, write `Unproven`.
- **Risks:** Specific failure mode, `file:line`, likelihood, severity, and verification status.
- **Cleared:** What was investigated and why it is safe.
- **Before you merge:** The cheapest script, test, or repro command that catches regressions.
