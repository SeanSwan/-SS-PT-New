# SwanStudios Release Verification Runbook - 2026-05-21

This runbook turns the remaining manual release gates into repeatable commands.
Do not paste Stripe, Render, database, or auth secrets into chat. Set them in the
terminal or Render/Stripe dashboards only.

## 1. Local automated gate

Run this from the repo root:

```bash
npm run qa:release
```

Fast mode for a quick preflight:

```bash
npm run qa:release:fast
```

The full gate runs staging proof, diff whitespace check, Render/payment preflight,
native secret scan, backend tests, frontend type-check, frontend build, and
frontend sharded tests. It does not stage, commit, push, archive, delete, or
deploy.

For final commit review, also run the canonical scanner:

```bash
bash scripts/scan-secrets.sh --all
```

## 2. Render/payment preflight

Read-only config check:

```bash
node scripts/qa/render-payment-preflight.mjs
```

Read-only production database duplicate probe before migration:

```bash
node scripts/qa/render-payment-preflight.mjs --db
```

Pass condition:
- `render.yaml` includes Stripe secret, webhook secret, publishable key, and encryption key placeholders.
- `orders.idempotencyKey` has no duplicate non-null values.
- `print_orders.idempotency_key` has no duplicate non-null values when that column already exists.

Warnings about missing unique indexes are expected before the migration is applied.
Duplicate key failures must be resolved before deploying the unique-index migration.

## 3. Stripe test-mode replay

Use this only after a test Checkout session has been completed. The session ID
comes from the success URL as `session_id=cs_test_...` or from the Stripe
Dashboard in test mode.

Local target:

```bash
set SWAN_RELEASE_ALLOW_TEST_WRITES=true
node scripts/qa/stripe-testmode-replay.mjs --session-id=cs_test_REPLACE_ME --base-url=http://localhost:10000
```

Render/staging target:

```bash
set SWAN_RELEASE_ALLOW_TEST_WRITES=true
set SWAN_RELEASE_ALLOW_PROD_TEST_WRITE=true
node scripts/qa/stripe-testmode-replay.mjs --session-id=cs_test_REPLACE_ME --base-url=https://sswanstudios.com
```

The script refuses to run with live Stripe secret keys. It replays the same paid
test Checkout webhook twice and expects the backend to accept both deliveries
without creating another Stripe charge.

## 4. Final release call

Before Sean approves push/deploy, the release candidate should have:
- `node scripts/qa/release-verification.mjs` passing.
- `node scripts/qa/render-payment-preflight.mjs --db` passing against the target database.
- one successful test-mode Checkout.
- one successful `stripe-testmode-replay` duplicate webhook pass.
- Render deploy live with backend/frontend smoke passing.

Anything that touches real payment, production DB, or Render env must stay in
test mode unless Sean explicitly approves a live release.
