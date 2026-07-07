/**
 * runner.test.mjs — slice-5 regression suite: every headless-runner-spec.md §3
 * step demonstrably unskippable, hard negatives structural, failure routing
 * mechanical, skips never replayed. No real spawns (execImpl injected), no real
 * sleeps (single-tick engine).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ensureLanes, seedSwitches, readReceipts, writeReceipt, vaultPaths } from './hermesRunsLib.mjs';
import { runnerTick, startupCheck, initSchedule, readState, statePath, GRACE_MS } from './runnerLib.mjs';

process.env.HERMES_ANCHOR_KEY = 'runner-test-key';
const DAY = '2026-07-01';
const AT_SLOT = `${DAY}T06:01:30Z`; // inside health-sweep's 06:01 UTC slot window (offset 0 in tests)

function fresh({ runnerOn = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-run-'));
  const swFile = path.join(root, 'switches.json');
  ensureLanes(root);
  // UX-9 seeds SWITCH_HEADLESS_RUNNER OFF — soak tests arm it explicitly, like Sean will.
  seedSwitches(swFile, runnerOn ? { SWITCH_HEADLESS_RUNNER: true } : {});
  initSchedule(root);
  return { root, swFile };
}
const okExec = () => ({ ok: true, detail: 'exit 0' });
const failExec = () => ({ ok: false, detail: 'exit 1: boom' });
const outcomes = (root, cmd) => readReceipts(root, DAY).filter((r) => r.what.startsWith(cmd)).map((r) => r.outcome);
const seedReceipt = (root, label) => writeReceipt(root, {
  who: 'test/runner', what: 'health-sweep (T0)', target: `test-${label}`,
  when: `${DAY}T05:55:00Z`, 'approved-by': 'n/a', outcome: `ok — ${label}`, evidence: 'runner.test',
});

test('SHIPS DARK: switch off → due slot yields a loud refusal receipt, nothing runs', () => {
  const { root, swFile } = fresh({ runnerOn: false });
  const out = runnerTick(root, swFile, { now: AT_SLOT, execImpl: okExec });
  assert.equal(out.ran.length, 0);
  assert.ok(out.refused.includes('health-sweep'));
  assert.ok(readReceipts(root, DAY).some((r) => /refused/.test(r.outcome) && /SWITCH_HEADLESS_RUNNER/.test(r.outcome)));
});

test('happy path: due slots run once, receipt ok, second tick same day does not re-run', () => {
  const { root, swFile } = fresh();
  const out = runnerTick(root, swFile, { now: AT_SLOT, execImpl: okExec });
  assert.ok(out.ran.includes('health-sweep'));
  const again = runnerTick(root, swFile, { now: `${DAY}T06:05:00Z`, execImpl: okExec });
  assert.ok(!again.ran.includes('health-sweep'), 'one handling per slot per day');
});

test('per-command switch off → that command refuses, siblings still run (fail closed, scoped)', () => {
  const { root, swFile } = fresh();
  const sw = JSON.parse(fs.readFileSync(swFile, 'utf8'));
  sw.SWITCH_HEALTH_SWEEP = false;
  fs.writeFileSync(swFile, JSON.stringify(sw));
  const out = runnerTick(root, swFile, { now: `${DAY}T06:06:00Z`, execImpl: okExec });
  assert.ok(out.refused.includes('health-sweep'));
  assert.ok(out.ran.includes('morning-briefing'));
});

test('unregistered schedule entry → refusal receipt + attention, no best guess', () => {
  const { root, swFile } = fresh();
  const schedFile = path.join(root, 'runs', 'digests', 'schedule.json');
  const sched = JSON.parse(fs.readFileSync(schedFile, 'utf8'));
  sched.entries.push({ command: 'phantom-command', cadence: 'daily 06:00', enabled: true });
  fs.writeFileSync(schedFile, JSON.stringify(sched));
  const out = runnerTick(root, swFile, { now: AT_SLOT, execImpl: okExec });
  assert.ok(out.refused.includes('phantom-command'));
  assert.ok(outcomes(root, 'phantom-command').some((o) => /unregistered schedule entry/.test(o)));
});

test('STRUCTURAL tier guard: a T3 command in the schedule refuses — runner never elevates', () => {
  const { root, swFile } = fresh();
  const schedFile = path.join(root, 'runs', 'digests', 'schedule.json');
  const sched = JSON.parse(fs.readFileSync(schedFile, 'utf8'));
  sched.entries.push({ command: 'discord-alert', cadence: 'daily 06:00', enabled: true });
  fs.writeFileSync(schedFile, JSON.stringify(sched));
  const out = runnerTick(root, swFile, { now: AT_SLOT, execImpl: okExec });
  assert.ok(out.refused.includes('discord-alert'));
  assert.ok(outcomes(root, 'discord-alert').some((o) => /T0\/T1 only, NEVER T3\/T4/.test(o)));
});

test('spec-only command (no runnable file) → refusal, not a crash', () => {
  const { root, swFile } = fresh();
  const schedFile = path.join(root, 'runs', 'digests', 'schedule.json');
  const sched = JSON.parse(fs.readFileSync(schedFile, 'utf8'));
  sched.entries.push({ command: 'stale-client-report', cadence: 'daily 06:00', enabled: true });
  fs.writeFileSync(schedFile, JSON.stringify(sched));
  const out = runnerTick(root, swFile, { now: AT_SLOT, execImpl: okExec });
  assert.ok(out.refused.includes('stale-client-report'));
  assert.ok(outcomes(root, 'stale-client-report').some((o) => /no runnable/.test(o)));
});

test('missed slot past the grace window → SKIPPED receipt, never replayed (spec §5)', () => {
  const { root, swFile } = fresh();
  const late = new Date(Date.parse(`${DAY}T06:01:00Z`) + GRACE_MS + 60000).toISOString();
  const out = runnerTick(root, swFile, { now: late, execImpl: okExec });
  assert.ok(out.skipped.includes('health-sweep'));
  assert.ok(outcomes(root, 'health-sweep').some((o) => /skipped: slot missed/.test(o)));
  const again = runnerTick(root, swFile, { now: new Date(Date.parse(late) + 60000).toISOString(), execImpl: okExec });
  assert.equal(again.ran.length + again.skipped.length, 0, 'a skip is final for the day — no replay');
});

test('bounded retry: 3 attempts each receipted, then DEAD-LETTER attention', () => {
  const { root, swFile } = fresh();
  const out = runnerTick(root, swFile, { now: AT_SLOT, execImpl: failExec });
  assert.equal(out.ran.length, 0);
  const o = outcomes(root, 'health-sweep');
  assert.ok(o.some((x) => /attempt 1\/3/.test(x)) && o.some((x) => /attempt 3\/3/.test(x)));
  assert.ok(o.some((x) => /DEAD-LETTER/.test(x)));
});

test('AUTO-DEMOTION after 3 consecutive failed runs; demoted command never fires again', () => {
  const { root, swFile } = fresh();
  for (const [i, day] of ['2026-07-01', '2026-07-02', '2026-07-03'].entries()) {
    const out = runnerTick(root, swFile, { now: `${day}T06:01:30Z`, execImpl: failExec });
    if (i === 2) assert.ok(out.demoted.includes('health-sweep'));
  }
  assert.ok(readState(root).demoted['health-sweep']);
  const after = runnerTick(root, swFile, { now: '2026-07-04T06:01:30Z', execImpl: okExec });
  assert.ok(!after.ran.includes('health-sweep'), 'only a human re-enables a demoted command');
  assert.ok(readReceipts(root, '2026-07-03').some((r) => /AUTO-DEMOTED/.test(r.outcome)));
});

test('success resets the consecutive-failure counter (no demotion across recoveries)', () => {
  const { root, swFile } = fresh();
  runnerTick(root, swFile, { now: `${DAY}T06:01:30Z`, execImpl: failExec });
  runnerTick(root, swFile, { now: '2026-07-02T06:01:30Z', execImpl: okExec });
  runnerTick(root, swFile, { now: '2026-07-03T06:01:30Z', execImpl: failExec });
  assert.ok(!readState(root).demoted['health-sweep']);
});

test('clock regression pauses scheduling with a loud refusal (spec §5)', () => {
  const { root, swFile } = fresh();
  runnerTick(root, swFile, { now: `${DAY}T12:00:00Z`, execImpl: okExec });
  const out = runnerTick(root, swFile, { now: `${DAY}T06:00:00Z`, execImpl: okExec });
  assert.equal(out.ran.length + out.skipped.length, 0);
  assert.ok(readReceipts(root, DAY).some((r) => /clock regressed/.test(r.outcome)));
});

test('unreadable (corrupt) schedule → fail closed with a refusal receipt', () => {
  const { root, swFile } = fresh();
  fs.writeFileSync(path.join(root, 'runs', 'digests', 'schedule.json'), '{not json');
  const out = runnerTick(root, swFile, { now: AT_SLOT, execImpl: okExec });
  assert.equal(out.ran.length, 0);
  assert.ok(readReceipts(root, DAY).some((r) => /schedule file unreadable/.test(r.outcome)));
});

test('receipt store unwritable → RUNNER HALT, loud, no silent work (spec §3.4)', () => {
  const { root, swFile } = fresh();
  const receiptsDir = path.join(root, 'runs', 'receipts');
  fs.rmSync(receiptsDir, { recursive: true, force: true });
  fs.writeFileSync(receiptsDir, 'a file where the lane dir must be'); // mkdir will now fail
  assert.throws(() => runnerTick(root, swFile, { now: AT_SLOT, execImpl: okExec }), /RUNNER HALT/);
});

test('startupCheck: writes + reads back its own receipt before any command may run', () => {
  const { root } = fresh();
  const id = startupCheck(root, DAY, `${DAY}T05:59:00Z`);
  assert.match(id, /^R-20260701-/);
});

test('startupCheck halts on an existing receipt-chain break before writing a startup receipt', () => {
  const { root } = fresh();
  seedReceipt(root, 'before');
  seedReceipt(root, 'after');
  const file = vaultPaths(root, DAY).receiptsFile;
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  const tampered = JSON.parse(lines[0]);
  tampered.outcome = 'ok — tampered beneath the tail';
  lines[0] = JSON.stringify(tampered);
  fs.writeFileSync(file, `${lines.join('\n')}\n`);

  assert.throws(() => startupCheck(root, DAY, `${DAY}T05:59:00Z`), /RUNNER HALT: startup consistency failed/);
  assert.equal(readReceipts(root, DAY).filter((r) => r.what === 'headless-runner (T0)').length, 0, 'startup must not launder a broken stream with a fresh receipt');
});

test('corrupt runner-state.json halts loudly instead of silently re-enabling schedule state', () => {
  const { root, swFile } = fresh();
  fs.writeFileSync(statePath(root), '{not json');
  assert.throws(() => runnerTick(root, swFile, { now: AT_SLOT, execImpl: okExec }), /RUNNER HALT: runner state unreadable/);
  assert.ok(readReceipts(root, DAY).some((r) => /runner state unreadable/.test(r.outcome)));
});
test('init-schedule derives the digest-compat scheduled list from enabled entries', () => {
  const { root } = fresh();
  const sched = JSON.parse(fs.readFileSync(path.join(root, 'runs', 'digests', 'schedule.json'), 'utf8'));
  assert.deepEqual(sched.scheduled, ['receipt-digest', 'health-sweep', 'morning-briefing']);
  assert.equal(sched.entries.find((e) => e.command === 'health-sweep-on-deploy').enabled, false, 'event cadence waits on an emitter (P-4)');
});
