/** Emit accepted claims into the brain-vault design-claims collection. */
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { resolveDataRoot } from './paths.mjs';
import { loadClaims, readJsonl } from './synthesize.mjs';
import { validateClaimProvenance } from './claim-provenance.mjs';
const csvRow = (row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',');
const HEADER = 'status,output_text_path,source_relative_path,source_absolute_path,title,author,char_count,page_count,truncated';
export function renderClaimDoc(c) {
  return [`CLAIM ${c.claimId} [${c.domainId}] - confidence ${c.confidence.level}`, '', `PRINCIPLE: ${c.principle.trim()}`, `PHASE: ${c.workflowPhase} - ROLE: ${c.userRole}`, `PRODUCTS: ${c.products.join(', ')}`, `RECEIPTS: ${c.receiptRefs.join(', ')}`, c.exceptions?.length ? `EXCEPTIONS: ${c.exceptions.join('; ')}` : '', c.contradictions?.length ? `CONTRADICTS: ${c.contradictions.join(', ')}` : '', c.swanTranslation?.cPatterns?.length ? `SWAN C-PATTERNS: ${c.swanTranslation.cPatterns.join(', ')}` : '', c.swanTranslation?.tokens ? `SWAN TOKENS: ${c.swanTranslation.tokens}` : '', c.swanTranslation?.qaRisks ? `QA RISKS: ${c.swanTranslation.qaRisks}` : '', '', `adjudicated by ${c.humanDecision?.approvedBy ?? 'unknown'} at ${c.humanDecision?.utc ?? '?'} (${c.humanDecision?.batchId ?? '?'})`, 'TRUST: recall-tier evidence with human acceptance. Not canon. Verify against design.md before doctrine use.'].filter(Boolean).join('\n');
}
export function emitCollection(claims, vault, { nowStamp, receiptsById, sourceAuthority = {} }) {
  for (const claim of claims.filter((item) => item.status === 'accepted')) if (!validateClaimProvenance(claim, receiptsById, sourceAuthority)) throw new Error(`REFUSED: accepted claim ${claim.claimId ?? '(missing)'} lacks signed canonical receipt provenance`);
  const accepted = claims.filter((claim) => claim.status === 'accepted');
  const collectionRoot = join(vault, 'collections', 'design-claims');
  if (existsSync(collectionRoot)) rmSync(collectionRoot, { recursive: true, force: true });
  if (!accepted.length) return { emitted: 0, collectionRoot };
  const batch = join(collectionRoot, nowStamp, 'extracted', 'claims_batches');
  const texts = join(batch, 'texts'); mkdirSync(texts, { recursive: true });
  const rows = [];
  for (const claim of accepted) {
    const textPath = join(texts, `${claim.claimId}.txt`); const body = renderClaimDoc(claim); writeFileSync(textPath, body, 'utf8');
    rows.push(['extracted', textPath, `${claim.claimId}.txt`, textPath, `${claim.claimId}: ${claim.principle.slice(0, 80).replaceAll('"', "'")}`, 'Swan design-brain (human-adjudicated claims; recall-tier)', String(body.length), '1', 'no']);
  }
  writeFileSync(join(batch, 'extraction-ledger.csv'), [HEADER, ...rows.map(csvRow)].join('\n') + '\n', 'utf8');
  return { emitted: accepted.length, collectionRoot };
}
function main() {
  const arg = (name) => { const index = process.argv.indexOf(`--${name}`); return index !== -1 ? process.argv[index + 1] : undefined; };
  const root = resolveDataRoot(arg('root')); const vault = resolve(String(arg('vault') ?? ''));
  if (!vault || !existsSync(join(vault, 'collections'))) { console.error('usage: emit-vault --root <root> --vault <brain-vault> [--build]'); return 2; }
  const result = emitCollection(loadClaims(join(root, 'claims.jsonl')), vault, { nowStamp: new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z' });
  console.log(`emitted ${result.emitted} accepted claim(s) -> ${result.collectionRoot}`);
  if (process.argv.includes('--build') && result.emitted) execFileSync('python3', [join(vault, 'tools', 'hermes2_brain_search.py'), 'build'], { stdio: 'inherit' });
  else if (result.emitted) console.log('run the vault build (or pass --build) to make the collection searchable.');
  return 0;
}
if (process.argv[1]?.endsWith('emit-vault.mjs')) process.exit(main());