---
name: how
description: Explore the codebase to answer 'how does X work', architectural walkthroughs, subsystem data flow, and code placement questions. Use for 'how does this work', 'how is X implemented', or onboarding mental models.
argument-hint: "[subsystem, feature, or function]"
---

# How

Explore the codebase to answer "how does X work?" questions. Produce architectural explanations at the level of a senior engineer onboarding onto a subsystem: enough to build a working mental model, without reading like annotated source code.

---

## 1. Scope the Exploration

- **Simple (narrow function or single file):** Trace caller $\to$ execution $\to$ return in one pass.
- **Complex (cross-cutting subsystem, service, or multi-package feature):** Trace across 3 angles:
  1. **Entry Point & Interface:** Where user gestures, API calls, or events enter.
  2. **Core State & Transformation:** How data is modeled, mutated, and kept consistent.
  3. **Exit & Side Effects:** What disk writes, network payloads, UI re-renders, or event emissions happen.

---

## 2. Investigation Discipline

1. Locate real source files using `fffind` and `ffgrep`. Never assume or invent file paths.
2. Read the actual implementation, not just comments or method names.
3. Trace real data shapes: what data structure arrives, what leaves.
4. Check boundaries: where do assertions, validations, or async timeouts live?

---

## 3. Output Format

Format the explanation cleanly:

- **Overview:** 1–2 sentences explaining what the subsystem does and why it exists.
- **Mental Model & Flow:** Compact step-by-step flow or ASCII diagram:
  ```text
  [Input / Event] ──► [Validator/Service] ──► [State Mutation] ──► [Persistent Sink/UI]
  ```
- **Where Things Live:** Table of key classes/functions with real `file:line` references:
  | Component | Path | Responsibility |
  |---|---|---|
  | `<Name>` | `path/to/file.dart:line` | `<Core duty>` |
- **Gotchas:** Non-obvious lifecycles, caching semantics, or async ordering constraints.
