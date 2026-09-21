#!/usr/bin/env node
/**
 * consult-astra-subscription.mjs — the DEFAULT Astra route.
 * =========================================================
 * Astra reached through the ChatGPT subscription via the authenticated Codex
 * CLI. No `.env` loader, no OpenRouter key, no per-token bill. Sibling of
 * `consult-codex.mjs`, which established the subscription-transport pattern.
 *
 * WHY THIS EXISTS (Sean, 2026-09-19):
 *   "if we're ever calling Astra, it's no longer going to be via OpenRouter.
 *    We are not paying no money to call Astra now because we have subscription."
 *
 * MEASURED 2026-09-19 — the two tiers do NOT behave alike, and this is the
 * single most important fact in this file:
 *   `gpt-6-astra`      → served. Probe returned ASTRA-PROBE-OK.
 *   `gpt-6-astra-pro`  → REFUSED. HTTP 400, "The 'gpt-6-astra-pro' model is not
 *                        supported when using Codex with a ChatGPT account."
 * The pro tier has NO subscription transport; it is OpenRouter-only and stays
 * reachable only through the double gate in `lib/astra-reseller-gate.mjs`.
 * This script refuses `-pro` up front rather than spending a round-trip to be
 * told the same thing by the API.
 *
 * CONTEXT COST — worth knowing before you dispatch. Codex `exec` is an agent,
 * not a bare completion: it loads this repo's instruction files and its skill
 * index into every call. A one-line probe measured **34,596 input tokens for an
 * 11-token reply**. The marginal cost is $0 on the subscription, but the context
 * is real, and `codex exec` reports when it has had to shorten skill
 * descriptions to fit the budget.
 *
 * Usage:
 *   node scripts/consult-astra-subscription.mjs --document <packet.md>
 *     [--out <path>] [--remit "<text>"] [--model gpt-6-astra] [--timeout-ms N]
 *
 * Exit codes: 0 complete · 2 blocked (no subscription auth) · 3 failed · 4 usage
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { readForEgress, redactOutbound } from './lib/redact-egress.mjs';
import { DEFAULT_ASTRA_EFFORT, resolveEffort } from './lib/astra-effort.mjs';
import { runCodexSubscription } from './mcp/swan-council-subscription.mjs';
import { armMegaBlueprintPrompt, megaBlueprintUsage } from './lib/mega-blueprint-mandate.mjs';
import {
  buildReceiptMeta, identityFields, renderProgressLine, renderReplyHeader,
  SERVED_MODEL_UNVERIFIABLE,
} from './lib/subscription-receipt.mjs';

const DEFAULT_MODEL = 'gpt-6-astra';
const DEFAULT_OUT = 'docs/ai-workflow/AI-HANDOFF/ASTRA-SUBSCRIPTION-REPLY.md';
const MAX_TIMEOUT_MS = 1_800_000;

// The D12 finding — the served model is unverifiable on this transport BY CONSTRUCTION,
// with the measured codex-cli 0.154.0 event set recorded as evidence — lives with the
// receipt it constrains. See `SERVED_MODEL_UNVERIFIABLE` and `identityFields` in
// scripts/lib/subscription-receipt.mjs.

/**
 * Exit codes — DISTINCT ON PURPOSE (R4 finding, hostile review round 4).
 *
 * The first version returned 3 for three unrelated failures: a dry-run contract
 * check, an incomplete model run, and every uncaught exception. A caller could
 * not tell "you gave me a bad path" from "the model timed out" from "the mandate
 * never reached the prompt" — and those want OPPOSITE responses. An automation
 * that retries on 3 would retry a wrong path forever.
 *
 *   0  OK           the call completed, or --dry-run found the mandate intact
 *   2  BLOCKED      auth/transport refused; no metered fallback was attempted
 *   3  INCOMPLETE   the model ran and did not finish — retrying is meaningful
 *   4  USAGE        bad flags or missing --document — fix the invocation, do not retry
 *   5  CONTRACT     --dry-run only: armed, but the mandate is absent from the prompt
 *   6  INPUT        the packet could not be read — fix the path, do not retry
 *   7  INTERNAL     unexpected failure — a bug here, not in the invocation
 *
 * 1 is deliberately unused: a bare uncaught throw from Node reports 1, so
 * reserving it keeps "the script said USAGE" distinguishable from "the script
 * crashed before it could say anything".
 */
export const EXIT = {
  OK: 0, BLOCKED: 2, INCOMPLETE: 3, USAGE: 4, CONTRACT: 5, INPUT: 6, INTERNAL: 7,
};

/** Read failures we can name — a wrong path is not a bug in this script. */
const INPUT_ERRNO = new Set(['ENOENT', 'EISDIR', 'EACCES', 'EPERM', 'ENOTDIR']);

/**
 * Classify an uncaught failure. Exported so the mapping is testable without
 * spawning a process — the whole point of the split is that a caller can act on
 * it, so a test must be able to prove which error lands on which code.
 */
