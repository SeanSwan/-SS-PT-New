#!/usr/bin/env node
/**
 * Astra Pro consult — Mega Blueprints v3.1 architecture authority.
 *
 * Sean's request (2026-09-19): run Astra Pro via OpenRouter and have it apply the
 * fable-blueprint-forge doctrine to produce (A) a hostile review of the current
 * social-bridge state WITH FIXES, then (B) the complete forged build package for
 * the remaining work (S5-S8 + the three.js enhancement) — wireframes, Mermaid
 * diagrams, contracts, and executable acceptance criteria.
 *
 * WHY STREAMING. The requested reply is eight documents plus a hostile review plus
 * a self-test — plausibly 40-60k output tokens. A non-streaming request that dies
 * at 90% loses the entire (paid) generation. Streaming persists partial output
 * continuously, so a failure is recoverable rather than total. finish_reason and
 * usage are still captured from the terminal frame, so truncation is still
 * detectable — streaming costs us no diagnostics.
 *
 * WHY THE COST CAP. Astra Pro is $10/M in, $50/M out. A 100k-token reply is ~$5.
 * This refuses to send unless the worst case fits a hard cap.
 *
 * WHY fetchForEgress. Rule 8 / the 2026-08-22 egress incident: 140 operator-identity
 * occurrences reached six vendors while a scan reported clean. The redactor and the
 * fail-closed training-tier gate now sit at the socket, not at the file read.
 *
 * Usage:
 *   node scripts/consult-astra-pro.mjs --document <packet.md> [--out <path>]
 *     [--remit "<text>"] [--max-tokens 100000] [--cap-usd 6]
 *     [--model openai/gpt-6-astra-pro] [--effort high] [--confirm-spend]
 *   Dry-run (preflight only, no spend) is the default.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { readForEgress, redactForEgress, fetchForEgress } from './lib/redact-egress.mjs';
import { armMegaBlueprintPrompt, megaBlueprintUsage } from './lib/mega-blueprint-mandate.mjs';

const ROOT = process.cwd();
const DEFAULT_MODEL = 'openai/gpt-6-astra-pro';
/** Astra Pro pricing per token, read from the live OpenRouter model list 2026-09-19. */
const PRICE_IN = 0.00001;   // $10 / M
const PRICE_OUT = 0.00005;  // $50 / M
const MAX_CAP_USD = 8;
/** Bounded override: the pro seat is the architecture authority; plain Astra is the
 *  documented fallback. Anything else is refused rather than silently substituted. */
const ALLOWED_MODELS = [DEFAULT_MODEL, 'openai/gpt-6-astra'];

const PKG = 'docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19';

