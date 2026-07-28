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
 * Model override:   SWAN_SOL_MODEL  (defaults to openai/gpt-5.6-sol; openai/gpt-5.6-sol-pro is a
 *                   same-priced max-reasoning variant)
 * Reasoning effort: SWAN_SOL_EFFORT (defaults to high) — passed as reasoning.effort.
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
if (!docPath) { console.error('usage: node scripts/consult-sol.mjs --document <path> [--seed <path>] [--out <path>] [--effort high]'); process.exit(1); }
const seedPath = arg('seed');
const MODEL = process.env.SWAN_SOL_MODEL || 'openai/gpt-5.6-sol';
const EFFORT = arg('effort', process.env.SWAN_SOL_EFFORT || 'high');

if (!existsSync(docPath)) { console.error(`document not found: ${docPath}`); process.exit(1); }
const doc = readFileSync(docPath, 'utf-8');
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
const t0 = Date.now();

const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'HTTP-Referer': 'https://sswanstudios.com',
    'X-Title': 'SwanStudios GPT-5.6 Sol Gate Review',
  },
  body: JSON.stringify({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 16000,
    temperature: 0.2,
    reasoning: { effort: EFFORT },
  }),
  signal: AbortSignal.timeout(600_000),
});

if (!res.ok) {
  const errBody = await res.text().catch(() => '');
  console.error(`OpenRouter ${res.status}: ${errBody.slice(0, 1500)}`);
  process.exit(1);
}

const data = await res.json();
if (data.error) { console.error('API error:', data.error); process.exit(1); }

const text = data.choices?.[0]?.message?.content || '(empty response)';
const inTok = data.usage?.prompt_tokens || 0;
const outTok = data.usage?.completion_tokens || 0;
// GPT-5.6 Sol pricing (OpenRouter catalog 2026-07-17): $5/M in, $30/M out.
const cost = (inTok / 1_000_000) * 5 + (outTok / 1_000_000) * 30;
const wallSec = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`[consult-sol] response in ${wallSec}s — tokens ${inTok} in / ${outTok} out — cost ~$${cost.toFixed(4)}`);

const outPath = arg('out', 'docs/ai-workflow/AI-HANDOFF/SOL-GATE-REVIEW.md');
const outContent = `# GPT-5.6 Sol — Hostile Gate Review\n\n**Reviewer:** OpenRouter \`${MODEL}\` (effort: ${EFFORT})\n**Document:** ${docPath}\n**Seed:** ${seedPath || '(none)'}\n**Tokens:** ${inTok} in / ${outTok} out · **Cost:** ~$${cost.toFixed(4)} · **Wall:** ${wallSec}s\n\n---\n\n${text}\n`;
writeFileSync(outPath, outContent, 'utf-8');
console.log(`[consult-sol] saved -> ${outPath}`);
