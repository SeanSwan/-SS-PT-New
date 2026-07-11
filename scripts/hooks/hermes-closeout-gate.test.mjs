/**
 * Contract test for the automatic Hermes significant-closeout gate.
 * It protects the Stop hook's no-loop, significance, two-lane, and privacy rules.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const settings = JSON.parse(readFileSync('.claude/settings.json', 'utf8'));
const stopHooks = settings.hooks?.Stop?.flatMap((group) => group.hooks ?? []) ?? [];

test('registers one prompt-based Hermes closeout Stop hook', () => {
  const promptHooks = stopHooks.filter((hook) => hook.type === 'prompt');
  assert.equal(promptHooks.length, 1);
  assert.equal(promptHooks[0].timeout, 30);
});

test('keeps the closeout gate bounded, selective, and privacy-aware', () => {
  const prompt = stopHooks.find((hook) => hook.type === 'prompt')?.prompt ?? '';

  assert.match(prompt, /stop_hook_active is true/);
  assert.match(prompt, /trivial\/conversational\/read-only status/);
  assert.match(prompt, /hermes-inbox/);
  assert.match(prompt, /hermes-learning-packet/);
  assert.match(prompt, /verified Fable-tier synthesis/);
  assert.match(prompt, /secret\/privacy scan/);
  assert.match(prompt, /Do not create a durable learning packet from sub-Fable output/);
});
