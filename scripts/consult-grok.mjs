#!/usr/bin/env node
/**
 * consult-grok.mjs — Grok 4.6 solo hostile review via OpenRouter.
 *
 * Added 2026-08-20 by Sean's directive: Grok 4.6 joins the hostile-review
 * panel (consult-panel.mjs) alongside GLM 5.3, Kimi K3, GPT-5.6 Sol Pro and
 * local Qwen, with Fable 5 as the final-decider seat.
 *
 * RULE-12 NOTE: the historical "No Grok/X-AI models" rule was repealed by
 * Sean 2026-08-20 (constitution PR #54, chore/rule12-grok-repeal). This seat
 * exists on that authority. If PR #54 is ever reverted, retire this script.
 *
 * This is the Grok-only sibling of consult-sol.mjs / consult-kimi.mjs: it
 * sends a document (+ optional seed context) to Grok 4.6 with the hostile-gate
 * remit and saves the verdict.
 *
 * Usage:
 *   node scripts/consult-grok.mjs --document <path> [--seed <path>] [--out <path>]
 *        [--remit "<override remit>"] [--effort low|medium|high]
 *
 * Model override:   SWAN_GROK_MODEL  (defaults to x-ai/grok-4.6)
 * Reasoning effort: SWAN_GROK_EFFORT (defaults to high) — passed as reasoning.effort.
 * Paid-call policy: exactly one request; provider errors are surfaced without retry.
 *
 * Pricing, OpenRouter catalog verified 2026-08-20: $2.00/M in, $6.00/M out
 * (cache reads $0.50/M; 500K context). Re-check with:
 *   curl -s https://openrouter.ai/api/v1/models | grep -A2 grok-4.6
 *
 * Privacy (Rule 8/44/59): loads OPENROUTER_API_KEY from .env into env and uses it ONLY in the
 * Authorization header — never echoed. Keep document/seed to IDs + roles, no PII.
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { readForEgress } from './lib/redact-egress.mjs';

const ROOT = process.cwd();

// Load .env — value used in header, never printed. Split on /\r?\n/ (NOT '\n'): these .env files
// are CRLF, and a '\n'-split leaves a trailing '\r' on every value so `/^KEY=(.*)$/` mis-captures.
for (const envPath of [join(ROOT, '.env'), join(ROOT, 'backend', '.env')]) {
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY;
if (!apiKey) { console.error('OPENROUTER_API_KEY not found in env or .env files'); process.exit(1); }

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const docPath = arg('document');
if (!docPath) { console.error('usage: node scripts/consult-grok.mjs --document <path> [--seed <path>] [--out <path>] [--effort high]'); process.exit(1); }
const seedPath = arg('seed');
const MODEL = process.env.SWAN_GROK_MODEL || 'x-ai/grok-4.6';

// This transport is SHARED: Grok, both DeepSeek V4 seats and Ox Alpha all ride it via
// SWAN_GROK_MODEL (one streaming/watchdog/truncation implementation to keep correct).
// Everything user-visible must therefore name the model ACTUALLY running, not "Grok".
// Before 2026-08-22 the report title, the OpenRouter X-Title and the default remit all
// hard-coded "Grok 4.6", so a DeepSeek or Ox review was filed under Grok's name - and the
// default remit went further and TOLD the model "You are Grok 4.6", handing it a false
// identity. Misattributed reviews are worse than missing ones: per-model calibration is
// how we learn which seat is worth what, and that is impossible if three seats file
// under one name.
const MODEL_LABELS = {
  'x-ai/grok-4.6': 'Grok 4.6',
  'deepseek/deepseek-v4-pro': 'DeepSeek V4 Pro',
  'deepseek/deepseek-v4-flash': 'DeepSeek V4 Flash',
  'stealth/ox-alpha': 'Ox Alpha',
};
const MODEL_LABEL = MODEL_LABELS[MODEL] || MODEL;
const EFFORT = arg('effort', process.env.SWAN_GROK_EFFORT || 'high');

if (!existsSync(docPath)) { console.error(`document not found: ${docPath}`); process.exit(1); }
// Egress gate (2026-08-22): never send a document straight off disk. readForEgress
// strips operator identity + absolute paths + secret shapes, and proves itself on a
// canary first — an unvalidated "clean" is what leaked a username to six vendors.
const doc = readForEgress(docPath, { label: 'document' });
const seed = seedPath && existsSync(seedPath) ? readForEgress(seedPath, { label: 'seed' }) : '';

const defaultRemit = `You are ${MODEL_LABEL} — a rigorous, high-reasoning hostile gate reviewer on the SwanStudios review panel (CLAUDE.md Co-Orchestrator Hierarchy). Review the document below at HIGH reasoning effort and try to break it.

Produce:
(a) VERDICT (one line: APPROVE / REVISE / REJECT), with file:line-grade evidence where the doc provides it.
(b) Correctness attacks: happy-path-only logic, null/undefined/type mismatches, stale state / race conditions, off-by-one, error-path gaps.
(c) Security attacks: authn/authz + IDOR, injection, SSRF, secret handling, replay/idempotency, multi-tenant scope leaks, rate-limit/DoS.
(d) Data-truth / schema-drift (CLAUDE.md Rule 58): model column vs caller field drift, PascalCase-vs-snake_case table drift, FK target drift, frontend response-shape drift.
(e) House-rule violations and any speculative-success language ("should be fixed", "looks good") without a named verified path.
(f) The SINGLE highest-risk item and how to de-risk it before build/ship.

Binding house rules (non-negotiable): styled-components only (no MUI); Victory charts only (no Recharts); Crystalline Swan palette via var(--token,#fallback); Dual-Button Glow; 44px touch targets; dark-first; WCAG 4.5:1; <=300 lines/file; zero PII to LLMs (IDs only); no "yoga/meditation" ("stretching"/"flexibility"); credentials = "26+ years / NASM-protocol", never "NASM-certified".

Be concrete and specific. Do NOT hedge to consensus — give your real engineering judgment.`;

const remit = arg('remit', defaultRemit);
const prompt = `${remit}\n\n=====================  DOCUMENT UNDER REVIEW  =====================\n\n${doc}\n\n=====================  SEED CONTEXT (optional)  =====================\n\n${seed || '(no seed provided)'}\n\n=====================  END CONTEXT — PRODUCE YOUR REVIEW NOW  =====================`;

console.log(`[consult-grok] model=${MODEL} effort=${EFFORT}`);
console.log(`[consult-grok] prompt size: ${prompt.length} chars (~${Math.round(prompt.length / 4)} tokens)`);
console.log('[consult-grok] sending request...');
const t0 = Date.now();

// STREAMING is required, not optional (2026-08-21 incident: a Grok 4.6 run that
// reasoned for >600s was killed by AbortSignal.timeout waiting for response
// HEADERS, and the ENTIRE response was lost — $0 of value for 25 minutes of
// reasoning). consult-glm.mjs documented this exact failure class and its fix on
// 2026-08-16; the fix never swept sideways to this sibling (Rule 20). Streaming
// returns headers immediately, so the header clock never starts. The remaining
// hang risk is a stalled STREAM, guarded by an idle watchdog below — the abort
// fires only after IDLE_MS with no bytes, never on total duration, so a model may
// reason as long as it keeps the stream alive.
//
// CEILING raised 16000 → 48000 default (SWAN_GROK_MAX_TOKENS / --max-tokens to
// override). 2026-08-21 incident: reasoning models spend output budget on hidden
// thinking — DeepSeek V4 Flash burned all 16k reasoning and emitted NOTHING
// ($0.102 for an empty reply); V4 Pro truncated after 1 of 7 remit sections.
// 16k was a ceiling on the ANSWER sized without accounting for reasoning.
// Worst case at 48k: grok-4.6 ≈ $0.29 out, deepseek-v4-pro ≈ $0.17 out.
const MAX_TOKENS = Number(arg('max-tokens', process.env.SWAN_GROK_MAX_TOKENS || '48000'));
const IDLE_MS = 300_000;

const idleController = new AbortController();
let idleTimer = setTimeout(() => idleController.abort(new Error(`stream idle >${IDLE_MS / 1000}s`)), IDLE_MS);
const pokeIdle = () => {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => idleController.abort(new Error(`stream idle >${IDLE_MS / 1000}s`)), IDLE_MS);
};

const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'HTTP-Referer': 'https://sswanstudios.com',
    'X-Title': `SwanStudios ${MODEL_LABEL} Gate Review`,
  },
  body: JSON.stringify({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: MAX_TOKENS,
    temperature: 0.2,
    stream: true,
    // OpenRouter: emits a final SSE chunk carrying usage when asked for it.
    usage: { include: true },
    reasoning: { effort: EFFORT },
  }),
  signal: idleController.signal,
});

if (!res.ok) {
  clearTimeout(idleTimer);
  const errBody = await res.text().catch(() => '');
  console.error(`OpenRouter ${res.status}: ${errBody.slice(0, 1500)}`);
  // Exit 75 (EX_TEMPFAIL, sysexits.h) for PROVIDER-TRANSIENT failures — 429 rate
  // limit, 5xx upstream — so a launcher can tell "retry shortly" from "you are
  // misconfigured." Before this, both were exit 1: the Ox launcher's 429 retry
  // logic also backed off 60s on a missing API key, N times, for nothing. A
  // config failure (4xx other than 429) stays exit 1 and must never be retried.
  const transient = res.status === 429 || res.status >= 500;
  process.exit(transient ? 75 : 1);
}

let text = '';
let finish = null;
let usage = {};
// The model the provider says it ACTUALLY served. Distinct from MODEL, which is
// only what we asked for. Reporting the request as though it were the response
// makes any downstream identity check tautological — it compares our own env var
// with itself and passes no matter which model replied. OpenRouter echoes the
// served model on its SSE chunks; capture it and let the report state both.
let servedModel = null;
let buffer = '';
let lastTick = Date.now();
const decoder = new TextDecoder();

try {
  for await (const chunk of res.body) {
    pokeIdle();
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const payload = t.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const j = JSON.parse(payload);
        if (j.error) { console.error('API error mid-stream:', JSON.stringify(j.error).slice(0, 500)); }
        const choice = j.choices?.[0];
        if (choice?.delta?.content) text += choice.delta.content;
        if (choice?.finish_reason) finish = choice.finish_reason;
        if (j.usage) usage = j.usage;
        if (typeof j.model === 'string' && j.model) servedModel = j.model;
      } catch { /* partial SSE frame — completed by the next chunk */ }
    }
    if (Date.now() - lastTick > 20_000) {
      console.log(`[consult-grok] streaming... ${text.length} chars`);
      lastTick = Date.now();
    }
  }
} finally {
  clearTimeout(idleTimer);
}

