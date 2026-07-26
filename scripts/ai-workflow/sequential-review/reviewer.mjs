/**
 * Cost-gated single-model document reviewer.
 *
 * Dry-run is the default. A live call requires --confirm-spend, a bounded
 * source packet, and a conservative worst-case estimate below the hard cap.
 */
import crypto from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const MAX_CAP_USD = 3;
const MAX_SOURCE_BYTES = 512 * 1024;

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function loadOpenRouterKey() {
  if (process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY) {
    return process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY;
  }
  for (const path of [join(ROOT, '.env'), join(ROOT, 'backend', '.env')]) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^(OPENROUTER_API_KEY|OPEN_ROUTER_API_KEY)=(.*)$/);
      if (match) return match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return null;
}

function assertSafePath(path, label) {
  if (!path) return;
  const normalized = String(path).replaceAll('\\', '/').toLowerCase();
  const blocked = /(^|\/)\.env($|\.)|(^|\/)(secrets?|exports?|backups?)(\/|$)|\.(csv|sql|sqlite|db|pem|key)$/;
  if (blocked.test(normalized)) {
    throw new Error(`${label} is blocked by outbound-context policy: ${path}`);
  }
  if (!existsSync(path)) throw new Error(`${label} not found: ${path}`);
}

function readBounded(path) {
  const text = readFileSync(path, 'utf8');
  if (Buffer.byteLength(text, 'utf8') > MAX_SOURCE_BYTES) {
    throw new Error(`source exceeds ${MAX_SOURCE_BYTES} byte limit: ${path}`);
  }
  return text;
}

export function sanitize(value) {
  return String(value ?? '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<REDACTED_EMAIL>')
    .replace(/(?<![A-Za-z0-9])\+?1?[\s.(-]*\d{3}[\s.)-]*\d{3}[\s.-]*\d{4}(?![A-Za-z0-9])/g, '<REDACTED_PHONE>')
    .replace(/sk-or-[A-Za-z0-9_-]{8,}/g, '<REDACTED_KEY>')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer <REDACTED_KEY>')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '<REDACTED_JWT>')
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '<REDACTED_PRIVATE_KEY>');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function estimateUsd(prompt, maxTokens, pricing) {
  const conservativeInputTokens = Buffer.byteLength(prompt, 'utf8');
  return (conservativeInputTokens / 1_000_000) * pricing.input
    + (maxTokens / 1_000_000) * pricing.output;
}

function assertFrozenOpusSeed(seed, documentHash) {
  if (!/^# Claude Opus 5 - Review/m.test(seed)) {
    throw new Error('Kimi second pass requires a completed Claude Opus 5 review seed');
  }
  const match = seed.match(/\*\*Document SHA-256:\*\* `([a-f0-9]{64})`/i);
  if (!match || match[1].toLowerCase() !== documentHash) {
    throw new Error('Opus review seed does not match the current document SHA-256');
  }
}

export function assertReviewComplete(data, maxTokens) {
  const choice = data.choices?.[0];
  const finishReason = choice?.finish_reason || choice?.native_finish_reason;
  const outputTokens = Number(data.usage?.completion_tokens) || 0;
  const hitTokenCeiling = outputTokens >= maxTokens;

  if (finishReason === 'length' || finishReason === 'max_tokens' || hitTokenCeiling) {
    throw new Error(
      `review response truncated at max_tokens ceiling (finish_reason=${finishReason || 'unknown'}, output_tokens=${outputTokens}, max_tokens=${maxTokens})`,
    );
  }
  if (!choice?.message?.content?.trim()) {
    throw new Error('OpenRouter returned no visible review');
  }
}

