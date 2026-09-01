#!/usr/bin/env node
/**
 * validate-asset.mjs — the gate every game/app asset manifest must pass.
 *
 * WHY THIS IS THE FIRST TOOL BUILT (P1, SWA-211)
 * ----------------------------------------------
 * A registry nothing enforces is a document, not a gate. `assets/registry.json`
 * shipped in P0 with no validator; three panel seats independently called that
 * out (Ox Alpha, GLM 5.3, HY3, 2026-08-25). This closes it.
 *
 * It also carries forward the doctrine already in the repo rather than inventing
 * a parallel one: `world.miniature-play.voxel-realm` (design-brain worlds.md
 * entry 16) already requires generator/model/version, deterministic seed,
 * licenses, UTC timestamp, SHA-256, and a similarity review excluding protected
 * game assets, characters, UI, AUDIO, trademarks, and real likeness. Those are
 * required fields here, not suggestions.
 *
 * WHAT IT REFUSES
 *   - an id absent from assets/registry.json          (the registry IS the namespace)
 *   - a zone id that does not resolve into the frozen world catalog
 *   - an animation clip name outside the skeleton's declared set
 *   - a bare budget number with no measurement provenance  (fabricated numbers
 *     acquire authority by being committed — the P0 lesson)
 *   - Draco compression on a rigged/morph-target asset      (known decode breakage)
 *   - incomplete provenance, or a free-text license
 *   - a manifest whose declared file is missing or whose sha256 does not match
 *
 * EXIT CODES
 *   0  all manifests valid
 *   1  at least one manifest INVALID  (the finding is real)
 *   2  the validator could not run    (missing registry, unreadable input, no
 *      manifests found) — an instrument failure is NEVER a pass. Same discipline
 *      as catalog-check.mjs: zero results is not evidence of correctness.
 *
 * USAGE
 *   node scripts/assets/validate-asset.mjs [manifest.json ...]
 *   node scripts/assets/validate-asset.mjs --all      # walks assets/runtime for manifest.json
 *                                                     (NB: never write the glob with a star-slash
 *                                                      in here — it closes this comment block)
 *   node scripts/assets/validate-asset.selftest.mjs   # rule fixtures, no repo assets needed
 *
 * The rules live in validate-asset.rules.mjs (pure function). This file is loading + CLI only.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { validate, unreadRegistryKeys } from './validate-asset.rules.mjs';

// Re-exported so the selftest keeps importing from this path.
export { validate };
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REGISTRY = join(ROOT, 'assets/registry.json');
const WORLD_CATALOG = join(ROOT, 'scripts/ai-workflow/world-engine-catalog-validation.mjs');

const argv = process.argv.slice(2);
const ALL = argv.includes('--all');

/* ------------------------------------------------------------------ loading */

function die(code, msg) {
  console.error(`[validate-asset] EXIT ${code} — ${msg}`);
  if (code === 2) console.error('[validate-asset] This is an INSTRUMENT FAILURE. It is not a pass.');
  process.exit(code);
}

function loadRegistry() {
  if (!existsSync(REGISTRY)) die(2, `registry not found: ${REGISTRY}`);
  try {
    return JSON.parse(readFileSync(REGISTRY, 'utf8'));
  } catch (err) {
    die(2, `registry unparseable: ${err.message}`);
  }
}

