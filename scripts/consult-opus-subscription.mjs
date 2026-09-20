#!/usr/bin/env node
/**
 * consult-opus-subscription.mjs — consult Opus 5 through the Claude subscription.
 * ==============================================================================
 * Opus 5 reached via the authenticated Claude Code CLI on a Claude Max subscription.
 * No `.env` loader, no OpenRouter key, no per-token bill. The Claude-side sibling of
 * `consult-astra-subscription.mjs`, which established the subscription-transport pattern
 * on the ChatGPT side.
 *
 * WHY THIS EXISTS (Sean, 2026-09-19):
 *   "I NEED YOU TO DO THE SAME FOR OPUS 5 ... CREATE A CALL FOR OPUS 5 FROM THE
 *    SUBSCRIPTION"
 *
 * EFFORT IS SETTABLE HERE — unlike the codex leg. `claude -p` accepts a real per-call
 * `--effort` flag (verified against `claude --help` on 2.1.259, 2026-09-19). The codex
 * runner hardcodes its argv and can only reach effort through ambient `CODEX_HOME`, which
 * is why an Astra run once had to be attributed from a rollout log. That ambient trap does
 * not exist on this transport: whatever `--effort` this script passes is what runs.
 *
 * THE PROMPT GOES OVER STDIN, NOT ARGV. A consult packet runs to tens of kilobytes and the
 * Windows command line caps out near 32k characters, so an argv-borne prompt works in
 * testing and fails on the real packet. `--print` with no prompt argument reads stdin; the
 * runner does that for us.
 *
 * THE READ-ONLY BOUNDARY IS A FLAG SET. `claude -p` has no `--sandbox read-only`
 * equivalent. The runner passes `--tools ""` (no built-in tools), `--strict-mcp-config`
 * (no MCP servers) and `--safe-mode` (no CLAUDE.md, skills, plugins, hooks). Consequence
 * worth knowing: the model can consult ONLY the packet it is given — it cannot Read the
 * repo. That is the right posture for an adversarial review, but it is LESS context than
 * the codex leg gets, so do not assume the two legs saw the same thing.
 *
 * AUTH IS CHECKED TWICE, ON PURPOSE. `claude auth status` reports LOCAL state and is
 * optimistic: measured 2026-09-19, it returned `loggedIn: true` while the OAuth tokens were
 * empty and every dispatch failed. So this script opts into the credential preflight
 * (`preflightOauth`), which turns that into a BLOCKED exit with an actionable reason BEFORE
 * spending a call. If the tokens are dead, the fix is `claude auth login` — run it yourself;
 * this script will never re-authenticate on your behalf.
 *
 * Usage:
 *   node scripts/consult-opus-subscription.mjs --document <packet.md>
 *     [--out <path>] [--remit "<text>"] [--model claude-opus-5]
 *     [--effort low|medium|high|xhigh|max] [--timeout-ms N]
 *
 * Exit codes: 0 complete · 2 blocked (no subscription auth / OAuth unusable) · 3 failed
 *             4 usage · 5 contract (dry-run: mandate absent) · 6 input · 7 internal
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { readForEgress, redactOutbound } from './lib/redact-egress.mjs';
import {
  CLAUDE_EFFORT_LEVELS,
  runClaudeSubscription,
} from './mcp/swan-claude-subscription.mjs';
import { armMegaBlueprintPrompt, megaBlueprintUsage } from './lib/mega-blueprint-mandate.mjs';
import {
  buildReceiptMeta, identityFields, renderProgressLine, renderReplyHeader,
  SERVED_MODEL_UNREPORTED_CLAUDE,
} from './lib/subscription-receipt.mjs';

const DEFAULT_MODEL = 'claude-opus-5';
const DEFAULT_OUT = 'docs/ai-workflow/AI-HANDOFF/OPUS-SUBSCRIPTION-REPLY.md';
const MAX_TIMEOUT_MS = 1_800_000;

/**
 * Exit codes — DISTINCT ON PURPOSE. A caller must be able to tell "you gave me a bad path"
 * from "the model timed out" from "the mandate never reached the prompt", because those
 * want OPPOSITE responses: one is fixed by editing the invocation, one by retrying, and one
 * by fixing this script. An automation that retries on 3 would retry a wrong path forever.
 *
 *   0  OK           the call completed, or --dry-run found the mandate intact
 *   2  BLOCKED      auth/transport refused; no metered fallback was attempted
 *   3  INCOMPLETE   the model ran and did not finish — retrying is meaningful
 *   4  USAGE        bad flags or missing --document — fix the invocation, do not retry
 *   5  CONTRACT     --dry-run only: armed, but the mandate is absent from the prompt
 *   6  INPUT        the packet could not be read — fix the path, do not retry
 *   7  INTERNAL     unexpected failure — a bug here, not in the invocation
 *
 * 1 is deliberately unused: a bare uncaught throw from Node reports 1, so reserving it
 * keeps "the script said USAGE" distinguishable from "the script crashed".
 */
