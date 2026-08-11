#!/usr/bin/env node
/** Bounded Opus 5 review via OpenRouter. Dry-run is the default. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const MODEL = 'anthropic/claude-opus-5';
const MAX_CAP_USD = 3;
const PRICE_IN_PER_MILLION = 5;
const PRICE_OUT_PER_MILLION = 25;

function parseArgs(argv) {
  const options = {
    document: '', seed: '', out: 'docs/ai-workflow/AI-HANDOFF/OPUS5-REVIEW.md',
    remit: '', effort: process.env.SWAN_OPUS5_EFFORT || 'high',
    maxTokens: Number(process.env.SWAN_OPUS5_MAX_TOKENS) || 60_000,
    capUsd: MAX_CAP_USD, confirmSpend: false,
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
  if (!Number.isFinite(options.capUsd) || options.capUsd <= 0 || options.capUsd > MAX_CAP_USD) {
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

function sanitize(value) {
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

const defaultRemit = `You are Opus 5, a principal product architect and hostile reviewer.
Audit the supplied packet, close missing product and engineering gaps, and return a
builder-exact phased blueprint. Preserve proven boundaries and governance. Include
desktop/mobile information architecture, agent-native contracts, failure modes,
privacy and cost controls, a Mermaid flowchart, an ASCII wireframe, tests, rollout,
rollback, and a severity-ranked challenge section. Be concrete and decisive.`;

function usage() {
  return [
    'Opus 5 review (dry-run by default)',
    'node scripts/consult-opus5.mjs --document <path> [--seed <path>] [--out <path>]',
    '  [--remit "<text>"] [--effort low|medium|high] [--max-tokens 60000]',
    '  [--cap-usd 3] [--confirm-spend]',
  ].join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { console.log(usage()); return; }
  assertSafeInputPath(options.document, 'document');
  assertSafeInputPath(options.seed, 'seed');
  const model = process.env.SWAN_OPUS5_MODEL || MODEL;
  if (model !== MODEL) throw new Error(`Opus 5 policy blocks model override: ${model}`);

  const document = sanitize(readFileSync(options.document, 'utf8'));
  const seed = options.seed ? sanitize(readFileSync(options.seed, 'utf8')) : '(no seed provided)';
  const prompt = `${sanitize(options.remit || defaultRemit)}\n\n=== DOCUMENT UNDER REVIEW ===\n\n${document}\n\n=== SEED CONTEXT ===\n\n${seed}\n\n=== END CONTEXT ===`;
  const promptHash = createHash('sha256').update(prompt).digest('hex');
  const estimateUsd = estimateWorstCaseUsd(prompt, options.maxTokens);
  console.log(`[consult-opus5] status=preflight model_calls=0 model=${model}`);
  console.log(`[consult-opus5] prompt_sha256=${promptHash} prompt_chars=${prompt.length} max_tokens=${options.maxTokens}`);
  console.log(`[consult-opus5] worst_case_usd=$${estimateUsd.toFixed(4)} cap_usd=$${options.capUsd.toFixed(2)}`);
  if (!options.confirmSpend) {
    console.log('[consult-opus5] add --confirm-spend only after explicit approval for this run');
    return;
  }
  if (estimateUsd > options.capUsd) throw new Error(`hard cap blocks call: worst-case $${estimateUsd.toFixed(4)} exceeds $${options.capUsd.toFixed(2)}`);
  const apiKey = loadOpenRouterKey();
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not found for confirmed run');

  console.log('[consult-opus5] status=running model_calls=1');
  const started = Date.now();
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://swan.guard.local', 'X-Title': 'Swan Guard Opus 5 Review',
    },
    body: JSON.stringify({
      model, messages: [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens, temperature: 0.2, reasoning: { effort: options.effort },
    }),
    signal: AbortSignal.timeout(Number(process.env.SWAN_OPUS5_TIMEOUT_MS) || 900_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 800).replace(apiKey, '<REDACTED_KEY>')}`);
  }
  const data = await response.json();
  if (data.error) throw new Error(`OpenRouter error: ${data.error.message || 'unknown error'}`);
  const finish = data.choices?.[0]?.finish_reason ?? data.choices?.[0]?.native_finish_reason ?? null;
  const truncated = finish === 'length' || finish === 'max_tokens';
  const answer = data.choices?.[0]?.message?.content;
  if (!answer?.trim()) throw new Error(truncated ? 'TRUNCATED WITH NO CONTENT' : 'OpenRouter returned no visible Opus 5 response');

  const inputTokens = Number(data.usage?.prompt_tokens) || 0;
  const outputTokens = Number(data.usage?.completion_tokens) || 0;
  const actualUsd = (inputTokens / 1_000_000) * PRICE_IN_PER_MILLION
    + (outputTokens / 1_000_000) * PRICE_OUT_PER_MILLION;
  const banner = truncated ? `> WARNING: TRUNCATED at ${options.maxTokens} tokens; this response is incomplete.\n\n` : '';
  const output = `# Opus 5 - Review\n\n**Reviewer:** \`${model}\` (${options.effort})\n`
    + `**Document:** ${options.document}\n**Seed:** ${options.seed || '(none)'}\n`
    + `**Prompt SHA-256:** \`${promptHash}\`\n**Tokens:** ${inputTokens} in / ${outputTokens} out`
    + ` | **Cost:** ~$${actualUsd.toFixed(4)} | **Wall:** ${((Date.now() - started) / 1000).toFixed(1)}s`
    + ` | **finish_reason:** ${finish ?? '?'}\n\n---\n\n${banner}${answer}\n`;
  writeFileSync(options.out, output, 'utf8');
  console.log(`[consult-opus5] status=complete cost_usd=$${actualUsd.toFixed(4)} saved=${options.out} finish=${finish ?? '?'}`);
  if (truncated) process.exitCode = 2;
}

main().catch((error) => {
  console.error(`[consult-opus5] ${error.message}`);
  process.exitCode = 1;
});