if (!text) text = '(empty response)';

// Truncation guard (lesson from the 2026-07-30 Sol incident: a reply that hit
// max_tokens was reported as success). Exit 2 = partial reply written.
const truncated = finish === 'length' || finish === 'max_tokens';

const inTok = usage?.prompt_tokens || 0;
const outTok = usage?.completion_tokens || 0;
// OpenRouter's streamed usage chunk carries authoritative cost when available.
// Fall back to the known per-model table; anything else reports 'unknown' rather
// than printing a false number (this header hardcoded Grok pricing while
// SWAN_GROK_MODEL let any model run through it — DeepSeek runs got Grok math).
// Pricing verified against the live OpenRouter catalog 2026-08-21, $/M in|out.
const PRICES = {
  'x-ai/grok-4.6': [2.0, 6.0],
  // Catalog re-verified 2026-08-21: the UNDATED alias is far cheaper than the
  // dated deepseek-v4-pro-0813 snapshot ($1.19/$3.56) this table used to carry.
  'deepseek/deepseek-v4-pro': [0.48, 0.96],
  'deepseek/deepseek-v4-pro-0813': [1.19, 3.56],
  'deepseek/deepseek-v4-flash': [0.073, 0.145],
};
const cost = typeof usage?.cost === 'number'
  ? usage.cost
  : PRICES[MODEL]
    ? (inTok / 1_000_000) * PRICES[MODEL][0] + (outTok / 1_000_000) * PRICES[MODEL][1]
    : null;
