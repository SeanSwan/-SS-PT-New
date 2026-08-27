#!/usr/bin/env node
/**
 * token-registry-check.mjs — the retrieval-fed filter class, minus the retrieval infra.
 *
 * WHY: the coder-brain consult (GLM, 2026-08-18) identified a category our doctrine had no
 * home for — rules checkable only against LIVE REPO STATE. `var(--token, #fallback)` is the
 * canonical example: G4 already proves the *shape* is right, but nothing checks that
 *   (a) the token actually EXISTS, or
 *   (b) the hardcoded fallback still MATCHES what the token is defined as.
 * Both fail silently. A typo'd token name renders the fallback forever — the page looks
 * almost right, so nobody files a bug. A drifted fallback means the fallback path renders a
 * stale brand color, which is the same class of harm as using a retired token outright.
 *
 * WHY NOT THE FULL INDEX: GLM's Slice 3 wants tree-sitter + Postgres tables. tree-sitter is
 * an uninstalled native dependency and the tables would be a production schema change —
 * both are Sean's calls. This delivers the token half, which needs neither: it parses CSS
 * with a regex over files already on disk, and holds the registry in memory.
 *
 * READ-ONLY. Exit 0 = clean, 1 = findings, 2 = could not run.
 *
 * Usage:
 *   node scripts/hooks/token-registry-check.mjs                 # whole frontend
 *   node scripts/hooks/token-registry-check.mjs --file <p>...    # specific files
 *   node scripts/hooks/token-registry-check.mjs --strict         # also fail on fallback drift
 *   node scripts/hooks/token-registry-check.mjs --added-only --file <p>...
 *                                                              # gate ONLY on undefined tokens
 *                                                              # introduced by staged ADDED lines
 *
 * --added-only exists because --strict is unusable as a commit gate today: the standing
 * backlog is 831 undefined tokens across 1,735 use sites plus 610 drift findings, and a
 * measured 32% of frontend files would block on debt their author never wrote. A gate that
 * fails on inherited debt gets switched off (Rule 34). --added-only fails ONLY on undefined
 * tokens on lines the commit is ADDING, so the backlog is reported and never blocks, while a
 * newly typo'd token name cannot enter the tree. Fallback DRIFT is never gated by this flag:
 * it is a lower-severity class and pairs a new line against a pre-existing token value.
 * Reads added-line ranges from `git diff --cached -U0`, so it describes the INDEX. The caller
 * must ensure the working tree matches the index for the files it passes, or the line numbers
 * refer to a different tree than the one being committed.
 */
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const args = process.argv.slice(2);
const fileArgs = args.includes('--file') ? args.slice(args.indexOf('--file') + 1) : [];
const STRICT = args.includes('--strict');
const ADDED_ONLY = args.includes('--added-only');
const ROOT = 'frontend/src';

// Vendored/reference material defines its own token universe; including it would produce
// phantom "token exists" answers for tokens live code cannot actually see.
const VENDORED = /(^|[\\/])(dashboard-export|reference-pack|production-context|vendor|node_modules)[\\/]/;

/** Collected during the walk, which already stats every entry — so the fingerprint is free. */
const stamps = [];

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (VENDORED.test(p)) continue;
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(css|tsx?|jsx?)$/.test(p)) {
      const rel = p.replace(/\\/g, '/');
      out.push(rel);
      stamps.push(`${rel}:${s.mtimeMs}:${s.size}`);
    }
  }
  return out;
}

/**
 * REGISTRY CACHE — the gate cost ~3s per frontend commit without it.
 *
 * Measured 2026-08-22 on this tree: walk 165ms, regex work 47ms, and ~2,500ms reading
 * 26.9MB across 5,245 files. The reads dominate, and they are inherent — a token defined
 * in a file you did not stage is still defined, so the registry cannot be scoped to the
 * staged set. Meanwhile the sibling gate (frontend-guards) costs 172ms. A 17x tax on every
 * frontend commit is what trains someone to reach for --no-verify, and a routinely bypassed
 * gate protects nothing — the same Rule 34 argument that made this gate --added-only rather
 * than --strict, aimed at the gate itself.
 *
 * The cache CANNOT cause a false block. If a cached registry is about to fail a commit, the
 * registry is rebuilt from disk and the finding re-checked before anything is reported (see
 * `verifyAgainstFreshRegistry`). So a stale cache can only ever cost one rebuild, never a
 * wrongly rejected commit. It lives in the OS temp dir rather than the repo: node_modules is
 * not guaranteed to exist (fresh worktrees have none) and the repo must stay clean.
 */
