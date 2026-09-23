#!/usr/bin/env node
/**
 * Tencent Hy3 / HY4 design-only review via OpenRouter. The seat is derived from the
 * model (`SWAN_HY3_MODEL`) and names both the remit and the output H1.
 *
 * Dry-run is the default. A live call requires --confirm-spend and is blocked
 * before network access when its conservative worst-case estimate exceeds the
 * hard cap (default: $3).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readForEgress, redactForEgress } from './lib/redact-egress.mjs';
import { streamChatCompletion } from './lib/openrouter-stream.mjs';

const ROOT = process.cwd();
const DEFAULT_MODEL = 'tencent/hy3';

// STALE-POLICY FIX (2026-09-18). This script used to hard-block every model but
// `tencent/hy3`, so a HY4 review routed through here was silently answered by HY3
// — and filed under HY4's name. That is the exact misattribution failure the
// consult-grok sibling documents in its own header (three seats filing under one
// name makes per-model calibration impossible). HY4 is a real, distinct preview
// seat with no other transport in this repo, so the allowlist now names the
// Tencent family explicitly and pricing is resolved per model.
//
// PRICING IS NOW LIVE-VERIFIED (2026-09-18) from
//   GET https://openrouter.ai/api/v1/models  -> find id === 'tencent/hy4-preview'
// The first version of this fix copied Hy3's rate for hy4-preview as a
// placeholder; that was WRONG by ~6.5x on input and ~4.7x on output. This is a
// fresh preview model whose rate is ~6x Hy3's, so a placeholder inherited from
// the sibling silently under-estimated every worst-case guard by an order of
// magnitude — the exact class of error that lets a call sail past its cap.
// Rates below are USD per 1M tokens, taken from the provider catalog.
const MODEL_PRICING = {
  'tencent/hy3': { in: 0.1288, out: 0.5336 },        // hy3: 0.000000132 / 0.000000528 per token
  'tencent/hy4-preview': { in: 0.834, out: 2.501 },  // hy4: 0.000000834 / 0.000002501 per token
};
/** Models this transport is permitted to call (Tencent family only). */
const ALLOWED_MODEL = /^tencent\/(hy3|hy4-preview)$/i;
const DEFAULT_CAP_USD = 3;

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

// Egress gate (2026-08-22): the previous sanitizer covered emails/keys/JWTs but had
// NO operator-identity or absolute-path pattern, so 140 username occurrences reached
// six vendors while a scan reported clean. One shared redactor now owns this, and it
// proves itself on a canary before every use.
function sanitizeOutboundText(value) {
  // Shared egress redactor only (2026-08-26): the local pattern copy that once
  // stacked here was a strict subset and drifted per script. The transport gate
  // (fetchForEgress) re-runs the same redactor on the final body regardless.
  return redactForEgress(String(value ?? '')).text;
}

function estimateWorstCaseUsd(prompt, maxTokens, pricing) {
  const conservativeInputTokens = Buffer.byteLength(prompt, 'utf8');
  return (conservativeInputTokens / 1_000_000) * pricing.in
    + (maxTokens / 1_000_000) * pricing.out;
}

/**
 * The remit names the SEAT, not a fixed model.
 *
 * It used to hardcode "You are Tencent Hy3" regardless of `SWAN_HY3_MODEL`, so a
 * hy4-preview run instructed the model it was HY3 — and HY4's own reply opened
 * "HY3 hostile review — Swan theme lens" while the derived H1 correctly said HY4.
 * A review that misnames its own seat is the same class of defect this script's
 * header documents for the model allowlist: the artefact files under one name and
 * was produced by another.
 *
 * The label is derived once from the model and read by BOTH the remit and the H1,
 * so they cannot disagree.
 */
const defaultRemitFor = (seat) => `You are Tencent ${seat}, the SwanStudios design-inspiration reviewer. Give only UI/UX and interaction suggestions.
Give a rigorous hostile design and implementation review. Rank weaknesses by severity,
identify the single highest-impact improvement, and give builder-exact corrections.
Enforce Crystalline Swan dark-first design, styled-components, Victory charts, tokenized
colors, 44px touch targets, WCAG 4.5:1, files at or below 300 lines, responsive behavior
at 320/375/414/768/1024/1440/2560/3840, and reduced-motion safety. Be concrete.`;

