# S06 isolated infrastructure receipt

Status: INFRASTRUCTURE_READY_FOR_ADMITTED_TESTS_ONLY (application readiness not claimed).

Worktree: C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\tmp\worktrees\rolodex-luna-01a098de-20260913
Branch: codex/rolodex-luna-01a098de
HEAD: c0cbe538d8ed2ca519bb494cdf3282bf43b76699

## Backend dependency isolation

Command: npm ci --offline --ignore-scripts --no-audit --no-fund
Result: exit 0; 786 packages installed into a real NEW_ROOT backend/node_modules directory.
Pinned resolutions: pg 8.15.6; sequelize 6.37.8; @swan/schemas 0.1.0.
@swan/schemas is a junction to NEW_ROOT/packages/swan-schemas. backend/package.json and package-lock.json hashes are unchanged: 52A07F1EE6C99C0E91299E3BA2BE46ACEC790A062CD26EAD029B0DD1637D2084 and 802F2CAFEFAEFACDBDA28F4F628163959847CD4DB8D1955EE7B396702E0CFC7A.

## PostgreSQL isolation

PostgreSQL 17.0: C:\Program Files\PostgreSQL\17\bin\postgres.exe
Data directory: C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\tmp\worktrees\rolodex-luna-01a098de-20260913\tmp\rolodex-postgres-s06-20260913
Loopback: 127.0.0.1:55089, selected by TcpListener(loopback,0) before start.
Synthetic role/database: rolodex_s06_client / rolodex_s06_test; trust authentication exists only in this disposable cluster, with no password.
Process identity: PID 91052, postmaster.pid matches, executable path is PostgreSQL 17, process remains alive.
Admin and client psql identity queries passed; client saw server 17.0, loopback address/port, synthetic database/user, and zero public user tables.

## Failure and recovery evidence

The sandbox pg_ctl start attempt failed with restricted-token error code 87. The unchanged command was retried natively and logged server start success. A stale postmaster.pid left by the interrupted wrapper was removed only after the recorded PID was confirmed not live; the direct PostgreSQL process then started and passed native pg_ctl status. The least-privilege client data_directory query was rejected as expected and preserved as a permission-boundary check.

## Scope and limits

No application source, package, lock, config, old worktree, old cluster, provider, or external network was changed. No schema sync, tables, models, or service tests were created because S06 remains planned/not admitted. Root owns the explicit stop of PID 91052 after admitted integration use.

Report JSON SHA-256: E9135127C8874FE7170103CD972E8FEB3A9E844488C99C7B2ECC7AB8D1E080BF
