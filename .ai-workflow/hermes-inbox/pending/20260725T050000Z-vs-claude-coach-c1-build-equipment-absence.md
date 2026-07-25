# Swan Coach C1 build — equipment subject fixed, absence made explicit

**Surface:** vs-claude (Opus 5, VS Code terminal) · **Date:** 2026-07-25 UTC
**Linear:** SWA-63 · **Commit:** `41622bce7` on `claude/coach-hive-mind-20260724` — not pushed, not merged
**Prior:** C0 locate · C0.5 wrong-client write · C1 trace

---

## What shipped

**1. Equipment enrichment was structurally dead for clients.** Coach's data source #2 filtered `equipment_profiles."trainerId" = :userId` where `:userId` is the **client**, but `trainerId` is the *owning trainer*. Clients own no profiles → zero rows, always. Coach recommended exercises without knowing what equipment existed, silently. Now resolves the client's **active trainer assignments**, keeping self-owned profiles so a trainer asking about themselves is unchanged.

**2. Absence was silent.** Every enrichment block is `if (rows.length > 0) push(...)`, so an empty source emitted nothing and Coach could not distinguish *"screened, no compensations found"* from *"never screened."* New `services/ai/intakeCoverage.mjs` names what is and isn't on file and forbids inferring a normal finding from an absent section.

## The transferable lessons

**A silent empty is worse than a loud error.** Both defects shared one shape: the code was syntactically fine, threw nothing, logged nothing, and quietly degraded the quality of Coach's advice. Neither would ever have appeared in an error budget. When auditing an enrichment or context layer, the question is not "does it run" but **"what does it look like when it finds nothing, and can the consumer tell?"**

**The anomaly is the evidence.** What identified the equipment defect was not reading the query — it was noticing that **20 of 21 enrichment sources key on `"userId"` and exactly one keys on `"trainerId"`.** A single inconsistency in an otherwise uniform set is a stronger defect signal than any individual line looks. Sweep for uniformity, then investigate the outlier.

**Guard against the opposite failure too.** My first draft of the absence block warned Coach against inferring "no injuries" *even when pain records were on file* — which invites false hedging about data it actually has. Fixing false confidence can manufacture false uncertainty. Scope every warning strictly to what is actually missing.

**Extract to make testable.** The coverage logic went into its own 86-line pure module rather than inline, because the host file is 2267 lines and cannot be exercised in isolation. That extraction is what allowed real executed proof instead of a deferral.

## Verification note worth carrying

`backend/node_modules` is empty in every local tree, so backend vitest can't run. Workaround that worked well and is reusable: **install a minimal `vitest` shim** (describe/it/expect) into `backend/node_modules/vitest` — gitignored — so the **real committed test files execute in place** with correct relative imports. This ran the new test 9/9 AND a pre-existing test 6/6 over the exact source I modified, proving no regression. Tests that import the service transitively still fail on `winston`; those stay honestly unrun. Copying test files to a scratch dir does NOT work — relative imports break.

## Flagged, not fixed

`backend/routes/clientOnboardRoutes.mjs:251` INSERTs `(client_id, trainer_id, ...)` snake_case into `client_trainer_assignments`, whose columns are camelCase (model declares no `underscored`; every other raw-SQL site uses `"clientId"`). Would throw on execution. `[LIKELY]` — not run against the DB. Onboarding write path, deserves its own slice.

`AI_CHAT_CLIENT_ACCESS_SOFT` reviewed: fail-closed by default, absent from committed config, test-asserted. **Sean owes one check:** confirm it is unset in Render env.

## Still deferred

Unifying the three context layers (`enrichWithUserData` / `buildUnifiedContext` / `coachContextEngine`) remains the real C1→C2 bridge and a slice of its own. File splits on the 2267/1226/1144-line hot-path files are deliberately NOT done while no test suite runs locally — that is how a silent regression ships.

**Provenance:** Opus 5 (sub-Fable). Working memo only — not eligible for the durable Fable-tier learning corpus (Rule 68).
