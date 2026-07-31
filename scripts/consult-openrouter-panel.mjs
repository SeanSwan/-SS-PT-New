#!/usr/bin/env node
/**
 * Generic single-shot design/review consult via OpenRouter.
 * =========================================================
 * Sends ONE document to ONE named model and writes the reply to --out.
 * Built 2026-07-30 for the Runner-Styles design panel (Sol 5.6 + Opus 5);
 * Kimi consults stay on scripts/consult-kimi.mjs (its own policy/cap).
 *
 * Usage:
 *   node scripts/consult-openrouter-panel.mjs \
 *     --model openai/gpt-5.6-sol \
 *     --document docs/path/to/packet.md \
 *     --out docs/path/to/reply.md \
 *     [--label "GPT Sol 5.6"] [--confirm-spend]
 *
 * Safety: dry-run by default (prints request shape, no API call, no spend).
 * --confirm-spend makes the ONE live call. max_tokens hard-capped.
 * Rule 59: the API key is read into memory only — never printed.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const ROOT = process.cwd();
for (const envPath of [join(ROOT, '.env'), join(ROOT, 'backend', '.env')]) {
  if (existsSync(envPath)) {
    for (const rawLine of readFileSync(envPath, 'utf-8').split('\n')) {
      // CRLF guard: JS '.' does not match '\r', so '(.*)$' fails on
      // Windows-edited .env lines unless the trailing '\r' is stripped.
      const line = rawLine.replace(/\r$/, '');
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const model = opt('model');
const documentPath = opt('document');
const outPath = opt('out');
const label = opt('label') || model;
const live = args.includes('--confirm-spend');

if (!model || !documentPath || !outPath) {
  console.error('Usage: consult-openrouter-panel.mjs --model <id> --document <md> --out <md> [--label <name>] [--confirm-spend]');
  process.exit(1);
}
if (!existsSync(documentPath)) {
  console.error(`Document not found: ${documentPath}`);
  process.exit(1);
}

// Reasoning models (e.g. Opus 5) can burn the whole budget on hidden
// reasoning and return null content — cap reasoning, keep headroom.
//
// max_tokens is a CEILING, not a charge: you are billed for tokens actually
// emitted, so a high ceiling costs nothing on short replies. Raised 16k → 60k
// on 2026-07-30 after an Opus 5 bootcamp consult truncated mid-sentence at the
// old cap and the script reported success anyway (see finish_reason guard below).
const MAX_TOKENS = Number(process.env.PANEL_MAX_TOKENS) || 60000;
const REASONING_MAX = Number(process.env.PANEL_REASONING_MAX) || 16000;
const document = readFileSync(documentPath, 'utf-8');
const system = `You are ${label}, consulted as an elite mobile product/UX designer and frontend architect by SwanStudios (a premium personal-training SaaS; dark-first "Crystalline Swan" brand: deep sapphire surfaces, Ice Wing cyan #60C0F0 accents, Gilded Fern gold #C6A84B for earned states, Wing Purple #8B5CF6 for AI-coach elements). Answer the consult packet's questions directly, ranked, and concretely. Be adversarial where the plan is weak — vague praise is useless. Markdown output.`;

console.log(`[panel] model=${model} doc=${documentPath} (${document.length} chars) out=${outPath} mode=${live ? 'LIVE' : 'DRY-RUN'}`);
if (!live) {
  console.log('[panel] dry-run: no API call made. Re-run with --confirm-spend.');
  process.exit(0);
}

const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY;
if (!apiKey) {
  console.error('OPENROUTER_API_KEY not found in env or .env files');
  process.exit(1);
}

const call = (withReasoning) =>
  fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      ...(withReasoning ? { reasoning: { max_tokens: REASONING_MAX } } : {}),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: document },
      ],
    }),
  });

let res = await call(true);
if (!res.ok && res.status >= 400 && res.status < 500) {
  // Non-reasoning providers can reject the reasoning field — retry once without.
  console.error(`[panel] HTTP ${res.status} with reasoning param — retrying without it`);
  res = await call(false);
}
if (!res.ok) {
  console.error(`[panel] HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
  process.exit(1);
}
const data = await res.json();

// Truncation detection runs BEFORE the empty-reply check. A reasoning model can
// spend the entire budget on hidden reasoning and return content:null — that is a
// cap problem, not an empty response, and reporting it as "empty reply" sends the
// operator hunting the wrong bug. OpenRouter sets finish_reason 'length'; some
// providers only set native_finish_reason 'max_tokens', so check both.
const finish = data?.choices?.[0]?.finish_reason ?? data?.choices?.[0]?.native_finish_reason ?? null;
const truncated = finish === 'length' || finish === 'max_tokens';

const reply = data?.choices?.[0]?.message?.content;
if (!reply) {
  if (truncated) {
    console.error(
      `[panel] TRUNCATED WITH NO CONTENT — the model hit max_tokens (${MAX_TOKENS}) before emitting any`
      + ` visible text (reasoning consumed the budget). Raise PANEL_MAX_TOKENS and/or lower`
      + ` PANEL_REASONING_MAX (currently ${REASONING_MAX}). Nothing was written.`,
    );
    process.exit(2);
  }
  console.error(`[panel] empty reply: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
const usage = data?.usage || {};
const banner = truncated
  ? `> ⚠ **TRUNCATED** — the model hit max_tokens (${MAX_TOKENS}) and its reply is INCOMPLETE.\n`
    + `> Do not treat the tail as a finished thought. Re-run with a higher PANEL_MAX_TOKENS,\n`
    + `> or split the packet into narrower consults.\n\n`
  : '';

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  `# Consult reply — ${label} (${model}) — ${new Date().toISOString()}\n\n` +
    `> tokens: prompt=${usage.prompt_tokens ?? '?'} completion=${usage.completion_tokens ?? '?'}`
    + ` | finish_reason: ${finish ?? '?'} | max_tokens: ${MAX_TOKENS}\n\n${banner}${reply}\n`,
  'utf-8',
);
console.log(`[panel] wrote ${outPath} (${reply.length} chars; completion=${usage.completion_tokens ?? '?'} tok; finish=${finish ?? '?'})`);
if (truncated) {
  console.error(`[panel] ⚠ TRUNCATED at max_tokens=${MAX_TOKENS}. Reply is incomplete — raise PANEL_MAX_TOKENS or narrow the packet.`);
  process.exit(2);
}
