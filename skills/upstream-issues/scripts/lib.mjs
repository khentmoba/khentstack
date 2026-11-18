// lib.mjs — shared helpers for the upstream-assess skill.
// Project-neutral: everything is discovered from git or an optional
// upstream-assess.config.json in the repo root. No language/framework assumptions.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

export const CONFIG_FILE = "upstream-assess.config.json";

export function git(...args) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (e) {
    const stderr = String(e?.stderr || e?.message || "").trim();
    throw new Error(`git ${args.join(" ")} failed${stderr ? ": " + stderr : ""}`);
  }
}

export function tryGit(...args) {
  try {
    return git(...args);
  } catch {
    return null;
  }
}

export function loadConfig() {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
  } catch (e) {
    throw new Error(`Invalid ${CONFIG_FILE}: ${e.message}`);
  }
}

// Resolve remote, main branch and upstream ref with sensible auto-detection.
export function detectContext(overrides = {}) {
  const cfg = loadConfig();
  const remotes = git("remote").split("\n").map((r) => r.trim()).filter(Boolean);

  let remote = overrides.remote || cfg.upstreamRemote;
  if (!remote) {
    if (remotes.includes("upstream")) remote = "upstream";
    else {
      const others = remotes.filter((r) => r !== "origin");
      if (others.length === 1) remote = others[0];
      else if (others.length > 1) {
        throw new Error(`Multiple candidate remotes: ${others.join(", ")}. Set "upstreamRemote" in ${CONFIG_FILE}.`);
      } else {
        throw new Error("No upstream remote found. Ask the human, then: git remote add upstream <url>");
      }
    }
  }
  if (!remotes.includes(remote)) {
    throw new Error(`Remote "${remote}" not found. Available: ${remotes.join(", ") || "(none)"}.`);
  }

  let branch = overrides.branch || cfg.mainBranch;
  if (!branch) {
    branch = (tryGit("symbolic-ref", "--short", "refs/remotes/origin/HEAD") || "").replace(/^origin\//, "") || null;
    if (!branch) {
      for (const c of ["main", "master", "develop", "trunk"]) {
        if (tryGit("rev-parse", "--verify", c)) {
          branch = c;
          break;
        }
      }
    }
  }
  if (!branch) throw new Error(`Cannot determine main branch. Set "mainBranch" in ${CONFIG_FILE}.`);

  let upstreamRef = overrides.upstreamRef || cfg.upstreamRef;
  if (!upstreamRef) {
    const local = tryGit("symbolic-ref", "--short", `refs/remotes/${remote}/HEAD`);
    if (local) upstreamRef = local;
    if (!upstreamRef) {
      const sym = tryGit("ls-remote", "--symref", remote, "HEAD") || "";
      const m = sym.match(/^ref:\s+refs\/heads\/([^\s]+)/m);
      if (m) upstreamRef = `${remote}/${m[1]}`;
    }
    if (!upstreamRef) {
      for (const c of ["main", "master", "develop", "trunk"]) {
        if (tryGit("rev-parse", "--verify", `${remote}/${c}`)) {
          upstreamRef = `${remote}/${c}`;
          break;
        }
      }
    }
  }
  if (!upstreamRef) throw new Error(`Cannot determine upstream ref. Run: git fetch ${remote} --tags`);
  if (!tryGit("rev-parse", "--verify", upstreamRef)) {
    throw new Error(`Ref "${upstreamRef}" does not resolve. Run: git fetch ${remote} --tags`);
  }

  return { cfg, remotes, remote, branch, upstreamRef };
}

// Baseline = last scanned upstream tip. Priority: CLI flag > config > ledger
// file (several common names/labels) > merge-base of fork and upstream.
export function resolveBaseline(ctx, cliBase) {
  if (cliBase) return git("rev-parse", cliBase);
  if (ctx.cfg.lastUpstreamSha) return git("rev-parse", ctx.cfg.lastUpstreamSha);

  const candidates = [ctx.cfg.ledgerFile, "FORK.md", "UPSTREAM.md", "CLAUDE.md", "AGENTS.md"].filter(Boolean);
  const re = /(?:upstream\s+tip\s+sha|last\s+upstream\s+scan|baseline\s+sync\s+point|upstream\s+sha|lastUpstreamSha)[^\n]{0,60}?\b([0-9a-f]{7,40})\b/i;
  for (const f of candidates) {
    if (!existsSync(f)) continue;
    const m = readFileSync(f, "utf8").match(re);
    const sha = m && tryGit("rev-parse", "--verify", `${m[1]}^{commit}`);
    if (sha) return sha;
  }

  const mb = tryGit("merge-base", ctx.branch, ctx.upstreamRef);
  if (!mb) throw new Error(`Cannot determine a baseline. Set "lastUpstreamSha" in ${CONFIG_FILE} or pass --base <sha>.`);
  console.error(`[upstream-assess] No baseline found; using merge-base(${ctx.branch}, ${ctx.upstreamRef}) = ${mb}`);
  return mb;
}

// Generic bucketing by top-level path (works for any repo layout).
export function areaOf(path) {
  const parts = path.split("/");
  if (["apps", "packages", "src", "lib", "crates"].includes(parts[0]) && parts.length > 1) {
    return `${parts[0]}/${parts[1]}`;
  }
  if (parts[0] === ".github") return ".github";
  return parts[0] || "(root)";
}

// Conventional-commit type, or "other". Purely cosmetic grouping.
export function typeOf(subject) {
  const m = subject.match(/^([A-Za-z]+)(\([^)]*\))?!?:\s/);
  return m ? m[1].toLowerCase() : "other";
}

// A bracketed subject prefix like "[foo]" marks a possible coupled effort.
// Extra regexes from config "clusterPatterns" also count; the first capture
// group (or the whole match) names the cluster.
export function clusterTag(subject, patterns = []) {
  const m = subject.match(/^\[([^\]]+)\]/);
  if (m) return m[1];
  for (const p of patterns) {
    let re;
    try {
      re = new RegExp(p, "i");
    } catch {
      throw new Error(`Invalid regex in clusterPatterns: ${p}`);
    }
    const hit = subject.match(re);
    if (hit) return hit[1] || hit[0];
  }
  return null;
}

// Best-effort GitHub owner/repo for optional PR enrichment.
export function repoSlug(remoteUrl) {
  if (!remoteUrl) return null;
  const m = remoteUrl.match(/github\.com[:/]([^/]+\/[^/.]+?)(?:\.git)?\s*$/);
  return m ? m[1] : null;
}
