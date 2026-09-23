/**
 * Subscription-only provider execution primitives.
 *
 * This module deliberately has no network client, .env loader, or metered
 * fallback. The process seam is injectable so tests can prove policy without
 * invoking a model.
 */

import { spawnSync } from 'node:child_process';
import { buildEffortArgs, resolveEffort } from '../lib/astra-effort.mjs';
import { redactOutbound } from '../lib/redact-egress.mjs';

const BLOCKED_ENV_KEYS = new Set([
  'OPENAI_API_KEY',
  'CODEX_API_KEY',
  'OPENROUTER_API_KEY',
  'OPEN_ROUTER_API_KEY',
  'ANTHROPIC_API_KEY',
  'ZAI_API_KEY',
  'DEEPSEEK_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'XAI_API_KEY',
  'MOONSHOT_API_KEY',
]);

const BASE_RESULT = {
  provider: 'openai-codex',
  billing: 'chatgpt-subscription',
  transport: 'codex-cli',
  requestedModel: null,
  servedModel: null,
  // The depth this run was ASKED for. Recorded because it used to be decided by the
  // ambient `$CODEX_HOME/config.toml` and recorded nowhere — see scripts/lib/astra-effort.mjs.
  effort: null,
  // WHICH branch of the egress admission this run took: 'redacted-at-boundary',
  // 'caller-supplied-redacted', 'caller-asserted-redacted', 'redaction-failed', or
  // null when admission failed earlier. Added 2026-09-22 (Astra R2-A1-02) so a
  // receipt can show that the boundary actually ran, rather than trusting that
  // some caller somewhere remembered to redact.
  egressMode: null,
  inputTokens: null,
  outputTokens: null,
  reasoningOutputTokens: null,
  text: '',
};

function finiteNumber(value) {
  return Number.isFinite(value) ? value : null;
}

function extractUsage(usage = {}) {
  return {
    inputTokens: finiteNumber(usage.input_tokens ?? usage.prompt_tokens),
    outputTokens: finiteNumber(usage.output_tokens ?? usage.completion_tokens),
    // `reasoning_output_tokens` is the ONLY field that reveals which effort level
    // actually ran: the transport passes `--model` but never an effort flag, so
    // effort comes from the ambient CODEX_HOME, and input/output token counts are
    // identical across levels for the same prompt. It was previously discarded
    // here, and because the transport also passes `--ephemeral` (which suppresses
    // the rollout log), effort was unverifiable from any artifact this transport
    // produced. Measured 2026-09-19, same prompt and model, only `-c
    // model_reasoning_effort` differing: high -> 516, max -> 1912.
    //
    // CAVEAT, added 2026-09-19 after trying to reuse the number above as a scale: it
    // is NOT one. On the trivial prompt "say OK" this field is **0 at every level**
    // (measured: low -> 0, xhigh -> 0), because no reasoning was required. It
    // discriminates only on prompts that demand reasoning, and only within the SAME
    // prompt. Never infer a run's effort from a bare count without the prompt it
    // came from. The 516/1912 pair belongs to one reasoning-demanding prompt and does
    // not generalise.
    //
    // Effort is now also carried explicitly on the argv (see scripts/lib/astra-effort.mjs),
    // so this field is corroboration rather than the only evidence.
    reasoningOutputTokens: finiteNumber(usage.reasoning_output_tokens),
  };
}

function eventModel(event) {
  return event?.model
    ?? event?.served_model
    ?? event?.response?.model
    ?? event?.item?.model
    ?? null;
}

function isTimedOut(result = {}) {
  return Boolean(
    result.timedOut
    || result.signal === 'SIGTERM'
    || result.signal === 'SIGKILL'
    || result.error?.code === 'ETIMEDOUT',
  );
}

/** Return a child environment that cannot inherit known provider API keys. */
export function sanitizeSubscriptionEnv(source = process.env) {
  const sanitized = { ...source };
  for (const key of Object.keys(sanitized)) {
    if (BLOCKED_ENV_KEYS.has(key)) delete sanitized[key];
  }
  return sanitized;
}

/**
 * Classify only exact, successful status output. In particular, "Not logged
 * in" must never satisfy a loose "logged in" check.
 */
export function classifyCodexAuthStatus(text = '', { exitCode = 0, timedOut = false } = {}) {
  if (timedOut || exitCode !== 0) return 'unknown';
  const normalized = String(text);
  if (/not\s+logged\s+in/i.test(normalized)) return 'logged_out';
  if (/logged\s+in\s+using\s+chatgpt/i.test(normalized)) return 'chatgpt_subscription';
  if (/logged\s+in\s+using\s+(?:an?\s+)?api\s+key/i.test(normalized)) return 'api_key';
  return 'unknown';
}

