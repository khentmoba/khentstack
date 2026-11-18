#!/usr/bin/env node
// intersection.mjs — for an upstream commit or range, show which files it
// touches that the fork has also modified. Used during triage to size risk.
// Project-neutral: fork-modified files = diff from merge-base(fork, upstream)
// to the fork branch. Risky "shared surface" paths are a small, overridable
// default; the config file can add project-specific ones.
import { fileURLToPath } from "node:url";
import { git, tryGit, detectContext, areaOf, prRef, prFetchCommand, CONFIG_FILE } from "./lib.mjs";

const SCAN = fileURLToPath(new URL("./scan-upstream.mjs", import.meta.url));

const argv = process.argv.slice(2);
const VALUE_FLAGS = new Set(["--remote", "--branch", "--upstream-ref", "--pr"]);
const arg = argv.find((a, i) => !a.startsWith("-") && !VALUE_FLAGS.has(argv[i - 1]));
const prArg = argv.find((a) => a.startsWith("--pr="))?.slice(5) ?? (argv.includes("--pr") ? argv[argv.indexOf("--pr") + 1] : undefined);
if ((!arg && !prArg) || argv.includes("-h") || argv.includes("--help")) {
  console.log(`Usage:
  node intersection.mjs <sha>
  node intersection.mjs <base>..<tip>
  node intersection.mjs --pr <n>      (open upstream PR, fetched first)

Shows which files an upstream change touches that your fork also modified.
Overrides: --remote <name>, --branch <name>, --upstream-ref <ref>.
Config: ${CONFIG_FILE}. Read-only.`);
  process.exit(0);
}

const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  if (i !== -1) return argv[i + 1];
  const prefix = `--${name}=`;
  return argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
};

// Generic "shared surface": dependency manifests, lockfiles, build/project
// files and CI config. These collide across nearly every kind of project.
// Override/extend with "highRiskPaths" in upstream-assess.config.json.
const DEFAULT_SHARED_SURFACE = [
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|bun\.lock|Cargo\.lock|go\.(mod|sum)|poetry\.lock|Pipfile\.lock|composer\.lock|Gemfile\.lock|uv\.lock)$/i,
  /(^|\/)(package\.json|Cargo\.toml|pyproject\.toml|go\.mod|pom\.xml|build\.gradle(\.kts)?|CMakeLists\.txt|Makefile|GNUmakefile|meson\.build|BUILD|BUILD\.bazel)$/i,
  /\.(sln|csproj|vcxproj|xcodeproj|xcworkspace|slnx)$/i,
  /(^|\/)\.github\/(workflows|actions)\//i,
  /(^|\/)(Dockerfile|docker-compose\.ya?ml|Procfile)$/i,
];

try {
  const ctx = detectContext({
    remote: opt("remote"),
    branch: opt("branch"),
    upstreamRef: opt("upstream-ref"),
  });

  let upstreamChanged;
  let rangeLabel;
  if (prArg) {
    // Open PR: only what the PR adds on top of its merge-base with upstream.
    if (!/^\d+$/.test(prArg)) throw new Error(`--pr takes a PR number, got "${prArg}"`);
    const ref = prRef(ctx.remote, prArg);
    if (!tryGit("rev-parse", "--verify", ref)) {
      throw new Error(`PR #${prArg} is not fetched. Run: ${prFetchCommand(ctx.remote, prArg)}`);
    }
    rangeLabel = `${ctx.upstreamRef}...${ref}`;
  } else if (arg.includes("..") || arg.startsWith("^")) {
    rangeLabel = arg;
  } else {
    rangeLabel = `${arg}^..${arg}`;
  }
  upstreamChanged = git("diff", "--name-only", "--no-renames", rangeLabel)
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);

  const baseline = git("merge-base", ctx.branch, ctx.upstreamRef);
  const forkModified = new Set(
    git("diff", "--name-only", "--no-renames", `${baseline}..${ctx.branch}`)
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean),
  );

  const extra = (ctx.cfg.highRiskPaths || []).filter(Boolean);
  const isSharedSurface = (p) =>
    DEFAULT_SHARED_SURFACE.some((re) => re.test(p)) ||
    extra.some((x) => p === x || p.startsWith(x) || p.includes(x));

  const intersected = upstreamChanged.filter((f) => forkModified.has(f));
  const shared = intersected.filter(isSharedSurface);
  const clean = upstreamChanged.filter((f) => !forkModified.has(f));

  const out = [];
  out.push(`# Intersection: \`${rangeLabel}\``);
  out.push("");
  out.push(`- Fork branch: \`${ctx.branch}\`, baseline: \`${baseline.slice(0, 10)}\``);
  out.push(`- Upstream files touched: **${upstreamChanged.length}**`);
  out.push(`- Also modified by the fork: **${intersected.length}**`);
  out.push(`- On shared/dependency surface: **${shared.length}**`);
  out.push(`- Upstream-only (no fork conflict expected): **${clean.length}**`);
  out.push("");

  if (shared.length) {
    out.push("## Shared-surface overlap (check carefully)");
    out.push("");
    for (const f of shared) out.push(`- \`${f}\``);
    out.push("");
  }
  const otherOverlap = intersected.filter((f) => !shared.includes(f));
  if (otherOverlap.length) {
    out.push("## Other fork-modified overlap (hand-merge of intent likely needed)");
    out.push("");
    for (const f of otherOverlap) out.push(`- \`${f}\``);
    out.push("");
  }
  if (clean.length) {
    out.push("## Upstream-only files (grouped by area)");
    out.push("");
    const byArea = new Map();
    for (const f of clean) {
      const a = areaOf(f);
      if (!byArea.has(a)) byArea.set(a, []);
      byArea.get(a).push(f);
    }
    for (const [a, fs] of [...byArea.entries()].sort()) {
      out.push(`### ${a} (${fs.length})`);
      for (const f of fs) out.push(`- \`${f}\``);
      out.push("");
    }
  }
  if (!intersected.length) {
    out.push("## Verdict");
    out.push("");
    out.push("No overlap with fork-modified files. This change is likely a clean port.");
    out.push("");
  }

  out.push("---");
  out.push("");
  out.push(`Re-scan with: \`node "${SCAN}"\``);
  out.push("");

  process.stdout.write(out.join("\n"));
} catch (e) {
  console.error(`[intersection] ${e.message}`);
  process.exit(1);
}
