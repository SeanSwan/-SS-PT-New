/**
 * hostile-round27-probe.mjs — the F1–F7 fixes, and the ENFORCEMENT they add.
 *
 * ── WHY THIS ROUND EXISTS ───────────────────────────────────────────────────
 * Round 26 implemented Astra's D1–D4 and filed the adjudication. Astra then reviewed THAT
 * commit and returned `DEFECTS-FOUND` with seven findings, F1–F7. Round 27 implements them.
 *
 * The load-bearing two are F1 and F2, and they share one shape:
 *
 *   F1  `pricingStatus` did not enforce anything. A row could declare itself `disputed` and
 *       still carry a numeric rate that the money path would happily price. The field READ
 *       as a policy and was only a comment.
 *
 *   F2  `higgsfield.mjs`'s `generate()` reached `submit()` without ever calling `resolve()`.
 *       The one path that actually spends money bypassed enablement, the licence judgement
 *       and the D3 selection gate — all three of which are raised inside the resolver.
 *
 * ── THE DEFECT CLASS, NAMED SO IT CAN BE RECOGNISED AGAIN ───────────────────
 * Both are instances of the same thing, and it is the through-line of this lane:
 *
 *   **A policy enforced only by ANOTHER FIELD'S ABSENCE is not a policy.**
 *
 * Astra found it for D3 in round 1. I reproduced it for D1 in round 26 — in the very commit
 * that implemented D3's fix. F1 is the third appearance. So the remedy applied to F1 is the
 * two-part one the lane settled on, and NOT the single-part one that keeps failing:
 *
 *   * validate the status/rate relationship at IMPORT (`specShape.mjs`, `E_BAD_SPEC`), so a
 *     contradictory catalogue row cannot load at all; AND
 *   * enforce eligibility at the AUTHORITATIVE boundary (`costEstimate.mjs`), so a rate that
 *     reaches the money path by any other route still cannot be priced.
 *
 * Either half alone is insufficient. The import-time rule cannot see a value forged in memory;
 * the request-time rule cannot tell an operator their catalogue is contradictory. This probe
 * carries a check for EACH half and each one can fail.
 *
 * ── WHAT THIS ROUND DOES NOT DO ─────────────────────────────────────────────
 * It does not ENABLE anything. Astra's verdict was and remains *"Enablement remains BLOCKED"* —
 * this review was explicitly NOT an enablement approval — so every hosted row still refuses and
 * the probe asserts the refusal rather than the function. It also does not implement invariants
 * 5 (atomic reservation) and 6 (uncertain submission): Astra corrected round 26's diagnosis of 5
 * — the race is in ADMISSION, not in the ledger write — and both need primitives this round does
 * not add. Section F records what is enforced and what is not, rather than letting the gap be
 * inferred from silence.
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { VIDEO_PROVIDERS, assertSpecShape } from '../shared/providers/video/catalogue.mjs';
import { capabilities } from '../shared/providers/video/registry.mjs';
import {
  estimateRunCostMicros, withEstimatedRunCost,
} from '../shared/providers/video/costEstimate.mjs';
import { checkRunAllowed } from '../shared/providers/video/spendGuard.mjs';
import { preflight } from './preflight.mjs';

let passed = 0; let failed = 0;
const check = (name, ok, detail) => {
  if (ok) { passed += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
};
const section = (t) => console.log(`\n── ${t} ──`);
const throws = (fn) => { try { fn(); return null; } catch (e) { return e.code || e.message; } };

const LOCAL = 'comfyui/minimax-h3';
const DISPUTED = 'higgsfield/seedance-2.5';
const PRICED = 'higgsfield/kling-3.0';
const BOUNDARY = 'higgsfield/dop';

const readSource = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const REPO = fileURLToPath(new URL('..', import.meta.url));

/**
 * Strip `//` line comments and `/* *​/` blocks before a source-text assertion.
 *
 * ── WHY THIS EXISTS, AND IT IS NOT HYPOTHETICAL ─────────────────────────────
 * This probe's own FIRST DRAFT failed two checks for a reason that had nothing to do with the
 * code: the comments explaining each fix QUOTE the very string the fix removed. Round 23's F5
 * comment says the old filter read `/^(twenty|thirty)(-[a-z]+)*$/i`, and the catalogue's F7
 * comment says observations "used to be stored as `usdPerSecond`". So a naive scan found the
 * removed construct still present — in prose describing its removal.
 *
 * That is a defect in the CHECK, and it has two faces: it can fail on a correct file (this
 * happened) and it can PASS on an incorrect one (a comment asserting a rule that the code no
 * longer implements would satisfy a naive scan). A source-text assertion must read CODE.
 *
 * The `[^:]` guard keeps `https://` from being read as a comment opener. It is not a general
 * JavaScript lexer and does not claim to be; it is enough for these files, and where the parsed
 * value is reachable it is always preferred to text — see E3/E4 below, which assert the DATA.
 */
const stripComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

