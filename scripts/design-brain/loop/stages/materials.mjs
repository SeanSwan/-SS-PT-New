/**
 * stages/materials.mjs — MATERIALS stage: surface-typed material policy.
 * ======================================================================
 * S1 shipped the POLICY seam (`type_data` runs on typography + real data,
 * zero spend) and made `awe_photo` fail loudly rather than fake a hero.
 * S5 plugs the resolvers in behind that same contract.
 *
 * Panel reversal (Grok 4.4 / blueprint §S5), enforced here: **never one plate
 * world skinned N ways.** The audit's shared-pack rule would hand every
 * direction the same poster with different padding — the fastest known route
 * back to template sameness. So plates are fitted to the CHOSEN DIRECTION'S
 * FOCAL GEOMETRY, and the fit is checked across the whole fleet, not asserted.
 *
 * The crop id is derived from GEOMETRY (hero mechanics family, grid family,
 * section sequence, module cardinality) and deliberately NOT from
 * `skeleton_id`. Deriving it from the id would make distinctness tautological —
 * different ids, different hashes, law "proven" by construction and enforcing
 * nothing. Derived from geometry, two directions that merely recolor each other
 * collide, and the collision is a HALT. That is a real gate.
 *
 * Resolution order per plate slot: ranked vault exemplar -> Forge pack lineage
 * id -> loud refusal. There is no fourth branch, because the fourth branch is
 * always "render a gradient and call it a hero".
 */
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { irFingerprint } from '../ir.mjs';
import { readVault, consumable, selectExemplars } from '../vault/vault.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_VAULT_ROOT = join(HERE, '..', 'vault', 'exemplars', 'swan');

/** Section types that carry an image plate under `awe_photo`. Everything else is type+data. */
export const PLATE_SECTIONS = Object.freeze(['hero', 'media-plate', 'narrative-chapter']);

const sha = (obj) => createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 12);

/**
 * Crop id for one zone of one direction, computed from a structural
 * fingerprint (the fleet-comparable shape) — see the docblock on why this
 * excludes skeleton_id.
 */
export function slotCropId(fingerprint, zoneIndex) {
  return `crop-${sha({
    hero: fingerprint.hero,
    grid: fingerprint.grid,
    seq: fingerprint.sections.join('>'),
    section: fingerprint.sections[zoneIndex] ?? null,
    cardinality: fingerprint.cardinalities[zoneIndex] ?? 0,
    cards: fingerprint.cards,
    i: zoneIndex,
  })}`;
}

/** Index of the first plate-bearing section in a fingerprint, or -1. */
const firstPlateIndex = (fp) => fp.sections.findIndex((s) => PLATE_SECTIONS.includes(s));

/**
 * Fleet-wide enforcement of "never one plate world skinned N ways": two
 * directions in the same round may not resolve the same hero crop. Throws with
 * both offenders named — a silent dedupe here would hide mode collapse behind
 * a passing run.
 */
export function assertDistinctHeroCrops(fleet) {
  const seen = new Map();
  for (const d of fleet) {
    const fp = d.fingerprint;
    if (!fp || !Array.isArray(fp.sections)) continue;
    const i = firstPlateIndex(fp);
    if (i < 0) continue;
    const crop = slotCropId(fp, i);
    if (seen.has(crop)) {
      throw new Error(
        `awe_photo: directions "${seen.get(crop)}" and "${d.skeleton_id}" resolve the SAME hero crop (${crop}) — `
        + 'one plate world skinned twice is the shared-pack failure the blueprint reverses; diverge the geometry, do not reuse the plate',
      );
    }
    seen.set(crop, d.skeleton_id);
  }
  return seen;
}

/** Resolve one plate slot: ranked exemplar, else Forge lineage, else null (caller halts). */
function resolvePlate({ pool, lineage, zone, family, crop }) {
  const [exemplar] = selectExemplars(pool, { skeleton_family: family, verdict: 'win', limit: 1 });
  if (exemplar) {
    return {
      slot: zone.zone, plate: true, crop_id: crop,
      source_kind: 'exemplar', source_ref: exemplar.id,
      resolution: `exemplar:${exemplar.id}@${crop}`,
      asset_path: exemplar.image_path,
      signature_moment: exemplar.signature_moment,
    };
  }
  const hit = lineage.find((l) => l.zone === zone.zone);
  if (hit) {
    return {
      slot: zone.zone, plate: true, crop_id: crop,
      source_kind: 'lineage', source_ref: hit.lineage_id,
      resolution: `lineage:${hit.lineage_id}@${crop}`,
    };
  }
  return null;
}

/** The `awe_photo` branch: fleet crop check, then per-zone resolution. */
function awePhotoPlan(ctx, ir) {
  const brief = ctx.brief;
  const vault = ctx.vault ?? readVault(ctx.vaultRoot ?? DEFAULT_VAULT_ROOT);
  if (vault.defects.length) {
    throw new Error(`awe_photo: the exemplar vault is defective — steering from a broken vault is worse than failing:\n  - ${vault.defects.join('\n  - ')}`);
  }
  const allowFixtures = brief.allow_fixture_exemplars === true;
  const pool = consumable(vault.exemplars, { allowFixtures });
  const lineage = Array.isArray(brief.material_lineage) ? brief.material_lineage : [];

  const fleet = ir.direction_set?.fleet ?? [];
  assertDistinctHeroCrops(fleet);

  const fp = irFingerprint(ir);
  const family = fp.hero;
  const slots = ir.zones.map((zone, i) => {
    if (!PLATE_SECTIONS.includes(zone.section_type)) {
      return { slot: zone.zone, plate: false, resolution: `typography+data:${zone.content_slot}` };
    }
    const resolved = resolvePlate({ pool, lineage, zone, family, crop: slotCropId(fp, i) });
    if (!resolved) {
      throw new Error(
        `awe_photo: zone "${zone.zone}" (${zone.section_type}) has no ranked exemplar for family "${family}" `
        + `and no Forge lineage id — ${pool.length} consumable exemplar(s) in the vault`
        + (allowFixtures ? '' : `, ${vault.exemplars.length} total before the fixture gate`)
        + '. Refusing to invent a hero.',
      );
    }
    return resolved;
  });

  return {
    material_plan_id: `mat-${ir.layout_ir_id}`,
    layout_ir_id: ir.layout_ir_id,
    strategy: 'awe_photo',
    slots,
    fixtures_allowed: allowFixtures,
    vault_evidence: {
      root: vault.root,
      total: vault.exemplars.length,
      consumable: pool.length,
      plate_slots: slots.filter((s) => s.plate).length,
      fleet_hero_crops: fleet.length,
    },
  };
}

export function materialsStage(ctx) {
  const ir = ctx.artifacts.ir;
  const strategy = ctx.brief.material_strategy;
  if (!['awe_photo', 'type_data', 'print_none'].includes(strategy)) {
    throw new Error('brief.material_strategy must be awe_photo | type_data | print_none');
  }
  if (strategy === 'awe_photo') return awePhotoPlan(ctx, ir);
  return {
    material_plan_id: `mat-${ir.layout_ir_id}`,
    layout_ir_id: ir.layout_ir_id,
    strategy,
    slots: ir.zones.map((z) => ({
      slot: z.zone,
      plate: false,
      resolution: strategy === 'type_data' ? `typography+data:${z.content_slot}` : 'print:none',
    })),
  };
}
