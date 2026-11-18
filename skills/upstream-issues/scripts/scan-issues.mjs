#!/usr/bin/env node
// scan-issues.mjs — list upstream GitHub issues and gather evidence on whether
// each one also affects the fork. Read-only: runs git and gh, prints markdown.
// Evidence, not verdicts: the agent classifies each issue.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { git, tryGit, detectContext, repoSlug, CONFIG_FILE } from "./lib.mjs";

const argv = process.argv.slice(2);
const VALUE_FLAGS = ["--since", "--state", "--limit", "--label", "--repo", "--remote", "--branch", "--upstream-ref"];
const opts = { label: [] };
let help = false;
const fail = (msg) => { console.error(`[scan-issues] ${msg}`); process.exit(1); };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "-h" || a === "--help") { help = true; continue; }
  const eq = a.indexOf("=");
  const flag = eq > -1 ? a.slice(0, eq) : a;
  if (!VALUE_FLAGS.includes(flag)) fail(`Unknown argument: ${a}`);
  const value = eq > -1 ? a.slice(eq + 1) : argv[++i];
  if (!value || value.startsWith("--")) fail(`Missing value for ${flag}`);
  const key = flag.slice(2);
  if (key === "label") opts.label.push(value);
  else opts[key] = value;
}

if (help) {
  console.log(`Usage:
  node scan-issues.mjs [options]

Options:
  --since <YYYY-MM-DD>  Only issues updated on/after this date. Default:
                        "lastIssueScan" in ${CONFIG_FILE}, else the ledger's
                        "Upstream issues scanned:" line, else no date filter.
  --state <s>           open | closed | all (default: all)
  --limit <n>           Max issues to fetch (default: 100)
  --label <name>        Only issues with this label (repeatable; also "issueLabels" in config)
  --repo <owner/name>   Upstream GitHub repo (default: parsed from the upstream remote URL)
  --remote, --branch, --upstream-ref   Same overrides as upstream-assess.

Requires git and an authenticated GitHub CLI (gh). Prints markdown to stdout.`);
  process.exit(0);
}

