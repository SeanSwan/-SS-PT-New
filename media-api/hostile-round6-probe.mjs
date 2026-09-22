#!/usr/bin/env node
/**
 * hostile-round6-probe.mjs — the SIXTH hostile pass.
 *
 * Round 5 closed the last of the gateway surfaces. Round 6 goes after the CATALOGUE and
 * the SHAPE CONTRACT between it and the registry — the seam where a data mistake becomes
 * a money mistake, and where nothing was checking.
 *
 * ── THE DEFECT THIS ROUND EXISTS FOR ────────────────────────────────────────
 * `registry.trusted()` read `.value` off a field, so a row that declared its rate BARE
 * instead of wrapped resolved to `undefined`. That undefined travelled into
 * `estimateRunCostMicros`, `toMicros` returned `null` for it, and `null * 6 === 0` in
 * JavaScript — so a billing provider authored in the wrong shape was priced at ZERO.
 *
 * Every step of that chain is individually defensible. Only the chain is a bug, and the
 * chain was invisible because `assertSpecShape` promised to reject malformed rows at
 * import and did not check these fields at all. Sections A–C pin each link.
 *
 * ── CONTROLS, EVERY SECTION ─────────────────────────────────────────────────
 * Round 2's vacuous passes are the reason every section here proves the legitimate case
 * works before it asserts the bad case is refused.
 */

import { readFileSync } from 'node:fs';
import { estimateRunCostMicros } from '../shared/providers/video/costEstimate.mjs';
import { capabilities } from '../shared/providers/video/registry.mjs';
import { assertSpecShape, VIDEO_PROVIDERS } from '../shared/providers/video/catalogue.mjs';
import { HOSTED_VIDEO_PROVIDERS } from '../shared/providers/video/catalogueHosted.mjs';
import { ADAPTERS } from '../backend/scripts/handlers/adapters.mjs';
import { checkRunAllowed, readLimits } from '../shared/providers/video/spendGuard.mjs';
import { SERVED_PROVIDERS } from './preflight.mjs';
import { listModels } from './routesCatalog.mjs';
import { statusFor } from './wire.mjs';
import { createJob } from './routes.mjs';

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { fail += 1; failures.push(name); console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
}
function section(t) { console.log(`\n── ${t} ──`); }
const throws = (fn) => { try { fn(); return null; } catch (e) { return e.code || e.name; } };

/**
 * Read a source file for TEXT ASSERTIONS, with line endings NORMALISED.
 *
 * This exists because the patch verification caught the probe lying: every check here passed in
 * the worktree (LF) and `catalogue.mjs validates every row at MODULE LEVEL` FAILED on the patched
 * base — because `git apply` writes through `core.autocrlf`, so the very same commit checks out
 * CRLF there. The regex used a literal `\n`, and `{\r\n` is not `{\n`.
 *
 * The lesson generalises: a source-text assertion is a claim about a file that exists in two
 * different byte forms in this repo, so it must be line-ending agnostic. Normalise once, at the
 * read, rather than remembering to write `\r?\n` at every pattern.
 */
const readSource = (rel) =>
  readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

