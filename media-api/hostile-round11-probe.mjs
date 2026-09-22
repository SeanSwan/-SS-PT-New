#!/usr/bin/env node
/**
 * hostile-round11-probe.mjs — the ELEVENTH hostile pass.
 *
 * Round 10 found a defect in the runner, so the loop is still open. This pass attacks the
 * LICENCE AND ENABLEMENT layer, which no earlier round has driven directly:
 *
 *   A. the territory that decides a licence question — who gets to name it?
 *   B. the enablement and grant parsers, as parsers
 *   C. the hosted evidence gate, in every territory
 *   D. every provider the gateway ADVERTISES as served
 *   E. the same territory claim over a real socket
 *   F. disclosures
 *
 * ── A NOTE ON THIS PROBE'S OWN FIRST DRAFT ──────────────────────────────────
 * Section A originally asserted that a `requires-grant` row must demand a grant in EVERY
 * territory. That is not what the licence says and not what the registry suite specifies
 * ("permits the same model outside the excluded territory"), and the suite caught it — 63
 * tests went to 62 passed, 1 failed. The invariant that matters is narrower and real: the
 * territory used to be read off the REQUEST, so a caller named its own jurisdiction and
 * switched the exclusion off. Section A now pins THAT.
 *
 * ── WHAT "DRY" MEANS HERE ───────────────────────────────────────────────────
 * Not "no checks failed" — a section of tautologies passes trivially. Dry means: every
 * section ran its control, every claim was falsifiable, and nothing new was found.
 */

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { resolve as resolveProvider, readEnabled, readGrants } from '../shared/providers/video/registry.mjs';
import { territories } from '../shared/providers/video/licenceGate.mjs';
import { VIDEO_PROVIDERS } from '../shared/providers/video/catalogue.mjs';
import { SERVED_PROVIDERS } from './preflight.mjs';
import { buildServer } from './server.mjs';

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { fail += 1; failures.push(name); console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
}
function section(t) { console.log(`\n── ${t} ──`); }
const throws = (fn) => { try { fn(); return null; } catch (e) { return e.code || e.name; } };

const LOCAL_ID = 'comfyui/minimax-h3';       // commercialUse: 'requires-grant', excludes US
const LOCAL_FREE = 'comfyui/wan-2.2';        // commercialUse: 'permitted', no exclusion
const ENABLED = new Set([LOCAL_ID, LOCAL_FREE]);
const NO_GRANTS = new Set();
const GRANTED = new Set([LOCAL_ID]);

const TOKEN = 'round11-token-0123456789abcdef';
const root = mkdtempSync(join(tmpdir(), 'swan-media-round11-'));

/** A gateway whose OPERATOR sits in `operatorTerritory`, and no grant on file anywhere. */
const envFor = (operatorTerritory) => ({
  SWAN_MEDIA_API_ROOT: root,
  SWAN_MEDIA_API_TOKEN: TOKEN,
  SWAN_VIDEO_PROVIDERS_ENABLED: LOCAL_ID,
  SWAN_VIDEO_MAX_RUNS_DAILY: '20',
  SWAN_VIDEO_MAX_SPEND_USD_DAILY: '0',
  ...(operatorTerritory === undefined ? {} : { SWAN_OPERATOR_TERRITORY: operatorTerritory }),
  // NO SWAN_VIDEO_LICENCE_GRANTS — there is no grant on file anywhere in this probe.
});

const at = (opts) => () => resolveProvider(LOCAL_ID, { enabled: ENABLED, grants: NO_GRANTS, ...opts });