/** Build argv without shell interpolation or writable-sandbox flags.
 * No `--ask-for-approval`: codex-cli 0.154.0 removed the flag and exits
 * non-zero at parse time. `exec` is non-interactive and cannot ask anyway;
 * the read-only sandbox below is still the write boundary.
 *
 * `effort` becomes an explicit `-c model_reasoning_effort="..."` override. Omitting
 * it is NOT neutral: without the flag the level comes from the ambient
 * `$CODEX_HOME/config.toml` (which sets `low` on this machine) and, because
 * `--ephemeral` suppresses the rollout log, nothing afterwards can tell what ran.
 * An unsupported level throws here rather than failing a round-trip later. */
export function buildCodexExecArgs({ root, model = null, effort = null }) {
  const args = [
    'exec', '--json', '--ephemeral', '--sandbox', 'read-only', '-C', root,
  ];
  if (model) args.push('--model', model);
  // Before the trailing `-`: the last argument is the stdin marker and must stay last.
  args.push(...buildEffortArgs(effort));
  args.push('-');
  return args;
}

/** Parse Codex JSONL without treating missing telemetry as zero. */
export function parseCodexJsonl(stdout = '') {
  const messages = [];
  let sawTurnCompleted = false;
  let failure = null;
  let servedModel = null;
  let usage = {};

  for (const line of String(stdout).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let event;
    try {
      event = JSON.parse(trimmed);
    } catch {
      // Human-readable diagnostics may be interleaved by a wrapper. They are
      // intentionally ignored instead of being copied into evidence.
      continue;
    }

    servedModel ||= eventModel(event);
    if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
      if (typeof event.item.text === 'string' && event.item.text.trim()) messages.push(event.item.text.trim());
    }
    if (event.type === 'turn.completed') {
      sawTurnCompleted = true;
      usage = event.usage || {};
    }
    if (['error', 'turn.failed', 'turn.cancelled'].includes(event.type)) {
      failure = event.type;
    }
  }

  const tokenUsage = extractUsage(usage);
  return {
    complete: sawTurnCompleted && !failure,
    failed: failure !== null,
    failure,
    finalText: messages.join('\n\n'),
    servedModel,
    ...tokenUsage,
  };
}

/** The only default process transport used by this module. */
export function runProcess(command, args, { cwd, env, input, timeoutMs }) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    input,
    encoding: 'utf8',
    timeout: timeoutMs,
    windowsHide: true,
    // The argument vector is still used on Windows; this only permits npm's
    // command shim to resolve without interpolating the prompt into a shell.
    shell: process.platform === 'win32',
    maxBuffer: 20 * 1024 * 1024,
  });
  return result;
}

function failedResult(base, errorCode) {
  return { ...base, status: 'failed', errorCode, error: errorCode };
}

/** Run Codex only when the local CLI proves ChatGPT subscription auth.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EGRESS BOUNDARY (2026-09-22) — protection is now CALLER-INDEPENDENT.
 *
 * This function is the single entry point for three callers, and until now it
 * redacted NOTHING: `input: String(prompt || '')` went to the child verbatim.
 * Only `consult-astra-subscription.mjs` redacted, by hand. That is the defect
 * `2026-09-19-140032-mega-blueprint-mandate-round-3-egress-and-secret.md` filed as
 * F3 HIGH and left unfixed, because changing a shared transport's contract was
 * judged to be Sean's call. Astra re-measured it as `R2-A1-02` on 2026-09-22 and
 * named this the first fix: *"Caller-specific protection is insufficient to
 * establish a shared invariant."*
 *
 * The rule is now the same one `fetchForEgress()` enforces on the HTTP path:
 * nothing leaves this module unredacted, whatever the caller remembered.
 *
 * TWO WAYS TO SATISFY IT — one explicit, one explicit:
 *   - `prompt:`           a raw prompt. Redacted HERE, then sent.
 *   - `redactedPrompt:`   text the caller already redacted. Sent as-is.
 *   - `promptRedacted: true`  an assertion that a raw `prompt` needs no further
 *                         treatment. It is honoured (double-redaction is
 *                         harmless but it makes hit counts lie), and it is
 *                         recorded on the result so the claim is auditable.
 * Passing neither `prompt` nor `redactedPrompt` is an error, not a silent empty
 * send — an unguarded send is the failure mode this code exists to prevent.
 *
 * The redactor runs `selfTest()` internally and THROWS if its canary fails, so a
 * broken instrument refuses to send rather than sending quietly. That is
 * deliberate: fail closed.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `effort` is PASS-THROUGH, not defaulted. Three legs call this primitive and a
 * default here would silently change the depth — and the wall time — of the two that
 * did not ask for one. `null` therefore means "no override", which is the pre-existing
 * behaviour, and it is recorded as such rather than dressed up as a level. Callers
 * that want a guarantee resolve it themselves; `consult-astra-subscription.mjs` always
 * passes a concrete level, so an Astra receipt can never be silent about depth.
 *
 * When a level IS given it is validated BEFORE the auth probe, so a typo costs
 * nothing instead of costing a dispatch. */
