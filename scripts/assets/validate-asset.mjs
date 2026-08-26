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
 */
import { readFileSync, existsSync, readdirSync, statSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REGISTRY = join(ROOT, 'assets/registry.json');
const WORLD_CATALOG = join(ROOT, 'scripts/ai-workflow/world-engine-catalog-validation.mjs');

const argv = process.argv.slice(2);
const ALL = argv.includes('--all');

// DoS guard: a manifest naming a huge file would hang the gate in CI.
const MAX_ASSET_BYTES = 256 * 1024 * 1024;

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

/* ---------------------------------------------------------------- the rules */

const CLIP_ORDER_FREE = true; // order does not matter; membership does

export function validate(manifest, ctx) {
  const errs = [];
  const warns = [];
  const E = (m) => errs.push(m);
  const W = (m) => warns.push(m);

  const { registry, worldIds, manifestDir } = ctx;
  const byId = new Map(registry.assets.map((a) => [a.id, a]));
  const skeletons = new Map(registry.skeletons.map((s) => [s.id, s]));
  const zoneIds = new Set(registry.zones.map((z) => z.id));
  const licenseKinds = new Set(registry.licensePolicy.kindValues);

  // --- identity -----------------------------------------------------------
  if (manifest.schema !== 'swan.game-asset.v1') E(`schema must be "swan.game-asset.v1", got ${JSON.stringify(manifest.schema)}`);
  if (!manifest.id) E('missing id');
  else if (!byId.has(manifest.id)) {
    E(`id "${manifest.id}" is NOT in assets/registry.json — the registry is the namespace. ` +
      `Register it deliberately, or run: node scripts/assets/catalog-check.mjs assets/registry.json ${manifest.id}`);
  }
  const entry = byId.get(manifest.id);

  // --- zone FK ------------------------------------------------------------
  if (manifest.zone) {
    if (!zoneIds.has(manifest.zone)) E(`zone "${manifest.zone}" not in registry.zones`);
    const worldSeg = String(manifest.zone).split('/')[0];
    if (!String(manifest.zone).includes('/')) {
      E(`zone "${manifest.zone}" is flat — a zone id must be <worldId>/<localId> or it cannot join the world catalog`);
    } else if (worldIds && !worldIds.has(worldSeg)) {
      E(`zone's world segment "${worldSeg}" is not in the frozen world catalog`);
    } else if (!worldIds) {
      W('world catalog not present in this checkout — zone→world FK UNVERIFIED (announced, not silent)');
    }
  }

  // --- skeleton + clips ---------------------------------------------------
  if (manifest.skeleton) {
    const sk = skeletons.get(manifest.skeleton);
    if (!sk) E(`skeleton "${manifest.skeleton}" not in registry.skeletons`);
    else {
      const allowed = new Set(sk.clips);
      const got = manifest.animations || [];
      if (!Array.isArray(got) || got.length === 0) E('a rigged asset declares no animations');
      for (const clip of got) if (!allowed.has(clip)) E(`clip "${clip}" is not in ${manifest.skeleton} (allowed: ${sk.clips.join(', ')})`);
      const missing = sk.clips.filter((c) => !got.includes(c));
      if (missing.length) W(`skeleton clips not yet authored: ${missing.join(', ')}`);
      if (!CLIP_ORDER_FREE) W('clip order enforcement is off');
    }
  }

  // --- budgets: the fabricated-number rule --------------------------------
  const b = manifest.budgets;
  if (b === undefined) {
    E('budgets missing — declare null (unmeasured) rather than omitting the field');
  } else if (b !== null) {
    if (typeof b !== 'object') E('budgets must be null or an object with measurement provenance');
    else {
      for (const k of ['tool', 'command', 'date', 'commit']) {
        if (!b[k]) E(`budgets.${k} is required — a bare number with no measurement provenance is a fabricated number acquiring authority (registry budgetPolicy)`);
      }
      const nums = ['lod0Triangles', 'lod1Triangles', 'lod2Triangles', 'textureMB'];
      for (const k of nums) if (b[k] !== undefined && typeof b[k] !== 'number') E(`budgets.${k} must be a number`);
      // sanity: the P0 incident was a 4MB texture budget on a 1500-tri asset
      if (typeof b.textureMB === 'number' && typeof b.lod0Triangles === 'number' && b.lod0Triangles < 3000 && b.textureMB > 2) {
        W(`textureMB ${b.textureMB} on a ${b.lod0Triangles}-tri asset looks implausible — sanity-check before promoting`);
      }
    }
  }
  if (b === null && entry?.budgetPriors) W('budgets null (unmeasured) — priors are advisory and MUST NOT be enforced');

  // --- provenance (inherited from voxel-realm) ----------------------------
  const p = manifest.provenance;
  if (!p || typeof p !== 'object') {
    E('provenance missing — voxel-realm requires generator/version, seed, licenses, UTC timestamp and SHA-256');
  } else {
    if (!p.humanOwner) E('provenance.humanOwner required');
    if (!p.createdAtUtc) E('provenance.createdAtUtc required (UTC timestamp)');
    else if (!/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(p.createdAtUtc)) E('provenance.createdAtUtc must be a UTC ISO-8601 instant ending in Z');
    if (typeof p.aiAssisted !== 'boolean') E('provenance.aiAssisted must be true or false — null/undefined is not an answer, and silence is not a claim of hand-authorship');
    if (p.aiAssisted === true) {
      if (!p.generator?.name || !p.generator?.version) E('provenance.generator {name,version} required when aiAssisted');
      if (!p.generator?.weightsSha256) E('provenance.generator.weightsSha256 required when aiAssisted — the generator is part of the provenance chain');
      if (p.seed === undefined) E('provenance.seed required when aiAssisted (determinism)');
    }
    if (p.similarityReviewed !== true) {
      E('provenance.similarityReviewed must be true — voxel-realm requires a review excluding protected game assets, characters, UI, audio, trademarks and real likeness');
    }
    // license: structured, never a delimited string
    const lic = p.license;
    if (!lic || typeof lic !== 'object') {
      E('provenance.license must be a structured object {kind,...}, never free text or a delimited string');
    } else {
      if (!licenseKinds.has(lic.kind)) E(`provenance.license.kind must be one of ${[...licenseKinds].join(' | ')}`);
      if (lic.kind === 'model') {
        for (const k of ['modelName', 'modelVersion', 'licenseId', 'receiptPath']) if (!lic[k]) E(`provenance.license.${k} required when kind=model`);
      }
      if (lic.kind === 'ccby') {
        for (const k of ['licenseId', 'receiptPath']) if (!lic[k]) E(`provenance.license.${k} required when kind=ccby`);
      }
      if (lic.receiptPath) {
        if (isAbsolute(lic.receiptPath)) E(`license receiptPath must be repo-relative: ${lic.receiptPath}`);
        else {
          const rp = resolve(ROOT, lic.receiptPath);
          if (rp !== ROOT && !rp.startsWith(ROOT + sep)) E(`license receiptPath escapes the repo: ${lic.receiptPath}`);
          else if (!existsSync(rp)) E(`license receipt not found: ${lic.receiptPath}`);
        }
      }
    }
  }

  // --- runtime files + hashes ---------------------------------------------
  const rt = manifest.runtime;
  if (!rt || typeof rt !== 'object') E('runtime missing (lod0/lod1/lod2/collision paths)');
  else {
    const rigged = Boolean(manifest.skeleton) || rt.hasMorphTargets === true;
    if (rigged && String(rt.compression || '').toLowerCase() === 'draco') {
      E('Draco on a rigged/morph-target asset is a known decode breakage — use Meshopt (GLM 5.3, 2026-08-25)');
    }
    for (const slot of ['lod0', 'lod1', 'lod2', 'collision']) {
      const rel = rt[slot];
      if (!rel) { E(`runtime.${slot} missing`); continue; }
      // CONTAINMENT before touching the filesystem. Manifests are machine-generated —
      // an LLM-authored manifest is untrusted input. Without this, `"lod0": "../../../.env"`
      // makes the validator hash a secret and stamp it VALID.
      // (Ox Alpha blocker 4 + GLM 5.3 blocker 5, P1 panel 2026-08-25 — the dry-loop's five
      // rounds never attacked path shapes.)
      const abs = resolve(manifestDir, rel);
      const bound = resolve(manifestDir);
      if (isAbsolute(rel)) { E(`runtime.${slot} must be a relative path, got absolute: ${rel}`); continue; }
      if (abs !== bound && !abs.startsWith(bound + sep)) {
        E(`runtime.${slot} escapes the asset directory: ${rel} — refused before any read`);
        continue;
      }
      if (!existsSync(abs)) { E(`runtime.${slot} file not found: ${rel}`); continue; }
      const st = lstatSync(abs);
      if (st.isSymbolicLink() || !st.isFile()) { E(`runtime.${slot} is not a regular file: ${rel}`); continue; }
      if (st.size > MAX_ASSET_BYTES) { E(`runtime.${slot} is ${st.size} bytes, over the ${MAX_ASSET_BYTES}-byte cap — refusing to hash (DoS guard)`); continue; }
      const want = manifest.sha256?.[slot];
      if (!want) { E(`sha256.${slot} missing — an unhashed runtime file has no provenance`); continue; }
      const got = createHash('sha256').update(readFileSync(abs)).digest('hex');
      if (got !== want) E(`sha256.${slot} MISMATCH — declared ${want.slice(0, 12)}…, actual ${got.slice(0, 12)}…`);
    }
    if (!rt.stillFallback) W('runtime.stillFallback missing — the still tier has no poster for this asset');
  }

  return { errs, warns };
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
if (!worldIds) {
  // A validator that cannot check the zone FK but exits 0 waves unvalidated assets through
  // any CI that only reads the exit code. Degraded is an INSTRUMENT FAILURE, not a pass.
  // (Ox Alpha, P1 panel 2026-08-25.) Override deliberately with SWAN_ALLOW_DEGRADED=1.
  if (process.env.SWAN_ALLOW_DEGRADED === '1') {
    console.warn('[validate-asset] world catalog absent — zone FK DEGRADED, continuing because SWAN_ALLOW_DEGRADED=1');
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
  const { errs, warns } = validate(manifest, { registry, worldIds, manifestDir: dirname(f) });
  console.log(`\n[validate-asset] ${f}`);
  for (const w of warns) console.log(`  WARN  ${w}`);
  for (const e of errs) console.log(`  ERROR ${e}`);
  if (errs.length) { invalid += 1; console.log(`  INVALID (${errs.length} error(s))`); }
  else console.log('  VALID');
}

console.log(`\n[validate-asset] ${files.length - invalid}/${files.length} valid`);
process.exit(invalid ? 1 : 0);
}
