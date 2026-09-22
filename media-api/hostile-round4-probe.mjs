#!/usr/bin/env node
/**
 * hostile-round4-probe.mjs — the FOURTH hostile pass.
 *
 * Rounds 1–3 covered the HTTP surface, the handler/socket seams, and money arithmetic.
 * Round 4 goes after the two things that DECIDE whether money may move at all: the
 * spend guard's reading of a cost, and the enablement/licence sets. Both are pure
 * functions over injected input, so they can be attacked directly — no socket, no GPU,
 * no vendor.
 *
 * ── THE QUESTION THIS ROUND ASKS ────────────────────────────────────────────
 * Not "does the guard refuse?" but "is there ANY input for which the guard says yes
 * when it should not?" A guard is only as strong as its worst reading of an
 * undeterminable value, and the fail-open direction is always the one that costs money.
 *
 * ── CONTROLS, EVERY SECTION ─────────────────────────────────────────────────
 * A check that something is refused proves nothing unless a neighbouring check proves
 * the legitimate case is accepted. Round 2 passed six checks vacuously because its
 * requests never reached the handler; that lesson is baked into every section here.
 */

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  checkRunAllowed, makeFileLedger, readLimits, dayKey, SpendGuardError,
} from '../shared/providers/video/spendGuard.mjs';
import { readEnabled, readGrants, resolve } from '../shared/providers/video/registry.mjs';
import { redactSecrets } from '../shared/providers/video/higgsfieldTransport.mjs';

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { fail += 1; failures.push(name); console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
}
function section(t) { console.log(`\n── ${t} ──`); }

/** Run the guard and report either the decision or the refusal code. */
function verdict(caps, usage, limits) {
  try { return { ok: true, ...checkRunAllowed(caps, usage, limits) }; }
  catch (err) { return { ok: false, code: err.code }; }
}