export async function runCodexSubscription({
  prompt = null,
  redactedPrompt = null,
  promptRedacted = false,
  root = process.cwd(),
  model = null,
  effort = null,
  command = process.env.SWAN_CODEX_BIN || 'codex',
  env = process.env,
  authTimeoutMs = 10_000,
  timeoutMs = 600_000,
  runProcess: processRunner = runProcess,
} = {}) {
  const base = {
    ...BASE_RESULT,
    requestedModel: model || null,
    effort: effort ? resolveEffort(effort) : null,
  };

  // ── EGRESS ADMISSION — before the auth probe, so an unguarded call costs
  // nothing instead of costing a dispatch. Errors here are RETURNED, not thrown,
  // to match this module's existing `status` contract: every exit is a status a
  // receipt can record, and no caller has to wrap this in try/catch to be safe.
  const hasRaw = typeof prompt === 'string' && prompt.length > 0;
  const hasRedacted = typeof redactedPrompt === 'string' && redactedPrompt.length > 0;
  if (!hasRaw && !hasRedacted) {
    return {
      ...base,
      status: 'blocked',
      errorCode: 'subscription_prompt_missing',
      error: 'runCodexSubscription requires `prompt` or `redactedPrompt`; refusing to send an empty task.',
    };
  }

  // Redact unless the caller supplied already-redacted text or asserted it did.
  // The assertion is recorded either way — an unverifiable claim should at least
  // be visible in the receipt rather than assumed.
  let outboundPrompt;
  let egressMode;
  if (hasRedacted) {
    outboundPrompt = redactedPrompt;
    egressMode = 'caller-supplied-redacted';
  } else if (promptRedacted) {
    outboundPrompt = prompt;
    egressMode = 'caller-asserted-redacted';
  } else {
    try {
      outboundPrompt = redactOutbound(prompt, { label: 'subscription-prompt' });
      egressMode = 'redacted-at-boundary';
    } catch (err) {
      // The redactor's canary threw. Its silence would mean nothing, so refuse.
      return {
        ...base,
        status: 'blocked',
        errorCode: 'subscription_redaction_failed',
        error: `Egress redaction failed; refusing to send unredacted text: ${err.message}`,
        egressMode: 'redaction-failed',
      };
    }
  }
  const withEgress = { ...base, egressMode };

  const childEnv = sanitizeSubscriptionEnv(env);
  const authResult = await processRunner(command, ['login', 'status'], {
    cwd: root,
    env: childEnv,
    input: '',
    timeoutMs: authTimeoutMs,
  });
  const authTimedOut = isTimedOut(authResult);
  const authExitCode = typeof authResult?.status === 'number' ? authResult.status : 1;
  const authMode = classifyCodexAuthStatus(
    `${authResult?.stdout || ''}\n${authResult?.stderr || ''}`,
    { exitCode: authExitCode, timedOut: authTimedOut },
  );
  const withAuth = { ...withEgress, authMode };

  if (authMode !== 'chatgpt_subscription') {
    return {
      ...withAuth,
      status: 'blocked',
      errorCode: authTimedOut ? 'codex_auth_timeout' : 'subscription_auth_required',
      error: 'Codex ChatGPT subscription authentication is unavailable; no provider execution attempted.',
    };
  }

  const execResult = await processRunner(
    command,
    buildCodexExecArgs({ root, model, effort: base.effort }),
    { cwd: root, env: childEnv, input: outboundPrompt, timeoutMs },
  );
  const parsed = parseCodexJsonl(execResult?.stdout || '');
  const execBase = {
    ...withAuth,
    servedModel: parsed.servedModel,
    inputTokens: parsed.inputTokens,
    outputTokens: parsed.outputTokens,
    reasoningOutputTokens: parsed.reasoningOutputTokens,
  };

  if (isTimedOut(execResult)) return failedResult(execBase, 'codex_exec_timeout');
  if (typeof execResult?.status !== 'number' || execResult.status !== 0) {
    return failedResult(execBase, 'codex_exec_failed');
  }
  if (parsed.failed) return failedResult(execBase, 'codex_turn_failed');
  if (!parsed.complete) return failedResult(execBase, 'codex_incomplete');
  if (!parsed.finalText) return failedResult(execBase, 'codex_empty_response');

  return { ...execBase, status: 'complete', text: parsed.finalText };
}

export { BLOCKED_ENV_KEYS };
