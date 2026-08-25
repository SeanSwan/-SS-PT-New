#!/usr/bin/env node
/**
 * ox-final-review.mjs — Final-review gate: Ox Alpha (stealth/ox-alpha) reviews
 * the FINAL deliverable state, in >= 3 SEPARATE calls (per operator order
 * 2026-08-23: "bring in ox for the final reviews, call it separately at
 * least 3 times").
 *
 * Usage:
 *   node scripts/debate/ox-final-review.mjs --packet <final-state-packet.md> \
 *     --out-dir <dir> [--calls 3]
 *
 * Each call is a SEPARATE consult-grok.mjs invocation (own process, own file,
 * own stream — independent attempts, not one call split into three). Each
 * must produce a verdict block:
 *   status: CONFIRM | REJECT
 *   confidence: <0-100>
 *   findings: (none) | F1=<SEVERITY>: <file> <loc>: <claim> | F2=...
 *   evidence:  <cite line refs / behavior>
 *   ruling:    <one-paragraph final call>
 * Exit code: 0 iff every call returned a PARSED verdict (CONFIRM or REJECT —
 * REJECT is a valid outcome, it routes to the operator). 1 if any call is
 * unparseable/failed (a silent pass is worse than a loud failure).
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt; };
const packet = arg('--packet');
const outDir = arg('--out-dir');
const calls = Math.max(3, parseInt(arg('--calls', '3'), 10) || 3);

// The seat that actually has to answer — imported, not redeclared, so the request,
// the dry-run banner, the identity assertion and the tests cannot drift apart.
// See ox-identity.mjs for why this is a single declaration.
import { OX_MODEL } from './ox-identity.mjs';

if (!packet || !outDir) {
  console.error('usage: ox-final-review.mjs --packet <file> --out-dir <dir> [--calls N>=3]');
  process.exit(2);
}
if (!existsSync(packet)) { console.error(`packet not found: ${packet}`); process.exit(2); }
mkdirSync(outDir, { recursive: true });

if (process.argv.includes('--dry-run')) {
  console.log(`[ox-final] DRY-RUN — would fire ${calls} SEPARATE \`${OX_MODEL}\` calls against ${packet}`);
  for (let n = 1; n <= calls; n++) console.log(`  call ${n}/${calls} -> ${join(outDir, `OX-REVIEW-${n}.md`)}`);
  console.log('[ox-final] DRY-RUN: 0 API calls, $0 fired. Gate: all calls must return a parsed CONFIRM/REJECT verdict or exit 1.');
  process.exit(0);
}

function runOnce(n, packetPath) {
  const outPath = join(outDir, `OX-REVIEW-${n}.md`);
  const remit = [
    `FINAL REVIEW call ${n} of ${calls} (independent attempt — you are a fresh reader of the FINAL deliverable state).`,
    'You are Ox Alpha, the designated FINAL REVIEWER for this deliverable. This is not a debate round: you review alone.',
    'Review every deliverable in the packet (seeder script, vitest tests, selftest harness, vitest config, CI workflow, and the handoff brief).',
    'Judge on: (a) correctness — would it survive a real run against a real schema; (b) fidelity to the brief (safety gate, no prod data, no fake PII, no override switch); (c) residual risk a merged PR would leave behind.',
    'Do NOT rubber-stamp. Findings need file + location + claim + severity (MAJOR/MINOR/NOTE).',
    'Then output EXACTLY this block (machine-parsed; a missing block = your review is void):',
    '=== VERDICT ===',
    'status: CONFIRM or REJECT',
    'confidence: 0-100',
    'findings: (none) or F1=<SEVERITY>: <file> <loc>: <claim> | F2=...',
    'evidence: <line refs / observed behavior that supports the ruling>',
    'ruling: <one paragraph: why CONFIRM, or what a REJECT demands before merge>',
    '=== END-VERDICT ===',
  ].join('\n');
  return new Promise((resolve) => {
    // Seat selection rides SWAN_GROK_MODEL, NOT an argv flag. consult-grok.mjs
    // reads `process.env.SWAN_GROK_MODEL || 'x-ai/grok-4.6'` and never parses
    // `--model`, so the flag this used to pass was silently dropped and the
    // Grok default won: every "Ox Alpha final review" was really three Grok
    // calls wearing an Ox label, and the panel's own Grok seat was voting
    // twice under two names. Consensus counts built on that were inflated by
    // one. (Found 2026-08-24; the shared-transport contract is documented at
    // the top of consult-grok.mjs.) One mechanism only — adding an argv path
    // here would recreate exactly the two-mechanism split that caused this.
    const child = spawn('node', [
      join(SCRIPT_DIR, '..', 'consult-grok.mjs'),
      '--document', packetPath,
      '--out', outPath,
      '--remit', remit,
    ], {
      stdio: ['ignore', 'inherit', 'inherit'],
      env: { ...process.env, SWAN_GROK_MODEL: OX_MODEL },
    });
    child.on('close', (code) => resolve({ n, code, outPath }));
  });
}

// Seat-identity logic lives in a SIDE-EFFECT-FREE sibling module so the test
// suite can import it directly. It used to be inline here, and the tests lifted
// it out of source with a regex + `new Function` — which is coupled to formatting
// and had already over-captured once. See ox-identity.mjs for the full reasoning.
// Imported PRE-BOUND. This used to be a one-line wrapper here, which Ox round-4 F1
// correctly called the only untested link in the chain — a dropped seat argument
// would have passed every test while shipping a gate keyed to the wrong seat.
// There is now no seat-binding code in this file to get wrong.
import { FAULT, oxIdentityFault as identityFault } from './ox-identity.mjs';

function parseVerdict(text) {
  const m = text.match(/=== VERDICT ===([\s\S]*?)=== END-VERDICT ===/);
  if (!m) return null;
  const body = m[1];
  const line = (k) => { const mm = body.split('\n').map(l => l.trim()).find(l => l.startsWith(k + ':')); return mm ? mm.slice(k.length + 1).trim() : null; };
  const status = (line('status') || '').toUpperCase();
  if (status !== 'CONFIRM' && status !== 'REJECT') return null;
  const conf = parseInt(line('confidence') || '0', 10);
  const findingsRaw = (line('findings') || '').trim();
  const findings = findingsRaw === '(none)' ? [] : findingsRaw.split('|').map(s => s.trim()).filter(Boolean);
  return { status, confidence: conf, findings, evidence: line('evidence') || '', ruling: line('ruling') || '' };
}

const t0 = Date.now();
// Ox's free upstream pool rate-limits back-to-back calls: the call-2 slot returned
// HTTP 429 ("temporarily rate-limited upstream... retry shortly") in two consecutive
// runs, and each 429 was recorded as a voided call the operator had to re-run by
// hand. Two mitigations, both bounded: a pacing gap between calls so we stop
// tripping the throttle, and ONE in-place retry after a backoff when a call fails
// with a RETRYABLE fault (seat faults still abort the whole run — retrying a
// misconfiguration only spends).
const INTER_CALL_GAP_MS = 15_000;
const RETRY_BACKOFF_MS = 60_000;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function evaluate(r) {
  let verdict = null;
  let fault = null;
  if (r.code === 0 && existsSync(r.outPath)) {
    try {
      const text = readFileSync(r.outPath, 'utf8');
      // Identity BEFORE content: a verdict from the wrong model is not a weaker
      // verdict, it is a different seat's opinion filed under this one's name.
      fault = identityFault(text);
      if (!fault) verdict = parseVerdict(text);
    } catch (e) {
      // Transport-level faults carry an `abort: false` code: they can be a
      // network blip and may come right on the next attempt. Note the message
      // interpolates uncontrolled text (`e.message`) — which is exactly why the
      // caller keys on `.code` and never on the prose.
      fault = { code: 'IO_ERROR', message: `unreadable output: ${e.message}` };
    }
  } else if (r.code === 75) {
    // EX_TEMPFAIL from the transport: 429 rate-limit or 5xx upstream. The ONLY
    // exit code that means "retry shortly" — exit 1 is key/args/4xx and is not.
    fault = { code: 'TRANSIENT', message: 'transport exit 75 — provider rate-limited or 5xx' };
  } else if (r.code !== 0) {
    fault = { code: 'EXIT_NONZERO', message: `consult exited ${r.code}` };
  } else {
    fault = { code: 'NO_OUTPUT', message: 'no output file written' };
  }
  return { verdict, fault };
}

// Retry policy, three review seats' worth of hardening:
//   - OPT-IN allowlist (`retry === true`), never `abort !== true`: an unlisted
//     code must not default to a second paid attempt.
//   - GLOBAL budget per run, so an exit-code misclassification can cost at most
//     RETRY_BUDGET × backoff, never 60s × N.
//   - After a retry the NEXT gap is the full backoff, not the cadence gap — a
//     limiter that just proved hot is not re-approached at 15s. Gaps carry ±20%
//     jitter so three launchers on one shared pool do not synchronise.
const RETRY_BUDGET = 2;
let retriesLeft = RETRY_BUDGET;
const jitter = (ms) => Math.round(ms * (0.8 + Math.random() * 0.4));

const results = [];
let nextGap = INTER_CALL_GAP_MS;
for (let n = 1; n <= calls; n++) {
  if (n > 1) await sleep(jitter(nextGap));
  nextGap = INTER_CALL_GAP_MS;
  console.log(`\n[ox-final] call ${n}/${calls} firing (separate invocation)…`);
  let r = await runOnce(n, packet);
  let { verdict, fault } = evaluate(r);

  const wantsRetry = !!fault && FAULT[fault.code]?.retry === true;
  if (wantsRetry && retriesLeft > 0) {
    retriesLeft -= 1;
    console.warn(`[ox-final] call ${n}: transient [${fault.code}] — retry ${RETRY_BUDGET - retriesLeft}/${RETRY_BUDGET} in ${RETRY_BACKOFF_MS / 1000}s…`);
    await sleep(jitter(RETRY_BACKOFF_MS));
    r = await runOnce(n, packet);
    ({ verdict, fault } = evaluate(r));
    nextGap = RETRY_BACKOFF_MS;
  } else if (wantsRetry) {
    console.warn(`[ox-final] call ${n}: transient [${fault.code}] but retry budget exhausted — voided as-is.`);
  }
  results.push({ ...r, verdict, fault });
  if (verdict) {
    console.log(`[ox-final] call ${n}: ${verdict.status}@${verdict.confidence} findings=${verdict.findings.length}`);
    if (verdict.ruling) console.log(`[ox-final]   ruling: ${verdict.ruling.slice(0, 220)}${verdict.ruling.length > 220 ? '…' : ''}`);
  } else if (fault) {
    console.warn(`[ox-final] call ${n}: VOID [${fault.code}] — ${fault.message}. This call does NOT count.`);
  } else {
    console.warn(`[ox-final] call ${n}: UNPARSED (code=${r.code}) — no verdict block. This call does NOT count.`);
  }

  // FAIL FAST on a seat fault. Raised by GLM 5.3 F7 / Ox F6 (2026-08-24) as one
  // leg of a composite runaway-spend path: identity faults abort AFTER the call
  // is already billed, and the cumulative spend caps cannot fire because nothing
  // writes the ledger they read. Looping on regardless turns one misrouted seat
  // into `calls` paid failures for zero usable output.
  //
  // A seat fault is a CONFIGURATION fault — the wrong model, or a transport that
  // will not say which model replied. It cannot come right on retry, so retrying
  // only spends. Parse failures are NOT included: a model can legitimately botch
  // one verdict block and produce a clean one next time, which is exactly what
  // independent attempts are for.
  // Only SEAT faults abort. A non-zero exit or an unreadable file can be a
  // transient network failure, and aborting the run on one of those would trade
  // a runaway-spend bug for a flaky-gate bug — a gate that quits on a blip is a
  // gate people learn to re-run past.
  //
  // Keyed on the CODE, from a closed table. The previous version regex-matched the
  // message and anchored only half its alternatives, so an interpolated provider
  // string containing "UNPROVEN" would have turned a retryable blip into a hard
  // paid abort. Content cannot spoof a code, and an unknown code is treated as
  // retryable — a fault we have not classified is not evidence of misconfiguration.
  const isSeatFault = !!fault && FAULT[fault.code]?.abort === true;
  if (isSeatFault && n < calls) {
    console.error(`[ox-final] ABORTING after call ${n}/${calls} — seat fault is a config error, not a flake.`);
    console.error(`[ox-final]   Remaining ${calls - n} call(s) NOT fired. Fix the seat, then re-run.`);
    break;
  }
}
const wrongSeat = results.filter(r => r.fault && (r.fault.code === 'WRONG_SEAT' || r.fault.code === 'SUBSTITUTED')).length;
if (wrongSeat > 0) {
  console.error(`\n[ox-final] ❌ ${wrongSeat}/${calls} call(s) were answered by the WRONG MODEL.`);
  console.error(`[ox-final]    Seat selection rides SWAN_GROK_MODEL (consult-grok.mjs reads only that).`);
  console.error(`[ox-final]    A review filed under the wrong seat corrupts every consensus count that includes it.`);
  process.exit(1);
}
const parsedCount = results.filter(r => r.verdict).length;
const rejects = results.filter(r => r.verdict && r.verdict.status === 'REJECT').length;
console.log(`\n[ox-final] DONE in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${parsedCount}/${calls} parsed verdicts, ${rejects} REJECT.`);
if (parsedCount < calls) {
  console.log('[ox-final] RESULT: INCOMPLETE — at least one call unparseable. Operator must re-run or adjudicate. (a silent pass is worse than a loud failure)');
  process.exit(1);
}
if (rejects > 0) {
  console.log('[ox-final] RESULT: REJECT — findings are binding until remediated + re-reviewed.');
} else {
  console.log('[ox-final] RESULT: CONFIRM ×' + parsedCount + ' — Ox Alpha clears the deliverable for the operator.');
}
process.exit(0);