// ══════════════════════════════════════════════════════════════════════════════
section('A. F1 — `pricingStatus` ENFORCES, at IMPORT time');
// ══════════════════════════════════════════════════════════════════════════════
{
  // The fixture base is a REAL shipped row, so the rule is exercised against a spec that
  // passes every OTHER validator. A fixture that was invalid for two reasons would prove
  // nothing about this one.
  const base = JSON.parse(JSON.stringify(VIDEO_PROVIDERS[LOCAL]));
  const shape = (over) => throws(() => assertSpecShape('probe/row', { ...base, ...over }));

  check('A1. a row declaring `disputed` AND a numeric per-second rate is REJECTED',
    shape({ pricingStatus: 'disputed', costPerSecondUsd: { value: 0.0738, provenance: 'claimed' } }) === 'E_BAD_SPEC',
    'this is Astra\'s mutation expressed as DATA: the disputed row given a usable rate it must not have');

  check('A1b. a row declaring `disputed` AND a numeric per-run rate is REJECTED',
    shape({ pricingStatus: 'disputed', costPerRunUsd: 0.5 }) === 'E_BAD_SPEC',
    'the flat-price route into the same contradiction — DoP\'s shape, with a status that denies it');

  check('A1c. a row declaring `disputed` AND a non-null `activeUsableRate` is REJECTED',
    shape({ pricingStatus: 'disputed', activeUsableRate: 0.0738 }) === 'E_BAD_SPEC',
    '`activeUsableRate` is the field the money path reads first, so it is the one that mattered most');

  // ── THE CONTROLS. Without these, a rule that rejected EVERYTHING would pass A1–A1c. ──
  check('A1d. CONTROL: `disputed` with NO usable rate is ACCEPTED — the rule is a contradiction test, not a ban',
    shape({ pricingStatus: 'disputed', costPerRunUsd: null }) === null,
    'a quarantined row is a legitimate state; the defect is a quarantined row that still carries a price');

  check('A1e. CONTROL: `published` with a numeric rate is ACCEPTED',
    shape({ pricingStatus: 'published', costPerRunUsd: 0.5 }) === null,
    'the rule must not fire on the ordinary case, or the first person to hit it deletes it');

  check('A1f. CONTROL: every SHIPPED row still satisfies the validator',
    Object.entries(VIDEO_PROVIDERS).every(([id, spec]) => throws(() => assertSpecShape(id, spec)) === null),
    `${Object.keys(VIDEO_PROVIDERS).length} rows — a rule that rejects the catalogue it ships with is a broken rule`);
}

// ══════════════════════════════════════════════════════════════════════════════
section('B. F1 — the MONEY path enforces it too, and THIS is the half that cannot be bypassed');
// ══════════════════════════════════════════════════════════════════════════════
{
  // The import-time rule cannot see a value forged in memory, and it cannot see a row loaded
  // before the rule existed. So the money path is checked independently, against a caps object
  // that CARRIES a rate while declaring itself disputed.
  const shipped = capabilities(DISPUTED);
  const forged = { ...shipped, costPerSecondUsd: 0.0738, pricingStatus: 'disputed' };
  const publishedTwin = { ...shipped, costPerSecondUsd: 0.0738, pricingStatus: 'published' };
  const req = { duration: 6 };

  check('B1. a `disputed` row carrying a numeric rate is NOT priced, even though the rate is present',
    estimateRunCostMicros(forged, req) === null,
    `-> ${JSON.stringify(estimateRunCostMicros(forged, req))}. Astra's mutation was "set every hosted `
    + 'activeUsableRate to 0.0738"; this check applies that mutation as a VALUE and requires the '
    + 'money path to refuse anyway. A value-level mutation is strictly stronger than a source-level '
    + 'one here, because it does not depend on the author knowing which line to delete.');

  // ── THE CONTROL THAT MAKES B1 FALSIFIABLE. ──────────────────────────────────────────────
  // Without this, B1 would pass on a row that had no rate at all, which is the state round 26
  // left the catalogue in — so B1 could have been green for the wrong reason the whole time.
  check('B2. CONTROL: the SAME caps declaring `published` IS priced — so B1 can fail',
    estimateRunCostMicros(publishedTwin, req) === 442800,
    `-> ${JSON.stringify(estimateRunCostMicros(publishedTwin, req))} micros ($0.0738 x 6s). `
    + 'The ONLY difference from B1 is `pricingStatus`, which is what makes B1 a check on that field '
    + 'rather than on the absence of a rate.');

  const guardCaps = withEstimatedRunCost(forged, req);
  const refusal = throws(() => checkRunAllowed(guardCaps, { runs: 0, spendUsd: 0 },
    { maxRunsDaily: 50, maxSpendUsdDaily: 10 }));
  check('B3. and the forged row is REFUSED at the spend guard with `E_UNKNOWN_COST`',
    guardCaps.costPerRunUsd === null && refusal === 'E_UNKNOWN_COST',
    `-> per-run cost ${JSON.stringify(guardCaps.costPerRunUsd)}, guard ${JSON.stringify(refusal)} — `
    + 'the two halves compose: the estimate is null, so the guard sees an unbounded cost and refuses');

  const okGuard = withEstimatedRunCost(publishedTwin, req);
  check('B4. CONTROL: the published twin IS allowed by the same guard',
    throws(() => checkRunAllowed(okGuard, { runs: 0, spendUsd: 0 },
      { maxRunsDaily: 50, maxSpendUsdDaily: 10 })) === null,
    `-> allowed at $${Number(okGuard.costPerRunUsd).toFixed(4)} of a $10.00 ceiling`);
}

