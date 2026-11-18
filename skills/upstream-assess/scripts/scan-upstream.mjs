#!/usr/bin/env node
// scan-upstream.mjs — inventory upstream commits since the last scan baseline,
// plus open (unmerged) upstream PRs. Part of the project-neutral
// upstream-assess skill.
// Read-only: runs git (and gh, for open PRs), writes a markdown triage report
// to stdout. Project-agnostic: remote, branch, ref, baseline and layout are
// auto-detected from git, with optional overrides in upstream-assess.config.json.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  git,
  tryGit,
  detectContext,
  resolveBaseline,
  areaOf,
  typeOf,
  clusterTag,
  repoSlug,
  readLedger,
  ledgerPrDecisions,
  prFetchCommand,
  CONFIG_FILE,
} from "./lib.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const INTERSECTION = resolve(HERE, "intersection.mjs");

const argv = process.argv.slice(2);
const readValue = (flag, i) => {
  const v = argv[i + 1];
  if (!v || v.startsWith("-")) throw new Error(`Missing value for ${flag}`);
  return v;
};
let baseFlag, tipFlag, remoteFlag, branchFlag, upstreamRefFlag, help = false;
let includePrs = true, prLimit = 200;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "-h" || a === "--help") help = true;
  else if (a === "--base") baseFlag = readValue(a, i++);
  else if (a.startsWith("--base=")) baseFlag = a.slice(7);
  else if (a === "--tip") tipFlag = readValue(a, i++);
  else if (a.startsWith("--tip=")) tipFlag = a.slice(6);
  else if (a === "--remote") remoteFlag = readValue(a, i++);
  else if (a.startsWith("--remote=")) remoteFlag = a.slice(9);
  else if (a === "--branch") branchFlag = readValue(a, i++);
  else if (a.startsWith("--branch=")) branchFlag = a.slice(9);
  else if (a === "--upstream-ref") upstreamRefFlag = readValue(a, i++);
  else if (a.startsWith("--upstream-ref=")) upstreamRefFlag = a.slice(15);
  else if (a === "--no-prs") includePrs = false;
  else if (a === "--pr-limit") prLimit = Number(readValue(a, i++));
  else if (a.startsWith("--pr-limit=")) prLimit = Number(a.slice(11));
}

const HELP = `Usage:
  node scan-upstream.mjs [options]

Options:
  --base <sha>          Baseline commit (exclusive). Default: lastUpstreamSha in
                        ${CONFIG_FILE}, else a ledger file, else merge-base.
  --tip <ref>           Upstream tip to scan to (default: detected upstream ref).
  --remote <name>       Override the upstream remote name.
  --branch <name>       Override the fork's main branch.
  --upstream-ref <ref>  Override the upstream ref (e.g. upstream/main).
  --pr-limit <n>        Max open upstream PRs to list (default: 200).
  --no-prs              Skip the open-PR section (it needs gh and a GitHub upstream).
  -h, --help            Show this help.

Output is a markdown triage report on stdout. Redirect it to a scratch file.`;

if (help) {
  console.log(HELP);
  process.exit(0);
}
if (!Number.isInteger(prLimit) || prLimit < 1) {
  console.error("[scan-upstream] --pr-limit must be a positive integer");
  process.exit(1);
}

