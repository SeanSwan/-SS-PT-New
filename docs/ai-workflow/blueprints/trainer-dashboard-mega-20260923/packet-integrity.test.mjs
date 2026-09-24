import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectPacket } from './packet-integrity.mjs';

const packet = dirname(fileURLToPath(import.meta.url));
function mutated(file, change) {
  const temp = mkdtempSync(resolve(tmpdir(), 'trainer-packet-test-'));
  try {
    cpSync(packet, temp, { recursive: true });
    const path = resolve(temp, file);
    writeFileSync(path, change(readFileSync(path, 'utf8')));
    return inspectPacket(temp);
  } finally {
    if (!temp.startsWith(resolve(tmpdir()) + sep) || !temp.includes('trainer-packet-test-')) throw new Error('Unsafe test cleanup refused');
    rmSync(temp, { recursive: true, force: true });
  }
}
test('all current packet entry/companion documents and all 30 decisions pass', () => {
  const report = inspectPacket(packet);
  assert.deepEqual(report.errors, []);
  assert.equal(report.decisionCount, 30);
  assert.equal(report.boundDecisionCount, 30);
  assert.ok(report.documentCount >= 22);
});
test('removing D-027 from slice bindings fails even if ledger prose still mentions it', () => {
  const report = mutated('05-slices.md', text => text.replaceAll('D-027', ''));
  assert.ok(report.errors.includes('Unbound decision: D-027'));
});
test('unknown decision in a slice fails', () => {
  const report = mutated('05-slices.md', text => text.replace('D-027', 'D-099'));
  assert.ok(report.errors.includes('Unknown decision in slice: D-099'));
});
test('duplicated ledger ID fails', () => {
  const report = mutated('08-decision-ledger.md', text => text + '\n| D-027 | duplicate | ignored | not allowed |\n');
  assert.ok(report.errors.includes('Duplicate decision ledger ID'));
});
test('missing slice fails', () => {
  const report = mutated('05-slices.md', text => text.replace(/^\| S6 \|.*$/m, ''));
  assert.ok(report.errors.includes('Missing slice: S6'));
});
test('oversized mandatory companion fails', () => {
  const report = mutated('03-health-contracts.md', text => text + '\ncontent\n'.repeat(310));
  assert.ok(report.errors.some(error => error.startsWith('Line budget: 03-health-contracts.md')));
});
test('broken link and escaping companion fail', () => {
  const report = mutated('00-README.md', text => text + '\n[missing](missing.md)\n[escape](../other.md)');
  assert.ok(report.errors.some(error => error.startsWith('Broken document link:')));
  assert.ok(report.errors.some(error => error.startsWith('Escaping document link:')));
});
test('unterminated code fence fails', () => {
  const report = mutated('03-contracts.md', text => text + '\n```ts\n');
  assert.ok(report.errors.includes('Unclosed code fence: 03-contracts.md'));
});
// Added by the Claude hostile review, 2026-09-24: each control below was a
// mutation the original guard accepted as PASS.
test('unclosed tilde or indented fence fails', () => {
  assert.ok(mutated('03-contracts.md', text => text + '\n~~~\n').errors.includes('Unclosed code fence: 03-contracts.md'));
  assert.ok(mutated('03-contracts.md', text => text + '\n  ```ts\n').errors.includes('Unclosed code fence: 03-contracts.md'));
});
test('duplicate or out-of-range slice rows fail', () => {
  const duplicate = mutated('05-slices.md', text => text.replace(/^(\| S3 \|.*)$/m, '$1\n$1'));
  assert.ok(duplicate.errors.includes('Duplicate slice: S3'));
  const extra = mutated('05-slices.md', text => text.replace(/^(\| S9 \|.*)$/m, '$1\n| S10 | extra | R1 | D-001 |'));
  assert.ok(extra.errors.includes('Unknown slice: S10'));
});
test('absolute drive-letter and broken reference-style links fail', () => {
  const report = mutated('00-README.md', text => `${text}\n[x](Z:/HostileReviews/missing.md)\n\n[ref]: missing-companion.md\n`);
  assert.ok(report.errors.includes('Absolute document link: 00-README.md -> Z:/HostileReviews/missing.md'));
  assert.ok(report.errors.includes('Broken document link: 00-README.md -> missing-companion.md'));
});
test('unlinking a normative companion no longer exempts it', () => {
  const report = mutated('03-contracts.md', text => text.replaceAll('03-video-earnings-contracts.md', 'removed-link'));
  assert.ok(report.errors.includes('Normative document not linked from the packet: 03-video-earnings-contracts.md'));
});
test('manifest line counts must match the documents', () => {
  const report = mutated('04-build-order.md', text => `${text}\nextra line\n`);
  assert.ok(report.errors.some(error => error.startsWith('Manifest count drift: 04-build-order.md')));
});
test('manifest cannot list a normative document that does not ship', () => {
  const report = mutated('MANIFEST.md', text => text.replace(/^(\| 05-slices\.md .*)$/m, '$1\n| 99-ghost.md | 1 | 0 | Current normative packet/companion |'));
  assert.ok(report.errors.includes('Manifest lists missing normative document: 99-ghost.md'));
});
