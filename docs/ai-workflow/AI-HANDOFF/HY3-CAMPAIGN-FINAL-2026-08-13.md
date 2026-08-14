# Consult reply — Tencent HY3 (tencent/hy3) — 2026-08-14T00:53:21.558Z

> tokens: prompt=4252 completion=3165 | finish_reason: stop | max_tokens: 60000

# HY3 Independent Architecture Review — End State & Merge Slice

## 1. Architecture Attack: The Instruments

### Drift Auditor
- **Claim:** 5 classes incl. index-column-mismatch via shared resolver; rehearsable against QA (PG_HOST) — previously only aimable at production.
- **Verdict:** Half-measure. "Rehearsable against QA" means it is **not wired into any CI gate**; it is a manual script. The shared resolver is a single point of truth, but its type-normalization logic is unverified against the 9.9s prod index batch. If the resolver maps `Sequelize.STRING` → `varchar` but prod uses `citext` (common in legacy Swans), mismatch count stays 0 while real drift hides.
- **Adversarial note:** You built a thermometer you only shake in the lab, not in the fever ward.

### Schema Generator / QA Container
- **Claim:** Model-derived schema fully green, 198 tables, zero import-graph failures; sentinel positive-identity guard; manifest JSON emitted.
- **Verdict:** "Green" is a vanity metric. The QA container validates that models *import* and *emit DDL*, not that the DDL is *idempotent* under repeated runs nor that it matches prod data shapes (nullability, default functions). The sentinel positive-identity guard only stops the container from reporting someone else's schema as its own — it does not validate correctness.
- **Gap:** No backup instrument is described anywhere in the end-state. If the generator is ever pointed at a real DB with `--apply`, where is the pre-flight snapshot? Silent.

### Backup Instrument
- **Absent.** The merge slice drops three empty PascalCase tables in production as "Sean-gated follow-up". There is no mention of a verified backup/restore harness in the instrument set. This is architectural negligence for a premium SaaS: destructive DDL without a tested rollback path is unacceptable.

## 2. Residual Risks — Ranked by Severity

1. **Enumeration-Driven Boot (Systemic)**  
   Hardcoded `MISSING_COLUMNS` + `TABLE_CREATION_ORDER` with 107 registered models unlisted. This means the boot sequence is a hand-maintained lie. Any new model not added to the enum silently fails to create its table in fresh builds (as seen with `challenge_participants` historically) or creates it in the wrong order causing FK storms. Gating the systemic fix is defending tech debt as a feature.

2. **85 Orphan Tables (Newly Measurable but Unclassified)**  
   These are tables in prod with no registered model. They could be: dead feature leftovers, extension tables, or silently-used tables via raw queries. Until classified, they are unexploded ordnance. The fact they are "newly measurable" means prior audits were blind.

3. **34 Dormant Models (Import-Free Pending Quarantine)**  
   The social challenge trio is only the visible tip. 34 models unregistered or unused means the registry is bloated and association wiring may contain ghost references (e.g., `getModel('ChallengeTeams')` by string somewhere). Dormant ≠ safe.

## 3. What To Build Next — Ranked (Reordered from Provided List)

| Rank | Item | Why / Adversarial Rationale |
|------|------|-----------------------------|
| **1** | **Boot Drift Tripwire** | Must be built *before* any other change. A CI check that diffs the hardcoded enums against `models/index.mjs` registry and fails the build. Without this, the enumeration-driven boot will silently rot further. Currently the "systemic fix gated" is just kicking the can; a tripwire is the minimum guard. |
| **2** | **Baseline Migration (D→A′)** | The plan exists; execute it. It closes the 1 table-missing, 9 index-missing, and 7 sidecar unresolvable. This is the only path to reduce measured drift to zero. But do **not** run it until tripwire (rank 1) is live, or you'll migrate blind. |
| **3** | **Creation-Order Convergence Sweep** | Replace `TABLE_CREATION_ORDER` with topological sort from associations. This eliminates the hardcoded list fragility. Depends on tripwire to confirm no missing nodes. Lower than baseline because it's non-destructive cleanup. |
| **4** | **Orphan/Dormant Disposition** | After baseline, classify the 85 orphans and 34 dormants: drop (with backup!), adopt, or quarantine. This is housekeeping; risky if done before baseline because you might drop a table the baseline actually needs. |
| **5** | **Cross-Role QA Journeys** | Lowest architecture priority. Useful for UX coverage but does nothing for the structural time-bombs above. A nice-to-have once the schema is trustworthy. |

## 4. What We Are Still Blind To — Plainly

- **Backup integrity:** No evidence that prod has a tested point-in-time restore. The pending DROP of empty PascalCase tables could be the first destructive act in a blind system.
- **Orphan table provenance:** Are the 85 orphans including `pg_*`, extensions, or third-party schemas? If the auditor counts them naively, the number is noise.
- **Dormant model runtime refs:** The test greps for `getModel('ChallengeTeams')` but string-based model lookup via `db.models[name]` could still exist in dynamic code paths (e.g., generic controllers). Not scanned.
- **Data-type drift:** Auditor covers index-column-mismatch, but not column type widening (e.g., `int4` vs `int8` FKs). The SWA-159 fix removed a dangling FK but we never verified that `teamId` uuid in prod isn't actually `text` under the hood.
- **QA container realism:** It builds 198 tables from models, but does it seed any row? No. So the "positive-identity guard" only checks table names, not that `challenges` has 18 rows like prod. The QA is a skeleton, not a mirror.
- **Auditor production readiness:** It is "rehearsable against QA" — meaning it has never been run against prod in this iteration. The 7 unresolvable sidecars are hand-written; if those sidecars are wrong, prod drift is masked.

**Closing:** The merge slice is surgically clean on the surface, but the architecture still rests on a hand-edited boot enum and an unbacked drop queue. Ship the tripwire today, or the next retirement will take down a live table.
