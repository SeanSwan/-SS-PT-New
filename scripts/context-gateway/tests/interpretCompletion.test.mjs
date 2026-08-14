/**
 * interpretCompletion.test.mjs — "did this paid call actually return anything?"
 * Run: node --test scripts/context-gateway/tests/interpretCompletion.test.mjs
 *
 * THE BUG THIS PINS, found live in Kimi round 18: the model billed 4354 completion tokens
 * ($0.0843) and returned EMPTY content. `callProvider` substituted the literal string
 * '(empty response)', the artifact was written as if it were a review, and the receipt recorded
 * `outcome: 'ok'`. A spend ledger whose successful-looking rows include calls that produced
 * nothing is worse than no ledger — it launders waste as work.
 *
 * Tested as a pure function rather than through `callProvider`, because a test that goes through
 * the network tests the transport, not the contract — and this session has already produced three
 * assertions that passed against deliberately broken code by routing through a wrapper.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { interpretCompletion } from '../src/transport.mjs';

const withContent = (content, extra = {}) => ({ choices: [{ message: { content, ...extra.message }, ...extra }] });

test('a normal completion is not empty and its text is returned verbatim', () => {
  const r = interpretCompletion(withContent('# REVIEW\n\nLooks fine.'));
  assert.equal(r.empty, false);
  assert.equal(r.text, '# REVIEW\n\nLooks fine.');
});

test('EMPTY content is reported as empty — the round-18 defect', () => {
  for (const content of ['', '   ', '\n\n', '\t \n']) {
    const r = interpretCompletion(withContent(content));
    assert.equal(r.empty, true, `whitespace-only content ${JSON.stringify(content)} must count as empty`);
    assert.equal(r.text, '(empty response)');
  }
});

test('a MISSING content field is empty, not a crash', () => {
  // The shape that actually arrived: message present, content absent or null.
  assert.equal(interpretCompletion({ choices: [{ message: {} }] }).empty, true);
  assert.equal(interpretCompletion({ choices: [{ message: { content: null } }] }).empty, true);
  assert.equal(interpretCompletion({ choices: [] }).empty, true);
  assert.equal(interpretCompletion({}).empty, true);
  assert.equal(interpretCompletion(undefined).empty, true);
});

test('finish_reason is captured — receiptV1 has always read it and always got null', () => {
  assert.equal(interpretCompletion(withContent('x', { finish_reason: 'stop' })).finishReason, 'stop');
  assert.equal(interpretCompletion(withContent('', { finish_reason: 'length' })).finishReason, 'length');
  assert.equal(interpretCompletion(withContent('x')).finishReason, null, 'absent stays null, not undefined');
});

test('F6: content with no VISIBLE characters is empty, even when trim() cannot see it', () => {
  // `.trim()` strips the Unicode WhiteSpace class, which includes ﻿ — but NOT the zero-width
  // format characters ​/‌/‍/⁠. A completion of only those was `empty:false`,
  // so it recorded outcome:'ok', exited 0, and its artifact was consumable as a review. Raised by
  // HY3 2026-08-14; probe-confirmed for ​ and ‍. HY3 also named ﻿, which trim()
  // already handled — the finding was right, one of its two examples was not.
  const mk = (c) => ({ choices: [{ message: { content: c } }] });
  for (const [label, ch] of [
    ['zero-width space', '​'],
    ['zero-width non-joiner', '‌'],
    ['zero-width joiner', '‍'],
    ['word joiner', '⁠'],
    ['BOM', '﻿'],
    ['invisibles mixed with real whitespace', ' ​ \n‍\t'],
  ]) {
    assert.equal(interpretCompletion(mk(ch)).empty, true, `${label} must count as empty`);
  }
});

test('F6: real content is NOT mangled by the invisible-character strip', () => {
  // The strip decides EMPTINESS only; the returned text must remain byte-identical to what the
  // provider sent. A fix that sanitized `text` would silently alter a paid review.
  const withZwj = 'family: \u{1F468}‍\u{1F469} and a verdict';
  const r = interpretCompletion({ choices: [{ message: { content: withZwj } }] });
  assert.equal(r.empty, false, 'visible content must not be classed empty');
  assert.equal(r.text, withZwj, 'returned text must be unmodified');
});

test('reasoning is measured but NEVER returned — Rule 59', () => {
  const secretish = 'thinking about Bearer abcdef0123456789 and other things';
  const r = interpretCompletion({ choices: [{ message: { content: '', reasoning: secretish } }] });
  assert.equal(r.reasoningTokensSeen, secretish.length, 'length is the signal that says where the money went');
  assert.ok(!JSON.stringify(r).includes('abcdef'), 'reasoning text must never appear in the returned object');
  assert.equal(r.empty, true, 'reasoning-only is still an empty RESPONSE — nothing usable came back');
});

test('a non-string content type does not masquerade as a review', () => {
  // Defensive: some providers return content as an array of parts. Until that is handled
  // explicitly, it must read as empty rather than stringify into '[object Object]'.
  const r = interpretCompletion({ choices: [{ message: { content: [{ type: 'text', text: 'hi' }] } }] });
  assert.equal(r.empty, true);
  assert.equal(r.text, '(empty response)');
});
