import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assessOauthHealth,
  buildClaudeExecArgs,
  classifyClaudeAuthStatus,
  parseClaudeStreamJsonl,
  runClaudeSubscription,
} from './swan-claude-subscription.mjs';

const subscriptionStatus = JSON.stringify({ loggedIn: true, authMethod: 'claude.ai', apiProvider: 'firstParty', subscriptionType: 'max' });

test('classifyClaudeAuthStatus accepts first-party subscription only', () => {
  assert.equal(classifyClaudeAuthStatus(subscriptionStatus), 'claude_subscription');
  assert.equal(classifyClaudeAuthStatus(JSON.stringify({ loggedIn: false })), 'logged_out');
  assert.equal(classifyClaudeAuthStatus(JSON.stringify({ loggedIn: true, authMethod: 'apiKey', apiProvider: 'anthropic' })), 'other_auth');
  assert.equal(classifyClaudeAuthStatus('not json'), 'unknown');
});

test('buildClaudeExecArgs disables tools, persistence, and custom MCP', () => {
  assert.deepEqual(buildClaudeExecArgs({ root: 'C:\\repo', model: 'sonnet-test' }), [
    '--print', '--output-format', 'stream-json', '--no-session-persistence',
    '--permission-mode', 'plan', '--tools', '', '--strict-mcp-config',
    '--safe-mode', '--add-dir', 'C:\\repo', '--model', 'sonnet-test',
  ]);
});

test('parseClaudeStreamJsonl captures result and usage while preserving nulls', () => {
  const parsed = parseClaudeStreamJsonl([
    JSON.stringify({ type: 'assistant', message: { model: 'claude-served', content: [{ type: 'text', text: 'partial ' }] } }),
    JSON.stringify({ type: 'result', subtype: 'success', result: 'final review', usage: { input_tokens: 15, output_tokens: 6 }, model: 'claude-served' }),
  ].join('\n'));
  assert.equal(parsed.complete, true);
  assert.equal(parsed.finalText, 'final review');
  assert.equal(parsed.servedModel, 'claude-served');
  assert.equal(parsed.inputTokens, 15);
  assert.equal(parsed.outputTokens, 6);
  const noUsage = parseClaudeStreamJsonl(JSON.stringify({ type: 'result', result: 'done' }));
  assert.equal(noUsage.inputTokens, null);
  assert.equal(noUsage.outputTokens, null);
});

test('runClaudeSubscription completes through injected first-party subscription CLI', async () => {
  const calls = [];
  const result = await runClaudeSubscription({
    prompt: 'review', root: 'C:\\repo', model: 'sonnet-test',
    env: { PATH: 'safe', ANTHROPIC_API_KEY: 'must-not-enter-child' },
    runProcess: (command, args, options) => {
      calls.push({ command, args, options });
      if (args[0] === 'auth') return { status: 0, stdout: subscriptionStatus, stderr: '' };
      return { status: 0, stdout: JSON.stringify({ type: 'result', result: 'review complete', usage: { input_tokens: 3, output_tokens: 2 }, model: 'claude-served' }), stderr: '' };
    },
  });
  assert.equal(result.status, 'complete');
  assert.equal(result.billing, 'claude-subscription');
  assert.equal(result.authMode, 'claude_subscription');
  assert.equal(result.servedModel, 'claude-served');
  assert.equal(result.inputTokens, 3);
  assert.equal(result.outputTokens, 2);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.env.ANTHROPIC_API_KEY, undefined);
});

test('runClaudeSubscription blocks logged-out/API auth before execution', async () => {
  for (const stdout of [JSON.stringify({ loggedIn: false }), JSON.stringify({ loggedIn: true, authMethod: 'apiKey' })]) {
    let count = 0;
    const result = await runClaudeSubscription({
      prompt: 'review', runProcess: (_command, args) => {
        count += 1;
        assert.deepEqual(args, ['auth', 'status']);
        return { status: 0, stdout, stderr: '' };
      },
    });
    assert.equal(result.status, 'blocked');
    assert.equal(count, 1);
  }
});

// ---------------------------------------------------------------------------
// Measured 2026-09-19, after the CLI actually logged itself out.
// ---------------------------------------------------------------------------

test('a logged-out CLI exits 1 with a valid body — and the body wins', () => {
  // The real observed stdout, verbatim, with the real exit code 1. The previous
  // `exitCode !== 0 -> unknown` guard discarded this and reported "we don't know" for the
  // single most actionable state there is. A parseable body outranks a process status.
  const loggedOut = JSON.stringify({
    loggedIn: false, authMethod: 'none', apiProvider: 'firstParty',
    analyticsDisabled: false, projectsDirectory: 'C:\\Users\\x\\.claude\\projects',
  });
  assert.equal(classifyClaudeAuthStatus(loggedOut, { exitCode: 1 }), 'logged_out');
});

test('a non-zero exit with an UNPARSEABLE body is still unknown, not logged_out', () => {
  // The fix must not turn every failure into a confident diagnosis.
  assert.equal(classifyClaudeAuthStatus('command not found', { exitCode: 127 }), 'unknown');
  assert.equal(classifyClaudeAuthStatus('', { exitCode: 1 }), 'unknown');
});

