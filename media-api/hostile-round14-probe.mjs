/**
 * hostile-round14-probe.mjs — the LICENCE gate, attacked where it is fail-OPEN.
 *
 * ── WHY THE LICENCE GATE AND NOT SOMETHING ELSE ─────────────────────────────
 * Rounds 9–13 hardened money: the guard, the ledger, three ceilings. Every one of those
 * failures costs dollars and is recoverable, because a refused run can be re-run. The
 * licence judgement is the one decision in this lane whose failure mode is LEGAL, and a
 * permissive answer is not recoverable by retrying — it is recoverable by un-shipping a
 * video. Round 11 rewrote it, but before the ceiling work, and it was rewritten to close a
 * hole that was reachable over HTTP. That is the wrong reason to trust the rest of it: a
 * fix aimed at one reachable hole says nothing about the ones nobody tried.
 *
 * ── THE SHAPE OF THE BUG THIS ROUND IS LOOKING FOR ──────────────────────────
 * Every ceiling in round 13 could only REFUSE, so a probe that tests refusals could not
 * see one that refuses too much. The licence gate is the mirror image: it can only refuse
 * via its guards, so everything its guards do not recognise falls through to PERMITTED —
 * and a probe that tests its refusals cannot see that either. The question this round asks
 * is therefore not "does it refuse the bad thing" but **"what does it do with a value it
 * has never seen"**, asked once per field it reads:
 *
 *   licence.commercialUse        read as a CLOSED vocabulary, stored as an OPEN string
 *   licence.evidence             matched by EXACT string equality
 *   licence                     required to exist, never required to BE an object
 *   licence.excludedTerritories read with `.includes()` whatever the type
 *
 * Each of those is the same mistake: a field the gate treats as a known, enumerated
 * fact while nothing — not the catalogue, not `assertSpecShape`, not the registry —
 * constrains what may be written into it.
 *
 * ── THE HEADLINE, STATED BEFORE THE FIX SO IT CANNOT BE SELF-CERTIFIED ──────
 * `catalogueHosted.mjs` tells the operator how to clear the hosted refusal:
 *
 *   "retrieve the vendor's commercial-use and territory terms, then set
 *    `commercialUse` to what they actually say and drop `evidence`."
 *
 * Those terms are a prohibition as often as a permission. Follow the instruction with a
 * prohibitory reading and the row goes from REFUSED to PERMITTED, because `'prohibited'`
 * is not `'requires-grant'` and `evidence` is no longer there to trip the first guard.
 * The documented way to clear the flag is the documented way to open the hole. Section A7
 * asserts exactly that sequence and must FAIL before the fix.
 *
 * ── WHAT THIS PROBE DOES NOT DO ─────────────────────────────────────────────
 * It does not touch `territories()`. Round 11 already attacked it, its rule is "a caller
 * may narrow, never widen", and the two failure directions there are both refusals. It
 * also does not re-litigate whether the H3 restriction binds the OUTPUT — that is settled
 * in `licenceGate.mjs`'s header and asserted by the registry suite.
 */

import { readFileSync } from 'node:fs';
import { licenceRefusal, territories } from '../shared/providers/video/licenceGate.mjs';
import { resolve, readGrants, readEnabled } from '../shared/providers/video/registry.mjs';
import { VIDEO_PROVIDERS, assertSpecShape } from '../shared/providers/video/catalogue.mjs';

