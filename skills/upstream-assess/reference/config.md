# upstream-assess config

Optional `upstream-assess.config.json` in the fork's repo root. Create it when auto-detection picks the wrong remote, branch, or baseline, or to encode project rules. Every field is optional.

```json
{
  "upstreamRemote": "upstream",
  "mainBranch": "main",
  "upstreamRef": "upstream/main",
  "ledgerFile": "FORK.md",
  "lastUpstreamSha": null,
  "highRiskPaths": [],
  "clusterPatterns": [],
  "identityRules": [],
  "verifyCommands": []
}
```

| Field | Read by | Meaning | Default |
| --- | --- | --- | --- |
| `upstreamRemote` | scripts | Remote pointing at upstream | `upstream`, else the only non-`origin` remote |
| `mainBranch` | scripts | Fork's integration branch | `origin/HEAD`, then `main`/`master`/`develop`/`trunk` |
| `upstreamRef` | scripts | Upstream ref to scan | `<remote>/HEAD`, else the remote's default branch |
| `ledgerFile` | scripts, agent | Fork ledger file (baseline marker and `PR #` decisions) | `FORK.md`; scripts also check `UPSTREAM.md`, `AGENTS.md`, `CLAUDE.md` |
| `lastUpstreamSha` | scripts | Scan baseline (exclusive); beats the ledger | ledger marker, else `merge-base` |
| `highRiskPaths` | `intersection` | Extra path prefixes/substrings flagged as shared surface | built-in lockfile/manifest/CI list |
| `clusterPatterns` | `scan-upstream` | Extra subject regexes marking coupled efforts; capture group 1 names the cluster | bracketed `[tag]` prefixes only |
| `identityRules` | agent | Fork identifiers, names, and paths a port must preserve | none |
| `verifyCommands` | agent | Build/test/lint commands to run after a port | none; ask the human |

Both scripts accept `--remote`, `--branch`, and `--upstream-ref`. `scan-upstream` also takes `--base`, `--tip`, `--pr-limit <n>` (open PRs listed, default 200), and `--no-prs`. `intersection` also takes `--pr <n>` for a fetched open PR. Run either one with `--help` to see the flags.
