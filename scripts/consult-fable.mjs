#!/usr/bin/env node
/**
 * consult-fable.mjs — Pure Fable 5 hostile review / Final-Decider ruling via OpenRouter.
 *
 * Fable 5 is the SwanStudios Final Decider (CLAUDE.md Co-Orchestrator Hierarchy). The
 * Claude *subscription* Fable has a hard usage cap; this reaches Fable through the
 * *OpenRouter* wallet instead (verified slug `anthropic/claude-fable-5`, confirmed live
 * in the OpenRouter model catalog 2026-07-08, recorded in config/MODEL_VERSIONS.md).
 *
 * It sends a document (+ optional seed context, e.g. a free-triangle synthesis) to Fable
 * with a Final-Decider hostile-review remit, and saves the verdict to a handoff doc.
 *
 * Usage:
 *   node scripts/consult-fable.mjs --document <path> [--seed <path>] [--out <path>]
 *        [--remit "<override remit>"]
 *
 * Model override: SWAN_FUSION_JUDGE_MODEL (defaults to anthropic/claude-fable-5).
 * Same slug the validation-orchestrator judge honors — so this is ALSO the pattern for
 * Fable-judging a full Village run.
 *
 * Privacy (Rule 8/44/59): loads OPENROUTER_API_KEY from .env into env and uses it ONLY in
 * the Authorization header — never echoed. Keep document/seed to IDs + roles, no PII.
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readForEgress, redactForEgress, fetchForEgress } from './lib/redact-egress.mjs';

const ROOT = process.cwd();

// Load .env — value used in header, never printed. Split on /\r?\n/ (NOT '\n'): these .env files
// are CRLF, and JS regex `.` doesn't match `\r` while `$` won't match before it, so `/^KEY=(.*)$/`
// matches ZERO lines on a '\n'-split CRLF file. (The sibling consult-codex-via-openrouter.mjs has the
// same latent bug — flagged for a Rule-20 sibling fix.)
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
if (!docPath) { console.error('usage: node scripts/consult-fable.mjs --document <path> [--seed <path>] [--out <path>]'); process.exit(1); }
const seedPath = arg('seed');
const MODEL = process.env.SWAN_FUSION_JUDGE_MODEL || 'anthropic/claude-fable-5';

if (!existsSync(docPath)) { console.error(`document not found: ${docPath}`); process.exit(1); }
const doc = readForEgress(docPath, { label: 'document' });
const seed = seedPath && existsSync(seedPath) ? readFileSync(seedPath, 'utf-8') : '';

const defaultRemit = `You are Fable 5 — the Final Decider and head architect for SwanStudios (CLAUDE.md Co-Orchestrator Hierarchy). You have FINAL authority; your verdict LOCKS this plan.

The document below is a build brief that a lower-tier worker-bot will build TO THE LETTER, so ambiguity or a wrong call becomes shipped code. It has ALREADY survived a free triangle hostile review (Claude+Gemini) whose findings are folded in (§8 decisions, §9.1 UX, §10 slices incl. S1.5, §14 audit). A seed block with that triangle verdict follows the document.

Produce a PURE FABLE HOSTILE REVIEW + FINAL RULING:
(a) Ratify / correct / OVERRULE the triangle's dispositions — especially the F10 override (L1->L3 fast path vs forcing L1->L2->L3) and the D2/D3 write-path staging + new S1.5 Data Backbone slice. Agree or decide differently, with reasons.
(b) Attack what BOTH Gemini and Claude MISSED — anything that makes the worker-bot build the wrong thing, hit a data-truth trap, or violate a house rule. Repo reality is in the brief's §2/§4 with file:line — trust it but probe the gaps.
(c) Rule on ALL 8 orchestrator decisions (D1-D8): confirm or override each with a one-line reason.
(d) LOCK the final sequencing (S0, S1, S1.5, S2-S10) — reorder if you'd build it differently.
(e) Name the SINGLE highest-risk thing in the plan and how to de-risk it before build.

Binding house rules (non-negotiable): styled-components only (no MUI); Victory charts only (no Recharts); Crystalline Swan palette via var(--token,#fallback); Dual-Button Glow; 44px touch targets; dark-first; WCAG 4.5:1; <=300 lines/file; zero PII to LLMs (IDs only); no "yoga/meditation" ("stretching"/"flexibility"); credentials = "26+ years / NASM-protocol", never "NASM-certified".

Be concrete, cite section IDs. Do NOT hedge to consensus — you are the final authority. Structure: VERDICT (one line: LOCK / LOCK-WITH-CHANGES / SEND-BACK) -> decision rulings (D1-D8) -> triangle dispositions ratified/overruled -> what to change BEFORE build -> final locked sequence -> single highest risk + de-risk.`;

const remit = arg('remit', defaultRemit);
const prompt = `${remit}\n\n=====================  DOCUMENT UNDER REVIEW  =====================\n\n${doc}\n\n=====================  SEED: FREE-TRIANGLE VERDICT  =====================\n\n${seed || '(no seed provided)'}\n\n=====================  END CONTEXT — PRODUCE YOUR LOCKED RULING NOW  =====================`;

console.log(`[consult-fable] model=${MODEL}`);
console.log(`[consult-fable] prompt size: ${prompt.length} chars (~${Math.round(prompt.length / 4)} tokens)`);
console.log('[consult-fable] sending request...');
const t0 = Date.now();

const res = await fetchForEgress('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'HTTP-Referer': 'https://sswanstudios.com',
    'X-Title': 'SwanStudios Fable Final-Decider Review',
  },
  body: JSON.stringify({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: Number(process.env.SWAN_FABLE_MAX_TOKENS || 16000),
    temperature: 0.25,
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

// Content extraction, defensively. 2026-08-22: a Final-Decider run billed 30,260
// in / 263 out ($0.32) and wrote "(empty response)" because this line reads ONLY
// `message.content`. Anthropic models via OpenRouter may return content as an
// ARRAY of blocks, or put text in `message.reasoning` when reasoning is on, and a
// refusal can land in neither. Reading one field turned a paid call into nothing
// and gave no diagnostic. Now: try every shape, and if all are empty, DUMP the
// message envelope so the next failure is debuggable without re-spending.
const _msg = data.choices?.[0]?.message ?? {};
const _fromContent = Array.isArray(_msg.content)
  ? _msg.content.map((b) => (typeof b === 'string' ? b : b?.text ?? '')).join('')
  : (typeof _msg.content === 'string' ? _msg.content : '');
const text = (_fromContent || _msg.reasoning || _msg.refusal || '').trim()
  || `(empty response)

finish_reason: ${data.choices?.[0]?.finish_reason ?? 'unknown'}
message envelope keys: ${Object.keys(_msg).join(', ') || '(none)'}
raw message (truncated):
${JSON.stringify(_msg).slice(0, 2000)}`;
const inTok = data.usage?.prompt_tokens || 0;
const outTok = data.usage?.completion_tokens || 0;
// Fable pricing (OpenRouter catalog 2026-07-08): $10/M in, $50/M out.
const cost = (inTok / 1_000_000) * 10 + (outTok / 1_000_000) * 50;
const wallSec = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`[consult-fable] response in ${wallSec}s — tokens ${inTok} in / ${outTok} out — cost ~$${cost.toFixed(4)}`);

const outPath = arg('out', 'docs/ai-workflow/AI-HANDOFF/FABLE-FINAL-RULING.md');
const outContent = `# Fable 5 — Final-Decider Ruling\n\n**Reviewer:** OpenRouter \`${MODEL}\` (Fable via OpenRouter credits; Claude-subscription Fable was capped)\n**Document:** ${docPath}\n**Seed:** ${seedPath || '(none)'}\n**Tokens:** ${inTok} in / ${outTok} out · **Cost:** ~$${cost.toFixed(4)} · **Wall:** ${wallSec}s\n\n---\n\n${text}\n`;
writeFileSync(outPath, outContent, 'utf-8');
console.log(`[consult-fable] saved -> ${outPath}`);
