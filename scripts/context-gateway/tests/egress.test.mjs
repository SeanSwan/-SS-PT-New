/**
 * egress.test.mjs — inline-secret redaction before content leaves the gateway (threat T3, content half).
 * Run: node --test scripts/context-gateway/tests/egress.test.mjs
 *
 * The redactor is the last line before a value the PATH filter could not know about reaches a model.
 * Every fake secret here is ASSEMBLED AT RUNTIME from fragments (via `S(...)`) so no literal
 * secret-shaped string sits in this committed source — otherwise the pre-commit scanner (correctly)
 * blocks the file. This is the standard way to test a secret scanner without tripping one.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { redactSecrets } from '../src/egress.mjs';
import { gitTrackedFiles } from '../src/safeRead.mjs';
import { createToolSession } from '../src/tools.mjs';
import { compileContext } from '../src/compile.mjs';

const S = (...parts) => parts.join(''); // assemble a secret-shaped string at runtime, no literal
const FAKE = {
  openai: S('sk-', 'or-v1-', 'abcdefghijklmnopqrstuvwxyz0123'),
  stripe: S('sk', '_live_', 'ABCDEFGHIJKLMNOP1234567890'),
  whsec: S('wh', 'sec_', 'ABCDEFGHIJKLMNOP1234567890'),
  jwt: S('eyJ', 'hbGciOiJIUzI1NiJ9', '.', 'eyJzdWIiOiIxIn0', '.', 'abcDEF123_-signature'),
  google: S('AIza', 'SyA', '1234567890123456789012345678901234'),
  db: S('postgres', '://user:', 's3cretPass', '@db.host:5432/app'),
};

test('redactSecrets: catches key/token/PEM/DB-URL shapes, reports count+kind, keeps ordinary code', () => {
  const cases = [
    [`const k = "${FAKE.openai}";`, 'OPENAI'],
    [`stripe = "${FAKE.stripe}";`, 'STRIPE'],
    [FAKE.whsec, 'STRIPE_WHSEC'],
    [`token ${FAKE.jwt}`, 'JWT'],
    [`GOOGLE=${FAKE.google}`, 'GOOGLE'],
    [`DATABASE_URL=${FAKE.db}`, 'DB_URL'],
  ];
  for (const [input, kind] of cases) {
    const r = redactSecrets(input);
    assert.equal(r.redactions, 1, `expected 1 redaction for ${kind}`);
    assert.ok(r.kinds.includes(kind), `expected kind ${kind}`);
    assert.ok(r.text.includes(`<REDACTED-${kind}>`));
  }
  const code = 'export function saveWorkout(userId) { return db.insert({ userId }); }';
  assert.equal(redactSecrets(code).redactions, 0);
  assert.equal(redactSecrets(code).text, code);
});

test('redactSecrets: multiple secrets in one blob all redacted', () => {
  const blob = `a ${FAKE.stripe} and ${FAKE.google} here`;
  const r = redactSecrets(blob);
  assert.equal(r.redactions, 2);
  assert.ok(!r.text.includes('sk' + '_live_') && !r.text.includes('AIza'));
});

function repoWithSecret() {
  const root = join(mkdtempSync(join(tmpdir(), 'swan-egr-')), 'repo');
  mkdirSync(join(root, 'scripts'), { recursive: true });
  const git = (...a) => execFileSync('git', ['-C', root, ...a], { stdio: 'pipe' });
  git('init', '-q');
  // innocuously NAMED file (no DENY/sensitive path) that nonetheless holds a hardcoded key.
  // Written at runtime from a fragment so the literal never sits in this committed test file.
  writeFileSync(join(root, 'scripts', 'helper.mjs'), `export const CFG = {\n  key: "${FAKE.stripe}",\n  render: () => "ok",\n};\n`);
  git('add', '-A'); git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'fixtures');
  return { root, tracked: gitTrackedFiles(root) };
}

test('repo_open: inline secret in a non-DENY file is redacted before return', () => {
  const { root, tracked } = repoWithSecret();
  const w = createToolSession({ root, tracked }).repo_open('scripts/helper.mjs', 1, 4);
  assert.ok(!w.content.includes('sk' + '_live_'), 'secret value not returned');
  assert.ok(w.content.includes('<REDACTED-STRIPE>'));
  assert.equal(w.secretsRedacted, 1);
  assert.ok(w.content.includes('render'), 'ordinary code preserved');
});

test('compile: packet evidence is secret-redacted and the count is reported', () => {
  const { root, tracked } = repoWithSecret();
  const { packet, report } = compileContext({ root, question: 'trace the render helper CFG', tracked, originatingModel: 'm' });
  assert.ok(report.secretsRedacted >= 1, 'redaction counted in report');
  const blob = JSON.stringify(packet.getEvidence());
  assert.ok(!blob.includes('sk' + '_live_'), 'no secret value in packet');
  assert.ok(blob.includes('<REDACTED-STRIPE>'));
});