// ══════════════════════════════════════════════════════════════════════════════
section('B2. R3-1 — an UNRECOGNISED rateUnit is an UNKNOWN COST, not the cheapest one');
// ══════════════════════════════════════════════════════════════════════════════
{
  // THE DEFECT, verbatim: `costEstimate.mjs` accumulated into `micros` under `case 'second'` and
  // `case 'generation'` but let every other unit fall through `default:` and still return a price.
  // So a spec declaring `rateUnit: 'per-minute'` was silently priced AS IF it were per-second —
  // twelve times under cost for a per-minute rate on a 6s clip — and the number looked plausible,
  // which is what made it dangerous. Measured before the fix: `run`, `unrecognised` and
  // `per-minute` ALL returned 125000. The fix gives `'run'` its own arm and makes `default:`
  // return `null`, so an unrecognised unit cannot be priced at all.
  //
  // WHY THIS IS A CONTROL AND NOT JUST A CHECK: an assertion that "an unknown unit is not priced"
  // is satisfiable by a `default:` that returns null for EVERYTHING — including `'run'`, which is
  // the unit the entire catalogue declares by default. So the control asserts the accepted side
  // too, and it does so with the SAME caps object, differing only in `rateUnit`.
  //
  // ── WHY THIS SECTION RESOLVES A REAL ROW INSTEAD OF USING A FIXTURE ───────────────
  // Four drafts were needed to get here, and each failure is the evidence that this control
  // drives the shipped path rather than a mock of it:
  //
  //   1. A hand-built caps object -> `E_NO_PROVIDER`. The estimator requires a resolved
  //      `caps.provider`; a bare `{costPerRunUsd, rateUnit}` is a shape no caller produces.
  //   2. A spec object passed where an id belongs -> `E_UNKNOWN_PROVIDER`. `capabilities()`
  //      looks its argument up in `VIDEO_PROVIDERS`.
  //   3. Injecting a fixture row into `VIDEO_PROVIDERS` -> `TypeError: object is not
  //      extensible`. The catalogue is FROZEN (`catalogue.mjs:59`), deeply so, which is the
  //      catalogue doing exactly its job.
  //   4. A bad DONOR. `DISPUTED` (`higgsfield/seedance-2.5`) is the one row in the catalogue
  //      whose `pricingStatus` is `'disputed'`, so the `pricingStatus` gate returned `null`
  //      before the `rateUnit` switch was ever reached and B2a/B2b2 failed with "null" on
  //      every arm. The donor has to be able to PRICE, or the control measures the wrong gate.
  //
  // The donor is now `higgsfield/dop`: `published`, `rateUnit: 'generation'`, and — the part
  // that matters — `costPerRunUsd: 0.125` with `costPerSecondUsd: null`. That is exactly the
  // row shape R3-1 was dangerous for: it carries a populate-able flat field and NO per-second
  // field, so the old `default:` arm answered an unrecognised unit with its flat rate and the
  // mistake was invisible. Overriding only `rateUnit` on this donor reproduces the defect
  // against the row that would actually exhibit it.
  //
  // `provider` survives the spread, so the estimator's guard passes and the money path runs for
  // real. This is the same technique B1 uses for `pricingStatus`, and it is stronger than
  // injection would have been: the row is the one that ships.
  const DONOR = 'higgsfield/dop';
  const donorCaps = capabilities(DONOR);
  const priced = (rateUnit) => estimateRunCostMicros({ ...donorCaps, rateUnit }, { duration: 6 });

  check('B2a. CONTROL: `run` IS priced — so the refusal below is about the UNIT, not about a null arm',
    priced('run') === 125000,
    `-> ${JSON.stringify(priced('run'))} micros ($0.125/run) from the \`${DONOR}\` row, whose `
    + '`pricingStatus` is `published`. This is the half that stops the fix from being "return null '
    + 'whenever unsure" — which would also pass B2b, and would silently unprice the entire shipped '
    + 'catalogue. Note this row ALSO carries `costPerSecondUsd: null`, so an unrecognised unit '
    + 'reaching the flat arm returns a plausible number rather than a visible null.');

  check('B2b. CONTROL: an unrecognised unit is NOT priced — it returns null, not the flat rate',
    priced('per-minute') === null && priced('unrecognised') === null && priced('secnd') === null,
    `-> per-minute ${JSON.stringify(priced('per-minute'))}, unrecognised `
    + `${JSON.stringify(priced('unrecognised'))}, secnd ${JSON.stringify(priced('secnd'))} — all `
    + `null, on caps whose flat arm prices at ${JSON.stringify(priced('run'))}. Before the fix all `
    + 'three returned 125000, because the old `default:` arm answered them with the flat figure '
    + 'while its comment claimed to refuse them.');

  // ── `second` MUST STILL MULTIPLY ─────────────────────────────────────────────────
  // Without this, B2a and B2b could BOTH pass on a switch collapsed into a single flat arm —
  // and collapsing the arms is precisely the shape R3-1 was filed against. This donor has
  // `costPerSecondUsd: null`, so the per-second rate must come from a DIFFERENT row: the
  // control uses `higgsfield/kling-3.0` (published, `'second'`, $0.112/s) and asserts the
  // multiplication happens there.
  const perSecondCaps = capabilities('higgsfield/kling-3.0');
  const perSecondPriced = estimateRunCostMicros(perSecondCaps, { duration: 6 });
  check('B2b2. CONTROL: `second` still MULTIPLIES by duration — the arms are distinct, not merged',
    perSecondPriced === 672000 && priced('run') === 125000,
    `-> \`higgsfield/kling-3.0\` at $0.112/s x 6s = ${JSON.stringify(perSecondPriced)} micros, against `
    + `${JSON.stringify(priced('run'))} for the flat arm on the \`${DONOR}\` caps. Two different rows, `
    + 'two different arithmetic shapes: the arms are demonstrated to be distinct rather than one '
    + 'arm wearing three case labels.');

  // The IMPORT-TIME half. The money path above refuses to price an unrecognised unit at RUNTIME;
  // this asserts it cannot be DECLARED in the first place. Both are needed: the money half covers
  // a value forged in memory or loaded before the rule existed, the import half covers the spec a
  // provider author actually writes.
  //
  // THE FIXTURE IS A CLONE OF A SHIPPED SPEC, not a hand-written object. Three hand-written drafts
  // failed in turn, each naming a different required field — `modelVersion`, then `transport` —
  // and every failure made the check look like a statement about `rateUnit` when it was a
  // statement about the fixture. `specShape.mjs:47` lists nine required fields; copying the
  // shipped row means this fixture cannot drift out of step with that list, and the only
  // difference from a real row is the field under test.
  const REQUIRED_FIELDS_SENTINEL = 'label.modelVersion.transport.kind.enabled.maxDurationSec.maxResolution.attribution.licence';
  const donorSpec = VIDEO_PROVIDERS[DONOR];
  const fixtureSpec = (rateUnit) => ({ ...donorSpec, rateUnit });
  const accepted = ['run', 'second', 'generation'].filter((u) => throws(() => assertSpecShape('r31-fixture', fixtureSpec(u))) === null);
  const rejected = ['none', 'per-minute', 'secnd', 'SECOND', 'millisecond'].filter((u) => throws(() => assertSpecShape('r31-fixture', fixtureSpec(u))) === 'E_BAD_SPEC');
  // If the fixture is wrong, BOTH lists shrink and the check fails — but for a reason that has
  // nothing to do with rateUnit. So the diagnosis is printed, and the donor clone is verified to
  // be valid BEFORE any overriding, which separates "the clone is bad" from "the rule is bad".
  const donorCloneError = (() => { try { assertSpecShape('r31-donor-clone', donorSpec); return null; } catch (e) { return `${e.code}: ${e.message}`; } })();

  check('B2c. the closed `rateUnit` set ACCEPTS exactly its three members at import time',
    donorCloneError === null && accepted.length === 3 && rejected.length === 5,
    donorCloneError
      ? `-> THE DONOR CLONE ITSELF IS INVALID: ${donorCloneError}. Nothing here is a statement `
        + 'about `rateUnit`, so this check fails rather than reporting a green that would have '
        + 'meant "the fixture is broken".'
      : `-> accepted ${JSON.stringify(accepted)}; rejected with E_BAD_SPEC ${JSON.stringify(rejected)}. `
        + `The fixture is \`${DONOR}\`'s shipped spec with only \`rateUnit\` overridden, so its `
        + `validity rests on the same ${REQUIRED_FIELDS_SENTINEL.split('.').length} required fields `
        + 'the catalogue already enforces. `none` is deliberately NOT a member: it is a reading an '
        + 'API can return, not a unit a provider may declare, and allowing it would let a rate be '
        + 'published under a unit that prices nothing.');
}

