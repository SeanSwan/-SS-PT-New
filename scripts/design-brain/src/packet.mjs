/**
 * packet.mjs — render the weekly batch-adjudication packet: Sean's ONE human surface.
 * ===================================================================================
 * One markdown file, ≤8 lines per claim, decided by EDITING THE FILE: each claim carries a
 * `DECIDE:` line where Sean replaces `_` with a letter —
 *     a = accept   r = reject   t = trial   m CLM-xxx = merge into that claim
 * Then: node src/adjudicate.mjs --root <root> --batch <file>. No UI, no clicks, one edit pass —
 * "one markdown file beats any UI for adjudication" (Pass C, accepted).
 *
 * USAGE
 *   node src/packet.mjs --root <data-root>       # renders batches/BATCH-<date>.md from proposed claims
 *
 * @module design-brain/packet
 */
import { join } from 'node:path';
import { resolveDataRoot } from './paths.mjs';
import { safeWriteText } from './writer.mjs';
import { readJsonl } from './synthesize.mjs';

/** Render one claim as its packet block (≤8 lines). */
export function renderClaim(c) {
  const conf = `${c.confidence.level}${c.singleSource ? ' (SINGLE SOURCE)' : ''}`;
  const lines = [
    `### ${c.claimId} — ${c.domainId} · ${conf}`,
    `**${c.principle.trim()}**`,
    `products: ${c.products.join(', ')}  ·  receipts: ${c.receiptRefs.join(', ')}`,
  ];
  if (c.exceptions?.length) lines.push(`exceptions: ${c.exceptions.join('; ')}`);
  if (c.contradictions?.length) lines.push(`⚠ contradicts: ${c.contradictions.join(', ')}`);
  lines.push('DECIDE: _   (a=accept  r=reject  t=trial  m CLM-xxx=merge)');
  lines.push('');
  return lines.join('\n');
}

/** Pure core: claims[] → packet markdown. */
export function renderPacket(claims, { batchId }) {
  const proposed = claims.filter((c) => c.status === 'proposed');
  const head = [
    `# Batch ${batchId} — ${proposed.length} claims to adjudicate`,
    '',
    '> Edit each `DECIDE:` line, save, then run:',
    '> `node src/adjudicate.mjs --root <root> --batch <this file>`',
    '> Unmarked claims stay proposed — skipping is allowed, guessing is not.',
    '',
  ];
  const perDomain = new Map();
  for (const c of proposed) perDomain.set(c.domainId, (perDomain.get(c.domainId) || 0) + 1);
  head.push(`domains: ${[...perDomain.entries()].map(([d, n]) => `${d}×${n}`).join(' · ') || '(none)'}`, '');
  return head.join('\n') + proposed.map(renderClaim).join('\n');
}

function main() {
  const i = process.argv.indexOf('--root');
  const root = resolveDataRoot(i !== -1 ? process.argv[i + 1] : undefined);
  const claims = readJsonl(join(root, 'claims-proposed.jsonl'));
  const batchId = new Date().toISOString().slice(0, 10);
  const file = join(root, 'batches', `BATCH-${batchId}.md`);
  safeWriteText(root, file, renderPacket(claims, { batchId }));
  const n = claims.filter((c) => c.status === 'proposed').length;
  console.log(`packet: ${n} proposed claim(s) -> ${file}`);
  console.log('edit the DECIDE lines, then run adjudicate.');
  return 0;
}

if (process.argv[1]?.endsWith('packet.mjs')) process.exit(main());
