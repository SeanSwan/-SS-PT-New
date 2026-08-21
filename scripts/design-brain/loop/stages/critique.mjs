/**
 * stages/critique.mjs — CRITIQUE stage (S1): lanes over the deterministic meters.
 * ===============================================================================
 * S1's critic is deliberately mechanical: it sorts INSPECT's meter results into
 * the Keep / Fix-now lanes and marks which failures are on the mechanical
 * auto-apply whitelist. It emits NO aesthetic prose — the calibrated pairwise
 * LLM critic is S6, and per the panel (all six seats) an uncalibrated LLM
 * opinion is worse than none. The lanes exist now so S6 slots into a contract
 * that is already load-bearing, instead of arriving as a new unread artifact.
 */

/** Meters whose failures a machine may fix without a human (decision-rights: Objective). */
export const AUTO_APPLY_WHITELIST = new Set(['contrast']);

export function critiqueStage(ctx) {
  const inspect = ctx.artifacts.inspect;
  const keep = inspect.meters.filter((m) => m.pass).map((m) => ({ meter: m.meter, value: m.value }));
  const fix_now = inspect.meters
    .filter((m) => !m.pass)
    .map((m) => ({
      meter: m.meter,
      value: m.value,
      safe_auto_apply: AUTO_APPLY_WHITELIST.has(m.meter.split(':')[0]),
    }));
  return {
    render_id: inspect.render_id,
    keep,
    fix_now,
    // Honest placeholders, typed and empty — not fabricated opinions.
    elevate: [],
    wildcard: null,
    lanes_pending: ['elevate:S6', 'wildcard:S6'],
  };
}
