/**
 * hostile-round15-probe.mjs — round 14's code, attacked as new code.
 *
 * ── WHY THIS ROUND EXISTS ───────────────────────────────────────────────────
 * This is the round-13 discipline applied one turn later, and it is the only round that
 * can be trusted on round 14's work. Round 14 added `licenceTerms.mjs`, rewrote the
 * judgement in `licenceGate.mjs`, added a validator block to `specShape.mjs`, and
 * registered three new error codes. **Every line of it is covered only by probes written
 * in this lane, in the same round, by the same author** — and round 14's own subject was
 * a gate whose documented clearing procedure was also its bypass. An author who has just
 * demonstrated that failure mode is not the person to certify that it is gone.
 *
 * ── WHAT ROUND 14 ESTABLISHED, AND WHAT IT DID NOT ──────────────────────────
 * Round 14's rule is: **a field the gate reads as a closed, enumerated fact must be
 * validated as closed, and a value it does not recognise is not a yes.** It applied that
 * rule once per field it reads — `commercialUse`, `evidence`, `licence` itself,
 * `excludedTerritories`. It did **not** apply it to the one field that decides whether the
 * gate runs at all, and it did not check that the two places which READ a licence agree
 * about what they are reading.
 *
 * So round 15 asks two questions round 14 never asked:
 *
 *   A. **What does the gate do with a `commercial` value it has never seen?** The same
 *      question, one level up — and the answer decides whether any of round 14's work
 *      happens at all.
 *   B. **Do the gate and the WIRE agree about what they are reading?** The route that
 *      publishes a row's licence reads `evidence` with a different rule than the gate
 *      uses to refuse on it, which is the same defect round 14 fixed inside the gate,
 *      surviving one module away.
 *
 * ── WHAT THIS ROUND DOES NOT DO ─────────────────────────────────────────────
 * It does not re-litigate round 14's vocabulary, its messages, or `territories()`.
 * Section E re-asserts the shipped rows and the territory helper so a fix here cannot
 * quietly move them.
 */

import { readFileSync } from 'node:fs';
import {
  licenceRefusal, territories,
} from '../shared/providers/video/licenceGate.mjs';
import {
  COMMERCIAL_USE, evidenceUnretrieved, isKnownCommercialUse,
} from '../shared/providers/video/licenceTerms.mjs';
import { resolve } from '../shared/providers/video/registry.mjs';
import { assertSpecShape, VIDEO_PROVIDERS } from '../shared/providers/video/catalogue.mjs';
import { isPermanentCode } from '../backend/scripts/handlers/generateVideo.mjs';
import { STATUS_BY_CODE } from '../media-api/wire.mjs';
import { listModels } from '../media-api/routesCatalog.mjs';

