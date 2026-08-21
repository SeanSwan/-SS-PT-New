/**
 * stages/verify.mjs — VERIFY stage (S1): re-measure, prove the round-trip, list regressions.
 * ==========================================================================================
 * Two proofs close the loop's build half:
 *  1. Every meter passes after revision (or the failure is explicitly carried
 *     in `regressions` — a run may finish honest-red, it may not finish vague).
 *  2. Skeleton round-trip: the FILE ON DISK re-inspected fresh must stamp the
 *     gated IR's skeleton and reproduce its zones (Grok 4.1 — the model cannot
 *     emit IR-A and ship code-B; tampering with the render after RENDER is
 *     caught here, not trusted from memory).
 */
import { readFileSync } from 'node:fs';

import { inspectHtml } from './inspect.mjs';

export function verifyStage(ctx) {
  const finalRender = ctx.artifacts.revise ?? ctx.artifacts.render;
  const html = readFileSync(finalRender.html_path, 'utf8');
  const meters = inspectHtml(html, ctx.artifacts.ir);

  const failed = meters.filter((m) => !m.pass);
  const roundtrip = meters.find((m) => m.meter === 'skeleton_stamp');
  const zones = meters.find((m) => m.meter === 'zones_roundtrip');

  return {
    all_meters_pass: failed.length === 0,
    skeleton_roundtrip_ok: Boolean(roundtrip?.pass && zones?.pass),
    regressions: failed.map((m) => ({ meter: m.meter, value: m.value })),
    meters_total: meters.length,
  };
}
