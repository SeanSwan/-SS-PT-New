#!/usr/bin/env node
/**
 * receipt-write.mjs — CLI for the append-only receipt stream (Slice 1).
 *
 * Subcommands:
 *   init                       scaffold vault runs/ lanes (index.md law) and seed
 *                              the switches file IF ABSENT (all on, flips are slice 2);
 *                              receipted as vault-init
 *   write --who --command --tier --target --approved-by --outcome --evidence [--when]
 *   list  --date YYYY-MM-DD    print the day's receipts (reader; no mutation exists)
 *
 * Receipt writing has NO kill switch by design (kill-switches.md §4): refusals
 * must always be recordable. There is no update/delete subcommand and never
 * will be — corrections are new receipts referencing the old id.
 * Vault root: HERMES_VAULT_ROOT (default ~/.hermes/vault, never a repo path).
 */
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import {
  ensureLanes, readReceipts, resolveSwitchesFile, resolveVaultRoot,
  seedSwitches, writeReceipt,
} from './hermesRunsLib.mjs';

export function runCli(argv, vaultRoot = resolveVaultRoot(), switchesFile = resolveSwitchesFile()) {
  const [sub, ...rest] = argv;
  if (sub === 'init') {
    ensureLanes(vaultRoot);
    let seeded = false;
    if (!fs.existsSync(switchesFile)) {
      seedSwitches(switchesFile);
      seeded = true;
    }
    const receipt = writeReceipt(vaultRoot, {
      who: 'harness/receipt-write', what: 'vault-init (T2)',
      target: vaultRoot, when: new Date().toISOString(),
      'approved-by': 'allowlist: vault scaffolding (proposed row, pending Sean — registry §4)',
      outcome: `ok — lanes ensured${seeded ? ', switches file seeded (all on)' : ', switches file already present (untouched)'}`,
      evidence: switchesFile,
    });
    return [`vault: ${vaultRoot}`, `switches: ${switchesFile}${seeded ? ' (seeded)' : ' (existing)'}`, `receipt: ${receipt.id}`];
  }
  if (sub === 'write') {
    const { values } = parseArgs({
      args: rest,
      options: {
        who: { type: 'string' }, command: { type: 'string' }, tier: { type: 'string' },
        target: { type: 'string' }, 'approved-by': { type: 'string' },
        outcome: { type: 'string' }, evidence: { type: 'string' }, when: { type: 'string' },
      },
    });
    const receipt = writeReceipt(vaultRoot, {
      who: values.who,
      what: `${values.command} (${values.tier})`,
      target: values.target,
      when: values.when || new Date().toISOString(),
      'approved-by': values['approved-by'] || 'n/a',
      outcome: values.outcome,
      evidence: values.evidence,
    });
    return [receipt.id];
  }
  if (sub === 'list') {
    const { values } = parseArgs({ args: rest, options: { date: { type: 'string' } } });
    if (!values.date) throw new Error('list requires --date YYYY-MM-DD');
    return readReceipts(vaultRoot, values.date).map(
      (r) => `${r.id} · ${r.who} · ${r.what} · ${r.target} · ${r.outcome}`
    );
  }
  throw new Error('usage: receipt-write.mjs <init|write|list> …  (no update/delete exists by design)');
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/').split('/').pop());
if (isMain) {
  for (const line of runCli(process.argv.slice(2))) console.log(line);
}
