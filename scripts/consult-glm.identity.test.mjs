#!/usr/bin/env node
/**
 * Policy regression: a direct GLM consult must distinguish the requested model
 * from the provider-reported model. Requested identity alone is tautological.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./consult-glm.mjs', import.meta.url), 'utf8');

assert.match(
  source,
  /typeof j\.model === 'string'[\s\S]*receipt\.servedModel = safeName\(j\.model\)/,
  'consult-glm must capture the model identity reported by the provider stream',
);
assert.match(source, /\*\*Requested:\*\*/, 'consult-glm report must label the requested model');
assert.match(source, /\*\*Served:\*\*/, 'consult-glm report must label the served model');
assert.match(source, /SUBSTITUTED/, 'consult-glm report must visibly flag a substituted model');

const finishedLedgerBlocks = [...source.matchAll(
  /appendGlmLedger\(guard\.ledgerPath,\s*\{([\s\S]*?)\}\);/g,
)].map((match) => match[1]);
assert.equal(finishedLedgerBlocks.length, 1, 'all transport outcomes share the same completion receipt/ledger path');
for (const block of finishedLedgerBlocks) {
  assert.match(block, /event:\s*'finished'/, 'every completion ledger record must be a finished event');
  assert.match(block, /\breviewRoundId\b/, 'every completion ledger record must preserve its review-round ID');
}

assert.match(source, /receipt\.status === 'complete' \? 0 : 2/);
assert.doesNotMatch(source, /await response\.text\(\)|console\.error\([^\n]*error\.message/);
console.log('consult-glm identity and round ledger policy: PASS; behavior covered by transport fixtures');