// ══════════════════════════════════════════════════════════════════════════════
section('C. F2 — the ADAPTER cannot submit outside `resolve()`');
// ══════════════════════════════════════════════════════════════════════════════
{
  const src = readSource('../shared/providers/video/higgsfield.mjs');
  const genStart = src.indexOf('export async function generate(');
  const genBody = src.slice(genStart);
  const resolveAt = genBody.indexOf('resolve(providerId, {');
  const configAt = genBody.indexOf('resolveConfig(env, providerId)');
  const submitAt = genBody.indexOf('await submit(');

  check('C1. `generate()` calls the resolver, and does so BEFORE it reads the credential',
    genStart !== -1 && resolveAt !== -1 && configAt !== -1 && resolveAt < configAt,
    `resolve at +${resolveAt}, resolveConfig at +${configAt} — reading a credential for a row that `
    + 'may not run is itself the leak the gate exists to prevent');

  check('C2. and the resolver call precedes the FIRST wire call',
    resolveAt !== -1 && submitAt !== -1 && resolveAt < submitAt,
    `resolve at +${resolveAt}, submit at +${submitAt}`);

  check('C3. the adapter\'s defaults are the FAIL-CLOSED ones',
    /commercial = true/.test(genBody) && /explicitSelection = false/.test(genBody),
    'an unspecified caller gets the licence judgement and is treated as a default/fallback path, '
    + 'which is what it is; a caller that knows better says so');

  // ── THE EVIDENCE FOR C1–C3 IS BEHAVIOURAL, AND IT LIVES IN THE ROUND-26 PROBE. ──────────
  // A source-text assertion proves the CALL is written; it does not prove the call REFUSES.
  // Rather than duplicate that work, this asserts the behavioural evidence still exists where
  // it is claimed to be — so deleting it fails a gate instead of quietly removing the proof.
  const r26 = readSource('./hostile-round26-probe.mjs');
  const behavioural = ['E5.', 'E5b.', 'E5c.', 'E4.', 'E4b.'].filter((n) => r26.includes(`check('${n}`));
  check('C4. the behavioural evidence for the adapter gate still exists in round 26\'s probe',
    behavioural.length === 5,
    `-> found ${behavioural.join(', ')}. C1–C3 read the source; these five DRIVE it — the adapter `
    + 'refuses without the flag, reaches the stubbed transport with it, and the licence gate is '
    + 'pinned as preceding D3. Source text alone cannot tell a call that refuses from one that throws.');
}

