#!/usr/bin/env node
/**
 * FILE: scripts/verify-until-dry/config.test.mjs
 * PURPOSE: Fail closed when provider, budget, or verdict policy configuration drifts.
 * RUN: node --test scripts/verify-until-dry/config.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import config from '../../config/verify-until-dry.config.mjs';
import { validateConfig } from './config.mjs';

test('the committed configuration is valid and cost bounded', () => {
  const result = validateConfig(config);
  assert.deepEqual(result, { valid: true, errors: [] });
  assert.equal(config.kimi.model, 'moonshotai/kimi-k3');
  assert.equal(config.kimi.maxTokens, 60_000);
  assert.ok(config.kimi.maxUsdPerCall <= 1);
  assert.ok(config.kimi.maxCallsPerRun <= 2);
});

test('rejects wrong model, weak output ceiling, and unbounded spend', () => {
  const wrong = structuredClone(config);
  wrong.kimi.model = 'openai/gpt-3';
  wrong.kimi.maxTokens = 16_000;
  wrong.kimi.maxUsdPerCall = 99;
  const result = validateConfig(wrong);
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /moonshotai\/kimi-k3/);
  assert.match(result.errors.join('\n'), /60000/);
  assert.match(result.errors.join('\n'), /maxUsdPerCall/);
});

test('rejects unknown approval modes and missing risk policy', () => {
  const wrong = structuredClone(config);
  wrong.kimi.approvalMode = 'trust-the-agent';
  delete wrong.risk;
  const result = validateConfig(wrong);
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /approvalMode/);
  assert.match(result.errors.join('\n'), /risk/);
});