const costLabel = cost === null ? 'unknown (model not in price table)' : `~$${cost.toFixed(4)}`;
const wallSec = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`[consult-grok] response in ${wallSec}s — tokens ${inTok} in / ${outTok} out — cost ${costLabel}`);

// Record ACTUAL spend to the ledger the spend-guard's cumulative caps read.
// Found 2026-08-24: spend-ledger.mjs exported recordSpend() and NOTHING called it,
// so spentOnTopic()/spentToday() summed a near-empty file and the per-topic and
// per-day caps were structurally incapable of firing — a 15-round $5.43 debate
// through this very transport left zero entries. This is the insertion point the
// review prescribed: actuals only (never the pre-call estimate — the guard's hook
// already prices worst-case, and recording estimates would double-count), after
// the reply exists, attributed to the SERVED model when the provider reported one.
// Fail-open: a ledger problem must never break a consult that already succeeded.
try {
  const { recordSpend, topicFromPath } = await import('./lib/spend-ledger.mjs');
  // topicFromPath: the SAME normalizer the spend-guard hook uses, so the writer's
  // key and the guard's key cannot diverge (they did — strict-equality match, two
  // schemes, cap silently never accumulated for some docs). `usd: cost` passes null
  // through on purpose: the ledger records unpriced calls as null and its readers
  // count null as worst-case. `cost ?? 0` here used to write a confident $0.00.
  recordSpend({
    model: servedModel || MODEL,
    topic: topicFromPath(docPath),
    usd: cost,
    note: `consult-grok transport (${MODEL_LABEL}); cost=${cost === null ? 'unpriced' : (typeof usage?.cost === 'number' ? 'provider-actual' : 'table-estimate')}`,
  });
  if (cost === null) console.warn(`[consult-grok] ⚠ UNPRICED call recorded as worst-case (per-call cap) — add ${MODEL} to PRICES.`);
} catch (e) {
  console.warn(`[consult-grok] spend-ledger write failed (non-fatal): ${String(e.message).slice(0, 120)}`);
}

