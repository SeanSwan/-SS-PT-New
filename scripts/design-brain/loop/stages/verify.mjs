/**
 * stages/verify.mjs — VERIFY stage (S3): re-measure EVERYTHING on the final file,
 * browser lane included, prove the round-trip, list regressions.
 * ==========================================================================================
 * Verification re-runs the full deterministic inspection — static meters AND
 * the real-browser lane — against the file REVISE left on disk. A revision
 * that fixed one meter and broke a browser meter is caught here, not shipped.
 * The skeleton round-trip (stamps + zone + section-type sequence re-extracted
 * fresh from disk) remains the IR-A/code-B forgery check.
 */
import { inspectAll } from './inspect.mjs';

export async function verifyStage(ctx) {
  const finalRender = ctx.artifacts.revise ?? ctx.artifacts.render;
  const { meters } = await inspectAll(ctx, finalRender);

  const failed = meters.filter((m) => !m.pass);
  const roundtrip = meters.find((m) => m.meter === 'skeleton_stamp');
  const zones = meters.find((m) => m.meter === 'zones_roundtrip');
  const types = meters.find((m) => m.meter === 'section_types_roundtrip');

  return {
    all_meters_pass: failed.length === 0,
    skeleton_roundtrip_ok: Boolean(roundtrip?.pass && zones?.pass && types?.pass),
    regressions: failed.map((m) => ({ meter: m.meter, value: m.value })),
    meters_total: meters.length,
  };
}
