#!/usr/bin/env node
/**
 * bakeoff.mjs — blind image-model bake-off for the exemplar vault (S5).
 * =====================================================================
 * BLUEPRINT §S5: "Bake-off before building — 3–5 image models × 10 briefs,
 * blind-ranked, cost/latency recorded. Verify the foundation can hit the bar
 * before constructing on it."
 *
 * This harness EXTENDS the existing Forge (`shared/swanPromptCompiler`,
 * `shared/providers/openrouterImage`, `shared/variantRun`, `shared/contactSheet`).
 * It deliberately reinvents no generation, no lineage and no spend accounting —
 * a parallel implementation of any of those is how two ledgers start disagreeing
 * about what was actually charged.
 *
 * SPEND LAW (handoff §1.6, Rule 16). Firing this costs real money, so:
 *   - the default invocation is a FREE estimate and generates nothing;
 *   - generation requires an explicit `--confirm-spend`;
 *   - a hard `--cap` is enforced against the estimate BEFORE the first call,
 *     and again against actual spend between calls;
 *   - a failed generation is recorded and skipped, never retried — an auto-retry
 *     is an unbudgeted second charge.
 *
 * BLINDING. The ranking sheet Sean sees carries anonymous labels only. Model
 * names, per-image cost and latency live in `key.json`, written beside the sheet
 * but not linked from it — cost alone de-anonymizes a model, so the blind sheet
 * withholds it. Un-blind AFTER ranking.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { compileImage } from '../../../shared/swanPromptCompiler.mjs';
import { buildContactSheet } from '../../../shared/contactSheet.mjs';
import { appendRun, buildRecord, newVariantId, readRuns } from '../../../shared/variantRun.mjs';

/**
 * Doctrine adjectives are banned from generator-facing prompts (blueprint §1.3).
 * A generator resolves "cinematic" into glow and blur — the adjective IS the
 * slop pathway. Intent lives in concrete subject, optics and light instead.
 */
export const DOCTRINE_ADJECTIVES = Object.freeze([
  'cinematic', 'crystalline', 'awe', 'awe-inspiring', 'premium', 'luxury',
  'stunning', 'breathtaking', 'epic', 'majestic', 'ethereal', 'dreamlike',
]);

export function adjectiveDefects(text) {
  const lower = String(text ?? '').toLowerCase();
  return DOCTRINE_ADJECTIVES
    .filter((a) => new RegExp(`\\b${a.replace(/[-]/g, '\\-')}\\b`).test(lower))
    .map((a) => `doctrine adjective "${a}" in a generator prompt — say what the camera sees instead`);
}

/**
 * The fixed 10. Held constant across models so the comparison is of MODELS, not
 * of prompts. Subjects follow Sean's documented visual vocabulary (NatGeo-grade
 * landscape and wildlife, ultra-realistic) stated as concrete optics and light,
 * never as doctrine adjectives.
 */
export const PLATE_BRIEFS = Object.freeze([
  { id: 'p01-glacier-face', text: 'the calving face of a tidewater glacier under flat overcast light, meltwater streaking the ice', intent: 'hero', surfaceClass: 'marketing', aspect: '16:9' },
  { id: 'p02-ridge-dawn', text: 'a granite ridgeline at first light, valley fog held below the treeline', intent: 'hero', surfaceClass: 'marketing', aspect: '16:9' },
  { id: 'p03-reef-island', text: 'a reef island photographed from a low aircraft, shallow water banding from sand to deep channel', intent: 'hero', surfaceClass: 'marketing', aspect: '16:9' },
  { id: 'p04-seed-field', text: 'wind moving across a field of seed heads at golden hour, long lens compression', intent: 'ambient', surfaceClass: 'marketing', aspect: '16:9' },
  { id: 'p05-heron-strike', text: 'a heron mid-strike in shallow water, droplets frozen, dark bank behind', intent: 'hero', surfaceClass: 'marketing', aspect: '3:2' },
  { id: 'p06-snow-leopard', text: 'a snow leopard on scree at dusk, coat pattern breaking against the rock', intent: 'hero', surfaceClass: 'marketing', aspect: '3:2' },
  { id: 'p07-kelp-canopy', text: 'a kelp forest from below, sunlight shafts through the canopy, particulate in the water column', intent: 'ambient', surfaceClass: 'marketing', aspect: '2:3' },
  { id: 'p08-basalt-coast', text: 'black basalt sea stacks in long-exposure surf under a low grey sky', intent: 'ambient', surfaceClass: 'marketing', aspect: '16:9' },
  { id: 'p09-frost-macro', text: 'frost crystals on a single blade of grass, macro, shallow depth of field', intent: 'texture', surfaceClass: 'in-app', aspect: '1:1' },
  { id: 'p10-storm-plain', text: 'a supercell over open plain, dust lifting at the base, late afternoon', intent: 'hero', surfaceClass: 'marketing', aspect: '16:9' },
]);

