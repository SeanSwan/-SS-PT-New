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
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const fileArgs = args.includes('--file') ? args.slice(args.indexOf('--file') + 1) : [];
const STRICT = args.includes('--strict');
const ROOT = 'frontend/src';

// Vendored/reference material defines its own token universe; including it would produce
// phantom "token exists" answers for tokens live code cannot actually see.
const VENDORED = /(^|[\\/])(dashboard-export|reference-pack|production-context|vendor|node_modules)[\\/]/;

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (VENDORED.test(p)) continue;
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(css|tsx?|jsx?)$/.test(p)) out.push(p.replace(/\\/g, '/'));
  }
  return out;
}

/** DEFINITIONS: `--token-name: value;` — the registry. */
const DEFINE_RE = /(^|[;{\s])(--[\w-]+)\s*:\s*([^;}]+)/g;
/**
 * DEFINITIONS set at RUNTIME from JS: `setProperty('--token', v)`.
 * Self-review H1: without this, every theme token injected imperatively reads as
 * "never defined" — a false positive on code that is behaving correctly.
 */
const RUNTIME_DEFINE_RE = /setProperty\(\s*['"`](--[\w-]+)['"`]/g;
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
  const registry = new Map();
  for (const f of allFiles) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(DEFINE_RE)) {
      const [, , name, value] = m;
      if (!registry.has(name)) registry.set(name, { value: value.trim(), file: f });
    }
    // Imperatively-set tokens are defined too — just not statically valued.
    for (const m of text.matchAll(RUNTIME_DEFINE_RE)) {
      if (!registry.has(m[1])) registry.set(m[1], { value: '(set at runtime)', file: f });
    }
  }

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

  const unknown = [];
  const drifted = [];

  for (const f of targets) {
    const text = readFileSync(f, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      // Existence is checked over EVERY var(--x, including ones nested inside another
      // var()'s fallback — those were previously invisible.
      for (const m of line.matchAll(USE_NAME_RE)) {
        if (!registry.has(m[1])) {
          unknown.push(`${f}:${i + 1} — var(${m[1]}) is never defined; the fallback will render forever`);
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
