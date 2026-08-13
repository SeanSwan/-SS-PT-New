#!/usr/bin/env node
/**
 * forge.mjs — the CLI. describe -> see options -> pick -> refine.
 *
 *   node scripts/forge.mjs bracket "a frozen lake at dawn" [--n 3] [--aspect 16:9]
 *   node scripts/forge.mjs pick <variantId-prefix>
 *   node scripts/forge.mjs refine <variantId-prefix> "warmer, lower sun"
 *   node scripts/forge.mjs list [--brief <id>]
 *
 * Generation costs money and therefore requires --confirm-spend. `pick`,
 * `list` and the cost preview are free.
 */

import { compileImage } from '../shared/swanPromptCompiler.mjs';
import { assertLawful } from '../shared/swanLawFilter.mjs';
import { generate, capabilities } from '../shared/providers/openrouterImage.mjs';
import { generateBracket, findVariant, saveImage, storeStatus } from '../shared/bracket.mjs';
import { buildContactSheet, RUBRIC } from '../shared/contactSheet.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { appendRun, readRuns, lineage, RUN_DIR as RUN_DIR_LOCAL } from '../shared/variantRun.mjs';
import { markWinner, annotateRun } from '../shared/variantVerdict.mjs';
import { refine as refineRecord } from '../shared/variantLineage.mjs';

const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : dflt;
};
const ROOT = flag('root', process.cwd());
const CONFIRMED = argv.includes('--confirm-spend');

/**
 * Per-image cost ESTIMATE, derived from this ledger's own history.
 *
 * A hardcoded constant was wrong within one run: the probe measured $0.003736
 * and the first bracket cost $0.00428 an image — 15% higher, because cost tracks
 * token counts and those vary per generation. So the estimate reads what this
 * system has actually been charged rather than what it was charged once.
 * `--n 3 = ~$0.0112` was a confident wrong number of exactly the kind this whole
 * subsystem keeps producing.
 *
 * Falls back to the single measured figure when there is no history yet, and
 * says which one it used.
 */
const MEASURED_FALLBACK = 0.003736;
function unitCost(root) {
  const priced = readRuns(root).runs.filter((r) => r.status === 'ok' && typeof r.costUsd === 'number');
  if (!priced.length) return { usd: MEASURED_FALLBACK, basis: 'one measured call (no history yet)' };
  const recent = priced.slice(-20);
  const mean = recent.reduce((s, r) => s + r.costUsd, 0) / recent.length;
  return { usd: mean, basis: `mean of last ${recent.length} real generation(s)` };
}

const deps = { generate, capabilities };

function usage() {
  console.log(`forge — describe, see options, pick, refine

  bracket "<brief text>" [--n 3] [--aspect 16:9] --confirm-spend
  pick    <variantId-prefix>
  pick    <variantId-prefix> --winner        mark it as the chosen option
  refine  <variantId-prefix> "<what to change>" --confirm-spend
  list    [--brief <briefId>]
  store                                      how big the artifact store is
  review  <runId|variantId-prefix>           contact sheet for a human eye
  review-answer <variantId-prefix> --usable <v> --onBrand <v> --note "<text>"

Generation requires --confirm-spend. pick and list are free.`);
}

async function cmdBracket() {
  const text = argv[1];
  if (!text || text.startsWith('--')) { console.error('Need a brief. forge bracket "a frozen lake at dawn"'); process.exit(2); }
  const n = Number(flag('n', 3));
  const brief = {
    briefId: flag('brief', `b_${Date.now().toString(36)}`),
    text, intent: flag('intent', 'hero'), aspect: flag('aspect', '16:9'),
  };

  // Show the compiled prompt and the price BEFORE spending. A caller should see
  // what is about to be sent, especially now that the kill-list is inlined.
  const compiled = compileImage(brief, capabilities());
  console.log(`brief   ${brief.briefId}`);
  console.log(`prompt  ${compiled.promptText}`);
  if (compiled.aspectDivergence) {
    console.log(`  WARN  prose says ${compiled.aspectDivergence.inProse} but the request is ${compiled.aspectDivergence.declared}`);
  }
  const u = unitCost(ROOT);
  console.log(`cost    ${n} x ~$${u.usd.toFixed(5)} = ~$${(n * u.usd).toFixed(4)}   [${u.basis}]\n`);
  if (!CONFIRMED) { console.error('Add --confirm-spend to generate.'); process.exit(2); }

  const r = await generateBracket(brief, deps, { n, root: ROOT });
  console.log(`run ${r.runId} — ${r.ok.length}/${r.options.length} succeeded, $${r.costUsd.toFixed(4)}\n`);
  for (const o of r.options) {
    if (o.status === 'ok') {
      console.log(`  ${o.variantId.slice(0, 10)}  ${o.actualWidth}x${o.actualHeight}  $${o.costUsd}  ${o.wallMs}ms`);
      console.log(`      ${o.imageRef}`);
    } else {
      console.log(`  ${o.variantId.slice(0, 10)}  ${o.status.toUpperCase()}  ${o.notes || ''}`);
    }
  }
  if (r.failed) console.log(`\n  ${r.failed} option(s) failed — a bracket of ${r.ok.length} is still a choice.`);
  if (r.ok.length) console.log(`\nnext:  forge pick ${r.ok[0].variantId.slice(0, 10)}`);
}

