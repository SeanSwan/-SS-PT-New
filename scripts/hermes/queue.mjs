#!/usr/bin/env node
/**
 * queue.mjs — CLI for the approval queue (Slice 1; lifecycle in queueModel.mjs).
 *
 * Subcommands (approval-gates.md §2-§5):
 *   create  --action --tier --target --requester --evidence [--rollback]
 *   list    [--filter open|expiring|all]        (sweeps expiry first — expiry closes itself)
 *   approve --id --resolver --channel <telegram|command-center> [--phrase "APPROVE Q-… <action>"] [--confirmed]
 *   deny    --id --resolver --channel --reason
 *   arm     --id --resolver --channel [--phrase "ARM Q-… <action>"]   (T4; MUST be a different
 *            channel than the approval, within 10 minutes — cross-channel is the defense)
 *   execute --id --resolver --evidence          (T3 broker execution · T4 files the HUMAN act)
 *   revoke  --id --resolver --reason
 *
 * Every write is gated on SWITCH_MASTER (fresh read, fail closed) and emits a
 * receipt. Only registered T3/T4 commands queue; T2 never queues (doctrine).
 * The broker NEVER executes T4 — `execute` on a T4 entry only records Sean's act.
 */
import { parseArgs } from 'node:util';
import { resolveSwitchesFile, resolveVaultRoot } from './hermesRunsLib.mjs';
import { createEntry, listEntries, transitionEntry } from './queueModel.mjs';

const OPTIONS = {
  action: { type: 'string' }, tier: { type: 'string' }, target: { type: 'string' },
  requester: { type: 'string' }, evidence: { type: 'string' }, rollback: { type: 'string' },
  filter: { type: 'string' }, id: { type: 'string' }, resolver: { type: 'string' },
  channel: { type: 'string' }, phrase: { type: 'string' }, reason: { type: 'string' },
  confirmed: { type: 'boolean' },
};
const MOVES = { approve: 'approved', deny: 'denied', arm: 'armed', execute: 'executed', revoke: 'revoked' };

export function runCli(argv, vaultRoot = resolveVaultRoot(), switchesFile = resolveSwitchesFile(), now = new Date().toISOString()) {
  const [sub, ...rest] = argv;
  const { values } = parseArgs({ args: rest, options: OPTIONS });
  if (sub === 'create') {
    const entry = createEntry(vaultRoot, switchesFile, values, now);
    return [`${entry.id} · ${entry.action} (${entry.tier}) · ${entry.target} · expires ${entry.expires}`];
  }
  if (sub === 'list') {
    const rows = listEntries(vaultRoot, switchesFile, { filter: values.filter || 'open', at: now });
    return rows.length
      ? rows.map((r) => `${r.id} · ${r.status} · ${r.action} (${r.tier}) · ${r.target} · expires ${r.expires}`)
      : ['(queue empty)'];
  }
  if (MOVES[sub]) {
    const t = transitionEntry(vaultRoot, switchesFile, { ...values, to: MOVES[sub], at: now });
    return [`${t.id}: ${t.from} → ${t.to}`];
  }
  throw new Error('usage: queue.mjs <create|list|approve|deny|arm|execute|revoke> …');
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/').split('/').pop());
if (isMain) {
  try {
    for (const line of runCli(process.argv.slice(2))) console.log(line);
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
}
