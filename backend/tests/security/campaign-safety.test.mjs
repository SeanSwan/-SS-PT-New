import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

/**
 * Campaign safety probes (Astra blueprint S0 — 2026-09-26).
 * ============================================================================
 * Executable regression probes for the money/authorization defects the Astra
 * hostile review (BLUEPRINT-hostile-review-r2-upgrades-2026-09-26) confirmed
 * against the two-wave campaign. Loads REAL source into a VM with stubbed
 * dependencies — no database, no network, no logger transport.
 *
 * Probe states are DELIBERATE:
 *  - `expectCurrentFailure(...)` documents a LIVE defect that a named later
 *    slice (S6/S7) will repair. The probe passes while the defect exists and
 *    starts FAILING the moment the defect is fixed — the flip is the slice's
 *    acceptance signal (then promote it to a hard assertion).
 *  - Hard assertions are contracts that must hold TODAY.
 *
 * Run (from backend/):
 *   node --experimental-vm-modules --test-isolation=none --test tests/security/campaign-safety.test.mjs
 * This file is EXCLUDED from the default vitest run (vitest.config.mjs) and is
 * executed through scripts/run-disposable-security-tests.mjs, which refuses to
 * run against inherited/production DB configuration.
 */

const root = path.resolve(process.cwd(), '..');
const noop = () => {};
const logger = { info: noop, warn: noop, error: noop, debug: noop };

/**
 * Documents a defect that is still live. Fails (loudly) once the defect is
 * repaired, telling the fixer to promote the probe to a hard assertion.
 */
function expectCurrentFailure(slice, fn) {
  return async () => {
    let repaired = false;
    let repairDetail = '';
    try {
      await fn(() => { repaired = true; });
    } catch (unexpected) {
      // An exception is also a behavior change worth surfacing.
      repairDetail = `probe threw: ${unexpected.message}`;
      repaired = true;
    }
    if (repaired) {
      throw new Error(
        `PROBE FLIPPED (${slice}): the defect this probe documents appears to be REPAIRED` +
        (repairDetail ? ` (${repairDetail})` : '') +
        ' — promote this probe to a hard assertion in backend/tests/security/campaign-safety.test.mjs' +
        ' and record the flip in CHECKPOINTS-IMPLEMENTATION.md.'
      );
    }
  };
}

async function load(relative, dependencies) {
  const filename = path.join(root, relative);
  const source = fs.readFileSync(filename, 'utf8');
  const module = new vm.SourceTextModule(source, { identifier: filename });
  await module.link(async name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unstubbed import: ${name}`);
    const values = dependencies[name];
    return new vm.SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) {
        this.setExport(key, value);
      }
    });
  });
  await module.evaluate();
  return module.namespace;
}

async function grantHelpers() {
  return load('backend/services/SessionGrantService.mjs', {
    '../database.mjs': { default: {} },
    '../models/index.mjs': {
      getShoppingCart: noop,
      getCartItem: noop,
      getStorefrontItem: noop,
      getUser: noop,
    },
    '../utils/logger.mjs': { default: logger },
    './cartCheckoutFulfillmentService.mjs': {
      createCartOrderIfPossible: noop,
      loadOptionalFulfillmentModels: noop,
    },
    './sessionBillingPolicy.mjs': { isNonDeductingClient: () => false },
  });
}

async function workoutControllerHarness(serviceOverrides = {}, extraDeps = {}) {
  const service = {
    getWorkoutSessions: async () => [],
    getWorkoutSessionById: async () => null,
    createWorkoutSession: async (data) => ({ id: 'synthetic-created', ...data }),
    updateWorkoutSession: async (id, data) => ({ id, ...data }),
    deleteWorkoutSession: async () => true,
    ...serviceOverrides,
  };
  return load('backend/controllers/workoutController.mjs', {
    '../services/workoutService.mjs': { default: service },
    '../utils/responseUtils.mjs': {
      errorResponse: (res, status, message) => {
        res.status = status;
        res.body = message;
      },
      successResponse: (res, body, status = 200) => {
        res.status = status;
        res.body = body;
      },
    },
    '../utils/logger.mjs': { default: logger },
    '../utils/idUtils.mjs': { idEquals: (a, b) => String(a) === String(b) },
    ...extraDeps,
  });
}

test('R02 [S6/S7]: missing charge evidence cannot authorize fulfillment', expectCurrentFailure('S6/S7 — evidence contract (D-017)', async (markRepaired) => {
  const service = await grantHelpers();
  // Target contract: no Stripe charge evidence → the grant must NOT be
  // authorized (fail-closed). Current implementation skips reconciliation
  // when amountTotalCents is absent, so this documents the live fail-open.
  if (service.chargeCoversCartValue({
    cartItems: [{ price: 100, quantity: 1 }],
  }) === false) {
    markRepaired();
  }
}));

test('R02 [S6/S7]: an unpriced line cannot disappear from reconciliation', expectCurrentFailure('S6/S7 — evidence contract (D-017)', async (markRepaired) => {
  const service = await grantHelpers();
  // Target contract: a line without a stored price must not silently drop out
  // of the claim — the unpriced line must fail the reconciliation (or force
  // the frozen-subtotal fallback), never shrink it.
  if (service.chargeCoversCartValue({
    amountTotalCents: 100,
    subtotal: 10000,
    cartItems: [{ price: 1, quantity: 1 }, { quantity: 1000 }],
  }) === false) {
    markRepaired();
  }
}));

test('R01 [S1]: unassigned trainer cannot read another client session', expectCurrentFailure('S1 — mounted authorization (D-010)', async (markRepaired) => {
  const controller = await workoutControllerHarness({
    getWorkoutSessionById: async () => ({
      id: 'synthetic-session',
      userId: 202,
      notes: 'synthetic private note',
    }),
  });
  const response = {};
  await controller.getWorkoutSessionById({
    user: { id: 101, role: 'trainer' },
    params: { sessionId: 'synthetic-session' },
  }, response);
  // Target contract: unassigned trainer gets 404 (existence not confirmed).
  if (response.status === 404) {
    markRepaired();
  }
}));

test('S0 guard: campaign probes load real source with zero DB/network transport', async () => {
  // The harness itself is the guarantee: vm.SourceTextModule + stubbed
  // dependencies means no model layer, no sequelize pool, no sockets exist
  // in this process. If this test runs, the isolation held.
  const service = await grantHelpers();
  assert.equal(typeof service.chargeCoversCartValue, 'function');
  assert.equal(typeof service.grantSessionsForCart, 'function');
});
