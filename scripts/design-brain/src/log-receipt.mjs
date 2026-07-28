/**
 * log-receipt.mjs — validated append of ONE inspection receipt to receipts.jsonl.
 * ===============================================================================
 * The agent-side entry point during a research run: the inspector writes a receipt JSON (file or
 * stdin), this validates it against receipt/1 and appends it. Invalid receipts are REFUSED with
 * every error listed — an inspector that cannot produce a substantive receipt has not inspected.
 *
 * USAGE
 *   node src/log-receipt.mjs --root <data-root> --file receipt.json
 *   echo '{...receipt json...}' | node src/log-receipt.mjs --root <data-root>
 *
 * @module design-brain/log-receipt
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveDataRoot } from './paths.mjs';
import { appendJsonl } from './writer.mjs';
import { validateReceipt } from './validate.mjs';
import { readJsonl } from './synthesize.mjs';

function main() {
  const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 ? process.argv[i + 1] : undefined; };
  const root = resolveDataRoot(arg('root'));
  const file = arg('file');

  let raw;
  if (file) raw = readFileSync(file, 'utf8');
  else raw = readFileSync(0, 'utf8'); // stdin
  let receipt;
  try { receipt = JSON.parse(raw); } catch { console.error('error: input is not valid JSON'); return 2; }

  const v = validateReceipt(receipt);
  if (!v.ok) {
    console.error(`REFUSED — receipt fails receipt/1 (${v.errors.length} error(s)):`);
    for (const e of v.errors) console.error(`  - ${e}`);
    return 3;
  }

  const ledger = join(root, 'receipts.jsonl');
  const dupe = readJsonl(ledger).some((r) => r.receiptId === receipt.receiptId);
  if (dupe) { console.error(`REFUSED — receiptId ${receipt.receiptId} already logged (idempotency)`); return 4; }

  appendJsonl(root, ledger, receipt);
  console.log(`logged ${receipt.receiptId} (${receipt.product} / ${receipt.surface})`);
  return 0;
}

if (process.argv[1]?.endsWith('log-receipt.mjs')) process.exit(main());