export async function runReview(config) {
  const documentPath = arg('document');
  const seedPath = arg('seed');
  const outputPath = arg('out', config.defaultOutput);
  const effort = arg('effort', 'high');
  const maxTokens = Number(arg('max-tokens', String(config.defaultMaxTokens ?? 16000)));
  const capUsd = Number(arg('cap-usd', '3'));
  const confirmSpend = hasFlag('confirm-spend');

  if (!documentPath) throw new Error('--document is required');
  if (!['low', 'medium', 'high'].includes(effort)) throw new Error('--effort must be low, medium, or high');
  if (!Number.isInteger(maxTokens) || maxTokens <= 0) throw new Error('--max-tokens must be a positive integer');
  if (!Number.isFinite(capUsd) || capUsd <= 0 || capUsd > MAX_CAP_USD) {
    throw new Error(`--cap-usd must be positive and at most $${MAX_CAP_USD}`);
  }

  assertSafePath(documentPath, 'document');
  assertSafePath(seedPath, 'seed');
  const document = sanitize(readBounded(documentPath));
  const rawSeed = seedPath ? readBounded(seedPath) : '';
  const documentHash = sha256(document);
  if (config.requiresOpusSeed) {
    if (!seedPath) throw new Error('Kimi second pass requires --seed <completed Opus review>');
    assertFrozenOpusSeed(rawSeed, documentHash);
  }
  const seed = sanitize(rawSeed);

  const prompt = `${config.remit}

=== ORIGINAL DOCUMENT UNDER REVIEW ===

${document}

=== PRIOR OPUS REVIEW ===

${seed || '(none; this is the independent first-pass review)'}

=== END BOUNDED CONTEXT ===`;
  const estimate = estimateUsd(prompt, maxTokens, config.pricing);

  console.log(`[${config.logName}] status=preflight model_calls=0 model=${config.model}`);
  console.log(`[${config.logName}] document_sha256=${documentHash}`);
  console.log(`[${config.logName}] prompt_chars=${prompt.length} max_tokens=${maxTokens}`);
  console.log(`[${config.logName}] worst_case_usd=$${estimate.toFixed(4)} cap_usd=$${capUsd.toFixed(2)}`);
  if (!confirmSpend) {
    console.log(`[${config.logName}] add --confirm-spend only after explicit approval for this exact run`);
    return;
  }
  if (estimate > capUsd) {
    throw new Error(`hard cap blocks call: worst-case $${estimate.toFixed(4)} exceeds $${capUsd.toFixed(2)}`);
  }

  const apiKey = loadOpenRouterKey();
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not found for confirmed run');
  console.log(`[${config.logName}] status=running model_calls=1`);
  const started = Date.now();
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://sswanstudios.com',
      'X-Title': config.title,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      reasoning: { effort },
      provider: {
        data_collection: 'deny',
        zdr: true,
      },
    }),
    signal: AbortSignal.timeout(Number(process.env.SWAN_REVIEW_TIMEOUT_MS) || 900_000),
  });
  if (!response.ok) {
    const body = sanitize(await response.text().catch(() => ''));
    throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 800)}`);
  }
  const data = await response.json();
  if (data.error) throw new Error(`OpenRouter error: ${sanitize(data.error.message || 'unknown error')}`);
  assertReviewComplete(data, maxTokens);
  const text = data.choices[0].message.content;

  const inputTokens = Number(data.usage?.prompt_tokens) || 0;
  const outputTokens = Number(data.usage?.completion_tokens) || 0;
  const actualUsd = (inputTokens / 1_000_000) * config.pricing.input
    + (outputTokens / 1_000_000) * config.pricing.output;
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const output = `# ${config.outputHeading}

**Reviewer:** \`${data.model || config.model}\` (${effort})
**Document:** ${documentPath}
**Document SHA-256:** \`${documentHash}\`
**Seed:** ${seedPath || '(none)'}
**Tokens:** ${inputTokens} in / ${outputTokens} out | **Cost:** ~$${actualUsd.toFixed(4)} | **Wall:** ${seconds}s

---

${text}
`;
  writeFileSync(outputPath, output, 'utf8');
  console.log(`[${config.logName}] status=complete cost_usd=$${actualUsd.toFixed(4)} saved=${outputPath}`);
}