let passed = 0; let failed = 0;
const check = (name, ok, detail) => {
  if (ok) { passed += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
};
const section = (t) => console.log(`\n── ${t} ──`);
const throws = (fn) => { try { fn(); return null; } catch (e) { return e.code || e.message; } };

const NO_GRANTS = new Set();
const LOCAL = 'comfyui/minimax-h3';           // requires-grant, excludes US
const HOSTED_VENDOR = 'higgsfield/minimax-h3';

/** A row that MUST refuse for commercial use in the US with no grant on file. */
const restricted = (over = {}) => ({
  name: 'test terms', restricts: 'none', commercialUse: COMMERCIAL_USE.REQUIRES_GRANT,
  excludedTerritories: ['US'], grantRequestDoc: null, requiresAttribution: false,
  ...over,
});
const gate = (licence, over = {}) =>
  licenceRefusal({ id: 'test/provider', licence, commercial: true, territory: 'US', grants: NO_GRANTS, ...over });
const code = (licence, over = {}) => (gate(licence, over) || {}).code || null;

const readSource = (rel) =>
  readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const stripComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

function main() {
  console.log('HOSTILE PROBE — ROUND 15: the round-14 code, as new code\n');

  // ══ A. `commercial` decides whether the gate runs at all ══════════════════
  section('A. a `commercial` value the gate has never seen must not disable the gate');
  {
    // Round 14's rule, applied to the field that gates everything else. `if (!commercial)
    // return null` reads TRUTHINESS, so every falsy non-boolean — 0, '', null, NaN —
    // takes the "non-commercial" branch and skips the entire licence judgement. The
    // question is not whether a real caller passes those today (they do not: both
    // boundaries read `p.commercial !== false`); it is what the gate does with a value it
    // does not recognise. Round 14's answer for four other fields was "refuse".
    const ambiguous = [
      [0, 'zero'],
      ['', 'the empty string'],
      [null, 'null'],
      [undefined, 'undefined'],
      [NaN, 'NaN'],
    ];
    for (const [value, why] of ambiguous) {
      check(`A. commercial=${value === undefined ? 'undefined' : JSON.stringify(value)} (${why}) does NOT skip the gate`,
        code(restricted(), { commercial: value }) !== null,
        `-> ${JSON.stringify(code(restricted(), { commercial: value }))} — a row that requires a grant `
        + 'and excludes the operator territory is permitted outright, because an ambiguous value '
        + 'was read as "not commercial". "Not commercial" is a CLAIM, and the only value that makes '
        + 'it is the boolean `false`.');
    }

    // CONTROLS. The fix must not turn a genuine non-commercial run into a refusal.
    check('CONTROL: commercial=false still bypasses the licence gate entirely',
      code(restricted(), { commercial: false }) === null,
      `-> ${JSON.stringify(code(restricted(), { commercial: false }))} — this is what lets a `
      + 'licence-pending model be enabled for non-commercial work, which is the current H3 position');
    check('CONTROL: commercial=true still refuses the restricted row',
      code(restricted(), { commercial: true }) === 'E_LICENCE_GRANT_REQUIRED',
      `-> ${JSON.stringify(code(restricted(), { commercial: true }))}`);

    // The end-to-end form, because `resolve`'s default only fires on `undefined` — an
    // explicit falsy value reaches the gate unchanged.
    check('A. resolve() with commercial=0 does not permit a US commercial run',
      throws(() => resolve(LOCAL, { commercial: 0, territory: 'US', grants: NO_GRANTS, requireEnabled: false })) !== null,
      `-> ${JSON.stringify(throws(() => resolve(LOCAL, { commercial: 0, territory: 'US', grants: NO_GRANTS, requireEnabled: false })))}`);
    check('CONTROL: resolve() with commercial=false still permits it',
      throws(() => resolve(LOCAL, { commercial: false, territory: 'US', grants: NO_GRANTS, requireEnabled: false })) === null);

    // A GUARD WHOSE SAFETY RESTS ON ANOTHER FILE'S COERCION NEEDS AN ASSERTION.
    // Both HTTP boundaries read `params.commercial !== false`, so only the boolean
    // `false` means non-commercial and every other value — including the string
    // "false" — is treated as commercial. That is the fail-closed direction, and it is
    // asserted here so that relaxing either boundary to a truthiness test fails this
    // probe rather than quietly opening the gate.
    const boundaryReads = ['../media-api/preflight.mjs', '../backend/scripts/handlers/generateVideo.mjs']
      .map(f => stripComments(readSource(f)));
    check('A. both HTTP boundaries read `!== false`, so only the boolean false is non-commercial',
      boundaryReads.every(src => /commercial:\s*(?:params|p)\.commercial\s*!==\s*false/.test(src)),
      'a truthiness test here would make the string "false" a non-commercial run');
    check('CONTROL: that source assertion is not vacuous — the files really were read',
      boundaryReads.every(src => src.includes('commercial')), 'both sources contain the word');
  }

  // ══ B. the gate and the WIRE must agree about `evidence` ══════════════════
  section('B. the route that publishes a licence must read `evidence` the way the gate does');
  {
    // `routesCatalog.listModels` used to render `caps.licence.evidence ?? 'retrieved'`. That
    // is `??`, which catches null and undefined and nothing else — while the gate's test is
    // "the flag is present and non-empty". Two different rules for one field, one module
    // apart, which is the defect round 14 fixed INSIDE the gate. Round 15 found it surviving
    // outside it: the wire could publish `"pending"`, `""` or `"  "` — values the field is
    // not documented to carry — and could publish `"retrieved"` about a row the gate refuses.
    //
    // This section therefore DRIVES THE REAL ROUTE rather than reimplementing its
    // expression. A local copy of the old rule can only ever report what the old rule did;
    // it cannot tell you what the route does now, and a probe that asserts against its own
    // model of the code is the failure mode this whole lane keeps finding.
    const asGated = (evidence) => (evidenceUnretrieved({ evidence }) ? 'unretrieved' : 'retrieved');
    const published = listModels({ env: {} });
    const disagreeing = published.body.models.filter((m) => {
      const licence = VIDEO_PROVIDERS[m.id]?.licence;
      return m.licence.evidence !== asGated(licence ? licence.evidence : undefined);
    });
    check('B. /v1/models publishes the evidence state the GATE acts on, for every row',
      disagreeing.length === 0,
      disagreeing.length
        ? `DISAGREE on ${disagreeing.map(m => `${m.id} -> ${JSON.stringify(m.licence.evidence)}`).join(', ')}`
        : `${published.body.models.length} row(s) published, all agreeing with the gate`);
    check('CONTROL: the route really was driven, over every served row',
      published.status === 200 && published.body.models.length >= 9,
      `${published.body.models.length} row(s)`);

    // ...AND AT THE SOURCE, because the published values are all the same for the rows that
    // ship today — a behaviour check alone cannot distinguish "the route derives it" from
    // "the route happens to be right about these particular rows".
    const catalogSrc = stripComments(readSource('../media-api/routesCatalog.mjs'));
    check('B. the route derives the field from the shared predicate, not a `??` default',
      /evidence:\s*evidenceUnretrieved\(/.test(catalogSrc),
      `-> routesCatalog's licence block renders: ${(catalogSrc.match(/evidence:\s*evidenceUnretrieved\([^\n]*/) || ['<no shared-predicate call found>'])[0].trim()}`);
    check('CONTROL: the route source really was read and contains the licence block',
      catalogSrc.includes('commercial_use') && catalogSrc.includes('excluded_territories'),
      'so the assertion above is testing a real location');

    // WHY B2 IS LOAD-BEARING: the two rules are NOT equivalent, so which one the route uses
    // is a real decision and not a stylistic preference. This asserts the disagreement as a
    // FACT about the two rules — the old `??` form and the gate's predicate — which is what
    // made the route wrong. It is a CONTROL rather than a defect check because the route no
    // longer uses the old form; if a future edit reintroduces it, B1 and B2 fail.
    const asOldRule = (evidence) => evidence ?? 'retrieved';
    const notEquivalent = ['pending', 'claim', '', '  '].filter(f => asOldRule(f) !== asGated(f));
    check('CONTROL: the old `??` rule and the gate\'s predicate are not equivalent',
      notEquivalent.length === 4,
      `they differ on ${notEquivalent.map(f => JSON.stringify(f)).join(', ')} — so the route's `
      + 'expression is a decision about what a caller is told, not a formatting choice');
  }

  // ══ C. round 14's validator asymmetry, asserted rather than assumed ═══════
  section('C. the validator\'s evidence-vs-position rule is deliberate, and asymmetric on purpose');
  {
    const base = VIDEO_PROVIDERS[LOCAL];
    const withLicence = (over) => throws(() => assertSpecShape('probe', { ...base, licence: { ...base.licence, ...over } }));

    // A row that claims a POSITION while admitting the terms are unread is the original
    // hosted defect, and it is rejected. That is round 14's strongest single assertion.
    for (const position of [COMMERCIAL_USE.PERMITTED, COMMERCIAL_USE.REQUIRES_GRANT]) {
      check(`C. evidence + commercialUse="${position}" is rejected at import`,
        withLicence({ evidence: 'unretrieved', commercialUse: position }) === 'E_BAD_SPEC',
        `-> ${JSON.stringify(withLicence({ evidence: 'unretrieved', commercialUse: position }))} — the flag `
        + 'says the terms have not been read and the position says they have');
    }

    // THE OTHER TWO ARE ACCEPTED, AND THAT IS THE DELIBERATE PART. "We have not read the
    // terms, but we believe they forbid commercial use" is a COHERENT state — both halves
    // refuse, so the row is safe either way. Rejecting it would delete the record rather
    // than gate it, which is the opposite of what this lane does with unretrieved terms.
    for (const position of [COMMERCIAL_USE.PROHIBITED, COMMERCIAL_USE.UNVERIFIED]) {
      check(`C. evidence + commercialUse="${position}" is ACCEPTED (both halves refuse)`,
        withLicence({ evidence: 'unretrieved', commercialUse: position }) === null,
        'rejecting it would delete an honest record; the gate refuses it either way, which is asserted next');
      check(`C. ...and the gate does refuse that row`,
        code({ ...base.licence, evidence: 'unretrieved', commercialUse: position }) !== null,
        `-> ${JSON.stringify(code({ ...base.licence, evidence: 'unretrieved', commercialUse: position }))}`);
    }

    check('CONTROL: no evidence flag with a valid position is accepted',
      withLicence({ evidence: undefined, commercialUse: COMMERCIAL_USE.PERMITTED }) === null);
  }

  // ══ D. every code round 14 added is REACHABLE and MAPPED ══════════════════
  section('D. the three new codes are reachable, and classified in both tables');
  {
    const reachable = {
      E_LICENCE_POSITION_UNKNOWN: code({ name: 'x', commercialUse: 'not-a-position', excludedTerritories: [] }),
      E_LICENCE_PROHIBITED: code({ name: 'x', commercialUse: COMMERCIAL_USE.PROHIBITED, excludedTerritories: [] }),
      E_LICENCE_UNVERIFIED: code({ name: 'x', commercialUse: COMMERCIAL_USE.UNVERIFIED, excludedTerritories: [] }),
    };
    for (const [expected, actual] of Object.entries(reachable)) {
      // A code that is MAPPED but never thrown claims an enforcement that does not exist —
      // round 7 asserts that in both directions, and this is the dynamic half of it.
      check(`D. ${expected} is actually thrown`,
        actual === expected, `-> ${JSON.stringify(actual)}`);
      check(`D. ${expected} maps to 403, not the default 400`,
        STATUS_BY_CODE[expected] === 403,
        `-> ${JSON.stringify(STATUS_BY_CODE[expected])} — a licence refusal is authorisation, not syntax`);
      check(`D. ${expected} is PERMANENT in the runner`,
        isPermanentCode(expected) === true,
        'a licence position does not change between attempts, so a retry re-asks an answered question');
    }
    check('CONTROL: a code that is deliberately retryable is still reported as retryable',
      isPermanentCode('E_TIMEOUT') === false,
      'so D is testing the classification, not a function that returns true for everything');
    check('CONTROL: the 400 default is still reachable for a genuinely malformed request',
      STATUS_BY_CODE.E_BAD_INPUT === 400);
  }

  // ══ E. NO REGRESSION — the shipped rows and the territory helper ══════════
  section('E. round 14\'s own results must not move');
  {
    const r = (id, opts) => throws(() => resolve(id, { requireEnabled: false, ...opts }));
    check('E. local H3, commercial, US, no grant -> E_LICENCE_GRANT_REQUIRED',
      r(LOCAL, { commercial: true, territory: 'US', grants: NO_GRANTS }) === 'E_LICENCE_GRANT_REQUIRED');
    check('E. local H3, commercial, CA, no grant -> permitted',
      r(LOCAL, { commercial: true, territory: 'CA', grants: NO_GRANTS }) === null);
    check('E. the vendor hosted rows still refuse as E_LICENCE_EVIDENCE_MISSING',
      r(HOSTED_VENDOR, { commercial: true, grants: NO_GRANTS }) === 'E_LICENCE_EVIDENCE_MISSING',
      'the evidence guard runs BEFORE the position guard, so the shipped rows keep the code the '
      + 'API test asserts');
    check('E. every shipped row still satisfies the validator',
      Object.keys(VIDEO_PROVIDERS).every(id => {
        try { assertSpecShape(id, VIDEO_PROVIDERS[id]); return true; } catch { return false; }
      }));
    check('E. the territory helper is untouched',
      JSON.stringify(territories('US', 'CA')) === JSON.stringify(['US', 'CA'])
      && JSON.stringify(territories(undefined, undefined)) === JSON.stringify(['US']));
    check('E. the vocabulary still has exactly four positions',
      Object.keys(COMMERCIAL_USE).length === 4
      && isKnownCommercialUse('permitted') && !isKnownCommercialUse('prohibited-ish'),
      'round 15 must not add a fifth as a side effect');
  }

  console.log(`\n${passed + failed} CHECKS — ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main();
