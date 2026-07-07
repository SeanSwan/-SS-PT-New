/**
 * runnerLib.mjs — the headless runner ENGINE (slice 5, headless-runner-spec.md).
 * Deliberately the dullest component: every interesting decision was made at
 * registration/scheduling/approval; this executes the residue. runner.mjs is the
 * thin clock; everything here is pure + injectable so every spec step is
 * regression-testable without real spawns or real sleeps.
 *
 * SHIPS DARK: SWITCH_HEADLESS_RUNNER seeds OFF (UX-9). With the switch off every
 * due slot yields a refusal receipt — loud, never silent (spec §3.2).
 *
 * Hard negatives (spec §2): registered commands only, channels must include
 * `runner`, tier must be T0/T1 (structural check — T2+ refuses; a run that wants
 * more creates a QUEUE ENTRY inside its own command and stops), dispatch is an
 * enumerated `node scripts/hermes/<name>.mjs` — no shell, no eval, no chains.
 * Failure routing (spec §4): ≤2 in-tick retries (each receipted) → dead-letter
 * attention (a loud failed receipt + state record) → 3 consecutive failed RUNS
 * auto-demotes the command until a human re-enables. Missed slots are SKIPPED,
 * receipted as skipped, never replayed (spec §5). Receipt-store failure HALTS
 * the runner (an unaccountable runner is a stopped runner, spec §3.4).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { atomicWriteFileSync, verifyChain } from './spineLib.mjs';
import { loadRegistry } from './registryLib.mjs';
import { checkSwitches, isoDateOf, vaultPaths, writeReceipt } from './hermesRunsLib.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
export const GRACE_MS = 10 * 60 * 1000;      // due window past the slot; later = skipped, never replayed
export const CLOCK_SKEW_MS = 5 * 60 * 1000;  // backward jump beyond this pauses scheduling (spec §5)
export const MAX_ATTEMPTS = 3;               // 1 run + 2 bounded retries, each receipted (spec §4)
export const DEMOTE_AFTER = 3;               // consecutive failed RUNS → auto-demote (spec §4)

export const statePath = (vaultRoot) => path.join(vaultRoot, 'runs', 'digests', 'runner-state.json');
const emptyState = () => ({ handled: {}, fails: {}, demoted: {}, lastTickAt: null });
const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
export function readState(vaultRoot) {
  const file = statePath(vaultRoot);
  if (!fs.existsSync(file)) return emptyState();
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (err) { throw new Error(`runner state unreadable (${err.message})`); }
  if (!isPlainObject(parsed)) throw new Error('runner state unreadable (root is not an object)');
  return {
    handled: isPlainObject(parsed.handled) ? parsed.handled : {},
    fails: isPlainObject(parsed.fails) ? parsed.fails : {},
    demoted: isPlainObject(parsed.demoted) ? parsed.demoted : {},
    lastTickAt: typeof parsed.lastTickAt === 'string' ? parsed.lastTickAt : null,
  };
}
const saveState = (vaultRoot, st) => atomicWriteFileSync(statePath(vaultRoot), `${JSON.stringify(st, null, 2)}\n`);

export function readSchedule(vaultRoot) {
  const file = vaultPaths(vaultRoot, '2026-01-01').scheduleFile; // date-independent path
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { entries: Array.isArray(parsed.entries) ? parsed.entries : [], readable: true };
  } catch { return { entries: null, readable: !fs.existsSync(file) }; } // absent = empty; corrupt = unreadable (fail closed)
}

/** Install the seed schedule (spec §6) — a HUMAN act (T1 proposal applied by Sean via --init-schedule). */
export function initSchedule(vaultRoot, seedFile = path.join(HERE, 'schedule.seed.json')) {
  const file = vaultPaths(vaultRoot, '2026-01-01').scheduleFile;
  const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
  // `.scheduled` (names) stays for the digest's silence check; `entries` is authoritative.
  seed.scheduled = seed.entries.filter((e) => e.enabled).map((e) => e.command);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  atomicWriteFileSync(file, `${JSON.stringify(seed, null, 2)}\n`);
  return file;
}