export const EXIT = {
  OK: 0, BLOCKED: 2, INCOMPLETE: 3, USAGE: 4, CONTRACT: 5, INPUT: 6, INTERNAL: 7,
};

/** Read failures we can name — a wrong path is not a bug in this script. */
const INPUT_ERRNO = new Set(['ENOENT', 'EISDIR', 'EACCES', 'EPERM', 'ENOTDIR']);

/**
 * Classify an uncaught failure. Exported so the mapping is testable without spawning a
 * process — the whole point of the split is that a caller can act on it.
 */
export const exitCodeForError = (error) =>
  (INPUT_ERRNO.has(error?.code) ? EXIT.INPUT : EXIT.INTERNAL);

const DEFAULT_REMIT = `You are Opus 5, reviewing as an independent adjudicator for the SS-PT /
SwanStudios chain. Your job is rigorous, anti-sycophantic review. Cite file:line evidence for every
finding. Tag factual claims [VERIFIED] / [LIKELY] / [HYPOTHESIS] / [UNKNOWN]. A finding without a
concrete fix is not a finding. Review only the scope in the packet — do not infer that omitted or
truncated content was reviewed, and do not assume you have repo access: you have none, so anything
not in the packet is [UNKNOWN] rather than absent. Do not restate the packet back to me; spend every
token on findings.`;

function parseArgs(argv) {
  const flags = new Set(['--document', '--out', '--remit', '--model', '--effort', '--timeout-ms']);
  const raw = {};
  // null = auto-detect the Mega Blueprint keyword; true/false = operator forced it.
  let megaBlueprint = null;
  let dryRun = false;
  for (let i = 0; i < argv.length; i += 1) {
    const name = argv[i];
    if (name === '--help' || name === '-h') return { help: true };
    if (name === '--mega-blueprint') { megaBlueprint = true; continue; }
    if (name === '--no-mega-blueprint') { megaBlueprint = false; continue; }
    if (name === '--dry-run') { dryRun = true; continue; }
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
    model: raw['--model'] || process.env.SWAN_OPUS_MODEL || DEFAULT_MODEL,
    effort: raw['--effort'] || process.env.SWAN_OPUS_EFFORT || null,
    timeoutMs: Number(raw['--timeout-ms'] ?? MAX_TIMEOUT_MS),
    megaBlueprint,
    dryRun,
  };
  if (!options.document) throw new Error('--document is required');
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1 || options.timeoutMs > MAX_TIMEOUT_MS) {
    throw new Error(`--timeout-ms must be an integer between 1 and ${MAX_TIMEOUT_MS}`);
  }
  // Reject an unknown level here rather than letting the CLI ignore it. A silently dropped
  // effort flag is the worst outcome: the run looks configured and is not.
  if (options.effort !== null && !CLAUDE_EFFORT_LEVELS.includes(options.effort)) {
    throw new Error(`--effort must be one of ${CLAUDE_EFFORT_LEVELS.join('|')}`);
  }
  return options;
}

