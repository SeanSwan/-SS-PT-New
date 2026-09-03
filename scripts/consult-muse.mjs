#!/usr/bin/env node
/**
 * consult-muse.mjs — Meta Muse Spark 1.3 as SwanStudios' cheap EXECUTOR seat.
 * ==========================================================================
 * WHAT THIS IS FOR (Rule 71 routing: orchestrator-smart, executor-cheap). The
 * standard tier is ~2.4x/~3.5x cheaper than the Kimi seat and ~8x/~12x against
 * Fable, with NO data-training deal — the bulk-execution seat for scaffolding,
 * bounded refactors and doc distillation. It is NOT a Final Decider (Rule 46 is
 * unchanged) and its output is a HYPOTHESIS until verified (Rules 30, 73). Keep
 * it out of judge/verify work until this repo has its own evidence: it tops
 * Terminal Bench 2.1 but scores poorly on the newer 4.0, a spread Opus 5 does
 * not show, which reads as possible tuning to older public benchmarks.
 *
 * WHY THE CHEAP TIER IS GATED. The 12.5x contributor discount is not a discount,
 * it is a trade: Meta trains future models on the prompts AND the completions,
 * and its own docs exclude "client repositories, personal data, secrets,
 * unreleased product logic, and material under NDA". Unlike a leaked key there
 * is no rotation, so that tier is fail-closed behind an ALLOWLIST enforced at
 * the egress transport (scripts/lib/redact-egress.mjs) rather than by a flag
 * here — a flag in one script is bypassed by writing a second script.
 *
 * Dry-run is the default; a live call needs --confirm-spend, and the cumulative
 * spend-guard hook (.claude/skills/spend-guard) still governs. Full rationale,
 * proof log and the local lane: docs/ai-workflow/AI-HANDOFF/MUSE-SEAT-2026-09-02.md
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { redactForEgress, fetchForEgress, armTrainingTierEgress } from './lib/redact-egress.mjs';

const ROOT = process.cwd();

/** Verified against openrouter.ai/meta/muse-spark-1.3[-contributor] on 2026-09-02. */
const TIERS = {
  standard: {
    model: 'meta/muse-spark-1.3',
    priceIn: 1.25,
    priceOut: 4.25,
    trainsOnYourData: false,
  },
  contributor: {
    model: 'meta/muse-spark-1.3-contributor',
    priceIn: 0.10,
    priceOut: 0.20,
    trainsOnYourData: true,
  },
};

const DEFAULT_CAP_USD = 1.0;

