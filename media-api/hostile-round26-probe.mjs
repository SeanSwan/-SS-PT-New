/**
 * hostile-round26-probe.mjs — D1–D4, the four findings an Astra adjudication raised against
 * the HOSTED VIDEO ROUTE on 2026-09-20, and the six invariants behind "secondary, non-default,
 * paid".
 *
 * ── WHY THIS ROUND EXISTS ───────────────────────────────────────────────────
 * Rounds 11–25 hardened the licence judgement, the money path and the provenance record. All
 * of that work assumed the CATALOGUE DATA was trustworthy: a rate was a rate, an empty
 * exclusion list meant no exclusions, and `requiresAttribution: false` meant attribution was
 * optional.
 *
 * Astra's adjudication attacked that assumption, and it is a different class of defect from
 * everything earlier in this lane. The earlier rounds found CODE that refused too little. This
 * round is about DATA that READS AS AN ANSWER WHILE THE QUESTION IS OPEN — a published figure
 * nobody could reproduce, an empty array standing in for "worldwide", and a policy
 * ("non-default, paid") that existed only as a side effect of an unrelated null.
 *
 * The distinction that matters throughout: **`unknown` and `disputed` are not the same claim,
 * and neither is `false`.** Each licenses a different action, and a catalogue that collapses
 * them into one value makes the operator's next decision for them, wrongly.
 *
 * ── WHAT THIS ROUND DOES NOT DO ─────────────────────────────────────────────
 * It does not ENABLE anything. Astra's verdict was explicit — *"Enablement remains BLOCKED"* —
 * so every hosted row still refuses, and the probe asserts that it still refuses rather than
 * that it works. It also does not implement invariants 5 (atomic reservation) and 6 (uncertain
 * submission stops resubmission): those need new ledger primitives and worker-recovery wiring,
 * and Astra itself stated the resolver/authorization/reservation/worker-recovery contracts were
 * never supplied to it. Section E records what IS enforced and names what is not, rather than
 * letting the gap be inferred from silence.
 */

import {
  VIDEO_PROVIDERS, assertSpecShape,
} from '../shared/providers/video/catalogue.mjs';
import { capabilities, resolve } from '../shared/providers/video/registry.mjs';
import {
  estimateRunCostMicros, withEstimatedRunCost, describeCost,
} from '../shared/providers/video/costEstimate.mjs';
import { checkRunAllowed } from '../shared/providers/video/spendGuard.mjs';
// F4 (round 27): the boundary test Astra asked for. The probe's other checks call `resolve()`
// directly, so they cannot see a handler that supplies `explicitSelection: true` on the
// caller's behalf — which would evade every negative assertion below it. This import is what
// makes that evasion visible.
import { runGenerate } from '../backend/scripts/handlers/generateVideo.mjs';

