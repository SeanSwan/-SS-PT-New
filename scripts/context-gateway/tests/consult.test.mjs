/**
 * consult.test.mjs — the consult-lane security gates (hostile pass 8 named these untested).
 * Run: node --test scripts/context-gateway/tests/consult.test.mjs
 *
 * The consult wrappers read operator-named ARBITRARY paths and egress them, so their gates —
 * DENY-refusal of secret-bearing paths, and the design ceiling screening BOTH --document AND
 * --seed — are load-bearing. These spawn the real wrapper and assert it REFUSES (exit 2) BEFORE
 * any network turn (no OPENROUTER_API_KEY needed because the refusal precedes the fetch).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..', '..'); // repo root (…/SS-PT-context-gateway)
const dir = mkdtempSync(join(tmpdir(), 'swan-consult-'));
writeFileSync(join(dir, 'hero.md'), '# hero redesign, parallax layers\n');
writeFileSync(join(dir, 'authMiddleware.mjs'), 'export function requireAuth(){ return 1; }\n');
writeFileSync(join(dir, 'secrets.json'), '{"internalApiSecret":"plainvalue"}\n');

/** Run a consult wrapper; return { code, out }. A refusal exits non-zero and prints REFUSED. */
function runConsult(wrapper, args, env = {}) {
  try {
    const out = execFileSync('node', [join('scripts', wrapper), ...args], {
      cwd: ROOT, env: { ...process.env, SWAN_CONTEXT_MAX_USD: '1', OPENROUTER_API_KEY: '', ...env }, stdio: 'pipe',
    }).toString();
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

test('consult DENY: a secret-bearing --document is refused (exit 2, no network)', () => {
  const r = runConsult('consult-fable.mjs', ['--document', join(dir, 'secrets.json')]);
  assert.equal(r.code, 2);
  assert.match(r.out, /REFUSED secret-bearing path/);
  assert.doesNotMatch(r.out, /sending request|model=/, 'no network turn happened');
});

test('consult DENY: a secret-bearing --seed is refused too', () => {
  writeFileSync(join(dir, 'key.pem'), 'x\n');
  const r = runConsult('consult-fable.mjs', ['--document', join(dir, 'hero.md'), '--seed', join(dir, 'key.pem')]);
  assert.equal(r.code, 2);
  assert.match(r.out, /REFUSED secret-bearing path/);
});

test('consult ceiling: kimi (design) refuses a sensitive --seed even with a benign --document', () => {
  const r = runConsult('consult-kimi.mjs', ['--document', join(dir, 'hero.md'), '--seed', join(dir, 'authMiddleware.mjs')]);
  assert.equal(r.code, 2);
  assert.match(r.out, /REFUSED \[CEILING\]/);
  assert.match(r.out, /E002/, 'the SEED (E002), not just the document, is screened');
});

test('consult: no cap set → fail-closed refusal (exit 2)', () => {
  const r = runConsult('consult-sol.mjs', ['--document', join(dir, 'hero.md')], { SWAN_CONTEXT_MAX_USD: '' });
  assert.equal(r.code, 2);
  assert.match(r.out, /NO_CAP/);
});
