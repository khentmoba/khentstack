---
name: grill-with-docs
description: Relentless Socratic interview to sharpen a plan, feature, or design, which actively builds and updates GLOSSARY.md and ADRs as you go. Use for 'grill', 'grill me', 'grill with docs', 'stress-test this plan', or before starting a complex feature.
argument-hint: "[topic, plan, or feature description]"
---

# Grill With Docs

Adapted from [mattpocock/skills](https://github.com/mattpocock/skills). Relentlessly interview the user to stress-test ideas, eliminate misunderstandings, and sharpen the project's domain model and architectural decisions before writing code.

---

## 1. The Grilling Engine

Map the discussion as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask *now* without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Format each round like this:

```markdown
❓ **Q1 — <Question Title>**: <Question body explaining the trade-off and choices>

➡️ **Recommended:** <Your specific recommendation>

---

❓ **Q2 — <Question Title>**: <Question body explaining the trade-off and choices>

➡️ **Recommended:** <Your specific recommendation>
```

- Word questions so that a quick **"yes"** accepts your recommendations.
- Finding facts is your job, not the user's: grep the codebase, inspect schemas, read configs, or run probes. Never ask the user for something you could look up.
- The session is done when the frontier is empty: every branch visited, zero unstated assumptions.

---

## 2. Active Domain Modeling (`GLOSSARY.md`)

Maintain a single ubiquitous language across developer and agent.

- **Challenge against the glossary:** When the user or code uses a term that conflicts with `GLOSSARY.md`, call it out immediately: *"Our glossary defines X as A, but you seem to mean B. Which is canonical?"*
- **Sharpen fuzzy terms:** When vague or overloaded words arise (*"data"*, *"account"*, *"record"*), propose a precise canonical term.
- **Stress-test with edge cases:** Propose realistic scenarios: *"What happens if a user is offline during payment webhook processing?"*
- **Update `GLOSSARY.md` inline:** When a term is agreed, update `GLOSSARY.md` immediately at the repo root. Keep definitions tight (1–2 sentences defining what it *is*, not an implementation spec) and list rejected synonyms under `_Avoid_`:

```markdown
**<CanonicalTerm>**:
<Tight 1-2 sentence definition of the concept in this project's context.>
_Avoid_: <Synonym1>, <Synonym2>
```

---

## 3. Architecture Decision Records (`docs/adr/`)

Record architectural choices lazily in `docs/adr/<NNNN>-<slug>.md` **only** when all three conditions hold:
1. **Hard to reverse:** Meaningful cost to change later.
2. **Surprising without context:** A future engineer would ask *"why did they do this?"*
3. **Result of a real trade-off:** There were genuine alternatives and a specific reason one was picked.

### ADR Format
```markdown
# <NNNN>-<Short Title of Decision>

**Context:** <1-2 sentences on what was needed and options considered>
**Decision:** <What was chosen and why>
**Consequences:** <Downstream impacts or explicit non-goals>
```

---

## 4. Closing the Grill

Once all rounds are settled:
1. Show a brief summary of the agreed decisions.
2. Confirm the updated `GLOSSARY.md` and any newly minted ADRs.
3. Hand off the settled scope directly to implementation or spec planning.
