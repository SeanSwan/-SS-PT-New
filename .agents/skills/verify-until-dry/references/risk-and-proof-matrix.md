# Risk and Proof Matrix

## Deterministic floor

Compute `tier = max(path rules, diff rules, dependency class, caller fan-in,
surface triggers)`. Allow an agent to raise the result. Never accept a lower tier
from an agent or reviewer.

## Tiers

### Tier 0 — non-runtime documentation

Require render/format/link/reference checks and outbound secret scanning where
applicable.

### Tier 1 — tests and low-risk internal tooling

Require syntax/lint, focused tests, test-integrity scan, and importer/caller impact.

### Tier 2 — ordinary runtime behavior

Require Tier 1 plus types/build, changed-scope unit/integration tests, negative and
boundary cases, caller/sibling sweep, changed executable-code coverage or exact
exemption, independent review, and clean/fenced execution.

For UI, add mounted-route proof, browser roles/viewports, accessibility,
keyboard/touch, console/network, loading/empty/error states, and scroll ownership.

For bug fixes, add fail-before/pass-after and targeted fix mutation.

### Tier 3 — high consequence

Trigger on auth/authz, PII, payments, schema/migrations, destructive operations,
CI/verifier enforcement, production infrastructure/dependencies, secrets, and
safety-critical cross-service contracts.

Require Tier 2 plus two independent adversarial vantages, abuse/authorization
matrix where relevant, synthetic clean-database or migration lifecycle,
transaction/concurrency/error-path proof, rollback proof, exact approval for
automatic repair, and post-deploy proof when release is claimed.

## Vantage axes

- structural: imports, routes, callers, sibling surfaces, schema/model truth;
- behavioral: unit/integration/contract, negative, mutation, fuzz, concurrency;
- experiential: roles, viewports, accessibility, keyboard/touch, console/network;
- operational: clean worktree/install/build, migrations, deployed asset/health;
- reviewer: model/tool family, fresh context, independent impact map.

Two final rounds must differ on at least two axes. Rerunning the same command or
asking the same reviewer again does not qualify.

## Kimi complexity triggers

Require Kimi K3 hostile review when any configured trigger fires:

- Tier 3;
- deterministic complexity score at or above the configured threshold;
- repeated high/critical finding;
- oscillation signature;
- change spanning frontend and backend plus schema/infra;
- reviewer diversity otherwise insufficient for the risk tier.

If Kimi is required but provider authorization, privacy clearance, or budget is
absent, use `BLOCKED`; do not downgrade the tier or omit review.
