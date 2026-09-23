# PART C — Decision-Density Self-Test

> Every remaining builder choice: decided-in-package, or delegated-with-bounds.

---

| Choice | Resolution or bounded delegation |
|---|---|
| Who owns schema changes? | **Decided:** migrations-v2; application startup validates |
| What establishes installed reality? | **Decided:** timestamped PostgreSQL catalogs |
| D1: production `users.id` type | **UNKNOWN:** authorized observer settles it; no inference from repair names |
| D2: `Users` or `users` | **Owner-held:** exact namespace/name selected after catalog, model-SQL, and ownership evidence |
| D3: INTEGER or UUID | **Owner-held:** preserve or explicitly remap after full reference analysis |
| Both user relations exist | **Decided:** block automatic adoption; owner-approved reconciliation required |
| D4: letter-prefixed repairs | **Decided:** retain historical names/bytes; exclude legacy replay from fresh v2 bootstrap |
| D5: inert migrations | **Decided:** reconcile intended effects into migration ownership; preserve originals and record each disposition |
| D6: historical 23-entry debt | **Decided:** retain truthful historical ratchet; require zero unexplained debt in the new execution path |
| D7: acceptance | **Decided:** named targeted tests, real DB/CLI fixtures, mutations, and bounded baseline comparisons |
| D8: dead helper | **Decided:** delete `getSequelize()` after verified shared configuration replaces active connection resolution |
| New execution directory | **Decided:** `backend/migrations-v2/` |
| New metadata identity | **Decided:** `SequelizeMetaV2` in approved schema; installed CLI configuration must be proven |
| Baseline filename | **Decided:** `20260920000000-schema-authority-baseline.cjs`; do not create a placeholder |
| Existing-schema adoption | **Decided:** verify full new contract; never fabricate legacy execution |
| Partially compatible schema | **Decided:** only a specific approved upgrade; otherwise HALT |
| Automatic structural-error recovery | **Decided:** prohibited |
| Failure bypass | **Decided:** rejected before connection |
| `--to` behavior | **Decided:** retained with first-failure stop and verified metadata/postconditions |
| Missing metadata versus read failure | **Decided:** only confirmed relation absence permits uninitialized history |
| Parent/child database selection | **Decided:** shared frozen configuration plus identity validation before DDL |
| Child execution mechanism | **Decided:** verified installed CLI through Node, no shell/download fallback |
| Invocation aliases | **Bounded implementation:** support actual deployment and Windows forms; filesystem-identity and subprocess tests required |
| Concurrent runners | **Decided:** one database lock through verification; pinned connection |
| Exact advisory-lock identity | **Bounded S0 choice:** reserve an unused identity after existing-lock evidence; record it before implementation |
| Timeout/output limits | **Decided:** 120-second default, reviewed maximum 600 seconds, five-second termination grace, 64 KiB output bound |
| Interrupted execution | **Decided:** observe actual state; no automatic retry or metadata deletion |
| PostgreSQL fixture version | **Bounded S4 choice:** match observed deployment major and pin provisioner/image version |
| Fixture ownership | **Decided:** freshly provisioned disposable resources; ambient application URLs prohibited |
| Full columns and model definitions | **BLOCKED:** absent from packet; must be supplied, not invented |
| Final physical ERD | **BLOCKED:** follows approved complete schema; evidence projection is not a substitute |
| Per-table baseline decomposition | **Bounded S4 choice:** listed subsystem only, ≤300 lines/file, no new behavior, checkpoint approval |
| Extensions/nontransactional DDL | **BLOCKED unless explicitly declared:** no implicit installation or execution |
| Production sync removal | **Decided:** coupled with verified adoption and startup schema gate |
| Rollback | **Decided:** compatibility-tested code rollback or approved/rehearsed database recovery; no automatic destructive down |
| Production connection/execution | **Separately authorized:** this review performs neither |
| Reviewer and spending | **Decided:** preserve established authority; no silent replacement or paid call |
| Historical review preservation | **Decided:** successor record; caller files and links it |
| UI, wireframes, palette, HTTP contracts | **N/A:** no such surface |
| Implementation readiness | **PARTIAL:** safe decisions are specified; missing schema evidence blocks dependent implementation |

**Self-test result:** No consequential choice is silently delegated. The sole schema authority and migration-history strategy are decided. Physical schema selection, complete DDL, and production execution remain explicitly gated by evidence and owner authority.
