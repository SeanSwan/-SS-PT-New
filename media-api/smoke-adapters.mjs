/**
 * smoke-adapters.mjs — the hosted lane's dispatch proof, and the exact rung at which
 * it stops.
 *
 * ── THE DEFECT THIS EXISTS TO CATCH ─────────────────────────────────────────
 * `higgsfield.mjs` was written, the catalogue rows existed, `/v1/models` advertised
 * them — and `ADAPTERS` contained no hosted id at all. Every hosted request died at
 * the adapter lookup with `E_UNKNOWN_PROVIDER` for a provider the API had just
 * advertised. A registry that lists a provider it cannot dispatch is worse than one
 * that omits it.
 *
 * ── THE PROOF IS THE SHAPE OF THE FAILURE, NOT ITS ABSENCE ──────────────────
 * The adapter lookup runs BEFORE the registry, so "reached the registry at all" is
 * already proof that the adapter was found. Walking the ladder and printing the rung
 * each refusal came from proves registration AND documents the remaining gates.
 *
 * The ladder, in `runGenerate` order:
 *
 *   1  adapter lookup        E_UNKNOWN_PROVIDER      ← the defect would land here
 *   2  licence / enablement  E_PROVIDER_DISABLED
 *   3  licence evidence      E_LICENCE_EVIDENCE_MISSING
 *   4  request validation    E_BAD_INPUT
 *   5  content policy        E_POLICY_REFUSED
 *   6  spend guard           E_UNKNOWN_COST         ← where the hosted lane stops
 *   7  the adapter           E_NOT_CONFIGURED
 *
 * ── WHY RUNG 6 IS A STOPPING POINT AND NOT A BUG ────────────────────────────
 * The guard compares `caps.costPerRunUsd`, which is `null` on every per-second row
 * because a scalar cannot express "6 seconds of Kling 3.0". `costEstimate.mjs` can
 * compute that number (`$0.6720`) and `/v1/estimate` already returns it — but wiring
 * it into the guard would make hosted spend possible WITHOUT the reservation ledger
 * Astra gated hosted enablement behind. So the honest position is: the estimate layer
 * is done, the enforcement layer is the open slice, and the hosted lane refuses here
 * on purpose. Loosening a money gate to make a smoke test green is the wrong trade.
 */
import { ADAPTERS } from '../backend/scripts/handlers/adapters.mjs';
import { runGenerate } from '../backend/scripts/handlers/generateVideo.mjs';
import { HOSTED_VIDEO_PROVIDERS } from '../shared/providers/video/catalogueHosted.mjs';
import { capabilities } from '../shared/providers/video/registry.mjs';
import { describeCost, estimateRunCostUsd } from '../shared/providers/video/costEstimate.mjs';