function gh(...args) {
  try {
    return execFileSync("gh", args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    if (e.code === "ENOENT") throw new Error("GitHub CLI (gh) not found. Install it or use the manual path in SKILL.md.");
    throw new Error(`gh ${args.slice(0, 2).join(" ")} failed: ${String(e.stderr || e.message).trim()}`);
  }
}

function resolveSince(cfg) {
  if (opts.since) return opts.since;
  if (cfg.lastIssueScan) return cfg.lastIssueScan;
  for (const f of [cfg.ledgerFile, "FORK.md", "UPSTREAM.md"].filter(Boolean)) {
    if (!existsSync(f)) continue;
    const m = readFileSync(f, "utf8").match(/upstream\s+issues\s+scanned:\s*(\d{4}-\d{2}-\d{2})/i);
    if (m) return m[1];
  }
  return null;
}

const lines = (s) => (s || "").split("\n").map((x) => x.trim()).filter(Boolean);

// Path-like tokens in issue text: "src/a/b.cpp", "C:\x\y.cs", stack-trace frames,
// or bare "name.ext". Only tokens that resolve to a real file in either tree are kept.
function referencedFiles(text, index) {
  const norm = text.replace(/\\/g, "/");
  const tokens = new Set();
  for (const m of norm.matchAll(/(?:[\w.@-]+\/)+[\w.@-]+\.[A-Za-z0-9]{1,8}\b/g)) tokens.add(m[0]);
  for (const m of norm.matchAll(/\b[\w-]+\.[A-Za-z][A-Za-z0-9]{0,7}\b/g)) tokens.add(m[0]);
  const hits = new Set();
  for (let t of tokens) {
    t = t.replace(/^(\.\/|a\/|b\/)/, "");
    const base = t.split("/").pop();
    const candidates = index.get(base.toLowerCase());
    if (!candidates) continue;
    const suffix = t.toLowerCase();
    const matched = candidates.filter((p) => p.toLowerCase() === suffix || p.toLowerCase().endsWith("/" + suffix));
    // A path token may resolve to a few files; a bare basename must be unique,
    // otherwise "index.js" would match every index.js in the tree.
    const max = t.includes("/") ? 3 : 1;
    if (matched.length && matched.length <= max) matched.forEach((p) => hits.add(p));
  }
  return [...hits].slice(0, 10);
}

try {
  const ctx = detectContext({ remote: opts.remote, branch: opts.branch, upstreamRef: opts["upstream-ref"] });
  const slug = opts.repo || ctx.cfg.upstreamRepo || repoSlug(tryGit("remote", "get-url", ctx.remote));
  if (!slug) throw new Error(`Upstream is not a recognisable GitHub remote. Pass --repo owner/name or set "upstreamRepo" in ${CONFIG_FILE}.`);

  const since = resolveSince(ctx.cfg);
  const state = opts.state || "all";
  const limit = String(opts.limit || ctx.cfg.issueLimit || 100);
  const labels = [...opts.label, ...(ctx.cfg.issueLabels || [])];

  const ghArgs = ["issue", "list", "-R", slug, "--state", state, "--limit", limit,
    "--json", "number,title,state,stateReason,labels,url,updatedAt,body,closedByPullRequestsReferences"];
  if (since) ghArgs.push("--search", `updated:>=${since}`);
  for (const l of labels) ghArgs.push("--label", l);
  const issues = JSON.parse(gh(...ghArgs) || "[]");

  const mergeBase = git("merge-base", ctx.branch, ctx.upstreamRef);
  const forkFiles = new Set(lines(git("ls-tree", "-r", "--name-only", ctx.branch)));
  const upstreamFiles = new Set(lines(git("ls-tree", "-r", "--name-only", ctx.upstreamRef)));
  const forkModified = new Set(lines(git("diff", "--name-only", "--no-renames", `${mergeBase}..${ctx.branch}`)));

  const index = new Map();
  for (const p of new Set([...forkFiles, ...upstreamFiles])) {
    const k = p.split("/").pop().toLowerCase();
    if (!index.has(k)) index.set(k, []);
    index.get(k).push(p);
  }

  // Upstream commits the fork lacks, keyed by every #number they mention
  // (issue numbers, and PR numbers from squash/merge subjects).
  const SEP = "\x02";
  const refs = new Map();
  for (const rec of git("log", `--format=%H%x01%s%x01%b${SEP}`, `${mergeBase}..${ctx.upstreamRef}`).split(SEP)) {
    const [sha, subject = "", body = ""] = rec.trim().split("\x01");
    if (!sha) continue;
    for (const m of `${subject}\n${body}`.matchAll(/(?:#|\/(?:issues|pull)\/)(\d+)\b/g)) {
      const n = Number(m[1]);
      if (!refs.has(n)) refs.set(n, []);
      if (!refs.get(n).some((c) => c.sha === sha)) refs.get(n).push({ sha, subject });
    }
  }

  // Upstream SHAs the fork already ported, from "Upstream: <sha>, <sha>" commit trailers.
  const ported = [];
  for (const m of git("log", "--format=%b", `${mergeBase}..${ctx.branch}`).matchAll(/Upstream:\s*([0-9a-f,\s]+)/gi)) {
    for (const s of m[1].split(/[,\s]+/)) if (s.length >= 7) ported.push(s.toLowerCase());
  }
  const isPorted = (sha) => ported.some((p) => sha.startsWith(p));

  const rows = issues.map((iss) => {
    const prNums = (iss.closedByPullRequestsReferences || [])
      .filter((p) => !p.repository || `${p.repository.owner?.login}/${p.repository.name}`.toLowerCase() === slug.toLowerCase())
      .map((p) => p.number)
      .filter(Boolean);
    const fixes = [...(refs.get(iss.number) || []), ...prNums.flatMap((n) => refs.get(n) || [])]
      .filter((c, i, all) => all.findIndex((x) => x.sha === c.sha) === i);
    const files = referencedFiles(`${iss.title}\n${iss.body || ""}`, index);
    const fileInfo = files.map((p) => ({
      path: p,
      where: !forkFiles.has(p) ? "absent in fork" : forkModified.has(p) ? "fork-modified" : "shared, unchanged by fork",
    }));
    const unported = fixes.filter((c) => !isPorted(c.sha));

    let signal;
    if (unported.length) signal = "Upstream fix not in fork";
    else if (fixes.length) signal = "Upstream fix already ported";
    else if (fileInfo.some((f) => f.where === "shared, unchanged by fork")) signal = "Touches shared code";
    else if (fileInfo.some((f) => f.where === "fork-modified")) signal = "Touches fork-modified code";
    else if (fileInfo.length) signal = "Referenced code absent in fork";
    else signal = "No code references";
    return { iss, prNums, fixes, unported, fileInfo, signal };
  });

  const ORDER = ["Upstream fix not in fork", "Touches shared code", "Touches fork-modified code",
    "No code references", "Referenced code absent in fork", "Upstream fix already ported"];

  const out = [];
  out.push("# Upstream issue scan", "");
  out.push(`- Upstream repo: \`${slug}\` (ref \`${ctx.upstreamRef}\`)`);
  out.push(`- Fork branch: \`${ctx.branch}\`, merge-base \`${mergeBase.slice(0, 10)}\``);
  out.push(`- Filter: state=${state}${since ? `, updated since ${since}` : ", no date filter"}${labels.length ? `, labels=${labels.join(",")}` : ""}, limit ${limit}`);
  out.push(`- Issues: **${issues.length}**${issues.length >= Number(limit) ? " (hit the limit; raise --limit or narrow --since)" : ""}`);
  out.push(`- Scan date (UTC, for the ledger): ${new Date().toISOString().slice(0, 10)}`, "");
  out.push("Signals are evidence from file references and linked commits, not verdicts.", "");

  for (const sig of ORDER) {
    const group = rows.filter((r) => r.signal === sig);
    if (!group.length) continue;
    out.push(`## ${sig} (${group.length})`, "");
    for (const r of group) {
      const lab = r.iss.labels?.length ? ` [${r.iss.labels.map((l) => l.name).join(", ")}]` : "";
      const st = r.iss.state === "CLOSED" ? `closed${r.iss.stateReason ? `: ${r.iss.stateReason.toLowerCase()}` : ""}` : "open";
      out.push(`### #${r.iss.number} ${r.iss.title}`);
      out.push(`- ${st}${lab}, updated ${r.iss.updatedAt.slice(0, 10)} — ${r.iss.url}`);
      if (r.prNums.length) {
        const unmatched = r.prNums.filter((n) => !refs.has(n));
        out.push(`- Closed by PR: ${r.prNums.map((n) => `#${n}`).join(", ")}${unmatched.length ? ` (no commit after the fork point mentions ${unmatched.map((n) => `#${n}`).join(", ")}; it may already be in the fork)` : ""}`);
      }
      for (const c of r.fixes) out.push(`- Fix commit \`${c.sha.slice(0, 10)}\`${isPorted(c.sha) ? " (ported)" : ""}: ${c.subject}`);
      for (const f of r.fileInfo) out.push(`- \`${f.path}\` — ${f.where}`);
      out.push("");
    }
  }
  if (!issues.length) out.push("_No issues matched the filter._", "");

  process.stdout.write(out.join("\n"));
} catch (e) {
  console.error(`[scan-issues] ${e.message}`);
  process.exit(1);
}
