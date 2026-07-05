#!/usr/bin/env node
/**
 * switches.mjs — switch-status (T0) + switch-flip (T2) over the switches store
 * (Slice 2, repo side; registered rows in command-effect-registry.md §3).
 *
 * Doctrine (kill-switches.md §1-§5):
 *  - NEITHER command carries a kill switch — both must work when everything
 *    else is off; flip IS the resume path. (Registry: kill-switch "none".)
 *  - State is read fresh per invocation, never cached.
 *  - Unknown switch names refuse — adding a switch is a registry-grade change
 *    (kill-switches.md §6), never a flip side effect.
 *  - Every flip is receipted with the state diff; flipping OFF auto-revokes
 *    dependent queue approvals (approval-gates §6, via queueModel).
 *  - Unreadable store: status REPORTS it (it must still answer); flip REFUSES
 *    (the masters — daemon stop / hooks disable — are the fallback brakes).
 *
 * The Telegram KILL/RESUME phrase handlers live in the bot broker (Codex lane,
 * slice 2 bot side); this module is the store + lifecycle they call into.
 * Usage: node switches.mjs status · node switches.mjs flip --switch NAME --direction on|off --resolver X --channel Y
 */
import { parseArgs } from 'node:util';
import {
  readSwitches, resolveSwitchesFile, resolveVaultRoot, writeReceipt,
} from './hermesRunsLib.mjs';
import { autoRevokeForSwitch } from './queueModel.mjs';
import { atomicWriteFileSync } from './spineLib.mjs';

const ALLOWLIST_ROW = 'allowlist: switch ops, Sean-only channels (bridge §7 standing T2 row; open-questions Q1 DECIDED 2026-07-04)';

export function switchStatus(vaultRoot, switchesFile, { now } = {}) {
  const when = now || new Date().toISOString();
  const read = readSwitches(switchesFile);
  if (!read.ok) {
    writeReceipt(vaultRoot, {
      who: 'harness/switch-status', what: 'switch-status (T0)', target: switchesFile,
      when, 'approved-by': 'n/a',
      outcome: `partial — ${read.reason}; all dependent commands fail closed`,
      evidence: switchesFile,
    });
    return { unreadable: true, reason: read.reason, states: {} };
  }
  writeReceipt(vaultRoot, {
    who: 'harness/switch-status', what: 'switch-status (T0)', target: switchesFile,
    when, 'approved-by': 'n/a',
    outcome: `ok — ${Object.keys(read.state).length} switches read (${Object.values(read.state).filter((v) => v !== true).length} not on)`,
    evidence: 'switch table (see store file)',
  });
  return { unreadable: false, states: read.state };
}

export function switchFlip(vaultRoot, switchesFile, { name, direction, resolver, channel, now }) {
  const when = now || new Date().toISOString();
  const ctx = { who: `${resolver || 'unknown'}/${channel || 'internal'}`, what: 'switch-flip (T2)', target: name || 'switch-flip request', when };
  const fail = (message) => {
    writeReceipt(vaultRoot, { ...ctx, 'approved-by': 'n/a', outcome: `refused — ${message}`, evidence: switchesFile });
    throw new Error(`refused: ${message}`);
  };
  if (direction !== 'on' && direction !== 'off') fail(`direction must be on|off, got: ${String(direction).slice(0, 20)}`);
  const read = readSwitches(switchesFile);
  if (!read.ok) fail(`${read.reason} — cannot flip what cannot be read; fallback brakes are the masters (daemon stop / hooks disable)`);
  if (!(name in read.state)) fail(`unknown switch: ${String(name).slice(0, 40)} — adding a switch is a registry change (kill-switches.md §6), not a flip`);

  const prev = read.state[name] === true;
  const next = direction === 'on';
  const changed = prev !== next;
  if (changed) {
    const updated = { ...read.state, [name]: next };
    atomicWriteFileSync(switchesFile, JSON.stringify(updated, null, 2) + '\n'); // temp+rename, never a torn switches file (G-6)
  }
  const revoked = changed && !next ? autoRevokeForSwitch(vaultRoot, name, when) : [];
  writeReceipt(vaultRoot, {
    ...ctx,
    'approved-by': ALLOWLIST_ROW,
    outcome: `ok — ${prev ? 'on' : 'off'}→${next ? 'on' : 'off'}${changed ? '' : ' (no change)'}${revoked.length ? `; auto-revoked ${revoked.length} dependent queue entr${revoked.length === 1 ? 'y' : 'ies'} (approval-gates §6)` : ''}`,
    evidence: `switch state diff: {"${name}": ${prev}→${next}}`,
  });
  return { name, prev, next, changed, revoked };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/').split('/').pop());
if (isMain) {
  const [sub, ...rest] = process.argv.slice(2);
  try {
    if (sub === 'status') {
      const out = switchStatus(resolveVaultRoot(), resolveSwitchesFile(), {});
      if (out.unreadable) console.log(`UNREADABLE: ${out.reason} (all dependent commands fail closed)`);
      else for (const [k, v] of Object.entries(out.states)) console.log(`${v === true ? 'ON ' : 'OFF'}  ${k}`);
    } else if (sub === 'flip') {
      const { values } = parseArgs({
        args: rest,
        options: { switch: { type: 'string' }, direction: { type: 'string' }, resolver: { type: 'string' }, channel: { type: 'string' } },
      });
      const out = switchFlip(resolveVaultRoot(), resolveSwitchesFile(), {
        name: values.switch, direction: values.direction, resolver: values.resolver, channel: values.channel,
      });
      console.log(`${out.name}: ${out.prev ? 'on' : 'off'}→${out.next ? 'on' : 'off'}${out.changed ? '' : ' (no change)'}${out.revoked.length ? ` · revoked: ${out.revoked.join(', ')}` : ''}`);
    } else {
      throw new Error('usage: switches.mjs <status|flip> …');
    }
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
}