let checks = 0;
let failures = 0;
function check(label, ok, detail = '') {
  checks += 1;
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `\n        ${detail}` : ''}`);
}

/** A fully-formed request, so each rung's refusal is about that rung and not the last. */
const goodParams = (over = {}) => ({
  provider: 'higgsfield/kling-3.0',
  prompt: 'a slow dolly across a still lake',
  category: 'social-clip',
  style: 'cinematic',
  duration: 6,
  commercial: false,
  initImage: 'https://example.invalid/approved-still.png',
  // ── ROUND 26 (D3): THE LADDER HAS TO OPT IN, AND THAT IS THE POINT ──────────
  // `kling-3.0` is a paid hosted row, and `registry.resolve()` now refuses one unless the
  // caller asserts an explicit selection. Every rung below tests a LAYER — validation, the
  // spend guard — so it has to get past selection to reach the layer it is about; without this
  // the ladder would report `E_HOSTED_REQUIRES_EXPLICIT_SELECTION` on three rungs and say
  // nothing about the three things it exists to prove.
  //
  // The refusal ITSELF is asserted in `hostile-round26-probe.mjs` (C2, C3), which is the round
  // that owns D1–D4, and it is asserted there through `resolve()` AND through the ordering
  // (licence before policy). A rung was added here for it and then removed: this ladder's
  // receipt count is one of the parts `round18-probe` G4 sums into the document's assertion
  // total, and that sum is derived from a sentence that only recognises per-ROUND contributions
  // — so an extra rung here would have made a hand-maintained total unrepresentable rather than
  // wrong. The policy is covered; the accounting stays checkable.
  explicitSelection: true,
  ...over,
});

async function rung(params, env) {
  try {
    await runGenerate({ id: 'smoke', params }, async () => {}, { env, outDir: process.cwd() });
    return { code: 'NONE', message: 'it SUCCEEDED, which cannot be right with no credential' };
  } catch (err) {
    return { code: err.code, message: String(err.message).slice(0, 130) };
  }
}

const ENABLED = { SWAN_VIDEO_PROVIDERS_ENABLED: 'higgsfield/kling-3.0', SWAN_VIDEO_MAX_SPEND_USD_DAILY: '5' };

console.log(`\nADAPTERS carries ${Object.keys(ADAPTERS).length} providers:\n`);
for (const id of Object.keys(ADAPTERS)) {
  console.log(`   ${id}  ->  ${ADAPTERS[id].PROVIDER_ID || 'higgsfield (hosted)'}`);
}

console.log('\n── registration ──');
for (const id of Object.keys(HOSTED_VIDEO_PROVIDERS)) check(`hosted "${id}" registered`, Boolean(ADAPTERS[id]));
check('local lane still registered', Boolean(ADAPTERS['comfyui/minimax-h3']));
check('comfyui/wan-2.2 still registered', Boolean(ADAPTERS['comfyui/wan-2.2']));

console.log('\n── the ladder, one rung at a time ──');
const ladder = [
  ['1  adapter lookup', goodParams({ provider: 'higgsfield/nonexistent' }), ENABLED, 'E_UNKNOWN_PROVIDER'],
  ['2  enablement', goodParams({ provider: 'higgsfield/seedance-2.5' }), {}, 'E_PROVIDER_DISABLED'],
  ['3  licence evidence', goodParams({ commercial: true }), ENABLED, 'E_LICENCE_EVIDENCE_MISSING'],
  ['4  validation (category)', goodParams({ category: 'nonsense' }), ENABLED, 'E_BAD_INPUT'],
  ['4  validation (image-first)', goodParams({ initImage: null }), ENABLED, 'E_IMAGE_FIRST_REQUIRED'],
  ['6  spend guard', goodParams(), ENABLED, 'E_UNKNOWN_COST'],
];
for (const [name, params, env, expected] of ladder) {
  const got = await rung(params, env);
  check(`${name}  ->  ${got.code}`, got.code === expected, got.message);
}

console.log('\n── the price the enforcement layer will need ──');
const caps = capabilities('higgsfield/kling-3.0');
console.log(`   kling-3.0 @ 6s : ${describeCost(caps, { duration: 6 })}`);
console.log(`   kling-3.0 @ 6s : $${estimateRunCostUsd(caps, { duration: 6 })} (wire form)`);
console.log(`   duration absent: ${describeCost(caps, {})}`);
console.log(`   catalogue says : costPerRunUsd=${JSON.stringify(caps.costPerRunUsd)}  <- why the guard refuses`);

const local = capabilities('comfyui/minimax-h3');
console.log(`\n   local H3      : ${describeCost(local, { duration: 6 })}`);
console.log(`   same 6s, both lanes: $${estimateRunCostUsd(caps, { duration: 6 })} hosted vs `
  + `$${estimateRunCostUsd(local, { duration: 6 })} local`);

// THE PASS COUNT IS PRINTED, and that is round 24's second finding. This line used to read a bare
// `ALL CHECKS PASSED` with no number, so the ledger's headline total had nothing to add for this
// gate and silently omitted all of its assertions: the receipt listed thirty gates and summed
// twenty-nine of them. A summary that reports only FAILURES cannot be counted by anything, and an
// uncountable gate is one whose assertions are missing from the total while every check stays
// green. The shape now matches `demo-http-flow.mjs` and `hostile-http-probe.mjs`, which have
// always printed `ALL <n> CHECKS PASSED` — and round 24's A6 asserts that every gate command in
// the receipt contributes exactly one countable number, so this cannot recur silently.
console.log(`\n${failures === 0
  ? `ALL ${checks} CHECKS PASSED`
  : `${checks} CHECKS — ${checks - failures} passed, ${failures} failed`}\n`);
process.exit(failures === 0 ? 0 : 1);
