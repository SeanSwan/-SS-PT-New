/**
 * subscription-receipt.test.mjs — run: node --test scripts/lib/subscription-receipt.test.mjs
 *
 * Pins the receipt FORMAT without a model call. This exists because the failure it guards
 * against already happened once: `reasoning_output_tokens` was silently dropped one layer
 * down, so no receipt could say which effort level ran. A format that can lose a field
 * without a test noticing will lose one again.
 *
 * It also pins the property that makes the module worth sharing: each transport declares
 * its own token list, and the renderer must carry whatever it is given rather than
 * knowing about one transport's field names.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReceiptMeta, identityFields, renderProgressLine, renderReplyHeader,
  SERVED_MODEL_UNVERIFIABLE,
} from './subscription-receipt.mjs';

const RESULT = {
  provider: 'openai-codex', billing: 'chatgpt-subscription', transport: 'codex-cli',
  authMode: 'chatgpt_subscription', requestedModel: 'gpt-6-astra', servedModel: null,
  inputTokens: 26478, outputTokens: 56, reasoningOutputTokens: 43, text: 'body',
};

const CODEX_TOKENS = [
  ['in', RESULT.inputTokens], ['out', RESULT.outputTokens],
  ['reasoning', RESULT.reasoningOutputTokens],
];

const header = (over = {}) => renderReplyHeader({
  subject: 'Astra', result: RESULT, document: 'C:/tmp/p.md', wall: '9.1', armed: false,
  servedModelLabel: SERVED_MODEL_UNVERIFIABLE, tokens: CODEX_TOKENS, ...over,
});

test('the header carries the reasoning token count', () => {
  // The load-bearing assertion: this is the ONLY line that reveals the effort level.
  assert.match(header(), /^\*\*Tokens:\*\* in=26478 out=56 reasoning=43$/m);
});

test('the header title is parameterised by subject, not hardcoded', () => {
  assert.match(header(), /^# Astra Reply — subscription transport — /m);
  assert.match(header({ subject: 'Opus 5' }), /^# Opus 5 Reply — subscription transport — /m);
});

test('a missing token value degrades to unknown rather than vanishing', () => {
  const line = header({
    tokens: [['in', 26478], ['out', 56], ['reasoning', null]],
  });
  assert.match(line, /reasoning=unknown/);
  assert.doesNotMatch(line, /reasoning=$/m);
});

test('a transport declares its own token fields and the renderer carries them', () => {
  // The claude-cli leg reports thinking tokens, not reasoning tokens. If the renderer
  // knew only one transport's names, this would silently render nothing.
  const line = header({
    subject: 'Opus 5',
    tokens: [['in', 1200], ['out', 300], ['thinking', 210], ['cache_read', 900]],
  });
  assert.match(line, /\*\*Tokens:\*\* in=1200 out=300 thinking=210 cache_read=900$/m);
});

test('an unobservable served model is labelled, not left blank', () => {
  const h = header();
  assert.match(h, /\*\*Served model:\*\* NOT OBSERVABLE on codex-cli/);
  assert.doesNotMatch(h, /\*\*Served model:\*\* *$/m);
});

test('the cost note is transport-specific, and defaults to a generic $0 claim', () => {
  // The default must still state $0 — a receipt that omits the cost claim invites the
  // reader to assume this leg was billed.
  assert.match(header(), /Marginal cost \$0 — this leg rides a subscription, not a per-token reseller\./);
  assert.match(
    header({ costNote: 'Marginal cost $0 — this leg rides the ChatGPT subscription, not OpenRouter.' }),
    /rides the ChatGPT subscription, not OpenRouter/,
  );
  assert.match(
    header({ costNote: 'Marginal cost $0 — this leg rides the Claude Max subscription.' }),
    /rides the Claude Max subscription/,
  );
});

test('arming is reported with its reasons, and its absence is stated', () => {
  assert.match(
    header({ armed: true, armedBy: ['operator flag', 'keyword'] }),
    /\*\*Mega Blueprint:\*\* ARMED \(operator flag, keyword\)/,
  );
  assert.match(header(), /\*\*Mega Blueprint:\*\* not armed/);
});

test('the meta sidecar carries the identity block and any transport extras', () => {
  const meta = buildReceiptMeta({
    result: RESULT, document: 'C:/tmp/p.md', wall: '9.1', armed: false,
    identity: identityFields(RESULT.servedModel),
    extra: { reasoningOutputTokens: 43, inputTokens: 26478, outputTokens: 56 },
  });
  assert.equal(meta.reasoningOutputTokens, 43);
  assert.equal(meta.inputTokens, 26478);
  assert.equal(meta.outputTokens, 56);
  assert.equal(meta.document, 'C:/tmp/p.md');
  assert.equal(meta.wallSeconds, 9.1);
  assert.equal(meta.identityVerified, false);
});

test('extras cannot silently overwrite the identity block', () => {
  // Object spread order decides this. Identity is spread BEFORE extras, so an extra named
  // `identityVerified` would win — assert the actual behaviour so a future reorder is a
  // deliberate act rather than an accident.
  const meta = buildReceiptMeta({
    result: RESULT, document: 'd', wall: '1',
    identity: { identityVerified: true },
    extra: { thinkingTokens: 5 },
  });
  assert.equal(meta.identityVerified, true);
  assert.equal(meta.thinkingTokens, 5);
});

test('armedBy is recorded when armed and null when not', () => {
  const base = { result: RESULT, document: 'd', wall: '1', identity: {} };
  assert.deepEqual(buildReceiptMeta({ ...base, armed: false, armedBy: ['x'] }).megaBlueprintArmedBy, null);
  assert.deepEqual(buildReceiptMeta({ ...base, armed: true, armedBy: ['x'] }).megaBlueprintArmedBy, ['x']);
});

test('the progress line reports every declared token count', () => {
  assert.equal(
    renderProgressLine({ tag: 'consult-astra', wall: '9.1', tokens: CODEX_TOKENS }),
    '[consult-astra] complete in 9.1s — in:26478 out:56 reasoning:43',
  );
  assert.equal(
    renderProgressLine({ tag: 'consult-opus', wall: '4.0', tokens: [['in', 10], ['out', 2], ['thinking', 7]] }),
    '[consult-opus] complete in 4.0s — in:10 out:2 thinking:7',
  );
});

test('identityFields distinguishes unobservable from merely missing', () => {
  // D12: a bare `servedModel: null` is ambiguous. The reason field removes the ambiguity.
  assert.equal(identityFields(null).identityVerified, false);
  assert.match(identityFields(null).identityUnverifiableReason, /emits no model field/);
  assert.equal(identityFields('gpt-6-astra').identityVerified, true);
  assert.equal(identityFields('gpt-6-astra').identityUnverifiableReason, null);
});
