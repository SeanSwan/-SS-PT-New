/**
 * Finding, adjudication, and Opus-verification schema tests for the Kimi Panel.
 * Run: node --test scripts/kimi-panel/tests/findings.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseReviewerFindings, dedupeFindings, parseAdjudication, finalizeWithOpus,
} from '../findings.mjs';

const finding = (over = {}) => ({
  path: 'src/scene.ts', startLine: 12, endLine: 18,
  claim: 'The scene family aliases the same renderer.', severity: 'high',
  category: 'visual-variety', evidence: 'Both tokens select gl_pelagos.', ...over,
});

test('reviewer output is strict JSON and origin provenance is imposed by the runtime', () => {
  const parsed = parseReviewerFindings(JSON.stringify({ findings: [finding()] }), {
    originModel: 'lab/model', selfReview: false,
  });
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].originModel, 'lab/model');
  assert.equal(parsed[0].selfReview, false);
  assert.match(parsed[0].findingId, /^[a-f0-9]{16}$/);
  assert.throws(() => parseReviewerFindings('```json\n{}\n```', { originModel: 'm' }), /strict JSON/i);
});

test('dedup uses file, line range, and normalized claim while preserving every origin', () => {
  const a = parseReviewerFindings(JSON.stringify({ findings: [finding()] }), { originModel: 'a' });
  const b = parseReviewerFindings(JSON.stringify({ findings: [finding({ claim: '  the SCENE family aliases the same renderer.  ' })] }), { originModel: 'b' });
  const [merged] = dedupeFindings([...a, ...b]);
  assert.equal(merged.origins.length, 2);
  assert.deepEqual(merged.origins.map((origin) => origin.model), ['a', 'b']);
});

test('Opus first-pass findings retain the SELF_REVIEW flag through dedup', () => {
  const opus = parseReviewerFindings(JSON.stringify({ findings: [finding()] }), {
    originModel: 'anthropic/claude-opus-5', selfReview: true,
  });
  const [merged] = dedupeFindings(opus);
  assert.equal(merged.origins[0].selfReview, true);
});

test('Kimi must adjudicate every finding exactly once with bounded rulings', () => {
  const findings = dedupeFindings(parseReviewerFindings(
    JSON.stringify({ findings: [finding(), finding({ startLine: 30, endLine: 31, claim: 'The fallback is blank.' })] }),
    { originModel: 'a' },
  ));
  const one = findings[0].findingId;
  assert.throws(() => parseAdjudication(JSON.stringify({ overall: 'REVISE', verdicts: [
    { findingId: one, ruling: 'REAL', rationale: 'Confirmed.' },
  ] }), findings), /every finding/i);
  assert.throws(() => parseAdjudication(JSON.stringify({ overall: 'REVISE', verdicts: findings.map((item) => ({
    findingId: item.findingId, ruling: 'MAYBE', rationale: 'Unknown.',
  })) }), findings), /ruling/i);
});

test('Opus verification must re-check every Kimi dismissal before a clean verdict exists', () => {
  const findings = dedupeFindings(parseReviewerFindings(JSON.stringify({ findings: [finding()] }), { originModel: 'a' }));
  const id = findings[0].findingId;
  const run = { findings, adjudication: { overall: 'CLEAN', verdicts: [
    { findingId: id, ruling: 'NOT_REAL', rationale: 'Not supported.' },
  ] } };
  assert.throws(() => finalizeWithOpus(run, { dismissals: [] }), /every dismissal/i);
  const final = finalizeWithOpus(run, { dismissals: [
    { findingId: id, verdict: 'UPHOLD_DISMISSAL', rationale: 'Checked against source.' },
  ] });
  assert.equal(final.verdict, 'CLEAN');
});

test('an Opus reopen cannot be reported as clean', () => {
  const findings = dedupeFindings(parseReviewerFindings(JSON.stringify({ findings: [finding()] }), { originModel: 'a' }));
  const id = findings[0].findingId;
  const final = finalizeWithOpus({ findings, adjudication: { overall: 'CLEAN', verdicts: [
    { findingId: id, ruling: 'NOT_REAL', rationale: 'Dismissed.' },
  ] } }, { dismissals: [{ findingId: id, verdict: 'REOPEN', rationale: 'Source disproves dismissal.' }] });
  assert.equal(final.verdict, 'REVISE');
});
