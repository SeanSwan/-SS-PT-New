#!/usr/bin/env node
/**
 * swan-council-server.mjs — MCP stdio server: live Codex / Kimi / Fable from a
 * Claude conversation, no paste-relay, no SDK dependency.
 * ============================================================================
 * Speaks raw MCP-over-stdio (newline-delimited JSON-RPC 2.0) so it adds ZERO
 * npm dependencies to the production repo. Node built-ins only.
 *
 * Tools (Sean 2026-07-22):
 *   - codex_review  — daily hostile reviewer. ChatGPT subscription CLI only.
 *   - ask_kimi      — cheap "more brainpower" brain ($0.08–0.16/call).
 *                     OpenRouter only when explicitly enabled.
 *   - ask_grok      — cheapest council brain (Grok 4.6, ~$0.04–0.10/call).
 *                     OpenRouter only when explicitly enabled.
 *   - fable_rule    — the king, expensive. Metered use is disabled by default.
 *                     SPEND-GATED: refuses to spend unless the caller
 *                     passes confirm:true, so it can NEVER fire silently.
 *
 * Spend control: every paid call logs cost + running session total AND a hard
 * $3/session cap (SWAN_COUNCIL_CAP_USD to override) refuses further paid calls.
 *
 * Codex uses the local subscription CLI runner. Other provider routes remain
 * available only when SWAN_COUNCIL_ENABLE_METERED_FALLBACK=1 is explicitly set.
 *
 * Privacy (Rule 8/44/59): OPENROUTER_API_KEY only ever in the Authorization
 * header; redactKey() scrubs anything that leaves. Keep tool inputs to IDs/roles.
 *
 * @module swan-council-server
 */

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { runCodexSubscription } from './swan-council-subscription.mjs';
import { runClaudeSubscription } from './swan-claude-subscription.mjs';
import {
  BRAINS, DEFAULT_SESSION_CAP_USD, loadOpenRouterKey, redactKey, computeCost,
  checkCap, reserveSpend, settleReservation, selectBackend, callOpenRouter, REMITS, buildReviewPrompt,
} from './swan-council-lib.mjs';

const ROOT = process.env.SWAN_COUNCIL_ROOT || process.cwd();
const LEDGER = process.env.SWAN_COUNCIL_LEDGER || join(ROOT, 'scripts', 'mcp', 'swan-council.spend.json');
const CAP = Number(process.env.SWAN_COUNCIL_CAP_USD) || DEFAULT_SESSION_CAP_USD;
const METERED_FALLBACK_ENABLED = process.env.SWAN_COUNCIL_ENABLE_METERED_FALLBACK === '1';
const KEY = METERED_FALLBACK_ENABLED ? loadOpenRouterKey(ROOT) : null;

// stderr is safe for diagnostics (not part of the MCP protocol stream); stdout
// is RESERVED for JSON-RPC. Never write anything but framed JSON to stdout.
const logErr = (...a) => process.stderr.write(`[swan-council] ${a.join(' ')}\n`);

// ─────────────────────────────────────────────────────────────────────────────
// Tool implementations
// ─────────────────────────────────────────────────────────────────────────────

// Only these characters may appear in a caller-supplied diff range. Git refs,
// SHAs, and range operators (.. ...) are covered; shell metacharacters
// (; & | $ ` ( ) < > newlines, quotes, spaces) are NOT — so a malicious range
// is rejected before it can reach a subprocess. Belt: we also use execFileSync
// (argv array, NO shell) so even a bypass here cannot chain a second command.
const SAFE_RANGE = /^[A-Za-z0-9._/~^@-]{1,120}(\.{2,3}[A-Za-z0-9._/~^@-]{1,120})?$/;

export function isSafeDiffRange(range) {
  return typeof range === 'string' && SAFE_RANGE.test(range);
}

