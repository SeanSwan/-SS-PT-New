/**
 * subscription-receipt.mjs — render a subscription-transport reply into its receipts.
 *
 * Shared by every `consult-*-subscription.mjs` leg. Extracted from
 * `consult-astra-subscription.mjs` on 2026-09-19 (Rule 4 cap), then generalised the same
 * day when a second leg (Opus 5, Claude Max subscription) needed the same receipt.
 *
 * Pure formatting: given a run result and a few labels, it returns the strings to write.
 * It performs no I/O, so it is testable without a model call.
 *
 * TWO TRANSPORTS, TWO TOKEN SHAPES. Each leg declares its own `tokens` list, because the
 * transports report different things and neither should silently drop a field:
 *
 *   codex-cli (Astra)   in / out / reasoning        (`reasoning_output_tokens`)
 *   claude-cli (Opus)   in / out / thinking / ...   (`output_tokens_details.thinking_tokens`)
 *
 * WHY THE THINKING/REASONING FIELD IS LOAD-BEARING. It is the ONLY number that reveals
 * which effort level actually ran — input and output counts are near-identical across
 * levels for the same prompt. On the codex leg that field was once discarded one layer
 * down, which made effort unverifiable from any artifact the transport produced; see the
 * `extractUsage` note in `scripts/mcp/swan-council-subscription.mjs`. A receipt that can
 * lose this field silently is a receipt that cannot be trusted about cost or depth.
 */
import { safeRef } from './mega-blueprint-mandate.mjs';

/**
 * The served model is NOT observable on the codex-cli transport — by construction.
 *
 * `codex exec --json` emits no model field. Measured 2026-09-19 on `codex-cli 0.154.0`
 * with the exact invocation `buildCodexExecArgs()` builds; the complete event set was
 * `thread.started`, `turn.started`, `item.completed`, `item.completed`, `turn.completed`,
 * and the substring `"model"` does not occur anywhere in the raw output. So this is not a
 * runner gap to be fixed later (the earlier reading of finding D12) — it is a structural
 * property of that transport, and a receipt from that leg must be recorded as
 * identity-unverified BY CONSTRUCTION, every time.
 *
 * NOTE: this is a codex-cli limitation, not a law about subscriptions. The claude-cli leg
 * reports a `modelUsage` map, so it may be able to prove its served model — do not assume
 * the two legs share this weakness.
 */
export const SERVED_MODEL_UNVERIFIABLE =
  'NOT OBSERVABLE on codex-cli (see SERVED_MODEL_UNVERIFIABLE_NOTE)';

export const SERVED_MODEL_UNVERIFIABLE_NOTE =
  'codex exec --json emits no model field: measured 2026-09-19 on codex-cli 0.154.0, '
  + 'event set = thread.started, turn.started, item.completed, turn.completed; the '
  + 'substring "model" does not occur in the raw JSONL. Requested model is provable; '
  + 'served model is not.';

/**
 * The claude-cli leg's reason — deliberately NOT the codex one above.
 *
 * The codex note says "this transport CANNOT report a model". That is a structural property
 * of codex-cli and it is FALSE of claude-cli, whose stream carries a `model` field that its
 * parser reads. Stamping the codex sentence onto a Claude receipt would be a receipt that
 * lies about the transport it describes. So the reason is a parameter, and each leg passes
 * its own — the failure mode this guards against is exactly the one that motivated
 * generalising this module: a shared helper silently imposing one transport's facts on
 * another.
 */
export const SERVED_MODEL_UNREPORTED_CLAUDE =
  'NOT OBSERVED on claude-cli. The transport emits a `model` field when it reports one and '
  + 'the stream parser reads it, but the only body observed on this machine (2026-09-19) was '
  + 'the auth-failure path, which reports no model — so whether a SUCCESSFUL run names its '
  + 'served model is UNTESTED. Requested model is provable from argv; served model is not yet.';

/**
 * The identity block of a receipt.
 *
 * Exported so the D12 behaviour is pinned by a TEST rather than by a comment — the whole
 * finding was that a bare `servedModel: null` is ambiguous between "we forgot to capture
 * it" and "this transport cannot report it". A test can tell them apart.
 *
 * `unverifiableReason` is the per-transport override; the default keeps the codex leg's
 * output byte-identical to before this parameter existed.
 */
export const identityFields = (servedModel, { unverifiableReason = SERVED_MODEL_UNVERIFIABLE_NOTE } = {}) => ({
  identityVerified: servedModel !== null && servedModel !== undefined,
  identityUnverifiableReason: servedModel ? null : unverifiableReason,
});

/** `in=26478 out=56 reasoning=43` — for the markdown header. */
const headerTokens = (tokens) =>
  tokens.map(([label, value]) => `${label}=${value ?? 'unknown'}`).join(' ');

/** `in:26478 out:56 reasoning:43` — for the console line. */
const progressTokens = (tokens) =>
  tokens.map(([label, value]) => `${label}:${value ?? '?'}`).join(' ');

/** The markdown header that precedes the reply body. */
export function renderReplyHeader({
  subject, result, document, wall, armed, armedBy = [], servedModelLabel,
  tokens = [], costNote,
}) {
  return [
    `# ${subject} Reply — subscription transport — ${new Date().toISOString()}`,
    '',
    `**Provider:** ${result.provider}`,
    `**Billing:** ${result.billing}`,
    `**Authentication:** ${result.authMode}`,
    `**Transport:** ${result.transport}`,
    `**Requested model:** ${result.requestedModel || 'unspecified'}`,
    `**Served model:** ${result.servedModel || servedModelLabel}`,
    // Depth, stated. It was previously absent from every receipt because it was absent
    // from every invocation — the run inherited `low` from the ambient CODEX_HOME and
    // left no trace. A leg that does not set `effort` reads "unspecified", which is the
    // truth and is deliberately visible rather than filled in with a guess.
    `**Reasoning effort:** ${result.effort || 'unspecified'}`,
    `**Tokens:** ${headerTokens(tokens)}`,
    `**Packet:** \`${safeRef(document)}\``,
    `**Wall:** ${wall}s`,
    armed ? `**Mega Blueprint:** ARMED (${armedBy.join(', ')})` : '**Mega Blueprint:** not armed',
    '',
    `> ${costNote ?? 'Marginal cost $0 — this leg rides a subscription, not a per-token reseller.'}`,
    '', '---', '',
  ].join('\n');
}

/** The `.meta.json` sidecar, kept alongside the reply so the run is self-describing. */
export function buildReceiptMeta({
  result, document, wall, armed, armedBy = [], identity, extra = {},
}) {
  return {
    model: result.requestedModel, servedModel: result.servedModel,
    // The depth the run was ASKED for. `null` means the leg set no level, i.e. the
    // ambient config decided — recorded as null so that case is distinguishable from
    // "a level was chosen and recorded".
    effort: result.effort ?? null,
    ...identity,
    provider: result.provider, billing: result.billing, authMode: result.authMode,
    transport: result.transport, document,
    wallSeconds: Number(wall), generatedAt: new Date().toISOString(),
    megaBlueprint: armed,
    megaBlueprintArmedBy: armed ? armedBy : null,
    ...extra,
  };
}

/** The one-line progress summary printed to the console. */
export const renderProgressLine = ({ tag, wall, tokens = [] }) =>
  `[${tag}] complete in ${wall}s — ${progressTokens(tokens)}`;
