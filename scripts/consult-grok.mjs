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
 * Reasoning effort: SWAN_GROK_EFFORT (defaults to high) — passed as reasoning.effort;
 *                   if the provider rejects the reasoning param (4xx), we retry once without it.
 *
 * Pricing, OpenRouter catalog verified 2026-08-20: $2.00/M in, $6.00/M out
 * (cache reads $0.50/M; 500K context). Re-check with:
 *   curl -s https://openrouter.ai/api/v1/models | grep -A2 grok-4.6
 *
 * Privacy (Rule 8/44/59): loads OPENROUTER_API_KEY from .env into env and uses it ONLY in the
 * Authorization header — never echoed. Keep document/seed to IDs + roles, no PII.
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
const EFFORT = arg('effort', process.env.SWAN_GROK_EFFORT || 'high');

if (!existsSync(docPath)) { console.error(`document not found: ${docPath}`); process.exit(1); }
const doc = readFileSync(docPath, 'utf-8');
const seed = seedPath && existsSync(seedPath) ? readFileSync(seedPath, 'utf-8') : '';

const defaultRemit = `You are Grok 4.6 — a rigorous, high-reasoning hostile gate reviewer on the SwanStudios review panel (CLAUDE.md Co-Orchestrator Hierarchy). Review the document below at HIGH reasoning effort and try to break it.

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

const call = (withReasoning) =>
  fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://sswanstudios.com',
      'X-Title': 'SwanStudios Grok 4.6 Gate Review',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 16000,
      temperature: 0.2,
      ...(withReasoning ? { reasoning: { effort: EFFORT } } : {}),
    }),
    signal: AbortSignal.timeout(600_000),
  });

let res = await call(true);
if (!res.ok && res.status >= 400 && res.status < 500) {
  // Some providers reject the reasoning param — retry once without it rather
  // than dying as a failed seat (pattern from consult-openrouter-panel.mjs).
  console.error(`[consult-grok] HTTP ${res.status} with reasoning param — retrying without it`);
  res = await call(false);
}

if (!res.ok) {
  const errBody = await res.text().catch(() => '');
  console.error(`OpenRouter ${res.status}: ${errBody.slice(0, 1500)}`);
  process.exit(1);
}

const data = await res.json();
if (data.error) { console.error('API error:', data.error); process.exit(1); }

// Truncation guard (lesson from the 2026-07-30 Sol incident: a reply that hit
// max_tokens was reported as success). Exit 2 = partial reply written.
const finish = data.choices?.[0]?.finish_reason ?? data.choices?.[0]?.native_finish_reason ?? null;
const truncated = finish === 'length' || finish === 'max_tokens';

const text = data.choices?.[0]?.message?.content || '(empty response)';
const inTok = data.usage?.prompt_tokens || 0;
const outTok = data.usage?.completion_tokens || 0;
// Grok 4.6 pricing, verified against the live OpenRouter catalog 2026-08-20:
// $2.00/M in, $6.00/M out.
const cost = (inTok / 1_000_000) * 2 + (outTok / 1_000_000) * 6;
const wallSec = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`[consult-grok] response in ${wallSec}s — tokens ${inTok} in / ${outTok} out — cost ~$${cost.toFixed(4)}`);

const outPath = arg('out', 'docs/ai-workflow/AI-HANDOFF/GROK-GATE-REVIEW.md');
const banner = truncated
  ? `> ⚠ **TRUNCATED** — the model hit max_tokens (16000) and this reply is INCOMPLETE.\n\n`
  : '';
const outContent = `# Grok 4.6 — Hostile Gate Review\n\n**Reviewer:** OpenRouter \`${MODEL}\` (effort: ${EFFORT})\n**Document:** ${docPath}\n**Seed:** ${seedPath || '(none)'}\n**Tokens:** ${inTok} in / ${outTok} out · **Cost:** ~$${cost.toFixed(4)} · **Wall:** ${wallSec}s · **finish:** ${finish ?? '?'}\n\n---\n\n${banner}${text}\n`;
writeFileSync(outPath, outContent, 'utf-8');
console.log(`[consult-grok] saved -> ${outPath}`);
if (truncated) {
  console.error('[consult-grok] ⚠ TRUNCATED at max_tokens — reply is incomplete.');
  process.exit(2);
}