function cmdPick() {
  const v = findVariant(argv[1] || '', ROOT);
  // --winner RECORDS the choice. Without it `pick` only ever printed, so the one
  // quality signal this system has evaporated when the terminal scrolled.
  if (argv.includes('--winner')) {
    const w = markWinner(v.variantId, ROOT);
    console.log(`marked WINNER: ${w.variantId}  (siblings in run ${w.runId || '—'} marked not-winner)
`);
  }
  const chain = lineage(v.variantId, readRuns(ROOT).runs);
  const fresh = findVariant(v.variantId, ROOT);
  console.log(`${fresh.variantId}  [${fresh.intent}]  ${fresh.status}${fresh.winner ? '  ★ WINNER' : ''}`);
  console.log(`  image   ${v.imageRef || '(none)'}`);
  console.log(`  size    ${v.actualWidth}x${v.actualHeight}  (asked ${v.aspectRequested}${v.aspectOutOfTolerance ? ' — OUT OF TOLERANCE' : ''})`);
  console.log(`  cost    $${v.costUsd ?? '?'}  in ${v.wallMs}ms`);
  console.log(`  prompt  ${v.promptText}${v.promptTruncated ? ' …[truncated]' : ''}`);
  console.log(`  lineage ${chain.length} deep: ${chain.map((c) => c.variantId.slice(0, 8)).join(' <- ')}`);
  console.log(`\nnext:  forge refine ${v.variantId.slice(0, 10)} "warmer, lower sun"`);
}

async function cmdRefine() {
  const parent = findVariant(argv[1] || '', ROOT);
  const change = argv[2];
  if (!change || change.startsWith('--')) { console.error('Say what to change: forge refine <id> "warmer"'); process.exit(2); }
  const promptText = `${parent.promptText} ${change}`;
  console.log(`refining ${parent.variantId.slice(0, 10)}`);
  console.log(`prompt   ${promptText}`);
  const u = unitCost(ROOT);
  console.log(`cost     ~$${u.usd.toFixed(5)}   [${u.basis}]\n`);
  if (!CONFIRMED) { console.error('Add --confirm-spend to generate.'); process.exit(2); }

  const t0 = Date.now();
  /**
   * DO NOT RE-COMPILE AN ALREADY-COMPILED PROMPT.
   *
   * This used to pass the parent's finished promptText back in as `brief.text`,
   * so the compiler treated a fully-rendered prompt as a raw subject and applied
   * intent defaults, surface rules and the kill-list to it a second time. It was
   * silently wrong from the start; inlining the kill-list made it fail loudly,
   * because the law filter then found "iridescent gradient" sitting in the
   * SUBJECT slot and rejected the brief. A silent bug became an audible one,
   * which is the good outcome.
   *
   * A refinement is the parent's exact prompt plus a phrase. The parent's text
   * was already law-checked when it was compiled, so only the NEW phrase needs
   * checking — and it gets it, rather than riding in unexamined.
   */
  assertLawful({ subject: change }, []);
  const caps = capabilities();
  const compiled = {
    briefId: parent.briefId,
    provider: caps.provider,
    modelVersion: caps.modelVersion,
    aspect: parent.aspectRequested,
    promptStyle: parent.serializer,
    brainVersion: parent.brainVersion,
    promptText,
    params: {},
  };
  const res = await generate(compiled, { root: ROOT });
  const draft = refineRecord(parent, { promptText, status: 'ok' });
  const img = saveImage(draft.variantId, res.images[0], ROOT);
  const rec = appendRun({
    ...draft, ...img, actualWidth: res.actualWidth, actualHeight: res.actualHeight,
    costUsd: res.costUsd, wallMs: Date.now() - t0,
  }, ROOT);
  console.log(`  ${rec.variantId.slice(0, 10)}  ${rec.actualWidth}x${rec.actualHeight}  $${rec.costUsd}`);
  console.log(`      ${rec.imageRef}`);
}