const outPath = arg('out', 'docs/ai-workflow/AI-HANDOFF/GROK-GATE-REVIEW.md');
const banner = truncated
  ? `> ⚠ **TRUNCATED** — the model hit max_tokens (${MAX_TOKENS}) and this reply is INCOMPLETE.\n\n`
  : '';
// `Reviewer` is what we REQUESTED; `Served` is what the provider says it RAN.
// A downstream gate must key on Served — Reviewer is our own input echoed back,
// so checking it proves the env var arrived, not that the right model answered.
// `unreported` means the provider sent no model field: unknown, never assume match.
const servedLine = `**Served:** \`${servedModel || 'unreported'}\`${servedModel && servedModel !== MODEL ? '  ⚠ **SUBSTITUTED** — provider served a different model than requested' : ''}\n`;
const outContent = `# ${MODEL_LABEL} — Hostile Gate Review\n\n**Reviewer:** OpenRouter \`${MODEL}\` (effort: ${EFFORT})\n${servedLine}**Document:** ${docPath}\n**Seed:** ${seedPath || '(none)'}\n**Tokens:** ${inTok} in / ${outTok} out · **Cost:** ${costLabel} · **Wall:** ${wallSec}s · **finish:** ${finish ?? '?'}\n\n---\n\n${banner}${text}\n`;
writeFileSync(outPath, outContent, 'utf-8');
console.log(`[consult-grok] saved -> ${outPath}`);
if (truncated) {
  console.error('[consult-grok] ⚠ TRUNCATED at max_tokens — reply is incomplete.');
  process.exit(2);
}