/** World ids come from the FROZEN list, never from prose. */
function loadWorldIds() {
  if (!existsSync(WORLD_CATALOG)) return null; // absent checkout — announced, not silent
  const src = readFileSync(WORLD_CATALOG, 'utf8');
  const ids = new Set();
  for (const m of src.matchAll(/['"`](world\.[a-z0-9-]+\.[a-z0-9-]+)['"`]/g)) ids.add(m[1]);
  return ids.size ? ids : null;
}

/* ---------------------------------------------------------------------- run */

// Entry-point guard. Without it, `import { validate } from './validate-asset.mjs'` runs
// the CLI and exits 2, so the selftest could never import the rules it tests. This is the
// same defect that hit measure-glb.mjs an hour earlier — a module that executes on import
// cannot be reused. Found by running the selftest, NOT by reading the split.
const IS_MAIN = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (IS_MAIN) {

if (argv.includes('--selftest')) {
  console.error('[validate-asset] selftest moved: node scripts/assets/validate-asset.selftest.mjs');
  process.exit(2);
}

const registry = loadRegistry();
const worldIds = loadWorldIds();
{
  // Schema-drift-by-design guard: every registry key nothing reads is announced, so a declared
  // constraint can never again sit unenforced in silence for a whole day (nine did).
  const { top, zone } = unreadRegistryKeys(registry);
  if (top.length) console.warn(`[validate-asset] registry keys with NO reader (documentation, not gate): ${top.join(', ')}`);
  if (zone.length) console.warn(`[validate-asset] zone keys with NO reader: ${zone.join(', ')}`);
}
if (!worldIds) {
  // A validator that cannot check the zone FK but exits 0 waves unvalidated assets through
  // any CI that only reads the exit code. Degraded is an INSTRUMENT FAILURE, not a pass.
  // (Ox Alpha, P1 panel 2026-08-25.) Override deliberately with SWAN_ALLOW_DEGRADED=1.
  // The override is refused when stdin is not a TTY: set once in a CI env or a shell profile it
  // would turn every future exit-2 into a permanent silent pass (Ox B7 + Grok B7, branch gate).
  if (process.env.SWAN_ALLOW_DEGRADED === '1' && process.stdin.isTTY) {
    console.warn('[validate-asset] !!! DEGRADED — world catalog absent, zone FK unchecked, continuing because SWAN_ALLOW_DEGRADED=1 (interactive only)');
  } else if (process.env.SWAN_ALLOW_DEGRADED === '1') {
    die(2, 'SWAN_ALLOW_DEGRADED=1 is refused when not interactive (CI/hook) — a sticky override is a permanent silent pass');
  } else {
    die(2, 'world catalog absent or empty — zone FK cannot be checked. Set SWAN_ALLOW_DEGRADED=1 to proceed knowingly.');
  }
}

let files = argv.filter((a) => !a.startsWith('--'));
if (ALL) {
  // Manifests live BESIDE their runtime files, because runtime paths are manifest-relative.
  // A central manifests/ dir cannot resolve them (found by running it — P1 dry-loop R1).
  const root = join(ROOT, 'assets/runtime');
  if (!existsSync(root)) die(2, `--all: ${root} does not exist. No manifests is not a pass.`);
  const walk = (dir) => readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return name === 'manifest.json' ? [full] : [];
  });
  files = walk(root);
  if (files.length === 0) die(2, `--all found ZERO manifests under ${root}. Zero validated is NOT a pass.`);
}
if (files.length === 0) die(2, 'no manifests given. Zero manifests validated is NOT a pass — pass paths or --all.');

let invalid = 0;
for (const f of files) {
  if (!existsSync(f) || !statSync(f).isFile()) die(2, `manifest not readable: ${f}`);
  let manifest;
  try { manifest = JSON.parse(readFileSync(f, 'utf8')); } catch (err) { die(2, `manifest unparseable ${f}: ${err.message}`); }
  const { errs, warns } = validate(manifest, { registry, worldIds, manifestDir: dirname(f), root: ROOT });
  console.log(`\n[validate-asset] ${f}`);
  for (const w of warns) console.log(`  WARN  ${w}`);
  for (const e of errs) console.log(`  ERROR ${e}`);
  if (errs.length) { invalid += 1; console.log(`  INVALID (${errs.length} error(s))`); }
  else console.log('  VALID');
}

console.log(`\n[validate-asset] ${files.length - invalid}/${files.length} valid`);
process.exit(invalid ? 1 : 0);
}
