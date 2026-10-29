---
name: why
description: Investigate the history, intent, and design motivation behind code. Uses git history, blame, PR discussions, and ADRs to explain why code was built this way. Use for 'why is this written this way', 'why do we do X', or historical archaeology.
argument-hint: "[target symbol, file, or pattern]"
---

# Why

Investigate the motivation and intent behind code. The companion `how` skill answers what the code does and how it runs. `why` answers what external forces, bug fixes, or design trade-offs led to its current shape.

---

## 1. Operating Posture

Operate as a **careful, cautious, and precise investigator**. Be honest about what you know from primary records versus what you are inferring. Cite exact commits, dates, and PRs.

---

## 2. Establish the Code Anchor

Before making assumptions, gather the primary historical evidence:

1. **Find who touched it and when:**
   ```bash
   git blame -L <start>,<end> <file>
   ```
2. **Follow full patch history across renames:**
   ```bash
   git log --follow -p -n 5 -- <file>
   ```
3. **Identify originating PRs or issue tickets:**
   Search for merge commit subjects or PR numbers (`#1234`):
   ```bash
   git log --oneline -n 20 -- <file>
   ```
   If GitHub CLI (`gh`) is available, inspect the PR body and review discussions:
   ```bash
   gh pr view <pr_number> --json title,body,comments,reviews,author,mergedAt
   ```
4. **Check architecture records and comments:**
   Inspect `docs/adr/` or `GLOSSARY.md` if present in the repo.

---

## 3. Classify the Motivation

Determine which category drove this code shape:

- **Bug or Incident Fix:** Code looks defensive (null guards, retry delays, timeout handlers, race workarounds). Usually tied to a specific bug report or incident.
- **External Platform / Vendor Constraint:** Code works around a limitation in a 3rd-party API, OS limitation, or framework quirk.
- **Deliberate Architectural Trade-Off:** Chose performance over memory, simplicity over flexibility, or eventual consistency over ACID locks.
- **Accidental Complexity / Workaround:** Code was bolted on because the author didn't know a cleaner way existed.

---

## 4. Output Format

Format findings with direct evidence citations:

- **What It Is:** 1-sentence summary of the symbol or behavior in question.
- **The Core "Why":** The motivating reason, requirement, or constraint that shaped it.
- **Evidence Trail:**
  - **Commit / PR:** `<hash>` or `PR #<n>` by `<author>` on `<date>`: *"commit message excerpt"*
  - **Root Cause / Incident:** The actual problem the commit addressed.
- **Status Today:**
  - **Still Required:** The external constraint or invariant still applies.
  - **Obsolete / Tech Debt:** The upstream bug is fixed or the dependency was upgraded; this code can now be simplified or deleted.
