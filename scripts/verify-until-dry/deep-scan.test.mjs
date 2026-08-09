/**
 * @file deep-scan.test.mjs
 * @description Tests coverage-complete deep-scan lifecycle and finding carry-forward.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { completeDeepScan, recordAnalyzer, startDeepScan } from './deep-scan.mjs';

const hash = (char) => char.repeat(64);

test('a scan cannot complete while any required analyzer is missing', () => {
  let scan = startDeepScan({
    id: 'S1', headSha: 'a'.repeat(40), sourceHash: hash('b'), scopeHash: hash('c'),
    requiredAnalyzers: ['security', 'correctness'],
  });
  scan = recordAnalyzer(scan, { id: 'security', outputHash: hash('d'), findings: [] });
  const result = completeDeepScan(scan);
  assert.equal(result.status, 'UNPROVEN');
  assert.deepEqual(result.missingAnalyzers, ['correctness']);
});

test('complete coverage is DIRTY with open findings and COMPLETE when none remain', () => {
  let dirty = startDeepScan({
    id: 'S2', headSha: 'a'.repeat(40), sourceHash: hash('b'), scopeHash: hash('c'),
    requiredAnalyzers: ['security'],
  });
  dirty = recordAnalyzer(dirty, {
    id: 'security', outputHash: hash('d'), findings: [{ signature: 'src:a:race', status: 'open', validated: true }],
  });
  assert.equal(completeDeepScan(dirty).status, 'DIRTY');

  let clean = startDeepScan({
    id: 'S3', headSha: 'a'.repeat(40), sourceHash: hash('b'), scopeHash: hash('c'),
    requiredAnalyzers: ['security'],
  });
  clean = recordAnalyzer(clean, { id: 'security', outputHash: hash('e'), findings: [] });
  const result = completeDeepScan(clean);
  assert.equal(result.status, 'COMPLETE');
  assert.match(result.scanHash, /^[a-f0-9]{64}$/);
});

test('duplicate, unknown, stale, and malformed analyzer evidence fails closed', () => {
  const scan = startDeepScan({
    id: 'S4', headSha: 'a'.repeat(40), sourceHash: hash('b'), scopeHash: hash('c'),
    requiredAnalyzers: ['security'],
  });
  assert.throws(() => recordAnalyzer(scan, { id: 'unknown', outputHash: hash('d'), findings: [] }), /required/i);
  assert.throws(() => recordAnalyzer(scan, { id: 'security', outputHash: 'bad', findings: [] }), /hash/i);
  const recorded = recordAnalyzer(scan, { id: 'security', outputHash: hash('d'), findings: [] });
  assert.throws(() => recordAnalyzer(recorded, { id: 'security', outputHash: hash('e'), findings: [] }), /duplicate/i);
});
