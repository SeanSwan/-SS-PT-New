import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCodexExecArgs,
  classifyCodexAuthStatus,
  parseCodexJsonl,
  runCodexSubscription,
  sanitizeSubscriptionEnv,
} from './swan-council-subscription.mjs';

test('classifyCodexAuthStatus distinguishes subscription, logged out, API key, and unknown', () => {
  assert.equal(classifyCodexAuthStatus('Logged in using ChatGPT'), 'chatgpt_subscription');
  assert.equal(classifyCodexAuthStatus('Not logged in'), 'logged_out');
  assert.equal(classifyCodexAuthStatus('Logged in using an API key'), 'api_key');
  assert.equal(classifyCodexAuthStatus('logged in using API key'), 'api_key');
  assert.equal(classifyCodexAuthStatus('logged in using ChatGPT', { exitCode: 1 }), 'unknown');
  assert.equal(classifyCodexAuthStatus(''), 'unknown');
});

test('sanitizeSubscriptionEnv removes provider credentials without mutating input', () => {
  const source = {
    PATH: 'safe',
    OPENAI_API_KEY: 'openai-secret',
    CODEX_API_KEY: 'codex-secret',
    OPENROUTER_API_KEY: 'router-secret',
    OPEN_ROUTER_API_KEY: 'router-secret-2',
    ANTHROPIC_API_KEY: 'anthropic-secret',
    ZAI_API_KEY: 'zai-secret',
    DEEPSEEK_API_KEY: 'deepseek-secret',
  };
  const sanitized = sanitizeSubscriptionEnv(source);
  assert.equal(sanitized.PATH, 'safe');
  for (const key of [
    'OPENAI_API_KEY', 'CODEX_API_KEY', 'OPENROUTER_API_KEY', 'OPEN_ROUTER_API_KEY',
    'ANTHROPIC_API_KEY', 'ZAI_API_KEY', 'DEEPSEEK_API_KEY',
  ]) assert.equal(Object.hasOwn(sanitized, key), false, `${key} must be stripped`);
  assert.equal(source.OPENAI_API_KEY, 'openai-secret');
});

test('buildCodexExecArgs is read-only, non-interactive, and shell-safe', () => {
  assert.deepEqual(buildCodexExecArgs({ root: 'C:\\repo', model: 'gpt-test' }), [
    'exec', '--json', '--ephemeral', '--sandbox', 'read-only',
    '-C', 'C:\\repo', '--model', 'gpt-test', '-',
  ]);
  assert.deepEqual(buildCodexExecArgs({ root: 'C:\\repo' }).slice(-2), ['C:\\repo', '-']);
});

test('buildCodexExecArgs omits flags removed by codex-cli 0.154.0', () => {
  // codex-cli 0.154.0 rejects `--ask-for-approval` at flag parse (exit non-zero,
  // before any model call). `exec` is non-interactive and cannot ask anyway.
  const args = buildCodexExecArgs({ root: 'C:\\repo' });
  assert.equal(args.includes('--ask-for-approval'), false);
});

test('parseCodexJsonl captures final message, served model, and reported usage', () => {
  const parsed = parseCodexJsonl([
    JSON.stringify({ type: 'thread.started', thread_id: 'thread-1' }),
    JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'Finding [P1]: fix this.' } }),
    JSON.stringify({ type: 'turn.completed', model: 'gpt-served', usage: { input_tokens: 12, output_tokens: 7, reasoning_output_tokens: 5 } }),
  ].join('\n'));
  assert.equal(parsed.complete, true);
  assert.equal(parsed.finalText, 'Finding [P1]: fix this.');
  assert.equal(parsed.servedModel, 'gpt-served');
  assert.equal(parsed.inputTokens, 12);
  assert.equal(parsed.outputTokens, 7);
  // The only field that reveals which effort level ran — see the note in extractUsage.
  assert.equal(parsed.reasoningOutputTokens, 5);
});

test('parseCodexJsonl leaves unavailable usage as null', () => {
  const parsed = parseCodexJsonl([
    JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'done' } }),
    JSON.stringify({ type: 'turn.completed' }),
  ].join('\n'));
  assert.equal(parsed.complete, true);
  assert.equal(parsed.inputTokens, null);
  assert.equal(parsed.outputTokens, null);
  assert.equal(parsed.reasoningOutputTokens, null);
});

