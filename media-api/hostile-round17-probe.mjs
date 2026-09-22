/**
 * hostile-round17-probe.mjs — ROUND 16'S OWN CODE, attacked as new code.
 *
 * ── WHY THIS ROUND EXISTS, AND WHY IT IS NOT A FORMALITY ────────────────────
 * Round 16 added two validator rules, widened four fields' value domains, and put a new field on
 * the wire. **Every line of it is covered only by probes written in this lane, in the same round,
 * by the same author** — and round 16's own subject was a completeness check that read a
 * fabrication as an answer. An author who has just demonstrated that failure mode is not the
 * person to certify it is gone. This is the round-13/round-15 discipline applied one turn later.
 *
 * ── THE THREE QUESTIONS THIS ROUND ASKS ────────────────────────────────────
 * Round 16 established the rule *"the model version must identify the weights, not repeat the
 * provider."* So:
 *
 *   1. **Is the rule defeated by a value that is the id in all but whitespace or case?**
 *      `spec.modelVersion === id` is an EXACT test, and the value is stored untrimmed — so
 *      `' comfyui/minimax-h3 '` and `'COMFYUI/MINIMAX-H3'` both pass, and the record then repeats
 *      the provider id, which is the exact conflation round 16 exists to prevent.
 *   2. **Does the AUDIT check the property?** The validator covers catalogue rows. `buildProvenance`
 *      takes any `caps`, and `auditProvenance` is the last line of defence for every other caller —
 *      and it checked only truthiness. A record whose `modelVersion` IS its `provider` was reported
 *      **complete**.
 *   3. **Did a field's domain widen without the version moving?** `PROVENANCE_SCHEMA`'s own comment
 *      is *"Bump when the RECORD SHAPE changes, so a reader can tell how to parse it."* Round 16
 *      widened three booleans to `boolean|null` and one array to `Array|null`, and asserted the
 *      schema was unchanged because "the record's shape did not move, only what its fields are
 *      allowed to claim". A reader of v1 parses `excludedTerritories` as an array. It can now be
 *      `null`. **A widened value domain IS a parse change, and the version is the only way a reader
 *      can tell.**
 *
 * ── WHAT THIS ROUND DOES NOT DO ─────────────────────────────────────────────
 * It does not change what the record CLAIMS — round 16's rules stand, and section F re-asserts
 * them. It attacks the enforcement of those rules and the version number that describes them.
 */

import { readFileSync } from 'node:fs';
import {
  buildProvenance, auditProvenance, snapshotLicence, PROVENANCE_SCHEMA, PROMPT_KEEP_CHARS,
} from '../shared/providers/video/provenance.mjs';
import { VIDEO_PROVIDERS, assertSpecShape } from '../shared/providers/video/catalogue.mjs';
import { capabilities, resolve } from '../shared/providers/video/registry.mjs';
import { listModels } from './routesCatalog.mjs';

