#!/usr/bin/env node
/**
 * validate-asset.parts.mjs — the roster-v2 PART contract rules (dismemberment, D1 2026-09-01).
 *
 * Split from validate-asset.rules.mjs at birth: that file sat at 292 lines against the repo's
 * 300-line cap, and its own header names the split as the seam. Same discipline as
 * validate-asset.budgets.mjs — pure, no I/O, called with the shared E() collector.
 *
 * What a part IS (AFTERTASTE-ROSTER-V2-DISMEMBERMENT-CONTRACT-2026-09-01.md §1):
 * a named chunk from the skeleton's vocabulary, owning exactly one bone, carrying its own hit
 * shape. Exactly one non-severable "body" anchors the monster; severable parts declare when they
 * detach (severAtHpFraction of the one hp pool) and what that does (onSever).
 *
 * D2 will add shape-coverage checks against pipeline-emitted part bounds; D1 is structural —
 * the shapes here are validated for FORM, their honesty against geometry arrives with the
 * geometry that can prove it.
 */

import { namedPartAabbs } from './measure-glb.mjs';

const ON_SEVER = new Set(['kill', 'slow', 'none']);

/** A hit shape must cover at least this fraction of its part's longest half-extent — the GLM-round
 *  floor (Flash F4) applied per part: below it, shots visibly through the rendered part miss. */
const SHAPE_COVERAGE_FLOOR = 0.8;

const vec3 = (v) => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n));

function checkShape(shape, where, E) {
  if (!shape || typeof shape !== 'object') { E(`${where}: missing hitShape`); return; }
  if (shape.kind === 'sphere') {
    if (!vec3(shape.c)) E(`${where}: sphere hitShape needs c [x,y,z]`);
    if (!(typeof shape.r === 'number' && shape.r > 0)) E(`${where}: sphere hitShape radius must be > 0`);
  } else if (shape.kind === 'capsule') {
    if (!vec3(shape.a) || !vec3(shape.b)) E(`${where}: capsule hitShape needs BOTH endpoints a and b [x,y,z]`);
    if (!(typeof shape.r === 'number' && shape.r > 0)) E(`${where}: capsule hitShape radius must be > 0`);
  } else {
    E(`${where}: hitShape kind must be sphere or capsule, got ${JSON.stringify(shape.kind)}`);
  }
}

/** Validate manifest.parts against the skeleton contract. No-op when parts is absent. */
export function checkParts(manifest, skeletons, E) {
  const parts = manifest.parts;
  if (parts === undefined) return;
  if (!Array.isArray(parts) || parts.length === 0) { E('parts must be a non-empty array'); return; }

  const sk = skeletons.get(manifest.skeleton);
  if (!sk) { E('parts declared but no valid skeleton to check them against'); return; }
  if (!Array.isArray(sk.partVocabulary)) {
    E(`skeleton "${manifest.skeleton}" has no partVocabulary — parts need a v2+ skeleton contract`);
    return;
  }
  const vocab = new Set(sk.partVocabulary);
  const bones = new Set(sk.bones ?? []);
  const seen = new Set();
  let anchors = 0;

  for (const p of parts) {
    const where = `part "${p?.tag ?? '?'}"`;
    if (!vocab.has(p.tag)) E(`${where}: tag ${JSON.stringify(p.tag)} is not in ${manifest.skeleton} partVocabulary (${sk.partVocabulary.join(', ')})`);
    if (seen.has(p.tag)) E(`duplicate part tag "${p.tag}" — a part owns its name`);
    seen.add(p.tag);
    if (!bones.has(p.bone)) E(`${where}: bone ${JSON.stringify(p.bone)} is not in ${manifest.skeleton} bones (${(sk.bones ?? []).join(', ')})`);
    checkShape(p.hitShape, where, E);

    if (p.severable === false) {
      if (p.tag === 'body') anchors += 1;
    } else if (p.severable === true) {
      if (!(typeof p.severAtHpFraction === 'number' && p.severAtHpFraction >= 0 && p.severAtHpFraction <= 1)) {
        E(`${where}: severable part needs severAtHpFraction in 0..1 (the hp-pool threshold at which it detaches)`);
      }
      if (!ON_SEVER.has(p.onSever)) E(`${where}: onSever must be one of ${[...ON_SEVER].join('/')}, got ${JSON.stringify(p.onSever)}`);
    } else {
      E(`${where}: severable must be true or false — an absent field is not a decision`);
    }
  }

  if (anchors !== 1) E(`parts must contain exactly one non-severable "body" anchor, found ${anchors}`);
}

