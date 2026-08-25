# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-swa200-final-2026-08-24/PACKET-R4.md
**Seed:** (none)
**Tokens:** 14885 in / 6879 out | **Cost:** ~$0.1478 | **Wall:** 57.0s | **finish_reason:** stop

---

## Round 4 — Ox Alpha seat

I attacked the four named surfaces and found new material. Not a dry round.

---

### F1 — HIGH: the extractor's fail-closed only fires when it extracts *nothing*; partial extraction renders as "determined" and goes green

`tablesFromSource` returns `null` **only when `out` is empty** (file 3, line 92). Any single resolvable hit — including a decoy — flips the result to a confident `string[]`, and the audit then checks only *that array* against the skipped list.

Concrete vacuous-green path: schema-qualified raw SQL.

```sql
ALTER TABLE "public"."workout_logs" ADD COLUMN ... NOT NULL;
ALTER TABLE public.workout_logs ...
```

The regexes at file 3 lines 57–63 capture `([A-Za-z0-9_]+)` immediately after `ALTER TABLE "?"` — they capture **`public`**, never `workout_logs`. If the same file also contains, say, one `createTable('audit_log', ...)` (a seeded table), the extractor returns `['audit_log', 'public']`, the skipped-table FATAL finds no hit, prints `OK: no added migration targets a skipped table`, and the job goes **green while the added migration ran against an empty `workout_logs`** — the exact defect class the round-3 FATAL was built to close, reproduced inside the round-3 extractor, one round after the same thing happened to the round-3 extractor's predecessor. The 12/12 selftest does not cover schema-qualified or dotted table references. Same hole exists for `CREATE INDEX ... ON "schema"."table"` (line 63) and for object-form calls (`addColumn({tableName: 'x', schema: 'public'}, ...)`) when any other decoy hit exists in the file.

**Evidence:** file 3 lines 45–52 (unresolvable identifiers silently dropped), 57–63 (no dotted/schema handling), 92 (null only on empty set); file 2 lines 163–169 (only extracted names compared).

### F2 — HIGH: the round-3 fix re-opened a vacuous green for the M/D/R classes — "visibility is not enforcement," round 2's own words

Round 3 cured the false red on modify-only PRs by making modified/deleted/renamed-old migrations **green with a stdout note** (file 2 lines 150–158). The script's own header calls a hand-edit to an already-applied migration "the single riskiest artifact in a migration diff." Under a required status check, that PR now merges on a **green check that executed zero migrations**, with the disclosure printed where no machine reads it — precisely the ruling GLM made in round 2 when the skipped-table list was merely printed ("visibility is not enforcement"). The round-3 fix enforced that principle for added migrations and simultaneously exempted the riskier class from it. The false red was real; the cure reintroduced the disease for the other half of the diff. A modify-to-applied-migration PR should, at minimum, not produce a *success* status on the required gate.

**Evidence:** file 2 lines 16–20 (their own risk statement), 150–158 (note-only, `fatal` untouched); workflow line 466 (summary disclosure only).

### F3 — MEDIUM: the `// shadow-tables:` escape hatch is unverified author say-so

Declared tables are unioned into `out` (file 3 lines 87–90) with no cross-check that the declaration is complete or that declared tables are actually seeded. An author whose runtime-computed migration FATALs can declare only seeded tables (`// shadow-tables: users`), converting fail-closed UNKNOWN into `OK` while the real target — a skipped table — is never named. Greppable, yes; verified, no. Minimum: declared tables should be checked against the skipped list *and* the declaration should require that every declared table was populated (ties into F4).

### F4 — MEDIUM: the entire coverage FATAL is self-reported on both ends

The FATAL chain is: seeder's own `skipped` array (self-report) × extractor's static read (self-report). Nothing queries the database. A seeder bug that omits a table from `skipped` disables the FATAL silently and permanently. One independent assertion — for each table an added migration touches, `SELECT count(*) > 0` from the shadow DB after seeding — collapses F1, F3, and this whole class, and is cheaper than the extractor itself.

### F5 — LOW: push `paths:` filter omits `backend/package-lock.json`

`npm install` resolves from the lockfile; a lock-only push to main (sequelize/pg bump) changes migration behavior and runs no check. `package.json` is listed (line 87); the lockfile is not. Advisory on push, but the filter's comment claims the behavioral set is covered.

### F6 — LOW: the `(none)` sentinel is a live skipped-table named "(none)"

File 1 line 308 emits the literal string `(none)` when skipped is empty; file 2 line 129–133 splits, filters Boolean, and keeps it — so `skipped.length` is **always ≥ 1** and the `skipped.length > 0` gate at line 160 is structurally always-true. Today that fails safe by accident (the UNKNOWN fail-closed path stays armed); the OK line also lies (`1 skipped`). If the seeder's report shape drifts, the arming condition changes invisibly.

### Still-open, confirmed by re-read (not re-litigated)

R3-F5 (`.ts`/`.cts` latent false red in `BASE_COUNT`), R3-F6 (leg A runs BASE migrations under HEAD `.sequelizerc`/config), R3-F7 (PR edits the workflow, self-green run satisfies the check — disclosed at line 467 but unmitigated).

### Hard constraint

Every ruling above is paper verification on a workflow that has never executed (all runs `startup_failure`, billing). F1 and F2 are static-certainty defects; the rest would need one real run to confirm behavior.

---

```
status: REJECT
confidence: 78
findings:
  F1=HIGH: backend/scripts/shadow-table-extract.mjs:57-63,92 — schema-qualified/dotted raw SQL
    captures the schema as the table; any decoy hit makes partial extraction render as
    "determined", so the skipped-table FATAL never fires and leg B goes green against an
    empty table. The vacuous-green defect, third generation.
  F2=HIGH: backend/scripts/shadow-delta-audit.mjs:150-158 — round-3 fix makes
    modified/deleted/renamed migrations green-with-a-note under a required check;
    "visibility is not enforcement" reintroduced for the class their own doc calls the
    riskiest artifact in the diff.
  F3=MEDIUM: shadow-table-extract.mjs:87-90 — // shadow-tables: declaration is trusted
    blindly; declaring only seeded tables converts fail-closed UNKNOWN into OK.
  F4=MEDIUM: workflow:308-312 + shadow-delta-audit.mjs:160-201 — coverage FATAL trusts the
    seeder's self-reported skipped list; no DB-side row-count cross-check exists.
  F5=LOW: migration-shadow-check.yml:74-89 — push paths filter omits backend/package-lock.json.
  F6=LOW: workflow:308 / shadow-delta-audit.mjs:129-133 — "(none)" sentinel becomes a literal
    skipped table; the skipped.length>0 gate is always-true by accident.
evidence: cited per finding; F1 reproduced by inspection against the regexes (no schema-aware
  alternative branch exists); F2 is a direct read of the verify-mode control flow (fatal is
  never set for M/D/R); F3/F4 follow from the absence of any verification call in either file.
ruling: Three rounds each found one green-while-testing-nothing path and each fix grew another;
  round 4 is no exception — F1 is the same defect shape now living in the round-3 extractor,
  and F2 is the round-3 fix trading a false red for a disclosed-but-green vacuous pass on the
  highest-risk diff class. The gate's architecture (baseline-then-delta, STRICT, fail-closed
  UNKNOWN) is sound; the enforcement edges are not. Do not make this a required check until
  F1 and F2 are closed and one real run has executed. Fix direction for the whole F1/F3/F4
  family: replace string-matching coverage with a post-seed, per-target-table row-count
  assertion against the shadow database itself.
```
