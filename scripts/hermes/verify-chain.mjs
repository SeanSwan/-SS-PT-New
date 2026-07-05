#!/usr/bin/env node
/**
 * verify-chain.mjs — verify the tamper-evident hash chain (E2, G-3) of a day's
 * receipt + queue streams and report any break. Registered T0 `verify-chain`
 * (kill-switch `none` — an integrity check must run during an incident, when
 * other switches may be pulled). Writes its own receipt.
 *
 * The verify receipt is itself appended to the receipts stream — it extends the
 * very chain just verified, which is correct: verification is an audited action.
 *
 * Usage: node verify-chain.mjs [--date YYYY-MM-DD]
 */
import { parseArgs } from 'node:util';
import { verifyChain } from './spineLib.mjs';
import { resolveVaultRoot, vaultPaths, writeReceipt } from './hermesRunsLib.mjs';

const base = (f) => String(f).replace(/\\/g, '/').split('/').pop();

export function runVerify(vaultRoot, isoDate, { now } = {}) {
  const when = now || new Date().toISOString();
  const { receiptsFile, queueFile } = vaultPaths(vaultRoot, isoDate);
  const results = [verifyChain(receiptsFile), verifyChain(queueFile)];
  const broken = results.filter((r) => !r.ok);
  const warned = results.filter((r) => r.ok && r.warn);
  writeReceipt(vaultRoot, {
    who: 'harness/verify-chain', what: 'verify-chain (T0)',
    target: `receipt+queue chains for ${isoDate}`, when, 'approved-by': 'n/a',
    outcome: broken.length
      ? `failed — ${broken.length} chain break(s): ${broken.map((b) => `${base(b.file)} L${b.breakAt} ${b.reason}`).join(' | ')}`
      : warned.length
        ? `partial — ${results.length} streams chain-valid, ${warned.length} warning(s): ${warned.map((r) => `${base(r.file)}: ${r.warn}`).join(' | ')}`
        : `ok — ${results.length} streams intact (${results.map((r) => `${base(r.file)} ${r.count} lines`).join(', ')})`,
    evidence: broken.length
      ? broken.map((b) => `${b.file}#L${b.breakAt}`).join(', ')
      : `${receiptsFile}; ${queueFile}`,
  });
  return { ok: broken.length === 0, warned: warned.length > 0, results };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/').split('/').pop());
if (isMain) {
  const { values } = parseArgs({ options: { date: { type: 'string' } } });
  const isoDate = values.date || new Date().toISOString().slice(0, 10);
  const out = runVerify(resolveVaultRoot(), isoDate, {});
  for (const r of out.results) {
    console.log(
      r.ok
        ? `OK    ${base(r.file)} — ${r.count} lines${r.warn ? ` (warn: ${r.warn})` : ''}`
        : `BREAK ${base(r.file)} — L${r.breakAt}: ${r.reason}`
    );
  }
  process.exit(out.ok ? 0 : 1);
}
