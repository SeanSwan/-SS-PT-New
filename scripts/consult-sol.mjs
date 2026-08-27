#!/usr/bin/env node
/**
 * consult-sol.mjs — Pure GPT-5.6 Sol solo review via OpenRouter (high-reasoning engineering gate).
 *
 * GPT-5.6 Sol is the third member of the SwanStudios "big three" review panel alongside
 * Fable 5 and Kimi K3 (CLAUDE.md Co-Orchestrator Hierarchy). Sol is the highest-reasoning
 * GPT-5.6 tier and a strong Codex-equivalent hostile reviewer for correctness/security/data-truth.
 * Run at HIGH thinking effort by default (Sean's directive).
 *
 * This is the Sol-only sibling of consult-fable.mjs / consult-kimi.mjs: it sends a document
 * (+ optional seed context) to Sol with a rigorous hostile-gate remit and saves the verdict.
 *
 * Usage:
 *   node scripts/consult-sol.mjs --document <path> [--seed <path>] [--out <path>]
 *        [--remit "<override remit>"] [--effort low|medium|high]
 *
 * Model override:   SWAN_SOL_MODEL  (defaults to openai/gpt-5.6-sol; openai/gpt-5.6-sol-pro is the
 *                   same weights at the same price, served with reasoning.mode=pro for higher
 *                   quality on complex tasks — prefer it for hostile review)
 *
 * Do NOT set this to openai/gpt-5.6-sol-pro:batch. That listing is genuinely 50% off
 * ($1.25/M in, $7.50/M out) but is served by OpenRouter's ASYNC Batch API on a 24-hour
 * completion window — it is not reachable from this synchronous /chat/completions call.
 * On a typical review packet the discount saves roughly $0.09. See consult-panel.mjs.
 * Reasoning effort: SWAN_SOL_EFFORT (defaults to high) — passed as reasoning.effort.
 *
 * Privacy (Rule 8/44/59): loads OPENROUTER_API_KEY from .env into env and uses it ONLY in the
 * Authorization header — never echoed. Keep document/seed to IDs + roles, no PII.
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { streamChatCompletion } from './lib/openrouter-stream.mjs';
import { readForEgress, redactForEgress } from './lib/redact-egress.mjs';

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
if (!docPath) { console.error('usage: node scripts/consult-sol.mjs --document <path> [--seed <path>] [--out <path>] [--effort high]'); process.exit(1); }
const seedPath = arg('seed');
const MODEL = process.env.SWAN_SOL_MODEL || 'openai/gpt-5.6-sol';
const EFFORT = arg('effort', process.env.SWAN_SOL_EFFORT || 'high');

if (!existsSync(docPath)) { console.error(`document not found: ${docPath}`); process.exit(1); }
const doc = readForEgress(docPath, { label: 'document' });
const seed = seedPath && existsSync(seedPath) ? readFileSync(seedPath, 'utf-8') : '';

const defaultRemit = `You are GPT-5.6 Sol — a rigorous, high-reasoning hostile gate reviewer for SwanStudios (CLAUDE.md Co-Orchestrator Hierarchy), a Codex-equivalent. Review the document below at HIGH reasoning effort and try to break it.

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

console.log(`[consult-sol] model=${MODEL} effort=${EFFORT}`);
console.log(`[consult-sol] prompt size: ${prompt.length} chars (~${Math.round(prompt.length / 4)} tokens)`);
console.log('[consult-sol] sending request...');
// Streaming via the shared helper (2026-08-21). This script previously did a
// non-streaming POST behind a 600s header-timeout abort with max_tokens 16000
// and NO truncation guard - the priciest seat on the panel could lose its entire
// reply past 600s, or be silently cut at 16k and reported as success. See
// scripts/lib/openrouter-stream.mjs for the failure class.
const MAX_TOKENS = Number(arg('max-tokens', process.env.SWAN_SOL_MAX_TOKENS || '48000'));
let streamed;
try {
  streamed = await streamChatCompletion({
    apiKey, model: MODEL, prompt, maxTokens: MAX_TOKENS, effort: EFFORT,
    title: 'SwanStudios GPT-5.6 Sol Gate Review', label: 'consult-sol',
  });
} catch (err) {
  console.error(`[consult-sol] ${err.message}`);
  process.exit(1);
}
const { finish, usage, truncated, wallSec } = streamed;
const text = streamed.text || '(empty response)';
const inTok = usage?.prompt_tokens || 0;
const outTok = usage?.completion_tokens || 0;
// Prefer OpenRouter's authoritative usage.cost; fall back to the catalog rate
// for the model actually used (sol and sol-pro both list $2/M in, $10/M out as
// of 2026-08-21; batch variants half that). Unknown model -> 'unknown', never a
// false number.
const PRICES = {
  'openai/gpt-5.6-sol': [2, 10], 'openai/gpt-5.6-sol-pro': [2, 10],
  'openai/gpt-5.6-sol:batch': [1, 5], 'openai/gpt-5.6-sol-pro:batch': [1, 5],
};
const cost = typeof usage?.cost === 'number' ? usage.cost
  : PRICES[MODEL] ? (inTok / 1e6) * PRICES[MODEL][0] + (outTok / 1e6) * PRICES[MODEL][1] : null;
const costLabel = cost === null ? 'unknown (model not in price table)' : `~$${cost.toFixed(4)}`;

console.log(`[consult-sol] response in ${wallSec}s — tokens ${inTok} in / ${outTok} out — cost ${costLabel} — finish ${finish ?? '?'}`);

const outPath = arg('out', 'docs/ai-workflow/AI-HANDOFF/SOL-GATE-REVIEW.md');
const banner = truncated ? `> ⚠ **TRUNCATED** — the model hit max_tokens (${MAX_TOKENS}) and this reply is INCOMPLETE.

` : '';
const outContent = `# GPT-5.6 Sol — Hostile Gate Review

**Reviewer:** OpenRouter \`${MODEL}\` (effort: ${EFFORT})
**Document:** ${docPath}
**Seed:** ${seedPath || '(none)'}
**Tokens:** ${inTok} in / ${outTok} out · **Cost:** ${costLabel} · **Wall:** ${wallSec}s · **finish:** ${finish ?? '?'}

---

${banner}${text}
`;
writeFileSync(outPath, outContent, 'utf-8');
console.log(`[consult-sol] saved -> ${outPath}`);
if (truncated) { console.error('[consult-sol] TRUNCATED reply written — exit 2'); process.exit(2); }