// ══════════════════════════════════════════════════════════════════════════════
section('D. F3 — the QUOTE path can express a selection, and agrees with the handler');
// ══════════════════════════════════════════════════════════════════════════════
{
  // F3's defect was the mirror image of F2's: the handler accepted a deliberate hosted
  // selection while the quote entry point could not express one at all, so NO hosted row could
  // be quoted through the documented path. Enablement is an operator configuration, so this is
  // exercised with the row enabled in the INJECTED env and nothing else changed.
  const env = {
    SWAN_VIDEO_PROVIDERS_ENABLED: BOUNDARY,
    SWAN_OPERATOR_TERRITORY: 'US',
    SWAN_VIDEO_MAX_SPEND_USD_DAILY: '10',
    SWAN_VIDEO_MAX_RUNS_DAILY: '50',
  };
  const params = (over = {}) => ({
    provider: BOUNDARY, kind: 'image2video', duration: 5, prompt: 'a swan',
    category: 'social-clip', style: 'cinematic', commercial: false,
    initImage: 'approved-still.jpg', ...over,
  });
  const quote = (over) => {
    try { return { ok: true, r: preflight({ params: params(over), env }) }; }
    catch (e) { return { ok: false, code: e.code }; }
  };

  const noFlag = quote();
  check('D1. preflight REFUSES a hosted request that does not assert a selection',
    noFlag.ok === false && noFlag.code === 'E_HOSTED_REQUIRES_EXPLICIT_SELECTION',
    `-> ${JSON.stringify(noFlag.code)}`);

  const withFlag = quote({ explicitSelection: true });
  check('D2. and the SAME request WITH the flag produces a quote',
    withFlag.ok === true && typeof withFlag.r.costLine === 'string' && withFlag.r.estimatedMicros > 0,
    withFlag.ok
      ? `-> quoted: ${JSON.stringify(withFlag.r.costLine)} (${withFlag.r.estimatedMicros} micros)`
      : `-> ${JSON.stringify(withFlag.code)} — before F3 this failed even WITH the flag, which is `
        + 'the whole finding: the flag had no path to the resolver from here');

  check('D3. only the boolean `true` counts — a truthy non-true value still refuses',
    quote({ explicitSelection: 1 }).code === 'E_HOSTED_REQUIRES_EXPLICIT_SELECTION',
    '"the caller supplied a value" is not "the caller said yes" — the same rule the licence gate '
    + 'applies to `commercial`, and the trap that once let `commercial: 0` skip the judgement');

  // ── THE AGREEMENT. This is the property F3 broke and the one that keeps it fixed. ────────
  // The handler and the quote path must reach the SAME answer from the SAME params, or a caller
  // gets a 201 quote for a job the worker will refuse two seconds later.
  const licenced = quote({ explicitSelection: true, commercial: true });
  check('D4. preflight and the handler agree — the same params produce the same refusal code',
    licenced.ok === false && licenced.code === 'E_LICENCE_EVIDENCE_MISSING',
    `-> ${JSON.stringify(licenced.code)}. The handler reaches this code too (round 26's C4), so the `
    + 'two paths are one policy rather than two implementations of it. The order is licence BEFORE '
    + 'the D3 selection gate, which is why the flag alone does not get past it.');
}

