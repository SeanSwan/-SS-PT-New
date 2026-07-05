#!/usr/bin/env node
/**
 * receipt-prune.mjs — 90-day retention prune for the vault runs/ lanes
 * (Slice 1; proposed registry row `receipt-prune`, T2, pending Sean per
 * command-effect-registry.md §4).
 *
 * Policy (run-logs-and-self-improvement.md §3, open-questions Q4 DECIDED):
 * hot window 90 days; aged dated files (receipts/logs/queue/digests) are
 * gzip-compressed into runs/archive/<lane>/… with a verified roundtrip, then
 * removed from the hot lane — MOVED, never deleted, never leaves the vault.
 * The prune writes its own receipt. Gate: SWITCH_MASTER, fail closed.
 *
 * Usage: node receipt-prune.mjs [--older-than-days 90] [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { parseArgs } from 'node:util';
import {
  checkSwitches, resolveSwitchesFile, resolveVaultRoot, writeReceipt,
} from './hermesRunsLib.mjs';

const HOT_LANES = ['receipts', 'logs', 'queue', 'digests'];
const DATED = /(\d{4}-\d{2}-\d{2})/;

function* datedFiles(vaultRoot) {
  for (const lane of HOT_LANES) {
    const base = path.join(vaultRoot, 'runs', lane);
    if (!fs.existsSync(base)) continue;
    const stack = [base];
    while (stack.length) {
      const dir = stack.pop();
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) stack.push(full);
        else if (name !== 'index.md' && DATED.test(name)) {
          yield { lane, full, rel: path.relative(base, full), date: DATED.exec(name)[1] };
        }
      }
    }
  }
}

export function pruneVault(vaultRoot, switchesFile, { olderThanDays = 90, now, dryRun = false }) {
  const when = now || new Date().toISOString();
  checkSwitches(vaultRoot, switchesFile, ['SWITCH_MASTER'], {
    who: 'harness/receipt-prune', what: 'receipt-prune (T2)',
    target: `runs/ hot lanes older than ${olderThanDays}d`, when,
  });
  // Clamp: never archive files younger than 1 day — archiving the CURRENT day's
  // receipts file would reset the R-id sequence and mint duplicate ids.
  const cutoff = Date.parse(when) - Math.max(1, olderThanDays) * 24 * 60 * 60 * 1000;
  const candidates = [...datedFiles(vaultRoot)].filter((f) => Date.parse(f.date) < cutoff);
  const archived = [];
  if (!dryRun) {
    for (const f of candidates) {
      const dest = path.join(vaultRoot, 'runs', 'archive', f.lane, `${f.rel}.gz`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const original = fs.readFileSync(f.full);
      fs.writeFileSync(dest, zlib.gzipSync(original));
      if (!zlib.gunzipSync(fs.readFileSync(dest)).equals(original)) {
        throw new Error(`archive roundtrip mismatch for ${f.rel} — original left in place`);
      }
      fs.rmSync(f.full);
      archived.push(dest);
    }
    writeReceipt(vaultRoot, {
      who: 'harness/receipt-prune', what: 'receipt-prune (T2)',
      target: `runs/ hot lanes older than ${olderThanDays}d`, when,
      'approved-by': 'allowlist: deterministic retention prune (proposed row, pending Sean — registry §4)',
      outcome: `ok — ${archived.length} file(s) compressed into runs/archive (moved, never deleted)`,
      evidence: archived[0] || 'no files met the cutoff',
    });
  }
  return { candidates, archived };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/').split('/').pop());
if (isMain) {
  const { values } = parseArgs({
    options: { 'older-than-days': { type: 'string' }, 'dry-run': { type: 'boolean' } },
  });
  const result = pruneVault(resolveVaultRoot(), resolveSwitchesFile(), {
    olderThanDays: Number(values['older-than-days'] ?? 90),
    dryRun: values['dry-run'] ?? false,
  });
  console.log(
    values['dry-run']
      ? `dry-run: ${result.candidates.length} candidate(s)\n${result.candidates.map((c) => c.full).join('\n')}`
      : `archived ${result.archived.length} file(s)`
  );
}