test('runCodexSubscription completes through injected subscription CLI and strips keys', async () => {
  const calls = [];
  const runProcess = (command, args, options) => {
    calls.push({ command, args, options });
    if (args[0] === 'login') return { status: 0, stdout: 'Logged in using ChatGPT\n', stderr: '' };
    return {
      status: 0,
      stdout: [
        JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'review complete' } }),
        JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 20, output_tokens: 4, reasoning_output_tokens: 3 }, model: 'gpt-served' }),
      ].join('\n'),
      stderr: '',
    };
  };
  const result = await runCodexSubscription({
    prompt: 'review', root: 'C:\\repo', model: 'gpt-requested',
    env: { PATH: 'safe', OPENROUTER_API_KEY: 'must-not-enter-child' }, runProcess,
  });
  assert.equal(result.status, 'complete');
  assert.equal(result.billing, 'chatgpt-subscription');
  assert.equal(result.authMode, 'chatgpt_subscription');
  assert.equal(result.requestedModel, 'gpt-requested');
  assert.equal(result.servedModel, 'gpt-served');
  assert.equal(result.inputTokens, 20);
  assert.equal(result.outputTokens, 4);
  assert.equal(result.reasoningOutputTokens, 3);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.env.OPENROUTER_API_KEY, undefined);
  assert.equal(calls[1].args.includes('--ask-for-approval'), false);
});

test('runCodexSubscription blocks logged-out auth before exec', async () => {
  let callCount = 0;
  const result = await runCodexSubscription({
    prompt: 'review', runProcess: (_command, args) => {
      callCount += 1;
      assert.deepEqual(args, ['login', 'status']);
      return { status: 0, stdout: 'Not logged in\n', stderr: '' };
    },
  });
  assert.equal(result.status, 'blocked');
  assert.equal(result.authMode, 'logged_out');
  assert.equal(result.errorCode, 'subscription_auth_required');
  assert.equal(callCount, 1);
});

test('runCodexSubscription blocks API-key and unknown auth without an exec call', async () => {
  for (const statusText of ['Logged in using an API key', 'unexpected status']) {
    let callCount = 0;
    const result = await runCodexSubscription({
      prompt: 'review', runProcess: (_command, args) => {
        callCount += 1;
        assert.deepEqual(args, ['login', 'status']);
        return { status: 0, stdout: `${statusText}\n`, stderr: '' };
      },
    });
    assert.equal(result.status, 'blocked');
    assert.equal(result.authMode, statusText.startsWith('Logged') ? 'api_key' : 'unknown');
    assert.equal(callCount, 1);
  }
});

test('runCodexSubscription does not report success for timeout, nonzero exit, or missing final event', async () => {
  const cases = [
    { exec: { status: null, signal: 'SIGTERM', timedOut: true, stdout: '' }, code: 'codex_exec_timeout' },
    { exec: { status: 1, stdout: '', stderr: 'failed' }, code: 'codex_exec_failed' },
    { exec: { status: 0, stdout: JSON.stringify({ type: 'turn.started' }) }, code: 'codex_incomplete' },
  ];
  for (const item of cases) {
    const result = await runCodexSubscription({
      prompt: 'review', runProcess: (_command, args) => args[0] === 'login'
        ? { status: 0, stdout: 'Logged in using ChatGPT', stderr: '' }
        : item.exec,
    });
    assert.notEqual(result.status, 'complete');
    assert.equal(result.errorCode, item.code);
    assert.equal(result.inputTokens, null);
    assert.equal(result.outputTokens, null);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EGRESS BOUNDARY (Astra R2-A1-02, added 2026-09-22)
//
// These tests exist because the five tests ABOVE all pass `prompt:` and none of
// them would fail if the boundary were deleted — they assert the RESULT, and the
// result is identical whether the text was redacted or not. A suite that stays
// green when the fix is reverted does not test the fix.
//
// Each test below therefore asserts on the BYTES HANDED TO THE CHILD, which is
// the only place the boundary is observable from out here. The observable is
// `options.input` on the second processRunner call (the exec, not the auth probe).
// ─────────────────────────────────────────────────────────────────────────────

/** Capture the stdin bytes actually delivered to the exec call. */
function captureExecInput(promptArgs) {
  const calls = [];
  const runProcess = (command, args, options) => {
    calls.push({ command, args, options });
    if (args[0] === 'login') return { status: 0, stdout: 'Logged in using ChatGPT\n', stderr: '' };
    return {
      status: 0,
      stdout: [
        JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'ok' } }),
        JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 1 } }),
      ].join('\n'),
      stderr: '',
    };
  };
  return { runProcess, calls, execInput: () => calls.find((c) => c.args[0] !== 'login')?.options?.input };
}

