# S3 — Observe and decide: observation status

**Status: OBSERVATION NOT RUN (BLOCKED).** D1 remains unresolved. D2/D3 remain null.

**Updated 2026-09-22:** blocker **B1 is closed** — the observation artifact now exists at
`backend/scripts/migrations/observe-schema.sql`, authored from the contract's D1 core and
carried verbatim (see §2). The observation remains NOT RUN on **B2** (no private service
definition) and on the standing absence of production-read authorization. Two blockers
became one; the slice's state did not change, because the one that remains is the one the
repository cannot close.

Recorded 2026-09-20 18:17 PDT by the WorkBuddy agent session, from fresh read-only
measurements against this repository and this machine. No production connection was
attempted, opened, or considered permitted.

This document answers one question and nothing else: **can the catalog observation in
`03-contracts.md` §3 be executed, and if not, what exactly is missing?** It does not
resolve D1, and it is not a substitute for the observation.

---

## 1. The command, verbatim

From `03-contracts.md` §3, introduced there as *"Exact operator command, **only after
authorization and private service provisioning**"*:

```text
psql -X -w --dbname=service=swan_schema_observer --set=ON_ERROR_STOP=1 --file=backend/scripts/migrations/observe-schema.sql
```

## 2. Why it cannot run — two independent mechanical blockers

These are not opinions about authorization. Either one alone stops the command before any
credential question is reached.

### B1 — the SQL artifact did not exist — **CLOSED 2026-09-22**

When this document was first written, `03-contracts.md` §3 called it a *"Proposed file:
`backend/scripts/migrations/observe-schema.sql`"* and it had never been built. Measured then:

```text
$ ls -la backend/scripts/migrations/observe-schema.sql
ls: cannot access 'backend/scripts/migrations/observe-schema.sql': No such file or directory

$ find backend -maxdepth 4 -name "observe*.sql"
(no output)
```

`--file=` on a nonexistent path fails before the database is contacted. So even with a
perfectly provisioned service definition and full authorization, there was nothing to run.

**Now built.** `backend/scripts/migrations/observe-schema.sql` was authored 2026-09-22
(WorkBuddy session), from the D1 core in `03-contracts.md` §3. Verification performed:

- The contract's D1 core SQL block is carried **verbatim** — every substantive line of
  `03-contracts.md` lines 44–124 is present byte-for-byte (checked line by line with
  `grep -Fqx`; 0 missing).
- It is **READ ONLY**: `BEGIN … REPEATABLE READ READ ONLY`, `statement_timeout 10s`,
  `lock_timeout 1s`, no DML or DDL anywhere.
- It reads **catalog metadata only** plus migration *names* from the metadata relations.
  No client record contents are selected.
- It reports relation **presence explicitly** (section 1), so an absent relation appears
  as a row reading `(absent)` rather than as silence — which is how the contract's
  "distinguish absent relations from query failure" is satisfied.
- It adds constraints, indexes, owned sequences, the metadata-relation shape, and a
  `\gexec`-driven listing of recorded migration names using `%I`-quoted catalog
  identifiers.

**NOT RUN, and not executable from here.** The file is authored and statically checked;
it has never been executed against any database. Its SQL has not been validated by a
PostgreSQL parser, because that requires a connection this session is not permitted to
make. Treat the file as *authored*, not as *proven*.

### B2 — the private service definition does not exist — **STILL OPEN**

The command connects via `--dbname=service=swan_schema_observer`, which requires a
`[swan_schema_observer]` entry in a `pg_service.conf`. Measured:

```text
PGSERVICE=<unset>
PGSERVICEFILE=<unset>
~/.pg_service.conf              -> does not exist
$APPDATA/postgresql/.pg_service.conf -> does not exist
```

`swan_schema_observer` is referenced **nowhere in the repository** — no service definition,
no role provisioning script, no operator runbook. `03-contracts.md` §3 states the position
explicitly: *"No credentials or private service definition belong in this package."* The
absence is deliberate, so this blocker cannot be closed from inside the repository at all.

### And the standing constraint

This session operates under **no production database connections and no production writes**.
The observation is a production read. It is *separately authorized* per `03-contracts.md` §3,
and S3's own acceptance criteria anticipate exactly this outcome.

## 3. Tooling is NOT the blocker

Worth recording, because it is the one thing that is already in place:

```text
$ which psql
/c/Program Files/PostgreSQL/17/bin/psql
$ psql --version
psql (PostgreSQL) 17.0
```