let passed = 0; let failed = 0;
const check = (name, ok, detail) => {
  if (ok) { passed += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
};
const section = (t) => console.log(`\n── ${t} ──`);
const throws = (fn) => { try { fn(); return null; } catch (e) { return e.code || e.message; } };

const LOCAL = 'comfyui/minimax-h3';
const localCaps = () => resolve(LOCAL, { commercial: false, requireEnabled: false });
const req = (over = {}) => ({
  prompt: 'a swan crossing still water at dawn', category: 'marketing', style: 'cinematic',
  duration: 5, ...over,
});
const FULL_RESULT = { filename: 'a.mp4', bytes: 10, sha256: 'abc', promptId: 'p1' };
const build = (over = {}) => buildProvenance({
  caps: localCaps(), request: req(), result: FULL_RESULT,
  commercial: false, territory: 'US', grantRecorded: false,
  now: new Date('2026-08-16T12:00:00Z'), ...over,
});
const row = () => VIDEO_PROVIDERS[LOCAL];
const spec = (over = {}) => assertSpecShape(LOCAL, { ...row(), ...over });

const readSource = (rel) =>
  readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const stripComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

function main() {
  console.log('HOSTILE PROBE — ROUND 17: round 16\'s own code, attacked as new code\n');

  // ══ A. the id test must not be defeated by whitespace or case ═════════════
  section('A. "not the provider id" must mean the same thing in every spelling');
  {
    // `spec.modelVersion === id` is an EXACT comparison, so it rejects only the byte-identical
    // string. The plausible authoring mistake is a copy-paste of the id with a stray space, and
    // the second-most-plausible is a different case. Both pass, and both produce a record whose
    // model version IS the provider id — the one conflation round 16's validator was added to stop.
    check('A. a model version that is the provider id with PADDING is rejected',
      throws(() => spec({ modelVersion: ` ${LOCAL} ` })) === 'E_BAD_SPEC',
      `-> ${JSON.stringify(throws(() => spec({ modelVersion: ` ${LOCAL} ` })))} — a value that differs `
      + 'from the id only by whitespace is the id, and the record would repeat the provider name in '
      + 'the field that exists to distinguish it.');
    check('A. a model version that is the provider id with DIFFERENT CASE is rejected',
      throws(() => spec({ modelVersion: LOCAL.toUpperCase() })) === 'E_BAD_SPEC',
      `-> ${JSON.stringify(throws(() => spec({ modelVersion: LOCAL.toUpperCase() })))} — the id is not `
      + 'a case-sensitive fact about which weights ran.');
    // ── THE BOUNDARY — AND THE PROBE'S FIRST DRAFT WAS WRONG ABOUT IT ─────────
    // The first draft of this section asserted that `'comfyui / minimax-h3'` (the id with a space
    // around the slash) must also be rejected, and it FAILED against the fixed code. It was the
    // probe that was wrong, and demanding it be closed would introduce a WORSE defect: rejecting it
    // requires deleting ALL whitespace before comparing, which makes `'Sora 2'` and `sora2` equal —
    // so a provider id without a vendor prefix plus a model name differing only by a space would be
    // refused AT BOOT. Measured, not argued: `collapse('Wan 2.2') === collapse('wan2.2')` is true.
    // A rule that refuses the normal case is broken, not fail-closed (round 13's lesson).
    //
    // So the rule is deliberately trim + case-fold. Leading/trailing whitespace and case carry no
    // information about a model; INTERNAL whitespace does — `Wan 2.2` is a name, `wan2.2` is a slug.
    // The hole this leaves is a cosmetic one a human reading the row can see, which is the right
    // trade against silently refusing legitimate rows.
    check('CONTROL: internal spacing is deliberately NOT normalised away',
      throws(() => spec({ modelVersion: LOCAL.replace('/', ' / ') })) === null
      && throws(() => assertSpecShape('sora2', { ...row(), modelVersion: 'Sora 2' })) === null,
      'the second half is the reason: collapsing internal whitespace would make "Sora 2" and '
      + '"sora2" the same label and refuse a legitimate row at import. The boundary is trim and '
      + 'case-fold, never internal whitespace.');
    check('A. ...and the normalisation the rule DOES apply is the one asserted at the source',
      throws(() => spec({ modelVersion: LOCAL.toUpperCase() })) === 'E_BAD_SPEC'
      && throws(() => spec({ modelVersion: ` ${LOCAL} ` })) === 'E_BAD_SPEC');

    // ...AND THE RECORD MUST NOT CARRY THE PADDING EITHER. `modelLabel` trimmed to TEST for
    // emptiness and then returned the UNTRIMMED string, so two records of the same model compare
    // unequal — which defeats the point of a field whose job is to identify the weights.
    const padded = build({ caps: { ...localCaps(), modelVersion: '  MiniMax H3  ' } });
    check('A. the record normalises padding rather than storing it',
      padded.modelVersion === 'MiniMax H3',
      `-> ${JSON.stringify(padded.modelVersion)} — "  MiniMax H3  " and "MiniMax H3" are the same `
      + 'model, and a record that stores both cannot be compared with itself.');

    // CONTROLS.
    check('CONTROL: a genuinely different model version still passes the validator',
      throws(() => spec({ modelVersion: 'MiniMax H3' })) === null);
    check('CONTROL: the real rows still resolve their declared model versions',
      Object.keys(VIDEO_PROVIDERS).every((id) => capabilities(id).modelVersion !== id));

    // ...AND AT THE SOURCE, because a behaviour check cannot tell "normalises" from "happens to
    // reject these two spellings". Controlled against a mutated copy.
    const shape = stripComments(readSource('../shared/providers/video/specShape.mjs'));
    check('A. the validator normalises BOTH sides before comparing',
      /normalise\(spec\.modelVersion\)\s*===\s*normalise\(id\)/.test(shape),
      `-> ${(shape.match(/[^\n]*normalise\(spec\.modelVersion\)[^\n]*/) || ['<no normalising comparison found>'])[0].trim()}`);
    const mutated = shape.replace(
      /normalise\(spec\.modelVersion\)\s*===\s*normalise\(id\)/, 'spec.modelVersion === id');
    check('CONTROL: that assertion FAILS against a source with the exact test restored',
      !/normalise\(spec\.modelVersion\)\s*===\s*normalise\(id\)/.test(mutated),
      'so A is testing for the normalisation, not passing on any file at all');
  }

  // ══ B. the AUDIT must check the property, not just the field's presence ═══
  section('B. auditProvenance must refuse a record that repeats the provider');
  {
    // The validator covers the CATALOGUE. `buildProvenance` is exported and takes any `caps`, and
    // `auditProvenance` is the only check standing between such a record and a reader — and it
    // tested truthiness alone. So a record whose model version IS its provider id was reported
    // COMPLETE, which is round 16's own defect surviving one level up in round 16's own fix.
    const dupCaps = {
      provider: 'probe/x',
      modelVersion: 'probe/x',
      licence: { name: 'Probe', commercialUse: 'permitted', excludedTerritories: [], requiresAttribution: false },
    };
    const dup = buildProvenance({
      caps: dupCaps, request: req(), result: FULL_RESULT,
      commercial: false, territory: 'US', grantRecorded: false, now: new Date('2026-08-16T12:00:00Z'),
    });
    const audit = auditProvenance(dup);
    check('B. a record whose modelVersion IS its provider is NOT reported complete',
      audit.ok === false,
      `-> ${JSON.stringify(audit)} — the audit exists to name what is missing, and a record that `
      + 'cannot identify its weights is not complete just because the field is populated.');
    check('B. ...and the reason is DISTINGUISHABLE from "the field is absent"',
      audit.missing.includes('modelVersion.duplicatesProvider') && !audit.missing.includes('modelVersion'),
      `-> ${JSON.stringify(audit.missing)} — a reader has to know whether to ADD a value or CHANGE `
      + 'one; one token for both would send them to add a value that is already there.');

    // CONTROLS: the two real cases are unaffected, which is what keeps this additive.
    check('CONTROL: a record built from the real catalogue is still complete',
      auditProvenance(build()).ok === true,
      `-> ${JSON.stringify(auditProvenance(build()))}`);
    check('CONTROL: an ABSENT modelVersion still reports the plain token',
      auditProvenance(build({ caps: { ...localCaps(), modelVersion: undefined } }))
        .missing.includes('modelVersion'));
  }

  // ══ C. the "most specific source" branch, and whether anything reaches it ══
  section('C. the adapter branch: who actually reports a model version?');
  {
    // Round 16's control asserts "an adapter that reports its own model version still wins" — and
    // it passes, because the probe supplies one. **No shipped adapter supplies one.** So the
    // branch is unreachable in production and the record always states the CATALOGUE's declared
    // version — which is a claim about what should run, not a measurement of what did. The graph
    // that actually selects the weights is not recorded anywhere in the record.
    const adapters = [
      '../shared/providers/video/comfyuiLocal.mjs',
      '../shared/providers/video/higgsfield.mjs',
      '../shared/providers/video/higgsfieldTransport.mjs',
      '../shared/providers/video/normalizeResponse.mjs',
      '../shared/providers/video/comfyuiGraph.mjs',
    ];
    const reporting = adapters.filter((f) => /modelVersion/.test(stripComments(readSource(f))));
    check('DISCLOSURE: no shipped adapter reports a model version, so that branch never runs',
      reporting.length === 0 && build().modelVersion === capabilities(LOCAL).modelVersion,
      reporting.length
        ? `these adapters mention it: ${reporting.join(', ')}`
        : `-> the record states the CATALOGUE's declared version (${JSON.stringify(capabilities(LOCAL).modelVersion)}), `
          + 'not a measurement. Stated rather than silently relied on: an adapter that reported the '
          + 'graph it loaded would be MORE specific, and the record would then be evidence of what ran.');
    const keys = Object.keys(build());
    check('DISCLOSURE: ...and nothing in the record names the graph or weights that were loaded',
      !keys.some((k) => /graph|workflow|checkpoint|weights|model_?path/i.test(k)),
      `-> record keys: ${keys.join(', ')} — so for a local run the record cannot be used to tell which `
      + 'graph produced the asset. Not fixed here: choosing a graph identity is an adapter change, '
      + 'and the adapter is Sean\'s call.');
  }

  // ══ D. a widened domain must move the version number ══════════════════════
  section('D. a widened value domain is a parse change, and the version must say so');
  {
    // The schema constant's own comment: "Bump when the RECORD SHAPE changes, so a reader can tell
    // how to parse it." Round 16 widened `usedCommercially`, `grantRecorded`, `requiresAttribution`
    // to `boolean|null` and `excludedTerritories` to `Array|null`, and asserted the version was
    // unchanged because the KEYS did not move. A reader of v1 parses `excludedTerritories` as an
    // array and calls `.includes()` on it.
    const nullableReachable = (() => {
      const lic = snapshotLicence({ licence: { name: 'x' } }, {});
      return lic.excludedTerritories === null && lic.usedCommercially === null
        && lic.grantRecorded === null && lic.requiresAttribution === null;
    })();
    check('D. the widening is REACHABLE through the public API, not theoretical',
      nullableReachable,
      'snapshotLicence({licence:{name:"x"}}, {}) yields four nulls — so a reader that assumes a '
      + 'boolean or an array is now wrong about records this code happily produces');
    check('D. ...so PROVENANCE_SCHEMA has moved',
      PROVENANCE_SCHEMA === 2,
      `-> PROVENANCE_SCHEMA = ${PROVENANCE_SCHEMA}. A v1 reader cannot tell a v1 record from one whose `
      + 'field may now be null, and the version number is the ONLY mechanism that tells it.');
    check('D. ...and a v1 record is REFUSED rather than parsed with the wrong rules',
      auditProvenance({ ...build(), schema: 1 }).missing.includes('schema'),
      `-> ${JSON.stringify(auditProvenance({ ...build(), schema: 1 }).missing)} — refusing to audit is `
      + 'the fail-closed direction: "we cannot tell you this is complete" beats a green tick produced '
      + 'by the wrong parser.');

    // ...AND THE TWO PLACES THAT PINNED THE LITERAL. A check that hardcodes the number tests a copy
    // of the schema rather than the schema, so it fails on a bump without saying anything about the
    // record — the round-15 lesson, in the file that serves as the end-to-end demo.
    const demo = stripComments(readSource('./demo-http-flow.mjs'));
    check('D. the demo asserts the schema against the IMPORTED constant, not a literal',
      /schema === PROVENANCE_SCHEMA/.test(demo) && /PROVENANCE_SCHEMA/.test(demo),
      `-> ${(demo.match(/[^\n]*schema === [^\n]*/) || ['<no schema assertion found>'])[0].trim()}`);
    const demoMutated = demo.replace(/schema === PROVENANCE_SCHEMA/, 'schema === 1');
    check('CONTROL: that assertion FAILS against a demo pinning the literal',
      !/schema === PROVENANCE_SCHEMA/.test(demoMutated),
      'so D is testing for the import, not passing on any file at all');
  }

  // ══ E. the tri-state's reachability from the runner ══════════════════════
  section('E. what round 16\'s tri-state actually protects');
  {
    // Pinned as a DISCLOSURE rather than a defect: the runner supplies booleans on both flags, so
    // `null` never occurs in production and round 16's change protects the API surface, not the
    // run path. Stated so the fix is not read as "the runner can now record an unknown".
    const runner = stripComments(readSource('../backend/scripts/handlers/generateVideo.mjs'));
    check('DISCLOSURE: the runner always supplies a boolean for commercial',
      /commercial:\s*p\.commercial\s*!==\s*false/.test(runner),
      `-> ${(runner.match(/[^\n]*commercial:[^\n]*/) || ['<not found>'])[0].trim()} — a comparison, so `
      + 'always true or false. The tri-state is unreachable from here by construction.');
    check('DISCLOSURE: ...and a boolean for grantRecorded',
      /grantRecorded:\s*readGrants\(env\)\.has\(providerId\)/.test(runner),
      `-> ${(runner.match(/[^\n]*grantRecorded:[^\n]*/) || ['<not found>'])[0].trim()} — Set.has(), so `
      + 'always true or false.');
    check('CONTROL: and the record built the runner\'s way carries booleans, never null',
      build().licence.usedCommercially === false && build().licence.grantRecorded === false);
  }

  // ══ F. round 16's settled contracts must not move ═════════════════════════
  section('F. round 16\'s rules still hold, unchanged');
  {
    check('F. every shipped row still declares a model version that is not its id',
      Object.keys(VIDEO_PROVIDERS).every((id) => {
        const v = capabilities(id).modelVersion;
        return typeof v === 'string' && v.trim() !== '' && v !== id;
      }));
    check('F. the catalogue route still publishes it',
      typeof listModels({ served: [LOCAL], env: {} }).body.models[0].model_version === 'string');
    check('F. a non-array exclusion list is still recorded as null, not characters',
      JSON.stringify(snapshotLicence({ licence: { excludedTerritories: 'US' } }, {})
        .excludedTerritories) !== JSON.stringify(['U', 'S']));
    check('F. an absent commercial flag still records as unknown',
      build({ commercial: undefined }).licence.usedCommercially === null);
    check('F. the prompt contract is unchanged: truncated copy AND hash of the FULL prompt',
      (() => {
        const long = 'x'.repeat(PROMPT_KEEP_CHARS + 50);
        const a = build({ request: req({ prompt: long }) });
        return a.request.prompt.length === PROMPT_KEEP_CHARS && a.request.promptTruncated === true
          && a.request.promptSha256 === build({ request: req({ prompt: long }) }).request.promptSha256;
      })());
    check('F. the record is still frozen at every level, and still refuses a bare build',
      Object.isFrozen(build()) && Object.isFrozen(build().licence) && throws(() => buildProvenance({})) !== null);
  }

  console.log(`\n${passed + failed} CHECKS — ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main();
