#!/usr/bin/env node
/**
 * forge-seed-probe.mjs — settle ONE capability with evidence: does the provider
 * honour a seed?
 *
 * WHY THIS EXISTS. `capabilities()` declares `supportsSeed: 'claimed'` and
 * `seedIsDeterministic: 'claimed'`, and the compiler correctly treats 'claimed'
 * as absent — so no seed has ever been transmitted. That is the honest default
 * and also a permanent handicap: a convergence tournament whose winner cannot be
 * re-rendered is a casino. Kimi K3's round-4 ruling was to build the tournament
 * but to steal exactly this one field from the capability work first.
 *
 * WHY THREE IMAGES AND NOT TWO. A same-seed pair that comes back identical is
 * AMBIGUOUS: it is equally consistent with "the seed was honoured" and with "the
 * provider is deterministic (or cached) regardless of seed". The third arm — same
 * prompt, DIFFERENT seed — is the discriminating test, and without it the result
 * is unfalsifiable. This is the same lesson as the earlier serializer work, where
 * the decisive probe was the one whose failure was unambiguous.
 *
 * VERDICT TABLE
 *   A==B and A!=C   -> seed HONOURED and deterministic     -> 'verified'
 *   A==B and A==C   -> deterministic but seed-INDEPENDENT  -> 'false' (seed does nothing)
 *   A!=B            -> not deterministic                    -> 'false'
 *   HTTP 400 on seed-> parameter REJECTED                   -> 'false'
 *
 * SPEND: 3 images, ~$0.013 total. Refuses to run without --confirm-spend.
 * Every run is written to the VariantRun ledger, so the probe dogfoods the
 * record it exists to justify.
 */

import { createHash } from 'node:crypto';
import { compileImage } from '../shared/swanPromptCompiler.mjs';
import { generate, capabilities, DEFAULT_MODEL } from '../shared/providers/openrouterImage.mjs';
import { appendRun } from '../shared/variantRun.mjs';
import { toBuffer } from '../shared/imageDimensions.mjs';

const args = process.argv.slice(2);
const confirmed = args.includes('--confirm-spend');
/** Where to look for the key and write the ledger. The worktree has no .env. */
const rootIdx = args.indexOf('--root');
const ROOT = rootIdx >= 0 ? args[rootIdx + 1] : process.cwd();

if (!confirmed) {
  console.error('REFUSING: this probe spends real money (3 images, ~$0.013).');
  console.error('Re-run with --confirm-spend [--root <dir containing .env>]');
  process.exit(2);
}

const BRIEF = {
  briefId: 'probe-seed-determinism',
  text: 'a frozen lake seen from directly above, cracked ice plates',
  intent: 'hero',
  aspect: '16:9',
};

const SEED_A = 424242;
const SEED_C = 999001;

function sha(bytes) {
  return createHash('sha256').update(bytes).digest('hex').slice(0, 16);
}

async function shot(label, compiled, seed) {
  const t0 = Date.now();
  try {
    const res = await generate(compiled, { root: ROOT, seed });
    const bytes = toBuffer(res.images[0]);
    const rec = appendRun({
      briefId: BRIEF.briefId, provider: res.model, model: res.model,
      brainVersion: res.brainVersion, serializer: res.promptStyle,
      promptText: compiled.promptText, seedRequested: res.seedSent,
      aspectRequested: res.aspectRequested,
      actualWidth: res.actualWidth, actualHeight: res.actualHeight,
      costUsd: res.costUsd, wallMs: Date.now() - t0,
      status: 'ok', notes: `seed probe arm ${label}`,
    }, ROOT);
    return {
      label, seed, ok: true, hash: sha(bytes), bytes: bytes.length,
      dims: res.actualWidth ? `${res.actualWidth}x${res.actualHeight}` : 'unknown',
      cost: res.costUsd, wallMs: Date.now() - t0, variantId: rec.variantId,
    };
  } catch (e) {
    appendRun({
      briefId: BRIEF.briefId, provider: DEFAULT_MODEL, model: DEFAULT_MODEL,
      serializer: compiled.promptStyle, promptText: compiled.promptText,
      seedRequested: seed, status: 'error', wallMs: Date.now() - t0,
      safetyEvents: e.code === 'E_PROVIDER_SAFETY_REJECT' ? [{ code: e.code }] : [],
      notes: `seed probe arm ${label} FAILED: ${e.code}`,
    }, ROOT);
    return { label, seed, ok: false, code: e.code, message: String(e.message).slice(0, 240) };
  }
}

const caps = capabilities(DEFAULT_MODEL);
const compiled = compileImage(BRIEF, caps);

console.log(`model    ${DEFAULT_MODEL}`);
console.log(`declared supportsSeed=${caps.supportsSeed} seedIsDeterministic=${caps.seedIsDeterministic}`);
console.log(`prompt   ${compiled.promptText.slice(0, 100)}...`);
console.log(`arms     A=${SEED_A}  B=${SEED_A} (repeat)  C=${SEED_C} (control)\n`);

const A = await shot('A', compiled, SEED_A);
const B = await shot('B', compiled, SEED_A);
const C = await shot('C', compiled, SEED_C);

for (const r of [A, B, C]) {
  if (r.ok) console.log(`  ${r.label} seed=${r.seed}  sha=${r.hash}  ${r.dims}  ${r.bytes}B  $${r.cost ?? '?'}  ${r.wallMs}ms`);
  else console.log(`  ${r.label} seed=${r.seed}  FAILED ${r.code}: ${r.message}`);
}

console.log('');
let verdict;
let reason;
if (!A.ok || !B.ok) {
  verdict = 'false';
  reason = `a same-seed arm failed (${A.code || B.code}) — cannot establish determinism`;
  if ((A.code || B.code) === 'E_PROVIDER_HTTP' && /seed/i.test(A.message || B.message || '')) {
    reason = 'the provider REJECTED the seed parameter outright';
  }
} else if (A.hash !== B.hash) {
  verdict = 'false';
  reason = 'identical prompt + identical seed produced DIFFERENT bytes — not deterministic';
} else if (C.ok && A.hash === C.hash) {
  verdict = 'false';
  reason = 'output is identical across DIFFERENT seeds — deterministic, but the seed does nothing';
} else if (!C.ok) {
  verdict = 'claimed';
  reason = `same-seed pair matched but the control arm failed (${C.code}) — result is ambiguous, re-run`;
} else {
  verdict = 'verified';
  reason = 'same seed reproduced byte-identical output; a different seed did not';
}

const spent = [A, B, C].filter((r) => r.ok).reduce((s, r) => s + (r.cost || 0), 0);
console.log(`VERDICT  seedIsDeterministic = '${verdict}'`);
console.log(`REASON   ${reason}`);
console.log(`SPENT    $${spent.toFixed(4)} across ${[A, B, C].filter((r) => r.ok).length}/3 arms`);
console.log('\nThis verdict is EVIDENCE, not a decision. Update openrouterModels.mjs by hand.');
