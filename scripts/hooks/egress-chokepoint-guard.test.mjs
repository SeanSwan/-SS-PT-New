/**
 * The guard's own history in this repo says a regex that silently never matches
 * is the worst possible failure for a guard (spend-guard-gate's INVOCATION line,
 * corrupted into a literal backspace, reported "SYNTAX OK" while matching
 * nothing). So every allow-case here is paired with a deny-case, and the five
 * real violations found on the first run are pinned as fixtures.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findViolations, isExempt, MODEL_HOSTS } from './egress-chokepoint-guard.mjs';

const F = 'scripts/example.mjs';

test('the real 2026-09-03 finding is caught: raw fetch to the Gemini model host', () => {
  const src = `
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/x:generateContent';
    const res = await fetch(url, { method: 'POST', body: JSON.stringify({ prompt }) });
  `;
  const v = findViolations(F, src);
  assert.equal(v.length, 1);
  assert.equal(v[0].host, 'generativelanguage.googleapis.com');
  assert.match(v[0].how, /fetch/);
});

test('a file routed through fetchForEgress is clean', () => {
  const src = `
    import { fetchForEgress } from './lib/redact-egress.mjs';
    const res = await fetchForEgress('https://openrouter.ai/api/v1/chat/completions',
      { method: 'POST', body: JSON.stringify(payload) });
  `;
  assert.deepEqual(findViolations(F, src), []);
});

test('LOCAL and OWN-DOMAIN egress is not a model host — no false positive', () => {
  // consult-qwen.mjs (local Ollama) and the deploy smoke tests must stay quiet,
  // or the guard becomes the one people learn to wave through.
  const ollama = `const r = await fetch('http://127.0.0.1:11434/api/generate', { method:'POST' });`;
  const smoke = `const r = await fetch('https://sswanstudios.com/api/health');`;
  assert.deepEqual(findViolations(F, ollama), []);
  assert.deepEqual(findViolations(F, smoke), []);
});

test('naming a model host without calling out is not a violation', () => {
  const src = `const DOCS = 'see https://openrouter.ai/docs for the model list';`;
  assert.deepEqual(findViolations(F, src), []);
});

test('every non-fetch escape route is caught too', () => {
  const cases = [
    [`import https from 'node:https';\nconst u='https://api.openai.com/v1';`, /node:http/],
    [`const https = require('https');\nconst u='https://api.openai.com/v1';`, /require/],
    [`import axios from 'axios';\nconst u='https://api.anthropic.com/v1';`, /HTTP client/],
    [`import OpenAI from 'openai';\nconst u='https://api.openai.com/v1';`, /SDK/],
    [`const u='https://api.z.ai/x';\nawait globalThis.fetch(u);`, /globalThis/],
  ];
  for (const [src, expected] of cases) {
    const v = findViolations(F, src);
    assert.ok(v.length >= 1, `expected a finding for: ${src.slice(0, 40)}`);
    assert.match(v.map((x) => x.how).join(' '), expected);
  }
});

test('the greppable allow-marker exempts a line, and only that line', () => {
  const marked = `
    // egress-chokepoint-guard: allow — public model catalogue, no prompt content
    const r = await fetch('https://openrouter.ai/api/v1/models');
  `;
  assert.deepEqual(findViolations(F, marked), []);

  // A marker somewhere in the file must NOT bless an unrelated call further down.
  const partial = `
    // egress-chokepoint-guard: allow — catalogue only
    const a = await fetch('https://openrouter.ai/api/v1/models');
    const b = await fetch('https://openrouter.ai/api/v1/chat/completions', { body: prompt });
  `;
  assert.equal(findViolations(F, partial).length, 1, 'the second, unmarked call must still be caught');
});

test('gate modules and tests are exempt — they name hosts by necessity', () => {
  assert.equal(isExempt('scripts/lib/redact-egress.mjs'), true);
  assert.equal(isExempt('scripts/lib/training-tier-gate.mjs'), true);
  assert.equal(isExempt('scripts/hooks/egress-chokepoint-guard.mjs'), true);
  assert.equal(isExempt('scripts/lib/anything.test.mjs'), true);
  assert.equal(isExempt('scripts/consult-muse.mjs'), false, 'a real seat must NOT be exempt');
  // Windows separators must not defeat the check.
  assert.equal(isExempt('scripts\\lib\\redact-egress.mjs'), true);
});

test('backend/ is OUT of scope — the first draft was wrong about this', () => {
  // A backend service calling Gemini is the product working as designed. Its
  // control is aiPrivacyService / PIIManager / Rule 8 (zero CLIENT PII), not
  // fetchForEgress (which strips OPERATOR identity and dev-machine paths).
  // The first draft flagged 8 backend files and would have pointed production
  // at the wrong control — confident, automated, wrong advice. Pinned so a
  // later "let's widen the guard" cannot silently reintroduce it. See SWA-238.
  const src = `
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/x:generateContent';
    const res = await fetch(url, { method: 'POST', body: JSON.stringify({ prompt }) });
  `;
  assert.deepEqual(findViolations('backend/services/aiChatService.mjs', src), []);
  assert.deepEqual(findViolations('frontend/src/api/thing.mjs', src), []);
  assert.equal(isExempt('backend/services/aiChatService.mjs'), true);
  // ...but the identical code under scripts/ is still caught.
  assert.equal(findViolations('scripts/thing.mjs', src).length, 1);
});

test('non-code files are ignored', () => {
  const src = `see https://api.openai.com and call fetch(url)`;
  assert.deepEqual(findViolations('docs/notes.md', src), []);
  assert.deepEqual(findViolations('README.txt', src), []);
});

test('the host list covers the seats this repo actually uses', () => {
  for (const h of ['openrouter.ai', 'api.z.ai', 'generativelanguage.googleapis.com']) {
    assert.ok(MODEL_HOSTS.includes(h), `${h} must be a guarded host`);
  }
});