export const exitCodeForError = (error) =>
  (INPUT_ERRNO.has(error?.code) ? EXIT.INPUT : EXIT.INTERNAL);

const DEFAULT_REMIT = `You are Astra, reviewing as an independent adjudicator for the SS-PT /
SwanStudios chain. Your job is rigorous, anti-sycophantic review. Cite file:line evidence for every
finding. Tag factual claims [VERIFIED] / [LIKELY] / [HYPOTHESIS] / [UNKNOWN]. A finding without a
concrete fix is not a finding. Review only the scope in the packet — do not infer that omitted or
truncated content was reviewed. Do not restate the packet back to me; spend every token on findings.`;

function parseArgs(argv) {
  const flags = new Set(['--document', '--out', '--remit', '--model', '--timeout-ms', '--effort']);
  const raw = {};
  // null = auto-detect the Mega Blueprint keyword; true/false = operator forced it.
  let megaBlueprint = null;
  let dryRun = false; let bounded = false;
  for (let i = 0; i < argv.length; i += 1) {
    const name = argv[i];
    if (name === '--help' || name === '-h') return { help: true };
    if (name === '--mega-blueprint') { megaBlueprint = true; continue; }
    if (name === '--no-mega-blueprint') { megaBlueprint = false; continue; }
    if (name === '--dry-run') { dryRun = true; continue; }
    if (name === '--bounded') { bounded = true; continue; } // scope, not rigour; see mega-blueprint-scope.mjs
    const value = argv[i + 1];
    if (!flags.has(name) || typeof value !== 'string' || value.startsWith('--') || name in raw) {
      throw new Error(`invalid argument: ${name}`);
    }
    raw[name] = value;
    i += 1;
  }
  const options = {
    document: raw['--document'],
    out: raw['--out'] || DEFAULT_OUT,
    remit: raw['--remit'] || '',
    model: raw['--model'] || process.env.SWAN_ASTRA_MODEL || DEFAULT_MODEL,
    // Resolved HERE so the existing USAGE catch reports a bad level rather than letting
    // the ambient CODEX_HOME decide the depth. See scripts/lib/astra-effort.mjs.
    effort: resolveEffort(raw['--effort'] || process.env.SWAN_ASTRA_EFFORT || ''),
    timeoutMs: Number(raw['--timeout-ms'] ?? MAX_TIMEOUT_MS),
    megaBlueprint,
    dryRun, bounded,
  };
  if (!options.document) throw new Error('--document is required');
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1 || options.timeoutMs > MAX_TIMEOUT_MS) {
    throw new Error(`--timeout-ms must be an integer between 1 and ${MAX_TIMEOUT_MS}`);
  }
  return options;
}

const usage = () => [
  'Astra via the ChatGPT subscription (Codex CLI transport) — no OpenRouter, no per-token bill.',
  'node scripts/consult-astra-subscription.mjs --document <packet.md> [--out <path>]',
  `  [--remit "<text>"] [--model ${DEFAULT_MODEL}] [--timeout-ms N]`,
  `  [--effort ${DEFAULT_ASTRA_EFFORT}]  reasoning depth; overrides the ambient CODEX_HOME config`,
  '  [--mega-blueprint|--no-mega-blueprint] [--dry-run] [--bounded: packet only, 14x cheaper]',
  ...megaBlueprintUsage(),
  'The pro tier is NOT reachable here (ChatGPT accounts are refused it).',
  'For gpt-6-astra-pro use the OpenRouter path, which is double-gated.',
  '',
  'EXIT CODES: 0 ok · 2 blocked (auth/transport) · 3 incomplete (retry is meaningful)',
  '            4 usage (fix the invocation) · 5 contract (dry-run: mandate absent)',
  '            6 input (fix the path) · 7 internal (a bug)',
].join('\n');

