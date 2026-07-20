/**
 * emit-vault.mjs — ACCEPTED claims → the brain-vault as a `design-claims` collection.
 * ===================================================================================
 * Pass D's "retrieval is free" consequence: instead of new MCP tooling, accepted claims are
 * emitted in the vault's NATIVE ledger format (same trick as the repo-corpus ingester) and become
 * searchable through the existing `brain_search(collection="design-claims")` after a build.
 *
 * Trust: only status=accepted claims are emitted — proposed/trial/rejected never reach retrieval.
 * Derived mirror: each emit deletes and rewrites the collection; `claims.jsonl` is the asset.
 *
 * USAGE (WSL)
 *   node src/emit-vault.mjs --root <data-root> --vault ~/hermes2/brain-vault [--build]
 *
 * @module design-brain/emit-vault
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { resolveDataRoot } from './paths.mjs';
import { readJsonl } from './synthesize.mjs';

/** Render one accepted claim as a searchable text document. */
export function renderClaimDoc(c) {
  return [
    `CLAIM ${c.claimId} [${c.domainId}] — confidence ${c.confidence.level}`,
    '',
    `PRINCIPLE: ${c.principle.trim()}`,
    `PHASE: ${c.workflowPhase} · ROLE: ${c.userRole}`,
    `PRODUCTS: ${c.products.join(', ')}`,
    `RECEIPTS: ${c.receiptRefs.join(', ')}`,
    c.exceptions?.length ? `EXCEPTIONS: ${c.exceptions.join('; ')}` : '',
    c.contradictions?.length ? `CONTRADICTS: ${c.contradictions.join(', ')}` : '',
    c.swanTranslation?.cPatterns?.length ? `SWAN C-PATTERNS: ${c.swanTranslation.cPatterns.join(', ')}` : '',
    c.swanTranslation?.tokens ? `SWAN TOKENS: ${c.swanTranslation.tokens}` : '',
    c.swanTranslation?.qaRisks ? `QA RISKS: ${c.swanTranslation.qaRisks}` : '',
    '',
    `adjudicated by ${c.humanDecision?.actor ?? 'unknown'} at ${c.humanDecision?.utc ?? '?'} (${c.humanDecision?.batchId ?? '?'})`,
    'TRUST: recall-tier evidence with human acceptance. Not canon. Verify against design.md before doctrine use.',
  ].filter(Boolean).join('\n');
}

/** Pure core: write accepted claims into the vault's native collection format. */
export function emitCollection(claims, vault, { nowStamp }) {
  const accepted = claims.filter((c) => c.status === 'accepted');
  const collRoot = join(vault, 'collections', 'design-claims');
  if (existsSync(collRoot)) rmSync(collRoot, { recursive: true, force: true });
  if (!accepted.length) return { emitted: 0, collectionRoot: collRoot };

  const batch = join(collRoot, nowStamp, 'extracted', 'claims_batches');
  const texts = join(batch, 'texts');
  mkdirSync(texts, { recursive: true });
  const rows = [];
  for (const c of accepted) {
    const txt = join(texts, `${c.claimId}.txt`);
    const body = renderClaimDoc(c);
    writeFileSync(txt, body, 'utf8');
    rows.push([
      'extracted', txt, `${c.claimId}.txt`, txt,
      `${c.claimId}: ${c.principle.slice(0, 80).replaceAll('"', "'")}`,
      'Swan design-brain (human-adjudicated claims; recall-tier)',
      String(body.length), '1', 'no',
    ]);
  }
  const header = 'status,output_text_path,source_relative_path,source_absolute_path,title,author,char_count,page_count,truncated';
  const csv = [header, ...rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','))].join('\n') + '\n';
  writeFileSync(join(batch, 'extraction-ledger.csv'), csv, 'utf8');
  return { emitted: accepted.length, collectionRoot: collRoot };
}

function main() {
  const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 ? process.argv[i + 1] : undefined; };
  const root = resolveDataRoot(arg('root'));
  const vault = resolve(String(arg('vault') ?? ''));
  if (!vault || !existsSync(join(vault, 'collections'))) {
    console.error('usage: emit-vault --root <root> --vault <brain-vault> [--build] (vault must have collections/)');
    return 2;
  }
  const claims = readJsonl(join(root, 'claims.jsonl'));
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const { emitted, collectionRoot } = emitCollection(claims, vault, { nowStamp: stamp });
  console.log(`emitted ${emitted} accepted claim(s) -> ${collectionRoot}`);

  if (process.argv.includes('--build') && emitted) {
    const tool = join(vault, 'tools', 'hermes2_brain_search.py');
    console.log('rebuilding vault index…');
    execFileSync('python3', [tool, 'build'], { stdio: 'inherit' });
  } else if (emitted) {
    console.log('run the vault build (or pass --build) to make claims searchable.');
  }
  return 0;
}

if (process.argv[1]?.endsWith('emit-vault.mjs')) process.exit(main());
