#!/usr/bin/env node
/**
 * consult-panel.mjs — ONE command that fans a document out to the whole
 * SwanStudios hostile-review panel, in parallel, then hands the replies back
 * for Fable synthesis.
 * =====================================================================
 * Sean's directive 2026-08-18: "I wanna be able to call them with K3 and
 * GLM 5.3 ... so it should be all three of them, as well as you."
 *
 * SEATS (Fable is the FINAL seat and does NOT run here — the Final
 * Decider reads the replies and arbitrates, per CLAUDE.md Co-Orchestrator
 * Hierarchy + Rule 46):
 *
 *   seat  script              billing                       gate
 *   ----  ------------------  ----------------------------  ------------------
 *   sol   consult-sol.mjs     OpenRouter $2.50/M $15/M      --confirm-spend
 *   kimi  consult-kimi.mjs    OpenRouter $3/M   $15/M       --confirm-spend + own $3 cap
 *   glm   consult-glm.mjs     Z.ai coding-plan subscription free-at-margin (burns plan credit)
 *   qwen  consult-qwen.mjs    local Ollama on the 5090      free, private, always on
 *   grok  consult-grok.mjs    OpenRouter $2/M   $6/M        --confirm-spend
 *
 * grok added 2026-08-20 by Sean's directive after the rule-12 repeal
 * (constitution PR #54) — the cheapest paid seat on the panel.
 *
 * WHY NOT ":batch" (the half-price GPT-5.6 Sol Pro listing Sean spotted):
 * `openai/gpt-5.6-sol-pro:batch` IS the same model at exactly 50% off
 * ($1.25/M in, $7.50/M out) — but it is served by OpenRouter's ASYNC Batch
 * API (POST /api/beta/batches, poll GET /api/beta/batches/:id) on a 24-HOUR
 * completion window. It is not reachable from a synchronous /chat/completions
 * call, so it cannot drop into these scripts. On a typical ~20k-in/8k-out
 * review packet the discount saves about $0.09 — nine cents — in exchange for
 * up to a day of latency. Not worth it for interactive review. Revisit only
 * if we ever queue a large overnight sweep; see PANEL-AND-MODEL-ROUTING.md.
 *
 * Usage:
 *   node scripts/consult-panel.mjs --document <path> [--seed <path>]
 *        [--out-dir docs/ai-workflow/AI-HANDOFF/panel-<date>]
 *        [--seats sol,kimi,glm,qwen,grok] [--remit "<override>"]
 *        [--dry-run] [--confirm-spend]
 *
 * Safety: the spend gate protects MONEY, so it covers the PAID seats only.
 *   default            -> free seats (glm, qwen) RUN; paid seats are SKIPPED
 *                         with a notice and the INDEX is marked INCOMPLETE.
 *   --confirm-spend    -> all requested seats run, including paid ones.
 *   --dry-run          -> nothing runs at all; prints the plan + cost estimate.
 * Rule 16 spend gate applies; the Kimi standing rule (ONE review per topic,
 * fresh yes for a second) still governs on top of this.
 *
 * Privacy (Rule 8/44/59): this script never reads or prints API keys; each
 * seat script loads its own. Keep the document to IDs + roles, no PII.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_REMIT } from './lib/panel-remit.mjs';

// Resolve sibling seat scripts from THIS file, not from cwd — the panel must
// work when invoked from a subdirectory or by a hook.
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const arg = (flag, fallback = '') => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
};

const documentPath = arg('--document');
const seedPath = arg('--seed');
const confirmSpend = argv.includes('--confirm-spend');
const dryRun = argv.includes('--dry-run');
const stamp = new Date().toISOString().slice(0, 10);
const outDir = arg('--out-dir', `docs/ai-workflow/AI-HANDOFF/panel-${stamp}`);
// Dedupe: `--seats kimi,kimi` is a typo, but without this it would fire a PAID
// seat twice and bill twice for one review.
const requested = [...new Set(
  arg('--seats', 'sol,kimi,glm,qwen,grok').split(',').map((s) => s.trim()).filter(Boolean),
)];

if (!documentPath) {
  console.error('usage: node scripts/consult-panel.mjs --document <path> [--seed <path>] [--seats sol,kimi,glm,qwen,grok] [--confirm-spend]');
  process.exit(1);
}
if (!existsSync(documentPath)) {
  console.error(`document not found: ${documentPath}`);
  process.exit(1);
}

const remit = arg('--remit', DEFAULT_REMIT);

// Pricing per 1M tokens, OpenRouter catalog verified 2026-08-18.
// Free seats are 0/0 so the estimator needs no special-casing.
const SEATS = {
  sol: {
    label: 'GPT-5.6 Sol Pro', script: 'consult-sol.mjs', paid: true,
    inPerM: 2.5, outPerM: 15, out: 'SOL-PANEL-REVIEW.md',
    args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--effort', 'high'],
    // consult-sol.mjs defaults to plain `gpt-5.6-sol`. Sol PRO is the same
    // weights at the SAME price with reasoning.mode=pro, so there is no reason
    // to review on the weaker tier — pin it explicitly for this seat.
    env: { SWAN_SOL_MODEL: 'openai/gpt-5.6-sol-pro' },
    note: 'reasoning.mode=pro, 1.05M ctx',
  },
  kimi: {
    label: 'Kimi K3', script: 'consult-kimi.mjs', paid: true,
    inPerM: 3, outPerM: 15, out: 'KIMI-PANEL-REVIEW.md',
    args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--effort', 'high', '--confirm-spend'],
    note: 'own $3 hard cap; ONE review per topic (standing rule)',
  },
  glm: {
    label: 'GLM 5.3', script: 'consult-glm.mjs', paid: false,
    inPerM: 0, outPerM: 0, out: 'GLM-PANEL-REVIEW.md',
    args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--model', 'glm-5.3'],
    note: 'Z.ai subscription — no per-token cost, burns coding-plan credit',
  },
  qwen: {
    label: 'Qwen 3.8 (local)', script: 'consult-qwen.mjs', paid: false,
    inPerM: 0, outPerM: 0, out: 'QWEN-PANEL-REVIEW.md',
    args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit],
    note: 'local 5090 via Ollama — $0, fully private, never the lead voice',
  },
  grok: {
    label: 'Grok 4.6', script: 'consult-grok.mjs', paid: true,
    inPerM: 2, outPerM: 6, out: 'GROK-PANEL-REVIEW.md',
    args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--effort', 'high'],
    note: 'x-ai/grok-4.6 via OpenRouter — cheapest paid seat; rule-12 repeal (PR #54)',
  },
};

const unknown = requested.filter((s) => !SEATS[s]);
if (unknown.length) {
  console.error(`unknown seat(s): ${unknown.join(', ')} — valid: ${Object.keys(SEATS).join(', ')}`);
  process.exit(1);
}

const document = readFileSync(documentPath, 'utf-8');
const seed = seedPath && existsSync(seedPath) ? readFileSync(seedPath, 'utf-8') : '';
// Rough token estimate: ~4 chars/token. Used ONLY for the pre-spend estimate,
// never for billing truth — each seat reports its own real usage.
const promptTok = Math.round((remit.length + document.length + seed.length) / 4);
const ASSUMED_OUT_TOK = 6000;

console.log(`[panel] document=${documentPath} (${document.length} chars, ~${promptTok} tok)`);
console.log(`[panel] seats=${requested.join(', ')}  out-dir=${outDir}`);
console.log(`[panel] mode=${confirmSpend ? 'LIVE' : 'DRY-RUN'}\n`);

let estimate = 0;
for (const name of requested) {
  const s = SEATS[name];
  const cost = (promptTok / 1e6) * s.inPerM + (ASSUMED_OUT_TOK / 1e6) * s.outPerM;
  estimate += cost;
  const billing = s.paid ? `~$${cost.toFixed(4)}` : '$0';
  console.log(`  ${name.padEnd(5)} ${s.label.padEnd(18)} ${billing.padStart(9)}  — ${s.note}`);
}
console.log(`\n[panel] estimated spend for this run: ~$${estimate.toFixed(4)} (assumes ${ASSUMED_OUT_TOK} output tok/seat)`);

// Spend gate. The gate exists to protect MONEY (Rule 16), so it applies to the
// paid seats only — making the free local/subscription seats demand a spend
// confirmation would train the reflex of typing --confirm-spend by habit,
// which is exactly how a real spend gate stops working.
const paidRequested = requested.filter((n) => SEATS[n].paid);
const skipped = confirmSpend ? [] : paidRequested;
const seatsToRun = requested.filter((n) => confirmSpend || !SEATS[n].paid);

if (dryRun) {
  console.log('\n[panel] --dry-run — nothing was sent, nothing was spent.');
  process.exit(0);
}
if (skipped.length) {
  console.log(`\n[panel] SKIPPING paid seats (${skipped.join(', ')}) — no --confirm-spend.`);
  console.log('[panel] re-run with --confirm-spend once Sean approves the spend above.');
}
if (!seatsToRun.length) {
  console.log('[panel] no runnable seats — every requested seat is paid and unconfirmed. Nothing spent.');
  process.exit(0);
}
console.log(`[panel] running: ${seatsToRun.join(', ')}\n`);

mkdirSync(outDir, { recursive: true });

/** Run one seat as a child process. Never rejects — a dead seat must not kill the panel. */
function runSeat(name) {
  const s = SEATS[name];
  const outPath = join(outDir, s.out);
  const args = [join(SCRIPT_DIR, s.script), ...s.args(documentPath, outPath)];
  if (seedPath && (name === 'sol' || name === 'kimi' || name === 'grok')) args.push('--seed', seedPath);

  return new Promise((settle) => {
    const t0 = Date.now();
    console.log(`[panel] -> ${name} (${s.label}) started`);
    // shell:false + argv array: the remit contains quotes and newlines that a
    // shell would mangle on Windows. execPath keeps us on this same Node.
    const child = spawn(process.execPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      env: { ...process.env, ...(s.env || {}) },
    });
    let stderr = '';
    child.stdout.on('data', (d) => process.stdout.write(`   [${name}] ${d}`));
    child.stderr.on('data', (d) => { stderr += d; process.stderr.write(`   [${name}] ${d}`); });
    child.on('error', (err) => {
      settle({ name, label: s.label, ok: false, outPath, wall: 0, error: `spawn failed: ${err.message}` });
    });
    child.on('close', (code) => {
      const wall = ((Date.now() - t0) / 1000).toFixed(1);
      const wrote = existsSync(outPath);
      // A seat can exit non-zero AND still have written a truncated reply
      // (exit 2 = hit max_tokens). Surface that rather than silently dropping it.
      settle({
        name, label: s.label, outPath, wall,
        ok: code === 0 && wrote,
        truncated: code === 2 && wrote,
        error: code === 0 ? null : `exit ${code}${wrote ? ' (partial reply written)' : ' (no output)'}: ${stderr.trim().slice(-300)}`,
      });
    });
  });
}

