---
artifact_id: SWAN-CHART-KG1A-DB-GUARD
owner: lead Codex contract; Luna test-tool implementation
version: 3.2
effective: 2026-09-04
status: LOCALLY VERIFIED TEST-ONLY SLICE; APPLICATION WRITERS AND MIGRATIONS EXCLUDED
supersedes: KG1 all-or-nothing gate only for this independent prerequisite
---

# Prove the synthetic database before testing a migration

Execution and the actual readonly PostgreSQL evidence are recorded in [17](17-kg1a-verification.md).

The existing DB singleton is not a safe test entry point. This slice adds a readonly test
guard/probe; it does not change `backend/database.mjs`, imports of app models or production
config. No migration, schema DDL, seeded rows, provider call or client record is part of it.
Lead authors this contract and RED gates; Luna implements exactly the three files below.

## Exact new files in isolated build root

- `backend/tests/helpers/chartUnitDbGuard.mjs`
- `backend/tests/node-runner/chartUnitDbGuard.test.mjs`
- `backend/scripts/chart-unit-db-preflight.mjs`

Use native Node tests, current installed pg package, no new dependency. Max300 lines/file.
Default Vitest excludes node-runner tests intentionally; execute their actual Node runner.
No source filename outside this list may be edited without a new scoped lead instruction.

## Guard API and target

Export only `validateChartUnitDbTarget(input)` and
`probeChartUnitDbTarget(input, {createClient, environment} = {})`.
The helper may import only Node builtins statically; default pg import happens inside the
probe AFTER target and ambient-config validation. Never import database.mjs, dotenv or models.

Input is a plain object with EXACTLY these required own fields, no extras or inference:

| Field | Exact accepted value |
|---|---|
| host | string127.0.0.1 only; not localhost, URL, remote address or missing |
| port | integer55439, not string or default5432 |
| database | stringchart_weight_synthetic |
| user | stringchart_unit_test |
| dataDirectory | nonempty absolute filesystem path whose normalized basename is chart-weight-db-20260904 |

Invalid target throws stable `CHART_UNIT_DB_TARGET_REJECTED` without echoing input. Return a
new normalized descriptor on success, leave input unchanged. Windows path comparisons must
normalize slashes and case; POSIX case remains significant. Test on the actual platform.
The allowed directory belongs to this task; actual directory equality is verified by SQL.

Before createClient or pg import, reject nonempty ambient DATABASE_URL, PGHOST, PGPORT,
PGDATABASE, PGUSER, PGPASSWORD, PGSERVICE, PGSERVICEFILE, PGSSLMODE, PGOPTIONS, PG_HOST,
PG_PORT, PG_DB, PG_USER, PG_PASSWORD. `environment` defaults to process.env; tests may inject
an object. Failure code `CHART_UNIT_DB_AMBIENT_CONFIG`; no values or key contents logged.
Never clear workstation variables or read an env file to make the probe pass.

`createClient` is optional test injection, a function receiving the explicit pg configuration.
Default dynamically imports pg and constructs Client. Explicit configuration must include
host/port/database/user from validated input, password:'', ssl:false, application_name:
'swan-chart-unit-preflight', connectionTimeoutMillis:2000, query_timeout:2000,
statement_timeout:2000, options:'-c default_transaction_read_only=on -c timezone=UTC'.
No connectionString or permissive fallback. A bad injected factory is a probe failure.

Connect once; issue ONE constant SELECT returning aliases database,user,host,port,dataDirectory,
listenAddresses,timeZone,readOnly from current_database(),current_user,host(inet_server_addr()),
inet_server_port(),current_setting('data_directory'),current_setting('listen_addresses'),
current_setting('TimeZone'),current_setting('default_transaction_read_only'). Quote camelCase
aliases. Validate exactly one row and exact expected identity, loopback-only listenAddresses,
UTC and readOnly='on'. Directory must equal normalized expected dataDirectory.
Do not cast inet_server_addr() to text: live PostgreSQL17 returned127.0.0.1/32 for that cast;
host(inet_server_addr()) was independently observed to return the required127.0.0.1.

On success return only `{status:'verified',database:'chart_weight_synthetic',user:'chart_unit_test',
host:'127.0.0.1',port:55439,timeZone:'UTC',readOnly:true}`. Do not return/log dataDirectory.
Close client exactly once in finally, including connect/query/identity failures. Probe failures
including cleanup failure throw stable `CHART_UNIT_DB_PROBE_FAILED`, never provider error text,
credentials, connection URLs, input dumps or cause stack that could carry private data.
The returned receipt is not a reusable writable ORM connection and does not authorize DDL.

## CLI

Require explicit --host, --port, --database, --user, --data-directory pairs, once each, no
unknown/duplicate/missing flags. Port text must be canonical decimal digits before conversion.
`--help` alone prints usage without connecting. Bad CLI syntax exits2 with stable
CHART_UNIT_DB_USAGE; target/env/probe rejection exits1 with only its stable code.
Success prints only the safe JSON receipt, exit0. No environment defaults, retries, secrets,
startup services or permission escalation performed by the script itself.

## Tests and exit gates

Lead executable gate `kg1-db-guard.red.mjs <build-root>` must first fail with missing module.
Luna adds native regression tests, including real CLI subprocess invalid-input controls.

| ID | Test requirement |
|---|---|
| DG01 | exact frozen target validates, returns new object; input unchanged |
| DG02 | missing/nonplain/array/extra/malformed target, host localhost/remote, wrong/string port, wrong db/user, relative/wrong directory →target rejected |
| DG03 | each named nonempty ambient field →ambient rejected before createClient; no value echoed |
| DG04 | invalid target →no createClient call, no pg import or query |
| DG05 | happy injected client →exact explicit config, one connect/SELECT/end, safe receipt only |
| DG06 | wrong row count or any wrong identity/directory/listen/timezone/readOnly →probe rejected and end once |
| DG07 | connect and query errors with synthetic secret-like text →stable sanitized error; end once |
| DG08 | cleanup error →stable failure, not false success; no retry |
| DG09 | helper has no app/DB singleton/env-file imports; default driver loads only after validation |
| DG10 | CLI missing/duplicate/unknown flags and bad numeric port →exit2 before connector; --help no connection |
| DG11 | fresh actual stopped cluster yields failure, never skip; then parent starts exact owned cluster and successful readonly SELECT verifies all fields |
| DG12 | readonly actual session rejects a synthetic CREATE TABLE attempt in a separate scoped proof, if testing writable-handle guard later; this slice exposes no writable handle |

DG12 is explicitly a later integration proof, not required to invent a writable handle here.
Parent owns server start/stop and actual test invocation. Luna must not start PostgreSQL,
open .env, change OS services, or execute any migration. Stop and ask if an API/driver behavior
differs from the installed version. Report exact tests, source hashes, errors and runtime limits.

Exit: lead tests + native tests + real readonly identity proof + independent failure controls.
This only clears the test-target prerequisite. KG1b still needs a guarded migration handle,
caller/model drift artifact and exact writer transaction contracts before implementation.
