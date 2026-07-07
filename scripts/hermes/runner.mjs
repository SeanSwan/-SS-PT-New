#!/usr/bin/env node
/**
 * runner.mjs — the headless runner's thin clock (slice 5). All logic lives in
 * runnerLib.mjs; this is a timer + a lock file, exactly as the spec's idle
 * doctrine demands (§5: "an idle runner's footprint is a timer and a lock file").
 *
 * SHIPS DARK: SWITCH_HEADLESS_RUNNER seeds OFF (UX-9) — with it off, every due
 * slot produces a loud refusal receipt and nothing runs. Sean flips it on for
 * the 1-week T0 soak (implementation-slices.md §5), personally, both times.
 *
 * Usage:
 *   node scripts/hermes/runner.mjs --once            # one scheduler pass (cron/Task-Scheduler mode)
 *   node scripts/hermes/runner.mjs --init-schedule   # install the seed schedule (HUMAN act, T1)
 *   node scripts/hermes/runner.mjs                   # resident loop, 60s ticks, single instance
 * Infrastructure failure backs off 1m → 4m → 15m → 60m (spec §5) and retries the
 * runner's OWN startup checks — never the missed commands (those log as skipped).
 */
import { parseArgs } from 'node:util';
import { withLock } from './spineLib.mjs';
import { resolveSwitchesFile, resolveVaultRoot, isoDateOf, writeReceipt } from './hermesRunsLib.mjs';
import { runnerTick, startupCheck, initSchedule, spawnExec, statePath } from './runnerLib.mjs';

const BACKOFF_MS = [60_000, 240_000, 900_000, 3_600_000];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { values } = parseArgs({ options: { once: { type: 'boolean' }, 'init-schedule': { type: 'boolean' } } });
const vaultRoot = resolveVaultRoot();
const switchesFile = resolveSwitchesFile();

if (values['init-schedule']) {
  console.log(`schedule installed: ${initSchedule(vaultRoot)} (edits are T1 proposals — yours to apply)`);
  process.exit(0);
}

function receiptLockSkip() {
  const when = new Date().toISOString();
  writeReceipt(vaultRoot, {
    who: 'hermes/runner', what: 'headless-runner (T0)', target: 'scheduler trigger', when,
    'approved-by': 'n/a',
    outcome: 'partial — skipped: another runner instance holds the run lock; this trigger is not queued',
    evidence: `${statePath(vaultRoot)}.runlock`,
  });
}

function tickOnce({ verifyStartup = true } = {}) {
  const now = new Date().toISOString();
  if (verifyStartup) startupCheck(vaultRoot, isoDateOf(now), now);
  const offsetMinutes = -new Date(now).getTimezoneOffset(); // schedule evaluates LOCAL time (spec §5), refreshed for DST.
  return runnerTick(vaultRoot, switchesFile, { now, execImpl: spawnExec, offsetMinutes });
}

if (values.once) {
  // Single instance even in --once mode: a second concurrent invocation is
  // logged as skipped, not queued behind and not a crash (spec §3.1).
  try {
    const out = withLock(`${statePath(vaultRoot)}.runlock`, () => tickOnce(), { timeoutMs: 1000 });
    console.log(`tick: ran=${out.ran.length} skipped=${out.skipped.length} refused=${out.refused.length} demoted=${out.demoted.length}`);
    process.exit(0);
  } catch (err) {
    if (err.runnerHalt) { console.error(err.message); process.exit(2); }
    if (/lock timeout/.test(String(err.message))) { receiptLockSkip(); console.log('another runner instance holds the lock — this trigger is skipped, not queued'); process.exit(0); }
    throw err;
  }
}

let backoffIdx = 0;
let startupVerified = false;
for (;;) {
  try {
    const out = withLock(`${statePath(vaultRoot)}.runlock`, () => {
      const result = tickOnce({ verifyStartup: !startupVerified });
      startupVerified = true;
      return result;
    }, { timeoutMs: 1000 });
    backoffIdx = 0;
    if (out.ran.length || out.refused.length || out.demoted.length) {
      console.log(`${new Date().toISOString()} ran=${out.ran} refused=${out.refused} demoted=${out.demoted}`);
    }
    await sleep(60_000);
  } catch (err) {
    if (/lock timeout/.test(String(err.message))) {
      receiptLockSkip();
      await sleep(60_000);
      continue;
    }
    // Infrastructure failure: exponential backoff, retry OUR startup checks only.
    startupVerified = false;
    const wait = BACKOFF_MS[Math.min(backoffIdx++, BACKOFF_MS.length - 1)];
    console.error(`${new Date().toISOString()} ${err.message} — backing off ${wait / 60000}m (missed slots will log as skipped, never replayed)`);
    if (err.runnerHalt) { console.error('HALTED: receipt store unaccountable — fix the vault, then restart.'); process.exit(2); }
    await sleep(wait);
  }
}