let passed = 0; let failed = 0;
const check = (name, ok, detail) => {
  if (ok) { passed += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
};
const section = (t) => console.log(`\n── ${t} ──`);
const throws = (fn) => { try { fn(); return null; } catch (e) { return e.code || e.message; } };
/** The async form, for the boundary test that has to go through the real handler. */
const codeAsync = async (fn) => { try { await fn(); return null; } catch (e) { return e.code || e.message; } };

const LOCAL = 'comfyui/minimax-h3';
const DISPUTED = 'higgsfield/seedance-2.5';
const PRICED = 'higgsfield/kling-3.0';
const HOSTED_ROWS = Object.keys(VIDEO_PROVIDERS).filter((id) => id.startsWith('higgsfield/'));

/** A resolved hosted row. `requireEnabled: false` so the probe reaches the gates it is testing. */
const hosted = (id, over = {}) => resolve(id, {
  commercial: false, requireEnabled: false, grants: new Set(), enabled: new Set(), ...over,
});

// ══════════════════════════════════════════════════════════════════════════════
section('A. D1 — the disputed rate is QUARANTINED, and its history is KEPT');
// ══════════════════════════════════════════════════════════════════════════════
{
  const caps = capabilities(DISPUTED);

  check('CONTROL: the disputed row exists and is a per-second hosted row',
    caps.rateUnit === 'second' && caps.provider === DISPUTED);

  // THE QUARANTINE ITSELF.
  check('A1. the disputed rate resolves to NULL, so it cannot be quoted',
    caps.costPerSecondUsd === null,
    `-> ${JSON.stringify(caps.costPerSecondUsd)} — a non-null value here would make the row quotable on an unreproduced figure`);

  // `unknown` and `disputed` are different claims. This is the field that distinguishes them,
  // and a consumer that cannot see it has to infer the reason from the null.
  check('A2. the reason travels with the null, as `disputed` rather than `unknown`',
    caps.pricingStatus === 'disputed',
    `-> ${JSON.stringify(caps.pricingStatus)}`);

  // THE HISTORY IS EVIDENCE, NOT A MISTAKE TO BE ERASED. Astra: store the original figure as an
  // "unreconciled historical published observation, with its available provenance".
  // F7 (round 27): observations carry `amountUsd` + an explicit `unit`, so a per-clip figure
  // can no longer hide in a field named for seconds.
  const kept = caps.observedRates.find((r) => r.amountUsd === 0.0738 && r.unit === 'second');
  check('A3. the original figure is PRESERVED as an observation, not deleted',
    Boolean(kept),
    kept ? `0.0738 kept, status=${kept.status}` : 'the historical figure is GONE — that destroys the evidence for why the row is quarantined');
  check('A3b. the preserved observation carries channel, configuration, date and conditions',
    Boolean(kept && kept.channel && kept.configuration && kept.observedOn && kept.conditions),
    kept ? `channel=${JSON.stringify(kept.channel)} observedOn=${kept.observedOn}` : 'incomplete provenance');
  check('A3c. and it carries the provenance tag it was recorded under',
    Boolean(kept && kept.provenance),
    kept ? `provenance=${kept.provenance}` : 'missing');

  // ── THE FORBIDDEN ARITHMETIC ────────────────────────────────────────────────
  // Astra, verbatim: "Do not average rates, choose the cheapest, or treat the highest observed
  // rate as a proven maximum." A single collapsed number is exactly what those three moves
  // produce, so the assertion is that no such number exists anywhere in the row.
  //
  // ── F4 (round 27): THIS CHECK USED TO BE A TAUTOLOGY ────────────────────────
  // It read `numerics.length === caps.observedRates.filter(...).length`, where `numerics` IS
  // that same filter+map — i.e. `x.length === x.length`. True for every input, including the
  // collapsed state it claimed to exclude: a row with NO observations at all and a null rate
  // passed a check named "stored SEPARATELY and never combined". Astra found it by mutation —
  // setting every hosted `activeUsableRate` to 0.0738 left the whole probe 39/39 green.
  //
  // Two real assertions replace it, and each can fail:
  //   A4a — the observations ARE separate: distinct channels, distinct provenance, distinct units.
  //   A4b — nothing usable is exposed on a row whose price is not published. This is the
  //         assertion Astra's mutation attacks, and it now fails that mutation.
  const distinctBy = (key) => new Set(caps.observedRates.map((r) => r[key])).size;
  check('A4a. the observations are stored SEPARATELY — own channel, own provenance, own unit',
    caps.observedRates.length === 2
      && distinctBy('channel') === 2
      && distinctBy('provenance') === 2
      && distinctBy('unit') === 2,
    `${caps.observedRates.length} observation(s); distinct channels=${distinctBy('channel')} `
    + `provenance=${distinctBy('provenance')} units=${distinctBy('unit')}`);

  // The property that actually protects the money: an unpublishable row exposes no usable
  // number at all — not the rate, not the active rate, not a per-run figure.
  const unpublishable = HOSTED_ROWS.filter((id) => capabilities(id).pricingStatus !== 'published');
  check('A4b. every row whose price is NOT published exposes no usable rate anywhere',
    unpublishable.length > 0 && unpublishable.every((id) => {
      const c = capabilities(id);
      return c.activeUsableRate === null && c.costPerSecondUsd === null && c.costPerRunUsd === null;
    }),
    unpublishable.length === 0
      ? 'NO unpublishable row exists — this assertion would be vacuous, which is itself a defect'
      : `${unpublishable.length} unpublishable row(s): ` + unpublishable.map((id) => {
        const c = capabilities(id);
        return `${id}(active=${JSON.stringify(c.activeUsableRate)},sec=${JSON.stringify(c.costPerSecondUsd)},run=${JSON.stringify(c.costPerRunUsd)})`;
      }).join(' '));

  // The competing observation is a SUBSCRIPTION-CREDIT clip cost, not a usage rate. Recording it
  // as a competing rate would import Astra's D4 category error into the price table.
  // F7: it must state its unit as a CLIP. The old assertion required `usdPerSecond` to be a
  // number, which is how the wrong unit got locked in.
  const clip = caps.observedRates.find((r) => r.comparable === false);
  check('A4c. the non-comparable observation states its own unit as a CLIP, not a second',
    Boolean(clip) && typeof clip.amountUsd === 'number' && clip.unit === 'clip'
      && !('usdPerSecond' in clip),
    clip ? `${clip.amountUsd}/${clip.unit} marked comparable=false (channel: ${clip.channel})` : 'the differing-billing-model observation is absent');

  check('A5. the reconciliation outcome is recorded, so nobody re-runs the consult',
    caps.reconciliation && caps.reconciliation.outcome === 'not-reproduced'
      && Array.isArray(caps.reconciliation.liveHypotheses) && caps.reconciliation.liveHypotheses.length > 0,
    caps.reconciliation ? `outcome=${caps.reconciliation.outcome}, ${caps.reconciliation.liveHypotheses.length} live hypotheses` : 'missing');

  // ── "EXECUTABLE QUOTE: REFUSED" ─────────────────────────────────────────────
  const req = { duration: 6 };
  check('A6. the cost estimate is NULL — the row cannot be priced',
    estimateRunCostMicros(caps, req) === null,
    `-> ${JSON.stringify(estimateRunCostMicros(caps, req))}`);

  const guardCaps = withEstimatedRunCost(caps, req);
  check('A6b. the guard is handed a null per-run cost, not a number',
    guardCaps.costPerRunUsd === null, `-> ${JSON.stringify(guardCaps.costPerRunUsd)}`);

  const refusal = throws(() => checkRunAllowed(guardCaps, { runs: 0, spendUsd: 0 },
    { maxRunsDaily: 50, maxSpendUsdDaily: 10 }));
  check('A6c. an executable run against the disputed row is REFUSED',
    refusal === 'E_UNKNOWN_COST',
    `-> ${JSON.stringify(refusal)} — with a positive ceiling configured, an unbounded cost must still refuse`);

  check('A7. the human-readable line says the cost is unknown, not that it is zero',
    /unknown/i.test(describeCost(caps, req)) && !/\$0(\.0+)?\b/.test(describeCost(caps, req)),
    `-> ${describeCost(caps, req)}`);

  // CONTROL: the quarantine is SURGICAL. A blanket break of hosted pricing would also pass A1–A7.
  const priced = capabilities(PRICED);
  // 0.112 USD/sec x 6 s = 0.672 USD = 672,000 micros. Written out because the first version of
  // this assertion compared against the RATE in micros (112,000) instead of the PRODUCT, and a
  // probe with wrong arithmetic fails against correct code — the same class of error the
  // `toMicros` tests in round 3 exist to prevent.
  check('CONTROL: an UNDISPUTED hosted row still prices normally',
    priced.costPerSecondUsd === 0.112 && priced.pricingStatus === 'published'
      && estimateRunCostMicros(priced, req) === 672_000,
    `-> $${priced.costPerSecondUsd}/sec x 6s = ${estimateRunCostMicros(priced, req)} micros (expected 672000)`);
}

// ══════════════════════════════════════════════════════════════════════════════
section('B. D2 — an unretrieved fact may not read as a permissive one');
// ══════════════════════════════════════════════════════════════════════════════
{
  const lic = VIDEO_PROVIDERS[DISPUTED].licence;

  check('B1. the territory facts carry an explicit evidence status',
    String(lic.territoryEvidence || '').trim() !== '',
    `territoryEvidence=${JSON.stringify(lic.territoryEvidence)} — without it, excludedTerritories: [] reads as "worldwide"`);
  check('B2. the attribution facts carry an explicit evidence status',
    String(lic.attributionEvidence || '').trim() !== '',
    `attributionEvidence=${JSON.stringify(lic.attributionEvidence)}`);
  check('B3. attribution is claimed as REQUIRED while its evidence is unretrieved (fail-closed)',
    lic.requiresAttribution === true,
    `requiresAttribution=${JSON.stringify(lic.requiresAttribution)} — "false" would understate a condition the retrieved terms place on other documentation`);
  check('B4. the retrieved terms are recorded as dated evidence, marked unadjudicated',
    Array.isArray(lic.termsRefs) && lic.termsRefs.length > 0
      && lic.termsRefs.every((t) => t.observedOn && t.adjudicated === false),
    lic.termsRefs?.[0] ? `${lic.termsRefs[0].ref} ${lic.termsRefs[0].sections}, observed ${lic.termsRefs[0].observedOn}, adjudicated=${lic.termsRefs[0].adjudicated}` : 'missing');
  check('B5. the licence flag is STILL SET, so every hosted row still refuses',
    String(lic.evidence || '').trim() !== '',
    'Astra: "Enablement remains BLOCKED." Clearing this flag is the enablement act, and it has not been taken.');

  // ── THE COUPLING, MADE MECHANICAL ───────────────────────────────────────────
  // These two rules are the difference between an advisory note and an enforcement. They live
  // in `specShape.mjs`, which runs at IMPORT, so a contradictory row cannot load at all.
  const base = JSON.parse(JSON.stringify(VIDEO_PROVIDERS[LOCAL]));
  const LICENCE = (over = {}) => ({
    name: 'probe', restricts: 'unverified', commercialUse: 'unverified',
    excludedTerritories: [], grantRequestDoc: null, requiresAttribution: true, ...over,
  });
  const shape = (licence) => throws(() => assertSpecShape('probe/row', { ...base, licence }));

  check('B6. the validator REJECTS "territory unretrieved" with no evidence flag',
    shape(LICENCE({ territoryEvidence: 'unretrieved' })) === 'E_BAD_SPEC',
    'the combination that would publish an unread territory fact as a settled one');
  check('B6b. CONTROL: the same row WITH the flag is accepted',
    shape(LICENCE({ territoryEvidence: 'unretrieved', evidence: 'unretrieved' })) === null);
  check('B7. the validator REJECTS "attribution unretrieved" AND requiresAttribution=false',
    shape(LICENCE({ attributionEvidence: 'unretrieved', requiresAttribution: false })) === 'E_BAD_SPEC',
    'Astra: empty exclusions and requiresAttribution: false must not mean "worldwide" and "no attribution required" while those facts are unknown');
  check('B7b. CONTROL: the same row with attribution required is accepted',
    shape(LICENCE({ attributionEvidence: 'unretrieved', requiresAttribution: true })) === null);
  check('B8. CONTROL: every shipped row still satisfies the validator',
    Object.entries(VIDEO_PROVIDERS).every(([id, spec]) => throws(() => assertSpecShape(id, spec)) === null),
    `${Object.keys(VIDEO_PROVIDERS).length} rows`);
}

// ══════════════════════════════════════════════════════════════════════════════
section('C. D3 — "non-default, paid" is a MECHANISM, not a side effect');
// ══════════════════════════════════════════════════════════════════════════════
{
  check('C1. every hosted row DECLARES the explicit-paid-only policy',
    HOSTED_ROWS.every((id) => VIDEO_PROVIDERS[id].selectionPolicy === 'explicit-paid-only'),
    `${HOSTED_ROWS.length} hosted rows`);

  // Astra: "The current costPerRunUsd: null refusal is a useful block, but ceases to protect
  // against accidental selection once the estimator supplies a valid amount." This is that
  // protection, stated as policy rather than as an accident of a null.
  const noFlag = throws(() => resolve(PRICED, { commercial: false, requireEnabled: false, grants: new Set(), enabled: new Set() }));
  check('C2. a hosted row is REFUSED when the caller does not assert an explicit selection',
    noFlag === 'E_HOSTED_REQUIRES_EXPLICIT_SELECTION', `-> ${JSON.stringify(noFlag)}`);

  // "The caller supplied a value" is not "the caller said yes" — the same rule `licenceRefusal`
  // applies to `commercial`, where a truthy non-false value is NOT the non-commercial branch.
  const truthy = throws(() => resolve(PRICED, { commercial: false, requireEnabled: false, grants: new Set(), enabled: new Set(), explicitSelection: 1 }));
  check('C3. a TRUTHY but non-true flag does not count as a yes',
    truthy === 'E_HOSTED_REQUIRES_EXPLICIT_SELECTION', `explicitSelection: 1 -> ${JSON.stringify(truthy)}`);

  // ORDER: the licence judgement runs first, so an operator sees the legal fact before a policy
  // they could satisfy and then discover a wall behind.
  const withFlag = throws(() => resolve(PRICED, { commercial: true, requireEnabled: false, grants: new Set(), enabled: new Set(), explicitSelection: true }));
  check('C4. with the flag set, the LICENCE refusal is what surfaces — legal before policy',
    withFlag === 'E_LICENCE_EVIDENCE_MISSING', `-> ${JSON.stringify(withFlag)}`);

  const resolved = hosted(PRICED, { explicitSelection: true });
  check('C4b. CONTROL: with the flag set and non-commercial use, the row resolves',
    resolved.provider === PRICED && resolved.selectionPolicy === 'explicit-paid-only');

  // The policy exists to protect MONEY, and a local run spends none. A local row acquiring this
  // refusal would be a real defect — the same category error as enforcing the image-first law
  // against a provider that bills nothing.
  const local = throws(() => resolve(LOCAL, { commercial: false, requireEnabled: false, grants: new Set(), enabled: new Set() }));
  check('C5. a LOCAL row is unaffected — no explicit selection is required',
    local === null || !String(local).includes('EXPLICIT_SELECTION'), `-> ${JSON.stringify(local)}`);
  check('C5b. and no local row declares the policy',
    Object.entries(VIDEO_PROVIDERS).filter(([id, s]) => !id.startsWith('higgsfield/') && s.selectionPolicy === 'explicit-paid-only').length === 0);
}

// ══════════════════════════════════════════════════════════════════════════════
section('D. D4 — the four cost quantities are NOT collapsed into one');
// ══════════════════════════════════════════════════════════════════════════════
{
  const caps = capabilities(DISPUTED);
  const lic = VIDEO_PROVIDERS[DISPUTED].licence;

  // Astra: "Do not turn $0 provider fees into a claim of zero electricity, depreciation,
  // maintenance, or opportunity cost."
  const localCaps = capabilities(LOCAL);
  check('D1. the local row reports a zero PROVIDER FEE and claims no total cost',
    localCaps.costPerRunUsd === 0 || localCaps.costPerSecondUsd === 0,
    'the catalogue records what the provider charges; it makes no claim about electricity, depreciation or the operator\'s time');

  // The ACTUAL billed charge is a different quantity from the estimate, and nothing in this lane
  // has ever observed one — the vendor's status response carries no cost field.
  check('D2. the ACTUAL billed charge is recorded as null, not as the estimate',
    VIDEO_PROVIDERS[DISPUTED].observedBilledCost === null,
    'no invoice has been observed; presenting the published-rate estimate as a billed charge is the defect this field prevents');
  check('D3. the estimate and the billed charge are SEPARATE fields',
    Object.hasOwn(VIDEO_PROVIDERS[DISPUTED], 'observedBilledCost')
      && Object.hasOwn(VIDEO_PROVIDERS[DISPUTED], 'costPerSecondUsd'),
    'provider charge estimate (rate x duration) and actual billed charge are distinct quantities with distinct sources');
  check('D4. the disputed row reports no usable provider charge at all',
    VIDEO_PROVIDERS[DISPUTED].pricingStatus === 'disputed' && caps.costPerSecondUsd === null);
  check('D5. CONTROL: the licence row records that attribution is conditioned, not waived',
    lic.requiresAttribution === true && Array.isArray(lic.termsRefs) && lic.termsRefs.length > 0,
    'the retrieved terms condition attribution on other documentation, so "not required" was never available');
}

// ══════════════════════════════════════════════════════════════════════════════
section('E. THE INVARIANTS — what is enforced, and what is explicitly NOT');
// ══════════════════════════════════════════════════════════════════════════════
{
  // 1. Default selection excludes hosted rows.
  check('E1. INVARIANT 1 — the RESOLVER refuses a hosted row without an explicit selection',
    throws(() => resolve(PRICED, { commercial: false, requireEnabled: false, grants: new Set(), enabled: new Set() })) === 'E_HOSTED_REQUIRES_EXPLICIT_SELECTION',
    'default, fallback, retry and saturation paths all fail this assertion, which is the point');

  // F4 (round 27): THIS LABEL USED TO OVERCLAIM. It read "INVARIANT 2 — the hosted rows bind a
  // model version and refuse an unknown endpoint", but it asserts two STATIC catalogue fields
  // and creates no quote and tests no binding. Astra: *"It never creates a quote or tests
  // immutable execution bindings."* The name now says what it exercises, and invariant 2 is
  // recorded below as NOT satisfied rather than implied by a passing check.
  check('E2. the hosted rows NAME a model version and carry no guessed endpoint (static fields)',
    capabilities(PRICED).modelVersion === 'Kling 3.0' && capabilities(PRICED).modelPath === null,
    'modelVersion is named; modelPath is null and `higgsfield.mjs` refuses to submit until an operator pastes the real path — never guessed');

  // F4 (round 27): THIS LABEL USED TO OVERCLAIM TOO. It read "INVARIANT 3 — a quote is not spend
  // authority", but an unknown-cost refusal is a PRICING check: it exercises neither
  // authentication, nor authorisation, nor admission. Astra: *"it never exercises
  // authentication, authorization or admission."* Named for what it is.
  check('E3. an unknown cost refuses the run (a PRICING check, not an authorisation check)',
    throws(() => checkRunAllowed(withEstimatedRunCost(capabilities(DISPUTED), { duration: 6 }),
      { runs: 0, spendUsd: 0 }, { maxRunsDaily: 50, maxSpendUsdDaily: 10 })) === 'E_UNKNOWN_COST');

  // ── 4. THE BOUNDARY TEST — the flag must be the CALLER's, not the handler's ────
  // Astra: *"those assertions call resolve() directly. The supplied tests do not challenge a
  // missing/false flag through runGenerate(). Automatically supplying true in the handler would
  // evade their negative coverage. Add that boundary test."*
  //
  // Every other check in this probe calls `resolve()` itself, so a handler that passed
  // `explicitSelection: true` on the caller's behalf would satisfy all of them while destroying
  // the mechanism. This one goes through the real handler with a stub adapter, so it observes
  // both the refusal AND whether the adapter was reached.
  // ── WHY DoP AND NOT THE PER-SECOND ROW (round 27 probe fix) ─────────────────
  // The first version of this test used `higgsfield/kling-3.0`, a PER-SECOND row, and it
  // failed with `E_UNKNOWN_COST`. That was the PROBE's fault, not the code's: a per-second
  // row carries `costPerRunUsd: null` by design, and `spendGuard.checkRunAllowed` refuses a
  // non-finite per-run cost (`E_UNKNOWN_COST`) — the per-second price is turned into money
  // at ESTIMATE time, not at the guard. So a per-second row cannot reach the adapter through
  // `runGenerate`, and using one made this boundary test unable to demonstrate the very
  // thing it exists to demonstrate.
  //
  // `higgsfield/dop` is the row that CAN: it is the one video row billed per GENERATION
  // (`costPerRunUsd: 0.125`, finite), so it clears the spend guard and reaches the adapter.
  // It is also `selectionPolicy: 'explicit-paid-only'`, so it exercises the SAME D3 gate —
  // the fixture changed, the mechanism under test did not.
  const BOUNDARY = 'higgsfield/dop';
  const boundaryEnv = {
    SWAN_VIDEO_PROVIDERS_ENABLED: BOUNDARY,
    SWAN_OPERATOR_TERRITORY: 'US',
    SWAN_VIDEO_MAX_SPEND_USD_DAILY: '10',
    SWAN_VIDEO_MAX_RUNS_DAILY: '50',
  };
  let adapterCalls = 0;
  const stubAdapters = {
    [BOUNDARY]: { generate: async () => { adapterCalls += 1; return { filename: 'stub.mp4' }; } },
  };
  const jobFor = (explicit) => ({
    id: 'boundary-1',
    params: {
      provider: BOUNDARY, kind: 'image2video', duration: 5, prompt: 'a swan',
      category: 'social-clip', style: 'cinematic', commercial: false,
      initImage: 'approved-still.jpg', ...(explicit ? { explicitSelection: true } : {}),
    },
  });
  const quiet = async () => {};

  adapterCalls = 0;
  const withoutFlag = await codeAsync(() => runGenerate(jobFor(false), quiet, { env: boundaryEnv, adapters: stubAdapters, ledger: null }));
  check('E4. THROUGH THE HANDLER: a hosted job with NO explicit selection is refused, adapter unreached',
    withoutFlag === 'E_HOSTED_REQUIRES_EXPLICIT_SELECTION' && adapterCalls === 0,
    `code=${JSON.stringify(withoutFlag)} adapter calls=${adapterCalls} — the handler must not supply the flag on the caller's behalf`);

  adapterCalls = 0;
  const withFlag = await codeAsync(() => runGenerate(jobFor(true), quiet, { env: boundaryEnv, adapters: stubAdapters, ledger: null }));
  check('E4b. THROUGH THE HANDLER: the same job WITH the flag reaches the adapter',
    adapterCalls === 1,
    `code=${JSON.stringify(withFlag)} adapter calls=${adapterCalls} — so E4's refusal is the FLAG, not an unrelated error`);

  // ── 5. THE ADAPTER ITSELF IS A GATED PATH (F2, round 27) ──────────────────────
  // Astra's F2: `higgsfield.mjs` used to reach `submit()` without calling `resolve()`, so
  // enablement, the licence judgement and the D3 gate were all bypassed on the one path that
  // spends money. These two checks are the deletion-sensitive evidence for the fix.
  adapterCalls = 0;
  const hostedAdapter = (await import('../shared/providers/video/higgsfield.mjs')).generate;
  const wireCalls = { n: 0 };
  const stubbedFetch = async () => { wireCalls.n += 1; throw new Error('STUBBED_TRANSPORT'); };
  const adapterEnv = {
    SWAN_VIDEO_PROVIDERS_ENABLED: PRICED,
    SWAN_OPERATOR_TERRITORY: 'US',
    HIGGSFIELD_API_KEY_ID: 'synthetic-id',
    HIGGSFIELD_API_KEY_SECRET: 'synthetic-secret',
    SWAN_HIGGSFIELD_PATH_KLING_3_0: '/synthetic/path',
  };
  const adapterReq = { prompt: 'a swan', category: 'social-clip', style: 'cinematic', duration: 5 };

  // `commercial: false` is load-bearing HERE, and the reason is a real ORDERING fact worth
  // recording: `licenceGate.licenceRefusal` returns early for `commercial === false`, and the
  // licence gate runs BEFORE D3 inside `resolve()`. With the fail-closed default
  // (`commercial: true`) the adapter refuses with `E_LICENCE_EVIDENCE_MISSING` — a correct
  // refusal, but not the gate under test, so E5b could never reach the transport. Setting
  // `commercial: false` takes the licence judgement out of the path and leaves D3 as the
  // DISCRIMINATING gate. That licence-precedes-D3 ordering is itself pinned by E5c below, so
  // it is asserted rather than merely relied upon.
  wireCalls.n = 0;
  const gatedOut = await codeAsync(() => hostedAdapter(adapterReq, {
    env: adapterEnv, outPath: 'C:/tmp/probe-never-written.mp4', fetchImpl: stubbedFetch,
    providerId: PRICED, commercial: false,
  }));
  check('E5. the ADAPTER refuses a hosted row when no explicit selection is asserted',
    gatedOut === 'E_HOSTED_REQUIRES_EXPLICIT_SELECTION' && wireCalls.n === 0,
    `code=${JSON.stringify(gatedOut)} wire calls=${wireCalls.n} — previously this reached the transport`);

  const enabledOut = await codeAsync(() => hostedAdapter(adapterReq, {
    env: adapterEnv, outPath: 'C:/tmp/probe-never-written.mp4', fetchImpl: stubbedFetch,
    providerId: PRICED, commercial: false, explicitSelection: true,
  }));
  check('E5b. and with the flag it reaches the stubbed transport — so the gate is the flag',
    wireCalls.n === 1,
    `code=${JSON.stringify(enabledOut)} wire calls=${wireCalls.n} (the stub throws, which is expected)`);

  // E5c — the ORDERING control. With the fail-closed default the licence judgement refuses
  // before D3 is ever consulted, so the code is the licence one. This pins the ordering that
  // E5's `commercial: false` depends on: if the licence gate ever moved AFTER D3, E5 would
  // silently stop being a D3 test and this check would fail.
  wireCalls.n = 0;
  const licenceFirst = await codeAsync(() => hostedAdapter(adapterReq, {
    env: adapterEnv, outPath: 'C:/tmp/probe-never-written.mp4', fetchImpl: stubbedFetch,
    providerId: PRICED, explicitSelection: true,
  }));
  check('E5c. CONTROL: with the fail-closed commercial default the LICENCE gate refuses first',
    licenceFirst === 'E_LICENCE_EVIDENCE_MISSING' && wireCalls.n === 0,
    `code=${JSON.stringify(licenceFirst)} wire calls=${wireCalls.n} — licence is judged before the D3 selection gate`);

  // ── THE CORRECTED INVENTORY (round 27) ───────────────────────────────────────
  // Astra's round-2 §6.3 corrected the previous disclosure in BOTH directions, and the
  // correction is kept here rather than only in the filed adjudication. The old text named
  // only 5 and 6, which OVERSTATED 2 and 3 (a passing E2/E3 was read as evidence for them)
  // while UNDERSTATING 1 and 4 (the resolver check is real and deletion-sensitive; quote
  // expiry IS checked at admission). Astra: *"Its disclosure naming only 5 and 6 is
  // incomplete."* A disclosure wrong in both directions is not a disclosure.
  console.log('\n  DISCLOSURE: THE INVARIANT INVENTORY, corrected by Astra round 2 and re-stated here');
  console.log('          1. Default selection excludes hosted rows — PARTIAL, and stronger than this');
  console.log('             probe used to say. The resolver check is real and deletion-sensitive');
  console.log('             (removing it fails C2/C3/E1), and round 27 added the adapter gate (F2),');
  console.log('             so it now holds at the resolver, the handler and the adapter. EXHAUSTIVE');
  console.log('             entry-point coverage is NOT established — Astra named the handler,');
  console.log('             preflight and adapter, and did not certify that the list is complete.');
  console.log('          2. Hosted selection is explicit and exact — NOT SATISFIED. E2 above asserts');
  console.log('             two static catalogue fields; it creates no quote and tests no immutable');
  console.log('             model/endpoint/execution-location/billing-profile binding.');
  console.log('          3. A quote is not spend authority — NOT SATISFIED. E3 above is a PRICING');
  console.log('             check. A boolean the caller sets on itself is an INTENT, not an authority,');
  console.log('             and it cannot distinguish a selection from a fallback that retains it.');
  console.log('          4. Revalidate before submission — PARTIAL. Quote expiry is checked at');
  console.log('             admission and the handler rereads enablement, licence and budget. The full');
  console.log('             submission-time material-terms validation is not implemented.');
  console.log('          5. One atomic reservation — NOT SATISFIED. Astra corrected the diagnosis: the');
  console.log('             race is in ADMISSION, not in the ledger write. Two concurrent jobs can both');
  console.log('             pass `checkRunAllowed` before either records usage, so fixing file-write');
  console.log('             atomicity would not close it. A reserve/settle primitive is required.');
  console.log('          6. Uncertain submission stops resubmission — NOT SATISFIED. Exposure is wider');
  console.log('             than `E_SUBMIT_FAILED`: missing request ids, poll timeouts and download');
  console.log('             failures can follow acceptance, and upload failure follows a completed');
  console.log('             generation. All remain retryable with no reconcile barrier.');
  console.log('          REACHABILITY: round 26 justified deferring 5 and 6 with "enablement stays');
  console.log('          BLOCKED, so neither is reachable". Astra DISPROVED that as a structural claim');
  console.log('          — the adapter reached `submit()` without ever calling the resolver (F2). The');
  console.log('          adapter now gates (E5/E5b), so the bypass is closed, but reachability still');
  console.log('          rests on an OPERATOR CONFIGURATION rather than a structural property:');
  console.log('          `SWAN_VIDEO_PROVIDERS_ENABLED` turns enablement on, and `licenceGate.mjs:72`');
  console.log('          returns early for `commercial === false`. The deferral is legitimate as a');
  console.log('          bounded slice; it is NOT justified by unreachability.');
}

console.log(`\n${passed + failed} CHECKS — ${passed} passed, ${failed} failed`);
if (failed) {
  console.log('\nFAILED:');
  process.exitCode = 1;
}