function gitDiff(range = 'HEAD') {
  if (!isSafeDiffRange(range)) {
    return `(rejected diff range ${JSON.stringify(range)}: only refs/SHAs and .. ... ranges are allowed — no shell metacharacters)`;
  }
  try {
    // execFileSync: fixed argv, no shell interpolation. `range` is one argument,
    // never a command fragment — even if the regex were bypassed it cannot exec.
    return execFileSync('git', ['-C', ROOT, 'diff', range], { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  } catch (e) {
    return `(failed to read git diff ${range}: ${e.message})`;
  }
}

/**
 * Worst-case cost of a call: the prompt as input + the brain's FULL max_tokens
 * as output. Used to RESERVE against the cap before the call so a long response
 * can't silently overshoot (#3), and so the reservation a concurrent call sees
 * is never an undercount (#1). Real cost replaces the estimate on settle.
 */
function worstCaseEstimate(brain, prompt) {
  const inTok = Math.ceil((prompt?.length || 0) / 4);
  const outTok = BRAINS[brain]?.maxTokens || 8192;
  return computeCost(brain, inTok, outTok);
}

/** Run Codex through the local subscription CLI; never fall back to metered use.
 *
 * `prompt` reaches this function RAW — REDACT is a *key* scrubber (see the module
 * header), not a content redactor, and it is not applied here. The prompt is
 * therefore handed to `runCodexSubscription` as a raw `prompt` so the transport's
 * egress boundary redacts it. Until 2026-09-22 this call site sent the prompt
 * verbatim (Astra R2-A1-02).
 *
 * `egressMode` is surfaced in the footer so a council receipt records WHICH branch
 * of the admission ran. A call that fell through to `redaction-failed` should be
 * visible on the receipt, not inferred from a missing line. */
async function runCodex(prompt) {
  const result = await runCodexSubscription({
    prompt,
    root: ROOT,
    model: process.env.SWAN_CODEX_MODEL || null,
  });
  if (result.status !== 'complete') {
    return { ok: false, text: `codex: ${result.errorCode || 'blocked'} — ${result.error}` };
  }
  const footer = [
    '', '', '---',
    `_via Codex CLI \`${result.billing}\` · auth \`${result.authMode}\` · egress \`${result.egressMode || 'unknown'}\` · requested model \`${result.requestedModel || 'unspecified'}\` · served model \`${result.servedModel || 'unknown'}\` · tokens in:${result.inputTokens ?? 'unknown'} out:${result.outputTokens ?? 'unknown'}_`,
  ].join('\n');
  return { ok: true, text: result.text + footer };
}

/** Run Claude Code through its first-party subscription CLI; no API fallback. */
async function runClaude(prompt) {
  const result = await runClaudeSubscription({
    prompt,
    root: ROOT,
    model: process.env.SWAN_CLAUDE_MODEL || null,
  });
  if (result.status !== 'complete') {
    return { ok: false, text: `claude: ${result.errorCode || 'blocked'} — ${result.error}` };
  }
  const footer = [
    '', '', '---',
    `_via Claude CLI \`${result.billing}\` · auth \`${result.authMode}\` · requested model \`${result.requestedModel || 'unspecified'}\` · served model \`${result.servedModel || 'unknown'}\` · tokens in:${result.inputTokens ?? 'unknown'} out:${result.outputTokens ?? 'unknown'}_`,
  ].join('\n');
  return { ok: true, text: result.text + footer };
}

/** Run a non-Codex brain via OpenRouter only with explicit policy opt-in. */
async function runPaid(brain, prompt, { reasoningEffort } = {}) {
  if (brain === 'codex') return runCodex(prompt);
  if (!METERED_FALLBACK_ENABLED) {
    return { ok: false, text: `${brain}: metered fallback disabled by policy; no provider call attempted.` };
  }
  const backend = await selectBackend(brain, { hasKey: !!KEY, allowMeteredFallback: true });
  if (backend === 'none') {
    return { ok: false, text: `${brain}: no backend available (CLI absent and no OpenRouter key).` };
  }
  // 'cli' backend is not wired yet (CLIs absent on this machine). When a CLI is
  // installed, add the spawn path here; until then selectBackend returns
  // 'openrouter'. Guard defensively so a future CLI presence can't silently spend.
  if (backend === 'cli') {
    return { ok: false, text: `${brain}: subscription CLI detected but the CLI backend is not yet wired in this build — install-time follow-up. No spend attempted.` };
  }

  // ATOMIC reserve: synchronously check the cap AND write a worst-case hold in one
  // uninterruptible read-modify-write. A concurrent call now sees this hold, so two
  // parallel calls cannot both pass a stale gate and overshoot the cap (#1).
  const est = worstCaseEstimate(brain, prompt);
  const res = reserveSpend(LEDGER, brain, est, { cap: CAP });
  if (!res.allowed) {
    return { ok: false, text: `SPEND CAP: ${res.reason}. Cap resets when scripts/mcp/swan-council.spend.json is cleared.` };
  }

  let r;
  try {
    r = await callOpenRouter(brain, prompt, { apiKey: KEY, reasoningEffort });
  } catch (e) {
    // Release the hold fully — a failed call costs nothing.
    settleReservation(LEDGER, res.reservationId, { brain, model: '(failed)', costUsd: 0 });
    return { ok: false, text: redactKey(`${brain} call failed: ${e.message}`, KEY) };
  }
  const cost = computeCost(brain, r.inTok, r.outTok);
  // Settle: swap the worst-case hold for the real cost.
  const total = settleReservation(LEDGER, res.reservationId, { brain, model: r.model, costUsd: cost, inTok: r.inTok, outTok: r.outTok });
  const footer = `\n\n---\n_via OpenRouter \`${r.model}\` · this call ~$${cost.toFixed(4)} · session total $${total.toFixed(4)} / $${CAP} cap_`;
  logErr(`${brain} ok — $${cost.toFixed(4)} (session $${total.toFixed(4)}/$${CAP})`);
  return { ok: true, text: r.text + footer };
}

const TOOLS = {
  codex_review: {
    description: 'Hostile code review by the authenticated Codex subscription CLI. Pass files and/or the current tracked git diff. No metered fallback. Inputs: repo-relative paths and a focused question.',
    inputSchema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string' }, description: 'Repo-relative file paths to review.' },
        diff: { type: 'boolean', description: 'Include the tracked working-tree diff (git diff HEAD). Untracked files require explicit files.' },
        diff_range: { type: 'string', description: 'Custom git diff range (e.g. "main..HEAD"). Implies diff.' },
        question: { type: 'string', description: 'Specific question or focus for the review.' },
      },
    },
    async run(a = {}) {
      const files = Array.isArray(a.files) ? a.files : [];
      const diffText = (a.diff || a.diff_range) ? gitDiff(a.diff_range || 'HEAD') : '';
      if (!files.length && !diffText && !a.question) {
        return { ok: false, text: 'codex_review needs at least one of: files, diff, or question.' };
      }
      const prompt = buildReviewPrompt({ remit: REMITS.codex, files, diffText, question: a.question || '', root: ROOT });
      return runPaid('codex', prompt);
    },
  },

  claude_review: {
    description: 'Hostile code review by the authenticated Claude Code subscription CLI. Tools, persistence, and custom MCP are disabled; there is no metered fallback.',
    inputSchema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string' }, description: 'Repo-relative file paths to review.' },
        diff: { type: 'boolean', description: 'Include the tracked working-tree diff (git diff HEAD). Untracked files require explicit files.' },
        diff_range: { type: 'string', description: 'Custom git diff range (e.g. "main..HEAD"). Implies diff.' },
        question: { type: 'string', description: 'Specific question or focus for the review.' },
      },
    },
    async run(a = {}) {
      const files = Array.isArray(a.files) ? a.files : [];
      const diffText = (a.diff || a.diff_range) ? gitDiff(a.diff_range || 'HEAD') : '';
      if (!files.length && !diffText && !a.question) {
        return { ok: false, text: 'claude_review needs at least one of: files, diff, or question.' };
      }
      const prompt = buildReviewPrompt({ remit: REMITS.codex, files, diffText, question: a.question || '', root: ROOT });
      return runClaude(prompt);
    },
  },

  ask_kimi: {
    description: 'Ask Kimi K3 a question — cheap ($0.08–0.16/call) extra brainpower / design + general review. Fires freely. Inputs: IDs/roles only, no PII.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question or document to review.' },
        files: { type: 'array', items: { type: 'string' }, description: 'Optional repo-relative files for context.' },
        effort: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Reasoning effort (default high).' },
      },
      required: ['question'],
    },
    async run(a = {}) {
      if (!a.question) return { ok: false, text: 'ask_kimi requires a question.' };
      const files = Array.isArray(a.files) ? a.files : [];
      const prompt = buildReviewPrompt({ remit: REMITS.kimi, files, question: a.question, root: ROOT });
      return runPaid('kimi', prompt, { reasoningEffort: a.effort || 'high' });
    },
  },

  ask_grok: {
    description: 'Ask Grok 4.6 a question — the cheapest council brain ($2/M in, $6/M out, ~$0.04–0.10/call), a blunt contrarian reviewer. Fires freely under the session cap. Added on the rule-12 repeal (Sean 2026-08-20). Inputs: IDs/roles only, no PII.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question or document to review.' },
        files: { type: 'array', items: { type: 'string' }, description: 'Optional repo-relative files for context.' },
        effort: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Reasoning effort (default high).' },
      },
      required: ['question'],
    },
    async run(a = {}) {
      if (!a.question) return { ok: false, text: 'ask_grok requires a question.' };
      const files = Array.isArray(a.files) ? a.files : [];
      const prompt = buildReviewPrompt({ remit: REMITS.grok, files, question: a.question, root: ROOT });
      return runPaid('grok', prompt, { reasoningEffort: a.effort || 'high' });
    },
  },

  fable_rule: {
    description: 'Final-Decider ruling by Fable 5 — the king, EXPENSIVE, and disabled by default. SPEND-GATED: does nothing unless metered policy is explicitly enabled and you pass confirm:true.',
    inputSchema: {
      type: 'object',
      properties: {
        document: { type: 'string', description: 'The plan/brief/decision text to rule on (paste inline, IDs/roles only).' },
        confirm: { type: 'boolean', description: 'Must be true to actually spend. Omit/false to get a cost estimate only.' },
      },
      required: ['document'],
    },
    async run(a = {}) {
      if (!a.document) return { ok: false, text: 'fable_rule requires a document to rule on.' };
      if (!METERED_FALLBACK_ENABLED) {
        return { ok: false, text: 'fable: metered fallback disabled by policy; no provider call attempted.' };
      }
      // WORST-CASE estimate (input + Fable's FULL max_tokens output), not a
      // hopeful 2500-token guess — so the number Sean confirms is the ceiling he
      // could actually be charged, and the pre-check can't wave through an
      // overshoot (#3). runPaid re-reserves the same worst case atomically.
      const estIn = Math.ceil((REMITS.fable.length + a.document.length) / 4);
      const est = computeCost('fable', estIn, BRAINS.fable.maxTokens);
      const gate = checkCap(LEDGER, CAP, est);
      if (!a.confirm) {
        return {
          ok: true,
          text: `Fable is the expensive king. This ruling is estimated ~$${est.toFixed(4)} (Fable @ $${BRAINS.fable.priceIn}/$${BRAINS.fable.priceOut} per M tok). ` +
            `Session so far: $${gate.spent.toFixed(4)} / $${CAP} cap.\n\n` +
            `${gate.allowed ? 'To proceed, call fable_rule again with confirm:true.' : `BLOCKED: ${gate.reason}.`}`,
        };
      }
      if (!gate.allowed) return { ok: false, text: `SPEND CAP: ${gate.reason}.` };
      const prompt = `${REMITS.fable}\n\n===== DOCUMENT UNDER RULING =====\n\n${a.document}\n\n===== END — PRODUCE YOUR LOCKED RULING NOW =====`;
      return runPaid('fable', prompt);
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Minimal MCP-over-stdio (JSON-RPC 2.0, newline-delimited) — no SDK.
// ─────────────────────────────────────────────────────────────────────────────

const PROTOCOL_VERSION = '2024-11-05';

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}
function result(id, res) { send({ jsonrpc: '2.0', id, result: res }); }
function error(id, code, message) { send({ jsonrpc: '2.0', id, error: { code, message: redactKey(message, KEY) } }); }

function toolList() {
  return Object.entries(TOOLS).map(([name, t]) => ({ name, description: t.description, inputSchema: t.inputSchema }));
}

async function handle(msg) {
  const { id, method, params } = msg;
  // Notifications (no id) — ack silently.
  if (id === undefined || id === null) return;

  switch (method) {
    case 'initialize':
      return result(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: 'swan-council', version: '1.0.0' },
      });
    case 'tools/list':
      return result(id, { tools: toolList() });
    case 'tools/call': {
      const name = params?.name;
      const tool = TOOLS[name];
      if (!tool) return error(id, -32601, `unknown tool '${name}'`);
      try {
        const out = await tool.run(params?.arguments || {});
        return result(id, {
          content: [{ type: 'text', text: redactKey(out.text, KEY) }],
          isError: !out.ok,
        });
      } catch (e) {
        return result(id, { content: [{ type: 'text', text: redactKey(`tool error: ${e.message}`, KEY) }], isError: true });
      }
    }
    case 'ping':
      return result(id, {});
    default:
      return error(id, -32601, `method not found: ${method}`);
  }
}

function main() {
  logErr(`ready — cap $${CAP}/session · ledger ${LEDGER} · metered fallback ${METERED_FALLBACK_ENABLED ? (KEY ? 'enabled/key-loaded' : 'enabled/key-missing') : 'disabled'}`);
  let buf = '';
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (chunk) => {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { logErr('bad JSON line, skipping'); continue; }
      handle(msg).catch((e) => logErr(`handler error: ${redactKey(e.message, KEY)}`));
    }
  });
  process.stdin.on('end', () => process.exit(0));
}

// Only run the server when invoked directly (tests import the lib, not this).
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export { TOOLS, handle }; // exported for the test harness
