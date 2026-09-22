/**
 * hostile-round16-probe.mjs — the PROVENANCE RECORD, the one artifact where a wrong field
 * is worse than a crash.
 *
 * ── WHY THIS SURFACE, AND WHY NOW ───────────────────────────────────────────
 * Rounds 12–15 hardened money and the licence judgement. Both are decisions: they can be
 * re-made, and a refusal can be re-run. `provenance.mjs` is not a decision, it is the
 * EVIDENCE that a decision was made — and it exists because on 2026-08-16 a licensing
 * request went to MiniMax stating that every generated asset carries *"a durable record of
 * provider, model version, and the license in force at generation time."* That sentence has
 * Sean's name on it. Round 11 touched this file, but before the ceiling and licence work.
 *
 * The failure mode here is different from every earlier round. A guard that refuses too much
 * breaks a feature; a money bug costs dollars. **A record that confidently states a wrong
 * fact cannot be repaired by any later action**, because the thing it describes is gone. So
 * the question this round asks is not "is it enforced" but **"does the record state
 * something it does not know?"**
 *
 * ── THE SHAPE OF THE BUG ────────────────────────────────────────────────────
 * Every field in the record is built by `result?.x || caps.x || fallback`. A fallback is a
 * reasonable way to fill a display field. It is not a reasonable way to fill an EVIDENCE
 * field, because the record's own completeness check (`auditProvenance`) then reads the
 * fallback as an answer. Astra's standing ruling for this lane is *"zero is never the
 * fallback for an unknown cost"*; the same rule applies here as *"the provider name is never
 * the fallback for an unknown model version."* The file's own comment says why, one line
 * above the code that does it.
 *
 * ── WHAT THIS ROUND DOES NOT DO ─────────────────────────────────────────────
 * It does not touch the prompt-truncation contract (round 8 settled it: the record carries
 * both the truncated prompt and the hash of the FULL one, and this probe re-asserts that),
 * and it does not change `PROVENANCE_SCHEMA` — the record's shape is not changing, only
 * what its fields are allowed to claim.
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

const readSource = (rel) =>
  readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const stripComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

function main() {
  console.log('HOSTILE PROBE — ROUND 16: the provenance record, where a wrong field is worse than a crash\n');

  // ══ A. `modelVersion` must identify the WEIGHTS ═══════════════════════════
  section('A. modelVersion must identify the weights, not repeat the provider');
  {
    // The commitment names "model version" separately from "provider" because they are
    // different facts. The field's own comment says so: "one provider id can front several
    // model builds, and 'which weights produced this' is not answerable from the provider
    // name alone." Then the code answers it with the provider name.
    const shipped = build();
    check('A. a record built from the real catalogue does NOT use the provider id as the model version',
      shipped.modelVersion !== shipped.provider,
      `provider=${JSON.stringify(shipped.provider)} modelVersion=${JSON.stringify(shipped.modelVersion)} — `
      + 'when these are equal, the record asserts that the provider name answers "which weights '
      + 'produced this", which is the one thing the field exists to distinguish.');

    // The sharp form: caps that genuinely carry no model version. `auditProvenance` is
    // supposed to name what is missing; a fallback that fills the field in makes the audit
    // report `ok: true` about a record that cannot identify its own weights. That is a
    // completeness check satisfied by a fabrication.
    const thinCaps = {
      provider: 'probe/unknown-weights',
      licence: { name: 'Probe', commercialUse: 'permitted', excludedTerritories: [], requiresAttribution: false },
    };
    const thin = build({ caps: thinCaps, result: { ...FULL_RESULT, modelVersion: undefined } });
    check('A. caps with no model version record NULL, not the provider id',
      thin.modelVersion === null,
      `-> ${JSON.stringify(thin.modelVersion)} — an unknown model version is UNKNOWN. The provider id is `
      + 'not a weaker answer to the same question; it is an answer to a different one.');
    check('A. ...and the audit then NAMES it, rather than reporting the record complete',
      auditProvenance(thin).ok === false && auditProvenance(thin).missing.includes('modelVersion'),
      `-> ${JSON.stringify(auditProvenance(thin))} — this is the whole point of an audit that `
      + '"names what is missing rather than returning a bare false"');

    // Every SHIPPED row must carry a real answer, or the record is incomplete for the lane
    // that actually runs. This is what makes A's fix non-breaking rather than merely strict.
    const ids = Object.keys(VIDEO_PROVIDERS);
    const missing = ids.filter(id => {
      const v = capabilities(id).modelVersion;
      return typeof v !== 'string' || v.trim() === '' || v === id;
    });
    check('A. every catalogue row carries a real model version, exposed through capabilities()',
      missing.length === 0,
      missing.length ? `NO MODEL VERSION: ${missing.join(', ')}` : `${ids.length} row(s) carry one`);
    check('A. ...and it is REQUIRED by the validator, so a new row cannot omit it',
      throws(() => assertSpecShape('probe', { ...VIDEO_PROVIDERS[LOCAL], modelVersion: undefined })) === 'E_BAD_SPEC',
      `-> ${JSON.stringify(throws(() => assertSpecShape('probe', { ...VIDEO_PROVIDERS[LOCAL], modelVersion: undefined })))} — `
      + 'the record is the licensor commitment, so the field it depends on belongs in the shape contract');

    // ...and the READ-ONLY surface publishes it too, so the console's answer to "which weights
    // does this row serve" is not the provider id either. `comfyui/minimax-h3` and
    // `higgsfield/minimax-h3` are different providers serving the SAME model — which is the whole
    // commercial argument for the local lane — and without this field the two rows are
    // distinguishable only by their ids.
    const listed = listModels({ served: [LOCAL], env: {} }).body.models[0];
    // The FIRST draft of this check read `listed.model_version === capabilities(LOCAL).modelVersion
    // && listed.model_version !== listed.id`, and it PASSED against the pre-fix tree — because
    // both sides were `undefined`, and `undefined !== 'comfyui/minimax-h3'`. An assertion that
    // compares two absences is satisfied by a field that does not exist, which is the same
    // vacuity as the `expect(r.modelVersion).toBeTruthy()` this round exists to replace. It now
    // asserts the field is a REAL STRING first, so "published nothing" cannot read as "published
    // the right thing".
    check('A. the catalogue route publishes the model version beside the provider id',
      typeof listed.model_version === 'string' && listed.model_version.trim() !== ''
      && listed.model_version === capabilities(LOCAL).modelVersion
      && listed.model_version !== listed.id,
      `-> id=${JSON.stringify(listed.id)} model_version=${JSON.stringify(listed.model_version)} — a check `
      + 'that compares two absences passes on a field that is not there at all, so the string is '
      + 'asserted before the equality.');

    // CONTROLS.
    check('CONTROL: an adapter that reports its own model version still wins',
      build({ result: { ...FULL_RESULT, modelVersion: 'h3-v0.34.2' } }).modelVersion === 'h3-v0.34.2',
      'a vendor or graph that names its build is more specific than the catalogue row');
    check('CONTROL: the real record is still COMPLETE — the fix must not make every record thin',
      auditProvenance(build()).ok === true,
      `-> ${JSON.stringify(auditProvenance(build()))} — this is the assertion that keeps the change additive`);

    // ...AND AT THE SOURCE, because a behaviour check cannot tell "no fallback" from "the
    // fallback happens to be unreachable for these rows".
    const provCode = stripComments(readSource('../shared/providers/video/provenance.mjs'));
    check('A. the modelVersion line has NO fallback to the provider id',
      /modelVersion:[^,\n]*\|[^,\n]*\|\s*null/.test(provCode) && !/modelVersion:[^,\n]*caps\.provider/.test(provCode),
      `-> ${(provCode.match(/modelVersion:[^,\n]*/) || ['<not found>'])[0].trim()}`);
    const mutated = provCode.replace(/modelVersion:[^,\n]*/, 'modelVersion: result?.modelVersion || caps.modelVersion || caps.provider,');
    check('CONTROL: that assertion FAILS against a source with the fallback restored',
      /modelVersion:[^,\n]*caps\.provider/.test(mutated),
      'so A is testing for the fallback, not passing on any file at all');
  }

  // ══ B. the licence snapshot must not CORRUPT what it copies ═══════════════
  section('B. the licence snapshot must record what it read, or nothing');
  {
    // `[...(lic.excludedTerritories || [])]` on a STRING spreads its CHARACTERS. A row whose
    // exclusion list was authored as a bare string records `['U','S']` in the durable record
    // — a territory list no one ever wrote, in the artifact that is supposed to be the
    // immutable evidence. Round 14 made the GATE refuse that row and the VALIDATOR reject
    // it, so it is unreachable from the catalogue; the record still must not be the one place
    // where an unreadable value is silently reshaped into a plausible one.
    const snap = snapshotLicence({ licence: { name: 'Probe', excludedTerritories: 'US' } },
      { commercial: true, territory: 'US', grantRecorded: false });
    check('B. a non-array exclusion list is NOT spread into characters',
      JSON.stringify(snap.excludedTerritories) !== JSON.stringify(['U', 'S']),
      `-> ${JSON.stringify(snap.excludedTerritories)} — the record must not manufacture a `
      + 'territory list out of a string. "Unreadable" and "read as two one-letter territories" '
      + 'are different facts and only one of them is true.');

    // CONTROLS: the real list is still copied, frozen and unaliased — the property the
    // compliance suite already pins.
    const real = snapshotLicence(localCaps(), { commercial: true, territory: 'US', grantRecorded: false });
    check('CONTROL: a real exclusion list is still copied, frozen and correct',
      Array.isArray(real.excludedTerritories) && Object.isFrozen(real.excludedTerritories)
      && real.excludedTerritories.includes('US'));
    const source = VIDEO_PROVIDERS[LOCAL].licence.excludedTerritories;
    check('CONTROL: ...and it is a COPY, not an alias of the catalogue row',
      real.excludedTerritories !== source,
      'an alias would let a later catalogue edit rewrite a record that is supposed to be immutable');
  }

  // ══ C. an absent claim must not be recorded as a negative ═════════════════
  section('C. the record must not state a fact it was never told');
  {
    // `usedCommercially: commercial === true` records `false` both for "the caller said
    // non-commercial" and for "nobody said anything". The auditor's question — was this run
    // authorised? — is answered differently by those two, and the record currently answers
    // both with a confident "not commercial". Astra's ruling is that zero is never the
    // fallback for an unknown; this is the same mistake in the field that decides whether a
    // licence was needed at all.
    const unspecified = build({ commercial: undefined });
    check('C. an ABSENT commercial flag records as unknown, not as "not commercial"',
      unspecified.licence.usedCommercially === null,
      `-> ${JSON.stringify(unspecified.licence.usedCommercially)} — "we were not told" and "we were `
      + 'told it was not commercial" are different facts, and only one of them answers the '
      + 'auditor. A boolean `false` here is an assertion the caller never made.');

    // CONTROLS: the two real values are unaffected, which is what keeps this non-breaking —
    // the runner passes `p.commercial !== false`, so it always supplies a boolean.
    check('CONTROL: commercial=false still records false',
      build({ commercial: false }).licence.usedCommercially === false);
    check('CONTROL: commercial=true still records true',
      build({ commercial: true }).licence.usedCommercially === true);
    check('CONTROL: territoryAtGeneration already records an absent territory as null',
      build({ territory: undefined }).licence.territoryAtGeneration === null
      && build({ territory: 'CA' }).licence.territoryAtGeneration === 'CA',
      'so C asks for the same rule, not for a new convention');

    // ── THE SAME SHAPE, ON THE OTHER TWO BOOLEANS ────────────────────────────
    // `grantRecorded === true` sat one line below `commercial === true` with the identical
    // defect, and it answers the auditor's OTHER question — "was this run authorised at the
    // time" — so recording an absent grant as "no grant" is the same false assertion in the
    // field that decides whether a licence was needed at all.
    check('C. an ABSENT grantRecorded records as unknown, not as "no grant"',
      build({ grantRecorded: undefined }).licence.grantRecorded === null,
      `-> ${JSON.stringify(build({ grantRecorded: undefined }).licence.grantRecorded)} — the runner always supplies a `
      + 'boolean (`readGrants(env).has(id)`), so nothing it does changes; what changes is that the '
      + 'record stops asserting a refusal nobody made.');
    check('CONTROL: grantRecorded true and false still record as themselves',
      build({ grantRecorded: true }).licence.grantRecorded === true
      && build({ grantRecorded: false }).licence.grantRecorded === false);

    // `requiresAttribution` is the same shape again, with one difference: it comes from OUR row
    // rather than from the caller. So it is fixed in two places — the record stops asserting it,
    // and the validator stops a shipped row from being silent about it, which is what keeps the
    // record from going thin on a row that is actually served.
    check('C. a non-boolean requiresAttribution records as unknown, not as "not required"',
      snapshotLicence({ licence: { name: 'Probe', excludedTerritories: [] } },
        { commercial: true, territory: 'US', grantRecorded: false }).requiresAttribution === null,
      'a licence condition the row did not state must not be recorded as "not required"');
    check('C. ...and a SHIPPED row cannot be silent about it',
      throws(() => assertSpecShape('probe', {
        ...VIDEO_PROVIDERS[LOCAL],
        licence: { ...VIDEO_PROVIDERS[LOCAL].licence, requiresAttribution: undefined },
      })) === 'E_BAD_SPEC',
      '`auditProvenance` reads this field to decide whether a missing attribution makes the record '
      + 'incomplete, so a silent row would relax a licence condition without anyone editing a rule');
    check('CONTROL: the real H3 row still records requiresAttribution as the boolean it is',
      build().licence.requiresAttribution === true,
      `-> ${JSON.stringify(build().licence.requiresAttribution)} — that licence does demand attribution`);

    // A DISCLOSURE, pinned rather than left to be discovered: the runner never passes
    // `agentVersion`, so every record carries `agentVersion: null` — and `auditProvenance`
    // does not check it. Recorded because the commitment to the licensor names three things
    // and this is a fourth that looks like a fourth answer and is always empty.
    const runnerCode = stripComments(readSource('../backend/scripts/handlers/generateVideo.mjs'));
    check('DISCLOSURE: the runner does not pass agentVersion, so it is null in every record',
      !/agentVersion:/.test(runnerCode) && build().agentVersion === null,
      'not audited either, so it is a field that reads like provenance and carries none. '
      + 'Stated rather than silently populated: inventing a version string would be worse.');
  }

  // ══ D. the record still keeps everything rounds 8 and 11 pinned ═══════════
  section('D. the record\'s settled contracts must not move');
  {
    const r = build();
    check('D. schema and the frozen top level are unchanged',
      r.schema === PROVENANCE_SCHEMA && Object.isFrozen(r) && Object.isFrozen(r.licence)
      && Object.isFrozen(r.request) && Object.isFrozen(r.artifact));
    check('D. the prompt contract is unchanged: truncated copy AND hash of the FULL prompt',
      (() => {
        const long = 'x'.repeat(PROMPT_KEEP_CHARS + 50);
        const a = build({ request: req({ prompt: long }) });
        return a.request.prompt.length === PROMPT_KEEP_CHARS
          && a.request.promptTruncated === true
          && a.request.promptSha256 === build({ request: req({ prompt: long }) }).request.promptSha256;
      })(), 'round 8 settled this and it is the reason a truncated prompt stays comparable');
    check('D. the OPERATOR territory is what the runner records, not the request\'s',
      /territory:\s*env\.SWAN_OPERATOR_TERRITORY/.test(
        stripComments(readSource('../backend/scripts/handlers/generateVideo.mjs'))),
      'round 11 fixed the gate; the record has to make the same claim or the evidence contradicts it');
    check('D. a record missing its artifact hash still fails the audit',
      auditProvenance(build({ result: { filename: 'a.mp4', bytes: 1 } })).missing.includes('artifact.sha256'));
    check('D. policy flags are still welded to the record, with consent unestablished',
      (() => {
        const p = build({ policyFlags: [{ rule: 'real-person', detail: 'named athlete' }] });
        return Object.isFrozen(p.policyFlags) && p.policyFlags[0].consentConfirmed === false
          && p.policyFlags[0].rule === 'real-person';
      })(), 'a flag emitted as a log line is analytics, not a control');
    check('D. building without resolved capabilities still throws',
      throws(() => buildProvenance({})) !== null);
  }

  console.log(`\n${passed + failed} CHECKS — ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main();