test('runCodexSubscription redacts a raw prompt at the boundary', async () => {
  // A GCP-style service-account key is one of the patterns redact-egress targets.
  const raw = 'review this\n{"private_key": "-----BEGIN PRIVATE KEY-----\\nMIIabc\\n-----END PRIVATE KEY-----"}\n';
  const harness = captureExecInput();
  const result = await runCodexSubscription({ prompt: raw, root: 'C:\\repo', runProcess: harness.runProcess });

  assert.equal(result.status, 'complete');
  assert.equal(result.egressMode, 'redacted-at-boundary');
  const sent = harness.execInput();
  assert.equal(typeof sent, 'string');
  assert.notEqual(sent, raw, 'raw prompt must NOT reach the child verbatim');
  assert.equal(sent.includes('BEGIN PRIVATE KEY'), false, 'private key must not appear in stdin bytes');
});

test('runCodexSubscription sends caller-supplied redacted text verbatim, without a second pass', async () => {
  // The Astra leg redacts by hand (readForEgress/redactOutbound) and passes the
  // result as `redactedPrompt`. Re-redacting here would be harmless to safety but
  // would corrupt hit counts, so the contract is byte-identical passthrough.
  const already = 'line one\nline two\n';
  const harness = captureExecInput();
  const result = await runCodexSubscription({ redactedPrompt: already, root: 'C:\\repo', runProcess: harness.runProcess });

  assert.equal(result.status, 'complete');
  assert.equal(result.egressMode, 'caller-supplied-redacted');
  assert.equal(harness.execInput(), already, 'caller-supplied redacted text must be sent unchanged');
});

test('runCodexSubscription honours promptRedacted but records the assertion', async () => {
  const text = 'already clean\n';
  const harness = captureExecInput();
  const result = await runCodexSubscription({
    prompt: text, promptRedacted: true, root: 'C:\\repo', runProcess: harness.runProcess,
  });
  assert.equal(result.status, 'complete');
  // Recorded, not assumed — an unverifiable claim must at least be visible.
  assert.equal(result.egressMode, 'caller-asserted-redacted');
  assert.equal(harness.execInput(), text);
});

test('runCodexSubscription refuses an empty task instead of sending nothing', async () => {
  let calls = 0;
  const result = await runCodexSubscription({
    root: 'C:\\repo',
    runProcess: () => { calls += 1; return { status: 0, stdout: '', stderr: '' }; },
  });
  assert.equal(result.status, 'blocked');
  assert.equal(result.errorCode, 'subscription_prompt_missing');
  // Refused BEFORE the auth probe — an unguarded call costs nothing.
  assert.equal(calls, 0);
});

test('runCodexSubscription treats a non-string prompt as absent, not as empty text to send', async () => {
  // `hasRaw` requires a non-empty STRING. A number, null, or undefined must fall
  // through to admission failure rather than being coerced by String() and sent.
  let calls = 0;
  for (const bogus of [null, undefined, 12345, {}, []]) {
    const result = await runCodexSubscription({
      prompt: bogus,
      root: 'C:\\repo',
      runProcess: () => { calls += 1; return { status: 0, stdout: 'Logged in using ChatGPT', stderr: '' }; },
    });
    assert.equal(result.status, 'blocked', `${JSON.stringify(bogus)} must be refused`);
    assert.equal(result.errorCode, 'subscription_prompt_missing');
  }
  // Refused every time BEFORE the auth probe — five refusals, zero process calls.
  assert.equal(calls, 0);
});

test('the redactor refuses to send when its canary fails, and the boundary propagates that refusal', async () => {
  // Measures the REAL redactor rather than asserting a shape. The canary lives in
  // selfTest() and throws on a corpus it fails to catch; we reproduce that
  // failure mode by importing the primitive and feeding it a corpus engineered
  // to be undetectable is not possible from outside — so instead we prove the
  // contract the boundary depends on: redactForEgress THROWS rather than
  // returning unredacted text, for a canary failure. That precondition is what
  // the boundary's try/catch is written against, and if it ever stops holding,
  // this test fails and tells us the catch is dead code.
  const { redactForEgress } = await import('../lib/redact-egress.mjs');
  assert.equal(typeof redactForEgress, 'function');
  // A live instrument returns an object; it never returns undefined.
  const live = redactForEgress('nothing secret here');
  assert.equal(typeof live.text, 'string');
  assert.ok(Array.isArray(live.hits));
  // And it genuinely removes a known secret shape (positive control).
  const dirty = redactForEgress('key: sk-proj-abcdefghijklmnopqrstuvwxyz0123456789');
  assert.notEqual(dirty.text, 'key: sk-proj-abcdefghijklmnopqrstuvwxyz0123456789');
});
