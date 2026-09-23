# FIX WORK ORDER — SUCCESSOR

**Supersedes §5 ("FIX-AGENT WORK ORDER") of
`docs/ai-workflow/reviews/ULTRA-HOSTILE-REVIEW-30-ROUND-2026-09-18.md`.**

**Published:** 2026-09-20 · **Authority:** Rule 86 (preserve historical review text, publish a
successor, make the current entry point resolve to it). §5 is preserved unedited in the ledger; it is
**no longer the instruction list to execute.**

**Why this exists.** Astra's hostile review (§23, finding F2) checked every item in §5 against the
sections that later corrected it. Thirteen items are contradicted, deferred, or re-scoped, and
nothing reconciled §5. A work order that still instructs a wrong fix is worse than no work order,
because it is the document a fix agent follows and it carries the authority of the summary section.
§12.3 states the rule this file exists to honour: *a wrong migration is worse than none.*

---

## 0. Read this before executing anything below

Three items in §5 will actively cause harm if followed. They are listed first.

| §5 said | Do this instead |
|---|---|
| **H-01** — "Guard or create `orientations`; make the chain bootstrappable from empty" (`L:652`) | **Do not apply a guard.** One already exists at `backend/migrations/20240115000000-update-orientation-model.cjs:25` and does not address the schema-generation mismatch (§12.3): `20250212060728-create-user-table.cjs:337` creates lowercase `users.id` as **UUID**, while `models/User.mjs:25-27` declares auto-increment **INTEGER**. The chain would build a *different database generation*. The squashed-baseline decision stays open and is Sean's. |
| **H-03** — "Set `SWAN_MIGRATE_STRICT=1` in `render-start.mjs`" (`L:649`) | **Do not set it.** `backend/scripts/render-start.mjs:44-54` documents that doing so **is a regression**: STRICT disables the already-exists reclassification entirely, and production's populated tables legitimately produce those on idempotent re-runs. The default path already fails the run non-zero and leaves the migration PENDING. |
| **H-07 / M-02** — "`sync({ alter: true })` at boot competes with migrations" (`L:655`) | **Name the real path.** `startup.mjs:201-202` gates `sync({ alter: true })` on `!isProduction && AUTO_SYNC === 'true'` — **it never runs in production**. Production runs `startup.mjs:207-214` → `syncDatabaseSafely()` → `productionDatabaseSync.mjs:41-53 createMissingTables()` → `createTablesInOrder(models)`, plus `sync({ alter: { drop: false } })` at `:265-283`. The defect is *dual schema authority*, not a destructive alter. |

---

## 1. The reconciliation — every §5 item against its later correction

Verified 2026-09-20. "Verified" means the line was read in this tree, not inherited from the ledger.

| Item | §5 instruction | Later correction / current evidence | Status |
|---|---|---|---|
| H-01 | Guard/create `orientations` (`L:652`) | §12.3: squashed baseline required; guard already exists at `:25`; UUID↔INTEGER mismatch | **OPEN — owner decision** |
| H-02 | "Covered by H-01's guard" (`L:182`) | Falsified by `migrationGuardTableNames.test.mjs` — the H-02 class has **eight** members; fixing H-01 alone moves the wall | **REFUTED, superseded by the guard** |
| H-03 | Enable production STRICT (`L:649`) | Rejected by `render-start.mjs:44-54`; default path already fails the run. **"Fails the run" is not "classifies the outcome correctly", and that was conflated here.** `ALREADY_APPLIED_PATTERNS[0]` (`/already exists/i`, `safe-migrate.mjs:91-98`) still records a migration complete from error *text* — and subsumes patterns 1–5, which were measured to add zero matches. `SWAN_MIGRATE_ALLOW_FAILURE=1` (`:373-374`) still marks failures applied while `:64` and `:422` state the opposite. Settled: *do not set STRICT*. Not settled: completion classification. | **PARTIAL — STRICT decision settled; completion classification remains defective** |
| H-04 | Recurse and include `.mjs` (`L:653`) | `safe-migrate.mjs:219-243 discoverMigrationFiles()` recurses, and `isExecutableByCli` (`:211-217`) models the CLI's non-recursiveness. **But three extension sets disagree inside one file:** the CLI resolver quoted at `:195` is `\.(cjs\|js\|cts\|ts)$`, discovery collects `cjs\|js\|mjs\|sql` (`:228`), classification is `cjs\|js` (`:211`) — so `.cts`/`.ts` are CLI-resolvable but invisible to the runner, and `.mjs`/`.sql` are discovered but not CLI-loadable. Reporting an inert set is also not implementing its schema effects; the inert files remain un-reconciled. | **VISIBILITY-ONLY — the inert set is reported, not reconciled; extension sets unreconciled** |
| H-06 | Require `SWAN_ALLOW_REMOTE_DB=1` (`L:648`) | Implemented flag is `SWAN_DEV_ALLOW_PRODUCTION_DATABASE_URL=1` with hosted-provider detection (`L:1335-1339`) | **FIXED under a different name — document the real flag** |
| H-07 | Strict replay + applied-migration/table assertion (`L:654`) | Repair is owner-controlled; **no** generic applied-migration→table-exists assertion was found. See §23.1 — the claim is split three ways. **Production state is UNKNOWN, not merely unrefreshed:** whether production has `"Users"`, `users`, or both, and whether `users.id` is `uuid` or `integer`, is not determinable from the tree — and the tree's own `helpers/resolveUsersTable.cjs` resolves that ambiguity at migration runtime in **10** files, which is the honest admission of exactly that. A read-only catalog observation is required and has not been authorised. | **OPEN — production state UNKNOWN; needs a fresh observation, not a replay** |
| M-01 | Stop using `--to` as a per-migration selector (`L:656`) | Runner keeps `--to` but stops after the first genuine failure and documents the semantics (`safe-migrate.mjs:379-400`) | **FIXED (bounded) — do not replace with a single-migration API** |
| M-02 | Remove production `sync({ alter: true })` (`L:655`) | Misattributed — see §0. Real production sync is `productionDatabaseSync.mjs:270` | **RE-SCOPED** |
| M-03 / M-04 / H-05 | Consolidate `.env`; de-duplicate migration prefixes (`L:658`) | Not re-verified this pass | **UNCHANGED — verify before acting** |
| M-08 | Repair contract escaping (`L:664`) | `TrainerOnboarding.renderContract` judged escape-first and left untouched (`L:1367`) | **CLOSED as inspected / no repair required** |
| M-10 | Port guard; extend FK/table checks (`L:657`) | Guard exists (`migrationGuardTableNames.test.mjs`) but is a **source ratchet with a 23-entry exact-match debt register** — it proves source shape, not database state | **PARTIAL — separate static coverage from absent DB proof** |
| M-13 | Delete `_unused/`, `old/_backup/`, `*.tmp.py` (`L:673`) | Not re-verified this pass | **UNCHANGED — verify before acting** |
| H-08 | Remove fallback, fail fast (`L:661`) | Later fix preserves generated *development* secrets; production failure already existed (`L:1368`) | **FIXED (environment-specific) — state the scope** |
| H-09 | No fallback / no JWT reuse (`L:662`) | Narrower verified behaviour: production rejects the public salt; development keeps determinism (`L:1369`) | **PARTIALLY VERIFIED — do not auto-close the original prescription** |
| H-10 / M-14 | Sanitise render+write; delete V2/V3 (`L:663`) | Fix sanitises all three renderers and **preserves** them (`L:1367`, `:1470`) | **SPLIT: rendering fixed; write-path and cleanup separately authorised** |
| H-13 | Resolve 119 deletions (`L:670`) | §13 repudiates that inventory and reports different counts (`L:1615-1617`) | **REFUTED — use timestamped `git status` with an explicit mode** |
| O-02 | "NOT FIXED — your call" (`L:1852`) | **Stale**: the gate exists in committed `backend/utils/startupMigrations.mjs:59-60`, `:841-848` (commit `6065985dd`) | **FIXED IN CODE — deployment enablement unknown** |

