**1. Test execution contract**

All new `.test.mjs` files use Node’s built-in `node:test` and `node:assert/strict`. Their commands below are proposed runnable interfaces; the files are not claimed to exist or have passed.

[UNKNOWN] The actual invocation commands and complete source for the existing tests are absent. Preserve the reported existing coverage, but obtain their real commands before running or replacing them.

Database tests must obtain a freshly provisioned, uniquely identified disposable database. The provisioner owns its lifecycle and records the PostgreSQL version. An ambient `DATABASE_URL` is never an accepted fixture source.

Missing fixture prerequisites must produce a failing/blocked run, not a successful run with all cases skipped.

**2. `backend/tests/unit/migrationRunnerContract.test.mjs` — 12 cases**

```text
node --test backend/tests/unit/migrationRunnerContract.test.mjs
```

| Case | What it proves |
|---|---|
| `import-does-not-connect-spawn-or-write` | Importing testable modules has no operational side effects |
| `direct-entry-executes-through-supported-path-aliases` | Actual supported Windows/deployment invocation forms cannot silently skip `main` |
| `parent-and-child-use-identical-resolved-target` | Environment, database identity, and dialect options are shared |
| `metadata-permission-error-prevents-child-spawn` | SQLSTATE permission denial is not treated as empty history |
| `only-confirmed-missing-metadata-is-uninitialized` | Missing relation is distinguished from transport and malformed-query errors |
| `already-exists-output-cannot-complete-partial-migration` | Text matching cannot create a completion marker |
| `zero-exit-without-required-marker-or-postcondition-fails` | Child exit alone cannot establish success |
| `first-failure-stops-all-later-to-targets` | Later pending migrations are NOT EVALUATED after failure |
| `spawn-error-settles-and-closes-owned-resources` | Launch failure cannot leave the operation hanging |
| `timeout-signal-and-late-output-produce-bounded-result` | Deadline, process termination, output closure, and uncertainty are handled |
| `allow-failure-is-rejected-before-connect` | The former bypass cannot mark failed work complete |
| `lock-is-held-through-postcondition-verification` | Participating runners cannot overlap execution/verification |

Intercepted boundaries prove orchestration. They do not prove PostgreSQL DDL behavior.

**3. `backend/tests/unit/migrationInventoryContract.test.mjs` — seven cases**

```text
node --test backend/tests/unit/migrationInventoryContract.test.mjs
```

| Case | What it proves |
|---|---|
| `inventory-includes-cjs-js-mjs-sql-cts-ts-candidates` | Extension omissions cannot silently hide candidates |
| `nested-files-are-classified-without-expanding-execution` | Recursive visibility does not imply CLI execution |
| `v2-allows-only-top-level-fourteen-digit-cjs-names` | The new epoch has one explicit naming convention |
| `basename-validation-is-independent-of-parent-path` | A path prefix cannot corrupt naming counts |
| `duplicate-identities-and-dependency-order-fail` | Lexical order must satisfy declared dependencies |
| `legacy-paths-and-hashes-remain-unchanged` | Reconciliation preserves historical identity |
| `new-or-changed-inert-file-requires-disposition` | Debt cannot grow silently |

The installed CLI’s actual discovered order is also checked in the integration suite; a mocked inventory alone is insufficient.

**4. `backend/tests/unit/migrationSchemaContract.test.mjs` — six cases**

```text
node --test backend/tests/unit/migrationSchemaContract.test.mjs
```

| Case | What it proves |
|---|---|
| `missing-owner-name-type-or-schema-blocks-plan` | Unknown D2/D3 values cannot become defaults |
| `partial-schema-cannot-be-adopted` | Existing-object presence cannot satisfy an incomplete contract |
| `same-relation-name-in-different-schema-is-not-equal` | Namespace is part of table identity |
| `uuid-integer-change-requires-explicit-mapping-plan` | Identity conversion cannot occur implicitly |
| `changed-observation-or-contract-digest-blocks-execution` | Stale approval cannot authorize changed inputs |
| `legacy-debt-distribution-is-19-2-1-1` | The supplied register’s explanation remains truthful |

The last case is documentary/static coverage, not database correctness evidence.