// ══════════════════════════════════════════════════════════════════════════════
section('E. F5 and F7 — the two findings whose evidence lives in the rounds that own them');
// ══════════════════════════════════════════════════════════════════════════════
{
  // F5 — round 23's E1b detector was scoped to the `twenty`/`thirty` families, so a gate count
  // written as `forty` was neither read nor flagged: the silent-skip class it exists to close,
  // re-opened one family over. The fix is totality, and these two checks pin it at the source.
  // Scanned with COMMENTS STRIPPED — the fix's own comment quotes the filter it removed.
  const r23 = stripComments(readSource('./hostile-round23-probe.mjs'));
  check('E1. the family allowlist is GONE from round 23\'s detector',
    !/\^\(twenty\|thirty\)\(-\[a-z\]\+\)\*\$/.test(r23),
    'the old filter matched only two families; a detector that omits silently cannot protect against omission');

  check('E2. and the detector is now an explicit NON_COUNT_TOKENS allowlist, so forgetting is LOUD',
    /NON_COUNT_TOKENS/.test(r23) && /E1c\./.test(r23),
    'every token `num()` cannot read is now a candidate unless it is listed WITH a reason, and E1c '
    + 'runs the scan over a synthetic unreadable phrase and requires it to be FLAGGED. Measured: '
    + 'with the old filter restored, E1b still PASSES and E1c FAILS — which is why E1b alone was '
    + 'never evidence of anything.');

  // F7 — a per-CLIP observation was stored in a per-SECOND field. `comparable: false` excluded it
  // from comparisons but did not correct its unit, and the assertion that locked it in required
  // the wrong field to be a number.
  //
  // ASSERTED AGAINST THE PARSED DATA, not the source. This is the stronger form and it is why:
  // the source scan is comment-sensitive (above), and the `videoRow` helper legitimately has a
  // positional parameter NAMED `usdPerSecond` for the rows that really are per-second. Reading
  // the resolved observations tests the property that matters — what a consumer receives.
  const obs = VIDEO_PROVIDERS[DISPUTED].observedRates;
  check('E3. no observation carries a `usdPerSecond` key — the unit is stated, never implied',
    Array.isArray(obs) && obs.length >= 2 && obs.every((o) => !('usdPerSecond' in o)),
    `${obs.length} observation(s); keys: ${obs.map((o) => Object.keys(o).join('/')).join(' | ')}. `
    + 'The field encoded a rate that was never observed AS a rate — the configuration says the '
    + 'duration is unknown and the billing unit is one clip.');

  check('E4. every observation states its own `unit`, and the clip one says `clip`',
    obs.every((o) => typeof o.amountUsd === 'number' && typeof o.unit === 'string')
      && obs.some((o) => o.unit === 'clip') && obs.some((o) => o.unit === 'second'),
    `-> ${obs.map((o) => `${o.amountUsd}/${o.unit}`).join(', ')}. Two units, two rows, neither `
    + 'derived from the other — dividing the clip figure by a guessed duration would manufacture '
    + 'a rate nobody observed, which is the forbidden "choose the cheapest" move in reverse.');

  const r26 = stripComments(readSource('./hostile-round26-probe.mjs'));
  check('E5. the assertion that locked the wrong unit in has been replaced, not relaxed',
    /A4c\./.test(r26) && /unit === 'clip'/.test(r26) && !/usdPerSecond: /.test(r26),
    'A4c requires `amountUsd` and `unit === \'clip\'` and asserts the old key is ABSENT — the old '
    + 'check required `usdPerSecond` to be a number, which is how the unit error was preserved');
}

