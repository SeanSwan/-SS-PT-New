#!/usr/bin/env node
/**
 * Tencent Hy3 design-only review via OpenRouter.
 *
 * Dry-run is the default. A live call requires --confirm-spend and is blocked
 * before network access when its conservative worst-case estimate exceeds the
 * hard cap (default: $3).
 */
import { fetchRedacted } from './lib/egress-fetch.mjs';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DEFAULT_MODEL = 'tencent/hy3';
const DEFAULT_CAP_USD = 3;
const PRICE_IN_PER_MILLION = 0.1288;
const PRICE_OUT_PER_MILLION = 0.5336;

function parseArgs(argv) {
  const options = {
    document: '', seed: '',
    out: 'docs/ai-workflow/AI-HANDOFF/HY3-DESIGN-REVIEW.md',
    remit: '', effort: process.env.SWAN_HY3_EFFORT || 'high',
    // Ceiling, not a charge — billed on tokens actually emitted. Raised 16k → 60k
    // 2026-07-30 (same truncation class that cut an Opus 5 consult mid-sentence).
    // The $3 spend cap still governs: 60k out ≈ $0.90 worst case, well under it.
    maxTokens: Number(process.env.SWAN_HY3_MAX_TOKENS) || 60_000,
    capUsd: DEFAULT_CAP_USD, confirmSpend: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const next = () => {
      if (index + 1 >= argv.length) throw new Error(`${flag} requires a value`);
      index += 1;
      return argv[index];
    };
    if (flag === '--document') options.document = next();
    else if (flag === '--seed') options.seed = next();
    else if (flag === '--out') options.out = next();
    else if (flag === '--remit') options.remit = next();
    else if (flag === '--effort') options.effort = next();
    else if (flag === '--max-tokens') options.maxTokens = Number(next());
    else if (flag === '--cap-usd') options.capUsd = Number(next());
    else if (flag === '--confirm-spend') options.confirmSpend = true;
    else if (flag === '--help' || flag === '-h') options.help = true;
    else throw new Error(`unknown argument: ${flag}`);
  }
  if (!options.help && !options.document) throw new Error('--document is required');
  if (!['low', 'medium', 'high'].includes(options.effort)) throw new Error('--effort must be low, medium, or high');
  if (!Number.isInteger(options.maxTokens) || options.maxTokens <= 0) throw new Error('--max-tokens must be a positive integer');
  if (!Number.isFinite(options.capUsd) || options.capUsd <= 0 || options.capUsd > DEFAULT_CAP_USD) {
    throw new Error('--cap-usd must be positive and at most $3');
  }
  return options;
}

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

function sanitizeOutboundText(value) {
  return String(value ?? '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<REDACTED_EMAIL>')
    .replace(/\+?1?[\s.(-]*\d{3}[\s.)-]*\d{3}[\s.-]*\d{4}/g, '<REDACTED_PHONE>')
    .replace(/sk-or-[A-Za-z0-9_-]{8,}/g, '<REDACTED_KEY>')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer <REDACTED_KEY>')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '<REDACTED_JWT>');
}

function estimateWorstCaseUsd(prompt, maxTokens) {
  const conservativeInputTokens = Buffer.byteLength(prompt, 'utf8');
  return (conservativeInputTokens / 1_000_000) * PRICE_IN_PER_MILLION
    + (maxTokens / 1_000_000) * PRICE_OUT_PER_MILLION;
}

const defaultRemit = `You are Tencent Hy3, the SwanStudios design-inspiration reviewer. Give only UI/UX and interaction suggestions.
Give a rigorous hostile design and implementation review. Rank weaknesses by severity,
identify the single highest-impact improvement, and give builder-exact corrections.
Enforce Crystalline Swan dark-first design, styled-components, Victory charts, tokenized
colors, 44px touch targets, WCAG 4.5:1, files at or below 300 lines, responsive behavior
at 320/375/414/768/1024/1440/2560/3840, and reduced-motion safety. Be concrete.`;

