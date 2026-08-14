/**
 * consult-hy3-design.sanitize.test.mjs — the outbound redactor must not corrupt CODE packets.
 * Run: node --test scripts/__tests__/consult-hy3-design.sanitize.test.mjs
 *
 * WHY THIS FILE EXISTS (2026-08-14 hostile review, finding F4):
 * `sanitizeOutboundText` is tuned for PROSE. Pointed at a code diff it rewrote two security-test
 * fixtures and chewed a git blob SHA into `index 000<REDACTED_PHONE>2e3ba`. The external reviewer
 * then filed a CRITICAL saying those tests were vacuous — TRUE of the packet it received, FALSE of
 * the repo. The reviewer was honest; the packet lied to it.
 *
 * The asymmetry this file pins down:
 *   - a MISSED secret is a privacy breach (Rule 8/59) — the true-positive cases below are load-bearing
 *   - a SPURIOUS redaction silently manufactures review findings — the false-positive cases are too
 * So precision is tightened ONLY where it cannot cost coverage: a phone number is never embedded
 * inside a longer alphanumeric run, so requiring boundaries removes hash corruption at zero
 * security cost. The `Bearer <token>` rule is deliberately NOT weakened — the redactor cannot tell
 * a fake token from a real one and must fail safe — which is why redaction is also made VISIBLE to
 * the reviewer rather than silent.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeOutboundText, redactOutbound } from '../consult-hy3-design.mjs';

// Secret-SHAPED fixtures are assembled at runtime, never written as literals — the same pattern
// `context-gateway/tests/egress.test.mjs` uses. A literal here is flagged by `scan-secrets.sh`
// (correctly: the scanner cannot tell a fixture from a live credential, and neither can a human
// skimming a diff), which would either block every commit touching this file or train someone to
// wave the scanner through. Rule 44.
const S = (...parts) => parts.join('');

// --- MUST STILL REDACT (a miss here is a privacy breach) -----------------------------------
test('real PII and credential shapes are still redacted', () => {
  const JWT = S('ey', 'JhbGciOi', '.', 'ey', 'JzdWIiOi', '.', 'SflKxwRJSM');
  const cases = [
    ['email',            'contact me at person@example.com today',      'person@example.com'],
    ['dashed phone',     'call 555-123-4567 now',                        '555-123-4567'],
    ['parenthesised',    'call (555) 123-4567 now',                      '(555) 123-4567'],
    ['dotted phone',     'call 555.123.4567 now',                        '555.123.4567'],
    ['+1 prefixed',      'call +1 555 123 4567 now',                     '+1 555 123 4567'],
    ['bare 10-digit',    'call 5551234567 now',                          '5551234567'],
    ['openrouter key',   'key sk-or-v1-abcdefgh12345678 here',           'sk-or-v1-abcdefgh12345678'],
    ['bearer token',     'Authorization: Bearer someRealToken123',       'someRealToken123'],
    ['jwt',              `tok ${JWT} here`,                              JWT],
  ];
  for (const [label, input, mustVanish] of cases) {
    const out = sanitizeOutboundText(input);
    assert.ok(!out.includes(mustVanish), `${label}: "${mustVanish}" survived redaction -> ${out}`);
  }
});

// --- MUST NOT REDACT (a hit here silently corrupts the packet and fabricates findings) ------
test('code artefacts are NOT mangled — digits inside a longer token are not a phone number', () => {
  const cases = [
    ['git blob SHA pair', 'index 0000000000000000000000000000000000000000..7521abcdef1234567890'],
    ['40-hex sha',        'commit 5b2aa50301234567890abcdef1234567890abcdef'],
    ['long digit run',    'const id = 12345678901234567890;'],
    ['token counts',      'tokens: 40039 in / 3085 out over 1234567890123 ns'],
    ['hex fixture',       "const sha = 'abcdef0123456789';"],
  ];
  for (const [label, input] of cases) {
    const out = sanitizeOutboundText(input);
    assert.equal(out, input, `${label}: packet was altered -> ${out}`);
  }
});

test('the exact line that corrupted the 2026-08-14 review packet survives intact', () => {
  const line = 'index 0000000..2e3ba5c 100644';
  assert.equal(sanitizeOutboundText(line), line, 'git index line still mangled');
});

// --- REDACTION MUST BE LEGIBLE, NOT SILENT --------------------------------------------------
test('redactOutbound reports how many substitutions it made', () => {
  const clean = redactOutbound('nothing sensitive here at all');
  assert.equal(clean.count, 0, 'clean text must report zero substitutions');
  assert.equal(clean.text, 'nothing sensitive here at all');

  const dirty = redactOutbound('mail a@b.com and call 555-123-4567');
  assert.ok(dirty.count >= 2, `expected >=2 substitutions, got ${dirty.count}`);
  assert.ok(!dirty.text.includes('a@b.com'));
  assert.ok(!dirty.text.includes('555-123-4567'));
});

test('a Bearer fixture is still redacted (fail-safe) but the caller can SEE it happened', () => {
  // This is the case that produced the false CRITICAL. The redaction is CORRECT — the redactor
  // cannot distinguish a test fixture from a live token. What was missing is that the reviewer
  // was never told a substitution had occurred, so it read `<REDACTED_KEY>` as source text.
  const fixture = "const secretish = 'Bearer abcdef0123456789 invalid_token';";
  const { text, count } = redactOutbound(fixture);
  assert.ok(!text.includes('abcdef0123456789'), 'bearer token must not egress');
  assert.ok(count >= 1, 'the substitution must be counted so the caller can disclose it');
});
