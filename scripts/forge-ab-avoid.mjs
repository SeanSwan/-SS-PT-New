#!/usr/bin/env node
/**
 * forge-ab-avoid.mjs — is the inlined kill-list helping or hurting?
 *
 * Every prompt now ends with "Rendering constraints — avoid: iridescent
 * gradient, lens flare, causeless particles, glassmorphism, literal creature
 * form, fantasy wallpaper, watermark, text artifacts." That was the right call
 * on paper — those bans are most of what separates Swan output from stock AI
 * art, and the parameter channel for them is dead twice over.
 *
 * But caption-trained models are known to FIXATE on nouns they are told to
 * avoid: "no swans" is a documented way to get swans. So the clause could be
 * actively degrading output, and nothing in this system would notice. That is an
 * unmeasured risk sitting in the default path of every generation.
 *
 * WHAT THIS MEASURES AUTOMATICALLY (and what it cannot):
 *   - acceptance rate: does the clause trip safety filters more often?
 *   - cost and latency delta
 *   - palette audit: does either arm drift toward the retired identity?
 *   - the clause is the ONLY difference; everything else is held identical
 * It CANNOT judge whether an image is good. That is Sean's eye, so the pairs are
 * written to disk side by side and named for comparison.
 *
 * SPEND: 2 x n images. Default n=3 => 6 images, ~$0.026.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileImage } from '../shared/swanPromptCompiler.mjs';
import { generate, capabilities } from '../shared/providers/openrouterImage.mjs';
import { appendRun } from '../shared/variantRun.mjs';
import { paletteAudit } from '../shared/pixels.mjs';
import { toBuffer } from '../shared/imageDimensions.mjs';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const ROOT = flag('root', process.cwd());
const N = Number(flag('n', 3));
const TEXT = flag('text', 'a frozen lake at dawn, cracked ice plates seen from above');
const OUT = '.ai-workflow/forge-runs/ab-avoid';
/** Short stable slug from the brief text so parallel briefs cannot collide. */
const SLUG = TEXT.toLowerCase().replace(/[^a-z0-9]+/g, '-').split('-').filter(Boolean).slice(0, 3).join('-');

if (!args.includes('--confirm-spend')) {
  console.error(`REFUSING: spends ~$${(2 * N * 0.00428).toFixed(4)} (${2 * N} images).`);
  console.error('Re-run with --confirm-spend --root <dir> [--n 3] [--text "..."]');
  process.exit(2);
}

const caps = capabilities();
const brief = { briefId: 'ab-avoid', text: TEXT, intent: 'hero', aspect: '16:9' };

/**
 * Build the two prompts. The WITH arm is exactly what the compiler emits today.
 * The WITHOUT arm is that same string with the clause removed — not a separately
 * compiled prompt, so the ONLY difference is the clause itself. Compiling twice
 * with different inputs would confound the comparison with slot differences.
 */
const compiled = compileImage(brief, caps);
const withClause = compiled.promptText;
const clauseStart = withClause.indexOf('Rendering constraints — avoid:');
if (clauseStart < 0) {
  console.error('The compiler no longer emits an avoid-clause — this A/B is obsolete.');
  process.exit(1);
}
const withoutClause = withClause.slice(0, clauseStart).trim();

console.log(`brief   ${TEXT}`);
console.log(`WITH    ${withClause}`);
console.log(`WITHOUT ${withoutClause}`);
console.log(`arms    ${N} per arm, ${2 * N} images total\n`);

mkdirSync(join(ROOT, OUT), { recursive: true });

async function arm(label, promptText) {
  const results = [];
  for (let i = 0; i < N; i += 1) {
    const t0 = Date.now();
    const shot = { ...compiled, promptText };
    try {
      const res = await generate(shot, { root: ROOT });
      const bytes = toBuffer(res.images[0]);
      // Namespaced by brief AND index. The first version wrote `with-1.png`
      // for every brief, so running three briefs generated six images and kept
      // two — the same generate-and-discard failure the ledger was built to end,
      // reintroduced in the harness measuring it.
      const file = `${SLUG}-${label}-${i + 1}.png`;
      writeFileSync(join(ROOT, OUT, file), bytes);
      const audit = paletteAudit(bytes);
      const rec = appendRun({
        briefId: `ab-avoid-${label}`, provider: res.model, model: res.model,
        brainVersion: res.brainVersion, serializer: res.promptStyle,
        promptText, aspectRequested: res.aspectRequested,
        actualWidth: res.actualWidth, actualHeight: res.actualHeight,
        costUsd: res.costUsd, wallMs: Date.now() - t0, status: 'ok',
        imageRef: join(OUT, file).split('\\').join('/'),
        imageBytes: bytes.length, notes: `A/B avoid-clause arm=${label}`,
      }, ROOT);
      results.push({ ok: true, file, cost: res.costUsd, wallMs: Date.now() - t0, audit, id: rec.variantId });
      console.log(`  ${label} ${i + 1}/${N}  ${file}  $${res.costUsd}  ${Date.now() - t0}ms  `
        + `avg ${audit.decoded ? audit.averageHex : '?'}  swan ${audit.decoded ? (audit.swanCoverage * 100).toFixed(1) + '%' : '?'}`);
    } catch (e) {
      results.push({ ok: false, code: e.code });
      console.log(`  ${label} ${i + 1}/${N}  FAILED ${e.code}`);
      appendRun({
        briefId: `ab-avoid-${label}`, provider: caps.provider, model: caps.modelVersion,
        serializer: compiled.promptStyle, promptText, status:
          e.code === 'E_PROVIDER_SAFETY_REJECT' ? 'safety-reject' : 'error',
        safetyEvents: e.code === 'E_PROVIDER_SAFETY_REJECT' ? [{ code: e.code }] : [],
        wallMs: Date.now() - t0, notes: `A/B avoid-clause arm=${label}: ${e.code}`,
      }, ROOT);
    }
  }
  return results;
}

const WITH = await arm('with', withClause);
const WITHOUT = await arm('without', withoutClause);

const stat = (rs) => {
  const ok = rs.filter((r) => r.ok);
  const dec = ok.filter((r) => r.audit?.decoded);
  return {
    accepted: `${ok.length}/${rs.length}`,
    cost: ok.reduce((s, r) => s + (r.cost || 0), 0).toFixed(4),
    wall: ok.length ? Math.round(ok.reduce((s, r) => s + r.wallMs, 0) / ok.length) : 0,
    swan: dec.length ? (dec.reduce((s, r) => s + r.audit.swanCoverage, 0) / dec.length * 100).toFixed(1) : '?',
    drift: dec.filter((r) => r.audit.driftsRetired).length,
  };
};

const a = stat(WITH);
const b = stat(WITHOUT);
console.log('\n  arm      accepted  cost     avg wall  swan-coverage  retired-drift');
console.log(`  WITH     ${a.accepted.padEnd(9)} $${a.cost}  ${String(a.wall).padEnd(9)} ${a.swan}%${' '.repeat(10)} ${a.drift}`);
console.log(`  WITHOUT  ${b.accepted.padEnd(9)} $${b.cost}  ${String(b.wall).padEnd(9)} ${b.swan}%${' '.repeat(10)} ${b.drift}`);

console.log(`\n  images: ${OUT}/  (with-1..${N}, without-1..${N})`);
console.log('\n  WHAT THIS DOES NOT ANSWER: which arm looks better. Nothing here can measure');
console.log('  that — the pairs are on disk for Sean. Acceptance rate, cost and palette');
console.log('  drift are the only claims this script is entitled to make.');
