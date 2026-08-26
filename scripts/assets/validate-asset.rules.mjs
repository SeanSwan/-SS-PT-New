#!/usr/bin/env node
/**
 * validate-asset.rules.mjs — the RULES of the asset gate, as a pure function.
 *
 * Split out of validate-asset.mjs on 2026-08-25 (branch-gate panel): the CLI file sat at
 * 292 lines against the repo's 300-line cap with three more rules queued. Every closed
 * finding had been closed by adding a rule to one file; this is the seam.
 *
 *   validate(manifest, ctx) -> { errs, warns }
 *   ctx = { registry, worldIds: Set|null, manifestDir, root }
 *
 * No process.exit, no console, no argv — the CLI (validate-asset.mjs) owns those. That is
 * what makes this importable by the selftest without running anything.
 */
import { readFileSync, existsSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, isAbsolute, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { measure, parseGlb, worldAabb } from './measure-glb.mjs';

// Registry keys this rules module actually READS. Anything declared in the registry and not
// listed here is documentation wearing a schema's clothes; the CLI announces it at startup.
// (Ox Alpha B6 + Kimi, branch gate 2026-08-25: nine such fields existed, including chromeLaw,
// the constraint that motivated the whole P0 correction.)
export const REGISTRY_KEYS_READ = new Set([
  'assets', 'skeletons', 'zones', 'licensePolicy', 'statusValues', 'budgetPolicy', 'worlds', 'schema', 'updated', 'note',
]);
export const ZONE_KEYS_READ = new Set(['id', 'worldId', 'localId', 'status', 'chromeLaw', 'shardFraming', 'loreParent', 'summary', 'idRule']);
export const COMPRESSION_VALUES = new Set(['none', 'meshopt', 'draco']);

export function unreadRegistryKeys(registry) {
  const top = Object.keys(registry).filter((k) => !REGISTRY_KEYS_READ.has(k));
  const zone = Object.keys(registry.zones?.[0] || {}).filter((k) => !ZONE_KEYS_READ.has(k));
  return { top, zone };
}

// DoS guard: a manifest naming a huge file would hang the gate in CI.
export const MAX_ASSET_BYTES = 256 * 1024 * 1024;

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
  const statusValues = new Set(registry.statusValues || []);
  if (!statusValues.has(manifest.status)) E(`status must be one of ${[...statusValues].join(' | ')}, got ${JSON.stringify(manifest.status)}`);
  if (manifest.calibrationFixture === true) W('calibrationFixture — plumbing proof, NOT production data; never trend-line this asset');

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
    // chromeLaw — Voxel Realm is Law B: "No Swan-branded surface may use this Law-B chrome."
    // A zone-bound asset MUST say which surface it targets and which palette law it renders,
    // and the pair must match the zone's chromeLaw table. This is the constraint that justified
    // the P0 correction; until this rule it was declared and read by nothing (all six seats).
    const zone = registry.zones.find((z) => z.id === manifest.zone);
    const law = zone?.chromeLaw;
    if (law && typeof law === 'object') {
      const surf = manifest.targetSurface;
      if (!surf || !(surf in law)) E(`targetSurface must be one of ${Object.keys(law).join(' | ')} for a zone-bound asset, got ${JSON.stringify(surf)}`);
      else if (manifest.paletteLaw !== law[surf]) {
        E(`paletteLaw ${JSON.stringify(manifest.paletteLaw)} on targetSurface "${surf}" violates zone chromeLaw (${surf} must render Law ${law[surf]}) — Law-B chrome may not touch a Swan-branded surface`);
      }
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
      // TRUTH check 1: the commit must exist. `"commit": "deadbeef"` is a lie a shape check accepts
      // (Ox, Kimi, Grok, HY3, DeepSeek — branch gate 2026-08-25).
      if (b.commit && !/^[0-9a-f]{7,40}$/i.test(String(b.commit))) E(`budgets.commit is not a git object id: ${b.commit}`);
      else if (b.commit) {
        try { execFileSync('git', ['cat-file', '-e', `${b.commit}^{commit}`], { cwd: ctx.root, stdio: 'ignore' }); }
        catch { E(`budgets.commit ${b.commit} is not a commit in this repository — provenance names a commit that does not exist`); }
      }
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
    // similarityReviewed: an ARTIFACT, not a bit. Voxel Realm names what the review must exclude
    // (protected game assets, characters, UI, audio, trademarks, real likeness); a bare `true`
    // records only that someone typed true (Ox, HY3, Kimi, DeepSeek — branch gate 2026-08-25).
    const sr = p.similarityReviewed;
    if (!sr || typeof sr !== 'object') {
      E('provenance.similarityReviewed must be an object {reviewer, date, comparedAgainst[]} — a bare true is an honour bit, not a review');
    } else {
      if (!sr.reviewer) E('provenance.similarityReviewed.reviewer required (role or id)');
      if (!sr.date || !/^\d{4}-\d{2}-\d{2}/.test(String(sr.date))) E('provenance.similarityReviewed.date required (YYYY-MM-DD)');
      if (!Array.isArray(sr.comparedAgainst) || sr.comparedAgainst.length === 0) E('provenance.similarityReviewed.comparedAgainst must list what was compared (protected assets, characters, UI, audio, trademarks, likeness)');
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
          const rp = resolve(ctx.root, lic.receiptPath);
          if (rp !== ctx.root && !rp.startsWith(ctx.root + sep)) E(`license receiptPath escapes the repo: ${lic.receiptPath}`);
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
    if (!COMPRESSION_VALUES.has(rt.compression)) E(`runtime.compression must be one of ${[...COMPRESSION_VALUES].join(' | ')}, got ${JSON.stringify(rt.compression)}`);
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
      const bytes = readFileSync(abs);
      const got = createHash('sha256').update(bytes).digest('hex');
      if (got !== want) E(`sha256.${slot} MISMATCH — declared ${want.slice(0, 12)}…, actual ${got.slice(0, 12)}…`);
      if (slot !== 'collision') {
        try { (ctx.measuredTriangles = ctx.measuredTriangles || {})[slot] = measure(bytes).triangles; }
        catch (err) { E(`runtime.${slot} is not a parseable GLB: ${err.message}`); }
      }
      if (slot === 'lod0') {
        // Clip/skin PRESENCE, from the bytes. Until 2026-08-26 the validator checked clip NAMES
        // against the registry and never looked in the file: a manifest declaring a skeleton
        // and five animations passed on a GLB containing 0 skins and 0 clips (N1 self-review,
        // probe A). A name check against a list is not a presence check against the asset.
        try {
          const g = parseGlb(bytes);
          ctx.glbClips = new Set((g.animations || []).map((a) => a.name).filter(Boolean));
          ctx.glbSkins = (g.skins || []).length;
          ctx.aabb = ctx.aabb || {};
          ctx.aabb.lod0 = worldAabb(g);
        } catch { /* already reported as unparseable above */ }
      }
      if (slot === 'collision') {
        try { (ctx.aabb = ctx.aabb || {}).collision = worldAabb(parseGlb(bytes)); } catch { /* reported above */ }
      }
    }
    if (!rt.stillFallback) W('runtime.stillFallback missing — the still tier has no poster for this asset');
  }

  // TRUTH check 2 (after the runtime block has measured the GLBs): the declared numbers must
  // match the bytes. A stale or invented figure carrying honest-looking provenance is laundered,
  // which is worse than an obvious fake (Ox B2 re-read as the truth check it implied).
  if (b && typeof b === 'object' && ctx.measuredTriangles) {
    for (const lod of ['lod0', 'lod1', 'lod2']) {
      const declared = b[`${lod}Triangles`];
      const actual = ctx.measuredTriangles[lod];
      if (typeof declared === 'number' && typeof actual === 'number' && declared !== actual) {
        E(`budgets.${lod}Triangles declares ${declared} but ${lod}.glb measures ${actual} — provenance does not match the bytes`);
      }
    }
  }

  // TIER TABLE (GLM 5.3, N1 blocker 2): a budget that IS the measurement cannot be failed. The
  // registry's fractions are independent of any measurement; measured tiers must meet them.
  const tt = registry.budgetPolicy?.tierTable;
  if (tt && ctx.measuredTriangles?.lod0) {
    const l0 = ctx.measuredTriangles.lod0;
    for (const [lod, key] of [['lod1', 'lod1MaxFractionOfLod0'], ['lod2', 'lod2MaxFractionOfLod0']]) {
      const n = ctx.measuredTriangles[lod];
      if (typeof n === 'number' && typeof tt[key] === 'number' && n > l0 * tt[key]) {
        E(`${lod} measures ${n} tris = ${(n / l0 * 100).toFixed(0)}% of lod0 (${l0}); registry tier table allows ${tt[key] * 100}% — a "lower" tier that misses its budget is not a tier`);
      }
    }
  }
  // COLLISION CONTAINMENT (GLM 5.3, N1 blocker 6): visuals and collision come from different base
  // meshes. A collision hull that exceeds the visible silhouette gives phantom hits.
  if (manifest.runtime?.collision && manifest.runtime?.lod0 && (!ctx.aabb?.lod0 || !ctx.aabb?.collision)) {
    // Silence here would mean "containment not checked" reading exactly like "containment fine"
    // — the failure class this project keeps paying for.
    W(`collision containment UNCHECKED: no world-space AABB for ${!ctx.aabb?.lod0 ? 'lod0' : 'collision'} (a glTF with no nodes, or POSITION accessors without min/max)`);
  }
  if (ctx.aabb?.lod0 && ctx.aabb?.collision) {
    const eps = 1e-3;
    const a = ctx.aabb.lod0; const c = ctx.aabb.collision;
    for (let i = 0; i < 3; i += 1) {
      if (c.min[i] < a.min[i] - eps || c.max[i] > a.max[i] + eps) {
        E(`collision AABB (world space) exceeds lod0 AABB on axis ${'xyz'[i]} (collision ${c.min[i]}..${c.max[i]} vs lod0 ${a.min[i]}..${a.max[i]}) — phantom hits`);
        break;
      }
    }
  }

  if (manifest.skeleton && ctx.glbSkins !== undefined) {
    if (ctx.glbSkins === 0) E(`skeleton "${manifest.skeleton}" declared but lod0.glb contains no skin — a rig named in the manifest must exist in the bytes`);
    for (const clip of manifest.animations || []) {
      if (!ctx.glbClips?.has(clip)) E(`animation "${clip}" declared but not present in lod0.glb (clips in file: ${[...(ctx.glbClips || [])].join(', ') || 'none'})`);
    }
  }

  return { errs, warns };
}