const results = await Promise.all(seatsToRun.map(runSeat));

// Only the seats that actually ran can have cost anything. Reporting the
// full requested-set estimate here would overstate spend whenever paid seats
// were gated out — the exact class of drift just fixed in consult-sol.mjs.
const spentEstimate = seatsToRun.reduce((sum, n) => {
  const s = SEATS[n];
  return sum + (promptTok / 1e6) * s.inPerM + (ASSUMED_OUT_TOK / 1e6) * s.outPerM;
}, 0);

const index = [
  `# Hostile Review Panel — ${stamp}`,
  '',
  `**Document under review:** \`${documentPath}\``,
  seedPath ? `**Seed context:** \`${seedPath}\`` : '**Seed context:** (none)',
  `**Seats run:** ${seatsToRun.join(', ')} · **Estimated spend:** ~$${spentEstimate.toFixed(4)}`,
  // Never say "full panel" unless every seat actually ran. A partial panel
  // that reads as complete is how a missing perspective turns into false
  // confidence downstream (Rule 75 — copy describes what the run ACTUALLY did).
  skipped.length
    ? `**Seats SKIPPED (unconfirmed spend):** ${skipped.join(', ')} — this panel is INCOMPLETE; their perspective is missing from the synthesis below.`
    : seatsToRun.length === Object.keys(SEATS).length
      ? `**Coverage:** full panel — all ${Object.keys(SEATS).length} seats ran.`
      : `**Coverage:** PARTIAL — ${seatsToRun.length} of ${Object.keys(SEATS).length} seats ran (${Object.keys(SEATS).filter((n) => !seatsToRun.includes(n)).join(', ')} not requested).`,
  '',
  '> Fable 5 is the FINAL SEAT and the Final Decider (CLAUDE.md Co-Orchestrator',
  '> Hierarchy, Rule 46). These seat replies are ADVISORY INPUT. Fable reads all',
  '> of them, arbitrates contradictions against the house rules, and owns the',
  '> verdict. A seat reply is a HYPOTHESIS until verified (Rule 30) — findings',
  '> must be checked against the real code before any of them is acted on.',
  '',
  '| Seat | Model | Status | Wall | Reply |',
  '|---|---|---|---|---|',
  ...results.map((r) => {
    const status = r.ok ? '✅ ok' : r.truncated ? '⚠ TRUNCATED' : '❌ failed';
    const link = existsSync(r.outPath) ? `[reply](./${SEATS[r.name].out})` : '—';
    return `| ${r.name} | ${r.label} | ${status} | ${r.wall}s | ${link} |`;
  }),
  '',
  '## Failures',
  ...(results.filter((r) => !r.ok).length
    ? results.filter((r) => !r.ok).map((r) => `- **${r.name}** — ${r.error}`)
    : ['- none — all seats returned.']),
  '',
  '## Fable synthesis',
  '',
  '_Pending — Fable fills this in after reading every reply above._',
  '',
  '1. **Consensus** — what two or more seats independently flagged (highest signal).',
  '2. **Contradictions** — where seats disagree, and which is right on the evidence.',
  '3. **Unique insight** — a real finding only one seat saw.',
  '4. **Blind spots** — what NO seat looked at, that a human reviewer would.',
  '5. **Verified verdict** — the arbitrated call, with the findings confirmed against real code.',
  '',
].join('\n');

const indexPath = join(outDir, 'INDEX.md');
writeFileSync(indexPath, index, 'utf-8');

const okCount = results.filter((r) => r.ok).length;
console.log(`\n[panel] ${okCount}/${results.length} seats returned cleanly -> ${indexPath}`);
for (const r of results.filter((x) => !x.ok)) console.error(`[panel] ⚠ ${r.name}: ${r.error}`);
// Exit non-zero if EVERY seat failed — that is a config problem, not a review.
if (okCount === 0) {
  console.error('[panel] every seat failed — check API keys, Ollama, and network before re-running.');
  process.exit(1);
}