test('a logged-out run is BLOCKED with the actionable code, not a generic auth failure', async () => {
  const result = await runClaudeSubscription({
    prompt: 'review',
    runProcess: (_c, args) => (args[0] === 'auth'
      ? { status: 1, stdout: JSON.stringify({ loggedIn: false, authMethod: 'none', apiProvider: 'firstParty' }), stderr: '' }
      : { status: 0, stdout: '', stderr: '' }),
  });
  assert.equal(result.status, 'blocked');
  assert.equal(result.authMode, 'logged_out');
  assert.equal(result.errorCode, 'claude_logged_out');
  assert.match(result.error, /claude auth login/, 'the reason must name the fix');
});

// ---------------------------------------------------------------------------
// --effort and thinking tokens — the effort-verifiability chain on this transport.
// ---------------------------------------------------------------------------

test('--effort is appended only when asked for, so the default argv is unchanged', () => {
  const base = buildClaudeExecArgs({ root: 'C:\\repo', model: 'claude-opus-5' });
  assert.ok(!base.includes('--effort'), 'no effort flag when none was requested');
  const withEffort = buildClaudeExecArgs({ root: 'C:\\repo', model: 'claude-opus-5', effort: 'max' });
  assert.deepEqual(withEffort, [...base, '--effort', 'max'], 'appended, never inserted');
});

test('thinking tokens are captured — the only field that reveals which effort ran', () => {
  const parsed = parseClaudeStreamJsonl(JSON.stringify({
    type: 'result', subtype: 'success', result: 'review',
    usage: { input_tokens: 40, output_tokens: 12, output_tokens_details: { thinking_tokens: 1912 } },
  }));
  assert.equal(parsed.thinkingTokens, 1912);
});

test('absent thinking tokens are null, never 0 — "not reported" is not "did not think"', () => {
  const parsed = parseClaudeStreamJsonl(JSON.stringify({
    type: 'result', subtype: 'success', result: 'review', usage: { input_tokens: 40, output_tokens: 12 },
  }));
  assert.equal(parsed.thinkingTokens, null);
});

test('an auth failure is BLOCKED, not a generic turn failure that a caller would retry', async () => {
  // The real observed body: an expired OAuth session, reported on the result event.
  const authBody = JSON.stringify({
    type: 'result', subtype: 'error', is_error: true, terminal_reason: 'api_error',
    result: 'Failed to authenticate: OAuth session expired and could not be refreshed',
  });
  const result = await runClaudeSubscription({
    prompt: 'review',
    runProcess: (_c, args) => (args[0] === 'auth'
      ? { status: 0, stdout: subscriptionStatus, stderr: '' }
      : { status: 0, stdout: authBody, stderr: '' }),
  });
  assert.equal(result.status, 'blocked', 'a dead credential must not look retryable');
  assert.equal(result.authMode, 'oauth_unusable');
  assert.equal(result.errorCode, 'claude_oauth_unusable');
});

test('a non-auth error is still FAILED — the auth check must not swallow real errors', async () => {
  const otherError = JSON.stringify({ type: 'result', subtype: 'error', is_error: true, result: 'rate limited' });
  const result = await runClaudeSubscription({
    prompt: 'review',
    runProcess: (_c, args) => (args[0] === 'auth'
      ? { status: 0, stdout: subscriptionStatus, stderr: '' }
      : { status: 0, stdout: otherError, stderr: '' }),
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.errorCode, 'claude_turn_failed');
});

test('preflightOauth blocks dead tokens BEFORE spending a call, and is opt-in', async () => {
  const dead = { claudeAiOauth: { accessToken: '', refreshToken: '', refreshTokenExpiresAt: 0 } };
  let calls = 0;
  const result = await runClaudeSubscription({
    prompt: 'review', preflightOauth: true, credentials: dead,
    runProcess: (_c, args) => { calls += 1; return { status: 0, stdout: subscriptionStatus, stderr: '' }; },
  });
  assert.equal(result.status, 'blocked');
  assert.equal(result.errorCode, 'claude_oauth_unusable');
  assert.equal(calls, 1, 'only the auth probe ran — no model call was spent');

  // Default OFF: the live MCP server must not acquire a filesystem read it never had.
  calls = 0;
  const defaulted = await runClaudeSubscription({
    prompt: 'review', credentials: dead,
    runProcess: (_c, args) => {
      calls += 1;
      return args[0] === 'auth'
        ? { status: 0, stdout: subscriptionStatus, stderr: '' }
        : { status: 0, stdout: JSON.stringify({ type: 'result', result: 'ok', usage: { input_tokens: 1, output_tokens: 1 } }), stderr: '' };
    },
  });
  assert.equal(defaulted.status, 'complete', 'without the opt-in, a dead token file is not consulted');
  assert.equal(calls, 2);
});

test('assessOauthHealth names each failure mode rather than a bare false', () => {
  const now = 1_000_000;
  assert.equal(assessOauthHealth({ claudeAiOauth: { accessToken: 'live' } }, { now }).healthy, true);
  assert.match(assessOauthHealth({}, { now }).reason, /no claudeAiOauth block/);
  assert.match(assessOauthHealth(null, { now }).reason, /no claudeAiOauth block/);
  const expired = assessOauthHealth({ claudeAiOauth: { accessToken: '', refreshToken: 'r', refreshTokenExpiresAt: now - 1 } }, { now });
  assert.match(expired.reason, /refresh token expired/);
  const empty = assessOauthHealth({ claudeAiOauth: { accessToken: '', refreshToken: '' } }, { now });
  assert.match(empty.reason, /claude auth login/);
  const refreshable = assessOauthHealth({ claudeAiOauth: { accessToken: '', refreshToken: 'r', refreshTokenExpiresAt: now + 1 } }, { now });
  assert.match(refreshable.reason, /refresh may succeed/);
});
