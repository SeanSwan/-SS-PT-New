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
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, '..', '..');
const WORLDS = join(REPO, 'frontend/src/pages/HomePage/three-worlds');

/** Import the canonical skeleton manifest through Node's TS type-stripping. */
export async function loadSkeletons() {
  const mod = await import(pathToFileURL(join(WORLDS, 'skeletons.ts')).href);
  return { skeletons: mod.SKELETONS, collisions: mod.findCollisions() };
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
