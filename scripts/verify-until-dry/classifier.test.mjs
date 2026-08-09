#!/usr/bin/env node
/**
 * FILE: scripts/verify-until-dry/classifier.test.mjs
 * PURPOSE: Prevent agent-controlled risk downgrades and under-triggered Kimi review.
 * RUN: node --test scripts/verify-until-dry/classifier.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyRisk } from './classifier.mjs';

test('assigns deterministic path floors from docs through high consequence', () => {
  assert.equal(classifyRisk({ files: ['docs/guide.md'] }).tier, 0);
  assert.equal(classifyRisk({ files: ['scripts/widget.test.mjs'] }).tier, 1);
  assert.equal(classifyRisk({ files: ['frontend/src/widget.tsx'] }).tier, 2);
  assert.equal(classifyRisk({ files: ['backend/routes/authRoutes.mjs'] }).tier, 3);
  assert.equal(classifyRisk({ files: ['backend/migrations/2026-add.cjs'] }).tier, 3);
  assert.equal(classifyRisk({ files: ['.github/workflows/release.yml'] }).tier, 3);
  assert.equal(classifyRisk({ files: ['scripts/verify-until-dry/verdict.mjs'] }).tier, 3);
});

test('an agent can raise deterministic risk but never lower it', () => {
  const downgrade = classifyRisk({
    files: ['backend/routes/authRoutes.mjs'],
    agentTier: 1,
  });
  assert.equal(downgrade.tier, 3);
  assert.ok(downgrade.matchedRules.some((rule) => rule.includes('agent-downgrade-rejected')));

  const escalation = classifyRisk({ files: ['docs/guide.md'], agentTier: 2 });
  assert.equal(escalation.tier, 2);
  assert.ok(escalation.matchedRules.includes('agent-escalation:tier-2'));
});

test('diff content escalates destructive or test-weakening changes', () => {
  const ddl = classifyRisk({ files: ['backend/service.mjs'], diffText: '+ DROP TABLE users;' });
  assert.equal(ddl.tier, 3);

  const weakened = classifyRisk({
    files: ['backend/service.test.mjs'],
    diffText: '-test("rejects unknown user", async () => {\n+test.skip("rejects unknown user", async () => {',
  });
  assert.equal(weakened.tier, 3);
  assert.ok(weakened.matchedRules.some((rule) => rule.includes('test-weakening')));
});

test('Kimi is required for Tier 3, oscillation, or high complexity', () => {
  assert.equal(classifyRisk({ files: ['backend/migrations/a.cjs'] }).kimiRequired, true);
  assert.equal(classifyRisk({ files: ['docs/a.md'], oscillation: true }).kimiRequired, true);

  const broad = classifyRisk({
    files: ['frontend/src/a.tsx', 'backend/routes/a.mjs', 'backend/models/a.mjs'],
    changedLines: 800,
  });
  assert.equal(broad.kimiRequired, true);
  assert.ok(broad.complexityScore >= 7);
});

test('low-risk focused work does not manufacture a paid review requirement', () => {
  const result = classifyRisk({ files: ['docs/guide.md'], changedLines: 12 });
  assert.equal(result.tier, 0);
  assert.equal(result.kimiRequired, false);
  assert.deepEqual(result.kimiReasons, []);
});
