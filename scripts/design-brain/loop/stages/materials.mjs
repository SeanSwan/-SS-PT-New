/**
 * stages/materials.mjs — MATERIALS stage (S1): surface-typed material policy.
 * ===========================================================================
 * Panel reversal (Grok 4.4, accepted in the blueprint): materials are NOT a
 * universal pre-layout stage — strategy is typed per surface
 * (awe_photo | type_data | print_none) and co-evolves with the chosen
 * structure. S1 ships the POLICY seam: the walking-skeleton page runs
 * `type_data` (real data IS the material; zero image generation, zero spend).
 * S5 plugs the Forge in behind this same contract for awe surfaces.
 *
 * The gate this stage feeds refuses unresolved slots: every material slot
 * names an asset reference or an EXPLICIT `pending:S5` marker — a silent
 * empty slot is how gradient-as-hero slop sneaks in.
 */

export function materialsStage(ctx) {
  const ir = ctx.artifacts.ir;
  const strategy = ctx.brief.material_strategy;
  if (!['awe_photo', 'type_data', 'print_none'].includes(strategy)) {
    throw new Error('brief.material_strategy must be awe_photo | type_data | print_none');
  }
  if (strategy === 'awe_photo') {
    // The Forge integration is S5. Until it lands, an awe surface cannot
    // pretend its material slots are satisfiable — fail loudly, do not fake.
    throw new Error('awe_photo strategy requires the S5 Forge integration — not available in the S1 walking skeleton');
  }
  return {
    material_plan_id: `mat-${ir.layout_ir_id}`,
    layout_ir_id: ir.layout_ir_id,
    strategy,
    slots: ir.zones.map((z) => ({
      slot: z.zone,
      resolution: strategy === 'type_data' ? `typography+data:${z.content_slot}` : 'print:none',
    })),
  };
}