const slotMsOf = (cadence, isoDate, offsetMinutes) => {
  const m = /^daily (\d{2}):(\d{2})$/.exec(String(cadence));
  if (!m) return null; // event cadences (deploy-detected) have no emitter yet — INT-4/P-4
  return Date.parse(`${isoDate}T${m[1]}:${m[2]}:00Z`) - offsetMinutes * 60000;
};

const rec = (vaultRoot, command, tier, when, outcome, evidence) => writeReceipt(vaultRoot, {
  who: 'hermes/runner', what: `${command} (${tier})`, target: `scheduled run`, when,
  'approved-by': 'n/a', outcome, evidence,
});

/**
 * One scheduler pass. Injectable: `now` (ISO), `execImpl(command, file, timeoutMs)
 * -> {ok, detail}`, `registry`. Returns { ran, skipped, refused, demoted, halted }.
 * Every outcome is receipted; receipt-store failure HALTS (throws RunnerHalt).
 */
export function runnerTick(vaultRoot, switchesFile, { now, execImpl = spawnExec, registry = loadRegistry(), offsetMinutes = 0 } = {}) {
  const when = now || new Date().toISOString();
  const nowMs = Date.parse(when);
  const isoDate = isoDateOf(when);
  const out = { ran: [], skipped: [], refused: [], demoted: [], halted: false };

  const halt = (why) => { out.halted = true; const e = new Error(`RUNNER HALT: ${why}`); e.runnerHalt = true; throw e; };
  const receipt = (...a) => { try { return rec(vaultRoot, ...a); } catch (err) { halt(`receipt store unwritable (${err.message}) — an unaccountable runner is a stopped runner`); } };
  let st;
  try { st = readState(vaultRoot); }
  catch (err) {
    receipt('headless-runner', 'T0', when, `failed — runner state unreadable: ${String(err.message).slice(0, 140)} — scheduling halted`, statePath(vaultRoot));
    halt(`runner state unreadable (${String(err.message).slice(0, 140)})`);
  }

  // Clock discipline (spec §5): a backward jump pauses scheduling, loudly.
  if (st.lastTickAt && Number.isFinite(nowMs) && nowMs < Date.parse(st.lastTickAt) - CLOCK_SKEW_MS) {
    receipt('headless-runner', 'T0', when, `refused — clock regressed (now ${when} < last tick ${st.lastTickAt}) — scheduling paused, acknowledge before resuming`, statePath(vaultRoot));
    return out;
  }
  st.lastTickAt = when;

  const sched = readSchedule(vaultRoot);
  if (sched.entries === null) {
    receipt('headless-runner', 'T0', when, 'refused — schedule file unreadable: every scheduled command treated silent (fail closed)', 'runs/digests/schedule.json');
    saveState(vaultRoot, st); return out;
  }

  for (const entry of sched.entries) {
    const { command } = entry;
    if (!entry.enabled || st.demoted[command]) continue;
    const slot = slotMsOf(entry.cadence, isoDate, offsetMinutes);
    if (slot === null || nowMs < slot) continue;
    if (st.handled[command] === isoDate) continue; // one handling per slot per day

    const row = registry.commands.find((c) => c.name === command);
    const file = path.join(HERE, `${command}.mjs`);
    // Hard negatives (spec §2) — refusals are handled slots, not retried.
    let refusal = null;
    if (!row) refusal = `unregistered schedule entry '${command}' — no registry row, no run`;
    else if (!row.channels.includes('runner')) refusal = `'${command}' is not registered for the runner channel`;
    else if (row.tier !== 'T0' && row.tier !== 'T1') refusal = `'${command}' is ${row.tier} — the runner executes T0/T1 only, NEVER T3/T4 (a situation justifies a queue entry, not an elevated run)`;
    else if (!fs.existsSync(file)) refusal = `'${command}' has no runnable (scripts/hermes/${command}.mjs) — spec'd, not built`;
    if (refusal) {
      receipt(command, row?.tier || 'T0', when, `refused — ${refusal}`, 'runs/digests/schedule.json');
      out.refused.push(command); st.handled[command] = isoDate; continue;
    }

    // Missed slot → skipped, receipted, NEVER replayed (spec §5).
    if (nowMs > slot + GRACE_MS) {
      receipt(command, row.tier, when, 'partial — skipped: slot missed during downtime/backoff — recorded, never replayed', 'runner skip ledger');
      out.skipped.push(command); st.handled[command] = isoDate; continue;
    }

    // Switch check (spec §3.2): MASTER + runner + per-command, fresh, fail closed.
    try {
      checkSwitches(vaultRoot, switchesFile, ['SWITCH_MASTER', 'SWITCH_HEADLESS_RUNNER', ...(row.killSwitch ? [row.killSwitch] : [])], {
        who: 'hermes/runner', what: `${command} (${row.tier})`, target: 'scheduled run', when,
      });
    } catch { out.refused.push(command); st.handled[command] = isoDate; continue; } // refusal receipted by checkSwitches; a brake is not a failure

    // Execute with bounded retry (spec §4). Each attempt receipted.
    const timeoutMs = (entry.timeout ?? 300) * 1000;
    let ok = false;
    let detail = '';
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let res;
      try { res = execImpl(command, file, timeoutMs); } catch (err) { res = { ok: false, detail: String(err.message).slice(0, 120) }; }
      ({ ok } = res); detail = res.detail || '';
      receipt(command, row.tier, when, ok ? `ok — scheduled run completed${attempt > 1 ? ` (attempt ${attempt}/${MAX_ATTEMPTS})` : ''}` : `failed — attempt ${attempt}/${MAX_ATTEMPTS}: ${detail}`, `runner exec node scripts/hermes/${command}.mjs`);
      if (ok) break;
    }
    st.handled[command] = isoDate;
    if (ok) { st.fails[command] = 0; out.ran.push(command); continue; }
    st.fails[command] = (st.fails[command] || 0) + 1;
    receipt(command, row.tier, when, `failed — DEAD-LETTER: ${MAX_ATTEMPTS} attempts exhausted (${detail}) — attention item; the runner never widens inputs or retries forever`, 'runner dead-letter');
    if (st.fails[command] >= DEMOTE_AFTER) {
      st.demoted[command] = when;
      receipt(command, row.tier, when, `failed — AUTO-DEMOTED after ${DEMOTE_AFTER} consecutive failed runs — schedule suspended; only a human re-enables (delete it from runner-state.json demoted)`, statePath(vaultRoot));
      out.demoted.push(command);
    }
  }
  saveState(vaultRoot, st);
  return out;
}

