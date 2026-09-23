/** Mega Blueprints native adapter contract. Synthetic prompts only; no models/network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = process.env.MAKEER_TEST_HOOK || fileURLToPath(new URL('./prompt-hook.mjs', import.meta.url));
function invoke(adapter, input) {
  const result = spawnSync(process.execPath, [script, adapter], {
    input: typeof input === 'string' ? input : JSON.stringify(input),
    encoding: 'utf8', windowsHide: true, timeout: 5000,
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return JSON.parse(result.stdout);
}

test('Codex prompt hook delivers the full activation and audit obligation', () => {
  const result = invoke('codex', { prompt: 'Can you add a saved-workout screen?' });
  assert.equal(result.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  const context = result.hookSpecificOutput.additionalContext;
  assert.match(context, /Mega Blueprints/);
  assert.match(context, /non-vibe-coding/);
  assert.match(context, /Did we make a blueprint that\?/);
  assert.match(context, /actual artifacts/);
});

test('Claude uses the documented additional-context output contract', () => {
  const result = invoke('claude', { prompt: 'Continue the next slice.' });
  assert.equal(result.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.match(result.hookSpecificOutput.additionalContext, /continu/);
});

test('unusual phrasing, audit requests, empty input and malformed input retain the reminder', () => {
  for (const input of [
    { prompt: 'I wish the trainer could compare these.' },
    { user_message: 'Did we make a blueprint that?' },
    { prompt: 'go' }, { prompt: 'Stop. Review only.' }, {}, '', '{broken',
  ]) {
    const result = invoke('codex', input);
    assert.match(result.hookSpecificOutput.additionalContext, /Mega Blueprints/);
  }
});

test('hook never echoes synthetic private text and preserves bounded scope', () => {
  const canary = 'SYNTHETIC_PRIVATE_CANARY_58ca82d5';
  const result = JSON.stringify(invoke('codex', { prompt: canary }));
  assert.ok(!result.includes(canary));
  assert.match(result, /plan-only/);
  assert.match(result, /conversation/);
  assert.match(result, /all.*together/i);
  assert.ok(result.length < 5000);
});
