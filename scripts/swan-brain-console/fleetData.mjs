/**
 * fleetData — read-only access to the 20-variant fleet for the console.
 * @module scripts/swan-brain-console/fleetData
 *
 * HOW THE CONSOLE READS THE FLEET WITHOUT DUPLICATING IT
 * `skeletons.ts` is the canonical structural manifest and Node 24 imports it
 * directly via native TypeScript type-stripping, so the console shows the SAME
 * objects the app renders — there is no second copy to drift.
 *
 * `registry.ts` cannot be imported the same way, because its internal imports are
 * extensionless (correct for Vite, unresolvable for bare Node). Rather than
 * restructure app source to suit a tool, the console reads registry.ts as TEXT
 * and extracts only the author-provided fields it needs (titles, tradeoffs). Those
 * fields are prose, not logic, so text extraction is safe here — and the file
 * count check below proves the registry actually covers every skeleton.
 *
 * EVERY NUMBER IS READ AT READ TIME. The retired 2026-08-26 console packet's own
 * post-mortem is explicit that hand-maintained counts go stale invisibly, so
 * nothing in this module is a constant.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, '..', '..');
const WORLDS = join(REPO, 'frontend/src/pages/HomePage/three-worlds');

/**
 * Import the canonical skeleton manifest through Node's TS type-stripping.
 *
 * THE IMPORT URL CARRIES A REVISION, AND THAT IS NOT DECORATION (round 11, finding F07).
 * `import()` caches by URL for the life of the process. With a stable URL, a long-lived console
 * — or simply two `snapshot()` calls either side of an edit — kept serving the skeletons it read
 * first, while `readRegistryText()` below re-read `registry.ts` from disk on every call. The
 * result was a MIXED-GENERATION fleet: fresh prose describing stale structure, stamped with a
 * fresh `generatedAt`, so nothing on screen said which moment the numbers belonged to.
 *
 * `mtimeMs` plus `size` is the cache key: the same file reuses one instance, so the cache still
 * does its job, and a changed file gets a new URL, so the revision is observed. A content hash
 * would be stronger and would mean reading every byte twice on every call. This module's thesis
 * is that a cached registry is decay made invisible; the decay being closed here is measured in
 * edits, not in bytes.
 */
/**
 * The import URL for the skeleton manifest, carrying the revision it was read at.
 *
 * Extracted so the cache key is TESTABLE rather than asserted. `import()` caches by URL, so this
 * string is the whole mechanism: if it stops varying with the file, the staleness comes straight
 * back and no other test would notice.
 */
export function skeletonsImportUrl(file, stat) {
  return `${pathToFileURL(file).href}?rev=${stat.mtimeMs}-${stat.size}`;
}

export async function loadSkeletons() {
  const file = join(WORLDS, 'skeletons.ts');
  const mod = await import(skeletonsImportUrl(file, statSync(file)));
  return { skeletons: mod.SKELETONS, collisions: mod.findCollisions() };
}

/**
 * The canonical, ORDERED variant ids — the fleet's population, and nothing else.
 *
 * ONE DEFINITION FOR EVERY CONSUMER (round 11, finding F04). Both browser verifiers need to
 * know WHICH variants exist, and `gallery-verify.mjs` had grown its own copy of this
 * two-line import. Two copies of "the fleet" are two answers to "did every variant render".
 *
 * `shot-diff.mjs` took its id list EXCLUSIVELY from the DOM, so a harness serving one
 * variant produced a one-row run that still stamped `gate: 'three-worlds-render'`: a subset
 * run certifying the full-fleet gate, with the missing variant absent from both the
 * measurement and the denominator. Reading the expected set from the MANIFEST rather than
 * from the page under measurement is what makes that unreachable.
 *
 * Deliberately NOT the registry's on-disk directories (`readRegistryText().dirs`): a variant
 * directory can exist without being declared in the manifest, and the manifest is the
 * canonical structural source. The reconciliation reports a mismatch either way.
 */
export async function loadFleetIds() {
  const { skeletons } = await loadSkeletons();
  return skeletons.map((s) => s.id);
}

/** Pull `id: '...'` → prose pairs out of a Record literal in registry.ts. */
function readRecord(src, name) {
  const start = src.indexOf(`const ${name}`);
  if (start === -1) return {};
  const open = src.indexOf('{', start);
  const close = src.indexOf('\n};', open);
  const body = src.slice(open, close === -1 ? undefined : close);
  const out = {};
  const re = /(v\d{2}):\s*'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re.exec(body)) !== null) out[m[1]] = m[2].replace(/\\'/g, "'");
  return out;
}

/** Read the registry's authored prose plus on-disk variant coverage. */
export function readRegistryText() {
  const file = join(WORLDS, 'registry.ts');
  if (!existsSync(file)) return { present: false, titles: {}, tradeoffs: {}, dirs: [] };
  const src = readFileSync(file, 'utf8');
  const dirs = existsSync(WORLDS)
    ? readdirSync(WORLDS, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^v\d{2}$/.test(d.name))
      .map((d) => d.name)
      .sort()
    : [];
  return {
    present: true,
    titles: readRecord(src, 'TITLES'),
    tradeoffs: readRecord(src, 'TRADEOFFS'),
    dirs,
    referenceDisclosure: src.includes('[MOBBIN UNAVAILABLE]')
      ? '[MOBBIN UNAVAILABLE]'
      : 'undeclared',
  };
}

/** Import registry logic for summary counts would fail; compute them here instead. */
export function summarize(skeletons, registryText) {
  const navModels = new Set(skeletons.map((s) => s.nav_model));
  const grids = new Set(skeletons.map((s) => s.grid));
  const mechanics = new Set(skeletons.map((s) => s.hero_mechanics));
  const wildcards = skeletons.filter((s) => Boolean(s.wildcard));
  const missingDir = skeletons.filter((s) => !registryText.dirs.includes(s.id)).map((s) => s.id);
  const missingTradeoff = skeletons
    .filter((s) => !registryText.tradeoffs[s.id] || registryText.tradeoffs[s.id].length < 13)
    .map((s) => s.id);
  return {
    total: skeletons.length,
    navModels: navModels.size,
    grids: grids.size,
    mechanics: mechanics.size,
    wildcards: wildcards.length,
    wildcardId: wildcards[0]?.id ?? null,
    variantDirs: registryText.dirs.length,
    missingDir,
    missingTradeoff,
    referenceDisclosure: registryText.referenceDisclosure,
  };
}

/** The rows the console renders. Structural facts from code, prose from the registry. */
export async function loadFleet() {
  const { skeletons, collisions } = await loadSkeletons();
  const registryText = readRegistryText();
  return {
    rows: skeletons.map((s) => ({
      id: s.id,
      title: registryText.titles[s.id] ?? s.id,
      nav_model: s.nav_model,
      hero_mechanics: s.hero_mechanics,
      grid: s.grid,
      chapters: s.chapters,
      anti_specs: s.anti_specs,
      wildcard: s.wildcard ?? null,
      tradeoff: registryText.tradeoffs[s.id] ?? '',
      hasDir: registryText.dirs.includes(s.id),
    })),
    collisions,
    summary: summarize(skeletons, registryText),
  };
}
