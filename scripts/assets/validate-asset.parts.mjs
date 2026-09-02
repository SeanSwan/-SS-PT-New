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

const ON_SEVER = new Set(['kill', 'slow', 'none']);

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