function parseArgs(argv) {
  const options = {
    document: '', remit: '', model: process.env.SWAN_ASTRA_MODEL || DEFAULT_MODEL,
    out: `${PKG}/ASTRA-PRO-REPLY.md`, effort: process.env.SWAN_ASTRA_EFFORT || '',
    maxTokens: Number(process.env.SWAN_ASTRA_MAX_TOKENS) || 100_000,
    capUsd: Number(process.env.SWAN_ASTRA_CAP_USD) || 6, confirmSpend: false, help: false,
    megaBlueprint: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${flag} requires a value`);
      i += 1;
      return argv[i];
    };
    if (flag === '--document') options.document = next();
    else if (flag === '--remit') options.remit = next();
    else if (flag === '--out') options.out = next();
    else if (flag === '--model') options.model = next();
    else if (flag === '--effort') options.effort = next();
    else if (flag === '--max-tokens') options.maxTokens = Number(next());
    else if (flag === '--cap-usd') options.capUsd = Number(next());
    else if (flag === '--confirm-spend') options.confirmSpend = true;
    else if (flag === '--mega-blueprint') options.megaBlueprint = true;
    else if (flag === '--no-mega-blueprint') options.megaBlueprint = false;
    else if (flag === '--help' || flag === '-h') options.help = true;
    else throw new Error(`unknown argument: ${flag}`);
  }
  if (!options.help && !options.document) throw new Error('--document is required');
  if (options.effort && !['low', 'medium', 'high'].includes(options.effort)) throw new Error('--effort must be low, medium, or high');
  if (!Number.isInteger(options.maxTokens) || options.maxTokens <= 0) throw new Error('--max-tokens must be a positive integer');
  if (!Number.isFinite(options.capUsd) || options.capUsd <= 0 || options.capUsd > MAX_CAP_USD) {
    throw new Error(`--cap-usd must be positive and at most $${MAX_CAP_USD}`);
  }
  if (!ALLOWED_MODELS.includes(options.model)) {
    throw new Error(`model not permitted: ${options.model} (allowed: ${ALLOWED_MODELS.join(', ')})`);
  }
  return options;
}

/**
 * Load the OpenRouter key. Split on /\r?\n/ — NOT '\n'.
 * A '\n' split leaves a trailing '\r' on every CRLF line, and JS `(.*)$` cannot
 * match a string ending in '\r' (`.` excludes it; `$` without /m matches only true
 * end-of-input). The older consult-* scripts use `.split('\n')` and therefore
 * recover 1 of 137 vars from this repo's CRLF .env — they fail closed with
 * "OPENROUTER_API_KEY not found" and look like a missing key. Proven 2026-09-19.
 */
function loadOpenRouterKey() {
  if (process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY) {
    return process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY;
  }
  for (const envPath of [join(ROOT, '.env'), join(ROOT, 'backend', '.env')]) {
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^(OPENROUTER_API_KEY|OPEN_ROUTER_API_KEY)=(.*)$/);
      if (match) return match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return null;
}

function assertSafeInputPath(path, label) {
  if (!path) return;
  const normalized = path.replace(/\\/g, '/').toLowerCase();
  const blocked = /(^|\/)\.env($|\.)|(^|\/)(secrets?|exports?|backups?)(\/|$)|\.(csv|sql|sqlite|db)$/;
  if (blocked.test(normalized)) throw new Error(`${label} is blocked by outbound-context policy: ${path}`);
  if (!existsSync(path)) throw new Error(`${label} not found: ${path}`);
}

const sanitize = (value) => redactForEgress(String(value ?? '')).text;

const defaultRemit = `You are Astra Pro, the architecture authority for the SS-PT / SwanStudios Mega
Blueprints v3.1 chain, acting under the fable-blueprint-forge doctrine.

Two parts, strict order, ONE reply:
  1. HOSTILE REVIEW of the current state. Find what is actually broken, what was
     claimed but is not true, and what breaks at scale. Every finding needs file:line
     evidence and a specific fix. A finding without a fix is not a finding.
  2. THEN FORGE the complete build package for the remaining work, per the doctrine
     reproduced in §6 of the packet.

The packet is your complete brief. Two rules override everything in it:
  - Do NOT restate the packet back to me. Spend every token on decisions.
  - If the hostile review changes the plan, the plan must reflect that.`;

function estimateWorstCaseUsd(prompt, maxTokens) {
  return (Buffer.byteLength(prompt, 'utf8') / 1_000_000) * (PRICE_IN * 1_000_000)
    + (maxTokens / 1_000_000) * (PRICE_OUT * 1_000_000);
}

const usage = () => [
  'Astra Pro blueprint forge (dry-run by default)',
  'node scripts/consult-astra-pro.mjs --document <packet.md> [--out <path>]',
  '  [--remit "<text>"] [--model openai/gpt-6-astra-pro] [--effort high]',
  '  [--max-tokens 100000] [--cap-usd 6] [--confirm-spend]',
  '  [--mega-blueprint | --no-mega-blueprint]',
  ...megaBlueprintUsage(),
].join('\n');

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { console.log(usage()); return; }
  assertSafeInputPath(options.document, 'document');

  const partial = `${options.out.replace(/\.md$/, '')}.partial.md`;
  const metaPath = `${options.out.replace(/\.md$/, '')}.meta.json`;
  const logPath = `${options.out.replace(/\.md$/, '')}.run.log`;
  const log = (msg) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
    try { appendFileSync(logPath, line + '\n'); } catch { /* best-effort */ }
  };

  const document = sanitize(readForEgress(options.document, { label: 'document' }));
  const remit = sanitize(options.remit || defaultRemit);

  // ---- Mega Blueprint arming -------------------------------------------------
  // One definition, imported — not reimplemented here. Detection runs on the
  // POST-redaction text, so a keyword inside a redacted region cannot arm a pipeline
  // on text the model never receives. `tail` is the only sanctioned per-caller variation.
  const tail = '\n\nProduce your reply now. Begin with the literal line "## PART A — HOSTILE REVIEW".';
  const arming = armMegaBlueprintPrompt({
    remit, document, packet: options.document, flag: options.megaBlueprint, tail,
  });
  const { armed, prompt } = arming;
  if (arming.banner) {
    console.log(arming.banner);
    console.log(`[consult-astra-pro] armed by: ${arming.armedBy.join(', ')}`);
  }

  const promptHash = createHash('sha256').update(prompt).digest('hex');
  const estimateUsd = estimateWorstCaseUsd(prompt, options.maxTokens);

  log(`status=preflight model_calls=0 model=${options.model}`);
  log(`prompt_sha256=${promptHash} prompt_chars=${prompt.length} max_tokens=${options.maxTokens}`);
  log(`mega_blueprint=${armed} armed_by=${armed ? arming.armedBy.join('+') : 'n/a'}`);
  if (armed) {
    const hasContract = prompt.includes('## PART B — FORGED PACKAGE');
    const hasBothReviews = prompt.includes('A1 — REVIEW OF THE EXISTING BLUEPRINTS')
      && prompt.includes('A2 — REVIEW OF YOUR OWN PACKAGE');
    log(`contract_headings_present=${hasContract} both_hostile_reviews_present=${hasBothReviews}`);
  }
  log(`worst_case_usd=$${estimateUsd.toFixed(4)} cap_usd=$${options.capUsd.toFixed(2)}`);
  if (!options.confirmSpend) { log('dry-run: add --confirm-spend to send. Exiting.'); return; }
  if (estimateUsd > options.capUsd) throw new Error(`hard cap blocks call: worst-case $${estimateUsd.toFixed(4)} exceeds $${options.capUsd.toFixed(2)}`);

  const apiKey = loadOpenRouterKey();
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not found (checked env, .env, backend/.env)');

  const body = {
    model: options.model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: options.maxTokens, temperature: 0.2,
    stream: true, stream_options: { include_usage: true },
  };
  if (options.effort) body.reasoning = { effort: options.effort };

  log('status=running model_calls=1 (streaming)');
  const started = Date.now();
  const response = await fetchForEgress('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://sswanstudios.com', 'X-Title': 'SwanStudios Astra Pro Blueprint Forge',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(Number(process.env.SWAN_ASTRA_TIMEOUT_MS) || 1_800_000),
  });
  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    throw new Error(`OpenRouter ${response.status}: ${raw.slice(0, 800).replace(apiKey, '<REDACTED_KEY>')}`);
  }

  let text = '';
  let tokens = null;
  let finish = null;
  let chunks = 0;
  let lastFlush = 0;
  const flush = () => {
    try {
      writeFileSync(partial, `<!-- PARTIAL: ${chunks} chunks, ${text.length} chars, ${((Date.now() - started) / 1000).toFixed(0)}s. Superseded on success. -->\n\n${text}`, 'utf8');
      lastFlush = Date.now();
    } catch { /* best-effort */ }
  };

  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const frames = buffer.split('\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const trimmed = frame.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') continue;
      let parsed;
      try { parsed = JSON.parse(payload); } catch { continue; }
      if (parsed.error) { flush(); throw new Error(`mid-stream API error: ${JSON.stringify(parsed.error).slice(0, 600)}`); }
      if (parsed.usage) tokens = parsed.usage;
      const choice = parsed.choices?.[0];
      if (choice?.finish_reason) finish = choice.finish_reason;
      const delta = choice?.delta?.content;
      if (delta) {
        text += delta;
        chunks += 1;
        if (Date.now() - lastFlush > 10_000) {
          flush();
          log(`  ...${chunks} chunks, ${text.length} chars, ${((Date.now() - started) / 1000).toFixed(0)}s`);
        }
      }
    }
  }
  if (!text.trim()) { flush(); throw new Error(finish ? `TRUNCATED WITH NO CONTENT (finish=${finish})` : 'stream completed with no visible content'); }

  const inTok = Number(tokens?.prompt_tokens) || 0;
  const outTok = Number(tokens?.completion_tokens) || 0;
  const actualUsd = inTok * PRICE_IN + outTok * PRICE_OUT;
  const truncated = finish === 'length' || finish === 'max_tokens';
  const banner = truncated ? `> WARNING: TRUNCATED at ${options.maxTokens} tokens (finish_reason=${finish}); this reply is INCOMPLETE.\n\n` : '';

  const header = `# Astra Pro Reply — Social Bridge Completion Blueprint\n\n`
    + `**Model:** \`${options.model}\` via OpenRouter${options.effort ? ` (effort ${options.effort})` : ''}\n`
    + `**Date:** ${new Date().toISOString()}\n**Packet:** \`${options.document}\`\n`
    + `**Prompt SHA-256:** \`${promptHash}\`\n**Tokens:** ${inTok} in / ${outTok} out`
    + ` | **Cost:** ~$${actualUsd.toFixed(4)} | **Wall:** ${((Date.now() - started) / 1000).toFixed(1)}s`
    + ` | **finish_reason:** ${finish ?? '?'}\n\n---\n\n`;
  writeFileSync(options.out, header + banner + text, 'utf8');

  writeFileSync(metaPath, JSON.stringify({
    model: options.model, document: options.document, generatedAt: new Date().toISOString(),
    promptSha256: promptHash, promptChars: prompt.length, maxTokens: options.maxTokens,
    inputTokens: inTok, outputTokens: outTok, costUsd: Number(actualUsd.toFixed(6)),
    wallSeconds: Number(((Date.now() - started) / 1000).toFixed(1)), chunks,
    replyChars: text.length, finishReason: finish, truncated, usage: tokens,
  }, null, 2), 'utf8');

  try { writeFileSync(partial, `<!-- SUPERSEDED: the run completed successfully. Final output: ${options.out} -->\n`, 'utf8'); } catch { /* best-effort */ }

  log(`status=complete cost_usd=$${actualUsd.toFixed(4)} saved=${options.out} finish=${finish ?? '?'}`);
  for (const h of ['## PART A — HOSTILE REVIEW', '## PART B — FORGED PACKAGE', '## PART C — DECISION-DENSITY SELF-TEST']) {
    log(`${text.includes(h) ? 'PRESENT' : 'MISSING'}: ${h}`);
  }
  if (truncated) process.exitCode = 2;
}

main().catch((error) => {
  console.error(`[consult-astra-pro] ${error.message}`);
  process.exitCode = 1;
});