function parseArgs(argv) {
  const options = {
    document: '',
    seed: '',
    out: 'docs/ai-workflow/AI-HANDOFF/MUSE-EXECUTOR-OUTPUT.md',
    remit: '',
    tier: process.env.SWAN_MUSE_TIER || 'standard',
    maxTokens: Number(process.env.SWAN_MUSE_MAX_TOKENS) || 32_000,
    capUsd: DEFAULT_CAP_USD,
    confirmSpend: false,
    help: false,
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
    else if (flag === '--tier') options.tier = next();
    else if (flag === '--max-tokens') options.maxTokens = Number(next());
    else if (flag === '--cap-usd') options.capUsd = Number(next());
    else if (flag === '--confirm-spend') options.confirmSpend = true;
    else if (flag === '--help' || flag === '-h') options.help = true;
    else throw new Error(`unknown argument: ${flag}`);
  }
  if (options.help) return options;
  if (!options.document) throw new Error('--document is required');
  if (!TIERS[options.tier]) throw new Error(`--tier must be standard or contributor (got: ${options.tier})`);
  if (!Number.isInteger(options.maxTokens) || options.maxTokens <= 0) {
    throw new Error('--max-tokens must be a positive integer');
  }
  if (!Number.isFinite(options.capUsd) || options.capUsd <= 0 || options.capUsd > DEFAULT_CAP_USD) {
    throw new Error(`--cap-usd must be positive and at most $${DEFAULT_CAP_USD.toFixed(2)}`);
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

/**
 * Blocks the file classes that must never leave this machine on ANY tier. This
 * is the same list the other consult seats carry; the contributor tier gets the
 * far stricter allowlist on top of it, in redact-egress.
 */
function assertSafeInputPath(path, label) {
  if (!path) return;
  const normalized = path.replace(/\\/g, '/').toLowerCase();
  const blocked = /(^|\/)\.env($|\.)|(^|\/)(secrets?|exports?|backups?)(\/|$)|\.(csv|sql|sqlite|db)$/;
  if (blocked.test(normalized)) throw new Error(`${label} is blocked by outbound-context policy: ${path}`);
  if (!existsSync(path)) throw new Error(`${label} not found: ${path}`);
}


function sanitizeOutboundText(value) {
  return redactForEgress(String(value ?? '')).text;
}

function estimateWorstCaseUsd(prompt, maxTokens, tier) {
  // Bytes, not tokens: deliberately conservative, per spend-guard doctrine that
  // the number shown to Sean must never flatter the call.
  const conservativeInputTokens = Buffer.byteLength(prompt, 'utf8');
  return (conservativeInputTokens / 1_000_000) * tier.priceIn
    + (maxTokens / 1_000_000) * tier.priceOut;
}

const defaultRemit = `You are Muse Spark 1.3 acting as the SwanStudios EXECUTOR seat.
You are not the decider. Do the bounded task exactly as specified, in the existing
style of the surrounding code, and stop at the stated scope — no speculative
refactors, no adjacent "improvements", no renamed symbols.
Non-negotiable house constraints: styled-components only (never MUI); tokenised
colors as var(--token, #fallback) with dark-first fallbacks; 44px minimum touch
targets; WCAG 4.5:1 contrast; files at or below 300 lines; Victory for charts.
State what you did NOT do and what you assumed. If the task is ambiguous in a way
that changes the output, say so rather than guessing silently.`;

function usage() {
  return [
    'Muse Spark 1.3 executor seat (dry-run by default)',
    '',
    'node scripts/consult-muse.mjs --document <path> [--seed <path>] [--out <path>]',
    '  [--remit "<text>"] [--tier standard|contributor] [--max-tokens 32000]',
    `  [--cap-usd ${DEFAULT_CAP_USD.toFixed(2)}] [--confirm-spend]`,
    '',
    'Tiers:',
    `  standard     ${TIERS.standard.model}  $${TIERS.standard.priceIn.toFixed(2)}/$${TIERS.standard.priceOut.toFixed(2)} per M — Meta does NOT train on it`,
    `  contributor  ${TIERS.contributor.model}  $${TIERS.contributor.priceIn.toFixed(2)}/$${TIERS.contributor.priceOut.toFixed(2)} per M — Meta DOES train on it;`,
    '               requires SWAN_TRAINING_TIER_ALLOWLIST to name the cleared path prefixes.',
  ].join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { console.log(usage()); return; }

  const tier = TIERS[options.tier];
  assertSafeInputPath(options.document, 'document');
  assertSafeInputPath(options.seed, 'seed');

  // An override may only pick another Muse model — this seat does not become a
  // back door to a pricier brain that the spend guard prices as Muse.
  const model = process.env.SWAN_MUSE_MODEL || tier.model;
  if (!/^meta\/muse-/i.test(model)) {
    throw new Error(`Muse-only policy blocks non-Muse model override: ${model}`);
  }
  if (/-contributor$/i.test(model) && options.tier !== 'contributor') {
    throw new Error('a -contributor model requires --tier contributor, so the allowlist gate runs');
  }

  // The allowlist names FILES, but --remit is free text that never passes it, so
  // on the training tier a hand-written remit is an unaudited side channel for
  // exactly the material the allowlist exists to hold back. The fixed default
  // remit is the only one that tier may carry.
  if (tier.trainsOnYourData && options.remit) {
    throw new Error(
      'a custom --remit is not allowed on the contributor (training) tier: its text bypasses the '
      + 'path allowlist. Put the instructions in an allowlisted --document, or use --tier standard.',
    );
  }

  const document = sanitizeOutboundText(readFileSync(options.document, 'utf8'));
  const seed = options.seed ? sanitizeOutboundText(readFileSync(options.seed, 'utf8')) : '(no seed provided)';
  const remit = sanitizeOutboundText(options.remit || defaultRemit);
  const prompt = `${remit}\n\n=== TASK DOCUMENT ===\n\n${document}\n\n=== SEED CONTEXT ===\n\n${seed}\n\n=== END CONTEXT ===`;
  const estimateUsd = estimateWorstCaseUsd(prompt, options.maxTokens, tier);

  console.log(`[consult-muse] status=preflight model_calls=0 model=${model} tier=${options.tier}`);
  console.log(`[consult-muse] prompt_chars=${prompt.length} max_tokens=${options.maxTokens}`);
  console.log(`[consult-muse] worst_case_usd=$${estimateUsd.toFixed(4)} cap_usd=$${options.capUsd.toFixed(2)}`);
  if (tier.trainsOnYourData) {
    console.log('[consult-muse] ⚠ TRAINING TIER — Meta trains on this prompt AND the reply. Not reversible.');
    console.log(`[consult-muse]   cleared prefixes: ${process.env.SWAN_TRAINING_TIER_ALLOWLIST || '(none — this call will be refused)'}`);
  }
  if (!options.confirmSpend) {
    console.log('[consult-muse] add --confirm-spend only after explicit approval for this run');
    return;
  }
  if (estimateUsd > options.capUsd) {
    throw new Error(`hard cap blocks call: worst-case $${estimateUsd.toFixed(4)} exceeds $${options.capUsd.toFixed(2)}`);
  }

  // Arm BEFORE the key is loaded so a refusal costs nothing. Every path whose
  // bytes are in the prompt must be named, or the socket gate refuses the call.
  // Paths go over RAW: the gate canonicalises them itself (realpath, off-root and
  // traversal rejection) so the invariant does not depend on this caller getting
  // it right — which is the whole point of the control living in the gate.
  if (tier.trainsOnYourData) {
    armTrainingTierEgress([options.document, options.seed].filter(Boolean));
  }

  const apiKey = loadOpenRouterKey();
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not found for confirmed run');
  console.log('[consult-muse] status=running model_calls=1');

  const started = Date.now();
  const response = await fetchForEgress('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://sswanstudios.com',
      'X-Title': 'SwanStudios Muse Executor',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens,
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(Number(process.env.SWAN_MUSE_TIMEOUT_MS) || 900_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 800).replace(apiKey, '<REDACTED_KEY>')}`);
  }
  const data = await response.json();
  if (data.error) throw new Error(`OpenRouter error: ${data.error.message || 'unknown error'}`);

  // Truncation is decided before the empty-content guard, and cost before both:
  // a call returning nothing was still billed, and reporting spend only on the
  // success path makes a failed run look free. Inherited from consult-kimi.mjs.
  const finish = data.choices?.[0]?.finish_reason ?? data.choices?.[0]?.native_finish_reason ?? null;
  const truncated = finish === 'length' || finish === 'max_tokens';
  const inputTokens = Number(data.usage?.prompt_tokens) || 0;
  const outputTokens = Number(data.usage?.completion_tokens) || 0;
  const actualUsd = (inputTokens / 1_000_000) * tier.priceIn + (outputTokens / 1_000_000) * tier.priceOut;

  const text = data.choices?.[0]?.message?.content;
  if (!text?.trim()) {
    const spent = `Billed anyway: in=${inputTokens} out=${outputTokens} ≈ $${actualUsd.toFixed(4)}.`;
    if (truncated) {
      throw new Error(
        `TRUNCATED WITH NO CONTENT — hit max_tokens (${options.maxTokens}) before emitting visible text. ${spent}`,
      );
    }
    throw new Error(
      `No visible Muse response (finish_reason=${finish}). ${spent} NOTHING WAS WRITTEN; do not retry without approval.`,
    );
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  const banner = truncated
    ? `> ⚠ **TRUNCATED** — hit max_tokens (${options.maxTokens}); this reply is INCOMPLETE.\n`
      + '> Re-run with a higher --max-tokens, or split the task into narrower calls.\n\n'
    : '';
  const trainingNote = tier.trainsOnYourData
    ? '\n> ⚠ Produced on the **contributor (training) tier** — Meta may train on this exchange.\n'
    : '';

  const output = `# Muse Spark 1.3 — Executor Output\n\n`
    + `**Model:** \`${model}\` (tier: ${options.tier})\n`
    + `**Document:** ${options.document}\n**Seed:** ${options.seed || '(none)'}\n`
    + `**Tokens:** ${inputTokens} in / ${outputTokens} out | **Cost:** ~$${actualUsd.toFixed(4)}`
    + ` | **Wall:** ${seconds}s | **finish_reason:** ${finish ?? '?'}\n`
    + `${trainingNote}\n> Executor output is a HYPOTHESIS (Rule 30). Verify before relying on it; it is not a decider.\n`
    + `\n---\n\n${banner}${text}\n`;
  writeFileSync(options.out, output, 'utf8');
  console.log(`[consult-muse] status=complete cost_usd=$${actualUsd.toFixed(4)} saved=${options.out} finish=${finish ?? '?'}`);
  if (truncated) {
    console.error(`[consult-muse] ⚠ TRUNCATED at max_tokens=${options.maxTokens} — reply incomplete.`);
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(`[consult-muse] ${error.message}`);
  process.exitCode = 1;
});