function runnerHalt(message) {
  const err = new Error(`RUNNER HALT: ${message}`);
  err.runnerHalt = true;
  return err;
}

function assertStartupChains(vaultRoot, isoDate) {
  const { receiptsFile, queueFile } = vaultPaths(vaultRoot, isoDate);
  const checks = [verifyChain(receiptsFile), verifyChain(queueFile)];
  const broken = checks.filter((c) => !c.ok);
  if (broken.length) {
    const detail = broken.map((b) => `${path.basename(b.file)} L${b.breakAt}: ${b.reason}`).join(' | ');
    throw runnerHalt(`startup consistency failed — ${detail}`);
  }
}

/** Restart consistency (spec §5): receipt store must be provably writable and
 *  today's chain well-formed BEFORE any command executes at boot. */
export function startupCheck(vaultRoot, isoDate, when) {
  assertStartupChains(vaultRoot, isoDate);
  const r = rec(vaultRoot, 'headless-runner', 'T0', when, 'ok — startup consistency: receipt+queue chains verified, receipt store writable, resuming schedule', statePath(vaultRoot));
  const { receiptsFile } = vaultPaths(vaultRoot, isoDateOf(when));
  const back = fs.readFileSync(receiptsFile, 'utf8').includes(r.id);
  if (!back) throw runnerHalt('startup receipt did not read back — store untrustworthy');
  const post = verifyChain(receiptsFile);
  if (!post.ok) throw runnerHalt(`startup receipt broke the chain — ${path.basename(post.file)} L${post.breakAt}: ${post.reason}`);
  return r.id;
}

export function spawnExec(command, file, timeoutMs) {
  // Enumerated executable, declared args only (spec §2): node + the registered
  // command's own script. No shell, no eval, no argument-injection surface.
  const res = spawnSync(process.execPath, [file], { timeout: timeoutMs, encoding: 'utf8', windowsHide: true });
  const ok = res.status === 0 && !res.error;
  return { ok, detail: ok ? 'exit 0' : (res.error ? String(res.error.message) : `exit ${res.status}: ${String(res.stderr || res.stdout).slice(0, 100)}`) };
}