function usage() {
  return [
    'Hy3/HY4 design review (dry-run by default)',
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
  if (!ALLOWED_MODEL.test(model)) {
    throw new Error(
      `Hy3/HY4 design policy blocks non-Tencent model override: ${model}`
      + ` (allowed: ${Object.keys(MODEL_PRICING).join(', ')})`,
    );
  }
  const pricing = MODEL_PRICING[model.toLowerCase()];
  /** The seat, derived from the model. Single source for the remit AND the H1. */
  const seatLabel = model.toLowerCase().includes('hy4') ? 'HY4' : 'HY3';

  const document = sanitizeOutboundText(readFileSync(options.document, 'utf8'));
  const seed = options.seed ? sanitizeOutboundText(readFileSync(options.seed, 'utf8')) : '(no seed provided)';
  const remit = sanitizeOutboundText(options.remit || defaultRemitFor(seatLabel));
  const prompt = `${remit}\n\n=== DOCUMENT UNDER REVIEW ===\n\n${document}\n\n=== SEED CONTEXT ===\n\n${seed}\n\n=== END CONTEXT ===`;
  const estimateUsd = estimateWorstCaseUsd(prompt, options.maxTokens, pricing);

  console.log(`[consult-hy3-design] status=preflight model_calls=0 model=${model} seat=${seatLabel}`);
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

  // STREAMING IS REQUIRED, NOT OPTIONAL (fixed 2026-09-18).
  //
  // This block used to be a plain `await fetch(...)` + `await response.json()` behind a
  // 900s AbortSignal.timeout. On a REASONING seat that is a silent money-burner: OpenRouter
  // does not send response HEADERS until the model starts emitting, so a model that reasons
  // for many minutes parks the request in "waiting for headers" while the billed output
  // accumulates server-side and NOTHING reaches the wire. Three live hy4-preview attempts on
  // 2026-09-18 billed ~$0.106 and wrote zero bytes of output, for exactly this reason.
  //
  // This is the failure class scripts/lib/openrouter-stream.mjs was written for on
  // 2026-08-21 — "three sibling consult scripts each did a non-streaming POST behind a 600s
  // timeout… its ENTIRE paid reply is lost" — and this script was the one that never got the
  // fix. Using the shared helper rather than inlining a fourth copy is the point: the reason
  // the bug survived here is that each sibling carried its own private implementation.
  const result = await streamChatCompletion({
    apiKey,
    model,
    prompt,
    maxTokens: options.maxTokens,
    temperature: 0.3,
    effort: options.effort,
    title: `SwanStudios ${model} Design Review`,
    idleMs: Number(process.env.SWAN_HY3_IDLE_MS) || 300_000,
    label: 'consult-hy3-design',
  });

  const { text, finish, usage, truncated } = result;
  if (!text?.trim()) {
    if (truncated) {
      throw new Error(
        `TRUNCATED WITH NO CONTENT — hit max_tokens (${options.maxTokens}) before emitting visible text`
        + ` (reasoning consumed the budget). Re-run with a higher --max-tokens or --effort low.`,
      );
    }
    throw new Error(`OpenRouter returned no visible response for ${model}`);
  }

  // Usage comes from the final SSE frame (`usage: { include: true }`), the
  // provider-authoritative count. A reasoning-only reply is therefore a DISTINCT,
  // named diagnosis from a transport failure — previously the two were
  // indistinguishable because neither wrote a file.
  const inputTokens = Number(usage?.prompt_tokens) || 0;
  const outputTokens = Number(usage?.completion_tokens) || 0;
  const actualUsd = (inputTokens / 1_000_000) * pricing.in
    + (outputTokens / 1_000_000) * pricing.out;
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
  // `seatLabel` is derived once, next to the model resolution — the remit and this
  // H1 both read it, so a review cannot be addressed to one seat and filed under
  // another.
  const h1 = subject ? `${subject} — reviewed by ${seatLabel} (${model})` : `Tencent ${seatLabel} - Design Inspiration`;

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