export async function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(`[consult-astra] ${error.message}`);
    console.error(usage());
    return EXIT.USAGE;
  }
  if (options.help) { console.log(usage()); return EXIT.OK; }

  // Fail fast on the tier the subscription cannot serve. This is the measured
  // 2026-09-19 constraint, not a guess — see the header.
  if (/-pro$/i.test(options.model)) {
    console.error(
      `[consult-astra] REFUSED: "${options.model}" is not served on a ChatGPT account ` +
      '(HTTP 400: "not supported when using Codex with a ChatGPT account"). ' +
      `Use --model ${DEFAULT_MODEL} on the subscription, or the double-gated OpenRouter path ` +
      'if the pro tier is genuinely required.',
    );
    // USAGE, not BLOCKED: the operator asked for a tier this transport cannot serve,
    // so the fix is to change the invocation — retrying this command changes nothing.
    return EXIT.USAGE;
  }

  const document = readForEgress(options.document, { label: 'document' });

  // ---- remit must be redacted too (R3 finding) -------------------------------
  // The subscription transport shells out to the Codex CLI, so it never passes
  // through `fetchForEgress()` — the chokepoint that redacts `init.body` on the
  // HTTP path. On THIS transport the only redaction that happens is what this
  // script does by hand. The document was covered; the remit was not, and it is
  // free-form operator text sent verbatim. Redacting one input and not its
  // sibling is worse than redacting neither: it invites the assumption that both
  // are covered.
  const remit = redactOutbound(options.remit || DEFAULT_REMIT, { label: 'remit' });

  // ---- Mega Blueprint arming -------------------------------------------------
  // One definition, imported — not reimplemented here. ORDER MATTERS: redact, then
  // detect, then build, so detection sees exactly the text that will be sent and a
  // keyword inside a redacted region cannot arm a pipeline on text the model never
  // receives.
  const arming = armMegaBlueprintPrompt({
    remit, document, packet: options.document, flag: options.megaBlueprint,
    bounded: options.bounded,
  });
  const { armed, prompt } = arming;

  console.log(`[consult-astra] transport=codex-cli billing=chatgpt-subscription model=${options.model} effort=${options.effort}`);
  console.log(`[consult-astra] document: ${options.document} (${document.length} chars after redaction)`);

  if (arming.banner) {
    console.log(arming.banner);
    console.log(`[consult-astra] armed by: ${arming.armedBy.join(', ')}`);
    console.log(`[consult-astra] scope: ${arming.bounded ? 'BOUNDED — packet only' : 'UNBOUNDED — full hunt (~9 min)'}`);
  }

  if (options.dryRun) {
    // Deterministic arming check: proves the mandate reached the prompt without
    // spending a model call. `--dry-run` never dispatches.
    const hasContract = prompt.includes('## PART B — FORGED PACKAGE');
    const hasBothReviews = prompt.includes('A1 — REVIEW OF THE EXISTING BLUEPRINTS')
      && prompt.includes('A2 — REVIEW OF YOUR OWN PACKAGE');
    console.log('[consult-astra] --dry-run: no model call made.');
    console.log(`[consult-astra] megaBlueprint=${armed} bounded=${arming.bounded}`);
    console.log(`[consult-astra] prompt_chars=${prompt.length} document_chars=${document.length}`);
    console.log(`[consult-astra] contract_headings_present=${hasContract} both_hostile_reviews_present=${hasBothReviews}`);
    // Exit non-zero if the mode was armed but the mandate did not make it in —
    // an arming that silently does nothing is the failure worth catching.
    if (armed && (!hasContract || !hasBothReviews)) return EXIT.CONTRACT;
    return EXIT.OK;
  }

  const started = Date.now();
  const result = await runCodexSubscription({
    prompt,
    root: process.cwd(),
    model: options.model,
    effort: options.effort,
    timeoutMs: options.timeoutMs,
  });
  const wall = ((Date.now() - started) / 1000).toFixed(1);

  if (result.status !== 'complete') {
    console.error(`[consult-astra] ${result.status.toUpperCase()}: ${result.error}`);
    console.error(`[consult-astra] authMode=${result.authMode} — no metered fallback was attempted.`);
    return result.status === 'blocked' ? EXIT.BLOCKED : EXIT.INCOMPLETE;
  }

  // The token fields this leg reports, in receipt order. Declared once so the header,
  // the progress line and the sidecar cannot drift apart.
  const tokens = [
    ['in', result.inputTokens],
    ['out', result.outputTokens],
    ['reasoning', result.reasoningOutputTokens],
  ];

  const header = renderReplyHeader({
    subject: 'Astra',
    result,
    document: options.document,
    wall,
    armed,
    armedBy: arming.armedBy,
    servedModelLabel: SERVED_MODEL_UNVERIFIABLE,
    tokens,
    costNote: 'Marginal cost $0 — this leg rides the ChatGPT subscription, not OpenRouter.',
  });

  mkdirSync(dirname(resolve(options.out)), { recursive: true });
  writeFileSync(options.out, header + result.text + '\n', 'utf8');
  writeFileSync(
    `${options.out.replace(/\.md$/, '')}.meta.json`,
    JSON.stringify(buildReceiptMeta({
      result,
      document: options.document,
      wall,
      armed,
      armedBy: arming.armedBy,
      identity: identityFields(result.servedModel),
      extra: {
        // The level this run was ASKED for, so a receipt can answer "how deep did this
        // go?" without anyone having to reconstruct the invocation from memory.
        effort: options.effort,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        reasoningOutputTokens: result.reasoningOutputTokens,
      },
    }), null, 2),
    'utf8',
  );

  console.log(renderProgressLine({ tag: 'consult-astra', wall, tokens }));
  console.log(`[consult-astra] saved: ${options.out}`);
  return EXIT.OK;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]).endsWith('consult-astra-subscription.mjs');
if (invokedDirectly) {
  main().then((code) => { if (code) process.exitCode = code; }).catch((error) => {
    console.error(`[consult-astra] ERROR: ${error.message}`);
    // A wrong path is the operator's to fix; anything else is ours to fix. Telling
    // those two apart is the whole point of not collapsing them into one code.
    process.exitCode = exitCodeForError(error);
  });
}

export { parseArgs, DEFAULT_MODEL };
