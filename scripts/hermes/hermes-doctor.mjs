#!/usr/bin/env node
/**
 * hermes-doctor.mjs — self-diagnosis (E4, registered T0 `hermes-doctor`,
 * kill-switch none — a health check must run during an incident). The slice-3
 * health panel's data source and the slice-5 runner's pre-flight (closes G-5).
 *
 * Checks: lanes + index.md law · switches readable (posture, not a hard fault
 * when off) · chain intact (receipts + queue, surfaces breaks AND warns) · clock
 * not regressed vs a persisted last-seen (G-10) · schedule readable · receipt
 * roundtrip (its own receipt, written + read back).
 *
 * Exit code = the panel contract: 0 healthy · 1 degraded (chain warns) · 2 fault.
 * Writes its own receipt; persists a monotonic last-seen to
 * runs/digests/doctor-state.json (a forward clock advances it; a backward clock
 * is flagged but never rewinds the high-water mark).
 *
 * Usage: node hermes-doctor.mjs [--date YYYY-MM-DD]
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { verifyChain, atomicWriteFileSync } from './spineLib.mjs';
import { recordAnchors, anchorStatus } from './anchorLedger.mjs';
import {
  LANES, ensureLanes, readSwitches, readReceipts, isoDateOf,
  resolveSwitchesFile, resolveVaultRoot, vaultPaths, writeReceipt,
} from './hermesRunsLib.mjs';

const CLOCK_SKEW_MS = 5 * 60 * 1000; // tolerate 5 min of benign skew before flagging a regression
const base = (f) => String(f).replace(/\\/g, '/').split('/').pop();
const statePath = (vaultRoot) => path.join(vaultRoot, 'runs', 'digests', 'doctor-state.json');
function readState(vaultRoot) {
  try { return JSON.parse(fs.readFileSync(statePath(vaultRoot), 'utf8')); } catch { return {}; }
}

export function runDoctor(vaultRoot, switchesFile, isoDate, { now } = {}) {
  const when = now || new Date().toISOString();
  const checks = [];
  const add = (name, ok, detail) => { checks.push({ name, ok, detail }); };

  ensureLanes(vaultRoot);
  const lanesOk = LANES.every((l) => fs.existsSync(path.join(vaultRoot, 'runs', l, 'index.md')));
  add('lanes', lanesOk, lanesOk ? `${LANES.length} lanes + index.md present` : 'a lane index.md is missing');

  const sw = readSwitches(switchesFile);
  add('switches', sw.ok, sw.ok
    ? `${Object.keys(sw.state).length} switches (${Object.values(sw.state).filter((v) => v !== true).length} not on)`
    : `unreadable: ${sw.reason} — all dependent commands fail closed`);

  const { receiptsFile, queueFile, scheduleFile } = vaultPaths(vaultRoot, isoDate);
  const chains = [verifyChain(receiptsFile), verifyChain(queueFile)];
  const broken = chains.filter((c) => !c.ok);
  const warns = chains.filter((c) => c.ok && c.warn);
  add('chain', broken.length === 0, broken.length
    ? broken.map((c) => `${base(c.file)} L${c.breakAt}: ${c.reason}`).join(' | ')
    : (warns.length ? `chain-valid, ${warns.length} warn(s): ${warns.map((c) => c.warn).join('; ')}` : `${chains.length} streams intact`));

  const state = readState(vaultRoot);
  const lastMs = state.lastSeen ? Date.parse(state.lastSeen) : null;
  const nowMs = Date.parse(when);
  const regressed = lastMs !== null && Number.isFinite(nowMs) && nowMs < lastMs - CLOCK_SKEW_MS;
  add('clock', !regressed, regressed
    ? `REGRESSION: now ${when} is behind last-seen ${state.lastSeen} — expiry/arm windows may be silently extended; acknowledge before arming T4`
    : `monotonic (last-seen ${state.lastSeen || 'first run'})`);

  let schedOk = true;
  let schedDetail = 'no schedule registered (pre-slice-5)';
  if (fs.existsSync(scheduleFile)) {
    try { JSON.parse(fs.readFileSync(scheduleFile, 'utf8')); schedDetail = 'schedule readable'; }
    catch { schedOk = false; schedDetail = 'schedule UNREADABLE — every scheduled command treated silent (fail closed)'; }
  }
  add('schedule', schedOk, schedDetail);

  // Anchor (E4b-final): freeze today's high-water into the signed ledger, then
  // verify every witnessed day's streams against it. Forgery-resistance locally;
  // deletion-resistance only once the ledger syncs off-box and the doctor reads
  // that copy back (HERMES_OFFBOX_WITNESS — E4C runbook §2). A crash here must
  // never disable the rest of the auditor (round-2 corrupt-.gz lesson).
  const anchorWarns = [];
  try {
    const recd = recordAnchors(vaultRoot, isoDate);
    const st = anchorStatus(vaultRoot, { today: isoDate });
    const anchorFaults = [...st.faults, ...recd.regressions.map((r) => `record-time: ${r}`)];
    anchorWarns.push(...st.warns);
    if (recd.skippedBackdated.length) anchorWarns.push(`backdated un-anchored day(s) skipped (ledger is append-only in time): ${recd.skippedBackdated.join(', ')} — investigate how they appeared`);
    add('anchor', anchorFaults.length === 0, anchorFaults.length
      ? anchorFaults.join(' | ')
      : [`${st.entries} ledger entrie(s), ${st.witnessedDates} day(s) witnessed`, ...anchorWarns, ...st.notes].join(' · '));
  } catch (err) {
    add('anchor', false, `anchor check crashed: ${String(err && err.message).slice(0, 160)}`);
  }

  // Persist a monotonic last-seen high-water mark.
  const highWater = (lastMs !== null && lastMs > nowMs) ? state.lastSeen : when;
  try { atomicWriteFileSync(statePath(vaultRoot), `${JSON.stringify({ ...state, lastSeen: highWater }, null, 2)}\n`); }
  catch { add('clock-state', false, 'could not persist doctor-state.json'); }

  // Receipt roundtrip: write the doctor's own receipt, then read it back.
  const warnMsgs = [...warns.map((c) => c.warn), ...anchorWarns];
  const preFaults = checks.filter((c) => !c.ok);
  const outcome = preFaults.length
    ? `failed — ${preFaults.map((c) => `${c.name}: ${c.detail}`).join(' | ')}`
    : (warnMsgs.length ? `partial — degraded: ${warnMsgs.join('; ')}` : `ok — ${checks.length} checks healthy`);
  const rec = writeReceipt(vaultRoot, {
    who: 'harness/hermes-doctor', what: 'hermes-doctor (T0)', target: `self-diagnosis ${isoDate}`,
    when, 'approved-by': 'n/a', outcome, evidence: statePath(vaultRoot),
  });
  // Read back from the date the receipt actually landed in (its `when`), which may
  // differ from the diagnosed isoDate when --date targets a past day.
  const roundtripOk = readReceipts(vaultRoot, isoDateOf(when)).some((r) => r.id === rec.id);
  add('roundtrip', roundtripOk, roundtripOk ? `receipt ${rec.id} written + read back` : 'receipt write/read-back FAILED');

  const faults = checks.filter((c) => !c.ok);
  const exitCode = faults.length ? 2 : (warnMsgs.length ? 1 : 0);
  return { ok: exitCode === 0, exitCode, checks, warns: warnMsgs, receiptId: rec.id };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/').split('/').pop());
if (isMain) {
  const { values } = parseArgs({ options: { date: { type: 'string' } } });
  const isoDate = values.date || new Date().toISOString().slice(0, 10);
  const out = runDoctor(resolveVaultRoot(), resolveSwitchesFile(), isoDate, {});
  for (const c of out.checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'} ${String(c.name).padEnd(12)} ${c.detail}`);
  console.log(`exit ${out.exitCode} (${out.exitCode === 0 ? 'healthy' : out.exitCode === 1 ? 'degraded' : 'fault'})`);
  process.exit(out.exitCode);
}
