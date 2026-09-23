**1. Public surface**

N/A — no HTTP endpoints, request bodies, response status codes, UI events, or new application-facing data models.

The applicable interfaces are configuration, catalog observation, CLI execution, migration metadata, and operator receipts.

**2. Schema decision receipt**

The caller persists `schema-authority-decision.json` alongside this package after the owner decision. Until then, nulls remain null.

```json
{
  "formatVersion": 1,
  "authority": "migrations-v2",
  "applicationSchema": null,
  "userRelation": null,
  "userPrimaryKeyType": null,
  "observationReceiptSha256": null,
  "targetContractSha256": null,
  "approvedBy": null,
  "approvedAtUtc": null,
  "approvedExecutionModes": [],
  "incompatibleDataPlanSha256": null
}
```

Validation:

- `userRelation` must be exactly `Users` or `users`, paired with its namespace.
- `userPrimaryKeyType` must be exactly `integer` or `uuid`.
- Receipt approval is not authorization to deploy or connect to production.
- A cross-type or cross-table transition requires an explicit data-plan digest.
- No fallback values. Missing required fields produce BLOCKED.

**3. Catalog observation**

The production read is separately authorized. The observer role must lack schema/data write privileges. Set read-only transaction mode and bounded timeouts.

Proposed file: `backend/scripts/migrations/observe-schema.sql`.

Its D1 core is:

```sql
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '1s';

SELECT
  transaction_timestamp() AS observed_at_utc,
  current_setting('server_version_num') AS server_version_num,
  current_setting('transaction_read_only') AS transaction_read_only;

SELECT
  n.nspname AS table_schema,
  c.relname AS table_name,
  a.attname AS column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS column_type,
  a.attnotnull AS not_null,
  a.attidentity AS identity_kind,
  pg_get_expr(d.adbin, d.adrelid) AS default_expression,
  EXISTS (
    SELECT 1
    FROM pg_constraint p
    WHERE p.conrelid = c.oid
      AND p.contype = 'p'
      AND a.attnum = ANY(p.conkey)
  ) AS participates_in_primary_key
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid
LEFT JOIN pg_attrdef d
  ON d.adrelid = c.oid AND d.adnum = a.attnum
WHERE c.relkind IN ('r', 'p')
  AND n.nspname <> 'information_schema'
  AND n.nspname !~ '^pg_'
  AND lower(replace(c.relname, '"', '')) IN (
    'users', 'sessions', 'orientations',
    'sociallikes', 'gamifications', 'messages',
    'sequelizemeta', 'sequelizemetav2'
  )
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY n.nspname, c.relname, a.attnum;

WITH RECURSIVE connected(oid) AS (
  SELECT c.oid
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'p')
    AND n.nspname <> 'information_schema'
    AND n.nspname !~ '^pg_'
    AND lower(replace(c.relname, '"', '')) = 'users'
  UNION
  SELECT CASE
    WHEN k.conrelid = x.oid THEN k.confrelid
    ELSE k.conrelid
  END
  FROM connected x
  JOIN pg_constraint k
    ON k.contype = 'f'
   AND (k.conrelid = x.oid OR k.confrelid = x.oid)
)
SELECT
  ns.nspname AS source_schema,
  src.relname AS source_table,
  k.conname AS constraint_name,
  nt.nspname AS target_schema,
  dst.relname AS target_table,
  k.convalidated AS validated,
  pg_get_constraintdef(k.oid, true) AS definition
FROM pg_constraint k
JOIN pg_class src ON src.oid = k.conrelid
JOIN pg_namespace ns ON ns.oid = src.relnamespace
JOIN pg_class dst ON dst.oid = k.confrelid
JOIN pg_namespace nt ON nt.oid = dst.relnamespace
WHERE k.contype = 'f'
  AND (
    k.conrelid IN (SELECT oid FROM connected)
    OR k.confrelid IN (SELECT oid FROM connected)
  )
ORDER BY ns.nspname, src.relname, k.conname;

COMMIT;
```

This establishes observed identifier/type facts and declared FK connectivity. It does **not** establish unconstrained references or ownership of records.

The completed observer must additionally:

- Read all columns, constraints, indexes, sequences, and relevant functions in the approved ownership manifest.
- Read historical migration names from each confirmed metadata relation using safely quoted catalog identifiers.
- Distinguish absent relations from query failure.
- Record timestamp, tool version, source hashes, and an operator-local database identity.
- Keep raw output restricted; redact sensitive default literals before inclusion in a review packet.
- Never select client record contents for this review.

Exact operator command, **only after authorization and private service provisioning**:

```text
psql -X -w --dbname=service=swan_schema_observer --set=ON_ERROR_STOP=1 --file=backend/scripts/migrations/observe-schema.sql
```

No credentials or private service definition belong in this package.

**4. Runtime function contracts**

Proposed interfaces; none is claimed to exist already:

```typescript
type Epoch = "legacy" | "v2";

type RunResult = {
  status: "PASS" | "BLOCKED" | "FAILED" | "INDETERMINATE";
  exitCode: 0 | 1 | 2 | 3;
  firstFailure: string | null;
  attempted: string[];
  notEvaluated: string[];
  observedCompleted: string[];
  evidenceDigest: string | null;
};

type ChildResult = {
  code: number | null;
  signal: string | null;
  timedOut: boolean;
  spawnErrorCode: string | null;
  outputTail: string;
  outputTruncated: boolean;
};

type CatalogDifference = {
  object: string;
  property: string;
  expected: unknown;
  observed: unknown;
};

type MigrationSpec = {
  name: string;
  sha256: string;
  dependsOn: string[];
  preconditionId: string;
  postconditionId: string;
  allowedMode: "fresh" | "adopt" | "upgrade";
};

async function runMigrations(
  options: RunnerOptions,
  dependencies: RunnerDependencies
): Promise<RunResult>;

async function runCliMigration(
  request: CliMigrationRequest
): Promise<ChildResult>;

async function observeCatalog(
  session: DatabaseSession,
  scope: CatalogScope
): Promise<CatalogSnapshot>;

function compareCatalog(
  expected: SchemaContract,
  observed: CatalogSnapshot
): CatalogDifference[];

function discoverMigrationFiles(
  directory: string
): MigrationInventory;
```

Contract completion at S0/S4 must provide the referenced object definitions, including the resolved connection configuration. A builder cannot substitute `any` or infer omitted production values.

**5. Runner semantics**

- Load one canonical configuration adapter. Both parent and child consume the same resolved, frozen configuration.
- Validate the selected environment; do not silently select another one.
- Confirm child database identity before migration DDL. Identity mismatch is BLOCKED.
- Use the installed local CLI entry point through Node with `shell: false`. No `npx` download fallback.
- Retain `db:migrate --to`; do not treat it as a single-migration API.
- Compare pending order with the approved manifest and the installed CLI’s discovered order.
- Hold a database migration lock while reading pending state, executing, and verifying.
- Stop after the first failed or indeterminate invocation.
- Never insert completion because output matches a phrase.
- A zero child exit requires the expected metadata delta and the migration’s postconditions.
- A nonzero exit never triggers manual completion or deletion of metadata.
- Only confirmed missing metadata is an uninitialized state. Permission, schema, and transport errors fail closed.
- Library code returns a result; the executable wrapper sets the process exit code and closes owned resources.

Exit codes:

| Code | Meaning |
|---|---|
| `0` | Verified completion |
| `1` | Execution or postcondition failure |
| `2` | Preconditions, configuration, lock, or required decisions block execution |
| `3` | Outcome cannot be determined after interruption or observation failure |

**6. Configuration and resource bounds**

| Input | Contract |
|---|---|
| Existing database configuration | Values remain private; freeze and test actual resolution before changing the runner |
| `SWAN_MIGRATION_EPOCH` | Required for the replacement runner; exactly `legacy` or `v2`; no automatic fallback |
| `SWAN_MIGRATE_ALLOW_FAILURE` | Value `1` is rejected before connection |
| `SWAN_MIGRATE_STRICT` | Retained only for compatibility diagnostics; v2 always uses fail-closed semantics |
| `AUTO_SYNC` | Cannot enable production DDL after v2 cutover |
| `STARTUP_DATABASE_REPAIR` | Cannot bypass the v2 production schema gate |
| Test database configuration | Supplied only by an approved disposable-fixture provisioner |

Bounds:

- Metadata/catalog statements: 10-second timeout; lock acquisition is nonwaiting.
- Child migration deadline: 120 seconds by default.
- A reviewed migration may declare a larger deadline, up to 600 seconds; exceeding that requires a separate operational decision.
- Keep at most 64 KiB of child output in memory; sanitize before displaying or persisting it.
- On timeout/cancel: request termination, allow five seconds, then terminate the owned process tree using the tested platform adapter.
- Until process termination is confirmed, retain lock ownership where possible and report INDETERMINATE. Do not start another migration.

**7. Concurrency and transaction boundaries**

Use one reserved PostgreSQL advisory-lock identity for all participating migration entry points. S0 must establish that it does not collide with an existing application lock.

The adapter must keep lock ownership on one pinned database connection. Releasing a pool connection does not constitute a valid lock lifecycle.

The lock does not control old startup sync or external SQL sessions. Cutover must stop those writers before adoption.

Each migration owns its database transaction. The parent’s lock transaction does not wrap the CLI’s DDL. On interruption, inspect actual metadata and postconditions before selecting recovery.

**8. Baseline and adoption**

Reserve the first new filename:

```text
backend/migrations-v2/20260920000000-schema-authority-baseline.cjs
```

Do not create an empty placeholder migration.

Fresh mode:

1. Confirm the approved application schema is empty.
2. Execute the complete approved baseline.
3. Verify all required objects and invariants.
4. Commit schema work.
5. Require the CLI’s expected new-epoch metadata record.

Adopt mode:

1. Verify the entire existing target contract.
2. Make no application-schema or data changes.
3. Record the new baseline’s successful verification through the normal CLI completion mechanism.
4. Preserve legacy metadata unchanged.

The new marker means “v2 baseline contract verified.” It does not mean any legacy migration was executed.

Partial or incompatible databases cannot enter either path. They require a specific approved upgrade with complete preconditions, transformations, and postconditions.

**9. Data migration and rollback**

UUID and INTEGER are distinct identity domains. No direct cast, generated replacement ID, or association by coincidentally equal values is authorized.

Any later remapping plan must specify every affected table, unconstrained reference, uniqueness rule, orphan policy, sequence/default update, and rollback mapping. That plan is BLOCKED by missing source and production observation.

Rollback contracts:

- Fresh disposable baseline: roll back its transaction or discard the owned fixture.
- Existing-database adoption: stop before application deployment when verification fails; never erase historical metadata to retry.
- Production upgrade: use its reviewed compensating operation or an operator-controlled restore rehearsed on a disposable clone.
- A code rollback is allowed only if the prior application version is compatible with the installed schema.
- No automatic destructive `down` migration or fallback to legacy replay.