**5. `backend/tests/integration/migrationEpochV2.test.mjs` — ten cases**

```text
node --test --test-concurrency=1 backend/tests/integration/migrationEpochV2.test.mjs
```

| Case | Fixture and observable result |
|---|---|
| `fresh-v2-baseline-satisfies-independent-catalog-contract` | Empty approved schema; actual CLI creates complete schema; independently reviewed expected columns/types/FKs/indexes match; application models create and read synthetic records |
| `exact-existing-schema-adopts-without-legacy-replay` | Complete approved schema; adoption changes only new-epoch metadata; legacy metadata and application data remain unchanged |
| `partial-baseline-fails-without-completion-marker` | Required object deliberately omitted; adoption fails and no v2 baseline marker appears |
| `conflicting-users-relations-block-before-ddl` | Both names present without an approved reconciliation; no application-schema or data mutation |
| `incompatible-parent-child-key-types-block-before-ddl` | UUID/integer mismatch; no cast, replacement identity, or FK removal |
| `multi-operation-conflict-cannot-fabricate-completion` | First operation encounters an existing object, later required object absent; no false metadata success |
| `different-parent-child-database-identities-block-before-ddl` | Two disposable databases; mismatch detected; neither receives application migration DDL |
| `concurrent-runners-permit-one-mutator` | Two real processes; one owns lock, other exits BLOCKED; no duplicate execution |
| `startup-refuses-incomplete-schema-without-sync` | Required contract deliberately broken; application does not listen and does not call schema-writing sync |
| `restore-rehearsal-preserves-identities-and-references` | Disposable backup/restore; synthetic identities, FK relationships, and relevant counts match before/after |

Required independent assertions:

- Do not generate expected schema exclusively from the same DDL generator under test.
- Verify physical catalog state rather than log messages.
- Verify synthetic application persistence through the actual selected model mapping.
- Verify metadata **deltas**, including unchanged historical entries.
- Assert forbidden side effects on failure fixtures.

These tests remain BLOCKED until the complete target schema and fixture definitions exist.

**6. `backend/tests/unit/migrationStartupContract.test.mjs` — four cases**

```text
node --test backend/tests/unit/migrationStartupContract.test.mjs
```

| Case | What it proves |
|---|---|
| `migration-failure-prevents-listen` | The new deployment path cannot swallow required migration failure |
| `schema-mismatch-prevents-listen` | A nominally successful migration command cannot bypass readiness |
| `v2-production-startup-never-invokes-schema-sync` | Production schema authority is singular after cutover |
| `missing-epoch-does-not-fall-back-to-legacy` | Configuration omission cannot silently replay history |

**7. Required mutations**

Each mutation runs in an isolated temporary copy. Restore the original between runs. Record the exact case, expected assertion failure, actual diagnostic, and nonzero exit. An import/setup failure does not count as a killed mutation.

| Mutation | Required failing case |
|---|---|
| Restore broad “already exists” completion | `already-exists-output-cannot-complete-partial-migration` |
| Treat every metadata read error as empty history | `metadata-permission-error-prevents-child-spawn` |
| Continue after first `--to` failure | `first-failure-stops-all-later-to-targets` |
| Restore failure bypass | `allow-failure-is-rejected-before-connect` |
| Remove target-identity validation | `different-parent-child-database-identities-block-before-ddl` |
| Remove required baseline column without changing expected contract | `fresh-v2-baseline-satisfies-independent-catalog-contract` |
| Adopt after checking table existence only | `partial-baseline-fails-without-completion-marker` |
| Remove migration lock | `concurrent-runners-permit-one-mutator` |
| Restore nonfatal startup continuation | `migration-failure-prevents-listen` |
| Restore production sync fallback | `v2-production-startup-never-invokes-schema-sync` |

**8. Regression evidence**

For any broader existing suite that is run, compare stable identities:

```text
test file + suite name + case name + environment + failure classification
```

Report:

- Existing failures reproduced.
- New failures introduced.
- Previous failures absent.
- Cases skipped, renamed, or not executed.
- Environmental failures separately from product failures.

No all-green broad-suite evidence is supplied. No test in this forged package has been executed during this review.
