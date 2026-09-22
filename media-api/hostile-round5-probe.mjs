#!/usr/bin/env node
/**
 * hostile-round5-probe.mjs — the FIFTH hostile pass.
 *
 * Rounds 1–4 covered the HTTP surface, the socket seams, money arithmetic, and the
 * guard/enablement sets. Round 5 goes after the three remaining places where a defect
 * would be invisible: the CONTENT FILTER (a filter that misses looks like a filter that
 * works), PROVENANCE (a record that fails its own audit is still written), and the
 * ERROR-STATUS TABLE (a code with no entry silently becomes "your fault").
 *
 * ── THE COVERAGE SWEEP ──────────────────────────────────────────────────────
 * Section E is a repo-wide sweep rather than a hand-written list: it reads the gate
 * modules, extracts every `E_*` code they can actually throw, and asserts each one is
 * mapped in `STATUS_BY_CODE`. A hand-written list only ever tests the codes the author
 * remembered — which is the failure mode, not the test.
 */

import { readFileSync } from 'node:fs';
import { evaluatePrompt, assertPromptAllowed, promptVariants } from '../shared/providers/video/promptPolicy.mjs';
import { buildProvenance, auditProvenance } from '../shared/providers/video/provenance.mjs';
import { STATUS_BY_CODE } from './wire.mjs';

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { fail += 1; failures.push(name); console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
}
function section(t) { console.log(`\n── ${t} ──`); }

const env = {};   // no blocked names configured
const flagged = (p) => evaluatePrompt(p, env).flags.length > 0;
const blocked = (p) => evaluatePrompt(p, env).allowed === false;

async function main() {
  console.log('HOSTILE PROBE — ROUND 5\n');

  // ── A. a place-name must not silence the person-name flag ─────────────────
  section('A. a place-name must not suppress the person-name flag');
  {
    // CONTROL: the guard exists for a reason — a place alone must not be flagged.
    check('CONTROL: a place-name alone is not flagged', flagged('New York rooftop at dawn') === false);
    check('CONTROL: a real name alone IS flagged', flagged('John Smith coaching a squat') === true);
    // The guard used to be tested against the WHOLE prompt, so one city anywhere in it
    // disabled the flag for every name in the same prompt. Adding "New York" was a
    // one-word bypass of the flag that routes an asset to human review.
    check('a name is still flagged when a place-name also appears',
      flagged('John Smith coaching in New York') === true,
      'adding a city must not switch the flag off');
    check('a name is still flagged when the place comes FIRST',
      flagged('New York session with John Smith') === true);
    // CONTROL: the guard must still work on the matched name.
    check('CONTROL: a place-name is still not treated as a person',
      flagged('Los Angeles sunrise over the pier') === false);
  }

  // ── B. legitimate training prompts must pass clean ────────────────────────
  section('B. ordinary training prompts must not be refused');
  {
    const legitimate = [
      'A 45 year old client performing a barbell back squat, cinematic lighting',
      'RPE 8 set of 5 reps, close up on the bar path',
      'E Z bar curl, 3 sets of 12, dynamic camera',
      'A 1 rep max deadlift attempt from the side',
      'Coach demonstrating a kettlebell swing on a rooftop at Golden Hour',
      'Shot on a Canon R5, 35mm, a 30 second loop of a treadmill sprint',
    ];
    for (const p of legitimate) {
      const out = evaluatePrompt(p, env);
      check(`not refused: "${p.slice(0, 44)}…"`, out.allowed === true,
        out.allowed ? '' : `BLOCKED by ${out.violations.map(v => v.rule).join(', ')}`);
    }
  }

  // ── C. the evasions that ARE claimed closed must be closed ────────────────
  section('C. the evasions the filter claims to close are closed');
  {
    check('CONTROL: the plain spelling is caught', blocked('a child playing in a park'));
    check('letter-spacing is caught', blocked('a c h i l d playing in a park'),
      promptVariants('a c h i l d').join(' | '));
    check('digit substitution is caught', blocked('a ch1ld playing in a park'),
      promptVariants('ch1ld').join(' | '));
    check('CONTROL: a plain age over 18 is NOT a minor violation',
      evaluatePrompt('a 45 year old athlete', env).violations.length === 0);
    check('an age under 18 IS a violation', blocked('a 12 year old athlete'));
  }

  // ── D. provenance must satisfy its own audit ──────────────────────────────
  section('D. the provenance record must pass the module\'s own audit');
  {
    const caps = {
      provider: 'comfyui/minimax-h3',
      modelVersion: 'h3-v1',
      label: 'MiniMax H3',
      attribution: 'MiniMax H3, local',
      licence: { name: 'MiniMax H3 Community', requiresAttribution: true, commercialUse: 'requires-grant', restricts: 'model-execution', excludedTerritories: ['US'] },
    };
    const record = buildProvenance({
      caps,
      request: { prompt: 'a probe prompt' },
      result: { sha256: 'deadbeef', promptId: 'p-1' },
      commercial: false,
      territory: 'US',
      grantRecorded: false,
      now: new Date('2026-09-18T00:00:00Z'),
    });
    const audit = auditProvenance(record);
    check('CONTROL: a fully-formed record audits clean', audit.ok === true,
      audit.ok ? '' : `missing: ${audit.missing.join(', ')}`);
    check('the record carries the prompt hash', Boolean(record.request?.promptSha256));
    check('the record carries the artifact hash', record.artifact?.sha256 === 'deadbeef');
    check('the record carries the licence snapshot', record.licence?.name === caps.licence.name);
    check('a record with a dropped artifact hash is caught by the audit',
      auditProvenance({ ...record, artifact: {} }).ok === false);
  }

  // ── E. every refusal code a gate can throw must be MAPPED ────────────────
  section('E. every refusal code the gates throw has a status');
  {
    const sources = [
      '../shared/providers/video/registry.mjs',
      '../shared/providers/video/promptPolicy.mjs',
      '../shared/providers/video/spendGuard.mjs',
      '../shared/providers/video/costEstimate.mjs',
      './preflight.mjs',
    ];
    const found = new Set();
    for (const rel of sources) {
      const text = readFileSync(new URL(rel, import.meta.url), 'utf8');
      // QUOTED codes only. An unanchored `E_[A-Z_]+` sweep also matched the tails of
      // ordinary identifiers — `SWAN_VIDEO_LICENCE_GRANTS` contains `E_GRANTS`,
      // `Number.POSITIVE_INFINITY` contains `E_INFINITY`, `REAL_PERSON_HINT` contains
      // `E_HINT` — and reported four codes that do not exist. A code is always a quoted
      // literal at its throw site.
      for (const m of text.matchAll(/['"](E_[A-Z][A-Z0-9_]{2,})['"]/g)) found.add(m[1]);
    }
    const unmapped = [...found].filter((c) => !(c in STATUS_BY_CODE)).sort();
    check('CONTROL: the sweep found a meaningful number of codes', found.size >= 10,
      `${found.size} code(s): ${[...found].sort().join(', ')}`);
    check('no gate code falls through to the default 400', unmapped.length === 0,
      unmapped.length ? `UNMAPPED: ${unmapped.join(', ')}` : `all ${found.size} mapped`);
    check('CONTROL: statusFor still resolves a known code',
      STATUS_BY_CODE.E_LICENCE_GRANT_REQUIRED === 403);
  }

  console.log(`\n${pass + fail} CHECKS — ${pass} passed, ${fail} failed`);
  if (failures.length) console.log(`failed: ${failures.join(' | ')}`);
  process.exit(fail === 0 ? 0 : 1);
}

await main();