function usage() {
  return [
    'Hy3 design review (dry-run by default)',
    'node scripts/consult-hy3-design.mjs --document <path> [--seed <path>] [--out <path>]',
    '  [--remit "<text>"] [--effort low|medium|high] [--max-tokens 60000]',
    '  [--cap-usd 3] [--confirm-spend]',
  ].join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { console.log(usage()); return; }
  assertSafeInputPath(options.document, 'document');
  assertSafeInputPath(options.seed, 'seed');

  const model = process.env.SWAN_HY3_MODEL || DEFAULT_MODEL;
  if (!/^tencent\/hy3$/i.test(model)) throw new Error(`Hy3 design policy blocks non-Hy3 model override: ${model}`);

  const document = sanitizeOutboundText(readFileSync(options.document, 'utf8'));
  const seed = options.seed ? sanitizeOutboundText(readFileSync(options.seed, 'utf8')) : '(no seed provided)';
  const remit = sanitizeOutboundText(options.remit || defaultRemit);
  const prompt = `${remit}\n\n=== DOCUMENT UNDER REVIEW ===\n\n${document}\n\n=== SEED CONTEXT ===\n\n${seed}\n\n=== END CONTEXT ===`;
  const estimateUsd = estimateWorstCaseUsd(prompt, options.maxTokens);

  console.log(`[consult-hy3-design] status=preflight model_calls=0 model=${model}`);
  console.log(`[consult-hy3-design] prompt_chars=${prompt.length} max_tokens=${options.maxTokens}`);
  console.log(`[consult-hy3-design] worst_case_usd=$${estimateUsd.toFixed(4)} cap_usd=$${options.capUsd.toFixed(2)}`);
  if (!options.confirmSpend) {
    console.log('[consult-hy3-design] add --confirm-spend only after explicit approval for this run');
    return;
  }
  if (estimateUsd > options.capUsd) throw new Error(`hard cap blocks call: worst-case $${estimateUsd.toFixed(4)} exceeds $${options.capUsd.toFixed(2)}`);

  const apiKey = loadOpenRouterKey();
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not found for confirmed run');
  console.log('[consult-hy3-design] status=running model_calls=1');
  const started = Date.now();
  const response = await fetchRedacted('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://sswanstudios.com', 'X-Title': 'SwanStudios HY3 Design Review',
    },
    body: JSON.stringify({
      model, messages: [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens, temperature: 0.3, reasoning: { effort: options.effort },
    }),
    signal: AbortSignal.timeout(Number(process.env.SWAN_HY3_TIMEOUT_MS) || 900_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 800).replace(apiKey, '<REDACTED_KEY>')}`);
  }
  const data = await response.json();
  if (data.error) throw new Error(`OpenRouter error: ${data.error.message || 'unknown error'}`);
  // Truncation is checked before the empty-text guard: a reasoning model can burn
  // the whole budget on hidden reasoning and return no content, which is a cap
  // problem, not an empty response. Reporting it as "no visible response" sends the
  // operator hunting the wrong bug.
  const finish = data.choices?.[0]?.finish_reason ?? data.choices?.[0]?.native_finish_reason ?? null;
  const truncated = finish === 'length' || finish === 'max_tokens';

  const text = data.choices?.[0]?.message?.content;
  if (!text?.trim()) {
    if (truncated) {
      throw new Error(
        `TRUNCATED WITH NO CONTENT — hit max_tokens (${options.maxTokens}) before emitting visible text`
        + ` (reasoning consumed the budget). Re-run with a higher --max-tokens or --effort low.`,
      );
    }
    throw new Error('OpenRouter returned no visible Hy3 response');
  }

  const inputTokens = Number(data.usage?.prompt_tokens) || 0;
  const outputTokens = Number(data.usage?.completion_tokens) || 0;
  const actualUsd = (inputTokens / 1_000_000) * PRICE_IN_PER_MILLION
    + (outputTokens / 1_000_000) * PRICE_OUT_PER_MILLION;
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  // Truncation guard: a reply cut off at max_tokens must never be read as finished.
  // (finish/truncated are computed above, before the empty-text check.)
  const banner = truncated
    ? `> ⚠ **TRUNCATED** — hit max_tokens (${options.maxTokens}); this reply is INCOMPLETE.\n`
      + `> Re-run with --max-tokens higher, or split the packet into narrower consults.\n\n`
    : '';

  // SELF-DESCRIBING HEADER (Sean, 2026-08-16) — third of three consult paths to get this; the
  // gateway (consult.mjs) and consult-glm.mjs were fixed first and this one was MISSED, found by
  // grepping for the old static strings rather than by memory of which files I had touched.
  // The H1 named the TOOL ("Tencent Hy3 - Design Inspiration") and not the WORK, so a review could
  // not be identified without opening it. Derive it from the reviewed document's own H1. Fenced
  // blocks are stripped first: packets embed diffs, and a `# comment` inside a fence sits at line
  // start exactly like a heading — a header describing the wrong thing is worse than a generic one.
  const SUBJECT_MAX = 120;
  let subject = (document.replace(/^```[\s\S]*?^```/gm, '').match(/^#\s+(.+?)\s*$/m)?.[1] ?? '')
    .replace(/\s+/g, ' ').trim();
  if (subject.length > SUBJECT_MAX) subject = `${subject.slice(0, SUBJECT_MAX - 1).trimEnd()}…`;
  const h1 = subject ? `${subject} — reviewed by HY3 (${model})` : 'Tencent Hy3 - Design Inspiration';

  const output = `# ${h1}\n\n**Reviewer:** \`${model}\` (${options.effort})\n`
    + `**Document:** ${options.document}\n**Seed:** ${options.seed || '(none)'}\n`
    + `**Tokens:** ${inputTokens} in / ${outputTokens} out | **Cost:** ~$${actualUsd.toFixed(4)} | **Wall:** ${seconds}s`
    + ` | **finish_reason:** ${finish ?? '?'}\n\n---\n\n${banner}${text}\n`;
  writeFileSync(options.out, output, 'utf8');
  console.log(`[consult-hy3-design] status=complete cost_usd=$${actualUsd.toFixed(4)} saved=${options.out} finish=${finish ?? '?'}`);
  if (truncated) {
    console.error(`[consult-hy3-design] ⚠ TRUNCATED at max_tokens=${options.maxTokens} — reply incomplete.`);
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(`[consult-hy3-design] ${error.message}`);
  process.exitCode = 1;
});