A PostgreSQL 17 client is installed locally. The gap is the artifact (B1), the private
service definition and authorization (B2) — not the client.

## 4. D1: why the repository cannot settle it

`03-contracts.md` requires D1 to be *"resolved by timestamped catalog evidence, not migration
filenames"*. The repository is not merely silent on `users.id` — it is **internally
contradictory**, which is the substantive reason filenames are inadmissible:

| Artifact | What it asserts | Why it is not evidence of the current type |
|---|---|---|
| `backend/models/User.mjs:25` | `id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }` | A model declaration is a *claim about intent*, not an observation. It is also exactly the claim under dispute. |
| `backend/migrations/20250528140000-fix-uuid-integer-mismatch.cjs` | Logs `"EMERGENCY FIX: Converting users.id from UUID to INTEGER..."` | Its conversion is **conditional**: `if (usersTableDesc.id?.type?.includes('uuid'))`. If the column was already INTEGER it is a silent no-op. Its *presence and execution* prove nothing either way. |
| `backend/migrations/UUID-INTEGER-TYPE-MISMATCH-FIX.cjs` | Header: *"the fundamental type incompatibility between sessions.userId (UUID) and users.id (INTEGER)"* | **No timestamp prefix**, so `safe-migrate.mjs` never selects it. It is inert — one of the 38 non-executable files in the S2 debt set. It is a statement of the author's belief at the time, in a file that never ran. |

Both repair migrations are attempts to *reconcile* a UUID/INTEGER mismatch. A table that has
been through two competing repairs is precisely a table whose current type only the catalog
can report. Note also that the observer SQL in §3 matches `users`/`Users` case-insensitively
(`lower(replace(c.relname, '"', '')) IN (...)`) — so the namespace/name ambiguity that makes
D2/D3 undecidable is already accounted for in the query design.

## 5. S3 acceptance criteria — status of each

| Criterion (`05-slices.md` S3) | Status |
|---|---|
| D1 resolved by timestamped catalog evidence, not migration filenames | **BLOCKED** — no observation |
| D2/D3 selected with exact namespace/name/type | **BLOCKED** — no observation |
| Physical FK graph and source-derived unconstrained references reconciled | **BLOCKED** — needs the §3 FK-graph query's output |
| If both user relations exist, stop until ownership and reconciliation are approved | **NOT EVALUABLE** — cannot know whether both exist |
| **A missing production authorization leaves observation NOT RUN** | **SATISFIED** — this is the criterion that applies, and it is met exactly |

So S3 is not "failed" and not "partially done". It is in the one state its own spec provides
for: the authorization is missing, and the observation is NOT RUN.

## 6. What unblocks it

In order. Each is an owner action; none is derivable from the repository.

1. ~~**Build `backend/scripts/migrations/observe-schema.sql`** from the D1 core in
   `03-contracts.md` §3.~~ — **DONE 2026-09-22.** Authored, D1 core carried verbatim,
   read-only, catalog-only. Statically checked; not executed, and its SQL is not
   parser-validated (see §2, B1).
2. **Provision the observer role and the private service definition.** The role must lack
   schema and data write privileges (`03-contracts.md` §3); the `pg_service.conf` entry stays
   off-repository.
3. **Grant explicit, separate authorization for this specific read**, with the read-only
   transaction mode and the 10s statement / 1s lock timeouts the §3 SQL already sets.
4. **Run it and file the receipt.** The output then resolves D1 and unblocks D2/D3 — and with
   them S4 and S5, which are both held by D1.

## 7. Evidence log

All commands read-only, run 2026-09-20 18:17 PDT from `SS-PT/` (repo root) and `SS-PT/backend`.

```text
ls -la backend/scripts/migrations/observe-schema.sql      -> No such file or directory
find backend -maxdepth 4 -name "observe*.sql"             -> (no output)
which psql                                                -> /c/Program Files/PostgreSQL/17/bin/psql
psql --version                                            -> psql (PostgreSQL) 17.0
echo $PGSERVICE                                           -> <unset>
echo $PGSERVICEFILE                                       -> <unset>
ls -la ~/.pg_service.conf                                 -> No such file or directory
ls -la "$APPDATA/postgresql/.pg_service.conf"             -> No such file or directory
grep -r "swan_schema_observer" .                          -> (no matches outside the blueprint)
```

No production host, port, database name, role, or credential was resolved, requested, or used.
