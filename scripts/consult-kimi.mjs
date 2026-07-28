#!/usr/bin/env node
/**
 * Kimi-only Swan review via OpenRouter.
 *
 * Dry-run is the default. A live call requires --confirm-spend and is blocked
 * before network access when its conservative worst-case estimate exceeds the
 * hard cap (default: $3).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DEFAULT_MODEL = 'moonshotai/kimi-k3';
const DEFAULT_CAP_USD = 3;
const PRICE_IN_PER_MILLION = 3;
const PRICE_OUT_PER_MILLION = 15;

function parseArgs(argv) {
  const options = {
    document: '', seed: '',
    out: 'docs/ai-workflow/AI-HANDOFF/KIMI-DESIGN-REVIEW.md',
    remit: '', effort: process.env.SWAN_KIMI_EFFORT || 'high',
    maxTokens: Number(process.env.SWAN_KIMI_MAX_TOKENS) || 16_000,
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

const defaultRemit = `You are Kimi K3, the SwanStudios front-end and design reviewer.
Give a rigorous hostile design and implementation review. Rank weaknesses by severity,
identify the single highest-impact improvement, and give builder-exact corrections.
Enforce Crystalline Swan dark-first design, styled-components, Victory charts, tokenized
colors, 44px touch targets, WCAG 4.5:1, files at or below 300 lines, responsive behavior
at 320/375/414/768/1024/1440/2560/3840, and reduced-motion safety. Be concrete.`;

function usage() {
  return [
    'Kimi-only review (dry-run by default)',
    'node scripts/consult-kimi.mjs --document <path> [--seed <path>] [--out <path>]',
    '  [--remit "<text>"] [--effort low|medium|high] [--max-tokens 16000]',
    '  [--cap-usd 3] [--confirm-spend]',
  ].join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { console.log(usage()); return; }
  assertSafeInputPath(options.document, 'document');
  assertSafeInputPath(options.seed, 'seed');

  const model = process.env.SWAN_KIMI_MODEL || DEFAULT_MODEL;
  if (!/^moonshotai\/kimi-/i.test(model)) throw new Error(`Kimi-only policy blocks non-Kimi model override: ${model}`);

  const document = sanitizeOutboundText(readFileSync(options.document, 'utf8'));
  const seed = options.seed ? sanitizeOutboundText(readFileSync(options.seed, 'utf8')) : '(no seed provided)';
  const remit = sanitizeOutboundText(options.remit || defaultRemit);
  const prompt = `${remit}\n\n=== DOCUMENT UNDER REVIEW ===\n\n${document}\n\n=== SEED CONTEXT ===\n\n${seed}\n\n=== END CONTEXT ===`;
  const estimateUsd = estimateWorstCaseUsd(prompt, options.maxTokens);

  console.log(`[consult-kimi] status=preflight model_calls=0 model=${model}`);
  console.log(`[consult-kimi] prompt_chars=${prompt.length} max_tokens=${options.maxTokens}`);
  console.log(`[consult-kimi] worst_case_usd=$${estimateUsd.toFixed(4)} cap_usd=$${options.capUsd.toFixed(2)}`);
  if (!options.confirmSpend) {
    console.log('[consult-kimi] add --confirm-spend only after explicit approval for this run');
    return;
  }
  if (estimateUsd > options.capUsd) throw new Error(`hard cap blocks call: worst-case $${estimateUsd.toFixed(4)} exceeds $${options.capUsd.toFixed(2)}`);

  const apiKey = loadOpenRouterKey();
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not found for confirmed run');
  console.log('[consult-kimi] status=running model_calls=1');
  const started = Date.now();
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://sswanstudios.com', 'X-Title': 'SwanStudios Kimi-Only Review',
    },
    body: JSON.stringify({
      model, messages: [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens, temperature: 0.3, reasoning: { effort: options.effort },
    }),
    signal: AbortSignal.timeout(Number(process.env.SWAN_KIMI_TIMEOUT_MS) || 900_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 800).replace(apiKey, '<REDACTED_KEY>')}`);
  }
  const data = await response.json();
  if (data.error) throw new Error(`OpenRouter error: ${data.error.message || 'unknown error'}`);
  const text = data.choices?.[0]?.message?.content;
  if (!text?.trim()) throw new Error('OpenRouter returned no visible Kimi response');

  const inputTokens = Number(data.usage?.prompt_tokens) || 0;
  const outputTokens = Number(data.usage?.completion_tokens) || 0;
  const actualUsd = (inputTokens / 1_000_000) * PRICE_IN_PER_MILLION
    + (outputTokens / 1_000_000) * PRICE_OUT_PER_MILLION;
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const output = `# Kimi K3 - Review\n\n**Reviewer:** \`${model}\` (${options.effort})\n`
    + `**Document:** ${options.document}\n**Seed:** ${options.seed || '(none)'}\n`
    + `**Tokens:** ${inputTokens} in / ${outputTokens} out | **Cost:** ~$${actualUsd.toFixed(4)} | **Wall:** ${seconds}s\n\n---\n\n${text}\n`;
  writeFileSync(options.out, output, 'utf8');
  console.log(`[consult-kimi] status=complete cost_usd=$${actualUsd.toFixed(4)} saved=${options.out}`);
}

main().catch((error) => {
  console.error(`[consult-kimi] ${error.message}`);
  process.exitCode = 1;
});