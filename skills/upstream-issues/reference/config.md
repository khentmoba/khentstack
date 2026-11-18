# upstream-issues config

The scan reads the same optional `upstream-assess.config.json` as `upstream-assess`. It lives in the fork's repo root. The two skills share the remote, branch, and ledger fields; the rest are specific to issues. Every field is optional.

| Field | Meaning | Default |
| --- | --- | --- |
| `upstreamRemote`, `mainBranch`, `upstreamRef` | Same as `upstream-assess` | auto-detected |
| `ledgerFile` | Fork ledger file | `FORK.md`, then `UPSTREAM.md` |
| `upstreamRepo` | Upstream GitHub `owner/name` | parsed from the upstream remote URL |
| `lastIssueScan` | Start date `YYYY-MM-DD`; beats the ledger marker | ledger marker, else no date filter |
| `issueLabels` | Labels every issue must have, e.g. `["bug"]` | none |
| `issueLimit` | Most issues to fetch | `100` |

Run `node scan-issues.mjs --help` to see the flags. `--since`, `--state`, `--limit`, `--label`, and `--repo` override the config.