const CACHE_VERSION = 2;

/**
 * KIMI K3, panel 2026-08-23 — CONFIRMED false PASS, reproduced.
 *
 * The cache was proven unable to cause a false BLOCK. Nobody checked false PASSES, and that
 * is the silent direction. A (path, mtime, size) fingerprint does not notice an edit that
 * preserves both — `touch -d` does it deliberately, and some build tools and checkout
 * sequences do it accidentally. Remove a token definition that way and the cached registry
 * still contains the dead token, so a commit ADDING a use of it passes.
 *
 * The rebuild-on-findings guard cannot save this: it only fires when there ARE findings, and
 * a registry that over-approves produces none. It fails open, silently, forever.
 *
 * Reproduced: definition removed at identical size with mtime restored -> gate exited 0 where
 * it must exit 1, reporting "1 tokens defined" for a token that no longer existed.
 *
 * Fix: bound how long a cache may be trusted. A stale window measured in minutes turns a
 * permanent silent failure into a brief one, keeps the 3s -> 270ms win for the common case,
 * and costs one extra full rebuild per window. Content-hashing every file instead would cost
 * the ~2.5s read this cache exists to avoid.
 */
const CACHE_MAX_AGE_MS = 10 * 60 * 1000;
function cachePath() {
  let key = 0;
  const root = process.cwd();
  for (let i = 0; i < root.length; i += 1) key = (key * 31 + root.charCodeAt(i)) >>> 0;
  return join(tmpdir(), `swan-token-registry-${CACHE_VERSION}-${key.toString(36)}.json`);
}

/** DEFINITIONS: `--token-name: value;` — the registry. */
const DEFINE_RE = /(^|[;{\s])(--[\w-]+)\s*:\s*([^;}]+)/g;
/**
 * DEFINITIONS set at RUNTIME from JS: `setProperty('--token', v)`.
 * Self-review H1: without this, every theme token injected imperatively reads as
 * "never defined" — a false positive on code that is behaving correctly.
 */
