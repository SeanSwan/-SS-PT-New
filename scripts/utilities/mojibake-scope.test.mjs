/**
 * Scoped encoding guard for the six files identified by the five-day audit.
 * Keep this list narrow: it protects repaired files without turning legacy
 * repository-wide encoding debt into an unrelated test failure.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const FILES = [
  'scripts/utilities/rebuild-frontend.mjs',
  'frontend/src/hooks/useBackendConnection.tsx',
  'scripts/test-universal-schedule.mjs',
  'backend/routes/cartRoutes.mjs',
  'backend/routes/v2PaymentRoutes.mjs',
  'frontend/src/components/DevTools/DevLogin.tsx',
];

const MOJIBAKE = /(?:\u00c3.|\u00c2.|\u00e2..|\u00f0...|\u00ef\u00bf\u00bd|\uFFFD)/u;

test('five-day touched files contain no mojibake or replacement characters', () => {
  const offenders = FILES.filter((file) => MOJIBAKE.test(readFileSync(file, 'utf8')));
  assert.deepEqual(offenders, []);
});
