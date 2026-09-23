**1. File plan**

All listed new runtime modules have a 300-line maximum. Existing untouched historical files are not refactoring targets.

| Order / slice | Path | Responsibility and interface | Pattern/evidence |
|---|---|---|---|
| S0 | This package’s nine documents | Record corrected claims, evidence requirements, decisions, and checkpoints | Supplied successor structure |
| S0 | Package `evidence-index.json` | Bind reviewed inputs, hashes, commands, and unavailable inputs | New evidence contract; no fabricated values |
| S1 | `backend/tests/unit/migrationRunnerContract.test.mjs` | Node built-in test cases for the replacement runner | Extend the supplied intercepted-boundary approach after its full implementation is supplied |
| S1 | `backend/scripts/migrations/cli-process.mjs` | Export `runCliMigration`; import Node process primitives | Replace the supplied `runSingleMigration()` wrapper |
| S1 | `backend/scripts/migrations/runner.mjs` | Export `runMigrations`; import injected adapters/contracts | Preserve supplied `--to` stop-on-failure semantics |
| S1 | `backend/scripts/migrations/connection.mjs` | Resolve common configuration, validate identity, own pinned lock connection | BLOCKED until full existing configuration is supplied |
| S1 | `backend/scripts/safe-migrate.mjs` | Thin compatibility entry point; preserve required discovery exports | Current source supplied in packet; remove dead `getSequelize()` |
| S2 | `backend/scripts/migrations/discovery.mjs` | Export inventory/discovery functions; import `fs`/`path` | Existing recursive discovery excerpt |
| S2 | `backend/tests/unit/migrationInventoryContract.test.mjs` | Verify classification, naming, dependencies, and no silent expansion | New explicit test contract |
| S2 | Package `migration-dispositions.json` | One disposition per historical file, with original path/hash | Full inventory not supplied |
| S2 | `backend/tests/unit/migrationGuardTableNames.test.mjs` | Correct false explanation; retain historical exact-match ratchet | Supplied `KNOWN_UNGUARDED` |
| S3 | `backend/scripts/migrations/observe-schema.sql` | Complete bounded read-only observation | SQL and requirements in `03-contracts.md` |
| S3 | Package `schema-authority-decision.json` | Owner-held target selection | Receipt in `03-contracts.md` |
| S4 | `backend/scripts/migrations/catalog.mjs` | Export `observeCatalog`; schema-only observation | Observer SQL contract |
| S4 | `backend/scripts/migrations/schema-contract.mjs` | Export `compareCatalog`; compare independently reviewed expectations | No current implementation supplied |
| S4 | Package `target-schema-contract.json` | Complete identifiers, columns, constraints, sequences, and dependencies | Must be supplied/approved before baseline implementation |
| S4 | `backend/tests/unit/migrationSchemaContract.test.mjs` | Reject unknown, conflicting, stale, or unapproved transitions | New contract cases |
| S5 | `backend/migrations-v2/20260920000000-schema-authority-baseline.cjs` | Fresh creation or exact adoption; normal CLI `up` contract | Supplied CommonJS migration shape |
| S5 | `backend/tests/integration/migrationEpochV2.test.mjs` | Actual PostgreSQL and CLI tests | Independent catalog and model assertions |
| S5 | `backend/tests/helpers/migration-fixture/` | Own disposable resources, fixtures, and mutant isolation | Exact internal files enumerated at S4 after runtime/provisioner verification |
| S6 | `backend/scripts/render-start.mjs` | Require v2 migration/schema success before startup | Supplied `:40-101` excerpt; full file required |
| S6 | `backend/core/startup.mjs` | Disable production schema-writing fallback under completed v2 cutover | Supplied `:200-216`; full caller closure required |
| S6 | `backend/tests/unit/migrationStartupContract.test.mjs` | Verify failed schema checks cannot reach listen/sync paths | Actual startup control flow required |

Do not edit `productionDatabaseSync.mjs` globally merely because its production caller is gated. Its other callers must first be established.

**2. Required implementation patterns**

Preserve the existing migration module contract:

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Approved migration operations and postconditions.
  }
};
```

This excerpt specifies the interface, not an executable baseline. Do not ship a body containing only comments.

Preserve the migration-argument meaning:

```text
sequelize-cli db:migrate --config <approved adapter>
  --migrations-path <selected epoch directory>
  --env <validated environment>
  --to <approved target>
```

The implementation must invoke the verified installed CLI entry point through Node, rather than launching this text through a shell.

**3. Missing source gates**

[UNKNOWN] Full configuration, PostgreSQL version, installed CLI storage configuration, complete model definitions, complete migration bodies, and startup caller closure are absent.

Consequently:

- S1’s configuration adapter requires an evidence supplement before implementation.
- S4 cannot emit complete target DDL yet.
- S5 cannot begin from this packet alone.
- Exact helper filenames and baseline decomposition must be added at S4; allocation is limited to the listed subsystem and 300-line cap.
- No helper allocation can authorize a new schema object or behavior.

**4. Release coupling**

The runner hardening candidate is not independently declared production-ready. Replacing heuristic completion can expose existing drift.

The release candidate must jointly provide:

1. A verified adoption or upgrade path.
2. Explicit v2 epoch selection.
3. Required-schema startup enforcement.
4. Removal of production model-sync authority.
5. Verified rollback compatibility.