// ══════════════════════════════════════════════════════════════════════════════
section('F. F6 — the document states a RECEIPT as a receipt, and a CLAIM as a claim');
// ══════════════════════════════════════════════════════════════════════════════
{
  // F6: the README advanced a verification receipt for a patch that no longer exists on disk,
  // and a corrected count cannot upgrade historical execution evidence into a current claim.
  // A receipt and a claim drift in OPPOSITE directions — a claim is wrong when it lags, a
  // receipt is wrong when it is UPDATED — so the fix is to label, not to renumber.
  const doc = readSource('../docs/ai-workflow/blueprints/swan-media-api-2026-09-18/README.md');

  check('F1. the stale "63-file change set" is gone',
    !/63-file change set/.test(doc),
    'the count had been corrected in the live claims and left stale here, one paragraph below them');

  // ── F2, ROUND 3's R3-2, AND WHY THERE IS NO TIP ASSERTION HERE AT ALL ─────
  // v1 asserted `doc.includes(git rev-parse HEAD)`: the handover sentence had to name the CURRENT
  // tip. Red the instant it shipped, because the document is committed INSIDE the commit it would
  // have to name — a file cannot contain its own commit hash, so that check could never pass at
  // the tip it asserted. A check you can never make green is a check you eventually delete.
  //
  // v2 asserted the named commit was REACHABLE from the tip — TRUE FOR EVERY COMMIT IN HISTORY, so
  // it stayed green on the very defect it was written to catch (injecting round 26's reference
  // `9f9957b1b` left it green). A tautology wearing a threshold.
  //
  // v3 asserted FRESHNESS — `git rev-list --count <named>..HEAD <= 1`. Better, and measured to
  // fail at distance 6, but round 3 (R3-2) found the hole: that count is **0 for a descendant and
  // 1 for a SIBLING**, so `<= 1` accepts a commit that is not an ancestor of HEAD at all. A
  // sibling branch tip would pass. And more fundamentally, ANY tolerance still makes the literal
  // sentence "this IS the tip" false, because the sentence is inside the commit.
  //
  // v4 — this one — drops the tip claim entirely and asserts the property that was always meant:
  //   the named commit is an ANCESTOR of the tree, and the tree is allowed to be AHEAD of it.
  //
  // `git merge-base --is-ancestor` answers ancestry directly, which is why it is used instead of
  // arithmetic on a count. The document now calls the hash its REVIEWED BASE, so the claim and the
  // assertion finally agree: a review base is stable across the commits that follow it, whereas a
  // "tip" is false the moment it is written down.
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO, encoding: 'utf8' }).trim();
  const handover = /The reviewed base is\s*\n?`([0-9a-f]{9})`\s*\(round/.exec(doc);
  const named = handover && handover[1];
  const isAncestor = (() => {
    if (!named) return null;
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', named, 'HEAD'], { cwd: REPO });
      return true;                       // exit 0 = IS an ancestor
    } catch (e) {
      // exit 1 = is NOT an ancestor (a real answer). Anything else (128 = no such object) means
      // the hash names nothing, which is also a failure but a different one — both are `false`
      // here and the diagnostic distinguishes them.
      return e.status === 1 ? false : null;
    }
  })();
  // WHY `null` IS NOT SIMPLY "NOT A COMMIT" ─────────────────────────────────────────────────────
  // Measured 2026-09-21 (round 3, during the object-store failure): the named base `b796338fb`
  // IS a commit in this repository — `git cat-file -t b796338fb` prints `commit` — but its PARENT
  // `4698de0e4` is missing from the store, so `git merge-base --is-ancestor` cannot walk and exits
  // 128. Rendering that as "NOT A COMMIT IN THIS REPO" is false and sends the reader to the wrong
  // place, which is this lane's recurring defect (a diagnostic naming a cause it never checked).
  // The three cases are now separated by MEASUREMENT rather than by inference from the exit code.
  const namedType = (() => {
    if (!named) return null;
    try { return execFileSync('git', ['cat-file', '-t', named], { cwd: REPO, encoding: 'utf8' }).trim(); }
    catch { return null; }
  })();
  const ancestryReason = (() => {
    if (isAncestor !== null || !named) return null;
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', named, 'HEAD'], { cwd: REPO, encoding: 'utf8', stdio: 'pipe' });
      return null;
    } catch (e) {
      return String((e && e.stderr) || '').split('\n')
        .filter((l) => l.trim() && !/^warning: in the working copy/.test(l)).join(' | ').slice(0, 200);
    }
  })();
  check('F2. the commit named as the reviewed base IS AN ANCESTOR of the tree (R3-2)',
    isAncestor === true && head.length === 40,
    `-> HEAD is ${head.slice(0, 9)}; the document names ${named || '(none)'} as the reviewed base, `
    + `which is ${isAncestor === null
        ? (namedType
            ? `A REAL COMMIT (git cat-file -t -> \`${namedType}\`) WHOSE ANCESTRY CANNOT BE WALKED HERE`
            : 'NOT A COMMIT IN THIS REPO (or the regex matched nothing)')
        : isAncestor ? 'an ANCESTOR of HEAD' : 'NOT an ancestor of HEAD'}. `
    + (ancestryReason
      ? `Git said, verbatim: "${ancestryReason}". A commit that exists but whose history is missing `
        + 'from the object store fails this check the same way a wrong name does, and only this line '
        + 'tells them apart — do NOT read it as a wrong hash in the document. '
      : '')
    + 'Ancestry, not distance: `git rev-list --count <named>..HEAD` is 0 for a DESCENDANT and 1 for '
    + 'a SIBLING, so the previous `distance <= 1` accepted a sibling branch tip as "the tip". And '
    + 'no tolerance can repair the older wording, because a document committed inside a commit '
    + 'cannot name it: asserting "the tip is X" is false at the moment it is written, which is why '
    + 'this asserts the relationship instead of a moving number.');

  // F2b — THE CONTROL FOR F2, AND THE WITNESS FOR R3-2.
  //
  // The finding is that the OLD predicate accepted a commit that is NOT an ancestor. Asserting the
  // new predicate is green proves nothing on its own — it is green on any ancestor. So this BUILDS
  // the failing input: a sibling commit-object carrying HEAD's own parent and a different tree,
  // created with `git commit-tree` and NO ref, so nothing in the repository moves and the object is
  // unreachable from the moment it is written.
  //
  // It is NOT enough to pick some non-ancestor off another branch: a commit 2400 commits away is
  // rejected by distance too, so it witnesses nothing about the `<= 1` threshold. The SIBLING is the
  // only input that separates the two predicates, which is precisely why the old check could not
  // tell "our own earlier commit" from "someone else's branch tip".
  const siblingWitness = (() => {
    try {
      const parent = execFileSync('git', ['rev-parse', `${head}^`], { cwd: REPO, encoding: 'utf8' }).trim();
      const tree = execFileSync('git', ['rev-parse', `${head}^{tree}`], { cwd: REPO, encoding: 'utf8' }).trim();
      const sib = execFileSync('git', ['commit-tree', tree, '-p', parent, '-m', 'sibling witness (throwaway, no ref)'],
        { cwd: REPO, encoding: 'utf8' }).trim();
      let ancestor;
      try {
        execFileSync('git', ['merge-base', '--is-ancestor', sib, head], { cwd: REPO });
        ancestor = true;
      } catch (e) { ancestor = e.status === 1 ? false : null; }
      const distance = Number(execFileSync('git', ['rev-list', '--count', `${sib}..HEAD`],
        { cwd: REPO, encoding: 'utf8' }).trim());
      return { sib, ancestor, distance };
    } catch { return null; }
  })();
  check('F2b. CONTROL: a SIBLING is REJECTED by ancestry, and the old distance<=1 ACCEPTED it (R3-2)',
    siblingWitness !== null
      && siblingWitness.ancestor === false          // the new predicate rejects it
      && siblingWitness.distance <= 1,              // the old predicate accepted it — the finding
    siblingWitness === null
      ? '-> COULD NOT BUILD THE WITNESS, so this control tests nothing. A control that silently '
        + 'skips when its fixture is unavailable is not a control.'
      : `-> witness ${siblingWitness.sib.slice(0, 9)} shares HEAD's parent with a different tree. `
        + `merge-base --is-ancestor says ${siblingWitness.ancestor === false ? 'NOT an ancestor' : 'ancestor (!!)'}, `
        + `while rev-list --count ${siblingWitness.sib.slice(0, 9)}..HEAD = ${siblingWitness.distance}. `
        + 'So `distance <= 1` ACCEPTED a commit that is not in HEAD\'s history at all — the old '
        + 'check could not distinguish our own earlier work from another branch\'s tip, which is '
        + 'R3-2. Throwaway object, NO ref written; it is unreachable and will be gc\'d.');

  check('F3. the patch receipt is labelled HISTORICAL rather than advanced as current',
    /HISTORICAL RECEIPT/.test(doc),
    'the 81-file / 32-gate / 1187-assertion verification was performed on a patch generation that '
    + 'is not on disk and cannot be regenerated; it is preserved as a record and not restated as a claim');
}

