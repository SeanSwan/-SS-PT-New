/**
 * swan-claude-subscription.mjs — run a prompt through the Claude Code CLI on a Claude
 * subscription, at $0 marginal cost.
 *
 * The sibling of `swan-council-subscription.mjs` (Codex CLI / ChatGPT subscription). Same
 * contract — classify auth, sanitize the child env, never treat missing telemetry as zero —
 * but a DIFFERENT transport, and the differences are not cosmetic:
 *
 *   codex-cli    `codex exec --json`                      JSONL; usage on `turn.completed`
 *   claude-cli   `claude -p --output-format stream-json`  JSONL; usage on `result`
 *
 * Both stream, but they report usage on different events, so the parsers are not shared.
 *
 * THE READ-ONLY BOUNDARY IS A FLAG SET, NOT A SANDBOX. `claude -p` has no `--sandbox
 * read-only` equivalent, so the boundary is `--tools ""` (no built-in tools at all) plus
 * `--strict-mcp-config` (no MCP servers) plus `--safe-mode` (no CLAUDE.md, skills, plugins,
 * hooks or custom agents). Verified against `claude --help` on 2.1.259, 2026-09-19.
 * `--tools ""` is strictly stronger than a deny-list: a deny-list is only as complete as
 * the day it was written, and a mutating tool added upstream would silently be allowed.
 *
 * CONSEQUENCE: `--tools ""` also removes Read/Glob/Grep, so the model consults ONLY its
 * prompt. Right for an adversarial review (the packet is the evidence, the run is
 * reproducible), but LESS context than the codex leg, which loads the repo's instruction
 * files and skill index into every call. Do not assume the two legs saw the same thing.
 *
 * Usage: imported by `swan-council-server.mjs` and by `consult-opus-subscription.mjs`.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import {
  runProcess as runChildProcess,
  sanitizeSubscriptionEnv,
} from './swan-council-subscription.mjs';

const BASE_RESULT = {
  provider: 'anthropic-claude',
  billing: 'claude-subscription',
  transport: 'claude-cli',
  requestedModel: null,
  servedModel: null,
  inputTokens: null,
  outputTokens: null,
  thinkingTokens: null,
  text: '',
};

function finiteNumber(value) {
  return Number.isFinite(value) ? value : null;
}

function isTimedOut(result = {}) {
  return Boolean(
    result.timedOut
    || result.signal === 'SIGTERM'
    || result.signal === 'SIGKILL'
    || result.error?.code === 'ETIMEDOUT',
  );
}

/**
 * Accept first-party claude.ai subscription auth only.
 *
 * THE EXIT CODE IS DELIBERATELY NOT CONSULTED. Measured 2026-09-19: a logged-out CLI exits
 * **1** while still printing a definitive body — `{"loggedIn": false, "authMethod": "none"}`.
 * The earlier `exitCode !== 0 -> 'unknown'` guard therefore discarded the single most
 * actionable case and reported "we don't know" when the body said "run `claude auth login`".
 * A parseable body outranks a process status; a non-zero exit with an unparseable body still
 * lands on 'unknown' via the catch below.
 */
export function classifyClaudeAuthStatus(stdout = '', { timedOut = false } = {}) {
  if (timedOut) return 'unknown';
  let status;
  try {
    status = JSON.parse(String(stdout));
  } catch {
    return 'unknown';
  }
  if (status?.loggedIn === false) return 'logged_out';
  if (status?.loggedIn === true && status.authMethod === 'claude.ai' && status.apiProvider === 'firstParty' && status.subscriptionType) {
    return 'claude_subscription';
  }
  if (status?.loggedIn === true) return 'other_auth';
  return 'unknown';
}

/** Reasoning levels the CLI accepts for `--effort` (verified on 2.1.259). */
export const CLAUDE_EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'];

/**
 * Build a Claude Code print-mode argv with all built-in tools disabled.
 *
 * `--effort` is appended ONLY when requested, so the default argv stays byte-identical to
 * what shipped before the flag existed (its test pins the exact array). This transport has a
 * real per-call effort flag, unlike the codex leg, whose runner hardcodes its argv and can
 * only reach effort through ambient `CODEX_HOME` — the ambient-config trap.
 */