Items not listed above were not individually reconciled. **A later suite total does not close them.**

---

## 2. What replaces the "verify with a suite total" instruction

§5's implicit acceptance test was a full-suite pass count. That test is not available: **no recorded
full-suite run in the ledger is green** (§23.1, F3 — every figure is red; best recorded 9 failed /
839 passed). Two consequences for whoever executes this order:

1. **"Nothing broke" is not a claim you may make from a suite total.** A frozen *red* baseline with
   stable case identities can support a bounded claim — that your change added no *additional*
   observed failures. Record the failing set before and after, by name.
2. **Per-change evidence, not aggregate evidence.** Every fix in this order must carry: the file and
   line changed, the command that shows the fix present, and a mutation or A/B showing the guard goes
   **red for the right reason**. A green test that has never been shown red is not evidence.

---

## 3. Known stale citations — do not trust these line numbers

Line-number citations rot silently. These were verified stale on 2026-09-20 and corrected where the
file was in scope:

| Citation | Reality |
|---|---|
| `safe-migrate.mjs:415` → `render-start.mjs:87-90` | 87-90 is the expanded-exercises seeder; the non-fatal migration catch is at **95-100**. **Corrected**, and the test now verifies the cited range contains the catch. |
| `migrationGuardTableNames.test.mjs:102` → `startup.mjs:202` as the production mechanism | `:202` is development-only. **Corrected** to `startup.mjs:207-214` → `productionDatabaseSync.mjs:41-53`. |
| `chartDataControllerSchemaDrift.test.mjs:15` → `chartDataController.mjs:22-33` for `safeQuery` | `safeQuery` is at **:66**. **Corrected**; the symbol name is the stable handle. |
| `migrationDiscovery.test.mjs:16` | Flagged by Astra as a comment citation that is not an executable check. **Not corrected — verify on contact.** |
| Ledger H-04 → `safe-migrate.mjs:141-146` for the discovery code | Those lines are now the `--to` spawn block; discovery moved to **:211-243**. The ledger text is preserved per Rule 86. |

**Rule for this order:** when you cite a line, read it. Three of the five above named the wrong
mechanism, and each would have led a fix agent to change the wrong thing.

---

## 4. Standing constraints

- **No commits, no `git add`, no push.** 1,217 dirty files on a non-main branch (Rule 46/67).
- **No production writes and no production DB connection.** H-07's production observation is
  `[UNKNOWN]` from this tree and must come from a separately authorised, timestamped read.
- **No OpenRouter spend.** Astra is reached on the subscription seat
  (`scripts/consult-astra-subscription.mjs`), which is $0 marginal.
- **Do not widen migration execution** by changing only the outer runner's filter (H-04's later
  correction). Inventory the inert set first.
- **Do not guard the 23 unguarded ALTERs blind.** That hides the schema-authority decision (M-02)
  rather than answering it.

---

## 5. Provenance

- Review that produced this order: `tmp/astra-consult-ledger-falsification/reply.md` (Mega Blueprint,
  PART A finding F2), adjudicated in the ledger at **§23.1**.
- This pass's independent verification of the three §0 items: ledger **§23.3**.
- Fixes already applied under this order: ledger **§23.4** (X1–X5).