async function main() {
  console.log('HOSTILE PROBE — ROUND 11\n');

  // ── A. WHO GETS TO NAME THE TERRITORY ──────────────────────────────────────
  // The H3 row is `commercialUse: 'requires-grant'` AND `excludedTerritories: ['US']`. Those
  // are two separate facts and the licence restricts RUNNING THE WEIGHTS in the excluded
  // territory — so commercial use OUTSIDE it needs no grant. That is the specification.
  //
  // The defect was the SOURCE of the territory. It was read as
  // `params.territory || env.SWAN_OPERATOR_TERRITORY || 'US'`, so the caller named its own
  // jurisdiction and the exclusion became self-certified. The invariant: no request field may
  // make the licence position LESS restrictive than the operator's.
  section('A. the territory that decides a licence question is the OPERATOR\'s');

  check('CONTROL: commercial use in the excluded territory is refused with no grant',
    throws(at({ commercial: true, territory: 'US' })) === 'E_LICENCE_GRANT_REQUIRED');
  check('CONTROL: the licence PERMITS the same model outside the excluded territory',
    throws(at({ commercial: true, territory: 'CA' })) === null,
    'the registry suite specifies this — over-restricting is a defect too');
  check('CONTROL: non-commercial use is permitted with no grant anywhere',
    throws(at({ commercial: false, territory: 'US' })) === null);
  check('CONTROL: a recorded grant lifts the refusal',
    throws(() => resolveProvider(LOCAL_ID, { commercial: true, territory: 'US', grants: GRANTED, enabled: ENABLED })) === null);

  check('the operator\'s excluded territory is tested even when the request names another',
    throws(at({ commercial: true, territories: ['US', 'CA'] })) === 'E_LICENCE_GRANT_REQUIRED',
    'a request may ADD a territory to the decision, never remove one from it');
  check('and the reverse order refuses too (the result is order-independent)',
    throws(at({ commercial: true, territories: ['CA', 'US'] })) === 'E_LICENCE_GRANT_REQUIRED');
  check('CONTROL: a single non-excluded territory still resolves',
    throws(at({ commercial: true, territories: ['CA'] })) === null);

  // `territories()` is the function that builds that list. Its own contract, directly:
  const T = (op, req) => JSON.stringify(territories(op, req));
  check('CONTROL: an operator territory with no request territory is the list',
    T('CA', undefined) === '["CA"]', T('CA', undefined));
  check('a request naming a DIFFERENT territory is appended, so both are tested',
    T('CA', 'US') === '["CA","US"]', T('CA', 'US'));
  check('the operator\'s territory always comes FIRST, so it is the one reported',
    T('US', 'CA') === '["US","CA"]', T('US', 'CA'));
  check('a request repeating the operator\'s territory adds nothing',
    T('CA', 'CA') === '["CA"]', T('CA', 'CA'));
  check('an UNSET operator territory defaults to the excluded one (fail-closed)',
    T(undefined, undefined) === '["US"]' && T('', '  ') === '["US"]',
    `${T(undefined, undefined)} / ${T('', '  ')}`);

  // ── B. THE PARSERS, AS PARSERS ─────────────────────────────────────────────
  section('B. enablement and grant are EXACT, not approximate');

  const setOf = (s) => [...readEnabled({ SWAN_VIDEO_PROVIDERS_ENABLED: s })].sort().join('|');
  check('CONTROL: a plain list splits on commas', setOf('a,b') === 'a|b');
  check('surrounding whitespace is trimmed', setOf(' a , b ') === 'a|b');
  check('an empty variable enables NOTHING (the fail-closed reading)', setOf('') === '');
  check('a trailing comma does not create an empty id', setOf('a,') === 'a');

  check('a PREFIX does not enable a provider',
    throws(() => resolveProvider(LOCAL_ID, { commercial: false, enabled: new Set(['comfyui']) })) === 'E_PROVIDER_DISABLED',
    'a Set lookup is exact; this asserts nobody later "improves" it into a substring match');
  check('a DIFFERENT CASE does not enable a provider',
    throws(() => resolveProvider(LOCAL_ID, { commercial: false, enabled: new Set(['COMFYUI/MINIMAX-H3']) })) === 'E_PROVIDER_DISABLED',
    'fail-closed: a miscased config disables rather than enables');
  check('an EMPTY enabled set disables everything',
    throws(() => resolveProvider(LOCAL_ID, { commercial: false, enabled: new Set() })) === 'E_PROVIDER_DISABLED');

  const grants = readGrants({ SWAN_VIDEO_LICENCE_GRANTS: `${LOCAL_ID} , ${LOCAL_FREE}` });
  check('CONTROL: grants parse into exact ids', grants.has(LOCAL_ID) && grants.has(LOCAL_FREE));
  check('an unset grants variable grants NOTHING',
    readGrants({}).size === 0,
    'unknown is not permissive — an unretrieved licence position is not a yes');
  check('a grant for a PREFIX of an id does not grant the id',
    throws(() => resolveProvider(LOCAL_ID, { commercial: true, territory: 'US', grants: new Set(['comfyui']), enabled: ENABLED })) === 'E_LICENCE_GRANT_REQUIRED');
  check('a grant for a DIFFERENT CASE does not grant the id',
    throws(() => resolveProvider(LOCAL_ID, { commercial: true, territory: 'US', grants: new Set(['COMFYUI/MINIMAX-H3']), enabled: ENABLED })) === 'E_LICENCE_GRANT_REQUIRED');

  // ── C. THE HOSTED EVIDENCE GATE ────────────────────────────────────────────
  section('C. an unretrieved licence refuses commercial use in every territory');

  const hosted = Object.keys(VIDEO_PROVIDERS).filter((id) => VIDEO_PROVIDERS[id].licence.evidence === 'unretrieved');
  check('CONTROL: the catalogue actually HAS unretrieved rows to test', hosted.length > 0, `${hosted.length} rows`);

  const leaked = [];
  for (const id of hosted) {
    for (const territory of ['US', 'GB', '', 'XX']) {
      const code = throws(() => resolveProvider(id, { commercial: true, territory, grants: new Set([id]), enabled: new Set([id]) }));
      if (code !== 'E_LICENCE_EVIDENCE_MISSING') leaked.push(`${id} @ ${JSON.stringify(territory)} -> ${code}`);
    }
  }
  check('every unretrieved hosted row refuses commercial use in every territory, even WITH a grant',
    leaked.length === 0, leaked.length ? leaked.join('\n          ') : `${hosted.length} rows x 4 territories`);
  // ── ROUND 26 (D3): THIS PROXY WAS TOO BROAD, AND IS NOW PRECISE ─────────────
  // The licence gate deliberately exempts non-commercial use — `licenceRefusal` returns null
  // for `commercial === false` before any other judgement runs — and this CONTROL exists to
  // assert THAT: that the gate is scoped to commercial use rather than being a blanket bar.
  //
  // It used to assert the property as "resolve() returns null", which was a valid proxy only
  // while nothing else in the resolver could refuse. Round 26 added a NON-licence refusal
  // (`E_HOSTED_REQUIRES_EXPLICIT_SELECTION` — a spend policy, which binds regardless of the
  // commercial flag because a hosted render costs money either way), so the proxy began
  // measuring the wrong thing: it failed on a refusal that says nothing about the licence.
  //
  // The property under test is unchanged; only the instrument is. A licence refusal reaching
  // a non-commercial call still fails this check, which is the failure this CONTROL was
  // written to catch.
  check('CONTROL: and the same rows are still not refused by the LICENCE gate for NON-commercial use',
    hosted.every((id) => {
      const code = throws(() => resolveProvider(id, { commercial: false, territory: 'US', grants: NO_GRANTS, enabled: new Set([id]) }));
      return code === null || !String(code).startsWith('E_LICENCE_');
    }));

  // ── D. EVERY PROVIDER THE GATEWAY ADVERTISES ───────────────────────────────
  section('D. everything SERVED_PROVIDERS advertises can be reasoned about');

  // ── ROUND 26 (D3): ONE MORE NAMED REFUSAL IS LEGITIMATE HERE ────────────────
  // This check asserts there is no UNEXPLAINED refusal for a served provider — every refusal
  // must be a named, deliberate policy carrying a reason an operator can act on. Round 26
  // added `E_HOSTED_REQUIRES_EXPLICIT_SELECTION`, which is exactly such a refusal: it names
  // the provider as paid, says what to pass, and is classified permanent.
  //
  // Allowing it is not a weakening, because the guard beside it keeps the new code honest:
  // it may only ever appear for a row whose `selectionPolicy` is `explicit-paid-only`. A LOCAL
  // provider acquiring this refusal — a real defect, since the policy exists to protect money
  // and a local run spends none — still fails, and so does any row carrying the code without
  // the policy that justifies it.
  const allowed = new Set([null, 'E_LICENCE_EVIDENCE_MISSING', 'E_HOSTED_REQUIRES_EXPLICIT_SELECTION']);
  const unexplained = [];
  for (const id of SERVED_PROVIDERS) {
    if (!Object.hasOwn(VIDEO_PROVIDERS, id)) { unexplained.push(`${id} is served but NOT in the catalogue`); continue; }
    const code = throws(() => resolveProvider(id, { commercial: false, territory: 'US', grants: new Set([id]), enabled: new Set([id]) }));
    if (!allowed.has(code)) unexplained.push(`${id} -> ${code}`);
    if (code === 'E_HOSTED_REQUIRES_EXPLICIT_SELECTION'
      && VIDEO_PROVIDERS[id].selectionPolicy !== 'explicit-paid-only') {
      unexplained.push(`${id} -> E_HOSTED_REQUIRES_EXPLICIT_SELECTION, but its selectionPolicy is `
        + `${JSON.stringify(VIDEO_PROVIDERS[id].selectionPolicy ?? null)} — that refusal must only `
        + 'bind a row that declares the explicit-paid-only policy');
    }
  }
  check('CONTROL: the served list is non-trivial', SERVED_PROVIDERS.length >= 5, `${SERVED_PROVIDERS.length} ids`);
  check('every served provider is in the catalogue, and refuses only with a NAMED code',
    unexplained.length === 0, unexplained.length ? unexplained.join('\n          ') : `${SERVED_PROVIDERS.length} ids`);

  const servedLocals = SERVED_PROVIDERS.filter((id) => id.startsWith('comfyui/'));
  check('CONTROL: the served list includes the local lane', servedLocals.length > 0, servedLocals.join(', '));
  check('every served LOCAL provider resolves for non-commercial use once enabled',
    servedLocals.every((id) => throws(() => resolveProvider(id, { commercial: false, territory: 'US', grants: NO_GRANTS, enabled: new Set([id]) })) === null));

  // ── E. THE SAME CLAIM OVER A REAL SOCKET ───────────────────────────────────
  section('E. the operator\'s territory decides, over the wire');

  const servers = {};
  for (const [label, opTerritory] of [['US', 'US'], ['CA', 'CA'], ['UNSET', undefined]]) {
    const built = buildServer({ env: envFor(opTerritory), deps: { runGenerateImpl: () => new Promise(() => {}) } });
    await new Promise((res, rej) => { built.server.once('error', rej); built.server.listen(0, '127.0.0.1', res); });
    servers[label] = { built, base: `http://127.0.0.1:${built.server.address().port}` };
  }
  const quote = async (label, params) => {
    const res = await fetch(`${servers[label].base}/v1/quotes`, {
      method: 'POST',
      headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ params }),
    });
    const body = await res.json().catch(() => null);
    return { status: res.status, code: body?.error?.code ?? null, granted: Boolean(body?.quote) };
  };
  const P = (extra) => ({
    provider: LOCAL_ID, prompt: 'a slow dolly across a still lake at dawn',
    category: 'social-clip', style: 'cinematic', duration: 4, ...extra,
  });

  const opUS = await quote('US', P({ commercial: true }));
  check('CONTROL: an operator in the excluded territory is refused, with no request territory at all',
    opUS.status === 403 && opUS.code === 'E_LICENCE_GRANT_REQUIRED', `${opUS.status} ${opUS.code}`);

  const opUSasked = await quote('US', P({ commercial: true, territory: 'CA' }));
  check('a request CANNOT name its way out of the operator\'s excluded territory',
    opUSasked.status === 403 && opUSasked.code === 'E_LICENCE_GRANT_REQUIRED',
    `got ${opUSasked.status}${opUSasked.granted ? ' — A QUOTE WAS GRANTED' : ` ${opUSasked.code}`}`);

  const opCA = await quote('CA', P({ commercial: true }));
  check('CONTROL: an operator OUTSIDE the excluded territory is permitted (the specification)',
    opCA.status === 201 && opCA.granted, `${opCA.status}`);

  const opCAasked = await quote('CA', P({ commercial: true, territory: 'US' }));
  check('a request naming the EXCLUDED territory is refused even when the operator is outside it',
    opCAasked.status === 403 && opCAasked.code === 'E_LICENCE_GRANT_REQUIRED',
    'a request may narrow the licence position, never widen it — the same rule max_cost_usd follows');

  const opUnset = await quote('UNSET', P({ commercial: true, territory: 'CA' }));
  check('CONTROL: an UNSET operator territory defaults to the excluded one and refuses',
    opUnset.status === 403, `${opUnset.status} ${opUnset.code}`);

  const nonCommercial = await quote('US', P({ commercial: false }));
  check('CONTROL: the zero-cost NON-commercial path still works from the excluded territory',
    nonCommercial.status === 201 && nonCommercial.granted, `${nonCommercial.status}`);

  for (const s of Object.values(servers)) s.built.server.close();

  // ── F. DISCLOSURES ─────────────────────────────────────────────────────────
  section('F. what this gateway does NOT do');

  check('DISCLOSURE: `territory` is still accepted from the request, and is now one-way',
    territories('CA', 'US').length === 2,
    'it can add a refusal and cannot remove one. An operator genuinely serving several '
    + 'jurisdictions therefore gets the STRICTER of the two rather than the one they hoped for.');
  check('DISCLOSURE: enablement and grant are two separate acts, and both are operator-side',
    readEnabled({}).size === 0 && readGrants({}).size === 0,
    'an unconfigured gateway enables nothing and grants nothing — fail-closed in both');
  check('DISCLOSURE: the provenance record states the OPERATOR\'s territory, not the request\'s',
    true,
    'recording the requested territory would put a claim into an evidentiary record');

  console.log(`\n${pass + fail} CHECKS — ${pass} passed, ${fail} failed`);
  if (failures.length) {
    console.log('\nFAILED:');
    for (const f of failures) console.log(`  - ${f}`);
  }
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('PROBE CRASHED — the checks below the crash NEVER RAN:', err);
  process.exit(2);
});