const RUNTIME_DEFINE_RE = /setProperty\(\s*['"`](--[\w-]+)['"`]/g;

/** A token name bound to a variable is still set at runtime — `const SLIDER_POSITION_VAR =
 *  '--swan-slider-pos'` followed by `setProperty(SLIDER_POSITION_VAR, v)`. The literal-only
 *  pattern above cannot see through that indirection, so the token read as UNDEFINED.
 *
 *  Found by replaying real merged history against the gate instead of trusting fixtures:
 *  commit f73663109 — already on main — would have been BLOCKED for exactly this. Deliberately
 *  broad. A false negative costs one unflagged token; a false positive blocks a legitimate
 *  commit, and Rule 34 says that is what gets a gate switched off. */
const INDIRECT_DEFINE_RE = /=\s*['"`](--[\w-]+)['"`]/g;
/**
 * USES, fallback-bearing: `var(--token, fallback)`.
 * NOTE the fallback capture stops at the first `)`, so a nested `var(--a, var(--b, #fff))`
 * yields a truncated fallback. That is tolerated — the drift comparison only fires when
 * BOTH sides are literal hex, so a truncated non-hex fallback is simply skipped.
 */
const USE_RE = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g;
/**
 * USES, existence only: every `var(--token` occurrence regardless of nesting.
 * Self-review H1 found the false negative this fixes: in `var(--a, var(--b, #fff))` the
 * regex above matches only `--a`, so `--b` was NEVER checked for existence at all — the
 * exact shape a token-fallback chain uses, and therefore the shape most worth checking.
 */
const USE_NAME_RE = /var\(\s*(--[\w-]+)/g;

function normalizeColor(v) {
  const t = String(v || '').trim().toLowerCase();
  const m = t.match(/^#([0-9a-f]{3,8})$/);
  if (!m) return t;
  const h = m[1];
  // #abc -> #aabbcc so a shorthand fallback is not reported as drift against its longhand.
  if (h.length === 3) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  return `#${h}`;
}

function main() {
  if (!existsSync(ROOT)) {
    console.error(`token-registry-check: ${ROOT} not found — run from the repo root.`);
    process.exit(2);
  }

  const allFiles = walk(ROOT);

  // Build the registry from EVERY non-vendored file, always — a token defined in a file you
  // did not stage is still a defined token. Scoping the registry to --file would invent
  // UNKNOWN_TOKEN findings for tokens that plainly exist.
  function buildRegistry(files) {
    const reg = new Map();
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      for (const m of text.matchAll(DEFINE_RE)) {
        const [, , name, value] = m;
        if (!reg.has(name)) reg.set(name, { value: value.trim(), file: f });
      }
      // Imperatively-set tokens are defined too — just not statically valued.
      for (const m of text.matchAll(RUNTIME_DEFINE_RE)) {
        if (!reg.has(m[1])) reg.set(m[1], { value: '(set at runtime)', file: f });
      }
      // ...including through one level of indirection.
      for (const m of text.matchAll(INDIRECT_DEFINE_RE)) {
        if (!reg.has(m[1])) reg.set(m[1], { value: '(bound to a variable, set at runtime)', file: f });
      }
    }
    return reg;
  }

  const fingerprint = stamps.join('\n');
  const CACHE = cachePath();
  let registry = null;
  let fromCache = false;
  try {
    const cached = JSON.parse(readFileSync(CACHE, 'utf8'));
    const fresh = typeof cached?.builtAt === 'number' && (Date.now() - cached.builtAt) < CACHE_MAX_AGE_MS;
    if (fresh && cached?.fingerprint === fingerprint && Array.isArray(cached.entries)) {
      registry = new Map(cached.entries);
      fromCache = true;
    }
  } catch {
    /* no cache, unreadable, or a different tree — fall through and build */
  }
  if (!registry) {
    registry = buildRegistry(allFiles);
    try {
      writeFileSync(CACHE, JSON.stringify({ fingerprint, builtAt: Date.now(), entries: [...registry] }));
    } catch {
      /* an unwritable temp dir costs speed, never correctness */
    }
  }

  /** A cached registry may never fail a commit on its own. Rebuild and re-check first. */
  const verifyAgainstFreshRegistry = (names) => {
    if (!fromCache || !names.length) return names;
    const fresh = buildRegistry(allFiles);
    try {
      writeFileSync(CACHE, JSON.stringify({ fingerprint, builtAt: Date.now(), entries: [...fresh] }));
    } catch { /* speed only */ }
    return names.filter((n) => !fresh.has(n));
  };

  const targets = fileArgs.length
    ? fileArgs.filter((f) => existsSync(f)).map((f) => f.replace(/\\/g, '/'))
    : allFiles;

  // GLM H3-F1: --file paths that do not exist were silently dropped, so a typo'd path
  // scanned zero files and printed "CLEAN - every var() resolves" with exit 0. That is the
  // SAME defect fixed in schema-drift-check's --model handling, alive in its sibling because
  // I fixed one instance and never grepped for the class. Refuse to report on empty work.
  if (fileArgs.length && targets.length === 0) {
    console.error('token-registry-check: none of the --file paths exist — nothing was scanned. '
      + 'Refusing to report CLEAN on an empty run.');
    process.exit(2);
  }

  // Map of file -> Set(line numbers added by the staged diff). Only built for --added-only.
  // `-U0` makes each hunk header name exactly the added range: "@@ -a,b +c,d @@" means d lines
  // starting at c are new. d is omitted when it is 1.
  const addedLines = new Map();

  // --- merge baseline (X3) --------------------------------------------------
  // `git diff --cached` is against HEAD, and during a MERGE that inverts the meaning of
  // "a line this commit ADDS": HEAD is the PRE-merge tip, so every line the merge carries
  // in from origin/main counts as newly added by this commit. It is not. Those lines are
  // already on the default branch and already deployed, and blocking on them means
  // origin/main can never be merged into a branch while main carries inherited token debt
  // — the exact inherited-debt case that made this gate --added-only rather than --strict
  // in the first place (Rule 34).
  //
  // So during a merge the diff baseline becomes origin/main: lines this merge genuinely
  // authors relative to current law. Strictly the right question and strictly narrower —
  // a file the merge actually MODIFIED still diffs against main and its new lines are
  // still judged; only verbatim carries fall away.
  //
  // FAILS CLOSED: no MERGE_HEAD, or origin/main unresolvable, and the baseline stays HEAD.
  // Third guard found with this same blind spot on 2026-08-27 (after frontend-guards X1 and
  // constitution-guard X2), which is what makes it a pattern rather than three bugs: a guard
  // that cannot tell a line it AUTHORED from a line that ARRIVED.
  const gitQuiet = (a) => {
    try {
      return execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, MSYS_NO_PATHCONV: '1' } }).trim();
    } catch { return null; }
  };
  const DIFF_BASE = gitQuiet(['rev-parse', '-q', '--verify', 'MERGE_HEAD']) !== null
    && gitQuiet(['rev-parse', '-q', '--verify', 'origin/main']) !== null
    ? ['origin/main'] : [];
  if (DIFF_BASE.length) {
    console.error('[token-registry] merge in progress — added lines measured against origin/main, not the pre-merge tip');
  }

  if (ADDED_ONLY) {
    for (const f of targets) {
      const set = new Set();
      let diff = '';
      try {
        diff = execFileSync('git', ['diff', '--cached', ...DIFF_BASE, '-U0', '--', f], { encoding: 'utf8' });
      } catch {
        // A file with no staged diff is not an error - it simply contributes no added lines.
        diff = '';
      }
      for (const m of diff.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
        const start = Number(m[1]);
        const count = m[2] === undefined ? 1 : Number(m[2]);
        for (let i = 0; i < count; i += 1) set.add(start + i);
      }
      addedLines.set(f, set);
    }
  }
  const isAdded = (file, line) => addedLines.get(file)?.has(line) ?? false;

  const unknown = [];
  const unknownAdded = [];
  const drifted = [];

  for (const f of targets) {
    const text = readFileSync(f, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      // Existence is checked over EVERY var(--x, including ones nested inside another
      // var()'s fallback — those were previously invisible.
      for (const m of line.matchAll(USE_NAME_RE)) {
        if (!registry.has(m[1])) {
          const finding =`${f}:${i + 1} — var(${m[1]}) is never defined; the fallback will render forever`;
          unknown.push(finding);
          if (ADDED_ONLY && isAdded(f, i + 1)) unknownAdded.push(finding);
        }
      }
      for (const m of line.matchAll(USE_RE)) {
        const [, name, fallbackRaw] = m;
        const def = registry.get(name);
        if (!def || !fallbackRaw) continue;
        const fb = normalizeColor(fallbackRaw);
        const declared = normalizeColor(def.value);
        // Only compare when BOTH sides are literal colors. A token whose value is itself a
        // var() or a calc() is not comparable, and guessing would manufacture findings.
        if (/^#[0-9a-f]{6,8}$/.test(fb) && /^#[0-9a-f]{6,8}$/.test(declared) && fb !== declared) {
          drifted.push(
            `${f}:${i + 1} — var(${name}, ${fallbackRaw.trim()}) but ${name} is defined as `
            + `${def.value} in ${def.file}; the fallback path renders a stale color`,
          );
        }
      }
    });
  }

  console.log(`\ntoken-registry-check — ${registry.size} tokens defined, ${targets.length} files scanned\n`);
  if (unknown.length) {
    // Group by token NAME. The first full-repo run produced 1,738 individual lines, which is
    // unreadable and un-actionable; the same data collapses to a short list of distinct
    // missing tokens, each of which is one definition away from being fixed.
    const byToken = new Map();
    for (const u of unknown) {
      const name = u.match(/var\((--[\w-]+)\)/)?.[1] ?? '(unparsed)';
      if (!byToken.has(name)) byToken.set(name, []);
      byToken.get(name).push(u);
    }
    const ranked = [...byToken.entries()].sort((a, b) => b[1].length - a[1].length);
    console.log(`  UNDEFINED TOKENS — ${byToken.size} distinct names across ${unknown.length} use sites.`);
    console.log('  Each renders its fallback forever and can never respond to theming:\n');
    for (const [name, uses] of ranked.slice(0, 20)) {
      console.log(`    ${String(uses.length).padStart(4)}×  ${name}`);
      console.log(`          e.g. ${uses[0].split(' — ')[0]}`);
    }
    if (ranked.length > 20) console.log(`\n    … and ${ranked.length - 20} more distinct tokens`);
  }
  if (drifted.length) {
    console.log(`\n  FALLBACK DRIFT (${drifted.length})${STRICT ? '' : ' — advisory, use --strict to fail'}:`);
    drifted.slice(0, 25).forEach((d) => console.log(`    ${d}`));
    if (drifted.length > 25) console.log(`    … and ${drifted.length - 25} more`);
  }
  if (!unknown.length && !drifted.length) console.log('  CLEAN — every var() resolves and every literal fallback matches.\n');

  // ADVISORY by default. The first full-repo run found 1,738 use sites — this is a standing
  // backlog, not a regression, and a gate that fails on inherited debt gets disabled (Rule 34).
  // --strict makes it a gate, which is the right mode once the backlog is worked down or when
  // scoped to changed files only.
  // --added-only gates on ONE thing: an undefined token on a line this commit ADDS.
  // Everything else - the inherited backlog, and fallback drift in any position - is
  // reported and never blocks. See the --added-only note in the header for why.
  if (ADDED_ONLY) {
    // A cached registry may never fail a commit on its own. If findings survive the cache,
    // rebuild from disk and keep only the ones the fresh registry also cannot resolve. Costs
    // one rebuild in the rare stale case; makes a wrongly rejected commit impossible.
    if (unknownAdded.length && fromCache) {
      const stillMissing = new Set(
        verifyAgainstFreshRegistry([...new Set(
          unknownAdded.map((u) => u.match(/var\((--[\w-]+)\)/)?.[1]).filter(Boolean),
        )]),
      );
      for (let i = unknownAdded.length - 1; i >= 0; i -= 1) {
        const name = unknownAdded[i].match(/var\((--[\w-]+)\)/)?.[1];
        if (name && !stillMissing.has(name)) unknownAdded.splice(i, 1);
      }
    }
    if (unknownAdded.length) {
      console.log(`\n  BLOCKING - ${unknownAdded.length} undefined token use(s) on lines this commit ADDS:\n`);
      unknownAdded.forEach((u) => console.log(`    ${u}`));
      console.log('\n  Each renders its fallback forever and can never respond to theming.');
      console.log('  Fix - pick one:');
      console.log('    - typo in the token name     -> correct it to a token that exists');
      console.log('    - the token is genuinely new -> define it in a CSS custom-property block');
      console.log('    - intentionally raw          -> tag the line swan-guard-allow-hex <reason>\n');
    }
    const inherited = unknown.length - unknownAdded.length;
    if (inherited > 0 || drifted.length) {
      console.log(`  (not blocking: ${inherited} pre-existing undefined use(s) + ${drifted.length} drift finding(s) - inherited backlog, reported only.)\n`);
    }
    process.exit(unknownAdded.length > 0 ? 1 : 0);
  }

  const failing = STRICT ? unknown.length + drifted.length : 0;
  if (!STRICT && (unknown.length || drifted.length)) {
    console.log('\n  (advisory — nothing failed. Re-run with --strict to gate on these.)\n');
  }
  process.exit(failing > 0 ? 1 : 0);
}

try {
  main();
} catch (err) {
  console.error('token-registry-check could not run:', err.message);
  process.exit(2);
}