function cmdReview() {
  const { runs } = readRuns(ROOT);
  const key = argv[1] || '';
  // Accept either a runId or any variant in the run — a human should not have to
  // remember which identifier they have.
  const seed = runs.find((r) => r.runId === key) || runs.find((r) => r.variantId.startsWith(key));
  if (!seed) { console.error(`No run or variant matching "${key}".`); process.exit(1); }
  const rows = seed.runId ? runs.filter((r) => r.runId === seed.runId) : [seed];

  const html = buildContactSheet(rows, ROOT, { runId: seed.runId, briefId: seed.briefId });
  const out = join(RUN_DIR_LOCAL, `review-${seed.runId || seed.variantId.slice(0, 10)}.html`);
  mkdirSync(join(ROOT, RUN_DIR_LOCAL), { recursive: true });
  writeFileSync(join(ROOT, out), html, 'utf8');
  console.log(`contact sheet: ${out}`);
  console.log(`  ${rows.filter((r) => r.status === 'ok').length} option(s). Open it, then:`);
  for (const q of RUBRIC) console.log(`    ${q.q}${q.options ? `  [${q.options.join(' | ')}]` : ''}`);
  console.log(`
  forge review-answer ${rows[0].variantId.slice(0, 10)} --usable yes --onBrand swan --note "..."`);
}

function cmdReviewAnswer() {
  const v = findVariant(argv[1] || '', ROOT);
  const answers = {};
  for (const q of RUBRIC) {
    const val = flag(q.key, null);
    if (val === null) continue;
    if (q.options && !q.options.includes(val)) {
      console.error(`--${q.key} must be one of: ${q.options.join(', ')}`);
      process.exit(2);
    }
    answers[q.key] = val;
  }
  if (!Object.keys(answers).length) {
    console.error(`Nothing to record. Use ${RUBRIC.map((q) => `--${q.key}`).join(' ')}`);
    process.exit(2);
  }
  // A human verdict ANNOTATES the generation it is about — same reasoning as
  // markWinner. It is not a new generation and must not inflate the spend ledger.
  const saved = annotateRun(v.variantId, { review: { ...(v.review || {}), ...answers } }, ROOT);
  console.log(`recorded on ${saved.variantId.slice(0, 10)}: ${JSON.stringify(saved.review)}`);
}

/**
 * Retention is CHECKED automatically and DELETES manually.
 *
 * The check is free and runs after every generation, so "nobody ever looked" is
 * no longer a failure mode. Deletion stays a deliberate human act because it is
 * irreversible — and because I have already deleted live artifacts once by
 * running the pruner casually.
 */
function reportRetention() {
  const st = storeStatus(ROOT);
  if (!st.overBudget) return;
  console.log(`
  RETENTION: ${st.files} image(s), ${st.mb} MB — over the ${st.budgetMb} MB budget.`);
  console.log('    Review what would go:  node scripts/forge-prune.mjs --root <dir>');
  console.log('    Then delete:           ... --apply       (winners and lineage parents are never pruned)');
}

function cmdList() {
  const { runs, skipped } = readRuns(ROOT);
  const briefId = flag('brief', null);
  const rows = briefId ? runs.filter((r) => r.briefId === briefId) : runs;
  if (!rows.length) { console.log('No runs yet. Try: forge bracket "a frozen lake at dawn" --confirm-spend'); return; }
  let spend = 0;
  let unpriced = 0;
  for (const r of rows) {
    if (typeof r.costUsd === 'number') spend += r.costUsd; else unpriced += 1;
    const size = r.actualWidth ? `${r.actualWidth}x${r.actualHeight}` : '—';
    // AN UNKNOWN COST IS NOT ZERO. Rows written before the cost field was fixed
    // have costUsd: null, and printing them as "$0.0000" reads as "this was
    // free" — the same null-shown-as-zero lie the ledger itself refuses to tell
    // about aspect deviation. `intent` is likewise absent on pre-v2 rows.
    const cost = typeof r.costUsd === 'number' ? `$${r.costUsd.toFixed(4)}` : '   ?    ';
    const intent = r.intent || '—';
    const star = r.winner ? ' ★' : '  ';
    console.log(`  ${r.variantId.slice(0, 10)}${star} ${intent.padEnd(6)}  ${r.status.padEnd(13)}  ${size.padEnd(10)}  ${cost}  ${r.imageRef || ''}`);
  }
  console.log(`\n  ${rows.length} run(s), $${spend.toFixed(4)} across ${rows.length - unpriced} priced`
    + `${unpriced ? `, ${unpriced} with UNKNOWN cost (written before the cost field was fixed)` : ''}`
    + `${skipped ? `, ${skipped} corrupt row(s) skipped` : ''}`);
}

try {
  if (cmd === 'bracket') await cmdBracket();
  else if (cmd === 'review') cmdReview();
  else if (cmd === 'review-answer') cmdReviewAnswer();
  else if (cmd === 'pick') cmdPick();
  else if (cmd === 'refine') await cmdRefine();
  else if (cmd === 'list') cmdList();
  else if (cmd === 'store') {
    const st = storeStatus(ROOT);
    console.log(`  ${st.files} image(s), ${st.mb} MB of a ${st.budgetMb} MB budget`
      + `${st.overBudget ? '  — OVER, prune is overdue' : ''}`);
  }
  else usage();
} catch (e) {
  console.error(`${e.code || 'ERROR'}: ${e.message}`);
  process.exit(1);
}
