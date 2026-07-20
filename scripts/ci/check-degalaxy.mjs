#!/usr/bin/env node
/**
 * check-degalaxy — CI guard: the RETIRED Galaxy-Swan palette must appear NOWHERE in frontend source
 * (Kimi roadmap #8 "entropy firewall"; CLAUDE.md: Galaxy-Swan is RETIRED — do NOT use). Gemini has been
 * observed re-citing these tokens; this is the mechanical backstop so a retired color can't slip back in
 * through a side door as worlds multiply.
 *
 * Scans for the retired literals (case-insensitive): #0a0a1a, #00FFFF, #7851A9, and the "Galaxy-Swan" name.
 * Reports file:line for every hit and exits 1 if any exist. Dependency-free (fs + regex).
 *
 * SCOPE (important): the DEFAULT scope is the design-overhaul CONSUMER surfaces (SCOPES below) — the new work
 * this firewall protects from NEW drift. It is deliberately NOT whole-repo by default: the retired
 * `styles/galaxy-swan-theme.ts` + its ~15 legacy importers are a KNOWN pre-existing cleanup backlog (~104 hits,
 * 2026-07-19) that cannot be purged without grep+approval (Rule 34) — a CI gate red on that legacy is useless
 * (Rule 56). Run the legacy-purge audit explicitly with `node scripts/ci/check-degalaxy.mjs frontend/src`.
 *
 * Usage:  node scripts/ci/check-degalaxy.mjs [dir ...]   (default scope: the design-overhaul surfaces)
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative, basename } from 'node:path';

// Default = the design-overhaul consumer surfaces (mirrors check-token-discipline). Override via args.
const SCOPES = process.argv.slice(2).length
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
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.mjs']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', 'coverage', '__snapshots__']);

// Retired Galaxy-Swan fingerprints. Hex forms are matched with an optional 8-digit alpha too (#00FFFFxx).
// rgb()/rgba()/hsl() notation is matched too: a retired colour most realistically returns as a TRANSLUCENT
// glow/shadow written `rgba(0, 255, 255, 0.4)`, which no hex pattern would ever catch.
const PATTERNS = [
  { label: 'retired hex #0a0a1a', re: /#0a0a1a(?:[0-9a-f]{2})?\b/gi },
  { label: 'retired hex #00FFFF (cyan)', re: /#00ffff(?:[0-9a-f]{2})?\b/gi },
  { label: 'retired hex #7851A9 (purple)', re: /#7851a9(?:[0-9a-f]{2})?\b/gi },
  { label: 'retired name "Galaxy-Swan"', re: /galaxy[-\s]?swan/gi },
  // same three colours in rgb()/rgba() form
  { label: 'retired rgb(10,10,26) = #0a0a1a', re: /rgba?\(\s*10\s*,\s*10\s*,\s*26\b/gi },
  { label: 'retired rgb(0,255,255) = #00FFFF', re: /rgba?\(\s*0\s*,\s*255\s*,\s*255\b/gi },
  { label: 'retired rgb(120,81,169) = #7851A9', re: /rgba?\(\s*120\s*,\s*81\s*,\s*169\b/gi },
  // hsl equivalents of the retired cyan + purple
  { label: 'retired hsl cyan = #00FFFF', re: /hsla?\(\s*180\s*,\s*100%\s*,\s*50%/gi },
  { label: 'retired hsl purple = #7851A9', re: /hsla?\(\s*265\s*,\s*3[0-9]%\s*,\s*4[0-9]%/gi },
];

/** This scanner file itself contains the fingerprints as patterns — never flag it. */
const SELF = 'scripts/ci/check-degalaxy.mjs';

/**
 * Files whose JOB is to name the retired tokens are exempt: test/story/decl fixtures (e.g. the vitest de-galaxy
 * contract), the *.tokens.ts bridges (which name the trio only in "never use these" comments), and guard/
 * contract files that BAN them. A file that ENFORCES de-galaxy must be allowed to name the retired tokens.
 */
// ANCHORED on purpose. An earlier version used /guard/i and /\.contract\./ as loose substring matches on the
// basename — which silently exempted ORDINARY components like `GuardBanner.tsx`, `Safeguard.tsx`, `RouteGuard.tsx`
// and `Hero.contract.tsx` from the ENTIRE scan (whole-file, permanently, with a green check). These patterns now
// only match true enforcement files.
const isExempt = (b) =>
  /\.test\./.test(b) ||
  /\.stories\./.test(b) ||
  /\.d\.ts$/.test(b) ||
  /\.snap$/.test(b) ||
  /\.tokens\.ts$/.test(b) ||
  /\.guard\.[jt]sx?$/.test(b) ||
  /\.contract\.test\./.test(b);

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
    } else if (EXTS.has(extname(name)) && !isExempt(name)) {
      out.push(full);
    }
  }
  return out;
}

// A guard that scans nothing must NEVER report success. A missing scope is a config bug (renamed/moved/deleted
// surface dir, or the wrong cwd) — treat it as a hard failure, not a soft skip. Previously this warned and then
// printed a green "clean" with 0 files scanned, so one directory rename would silently disable the guard forever.
const files = [];
let missingScopes = 0;
for (const scope of SCOPES) {
  if (!existsSync(scope)) {
    console.error(`✖ scope MISSING (config bug — renamed/moved dir, or wrong cwd): ${scope}`);
    missingScopes += 1;
    continue;
  }
  walk(scope, files);
}
if (missingScopes) {
  console.error(`\n✖ check-degalaxy: ${missingScopes} of ${SCOPES.length} scope(s) missing — refusing to report clean.\n`);
  process.exit(1);
}
if (!files.length) {
  console.error('\n✖ check-degalaxy: scanned 0 files — scope config is broken. Refusing to report clean.\n');
  process.exit(1);
}
const hits = [];
for (const file of files) {
  const rel = relative(process.cwd(), file).replace(/\\/g, '/');
  if (rel === SELF) continue;
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const { label, re } of PATTERNS) {
      re.lastIndex = 0;
      if (re.test(line)) hits.push({ file: rel, line: i + 1, label, text: line.trim().slice(0, 120) });
    }
  });
}

if (hits.length) {
  console.error(`\n✖ check-degalaxy: ${hits.length} retired Galaxy-Swan reference(s) found (palette is RETIRED):\n`);
  for (const h of hits) console.error(`  ${h.file}:${h.line}  [${h.label}]  ${h.text}`);
  console.error(`\nUse the Crystalline Swan palette via var(--token, #fallback). See CLAUDE.md Active Palette.\n`);
  process.exit(1);
}
console.log(`✓ check-degalaxy: clean — no retired Galaxy-Swan references (${files.length} files scanned across ${SCOPES.length} scope(s)).`);