export function buildClaudeExecArgs({ root, model = null, effort = null } = {}) {
  const args = [
    '--print', '--output-format', 'stream-json', '--no-session-persistence',
    '--permission-mode', 'plan', '--tools', '', '--strict-mcp-config',
    '--safe-mode', '--add-dir', root,
  ];
  if (model) args.push('--model', model);
  if (effort) args.push('--effort', effort);
  return args;
}

function extractText(value) {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';
  return value.filter((block) => block?.type === 'text' && typeof block.text === 'string').map((block) => block.text).join('');
}

/**
 * Parse Claude stream-json without inventing model or usage metadata.
 *
 * `thinkingTokens` is the ONE field revealing which effort actually ran: input and output
 * counts are near-identical across levels for the same prompt, while thinking tokens move by
 * multiples. Discarding it makes effort unverifiable from any artifact — the defect fixed on
 * the codex leg, where the field was dropped a layer down. Null means "not reported", not 0.
 */
export function parseClaudeStreamJsonl(stdout = '') {
  let resultText = '';
  let streamedText = '';
  let sawResult = false;
  let failed = false;
  let errorText = null;
  let terminalReason = null;
  let servedModel = null;
  let usage = {};

  for (const line of String(stdout).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let event;
    try { event = JSON.parse(trimmed); } catch { continue; }
    servedModel ||= event.model || event.message?.model || null;
    if (event.type === 'assistant') streamedText += extractText(event.message?.content);
    if (event.type === 'result') {
      sawResult = true;
      resultText = extractText(event.result);
      usage = event.usage || event.message?.usage || {};
      terminalReason = event.terminal_reason ?? terminalReason;
      if (event.is_error || event.subtype === 'error') {
        failed = true;
        errorText = typeof event.result === 'string' ? event.result : (event.subtype ?? 'error');
      }
    }
  }

  return {
    complete: sawResult && !failed && Boolean((resultText || streamedText).trim()),
    finalText: (resultText || streamedText).trim(),
    failed,
    errorText,
    terminalReason,
    servedModel,
    inputTokens: finiteNumber(usage.input_tokens ?? usage.prompt_tokens),
    outputTokens: finiteNumber(usage.output_tokens ?? usage.completion_tokens),
    thinkingTokens: finiteNumber(usage.output_tokens_details?.thinking_tokens),
  };
}

function failedResult(base, errorCode) {
  return { ...base, status: 'failed', errorCode, error: errorCode };
}

function blockedResult(base, errorCode, error) {
  return { ...base, status: 'blocked', errorCode, error };
}

/** Where the CLI keeps its OAuth material. */
export const credentialsPath = (home = homedir()) => join(home, '.claude', '.credentials.json');

/**
 * The preflight that `auth status` cannot do: are the OAuth tokens actually usable?
 *
 * MEASURED 2026-09-19: `claude auth status` reported `loggedIn: true` while `.credentials.json`
 * held `accessToken: ""` and `refreshToken: ""` with `refreshTokenExpiresAt` 163 minutes past.
 * Every dispatch then failed with "OAuth session expired and could not be refreshed". `auth
 * status` reads LOCAL state and is optimistic; it is a hint, never proof a call will work.
 */
export function assessOauthHealth(credentials, { now = Date.now() } = {}) {
  const oauth = credentials?.claudeAiOauth;
  if (!oauth || typeof oauth !== 'object') {
    return { healthy: false, reason: 'no claudeAiOauth block in .credentials.json' };
  }
  if (typeof oauth.accessToken === 'string' && oauth.accessToken.length > 0) {
    return { healthy: true, reason: null };
  }
  if (typeof oauth.refreshToken === 'string' && oauth.refreshToken.length > 0) {
    if (Number.isFinite(oauth.refreshTokenExpiresAt) && oauth.refreshTokenExpiresAt > now) {
      return { healthy: false, reason: 'access token empty but refresh token is live — a refresh may succeed' };
    }
    return { healthy: false, reason: 'access token empty and refresh token expired' };
  }
  return { healthy: false, reason: 'both access and refresh tokens are empty — run `claude auth login`' };
}