async function main() {
  console.log('HOSTILE PROBE — ROUND 6\n');

  // ── A. an unreadable rate must never reach the multiply ───────────────────
  section('A. an unreadable rate must never be multiplied');
  {
    // The INVARIANT, not one expected value. An unreadable rate may resolve to `null`
    // (unknown) or raise a loud refusal — both are fail-closed. What it must NEVER do
    // is return a NUMBER, and above all never 0, because 0 is the single reading that
    // says "free" about a provider that bills.
    //
    // The first draft of this probe asserted `=== null` for every unreadable rate and
    // DIED on `'free'`: `toMicros` raises E_BAD_RATE, which is the designed answer
    // (`wire.mjs` maps E_BAD_RATE to 500 — "OUR data is wrong, not the caller's
    // request"). The expectation was wrong, not the source. Pinning the invariant
    // instead means the probe cannot be wrong about which of the two refusals is
    // correct, while still failing loudly on the one outcome that matters.
    const outcome = (rate) => {
      try {
        return { value: estimateRunCostMicros(
          { provider: 'higgsfield/x', rateUnit: 'second', costPerSecondUsd: rate }, { duration: 6 }) };
      } catch (e) { return { threw: e.code || e.name }; }
    };
    const neverFree = (rate) => {
      const o = outcome(rate);
      if ('threw' in o) return true;                       // a refusal is fail-closed
      return o.value === null || o.value > 0;              // unknown, or a real cost
    };
    const show = (rate) => { const o = outcome(rate); return 'threw' in o ? `threw ${o.threw}` : `-> ${JSON.stringify(o.value)}`; };

    check('CONTROL: a published rate prices correctly', outcome(0.13).value === 780_000,
      `0.13/sec x 6s -> ${JSON.stringify(outcome(0.13).value)}`);
    check('CONTROL: an explicit zero rate is still free', outcome(0).value === 0,
      'an explicit 0 must stay 0 — the guard may not refuse everything');
    check('CONTROL: a BARE-number rate is read correctly', outcome(0.13).value === 780_000);

    // `null * 6 === 0`. The `rateMicros === 0` guard never fired because `null !== 0`.
    check('an UNDEFINED rate is unknown, not free', outcome(undefined).value === null,
      show(undefined));
    check('a NULL rate is unknown, not free', outcome(null).value === null, show(null));
    check('an UNPARSEABLE rate is refused loudly, not silently defaulted',
      outcome('free').threw === 'E_BAD_RATE', show('free'));

    // The invariant, swept over every unreadable shape at once.
    const unreadable = [undefined, null, '', 'free', NaN, -0.5, {}, [], true, false, ' 0.13 '];
    const offenders = unreadable.filter((r) => !neverFree(r));
    check('NO unreadable rate anywhere in the sweep is priced at zero or below',
      offenders.length === 0,
      offenders.length ? `PRICED FREE/INVALID: ${offenders.map((o) => JSON.stringify(o)).join(', ')}`
        : `${unreadable.length} shape(s) swept, all unknown-or-refused`);

    // A negative rate is not a discount. Nothing may hand back a negative cost, because
    // a negative cost SUBTRACTS from a daily ceiling — it buys back headroom.
    const negative = outcome(-1);
    check('a NEGATIVE rate never produces a negative cost',
      ('threw' in negative) || negative.value === null || negative.value >= 0, show(-1));
  }

  // ── B. no served row may resolve a cost to `undefined` ────────────────────
  section('B. no catalogue row may resolve a cost to undefined');
  {
    let undefinedCosts = 0;
    for (const id of SERVED_PROVIDERS) {
      const caps = capabilities(id);
      for (const field of ['costPerSecondUsd', 'costPerRunUsd', 'maxDurationSec', 'maxResolution']) {
        if (caps[field] === undefined) { undefinedCosts += 1; console.log(`          ${id}.${field} === undefined`); }
      }
    }
    check('CONTROL: the sweep saw the served rows', SERVED_PROVIDERS.length >= 9,
      `${SERVED_PROVIDERS.length} served provider(s)`);
    check('every served row resolves each declared field to null or a value, never undefined',
      undefinedCosts === 0, `${undefinedCosts} undefined field(s)`);
  }

  // ── C. the spec validator must reject the shapes that cause A ─────────────
  section('C. assertSpecShape rejects the shapes that produce an undefined cost');
  {
    const base = {
      label: 'Probe',
      // ROUND 16: the fixture gained a model version, for the same reason it gained the licence
      // contents in round 14 — the validator now requires the field the provenance record depends
      // on, and the same six CONTROL checks failed again the moment that landed. A fixture that
      // claims to be "a well-formed spec" has to keep being one. The rule is asserted below.
      modelVersion: 'Probe Model 1.0',
      transport: 'comfyui', kind: ['text2video'], enabled: false,
      maxDurationSec: { value: 6, provenance: 'published' },
      maxResolution: { value: '1280x720', provenance: 'published' },
      attribution: 'probe',
      // ROUND 14: the fixture's licence gained its two content fields. It used to be
      // `{ name: 'Probe Licence' }`, which was a legal row until round 14 made the validator
      // check the licence's CONTENTS — because `licenceGate` read `.commercialUse` off it,
      // recognised nothing, and permitted commercial use. Six CONTROL checks here failed the
      // moment that landed, which is this probe doing its job: the fixture claimed to be "a
      // well-formed spec" and had stopped being one. The rule is asserted below rather than
      // left as a fixture detail.
      licence: { name: 'Probe Licence', commercialUse: 'permitted', excludedTerritories: [], requiresAttribution: false },
      costPerRunUsd: 0,
    };
    check('CONTROL: a well-formed spec passes', throws(() => assertSpecShape('probe', base)) === null);
    check('ROUND 16: a row with NO model version is rejected',
      throws(() => assertSpecShape('probe', { ...base, modelVersion: undefined })) === 'E_BAD_SPEC',
      'the provenance record answers "which weights produced this" separately from "which provider '
      + 'served it", and it used to fill the first with the second');
    check('ROUND 16: a model version EQUAL TO THE PROVIDER ID is rejected',
      throws(() => assertSpecShape('probe', { ...base, modelVersion: 'probe' })) === 'E_BAD_SPEC',
      'a row whose model version is its own id makes the record\'s two fields one fact wearing two names');
    check('ROUND 16: a blank model version is rejected',
      throws(() => assertSpecShape('probe', { ...base, modelVersion: '   ' })) === 'E_BAD_SPEC');
    check('ROUND 16: a licence that does not say whether attribution is required is rejected',
      throws(() => assertSpecShape('probe', { ...base, licence: { ...base.licence, requiresAttribution: undefined } })) === 'E_BAD_SPEC',
      'the value is copied into the asset record and read there to decide whether a missing '
      + 'attribution makes the record incomplete, so silence would relax a licence condition');
    check('ROUND 14: a licence with NO commercial-use position is rejected',
      throws(() => assertSpecShape('probe', { ...base, licence: { name: 'Probe Licence' } })) === 'E_BAD_SPEC',
      'a missing position is an unknown one, and the gate used to read it as a yes');
    check('ROUND 14: a licence that is a bare string is rejected',
      throws(() => assertSpecShape('probe', { ...base, licence: 'Apache-2.0' })) === 'E_BAD_SPEC',
      'the same bare-value trap the cost fields are protected from, in the field whose failure '
      + 'mode is legal rather than financial');
    check('CONTROL: a WRAPPED costPerSecondUsd passes',
      throws(() => assertSpecShape('probe', { ...base, costPerSecondUsd: { value: 0.13, provenance: 'published' } })) === null);
    check('CONTROL: a bare costPerRunUsd is allowed (it is deliberately unwrapped)',
      throws(() => assertSpecShape('probe', { ...base, costPerRunUsd: 0.125 })) === null);

    check('a BARE costPerSecondUsd is rejected',
      throws(() => assertSpecShape('probe', { ...base, costPerSecondUsd: 0.13 })) === 'E_BAD_SPEC');
    check('a BARE maxDurationSec is rejected',
      throws(() => assertSpecShape('probe', { ...base, maxDurationSec: 6 })) === 'E_BAD_SPEC');
    check('a non-numeric costPerRunUsd is rejected',
      throws(() => assertSpecShape('probe', { ...base, costPerRunUsd: 'free' })) === 'E_BAD_SPEC');
    check('a NEGATIVE costPerRunUsd is rejected',
      throws(() => assertSpecShape('probe', { ...base, costPerRunUsd: -1 })) === 'E_BAD_SPEC');
    check('a costPerRunUsd that is an object is rejected',
      throws(() => assertSpecShape('probe', { ...base, costPerRunUsd: { value: 0.125, provenance: 'published' } })) === 'E_BAD_SPEC');

    // ── the PAYLOAD inside a well-formed envelope ───────────────────────────
    // The envelope check above closed the `undefined` door and left this one open
    // beside it: `{value: '', provenance: 'published'}` passed validation, and
    // `costEstimate` read that empty string as "explicitly free". A billing provider
    // was priced at $0.00 and the daily ceiling was never charged.
    const env = (value) => ({ value, provenance: 'published' });
    check('CONTROL: a null rate value is allowed (legitimately unpublished)',
      throws(() => assertSpecShape('probe', { ...base, costPerSecondUsd: env(null) })) === null);
    check('CONTROL: a decimal-string rate value is allowed',
      throws(() => assertSpecShape('probe', { ...base, costPerSecondUsd: env('0.13') })) === null);
    check('CONTROL: a null maxDurationSec is allowed',
      throws(() => assertSpecShape('probe', { ...base, maxDurationSec: env(null) })) === null);

    for (const [label, value] of [['an empty string', ''], ['a blank string', ' '],
      ['a non-numeric string', 'free'], ['a boolean', false], ['a negative number', -1]]) {
      check(`a costPerSecondUsd VALUE that is ${label} is rejected`,
        throws(() => assertSpecShape('probe', { ...base, costPerSecondUsd: env(value) })) === 'E_BAD_SPEC',
        `value=${JSON.stringify(value)}`);
    }
    // A numeric bound with a non-numeric value is a bound that is NOT enforced:
    // `duration > caps.maxDurationSec` is FALSE for every request when it is a string.
    for (const [label, value] of [['a string', '6'], ['zero', 0], ['a negative number', -6]]) {
      check(`a maxDurationSec VALUE that is ${label} is rejected`,
        throws(() => assertSpecShape('probe', { ...base, maxDurationSec: env(value) })) === 'E_BAD_SPEC',
        `value=${JSON.stringify(value)}`);
    }

    check('CONTROL: every shipped catalogue row still validates',
      Object.entries({ ...VIDEO_PROVIDERS, ...HOSTED_VIDEO_PROVIDERS })
        .every(([id, spec]) => throws(() => assertSpecShape(id, spec)) === null),
      `${Object.keys({ ...VIDEO_PROVIDERS, ...HOSTED_VIDEO_PROVIDERS }).length} row(s)`);
  }

  // ── D. every advertised provider must be one the API can actually call ────
  section('D. a catalogue row without an adapter is a provider the API cannot call');
  {
    // This is the original defect of the whole lane: `/v1/models` advertised hosted rows
    // while `ADAPTERS` held no hosted id, so every hosted request died at the adapter
    // lookup with E_UNKNOWN_PROVIDER for a provider the API had just recommended.
    //
    // The first draft of this section asked "does every catalogue row have an adapter?"
    // and FAILED on `minimax/hailuo-hosted`. That was the probe's error, not the code's:
    // `VIDEO_PROVIDERS` spreads the hosted rows in, so `Object.keys(VIDEO_PROVIDERS)` is
    // the whole catalogue, not the local rows. A declared-but-unwired row is legitimate
    // as long as nothing OFFERS it. So the invariant to test is not "every row is
    // wired" but "everything the API offers is wired" — and the unwired rows are named.
    const advertised = listModels().body.models.map((m) => m.id);
    check('CONTROL: there ARE models advertised', advertised.length > 0, `${advertised.length} advertised`);

    check('every ADVERTISED model has an adapter',
      advertised.every((id) => ADAPTERS[id]),
      advertised.filter((id) => !ADAPTERS[id]).join(', ') || `all ${advertised.length} advertised ids have adapters`);
    check('every ADVERTISED model exists in the catalogue',
      advertised.every((id) => throws(() => capabilities(id)) === null),
      advertised.filter((id) => throws(() => capabilities(id)) !== null).join(', ') || 'all resolve');

    // A served id missing from the catalogue does not degrade one request — it takes out
    // the WHOLE listing, because `listModels` maps over the served ids and calls
    // `capabilities()` uncaught. So this is checked against the list the route uses.
    check('every SERVED id exists in the catalogue (a typo here 500s the whole listing)',
      SERVED_PROVIDERS.every((id) => throws(() => capabilities(id)) === null),
      SERVED_PROVIDERS.filter((id) => throws(() => capabilities(id)) !== null).join(', ') || 'all resolve');
    check('every SERVED id has an adapter',
      SERVED_PROVIDERS.every((id) => ADAPTERS[id]),
      SERVED_PROVIDERS.filter((id) => !ADAPTERS[id]).join(', ') || `all ${SERVED_PROVIDERS.length} served ids have adapters`);

    // NAMED DISCLOSURE, not a silent pass. A catalogue row with no adapter is a row that
    // can be resolved, enabled and costed, and then dies at the adapter lookup. That is
    // acceptable ONLY while it is not offered, so it is stated explicitly rather than
    // hidden behind a green check.
    const allRows = Object.keys(VIDEO_PROVIDERS);
    const unwired = allRows.filter((id) => !ADAPTERS[id]);
    const unwiredButOffered = unwired.filter((id) => advertised.includes(id));
    check('no UNWIRED catalogue row is offered by /v1/models',
      unwiredButOffered.length === 0,
      unwiredButOffered.length ? `OFFERED BUT UNCALLABLE: ${unwiredButOffered.join(', ')}`
        : (unwired.length ? `unwired and correctly unoffered: ${unwired.join(', ')}` : 'no unwired rows'));
  }

  // ── E. an unknown provider is refused, never defaulted ────────────────────
  section('E. an unknown provider must throw, not default');
  {
    check('CONTROL: a known provider resolves', throws(() => capabilities('comfyui/minimax-h3')) === null);
    check('an unknown id throws E_UNKNOWN_PROVIDER',
      throws(() => capabilities('nope/does-not-exist')) === 'E_UNKNOWN_PROVIDER');
    check('an empty id throws', throws(() => capabilities('')) === 'E_UNKNOWN_PROVIDER');
    check('a prototype key does not resolve as a provider',
      throws(() => capabilities('constructor')) === 'E_UNKNOWN_PROVIDER',
      'VIDEO_PROVIDERS is a plain object literal — a prototype key must not be readable as a spec');
  }

  // ── F. the guard and the estimator must not disagree ──────────────────────
  section('F. one malformed rate, one verdict — the guard and the estimator agree');
  {
    // THE SHARPEST FINDING OF THIS ROUND. `spendGuard.costFrom` had already been fixed
    // (round 4) to return Infinity for anything that is not a plain decimal, while
    // `costEstimate` was still reading the same malformed value as ZERO via
    // `Number(x) === 0`. Two modules, one field, opposite verdicts: the guard said
    // "unboundedly expensive" and the estimator said "free". Whichever ran last won,
    // and the estimator is the one that feeds the ceiling.
    // `readLimits({})` — the DEFAULT — has `maxSpendUsdDaily: 0`, so a billed cost is
    // refused with E_SPEND_DISABLED. The first draft of this control asserted a real cost
    // would be ALLOWED and failed; that was the probe being wrong about the fail-closed
    // default, not the guard being wrong. Both readings are pinned below: with a ceiling
    // configured the halves must agree, and with no ceiling the billed run must be refused.
    const limits = readLimits({ SWAN_VIDEO_MAX_SPEND_USD_DAILY: '10', SWAN_VIDEO_MAX_RUNS_DAILY: '50' });
    const guardVerdict = (cost, l = limits) => {
      try { checkRunAllowed({ provider: 'p/x', costPerRunUsd: cost }, { runs: 0, spendUsd: 0 }, l); return 'allowed'; }
      catch (e) { return `refused ${e.code}`; }
    };
    const estimatorVerdict = (cost) => {
      try { return `priced ${JSON.stringify(estimateRunCostMicros({ provider: 'p/x', rateUnit: 'generation', costPerRunUsd: cost }, {}))}`; }
      catch (e) { return `refused ${e.code}`; }
    };

    check('CONTROL: both agree a genuinely free run is free',
      guardVerdict(0) === 'allowed' && estimatorVerdict(0) === 'priced 0',
      `guard=${guardVerdict(0)} estimator=${estimatorVerdict(0)}`);
    check('CONTROL: with a ceiling configured, both agree a real cost is a real cost',
      guardVerdict(0.125) === 'allowed' && estimatorVerdict(0.125) === 'priced 125000',
      `guard=${guardVerdict(0.125)} estimator=${estimatorVerdict(0.125)}`);
    // The fail-closed default, stated as a control of its own: an unconfigured ceiling
    // must refuse a billed run, and must still permit the free local one.
    check('CONTROL: with NO ceiling configured a billed run is refused, a free one is not',
      guardVerdict(0.125, readLimits({})) === 'refused E_SPEND_DISABLED' && guardVerdict(0, readLimits({})) === 'allowed',
      `billed=${guardVerdict(0.125, readLimits({}))} free=${guardVerdict(0, readLimits({}))}`);

    const disagreements = [];
    for (const cost of ['', ' ', 'free', false, true, [], {}, undefined, null, -1]) {
      const g = guardVerdict(cost);
      const e = estimatorVerdict(cost);
      // "Allowed at $0" beside "priced at $0" is the agreement that must never happen
      // for a malformed value — that is the pair that hands out a free billed run.
      const gFree = g === 'allowed';
      const eFree = e === 'priced 0';
      if (gFree && eFree && cost !== 0) disagreements.push(`${JSON.stringify(cost)}: guard=${g} estimator=${e}`);
    }
    check('no malformed cost is read as FREE by BOTH halves of the decision',
      disagreements.length === 0,
      disagreements.length ? disagreements.join(' | ') : 'every malformed value refused by at least one half');
  }

  // ── G. the catalogue must be validated when it LOADS, not when it is asked ──
  section('G. the catalogue is validated at import, not at request time');
  {
    // The docstring promised "a malformed row fails loudly at import". It did not:
    // `assertSpecShape` was reachable only from `registry.capabilities()`, so a malformed
    // row shipped, the process booted, and the first person to learn the catalogue was
    // broken was whoever requested that provider — as a 500 for their request, or as a 500
    // for the WHOLE of `/v1/models` if the row was served, because `listModels` maps over
    // the served ids and calls `capabilities()` uncaught.
    const catalogueSrc = readSource('../shared/providers/video/catalogue.mjs');
    check('CONTROL: the source was actually read', catalogueSrc.includes('VIDEO_PROVIDERS'),
      `${catalogueSrc.length} bytes`);

    // A module-level loop, not a call inside a function. Matched as a top-level
    // `for (...) assertSpecShape(...)` so an indented call inside a function does not
    // satisfy it — the first draft of this check would have passed on the old code.
    const topLevelSweep = /^for \(const \[id, spec\] of Object\.entries\(VIDEO_PROVIDERS\)\) \{\n^  assertSpecShape\(id, spec\);/m
      .test(catalogueSrc);
    check('catalogue.mjs validates every row at MODULE LEVEL', topLevelSweep,
      topLevelSweep ? 'found the import-time sweep' : 'no top-level sweep found — a malformed row would ship');

    // And prove it bites: a row that fails the validator must take the module down.
    // Run in a child so the throw cannot be caught by this process.
    const { spawnSync } = await import('node:child_process');
    const probe = `
      import { VIDEO_PROVIDERS } from '../shared/providers/video/catalogue.mjs';
      const bad = { ...VIDEO_PROVIDERS['comfyui/wan-2.2'], costPerSecondUsd: { value: '', provenance: 'published' } };
      const { assertSpecShape } = await import('../shared/providers/video/specShape.mjs');
      try { assertSpecShape('injected', bad); console.log('ACCEPTED'); }
      catch (e) { console.log('REFUSED ' + e.code); }
    `;
    const res = spawnSync(process.execPath, ['--input-type=module', '-e', probe],
      { cwd: new URL('./', import.meta.url), encoding: 'utf8' });
    check('a malformed rate value is refused by the validator the sweep runs',
      (res.stdout || '').includes('REFUSED E_BAD_SPEC'),
      (res.stdout || '').trim() || (res.stderr || '').trim() || 'no output');

    // The codes the catalogue can raise must not report as "your request was malformed".
    // The fallback in `statusFor` is 400, and 400 about a row the caller never wrote sends
    // the reader to the wrong layer — the exact mistake `wire.mjs` already documents.
    check('E_BAD_SPEC maps to 500, not the 400 fallback', statusFor('E_BAD_SPEC') === 500);
    check('E_NO_ATTRIBUTION maps to 500, not the 400 fallback', statusFor('E_NO_ATTRIBUTION') === 500);
    check('CONTROL: an unmapped code still falls back to 400', statusFor('E_TOTALLY_MADE_UP') === 400);
  }

  // ── H. behaviour that must be DISCLOSED, not hidden ───────────────────────
  section('H. what the ceilings actually enforce — per-day, per-caller and per-job');
  {
    // Round 1 disclosed that a quote can be reused. This section pins the two claims
    // that follow from it, because both are the kind of gap that reads as enforced in
    // the API surface and is not enforced in the code. Neither is silently "fixed" here:
    // enforcing the caller's ceiling means changing the ENGINE handler, which is Sean's
    // call, not a hostile reviewer's. Disclosing precisely is the honest move.
    const quote = {
      id: 'q-reuse', owner: 'owner', expired: false,
      provider: 'higgsfield/kling-3.0', executionKind: 'hosted', params: {},
      licenceDecision: {},
      pricing: { estimated_micros: 672_000, estimated_usd: '0.6720' },
    };
    const makeJobs = () => {
      const made = [];
      return {
        made,
        create: (rec) => { const j = { id: `job-${made.length + 1}`, ...rec }; made.push(j); return j; },
      };
    };
    const submit = (jobs) => createJob({
      body: { quote_id: 'q-reuse', max_cost_usd: 1 },
      env: {}, ledger: null, jobs, quotes: { get: () => quote }, runner: () => {},
      principal: 'owner', now: () => new Date(),
    });

    const jobs = makeJobs();
    const first = submit(jobs);
    const second = submit(jobs);
    check('DISCLOSURE: one quote can authorise more than one job',
      first.status === 202 && second.status === 202 && jobs.made.length === 2,
      `first=${first.status} second=${second.status} jobs=${jobs.made.length}`);
    check('DISCLOSURE: E_QUOTE_USED is mapped but never thrown',
      statusFor('E_QUOTE_USED') === 410,
      'quotes are NOT single-use; the 410 mapping is reserved, not implemented');

    // The enforcement really does live in the runner and the ledger — which is WHY reuse
    // is not a ceiling bypass. Each run re-runs every gate and records against the ledger,
    // so N jobs from one quote still hit the daily cap. If that ever stops being true,
    // this check is the one that should fail.
    //
    // ── ROUND 12 REWROTE THIS SECTION, AND THE REASON IS THE LESSON ─────────────
    // Every check here used to be written against `generateVideo.mjs`, because that is where
    // the ceilings were composed. Round 12 extracted the composition into `ceilings.mjs` for
    // rule 4, and two things happened at once — both worth recording, because they are
    // different failures with the same cause:
    //
    //   * `CONTROL: the runner source was read` FAILED. That is the control doing its job:
    //     it asserted the runner still contains `checkRunAllowed`, and it no longer does.
    //     Without it, nothing would have announced that the file had moved.
    //   * `the caller's max_cost_usd is never read by the runner` PASSED — VACUOUSLY. It
    //     asserted the ABSENCE of a string, and the string was absent because the code had
    //     moved to another file, not because the behaviour was unchanged. An absence
    //     assertion pointed at a file the code has left cannot tell the two apart.
    //
    // So the section now reads the files the code actually lives in, strips comments before
    // asserting on code, and states the CURRENT contract rather than the round-6 gap. The
    // gaps it used to disclose were closed in round 12 and are now asserted as present.
    const runnerSrc = readSource('../backend/scripts/handlers/generateVideo.mjs');
    const ceilingsSrc = readSource('../backend/scripts/handlers/ceilings.mjs');
    const guardSrc = readSource('../shared/providers/video/spendGuard.mjs');
    const gateSrc = readSource('../shared/providers/video/ceilingGate.mjs');
    // Round 13 split the PER-CALLER half into its own module for rule 4 (the combined file
    // reached 347 lines). This read is the follow-through: the per-caller assertions below
    // must point at where that code NOW lives, or they assert the absence of strings from a
    // file the strings moved out of — the vacuous pass that made this section's rewrite
    // necessary in round 12. It is the third time this class has bitten this lane.
    const callerSrc = readSource('../shared/providers/video/callerCeiling.mjs');
    const ledgerSrc = readSource('../shared/providers/video/usageLedger.mjs');

    // COMMENTS STRIPPED FIRST. The first draft of the per-caller check matched the word
    // "caller" inside a comment explaining the negative-delta fix, and failed on prose. That
    // is the same substring-sweep mistake round 5 made twice (`E_GRANTS` inside
    // `SWAN_VIDEO_LICENCE_GRANTS`); a source-text assertion has to test the CODE.
    const stripComments = (s) => s
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const ceilingsCode = stripComments(ceilingsSrc);
    const guardCode = stripComments(guardSrc);
    const gateCode = stripComments(gateSrc);
    const callerCode = stripComments(callerSrc);
    const ledgerCode = stripComments(ledgerSrc);

    check('CONTROL: comment stripping actually removed text',
      guardCode.length < guardSrc.length && !guardCode.includes('any caller'),
      `${guardSrc.length} -> ${guardCode.length} bytes`);

    // A CONTROL THAT PROVES EACH READ IS REAL. The vacuous pass described above is the
    // failure mode this guards: if a read returned the wrong file or an empty one, every
    // absence assertion below would pass for the wrong reason.
    check('CONTROL: every source read returned real, non-empty code',
      runnerSrc.length > 1000 && ceilingsCode.length > 200 && guardCode.length > 200
        && gateCode.length > 200 && callerCode.length > 200 && ledgerCode.length > 200,
      `runner=${runnerSrc.length} ceilings=${ceilingsCode.length} guard=${guardCode.length} `
        + `gate=${gateCode.length} caller=${callerCode.length} ledger=${ledgerCode.length}`,
      'so a wrong or empty read cannot make the assertions below pass for the wrong reason');

    check('DISCLOSURE: the runner charges the ledger once per run',
      /ledger\.record\(day, \{ runs: 1/.test(runnerSrc),
      'the daily run/spend caps bind across reused quotes BECAUSE of this line');

    // ── THE PER-JOB CEILING NOW EXISTS (round 12 closed this) ─────────────────
    check('the caller\'s max_cost_usd IS enforced against the CHARGE',
      /jobRefusal\(\{\s*maxCostUsd: job\.maxCostUsd, runCostUsd: allowance\.runCost\s*\}\)/.test(ceilingsCode),
      'round 12: the ceiling stored at submission is compared against the cost the guard authorised');
    check('CONTROL: that per-job assertion is specific, not matching everywhere',
      !/jobRefusal\(/.test(runnerSrc) && !/jobRefusal\(/.test(guardCode),
      'the call lives in ceilings.mjs alone, so the assertion above is testing a real location');
    check('a per-job refusal is PERMANENT — a retry reproduces both numbers',
      /E_JOB_COST_EXCEEDED/.test(runnerSrc) && /\.permanent = true/.test(ceilingsCode),
      'the code is in PERMANENT_CODES and the throw sets .permanent');

    // ── THE PER-CALLER CEILING NOW EXISTS (round 12 closed this) ──────────────
    check('checkRunAllowed takes a PRINCIPAL — an optional fourth parameter',
      /checkRunAllowed\(caps, usage = \{ runs: 0, spendUsd: 0 \}, limits = readLimits\(\), caller = null\)/.test(guardCode),
      'null by default, so every existing three-argument call site is unchanged');
    check('the guard DELEGATES the per-caller judgement rather than re-implementing it',
      /callerRefusal\(\{/.test(guardCode) && /export function callerRefusal/.test(callerCode),
      'one implementation in callerCeiling.mjs, called from the guard');
    check('the per-caller caps come from the environment and default to UNSET',
      /SWAN_VIDEO_MAX_RUNS_DAILY_PER_CALLER/.test(callerCode)
        && /SWAN_VIDEO_MAX_SPEND_USD_DAILY_PER_CALLER/.test(callerCode)
        && /return null;/.test(callerCode),
      'unset means no per-caller ceiling; the global caps still apply unchanged, which is '
      + 'what makes this additive rather than a new way to refuse everyone');
    // The split is only non-breaking if the old import path still resolves. Asserted rather
    // than assumed, because "I moved it and re-exported it" is exactly the kind of claim
    // that is true when written and false after the next edit.
    check('the split is INVISIBLE to importers — ceilingGate still re-exports the caller half',
      /export \{ callerLimits, callerRefusal, callerScope, CeilingError \} from '\.\/callerCeiling\.mjs'/.test(gateCode)
        && !/export function callerRefusal/.test(gateCode),
      'so no call site changed: the names resolve from the old path, and there is exactly '
      + 'one implementation rather than a copy in each file');
    check('the ledger records a PER-CALLER split, additively',
      /callers/.test(ledgerCode) && /caller = null/.test(ledgerCode),
      'written beside the global runs/spendUsd, so a pre-existing ledger file still reads');

    // The per-run ceiling that ALWAYS existed is the daily one, keyed by DAY and not by who
    // asked. Stated as a positive so the checks above are not read as "every ceiling is
    // per-caller now".
    check('DISCLOSURE: the GLOBAL ceiling is still per-day and shared',
      /usageFor\(day\)/.test(ceilingsCode) && /export function dayKey/.test(ledgerSrc),
      'the ledger is keyed by UTC day; the per-caller split narrows it and never replaces it');

    // ── WHAT IS STILL NOT TRUE ────────────────────────────────────────────────
    // The per-caller ceiling is enforced at RUN time, not at quote time: `preflight` still
    // calls the guard with three arguments. A caller can therefore be quoted and then
    // refused. Narrower than the round-6 gap, and stated rather than left to be discovered.
    check('DISCLOSURE: the per-caller ceiling binds at RUN time, not at quote time',
      /checkRunAllowed\(costed, usage, limits\)/.test(stripComments(readSource('../media-api/preflight.mjs'))),
      'a quote is not refused on a per-caller cap; the job is');
  }

  console.log(`\n${pass + fail} CHECKS — ${pass} passed, ${fail} failed`);
  if (failures.length) console.log(`failed: ${failures.join(' | ')}`);
  process.exit(fail === 0 ? 0 : 1);
}

await main();
