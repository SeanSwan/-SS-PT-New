/**
 * ceiling.test.mjs — what a design-ceiling provider may and may not be shown.
 * Run: node --test scripts/context-gateway/tests/ceiling.test.mjs
 *
 * The ceiling was NARROWED 2026-08-14 by Sean's explicit decision. The previous pattern also matched
 * `session|webhook|token|migration|middleware|admin|permission|privacy|auth` — ordinary backend code
 * carrying no protected data — which blocked a design reviewer from most real work while protecting
 * nothing. That friction was the point of the change.
 *
 * These tests pin BOTH directions, because a narrowing is only safe if the part that must still
 * block still blocks. A one-sided test would let a future "simplification" delete the rest.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SENSITIVE_PATH_RE } from '../src/providers.mjs';

const blocks = (p) => SENSITIVE_PATH_RE.test(p);

test('ordinary backend code is now reviewable by a design-ceiling provider', () => {
  // Each of these was blocked before and contains no protected data. This is the friction removed.
  for (const p of [
    'backend/routes/adminRoutes.mjs',
    'migrations/0026-add-column.cjs',
    'backend/services/sessionService.mjs',
    'backend/routes/webhookRoutes.mjs',
    'frontend/src/lib/permissions.ts',
    'backend/models/UserToken.mjs',
  ]) {
    assert.equal(blocks(p), false, `should be reviewable now: ${p}`);
  }
});

test('live money paths still block — a design reviewer has no business there', () => {
  for (const p of [
    'backend/routes/stripeRoutes.mjs',
    'backend/services/payoutService.mjs',
    'backend/services/refundService.mjs',
    'backend/routes/billingRoutes.mjs',
    'backend/services/plaidLink.mjs',
  ]) {
    assert.equal(blocks(p), true, `must still block: ${p}`);
  }
});

test('credential-bearing paths still block', () => {
  for (const p of ['.env.production', 'config/credentials.json', 'lib/jwtSigner.mjs', 'scripts/secretRotate.mjs']) {
    assert.equal(blocks(p), true, `must still block: ${p}`);
  }
});

test('auth paths still block — NOT on the approved removal list, kept deliberately', () => {
  // A first pass removed auth|login|privacy too. Auth LOGIC is attack-surface knowledge, it was
  // never authorised, and removing it broke nine ceiling tests. One word restores the removal if
  // Sean decides otherwise.
  for (const p of ['backend/middleware/authMiddleware.mjs', 'frontend/src/hooks/useAuth.ts', 'backend/routes/loginRoutes.mjs']) {
    assert.equal(blocks(p), true, `auth path must still block: ${p}`);
  }
});

test("Sean's life-critical data classes still block — Rule 8 is categorical", () => {
  // These are family data, not code. They were never the friction and must never become it.
  for (const p of [
    'docs/family/immigration-status.md',
    'clients/medical-history.md',
    'records/patient-intake.md',
    'docs/health-notes.md',
    'data/ssn-import.csv',
    'docs/pii-handling.md',
  ]) {
    assert.equal(blocks(p), true, `must still block: ${p}`);
  }
});

test('the pattern is case-insensitive — a capitalised path must not slip through', () => {
  assert.equal(blocks('Docs/Family/IMMIGRATION.md'), true);
  assert.equal(blocks('Backend/Routes/StripeRoutes.mjs'), true);
});