// ══════════════════════════════════════════════════════════════════════════════
section('G. WHAT ROUND 27 DID NOT DO');
// ══════════════════════════════════════════════════════════════════════════════
console.log('  DISCLOSURE, so the gap is stated rather than inferred from silence:');
console.log('          * ENABLEMENT IS STILL BLOCKED. Astra\'s verdict was "not an enablement');
console.log('            approval" and nothing here changes that. Every hosted row still refuses.');
console.log('          * INVARIANT 5 (one atomic reservation) is NOT implemented. Astra corrected');
console.log('            round 26\'s diagnosis: the race is in ADMISSION, not in the ledger write.');
console.log('            Two concurrent jobs can both pass `checkRunAllowed` before either records');
console.log('            usage, so making the file write atomic would not close it.');
console.log('          * INVARIANT 6 (uncertain submission stops resubmission) is NOT implemented.');
console.log('            Exposure is wider than `E_SUBMIT_FAILED`: missing request ids, poll');
console.log('            timeouts and download failures can all follow acceptance.');
console.log('          * INVARIANTS 2, 3 and 4 remain NOT SATISFIED or PARTIAL, exactly as round 26');
console.log('            recorded them. Round 27 did not move them.');
console.log('          * REACHABILITY still rests on an OPERATOR CONFIGURATION rather than a');
console.log('            structural property: `SWAN_VIDEO_PROVIDERS_ENABLED` turns enablement on.');

console.log(`\n${passed + failed} CHECKS — ${passed} passed, ${failed} failed`);
if (failed) {
  console.log('\nFAILED:');
  process.exitCode = 1;
}
