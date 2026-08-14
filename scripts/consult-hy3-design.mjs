#!/usr/bin/env node
/**
 * Tencent Hy3 design-only review via OpenRouter.
 *
 * Dry-run is the default. A live call requires --confirm-spend and is blocked
 * before network access when its conservative worst-case estimate exceeds the
 * hard cap (default: $3).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

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

/**
 * Outbound redaction rules, in application order.
 *
 * The PHONE rule was rebuilt 2026-08-14 (hostile review F4). The original
 * `\+?1?[\s.(-]*\d{3}[\s.)-]*\d{3}[\s.-]*\d{4}` matched ANY ten digits with any run of separators
 * and no boundaries, so on a CODE packet it rewrote a git blob SHA into `index 000<REDACTED_PHONE>2e3ba`
 * and mangled two security-test fixtures. The external reviewer then filed a CRITICAL saying those
 * tests were vacuous — true of the packet it received, false of the repo. A redactor that silently
 * edits evidence manufactures findings.
 *
 * Two precision guards, both chosen because they cannot cost true-positive coverage:
 *  - BOUNDARIES: a phone number is never embedded inside a longer alphanumeric run, but a hash
 *    always is. This alone removes the SHA corruption at zero security cost.
 *  - NANP AREA CODE `[2-9]`: North American area codes cannot begin with 0 or 1. The original
 *    pattern was already NANP-shaped (`+1`, 3-3-4), so this narrows nothing it used to catch —
 *    while killing the `0000000…` / `1234567890…` shapes that dominate hashes and id runs.
 * Separators are `?` (at most one) rather than `*` (any run): `..` is diff syntax, never a phone.
 */
const REDACTION_RULES = [
  ['EMAIL', /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<REDACTED_EMAIL>'],
  ['PHONE', /(?<![0-9A-Za-z])(?:\+?1[\s.-]?)?(?:\([2-9]\d{2}\)|[2-9]\d{2})[\s.-]?\d{3}[\s.-]?\d{4}(?![0-9A-Za-z])/g, '<REDACTED_PHONE>'],
  ['KEY', /sk-or-[A-Za-z0-9_-]{8,}/g, '<REDACTED_KEY>'],
  // Deliberately NOT narrowed: the redactor cannot tell a live token from a test fixture, so it
  // must fail safe and redact both. That is why redaction is now DISCLOSED to the reviewer
  // (see redactionNotice) rather than made quieter — the fix for a fixture being rewritten is to
  // say so, not to stop redacting it.
  ['KEY', /Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer <REDACTED_KEY>'],
  ['JWT', /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '<REDACTED_JWT>'],
];

/** Redact and REPORT. Returns the substitution count so the caller can disclose it (F4). */
export function redactOutbound(value) {
  let text = String(value ?? '');
  let count = 0;
  for (const [, pattern, replacement] of REDACTION_RULES) {
    text = text.replace(pattern, () => { count += 1; return replacement; });
  }
  return { text, count };
}

export function sanitizeOutboundText(value) {
  return redactOutbound(value).text;
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

  const documentR = redactOutbound(readFileSync(options.document, 'utf8'));
  const seedR = options.seed ? redactOutbound(readFileSync(options.seed, 'utf8')) : { text: '(no seed provided)', count: 0 };
  const remitR = redactOutbound(options.remit || defaultRemit);
  const document = documentR.text;
  const seed = seedR.text;
  const remit = remitR.text;
  const redactionCount = documentR.count + seedR.count + remitR.count;

  // A silent substitution is indistinguishable from source text, so the reviewer reads
  // `<REDACTED_KEY>` as what the file says and reports the code as defective. That produced a false
  // CRITICAL on 2026-08-14 ("these assertions check for a string absent from the fixture" — the
  // string was present in the repo and removed by this very function). Disclosing the substitution
  // is what makes the corruption legible; it costs a sentence (F4).
  const redactionNotice = redactionCount > 0
    ? `\n\n> ⚠ EGRESS REDACTION: ${redactionCount} substitution(s) were applied to the text below before`
      + ' it was sent to you. Any `<REDACTED_EMAIL>` / `<REDACTED_PHONE>` / `<REDACTED_KEY>` /'
      + ' `<REDACTED_JWT>` marker is a REPLACEMENT made by the sending tool, NOT the literal source.'
      + ' Do NOT report a defect whose evidence is one of these markers — the original value is'
      + ' present in the repository. Flag it as "unreviewable — redacted" instead.\n'
    : '';

  const prompt = `${remit}${redactionNotice}\n\n=== DOCUMENT UNDER REVIEW ===\n\n${document}\n\n=== SEED CONTEXT ===\n\n${seed}\n\n=== END CONTEXT ===`;
  if (redactionCount > 0) {
    console.log(`[consult-hy3-design] redacted ${redactionCount} inline value(s) before egress — disclosed to reviewer`);
  }
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
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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

  const output = `# Tencent Hy3 - Design Inspiration\n\n**Reviewer:** \`${model}\` (${options.effort})\n`
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

// Only run when invoked as a script. Without this guard the module executes on import, so its
// redaction rules — a security control — could not be unit-tested at all (F4: no test file existed).
const invokedDirectly = process.argv[1]
  && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  main().catch((error) => {
    console.error(`[consult-hy3-design] ${error.message}`);
    process.exitCode = 1;
  });
}