/**
 * D2: the shapes must be HONEST against the bytes. Runs after the runtime block has parsed lod0
 * (ctx.glbLod0, ctx.aabb.lod0). Declared parts must exist as "part:<tag>" meshes in the GLB and
 * vice versa; each shape must cover >= SHAPE_COVERAGE_FLOOR of its part's longest half-extent and
 * sit inside its part's bounds. Everything is compared in the NORMALIZED frame the game renders
 * in (1 unit tall, footprint centred, feet at y=0) — the same transform Monster.jsx applies, so
 * the manifest, the validator, and the renderer can never disagree about where a part is.
 * Unable-to-verify is an ERROR, not a warn — the canary lesson (2026-08-27).
 */
export function checkPartsGeometry(manifest, ctx, E) {
  const declared = Array.isArray(manifest.parts) ? manifest.parts : null;
  const g = ctx.glbLod0;
  if (!g) {
    if (declared) E('parts declared but lod0 bytes were not parseable — part geometry UNVERIFIED is a refusal, not a pass');
    return;
  }
  const boxes = namedPartAabbs(g);
  const tagsInBytes = Object.keys(boxes);
  if (!declared) {
    if (tagsInBytes.length) E(`lod0 contains part-tagged meshes (${tagsInBytes.join(', ')}) but the manifest declares no parts — bytes and manifest must agree`);
    return;
  }
  const whole = ctx.aabb?.lod0;
  if (!whole) { E('parts declared but no lod0 world AABB — part geometry UNVERIFIED is a refusal'); return; }
  const height = whole.max[1] - whole.min[1];
  if (!(height > 0)) { E('parts declared but lod0 has zero height — nothing to normalize against'); return; }
  const s = 1 / height;
  const cx = (whole.min[0] + whole.max[0]) / 2;
  const cz = (whole.min[2] + whole.max[2]) / 2;
  const norm = (v) => [(v[0] - cx) * s, (v[1] - whole.min[1]) * s, (v[2] - cz) * s];

  for (const p of declared) {
    const box = boxes[p.tag];
    if (!box) { E(`part "${p.tag}" declared but lod0 has no mesh node named "part:${p.tag}"`); continue; }
    const mn = norm(box.min); const mx = norm(box.max);
    const half = [(mx[0] - mn[0]) / 2, (mx[1] - mn[1]) / 2, (mx[2] - mn[2]) / 2];
    const longestHalf = Math.max(...half);
    const sh = p.hitShape ?? {};
    const centre = sh.kind === 'sphere' ? sh.c
      : sh.kind === 'capsule' && Array.isArray(sh.a) && Array.isArray(sh.b)
        ? [0, 1, 2].map((k) => (sh.a[k] + sh.b[k]) / 2) : null;
    const reach = sh.kind === 'sphere' ? sh.r
      : sh.kind === 'capsule' && centre ? Math.hypot(sh.b[0] - sh.a[0], sh.b[1] - sh.a[1], sh.b[2] - sh.a[2]) / 2 + sh.r : 0;
    if (!centre) continue; // form errors already reported by checkParts
    const tol = longestHalf * 0.1 + 1e-6;
    const inside = [0, 1, 2].every((k) => centre[k] >= mn[k] - tol && centre[k] <= mx[k] + tol);
    if (!inside) E(`part "${p.tag}": hitShape centre [${centre.map((n) => n.toFixed(2)).join(', ')}] lies outside the part's normalized bounds y ${mn[1].toFixed(2)}..${mx[1].toFixed(2)} — the shape stands beside the part it stands in for`);
    if (!(reach >= SHAPE_COVERAGE_FLOOR * longestHalf)) {
      E(`part "${p.tag}": hitShape reaches ${reach.toFixed(2)} against a longest half-extent of ${longestHalf.toFixed(2)} — under the ${SHAPE_COVERAGE_FLOOR * 100}% coverage floor, shots through the rendered part would miss`);
    }
  }
  for (const tag of tagsInBytes) {
    if (!declared.some((p) => p.tag === tag)) E(`lod0 mesh "part:${tag}" is not declared in manifest.parts — an undeclared part is invisible to the gate`);
  }
}
