#!/usr/bin/env node
/**
 * check-token-discipline — CI guard for the Swan Lens CONSUMER contract (Kimi roadmap #8; CLAUDE.md Rule 6).
 *
 * The design-overhaul surfaces are pure token consumers: raw hex is allowed ONLY inside a `*.tokens.ts` bridge
 * (as `var(--token, #fallback)` fallbacks) and only for the gold allowlist. Anywhere else in a surface, a raw
 * hex literal means a component is emitting a color instead of reading one — the exact drift this program bans.
 * This catches it mechanically before it spreads across worlds.
 *
 * Rule enforced per scanned surface dir:
 *   - `*.tokens.ts` / `*.theme.ts`   → the bridge files. Skipped (they define the tokens).
 *   - `*.test.*` / `*.stories.*`     → skipped (fixtures).
 *   - `var(--token, #fallback)`      → ALLOWED anywhere (Rule 6 mandates this exact pattern). Not flagged.
 *   - `--custom-prop: #hex`          → ALLOWED (a token DEFINITION). Not flagged.
 *   - a BARE hex used as a value     → VIOLATION (e.g. `color: #fff`, `ring: '#60C0F0'`). Flagged.
 *
 * Reports file:line for each violation and exits 1. Dependency-free (fs + regex).
 *
 * Usage:  node scripts/ci/check-token-discipline.mjs [dir ...]
 *   default scope = the shipped v-next surface dirs (see SURFACES).
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative, basename } from 'node:path';

const SURFACES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      'frontend/src/pages/HomePage/v-next',
      'frontend/src/pages/about/v-next',
      'frontend/src/pages/video-vnext',
      'frontend/src/pages/contactpage/vnext',
      'frontend/src/pages/shop/store-v4',
      'frontend/src/components/DashBoard/v2',
      'frontend/src/pages/gallery-vnext',
    ];

const EXTS = new Set(['.ts', '.tsx', '.css', '.scss']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', '__snapshots__']);
// A 3/4/6/8-digit hex color literal. `var(--x, #fff)` fallbacks live in *.tokens.ts (skipped), so any hit here
// is a raw color outside the bridge.
const HEX = /#[0-9a-fA-F]{3,8}\b/g;

function isExempt(file) {
  const b = basename(file);
  // *.tokens.ts and *.theme.ts are the bridge files (they DEFINE the --tokens); tests/stories/decls are fixtures.
  return /\.tokens\.ts$/.test(b) || /\.theme\.ts$/.test(b) || /\.test\./.test(b) || /\.stories\./.test(b) || /\.d\.ts$/.test(b);
}

/**
 * Strip the two COMPLIANT hex contexts from a line before scanning for a bare literal:
 *   1. `var(--token, #fallback)` — Rule 6's required token-with-fallback form.
 *   2. `--custom-prop: #hex`      — a token definition.
 * Whatever hex remains is a bare literal a component emitted directly = the violation this guard catches.
 */
function stripCompliantHex(line) {
  return line
    .replace(/var\(\s*--[\w-]+\s*,\s*[^)]*\)/g, 'var(--t)') // var() fallbacks (hex or rgba inside)
    .replace(/--[\w-]+\s*:\s*#[0-9a-fA-F]{3,8}\b/g, '--t:def'); // custom-property definitions
}

function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, out);
    } else if (EXTS.has(extname(name)) && !isExempt(full)) {
      out.push(full);
    }
  }
  return out;
}

// A guard that scans nothing must NEVER report success — a missing surface dir is a config bug (renamed/moved
// surface, or wrong cwd), not something to skip past with a green check. See the twin guard in check-degalaxy.
const violations = [];
let scanned = 0;
let missing = 0;
for (const surface of SURFACES) {
  if (!existsSync(surface)) {
    missing++;
    console.error(`✖ surface MISSING (config bug — renamed/moved dir, or wrong cwd): ${surface}`);
    continue;
  }
  for (const file of walk(surface, [])) {
    scanned++;
    const rel = relative(process.cwd(), file).replace(/\\/g, '/');
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      // Explicit, greppable escape hatch for a JS pre-paint fallback (the JS twin of `var(--token, #fallback)`).
      // The annotation must name its token: `// token-fallback: --some-token`.
      // TIGHTENED: the look-above only counts when the line above is a STANDALONE annotation carrying no hex of
      // its own. Previously any line containing "token-fallback" silenced the following line too, so a single
      // annotated violation also hid an unrelated one beneath it — an audit would under-count by 2x.
      const ANN = /token-fallback:\s*--[\w-]+/;
      const prev = i > 0 ? lines[i - 1] : '';
      HEX.lastIndex = 0;
      const annotatedAbove = ANN.test(prev) && !HEX.test(prev);
      if (ANN.test(line) || annotatedAbove) return;
      HEX.lastIndex = 0;
      const m = stripCompliantHex(line).match(HEX);
      if (m) violations.push({ file: rel, line: i + 1, hex: m.join(', '), text: line.trim().slice(0, 120) });
    });
  }
}

if (violations.length) {
  console.error(`\n✖ check-token-discipline: ${violations.length} raw hex literal(s) outside a *.tokens.ts bridge:\n`);
  for (const v of violations) console.error(`  ${v.file}:${v.line}  [${v.hex}]  ${v.text}`);
  console.error(`\nMove the color into the surface's *.tokens.ts bridge and read it as var(--token, #fallback).\n`);
  process.exit(1);
}
console.log(`✓ check-token-discipline: clean — ${scanned} consumer file(s) across ${SURFACES.length - missing} surface(s), zero raw hex.`);