const MEASURED_FALLBACK = 0.003736;

/** Per-image cost read from THIS ledger's history — the same basis forge.mjs uses. */
function unitCost(root) {
  const priced = readRuns(root).runs.filter((r) => r.status === 'ok' && typeof r.costUsd === 'number');
  if (!priced.length) return { usd: MEASURED_FALLBACK, basis: 'one measured call (no history yet)' };
  const recent = priced.slice(-20);
  return { usd: recent.reduce((s, r) => s + r.costUsd, 0) / recent.length, basis: `mean of last ${recent.length} real generation(s)` };
}

export function estimateSpend({ models, briefs = PLATE_BRIEFS, root = process.cwd() }) {
  const images = models.length * briefs.length;
  const unit = unitCost(root);
  return {
    images, models: models.length, briefs: briefs.length,
    unit_usd: unit.usd, basis: unit.basis,
    worst_case_usd: Math.round(images * unit.usd * 1e4) / 1e4,
  };
}

/** Deterministic order shuffle — blind but replayable (no Math.random, per §1.7). */
export function blindOrder(n, seed = 'swan-bakeoff') {
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const j = h % (i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

/**
 * Fire the bake-off. `generate` is injected, so tests exercise the whole harness
 * at zero spend; the CLI lazy-loads the real provider only AFTER the spend gate
 * has passed — importing a paid provider is not the same as calling it, but the
 * gate reads more honestly when the paid module is not even loaded until then.
 */
export async function runBakeoff({
  models, briefs = PLATE_BRIEFS, generate, root = process.cwd(), outDir,
  confirmSpend = false, capUsd = 1, saveImage, seed = 'swan-bakeoff',
  now = () => new Date().toISOString(),
}) {
  if (!Array.isArray(models) || models.length < 2) throw new Error('bakeoff: 2+ models required — a bake-off of one is just a generation');
  if (!outDir) throw new Error('bakeoff: outDir required');
  for (const b of briefs) {
    const defects = adjectiveDefects(b.text);
    if (defects.length) throw new Error(`bakeoff: brief ${b.id} — ${defects.join('; ')}`);
  }
  const est = estimateSpend({ models, briefs, root });
  if (!confirmSpend) {
    throw new Error(
      `bakeoff: REFUSING to generate without confirmSpend. Worst case $${est.worst_case_usd} `
      + `(${est.images} images @ ~$${est.unit_usd.toFixed(6)}, ${est.basis}). `
      + 'Show this figure to Sean and get an explicit yes first.',
    );
  }
  if (est.worst_case_usd > capUsd) {
    throw new Error(`bakeoff: estimate $${est.worst_case_usd} exceeds cap $${capUsd} — raise the cap deliberately or cut models/briefs`);
  }

  mkdirSync(outDir, { recursive: true });
  const results = [];
  let spent = 0;
  let halted = null;

  outer:
  for (const model of models) {
    for (const brief of briefs) {
      const started = Date.now();
      const variantId = newVariantId();
      let row;
      try {
        const compiled = compileImage({ ...brief }, {});
        const res = await generate(compiled, { model });
        const costUsd = typeof res?.costUsd === 'number' ? res.costUsd : est.unit_usd;
        spent += costUsd;
        const imageRef = saveImage ? await saveImage(res, { variantId, outDir }) : (res?.imageRef ?? null);
        row = { model, briefId: brief.id, variantId, status: 'ok', costUsd, wallMs: Date.now() - started, imageRef, promptSha: compiled?.promptSha ?? null };
      } catch (err) {
        // Recorded, never retried — a retry is an unbudgeted second charge.
        row = { model, briefId: brief.id, variantId, status: 'error', costUsd: 0, wallMs: Date.now() - started, imageRef: null, error: err.message };
      }
      results.push(row);
      try {
        appendRun(buildRecord({
          briefId: `bakeoff:${brief.id}`, provider: 'openrouter', model,
          serializer: 'swanPromptCompiler', status: row.status === 'ok' ? 'ok' : 'error',
          variantId, costUsd: row.costUsd, wallMs: row.wallMs,
        }), root);
      } catch { /* ledger append is best-effort; the bake-off report is the record of truth */ }
      if (spent > capUsd) {
        halted = `hard cap $${capUsd} reached after $${spent.toFixed(4)}`;
        break outer;
      }
    }
  }
  return finish({ results, models, briefs, outDir, root, spent, halted, seed, now });
}

/** Write the blind sheet, the ranking sheet and the sealed key. */
function finish({ results, models, briefs, outDir, root, spent, halted, seed, now }) {
  const order = blindOrder(results.length, seed);
  const labelled = order.map((i, n) => ({ ...results[i], label: `A${String(n + 1).padStart(2, '0')}` }));
  const ok = labelled.filter((r) => r.status === 'ok');

  // Blind rows: cost and latency are WITHHELD — either alone de-anonymizes a model.
  const sheetRows = ok.map((r) => ({ variantId: r.label, imageRef: r.imageRef, status: 'ok', intent: r.briefId, winner: false }));
  let sheetPath = join(outDir, 'contact-sheet.html');
  try {
    const sheet = buildContactSheet(sheetRows, root, { sheetDir: outDir, title: 'Bake-off — blind' });
    writeFileSync(sheetPath, typeof sheet === 'string' ? sheet : (sheet?.html ?? String(sheet)));
  } catch (err) {
    // A failed sheet is reported, not swallowed — the ranking sheet still works.
    writeFileSync(join(outDir, 'contact-sheet.ERROR.txt'), `contact sheet failed: ${err.message}\n`);
    sheetPath = null;
  }

  const ranking = [
    '# Bake-off ranking sheet (BLIND)',
    '',
    'Mark every row before opening `key.json`. Opening the key first contaminates the ranking.',
    '',
    '| label | brief | verdict (win/fail/borderline) | note |',
    '|---|---|---|---|',
    ...ok.map((r) => `| ${r.label} | ${r.briefId} |  |  |`),
    '',
    'A `win` row becomes an exemplar sidecar in `vault/exemplars/swan/win/`.',
    '',
  ].join('\n');
  writeFileSync(join(outDir, 'RANKING-SHEET.md'), ranking);

  const byModel = models.map((m) => {
    const rows = results.filter((r) => r.model === m);
    const good = rows.filter((r) => r.status === 'ok');
    const times = good.map((r) => r.wallMs).sort((a, b) => a - b);
    return {
      model: m, attempted: rows.length, ok: good.length, failed: rows.length - good.length,
      cost_usd: Math.round(good.reduce((s, r) => s + r.costUsd, 0) * 1e4) / 1e4,
      median_ms: times.length ? times[Math.floor(times.length / 2)] : null,
    };
  });

  const key = {
    generated_at: now(),
    spend_usd: Math.round(spent * 1e4) / 1e4,
    halted: halted ?? null,
    models: byModel,
    briefs: briefs.map((b) => b.id),
    map: labelled.map((r) => ({
      label: r.label, model: r.model, brief: r.briefId, variantId: r.variantId,
      status: r.status, costUsd: r.costUsd, wallMs: r.wallMs, error: r.error ?? null,
    })),
  };
  writeFileSync(join(outDir, 'key.json'), JSON.stringify(key, null, 2));
  return { results: labelled, key, byModel, sheetPath, rankingPath: join(outDir, 'RANKING-SHEET.md'), spend_usd: key.spend_usd, halted: halted ?? null };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv.slice(2);
  const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
  const models = String(flag('models', '')).split(',').map((s) => s.trim()).filter(Boolean);
  if (models.length < 2) {
    console.error('usage: bakeoff.mjs --models a,b[,c] [--cap 1.00] [--out <dir>] [--confirm-spend]');
    process.exit(1);
  }
  const est = estimateSpend({ models });
  console.log(`[bakeoff] ${est.models} model(s) x ${est.briefs} brief(s) = ${est.images} images`);
  console.log(`[bakeoff] worst case ~$${est.worst_case_usd} (unit $${est.unit_usd.toFixed(6)}, ${est.basis})`);
  if (!argv.includes('--confirm-spend')) {
    console.log('[bakeoff] ESTIMATE ONLY — nothing generated, nothing charged.');
    console.log('[bakeoff] Show this figure to Sean; re-run with --confirm-spend only after an explicit yes.');
    process.exit(0);
  }
  const { generate } = await import('../../../shared/providers/openrouterImage.mjs');
  const { saveImage } = await import('../../../shared/bracket.mjs');
  const outDir = flag('out', join(process.cwd(), '.ai-workflow', 'bakeoff'));
  const r = await runBakeoff({ models, generate, saveImage, outDir, confirmSpend: true, capUsd: Number(flag('cap', '1')) });
  console.log(`[bakeoff] spent $${r.spend_usd}${r.halted ? ` (HALTED: ${r.halted})` : ''}`);
  console.log(`[bakeoff] sheet ${r.sheetPath ?? '(failed — see contact-sheet.ERROR.txt)'} · ranking ${r.rankingPath}`);
  console.log('[bakeoff] rank the BLIND sheet before opening key.json.');
}