let passed = 0; let failed = 0;
const check = (name, ok, detail) => {
  if (ok) { passed += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
};
const section = (t) => console.log(`\n── ${t} ──`);
const throws = (fn) => { try { fn(); return null; } catch (e) { return e.code || e.message; } };

const NO_GRANTS = new Set();
/** A licence row with everything else well-formed, so only the field under test varies. */
const row = (over = {}) => ({
  name: 'test terms', restricts: 'none', commercialUse: 'permitted',
  excludedTerritories: [], grantRequestDoc: null, requiresAttribution: false,
  ...over,
});
/** The judgement, called the way `registry.resolve` calls it. */
const gate = (licence, over = {}) =>
  licenceRefusal({ id: 'test/provider', licence, commercial: true, territory: 'US', grants: NO_GRANTS, ...over });
const code = (licence, over = {}) => (gate(licence, over) || {}).code || null;

const LOCAL = 'comfyui/minimax-h3';       // requires-grant, excludes US
const LOCAL_FREE = 'comfyui/wan-2.2';     // permitted, no exclusion
const HOSTED_LOCAL = 'minimax/hailuo-hosted';
const HOSTED_VENDOR = 'higgsfield/minimax-h3';

function main() {
  console.log('HOSTILE PROBE — ROUND 14: the licence gate, where it fails OPEN\n');

  // ══ A. `commercialUse` — a closed vocabulary stored in an open string ═══════
  section('A. an unrecognised commercial-use position must not read as permission');
  {
    // Every value below means, in plain English, "this is not an unqualified yes". The
    // gate recognises exactly one restrictive value (`'requires-grant'`) and treats the
    // rest of the string space as a yes — including the empty string space.
    const notAYes = [
      ['prohibited', 'the plainest possible no'],
      ['unknown', 'an explicit "we do not know"'],
      ['unverified', 'the value the SHIPPED hosted rows carry'],
      ['not-permitted', 'a hyphenated no'],
      ['No', 'a capitalised no'],
      ['restricted', 'a vaguer no'],
    ];
    for (const [value, why] of notAYes) {
      check(`A. commercialUse=${JSON.stringify(value)} is refused for commercial use`,
        code(row({ commercialUse: value })) !== null,
        `-> ${JSON.stringify(code(row({ commercialUse: value })))} — ${why}. `
        + 'A vocabulary the gate reads as closed must be validated as closed, or the '
        + 'string it does not recognise becomes the most permissive value there is.');
    }

    check('A. an ABSENT commercialUse is refused for commercial use',
      code(row({ commercialUse: undefined })) !== null,
      `-> ${JSON.stringify(code(row({ commercialUse: undefined })))} — a missing position is an `
      + 'unknown position, and unknown is not permissive. This is the same rule the '
      + '`evidence` flag exists to express, applied to the field that carries the answer.');

    // CONTROLS. The fix must not turn the gate into a wall.
    check('CONTROL: commercialUse="permitted" with no exclusion is NOT refused',
      code(row()) === null, `-> ${JSON.stringify(code(row()))}`);
    check('CONTROL: commercialUse="requires-grant" still refuses and names the grant',
      code(row({ commercialUse: 'requires-grant', excludedTerritories: ['US'] })) === 'E_LICENCE_GRANT_REQUIRED',
      `-> ${JSON.stringify(code(row({ commercialUse: 'requires-grant', excludedTerritories: ['US'] })))}`);

    // A DISCLOSURE, PINNED SO NOBODY "FIXES" IT INTO A WORLDWIDE BAR.
    // `requires-grant` is CONDITIONAL on the territory list, because the H3 restriction
    // binds RUNNING THE WEIGHTS in an excluded territory — not commercial use anywhere.
    // Round 11's first draft read the two fields as a conjunction and required the grant
    // EVERYWHERE; the registry suite caught it. So the shape below is the SPECIFIED
    // reading, not an oversight: a `requires-grant` row with no exclusion refuses
    // nothing, and that is correct for this licence.
    check('DISCLOSURE: requires-grant with NO exclusion refuses nothing (the licence is territorial)',
      code(row({ commercialUse: 'requires-grant', excludedTerritories: [] })) === null,
      'the registry suite requires "permits the same model outside the excluded territory", so '
      + 'this is the specified behaviour. It is asserted rather than left implicit because it is '
      + 'the exact reading round 11 broke, and a future reader who sees "requires-grant" and no '
      + 'refusal should find this line rather than a bug report.');

    // A7 — THE HEADLINE. Follow the catalogue's own clearing instruction verbatim.
    //
    // `catalogueHosted.mjs`: "set `commercialUse` to what they actually say and drop
    // `evidence`". The shipped row is refused today only because `evidence` is present.
    // Apply the instruction with a prohibitory reading and see where the row lands.
    const shipped = VIDEO_PROVIDERS[HOSTED_VENDOR].licence;
    const asShipped = code(shipped);
    const clearedToProhibited = code({ ...shipped, evidence: undefined, commercialUse: 'prohibited' });
    check('A7. clearing the evidence flag to a PROHIBITORY reading keeps the row refused',
      clearedToProhibited !== null,
      `as shipped -> ${JSON.stringify(asShipped)}; after the documented clearing step with the `
      + `terms reading "prohibited" -> ${JSON.stringify(clearedToProhibited)}. `
      + 'The catalogue instructs the operator to perform this edit. If the second result is '
      + 'null, then following the instruction is what disables the gate — and the row would '
      + 'be commercially runnable on the strength of a licence that forbids it.');

    // A8 — THE OTHER DIRECTION, so A7 cannot be satisfied by refusing every cleared row.
    check('CONTROL: the same clearing step with a PERMISSIVE reading is NOT refused',
      code({ ...shipped, evidence: undefined, commercialUse: 'permitted' }) === null,
      'so A7 asks the gate to distinguish the readings, not to refuse the edit');
  }

  // ══ B. `evidence` — the whole fail-closed guarantee, matched by `===` ═══════
  section('B. the fail-closed property must not rest on one exact string');
  {
    // Guard 1 is `lic.evidence === 'unretrieved'`. Nothing validates the field: not
    // `assertSpecShape`, not the catalogue, not the registry. So the entire hosted-lane
    // guarantee is a string literal matching by luck, and every near-miss below is a
    // spelling an author could plausibly write.
    const nearMisses = ['pending', 'claim', 'not-retrieved', 'unretrive', 'UNRETRIEVED', ' unretrieved ', 'unverified'];
    for (const value of nearMisses) {
      check(`B. evidence=${JSON.stringify(value)} still refuses commercial use`,
        code(row({ evidence: value, commercialUse: 'permitted' })) !== null,
        `-> ${JSON.stringify(code(row({ evidence: value, commercialUse: 'permitted' })))} — an evidence `
        + 'marker of ANY value says the terms have not been read. Matching one spelling means '
        + 'the gate is closed to the spelling its author happened to choose.');
    }

    // CONTROLS. The flag must stay a flag: absent is absent, and nothing else changes.
    check('CONTROL: no evidence key at all is treated as "no flag"',
      code(row()) === null, `-> ${JSON.stringify(code(row()))}`);
    check('CONTROL: evidence: null is treated as "no flag"',
      code(row({ evidence: null })) === null, `-> ${JSON.stringify(code(row({ evidence: null })))}`);
    check('CONTROL: evidence: "" is treated as "no flag"',
      code(row({ evidence: '' })) === null, `-> ${JSON.stringify(code(row({ evidence: '' })))}`);
    check('CONTROL: the shipped hosted rows still refuse with E_LICENCE_EVIDENCE_MISSING',
      code(VIDEO_PROVIDERS[HOSTED_VENDOR].licence) === 'E_LICENCE_EVIDENCE_MISSING',
      `-> ${JSON.stringify(code(VIDEO_PROVIDERS[HOSTED_VENDOR].licence))}`);
  }

  // ══ C. `licence` must BE a licence ═════════════════════════════════════════
  section('C. a licence that is not an object is an unknown position, not a permissive one');
  {
    // `assertSpecShape` requires `licence` to be present and rejects only `undefined`.
    // So `licence: 'Apache-2.0'` is a legal catalogue row. `licenceGate` then does
    // `licence || {}` and reads `.evidence` / `.commercialUse` off a STRING — all
    // `undefined` — and every guard falls through. This is the same bare-value trap the
    // cost fields are protected from, in the one field whose failure mode is legal.
    check('C. licence declared as a bare string is refused',
      code('Apache-2.0') !== null, `-> ${JSON.stringify(code('Apache-2.0'))}`);
    check('C. licence declared as null is refused',
      code(null) !== null, `-> ${JSON.stringify(code(null))}`);
    check('C. licence declared as an array is refused',
      code(['permitted']) !== null, `-> ${JSON.stringify(code(['permitted']))}`);

    // ...AND THE VALIDATOR MUST REJECT IT AT IMPORT, where the operator is looking.
    // A runtime refusal on a row nobody resolves is a rule with no enforcement.
    const base = VIDEO_PROVIDERS[LOCAL];
    const bad = (licence) => throws(() => assertSpecShape('bad/provider', { ...base, licence }));
    check('C. assertSpecShape rejects a bare-string licence',
      bad('Apache-2.0') === 'E_BAD_SPEC', `-> ${JSON.stringify(bad('Apache-2.0'))}`);
    check('C. assertSpecShape rejects an unrecognised commercialUse',
      bad({ ...base.licence, commercialUse: 'prohibited-ish' }) === 'E_BAD_SPEC',
      `-> ${JSON.stringify(bad({ ...base.licence, commercialUse: 'prohibited-ish' }))} — the `
      + 'vocabulary the gate reads must be the vocabulary the validator enforces, or they '
      + 'drift and the gate reads a value the validator never saw.');
    check('C. assertSpecShape rejects a non-array excludedTerritories',
      bad({ ...base.licence, excludedTerritories: 'US' }) === 'E_BAD_SPEC',
      `-> ${JSON.stringify(bad({ ...base.licence, excludedTerritories: 'US' }))}`);

    // NON-VACUITY CONTROL. Every check above asserts that `assertSpecShape` THROWS, which is
    // also what it does for a row missing `maxResolution` or carrying a bare cost. So the same
    // synthetic row with ONLY the licence field put right must NOT throw — otherwise these
    // three checks would pass on any malformed row whatsoever and prove nothing about licence.
    check('CONTROL: the same synthetic row with a well-formed licence does NOT throw',
      bad(base.licence) === null,
      `-> ${JSON.stringify(bad(base.licence))} — so the three rejections above are caused by the `
      + 'licence field and not by the rest of the fixture.');

    // CONTROLS: the validator must still accept every row that ships.
    check('CONTROL: assertSpecShape still accepts all four hand-written catalogue rows',
      [LOCAL, LOCAL_FREE, HOSTED_LOCAL].every(id => {
        try { assertSpecShape(id, VIDEO_PROVIDERS[id]); return true; } catch { return false; }
      }), 'the fix must not brick the catalogue at import');
    check('CONTROL: assertSpecShape still accepts the shipped hosted rows',
      Object.keys(VIDEO_PROVIDERS).filter(id => id.startsWith('higgsfield/')).every(id => {
        try { assertSpecShape(id, VIDEO_PROVIDERS[id]); return true; } catch { return false; }
      }), 'their commercialUse is "unverified" and their evidence flag is present — both must stay legal');
  }

  // ══ D. `excludedTerritories` — `.includes()` on whatever type is there ═════
  section('D. a territory exclusion must not be substring-matched');
  {
    // `(lic.excludedTerritories || []).includes(territory)` on a STRING is
    // `String.prototype.includes` — a SUBSTRING test. Two things follow, and the second is
    // the one that matters:
    //   `'CANADA'.includes('CA')` is TRUE  — an exclusion on a territory never named;
    //   `'US'.includes('CA')`     is FALSE — and this one reads as "NO EXCLUSION AT ALL".
    // So a bare string is not merely mis-read, it is mis-read in BOTH directions, and the
    // permissive direction is the one an author reaches by writing the field the obvious
    // wrong way. Neither is decidable from the value, which is why the answer is to refuse
    // the row rather than to guess what it meant.
    const stringExclusion = (value, territory) =>
      code(row({ excludedTerritories: value }), { territory });
    check('D. a bare-string excludedTerritories is refused as an UNREADABLE position',
      stringExclusion('CANADA', 'CA') === 'E_LICENCE_POSITION_UNKNOWN',
      `-> ${JSON.stringify(stringExclusion('CANADA', 'CA'))} — today this refuses, but as `
      + 'E_LICENCE_GRANT_REQUIRED: it invents an exclusion from a substring match and asks the '
      + 'operator for a grant to a territory they never listed.');
    check('D. ...and the permissive direction of the same mistake is refused too',
      stringExclusion('US', 'CA') === 'E_LICENCE_POSITION_UNKNOWN',
      `-> ${JSON.stringify(stringExclusion('US', 'CA'))} — "US".includes("CA") is false, so the `
      + 'unreadable list currently reads as an EMPTY one and the row is permitted outright. '
      + 'This is the fail-open direction, and it is the reason a type check is not cosmetic.');

    // CONTROLS: the real array still behaves exactly as before.
    check('CONTROL: excludedTerritories ["US"] excludes US',
      code(row({ excludedTerritories: ['US'] }), { territory: 'US' }) === 'E_LICENCE_GRANT_REQUIRED',
      `-> ${JSON.stringify(code(row({ excludedTerritories: ['US'] }), { territory: 'US' }))}`);
    check('CONTROL: excludedTerritories ["US"] does NOT exclude CA',
      code(row({ excludedTerritories: ['US'] }), { territory: 'CA' }) === null,
      `-> ${JSON.stringify(code(row({ excludedTerritories: ['US'] }), { territory: 'CA' }))}`);
    check('CONTROL: excludedTerritories [] excludes nothing',
      code(row({ excludedTerritories: [] })) === null);
  }

  // ══ E. THE SHIPPED ROWS — end to end, through `resolve` ════════════════════
  section('E. every shipped row keeps the behaviour it has today');
  {
    const ENABLED_LOCAL = new Set([LOCAL]);
    const r = (id, opts) => throws(() => resolve(id, { requireEnabled: false, ...opts }));

    check('E. local H3, commercial, US, no grant -> E_LICENCE_GRANT_REQUIRED',
      r(LOCAL, { commercial: true, territory: 'US', grants: NO_GRANTS }) === 'E_LICENCE_GRANT_REQUIRED',
      `-> ${JSON.stringify(r(LOCAL, { commercial: true, territory: 'US', grants: NO_GRANTS }))}`);
    check('E. local H3, commercial, CA, no grant -> permitted (the licence is territorial)',
      r(LOCAL, { commercial: true, territory: 'CA', grants: NO_GRANTS }) === null,
      `-> ${JSON.stringify(r(LOCAL, { commercial: true, territory: 'CA', grants: NO_GRANTS }))}`);
    check('E. local H3, commercial, US, WITH the grant -> permitted',
      r(LOCAL, { commercial: true, territory: 'US', grants: new Set([LOCAL]) }) === null);
    check('E. local H3, NON-commercial, US, no grant -> permitted',
      r(LOCAL, { commercial: false, territory: 'US', grants: NO_GRANTS }) === null,
      'non-commercial use is unaffected, which is the whole reason enablement and grant are separate acts');

    check('E. Wan 2.2 (Apache-2.0) commercial anywhere -> permitted',
      r(LOCAL_FREE, { commercial: true, territory: 'US', grants: NO_GRANTS }) === null
      && r(LOCAL_FREE, { commercial: true, territory: 'CA', grants: NO_GRANTS }) === null);
    check('E. hailuo-hosted commercial -> permitted',
      r(HOSTED_LOCAL, { commercial: true, territory: 'US', grants: NO_GRANTS }) === null);

    check('E. the vendor hosted rows still refuse with E_LICENCE_EVIDENCE_MISSING',
      r(HOSTED_VENDOR, { commercial: true, grants: NO_GRANTS }) === 'E_LICENCE_EVIDENCE_MISSING',
      `-> ${JSON.stringify(r(HOSTED_VENDOR, { commercial: true, grants: NO_GRANTS }))}`);
    check('E. ...and the refusal still says WHY, in the words the API test asserts',
      /unknown is not permissive/.test(
        (() => { try { resolve(HOSTED_VENDOR, { requireEnabled: false, commercial: true, grants: NO_GRANTS }); return ''; } catch (e) { return e.message; } })()),
      '`media-api.test.mjs` matches this phrase, so the wording is load-bearing');
    check('E. ...and a NON-commercial hosted run passes the LICENCE gate, which is the correct division',
      // Deliberately NOT `requireEnabled: false`: with enablement still required, the
      // refusal that comes back must be the ENABLEMENT one. An unread licence blocks
      // COMMERCIAL use; it must not block reading the docs or a non-commercial render,
      // or the two gates would have collapsed into one and the H3 position — enabled for
      // non-commercial use while the grant is pending — would be unrepresentable.
      throws(() => resolve(HOSTED_VENDOR, { commercial: false, grants: NO_GRANTS })) === 'E_PROVIDER_DISABLED',
      `-> ${JSON.stringify(throws(() => resolve(HOSTED_VENDOR, { commercial: false, grants: NO_GRANTS })))}`);

    check('E. the territory helper is untouched by this round',
      JSON.stringify(territories('US', 'CA')) === JSON.stringify(['US', 'CA'])
      && JSON.stringify(territories('US', 'US')) === JSON.stringify(['US'])
      && JSON.stringify(territories(undefined, undefined)) === JSON.stringify(['US']),
      'round 11 owns this rule; this round must not change it');
    check('E. grants and enablement still read from the injected env, fail-closed',
      readGrants({}).size === 0 && readEnabled({}).size === 0,
      'an unset variable grants nothing and enables nothing');
  }

  // ══ F. THE VOCABULARY HAS EXACTLY ONE DEFINITION ══════════════════════════
  section('F. the gate and the validator must not each own a copy of the vocabulary');
  {
    // The whole reason `licenceTerms.mjs` exists is that two modules need the same four
    // strings and must not be able to disagree. That property is not enforced by the runtime
    // behaviour the sections above test: a future edit could inline a second copy into either
    // file, every check above would still pass, and the two halves would silently drift until
    // the day the gate reads a value the validator never saw. So it is asserted at the source.
    //
    // The read is line-ending agnostic for the reason round 6 records: this repo holds the same
    // file in two byte forms, so a literal `\n` in a pattern is a bug waiting for a checkout.
    const readSource = (rel) =>
      readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    const stripComments = (s) => s
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    const termsCode = stripComments(readSource('../shared/providers/video/licenceTerms.mjs'));
    const gateCode = stripComments(readSource('../shared/providers/video/licenceGate.mjs'));
    const shapeCode = stripComments(readSource('../shared/providers/video/specShape.mjs'));

    // CONTROL: the predicate is not broken. The literals ARE present in the file that defines
    // them, so the two absence assertions below are testing for absence rather than testing a
    // regex that matches nothing.
    check('CONTROL: the vocabulary literals ARE found in licenceTerms.mjs',
      /'requires-grant'/.test(termsCode) && /'prohibited'/.test(termsCode),
      'so "not found elsewhere" means something');

    check('F. licenceGate IMPORTS the vocabulary rather than restating it',
      !/'requires-grant'/.test(gateCode) && !/'prohibited'/.test(gateCode)
      && /from '\.\/licenceTerms\.mjs'/.test(gateCode),
      'a second copy of the four strings is two vocabularies that agree until someone edits one');

    check('F. specShape IMPORTS the vocabulary rather than restating it',
      !/'requires-grant'/.test(shapeCode) && !/'prohibited'/.test(shapeCode)
      && /from '\.\/licenceTerms\.mjs'/.test(shapeCode),
      'the validator must reject exactly the values the gate refuses, from one list');

    // MUTATION CONTROL — the two assertions above must be able to FAIL. This replays the same
    // predicate against a source that DOES inline the vocabulary, which is the exact edit a
    // regression would make.
    const inlined = shapeCode
      .replace("from './licenceTerms.mjs'", "from './nowhere.mjs'")
      .replace('if (!isKnownCommercialUse(spec.licence.commercialUse)) {',
        "if (spec.licence.commercialUse !== 'permitted' && spec.licence.commercialUse !== 'requires-grant') {");
    check('CONTROL: the same assertion FAILS against a source that inlines the vocabulary',
      /'requires-grant'/.test(inlined) && !/from '\.\/licenceTerms\.mjs'/.test(inlined),
      'so F is testing for a second definition, not passing on any file at all');
  }

  console.log(`\n${passed + failed} CHECKS — ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main();
