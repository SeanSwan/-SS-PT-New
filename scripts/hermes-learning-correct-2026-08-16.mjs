#!/usr/bin/env node
/**
 * One-shot corrective pass over the 2026-08-16 migration.
 *
 * WHY
 *   That migration wrote two values its own stated rule ("derive, never invent") forbids, both
 *   found by GLM-5.3's hostile review:
 *     H2 — `decision:` was copied from the dead dialects' `topic:`. `topic` is a SUBJECT; `decision`
 *          is THE RULE THE PACKET ESTABLISHES. The read path then prints it as a top-tier `rule:`,
 *          manufacturing authority for a phrase nobody asserted.
 *     H3 — `privacy:` asserted "no PII" on the strength of 8 key-shape regexes that cannot detect
 *          PII at all.
 *   Leaving those in a permanent corpus is the exact "invented authority" failure this whole
 *   workstream exists to remove, so they are corrected in place rather than left to rot.
 *
 * SCOPE
 *   Only files carrying the `migrated: 2026-08-16` stamp — i.e. only packets this migration wrote.
 *   The stamp is the audit trail that makes this pass possible; it is also updated to record the
 *   correction, so no reader is left believing the original derivation still stands.
 *
 * SAFETY
 *   Validates the produced string BEFORE writing, and re-reads from disk after. Never touches
 *   `originating_model`. Never touches a packet it did not itself stamp.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePacket } from './hermes-learning-validate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS = join(ROOT, 'docs', 'ai-workflow', 'hermes-learning-packets');
const schema = JSON.parse(readFileSync(join(CORPUS, '_schema.json'), 'utf8'));

const OLD_PRIVACY = 'IDs/roles only; no PII, no secrets, no absolute paths';
const NEW_PRIVACY = 'secret-scan clean (key/token/DB-URL shapes only); PII NOT independently verified';

const apply = process.argv.includes('--apply');
let changed = 0, refused = 0, skipped = 0;

for (const name of readdirSync(CORPUS).filter((f) => f.endsWith('.md') && !f.startsWith('_')).sort()) {
  const path = join(CORPUS, name);
  const src = readFileSync(path, 'utf8');
  if (!src.includes('migrated: 2026-08-16')) { skipped += 1; continue; }

  const crlf = src.includes('\r\n');
  let norm = src.replace(/\r\n/g, '\n');
  const end = norm.indexOf('\n---', 3);
  let block = norm.slice(4, end);
  const rest = norm.slice(end);
  const before = block;

  const fixes = [];

  // H2 — only where the migration itself recorded that it sourced decision from topic.
  if (/^migrated:.*decision<-topic/m.test(block)) {
    block = block.replace(/^decision:.*$/m, 'decision: unknown');
    block = block.replace(/decision<-topic \(re-keyed, not re-authored\)/,
      'decision=unknown (CORRECTED 2026-08-16: topic left in place — a subject is not a rule)');
    fixes.push('H2 decision->unknown');
  }

  // H3 — the attestation the scan cannot support.
  if (block.includes(OLD_PRIVACY)) {
    block = block.replace(OLD_PRIVACY, NEW_PRIVACY);
    block = block.replace('privacy<-scanned clean by validator patterns',
      'privacy<-key-shape scan only (PII unverified) [CORRECTED 2026-08-16]');
    fixes.push('H3 privacy attestation narrowed');
  }

  if (block === before) { skipped += 1; continue; }

  let out = `---\n${block}${rest}`;
  if (crlf) out = out.replace(/\n/g, '\r\n');

  const pre = validatePacket(name, out, schema);
  if (pre.errors.length) {
    refused += 1;
    console.log(`  REFUSED ${name}`);
    pre.errors.forEach((e) => console.log(`      ERROR ${e}`));
    continue;
  }

  console.log(`  ${name}  [${fixes.join(', ')}]`);
  if (!apply) { changed += 1; continue; }

  writeFileSync(path, out, 'utf8');
  const after = validatePacket(name, readFileSync(path, 'utf8'), schema);
  if (after.errors.length) { refused += 1; console.log(`      DISK COPY INVALID`); }
  else changed += 1;
}

console.log(`\n  ${apply ? 'corrected' : 'would correct'}: ${changed}   untouched: ${skipped}   refused: ${refused}`);
if (!apply) console.log('  re-run with --apply to write');
process.exit(refused ? 1 : 0);
