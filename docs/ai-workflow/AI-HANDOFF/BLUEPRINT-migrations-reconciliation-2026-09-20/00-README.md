**Package:** `BLUEPRINT-migrations-reconciliation-2026-09-20`  
**Status:** REVIEWED PLAN — implementation and production execution NOT VERIFIED.  
**Scope:** migration correctness, schema authority, historical reconciliation, and evidence.

**1. Governing decisions**

1. **Migrations become the sole intended authority for schema changes.** Models declare application expectations; startup must eventually validate rather than create or alter production schema.
2. **PostgreSQL catalogs establish installed reality.** Neither models nor migration metadata alone establish that reality.
3. **Use a new migration epoch.** Its directory is `backend/migrations-v2/`; its metadata relation is `SequelizeMetaV2`, in the approved application schema. Existing `SequelizeMeta` remains historical evidence.
4. **Preserve the legacy chain.** Do not rename or delete its repairs, fabricate its completion records, or use it to bootstrap new databases after cutover.
5. **Choose table identity and key type only through the owner decision below.** Recommend migration ownership now; do not infer production values.
6. **No current production connection, mutation, commit, staging, deployment, or external review call is authorized by this package.**

**2. Owner-held schema decisions**

[UNKNOWN] The packet cannot select a production-safe physical table or key conversion.

| Decision | Allowed outcomes | Required evidence | Boundary |
|---|---|---|---|
| D2: canonical user relation | Preserve/adopt `Users`; preserve/adopt `users`; explicitly approved reconciliation when both exist | Exact namespace/name, model-emitted SQL, FK graph, restricted data ownership assessment | Sean selects; builder cannot choose from naming preference or row count |
| D3: canonical key type | Preserve INTEGER; preserve UUID; separately designed remapping | Actual parent/child types, all constrained and unconstrained references, application serialization assumptions | Sean selects; no implicit cast or newly assigned IDs |
| Existing incompatible data | Approved mapping and migration addendum, or HALT | Collision policy, identity provenance, reference coverage, rollback proof | No generic “merge users” operation |
| Target application schema | Existing observed namespace selected in the decision receipt | Catalog and configuration observation | Do not assume `public` |

The house rule “FKs reference `Users`” describes the preferred existing application convention. It cannot authorize moving data or changing physical identities. If Sean selects another target, record the explicit override before changing callers or constraints.

**3. Builder contract**

> Implement one authorized slice at a time. Follow decided contracts. Stop a dependent slice when required evidence or an owner decision is absent; continue independent work where possible. Return the exact diff, named test results, mutation evidence, and unresolved boundaries for each checkpoint. Do not turn missing evidence into defaults. Do not claim production correctness from mocks, source searches, or suite totals.

**4. Build sequence**

- S0: freeze evidence and reconcile claims.
- S1: runner control-flow hardening.
- S2: discovery inventory and historical dispositions.
- S3: read-only observation and owner schema decisions.
- S4: complete target contract and epoch adoption design.
- S5: implement and verify the new migration chain in disposable PostgreSQL.
- S6: prepare the coupled deployment/startup change and its rollback.
- S7: obtain production execution authority, perform bounded rollout, and record observations.

S0–S2 do not require a production connection. S3’s production observation needs separate authorization. S4–S7 cannot bypass missing schema decisions or omitted source evidence.

**5. Truth and preservation**

[VERIFIED] The packet reports 312 executable and 38 inert files and describes a dirty runner. Those are packet observations, not a newly measured inventory.

Before implementation, the caller must provide:

- Snapshot identifier, commit when available, dirty patch, and hashes of every reviewed source.
- Full relevant configuration and startup sources with secrets removed.
- Complete migration inventory and bodies needed for the selected scope.
- Existing test definitions, actual commands, and raw bounded results.
- Existing review references and caller-assigned archive identity.

Preserve the original ledger and successor. Publish this package as a successor interpretation, not an alteration of historical findings.
