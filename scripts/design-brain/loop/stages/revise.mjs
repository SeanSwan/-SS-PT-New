/**
 * stages/revise.mjs — REVISE stage (S1): whitelisted mechanical fixes only.
 * =========================================================================
 * Decision-rights matrix (blueprint §3): only Objective-class failures are
 * auto-applied, each fix must be re-measurable, and an unfixable finding is
 * carried forward EXPLICITLY — never silently dropped. S1's one implemented
 * fix: a failing contrast pair re-renders with the highest-contrast text
 * token (Frost White). Directional/aesthetic changes are out of scope by
 * doctrine until S6 renders them as alternatives for Sean.
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderHtml, platesFromPlan } from './render.mjs';

export function reviseStage(ctx) {
  const { critique, ir, content, render, materials } = ctx.artifacts;
  const contrastFails = critique.fix_now.filter((f) => f.safe_auto_apply && f.meter.startsWith('contrast:'));

  if (!contrastFails.length) {
    // Nothing on the whitelist failed — re-emit the render unchanged, with provenance.
    return { ...render, render_id: render.render_id, revision: 'none-needed', unfixed: critique.fix_now.map((f) => f.meter) };
  }

  // Plates ride the revision. Dropping them here shipped an awe surface with no
  // hero while every meter passed — the plan said one plate, the page had none.
  const html = renderHtml(ir, content, { textToken: 'text', plates: platesFromPlan(materials, ctx.runDir) });
  const htmlPath = join(ctx.runDir, 'render.revised.html');
  writeFileSync(htmlPath, html);
  return {
    render_id: render.render_id,
    layout_ir_id: ir.layout_ir_id,
    content_model_id: content.content_model_id,
    html_path: htmlPath,
    html_hash: createHash('sha256').update(html).digest('hex').slice(0, 16),
    revision: `contrast-token-swap (${contrastFails.map((f) => f.meter).join(', ')})`,
    unfixed: critique.fix_now.filter((f) => !f.safe_auto_apply).map((f) => f.meter),
  };
}
