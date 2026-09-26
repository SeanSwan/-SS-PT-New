**Current execution evidence**

Five read-only Node VM harness runs completed with exit `0`:

1. Allocator: 2 rows, balance 0, claim set; failed financial write not retried.
2. Grant calculation: catalog credit drift and invalid reconciliation inputs accepted.
3. Shadowed workout PUT: owner changed `101→202`.
4. Main webhook: unpaid/stale evidence reached grant; expiry race disarmed a newer session.
5. Mounted controller and privacy checks were executed in separate source-loading invocations: trainer CRUD returned success; synthetic identity data survived sanitation.

For clarity, the last grouping contains two invocations: **six source-loading invocations in total**. These are diagnostic reproductions, not six passing safety tests.

**Executable regression seed**

Save the following as `backend/tests/security/campaign-safety.test.mjs` in S0. It uses actual source, in-memory imports, and no database/network/logger transport. The assertions express the desired safety contract and are expected to fail against the reviewed baseline.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const root = process.cwd();
const noop = () => {};
const logger = { info: noop, warn: noop, error: noop, debug: noop };

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

test('R02: missing charge evidence cannot authorize fulfillment', async () => {
  const service = await grantHelpers();
  assert.equal(service.chargeCoversCartValue({
    cartItems: [{ price: 100, quantity: 1 }],
  }), false);
});

test('R02: an unpriced line cannot disappear from reconciliation', async () => {
  const service = await grantHelpers();
  assert.equal(service.chargeCoversCartValue({
    amountTotalCents: 100,
    subtotal: 10000,
    cartItems: [{ price: 1, quantity: 1 }, { quantity: 1000 }],
  }), false);
});

test('R01: unassigned trainer cannot read another client session', async () => {
  const service = {
    getWorkoutSessionById: async () => ({
      id: 'synthetic-session',
      userId: 202,
      notes: 'synthetic private note',
    }),
  };
  const controller = await load('backend/controllers/workoutController.mjs', {
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
  });
  const response = {};
  await controller.getWorkoutSessionById({
    user: { id: 101, role: 'trainer' },
    params: { sessionId: 'synthetic-session' },
  }, response);
  assert.equal(response.status, 404);
});
```

Exact root command:

```powershell
node --experimental-vm-modules --test-isolation=none --test backend/tests/security/campaign-safety.test.mjs
```

The emitted seed has not been saved or run as a file. Import fixtures must evolve with legitimate extraction, while preserving behavioral assertions. It supplements mounted-route and database tests.

**Required named suites**

The following files are planned, not claimed to exist. S0 installs their isolated runner and fixtures; each owning slice implements the named cases before repair.

Run each backend suite from `backend/` using:

```powershell
node node_modules/vitest/vitest.mjs run tests/security/<file>.test.mjs --retry=0
```

Run PostgreSQL suites only through the S0 disposable-resource launcher, which must reject inherited `DATABASE_URL` before loading application modules:

```powershell
node scripts/run-disposable-security-tests.mjs --suite <suite-name>
```

| File / suite | Required named cases | Proves |
|---|---|---|
| `mountedWorkoutAuthorization.test.mjs` | `first mounted handler denies unassigned trainer`; `revoked assignment denies`; `self access survives`; `admin allowed`; `owner field immutable`; `denied mutation writes zero rows` | R01/F01 |
| `privateMediaAliases.test.mjs` | `serve-photo denies anonymous`; `photos alias denies`; `uploads cannot bypass`; `revocation denies next request`; `public product image remains public`; `storage URL not disclosed` | R04/F08 |
| `providerPayloadBoundary.test.mjs` | `new client canaries never leave`; `history is sanitized`; `failover uses same policy`; `blocked request calls zero providers`; `typed intake remains usable` | R04/F09 |
| `publicIntakeAbuse.test.mjs` | `anonymous waiver remains unlinked`; `body identity cannot override actor`; `candidate is not proof`; `two instances share quota`; `limiter outage blocks provider call` | R06 |
| `startupReadiness.test.mjs` | `migration failure prevents listen`; `schema mismatch readiness false`; `production boot issues no DDL`; `healthy schema starts` | R07 |
| `checkout-snapshot` | `mutation waits for preparation`; `parallel create reuses attempt`; `timeout preserves key`; `catalog edit does not change grant`; `stale expiry CAS changes zero rows`; `delayed paid event uses original snapshot` | R02/F03–F04 |
| `purchase-allocation` | `cart and order callers race`; `ACH and admin race`; `distinct events same purchase grant once`; `balance changes exactly`; `financial failure rolls back`; `inventory failure rolls back`; `commit response loss retry is safe` | R03/F02,F05,F06 |
| `credit-provenance` | `split grant reservation`; `complete consumes once`; `cancel releases once`; `retry cannot restore twice`; `legacy unknown grant is quarantined` | R03/D-018 |
| `refund-recovery` | `refund A cannot debit B`; `partial then full`; `duplicate refund`; `refund before completion`; `unknown payment persists review`; `mismatch ACK requires receipt` | R05/F10–F11 |
| `site-truth` | `onboarding general note persists`; `assignment failure rolls back account`; `follow notification real FK`; `badge race rewards once`; `last challenge place admits one` | R07/F07 |
| `operationalBoundaries.test.mjs` | `OPTIONS URL redacted`; `SPA URL redacted`; `error URL redacted`; `statusCode preserved`; `single rejection policy`; `upload limit fails before storage` | R08/F12 |

**Frontend**

Planned files:

- `frontend/src/components/NewCheckout/SuccessPage.recovery.test.tsx`
- `frontend/src/pages/PublicWaiverPage.verification.test.tsx`
- `frontend/src/hooks/useEnhancedClientDashboard.lifecycle.test.tsx`
- `frontend/tests/e2e/checkout-recovery.spec.ts`

Exact unit command from `frontend/`:

```powershell
node node_modules/vitest/vitest.mjs run src/components/NewCheckout/SuccessPage.recovery.test.tsx src/pages/PublicWaiverPage.verification.test.tsx src/hooks/useEnhancedClientDashboard.lifecycle.test.tsx --retry=0
```

Cases: pending payment never renders success; review survives reload; 401 offers sign-in; abort suppresses stale response; anonymous waiver never claims account linkage; polling ends on unmount and logout.

Browser command after starting the **isolated** fixture application:

```powershell
node node_modules/@playwright/test/cli.js test tests/e2e/checkout-recovery.spec.ts
```

Verify all wireframe states, listed widths, keyboard order, no overflow, contrast, and reduced motion.

**Negative controls**

Removing an authorization guard must expose a forbidden response in the mounted test. Removing purchase uniqueness must duplicate the effect in the two-connection test. Removing privacy validation must expose a synthetic canary in the fake transport. A failed control invalidates the test instrument.

**Not run**

All proposed suites, real PostgreSQL races, browser tests, typecheck, full regression baseline, migration restore, and production smoke.