const usage = () => [
  'Opus 5 via the Claude subscription (Claude Code CLI transport) — no OpenRouter, no per-token bill.',
  'node scripts/consult-opus-subscription.mjs --document <packet.md> [--out <path>]',
  `  [--remit "<text>"] [--model ${DEFAULT_MODEL}] [--effort <${CLAUDE_EFFORT_LEVELS.join('|')}>]`,
  '  [--timeout-ms N] [--mega-blueprint | --no-mega-blueprint] [--dry-run]',
  ...megaBlueprintUsage(),
  'The packet is sent over stdin (Windows argv caps out near 32k chars).',
  'If this exits 2 with oauth_unusable, run `claude auth login` — this script will not',
  're-authenticate for you.',
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
    console.error(`[consult-opus] ${error.message}`);
    console.error(usage());
    return EXIT.USAGE;
  }
  if (options.help) { console.log(usage()); return EXIT.OK; }

  const document = readForEgress(options.document, { label: 'document' });

  // ---- remit must be redacted too --------------------------------------------
  // This transport shells out to the Claude CLI, so it never passes through
  // `fetchForEgress()` — the chokepoint that redacts `init.body` on the HTTP path. On THIS
  // transport the only redaction that happens is what this script does by hand. The
  // document is covered; the remit is free-form operator text sent verbatim, and redacting
  // one input and not its sibling is worse than redacting neither, because it invites the
  // assumption that both are covered.
  const remit = redactOutbound(options.remit || DEFAULT_REMIT, { label: 'remit' });

  // ---- Mega Blueprint arming --------------------------------------------------
  // One definition, imported — not reimplemented here. ORDER MATTERS: redact, then detect,
  // then build, so detection sees exactly the text that will be sent and a keyword inside a
  // redacted region cannot arm a pipeline on text the model never receives.
  const arming = armMegaBlueprintPrompt({
    remit, document, packet: options.document, flag: options.megaBlueprint,
  });
  const { armed, prompt } = arming;

  console.log(`[consult-opus] transport=claude-cli billing=claude-subscription model=${options.model} effort=${options.effort ?? 'cli-default'}`);
  console.log(`[consult-opus] document: ${options.document} (${document.length} chars after redaction)`);

  if (arming.banner) {
    console.log(arming.banner);
    console.log(`[consult-opus] armed by: ${arming.armedBy.join(', ')}`);
  }

  if (options.dryRun) {
    // Deterministic arming check: proves the mandate reached the prompt without spending a
    // model call. `--dry-run` never dispatches — which also makes it the only mode provable
    // on a machine whose OAuth session is dead.
    const hasContract = prompt.includes('## PART B — FORGED PACKAGE');
    const hasBothReviews = prompt.includes('A1 — REVIEW OF THE EXISTING BLUEPRINTS')
      && prompt.includes('A2 — REVIEW OF YOUR OWN PACKAGE');
    console.log('[consult-opus] --dry-run: no model call made.');
    console.log(`[consult-opus] megaBlueprint=${armed}`);
    console.log(`[consult-opus] prompt_chars=${prompt.length} document_chars=${document.length}`);
    console.log(`[consult-opus] contract_headings_present=${hasContract} both_hostile_reviews_present=${hasBothReviews}`);
    // Exit non-zero if the mode was armed but the mandate did not make it in — an arming
    // that silently does nothing is the failure worth catching.
    if (armed && (!hasContract || !hasBothReviews)) return EXIT.CONTRACT;
    return EXIT.OK;
  }

  const started = Date.now();
  const result = await runClaudeSubscription({
    prompt,
    root: process.cwd(),
    model: options.model,
    effort: options.effort,
    timeoutMs: options.timeoutMs,
    // Fail fast with an actionable reason instead of spending a round-trip to be told the
    // session is dead. See the header.
    preflightOauth: true,
  });
  const wall = ((Date.now() - started) / 1000).toFixed(1);

  if (result.status !== 'complete') {
    console.error(`[consult-opus] ${result.status.toUpperCase()}: ${result.error}`);
    console.error(`[consult-opus] authMode=${result.authMode} errorCode=${result.errorCode} — no metered fallback was attempted.`);
    return result.status === 'blocked' ? EXIT.BLOCKED : EXIT.INCOMPLETE;
  }

  // The token fields this leg reports, in receipt order. Declared once so the header, the
  // progress line and the sidecar cannot drift apart. `thinking` is the field that reveals
  // which effort actually ran.
  const tokens = [
    ['in', result.inputTokens],
    ['out', result.outputTokens],
    ['thinking', result.thinkingTokens],
  ];

  const header = renderReplyHeader({
    subject: 'Opus 5',
    result,
    document: options.document,
    wall,
    armed,
    armedBy: arming.armedBy,
    servedModelLabel: SERVED_MODEL_UNREPORTED_CLAUDE,
    tokens,
    costNote: 'Marginal cost $0 — this leg rides the Claude Max subscription, not a per-token reseller.',
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
      // The Claude-specific reason, NOT the codex one — see SERVED_MODEL_UNREPORTED_CLAUDE.
      identity: identityFields(result.servedModel, { unverifiableReason: SERVED_MODEL_UNREPORTED_CLAUDE }),
      extra: {
        requestedEffort: options.effort,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        thinkingTokens: result.thinkingTokens,
      },
    }), null, 2),
    'utf8',
  );

  console.log(renderProgressLine({ tag: 'consult-opus', wall, tokens }));
  console.log(`[consult-opus] saved: ${options.out}`);
  return EXIT.OK;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]).endsWith('consult-opus-subscription.mjs');
if (invokedDirectly) {
  main().then((code) => { if (code) process.exitCode = code; }).catch((error) => {
    console.error(`[consult-opus] ERROR: ${error.message}`);
    // A wrong path is the operator's to fix; anything else is ours to fix. Telling those two
    // apart is the whole point of not collapsing them into one code.
    process.exitCode = exitCodeForError(error);
  });
}

export { parseArgs, DEFAULT_MODEL };