async function main() {
  console.log('HOSTILE PROBE — ROUND 4\n');
  const generous = { maxRunsDaily: 50, maxSpendUsdDaily: 100 };

  // ── A. an undeterminable cost must never read as free ─────────────────────
  section('A. an undeterminable cost must never be read as free');
  {
    check('CONTROL: a genuinely free provider runs', verdict({ provider: 'local', costPerRunUsd: 0 }, { runs: 0, spendUsd: 0 }, generous).ok === true);
    check('CONTROL: a priced provider is counted', verdict({ provider: 'paid', costPerRunUsd: 5 }, { runs: 0, spendUsd: 0 }, generous).ok === true);
    check('CONTROL: an explicit null cost is refused as unknown',
      verdict({ provider: 'paid', costPerRunUsd: null }, { runs: 0, spendUsd: 0 }, generous).code === 'E_UNKNOWN_COST');

    // `caps.costPerRunUsd === null ? Infinity : Number(x) || 0` — the ABSENT field and
    // the unparseable one both fall through `Number(x) || 0` to ZERO, which the guard
    // reads as "free local generation" and waves past the spend ceiling entirely.
    for (const [label, value] of [['absent', undefined], ['unparseable', 'not-a-number'], ['empty string', '']]) {
      const out = verdict({ provider: 'paid', costPerRunUsd: value }, { runs: 0, spendUsd: 0 }, generous);
      check(`a ${label} cost is not treated as free`, out.ok === false,
        out.ok ? `ALLOWED with runCost=${out.runCost} — an undeterminable cost became a free run`
          : `refused ${out.code}`);
    }
  }

  // ── B. a corrupt ledger must degrade asymmetrically ───────────────────────
  section('B. a corrupt ledger stops billing and leaves free generation alone');
  {
    const dir = mkdtempSync(join(tmpdir(), 'swan-probe4-b-'));
    const path = join(dir, 'ledger.json');
    const day = dayKey(new Date('2026-09-18T12:00:00Z'));

    const fresh = makeFileLedger(path, { readFileSync, writeFileSync });
    check('CONTROL: a missing ledger reads as a fresh day, not degraded',
      fresh.usageFor(day).degraded === false, JSON.stringify(fresh.usageFor(day)));

    fresh.record(day, { runs: 2, spendUsd: 3 });
    check('CONTROL: a recorded day is read back', fresh.usageFor(day).runs === 2,
      JSON.stringify(fresh.usageFor(day)));

    writeFileSync(path, '{"2026-09-18": {"runs": 9, ', 'utf8');   // truncated mid-write
    const broken = makeFileLedger(path, { readFileSync, writeFileSync });
    const usage = broken.usageFor(day);
    check('a corrupt ledger is reported degraded', usage.degraded === true, JSON.stringify(usage));
    check('a corrupt ledger does NOT restore a full run allowance for billing',
      verdict({ provider: 'paid', costPerRunUsd: 5 }, usage, generous).code === 'E_LEDGER_DEGRADED',
      JSON.stringify(verdict({ provider: 'paid', costPerRunUsd: 5 }, usage, generous)));
    check('free local generation is unaffected by a corrupt ledger',
      verdict({ provider: 'local', costPerRunUsd: 0 }, usage, generous).ok === true);

    // A NEGATIVE delta must not buy back headroom — this was probed before and is
    // re-asserted here because it is the difference between a counter and a mint.
    const dir2 = mkdtempSync(join(tmpdir(), 'swan-probe4-b2-'));
    const p2 = join(dir2, 'ledger.json');
    const l2 = makeFileLedger(p2, { readFileSync, writeFileSync });
    l2.record(day, { runs: 5, spendUsd: 5 });
    l2.record(day, { runs: -100, spendUsd: -100 });
    check('a negative delta cannot buy back headroom', l2.usageFor(day).runs === 5 && l2.usageFor(day).spendUsd === 5,
      JSON.stringify(l2.usageFor(day)));
  }

  // ── C. enablement and grants are exact, never loose ───────────────────────
  section('C. enablement and licence grants match EXACTLY');
  {
    const on = readEnabled({ SWAN_VIDEO_PROVIDERS_ENABLED: 'comfyui/minimax-h3' });
    check('CONTROL: an exact id is enabled', on.has('comfyui/minimax-h3'));
    check('a longer id does not enable the shorter one',
      readEnabled({ SWAN_VIDEO_PROVIDERS_ENABLED: 'comfyui/minimax-h3-turbo' }).has('comfyui/minimax-h3') === false);
    check('a prefix does not enable anything',
      readEnabled({ SWAN_VIDEO_PROVIDERS_ENABLED: 'comfyui' }).has('comfyui/minimax-h3') === false);
    check('unset enables nothing', readEnabled({}).size === 0);
    check('whitespace is trimmed, not treated as a match',
      readEnabled({ SWAN_VIDEO_PROVIDERS_ENABLED: ' comfyui/minimax-h3 , ' }).has('comfyui/minimax-h3'));

    const grants = readGrants({ SWAN_VIDEO_LICENCE_GRANTS: 'comfyui/minimax-h3' });
    check('CONTROL: an exact grant is read', grants.has('comfyui/minimax-h3'));
    check('unset grants nothing', readGrants({}).size === 0);
    check('a wildcard is not a grant', readGrants({ SWAN_VIDEO_LICENCE_GRANTS: '*' }).has('comfyui/minimax-h3') === false);
  }

  // ── D. resolve() with nothing granted must refuse ─────────────────────────
  section('D. resolve() refuses when nothing is enabled or granted');
  {
    const refused = (fn) => { try { fn(); return null; } catch (e) { return e.code || e.name; } };
    check('CONTROL: an enabled provider resolves',
      refused(() => resolve('comfyui/minimax-h3', {
        commercial: false, grants: new Set(), enabled: new Set(['comfyui/minimax-h3']), territory: 'US',
      })) === null);
    check('a provider that is not enabled is refused',
      refused(() => resolve('comfyui/minimax-h3', {
        commercial: false, grants: new Set(), enabled: new Set(), territory: 'US',
      })) !== null);
    check('a commercial request without a grant is refused',
      refused(() => resolve('comfyui/minimax-h3', {
        commercial: true, grants: new Set(), enabled: new Set(['comfyui/minimax-h3']), territory: 'US',
      })) !== null);
  }

  // ── E. redaction ──────────────────────────────────────────────────────────
  section('E. redaction removes the credential it is handed');
  {
    const secret = 'sk-super-secret-value';
    const text = `Authorization: Key keyid123:${secret}`;
    const out = redactSecrets(text, [secret]);
    check('CONTROL: the secret is gone from the output', !out.includes(secret), out);
    check('the rest of the line survives', out.includes('keyid123'));
    check('an empty secret list is a no-op, not a crash', redactSecrets('abc', []) === 'abc');
    // Disclosed, not asserted: a secret shorter than six characters is left in the
    // clear by design. It is a floor against redacting common substrings, and the
    // caller (`secretsOf(cfg)`) only ever supplies real key material.
    const shortOut = redactSecrets('key=abc', ['abc']);
    check('a sub-6-character secret is NOT redacted (disclosed limitation)', shortOut === 'key=abc',
      `redactSecrets('key=abc', ['abc']) = ${shortOut}`);
  }

  console.log(`\n${pass + fail} CHECKS — ${pass} passed, ${fail} failed`);
  if (failures.length) console.log(`failed: ${failures.join(' | ')}`);
  process.exit(fail === 0 ? 0 : 1);
}

await main();