try {
  const ctx = detectContext({
    remote: remoteFlag,
    branch: branchFlag,
    upstreamRef: upstreamRefFlag,
  });
  const tipRef = tipFlag || ctx.upstreamRef;
  const tipSha = git("rev-parse", tipRef);
  const baseSha = resolveBaseline(ctx, baseFlag);

  try {
    git("merge-base", "--is-ancestor", baseSha, tipSha);
  } catch {
    throw new Error(`Baseline ${baseSha} is not an ancestor of ${tipSha}. Check the ledger or pass --base <sha>.`);
  }

  // One record per line: sha, author, ISO date, subject (all NUL/0x01 separated).
  const fmt = "%H%x01%an%x01%aI%x01%s";
  const log = git("log", "--no-merges", `--pretty=format:${fmt}`, `${baseSha}..${tipSha}`);
  const commits = [];
  for (const record of log.split("\n").filter(Boolean)) {
    const [sha, author, date, ...rest] = record.split("\x01");
    if (!sha) continue;
    let files = [];
    try {
      files = git("show", "--no-color", "--no-renames", "--name-only", "--pretty=format:", sha)
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);
    } catch {
      files = [];
    }
    commits.push({ sha, author, date: date.slice(0, 10), subject: rest.join("\x01"), files });
  }

  const slug = repoSlug(tryGit("remote", "get-url", ctx.remote));
  const prDecisions = ledgerPrDecisions(readLedger(ctx));

  // A merged commit whose subject cites a PR the ledger already decided while
  // it was open: the agent compares the merged result with that decision.
  const line = (c) => {
    const cited = [...c.subject.matchAll(/#(\d+)/g)].map((m) => Number(m[1])).filter((n) => prDecisions.has(n));
    const note = cited.length ? ` — **ledger: decided as open PR ${cited.map((n) => `#${n}`).join(", ")}**` : "";
    return `- \`${c.sha.slice(0, 10)}\` (${c.date}) ${c.subject}${note}`;
  };

  const out = [];
  out.push("# Upstream scan");
  out.push("");
  out.push(`- Fork branch: \`${ctx.branch}\``);
  out.push(`- Upstream remote: \`${ctx.remote}\` (ref \`${tipRef}\`)`);
  out.push(`- Baseline (exclusive): \`${baseSha}\``);
  out.push(`- Scanned tip: \`${tipSha}\``);
  out.push(`- Non-merge commits in range: **${commits.length}**`);
  out.push("");
  out.push("This report is triage input, not a plan. Decisions are made per change with the human in the loop.");
  out.push("");

  if (commits.length === 0) {
    out.push("_No upstream commits in this range._");
    out.push("");
  } else {
    // Coupled efforts: any bracketed subject prefix, e.g. "[foo] ...".
    // Neutral rule: verify coupling; if these are intermediate states of one
    // effort, default to Watch and port the net result once it stabilizes.
    const clusters = new Map();
    for (const c of commits) {
      const tag = clusterTag(c.subject, ctx.cfg.clusterPatterns || []);
      if (!tag) continue;
      if (!clusters.has(tag)) clusters.set(tag, []);
      clusters.get(tag).push(c);
    }
    if (clusters.size) {
      out.push("## Potential coupled efforts (default: Watch — verify first)");
      out.push("");
      for (const [tag, group] of [...clusters.entries()].sort((a, b) => b[1].length - a[1].length)) {
        out.push(`### [${tag}] (${group.length})`);
        out.push("");
        for (const c of group) out.push(line(c));
        out.push("");
      }
    }

    // Bucket each commit under its primary area (the area most of its files touch).
    const primaryArea = (files) => {
      if (!files.length) return "(no files)";
      const counts = new Map();
      for (const f of files) counts.set(areaOf(f), (counts.get(areaOf(f)) || 0) + 1);
      return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    };
    const byArea = new Map();
    for (const c of commits) {
      const area = primaryArea(c.files);
      if (!byArea.has(area)) byArea.set(area, []);
      byArea.get(area).push(c);
    }
    out.push("## Triage candidates by area");
    out.push("");
    for (const [area, group] of [...byArea.entries()].sort((a, b) => b[1].length - a[1].length)) {
      out.push(`### ${area} (${group.length})`);
      out.push("");
      for (const c of group) out.push(line(c));
      out.push("");
    }

    // By conventional-commit type (cosmetic, helps spot fix batches).
    const byType = new Map();
    for (const c of commits) {
      const t = typeOf(c.subject);
      if (!byType.has(t)) byType.set(t, []);
      byType.get(t).push(c);
    }
    out.push("## Triage candidates by change type");
    out.push("");
    for (const [t, group] of [...byType.entries()].sort((a, b) => b[1].length - a[1].length)) {
      out.push(`- ${t}: ${group.length}`);
    }
    out.push("");
  }

  if (includePrs) out.push(...openPrSection(ctx, slug, tipRef, prDecisions, prLimit));

  out.push("## How to triage");
  out.push("");
  out.push("For each candidate, size the porting risk first:");
  out.push("```bash");
  out.push(`node "${INTERSECTION}" <sha>`);
  out.push(`node "${INTERSECTION}" <base>..<tip>`);
  out.push(`node "${INTERSECTION}" --pr <n>`);
  out.push("```");
  out.push("");
  out.push("Then assign Port / Skip / Defer / Watch. See the upstream-assess SKILL.md, Phase 2.");
  out.push("");

  if (slug) {
    out.push("## Optional: merged-PR context (GitHub)");
    out.push("");
    out.push("For PR titles/labels behind the commits above, match `#123` in the subject or list merged PRs:");
    out.push("```bash");
    out.push(`gh pr list -R ${slug} --state merged --limit 50 --json number,title,labels,mergedAt`);
    out.push("```");
    out.push("");
  }

  process.stdout.write(out.join("\n"));
} catch (e) {
  console.error(`[scan-upstream] ${e.message}`);
  process.exit(1);
}

// Open (unmerged) upstream PRs against the scanned branch. They never appear
// in the commit range, so they are listed separately and classified against
// the ledger's "PR #N @ <head sha>" entries.
function openPrSection(ctx, slug, tipRef, decisions, limit) {
  const out = ["## Open upstream PRs (unmerged)", ""];
  if (!slug) {
    out.push("Upstream is not on GitHub. List its open pull/merge requests with the host's own tool and triage them by hand.", "");
    return out;
  }
  const base = tipRef.replace(/^refs\/remotes\//, "").replace(`${ctx.remote}/`, "");
  const args = ["pr", "list", "-R", slug, "--state", "open", "--base", base, "--limit", String(limit),
    "--json", "number,title,author,isDraft,headRefOid,updatedAt"];
  let prs;
  try {
    prs = JSON.parse(execFileSync("gh", args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }));
  } catch (e) {
    const why = String(e?.stderr || e?.message || "").trim().split("\n")[0];
    out.push(`Could not list open PRs (${why}). Run it yourself:`, "", "```bash", `gh ${args.join(" ")}`, "```", "");
    return out;
  }

  const fresh = [], moved = [], decided = [];
  for (const pr of prs) {
    const seen = decisions.get(pr.number);
    if (!seen) fresh.push(pr);
    else if (pr.headRefOid.toLowerCase().startsWith(seen)) decided.push(pr);
    else moved.push(pr);
  }
  const row = (pr) =>
    `- #${pr.number} \`${pr.headRefOid.slice(0, 10)}\` (${pr.updatedAt.slice(0, 10)}, @${pr.author?.login ?? "?"}${pr.isDraft ? ", draft" : ""}) ${pr.title}`;

  out.push(`- Open PRs against \`${base}\`: **${prs.length}**${prs.length >= limit ? ` (hit --pr-limit ${limit}; raise it to see the rest)` : ""}`);
  out.push(`- New: **${fresh.length}**, head moved since its ledger decision: **${moved.length}**, unchanged since decided: **${decided.length}**`);
  out.push("");
  if (fresh.length) out.push("### New (triage)", "", ...fresh.map(row), "");
  if (moved.length) out.push("### Head moved since the ledger decision (re-triage)", "", ...moved.map(row), "");
  if (decided.length) out.push("### Unchanged since decided (no action)", "", ...decided.map(row), "");
  out.push("Fetch a PR before sizing it:", "", "```bash", prFetchCommand(ctx.remote, "<n>"), `node "${INTERSECTION}" --pr <n>`, "```", "");
  return out;
}