/** Read the credential file, returning null rather than throwing when it is absent. */
export function readCredentials(path = credentialsPath()) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * An expired session exits 0 with a well-formed body, so a zero exit code is NOT evidence of
 * success on this transport. Measured, not assumed.
 */
const AUTH_FAILURE = /failed to authenticate|oauth session expired|invalid api key/i;

/**
 * Run Claude Code through its first-party subscription CLI; no API fallback.
 *
 * TWO NETS. `preflightOauth` is OPT-IN because it reads the credential file, and defaulting it
 * off keeps the live MCP server's behaviour unchanged. The post-call check is always armed and
 * catches the dead-token case either way — just after a wasted round-trip.
 */
export async function runClaudeSubscription({
  prompt,
  root = process.cwd(),
  model = null,
  effort = null,
  command = process.env.SWAN_CLAUDE_BIN || 'claude',
  env = process.env,
  authTimeoutMs = 10_000,
  timeoutMs = 600_000,
  preflightOauth = false,
  credentials = undefined,
  runProcess: processRunner = runChildProcess,
} = {}) {
  const base = { ...BASE_RESULT, requestedModel: model || null };
  const childEnv = sanitizeSubscriptionEnv(env);
  const authResult = await processRunner(command, ['auth', 'status'], {
    cwd: root, env: childEnv, input: '', timeoutMs: authTimeoutMs,
  });
  const authTimedOut = isTimedOut(authResult);
  const authMode = classifyClaudeAuthStatus(authResult?.stdout || '', { timedOut: authTimedOut });
  const withAuth = { ...base, authMode };
  if (authMode !== 'claude_subscription') {
    // The reason is the operator's next action, not a restatement of the classification.
    // `logged_out` is the case measured on this machine, and "run claude auth login" is the
    // whole fix — reporting it as a generic auth failure would cost a diagnosis round-trip.
    const errorCode = authTimedOut
      ? 'claude_auth_timeout'
      : (authMode === 'logged_out' ? 'claude_logged_out' : 'subscription_auth_required');
    const reason = authTimedOut
      ? '`claude auth status` timed out; no provider execution attempted.'
      : authMode === 'logged_out'
        ? 'Claude CLI reports loggedIn:false — run `claude auth login`, then re-run this. '
          + 'No provider execution attempted and no metered fallback was used.'
        : `Claude first-party subscription authentication is unavailable (authMode=${authMode}); `
          + 'no provider execution attempted.';
    return blockedResult(withAuth, errorCode, reason);
  }

  // Opt-in, because it is the only step here that touches the filesystem outside `root`.
  if (preflightOauth) {
    const creds = credentials === undefined ? readCredentials() : credentials;
    const health = assessOauthHealth(creds);
    if (!health.healthy) {
      return blockedResult({ ...withAuth, authMode: 'oauth_unusable' }, 'claude_oauth_unusable', health.reason);
    }
  }

  const execResult = await processRunner(command, buildClaudeExecArgs({ root, model, effort }), {
    cwd: root, env: childEnv, input: String(prompt || ''), timeoutMs,
  });
  const parsed = parseClaudeStreamJsonl(execResult?.stdout || '');
  const execBase = {
    ...withAuth,
    servedModel: parsed.servedModel,
    inputTokens: parsed.inputTokens,
    outputTokens: parsed.outputTokens,
    thinkingTokens: parsed.thinkingTokens,
  };
  if (isTimedOut(execResult)) return failedResult(execBase, 'claude_exec_timeout');
  // Auth is checked BEFORE the exit status: the expired-session case exits 0, so ordering
  // these the other way round reports a dead credential as a generic turn failure — and a
  // caller that retries a generic failure will retry a dead credential forever.
  if (parsed.failed && AUTH_FAILURE.test(parsed.errorText || '')) {
    return blockedResult({ ...execBase, authMode: 'oauth_unusable' }, 'claude_oauth_unusable', parsed.errorText);
  }
  if (typeof execResult?.status !== 'number' || execResult.status !== 0) return failedResult(execBase, 'claude_exec_failed');
  if (parsed.failed) return failedResult(execBase, 'claude_turn_failed');
  if (!parsed.complete) return failedResult(execBase, 'claude_incomplete');
  return { ...execBase, status: 'complete', text: parsed.finalText };
}
