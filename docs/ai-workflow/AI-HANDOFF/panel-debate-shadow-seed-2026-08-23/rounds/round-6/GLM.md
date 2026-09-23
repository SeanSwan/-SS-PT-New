# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/rounds/round-6/REVIEW-DOC.md
**Tokens:** 18467 in / 13364 out (reasoning: 10742) | total 31831
**Wall:** 161.7s

---

**GLM 5.3 — round 6, full-spectrum pass: 8 acceptance criteria line by line, then the consensus items re-verified, then one new MAJOR the panel has missed for five rounds.**

---

## A. The 8 acceptance criteria, line by line

**AC1 — exit 1 on unset/non-localhost/no-"shadow" URL: PASS.** `validateShadowUrl()` runs as main()'s step 1 before the models import; `process.exit(1)` on every refusal path. Selftest section 1 exercises all 8 branches. No override path exists in the file. Clean.

**AC2 — "The test suite passes and covers every case in 5.2": UNPROVEN *and* UNENFORCED → new MAJOR F9.** Builder header: "vitest run blocked on a missing @rollup Linux native binary — the self-test covers the same contracts." Two problems: (a) that claim is false as stated — the selftest covers the *pure core*; it cannot prove `seed-shadow-db.test.mjs` parses, imports, or passes (different file, different runner); (b) I walked every step of the workflow: Checkout → Setup Node → npm ci → Export URL → Pre-migrate guard → Migrate → Seed → Assert → Migrate → Import → Upload. **There is no test step.** Deliverable 2 executes *nowhere* — not locally (blocked), not in CI (absent). A syntax error in the vitest file ships invisible. The ubuntu runner will fetch `@rollup/rollup-linux-x64-gnu` fine via `npm ci`; the local blockage is machine-specific. One step fixes it.

**AC3 — twice-run, no crash, no duplicate PKs: FAILS on composite-PK tables → F3.** `const pkCol = Object.keys(attrs).find((c) => attrs[c].pk)` takes only the *first* PK column; `updateOnDuplicate: [pkCol]` becomes `ON CONFLICT (first_col)` on Postgres, which errors on a composite-PK table ("no unique constraint matching"), the catch falls back to plain `bulkCreate`, and run 2 hits duplicate-PK violations → `failed[]` → exit 1. And the packet's own test fixture (`fakeAttrs`: `id` UUID pk **plus** `legacyIntId` INTEGER pk) ships a composite-PK table, so the pattern is presumed present in the 217. Same defect propagates: `insertedIds` stores only `v[pkCol]` while child FKs may reference the second PK column (normalizeModel resolves target pk the same first-match way), and in the backfill block `const tPk = Object.keys(tAttrs).find(...)` is **computed and never used** — `insertedIds.get(bf.targetLower)?.[0]` reads the first tuple element regardless of which column the FK points at.

**AC4 — YAML parses: PASSES, and that is the trap.** `POSTGRES_PASSWORD: "***"` is quoted, so `yaml.safe_load` succeeds (builder: "YAML `***` alias bug caught and quoted" — both sides citable). But the parsed *value* is the literal string `***`, while the comment six lines above says "The user/password/database are all the literal word `shadow`" and §4 ground truth says the same. Container password `***`, every client (DATABASE_URL, migrate runs) authenticating as `shadow` → run-1 migrate fails auth → **the packet's only E2E gate has never run green.** This is §9's "gate that reports green while inspecting the wrong surface" at the workflow level. → F1, already in consensus item (4).

**AC5 — seed between the two migrate runs: PASS.** Step order is migrate → seed → assert → migrate → import, exactly §5.3.

**AC6 — no @, names, phones: PASS.** All strings are `seed-<table>[-<col>]-<n>`; integers are numbers, not digit-strings; `looksLikeEmail` throws before any value escapes the generator. Both suites test it.

**AC7 — `grep -rn "REFERENCES users"`: PASS.** The seeder emits no DDL; `countRows` quotes identifiers (`"${table}"`), preserving `"Users"` case per the §4 trap. Zero matches.

**AC8 — scan-secrets CLEAN: UNCLAIMED.** The builder's local-verification list omits it entirely. Nothing in the files should trip a scanner, but the criterion is unevidenced — NOTE, run before merge, no code fix.

---

## B. Consensus candidate — re-verified, adopted in full

Items (1)–(7) all check out against the packet:

- **(1)** The section-3 deps loop reads only `Object.values(m.associations || {})`; `normalizeModel`'s `else if (a.references.model)` branch resolves attribute-level FKs that this loop never sees → misordering → NOT NULL FK inserts fail (red gate) or nullable FKs go NULL and get force-backfilled to parent row 0. Fix as specified; note `tableNameToModel` must move **above** the deps loop (it is currently constructed after `topoSort` is called).
- **(2)+(3)** Verified in AC3 above — conflict-target, `insertedIds` extraction, and backfill lookup must all go composite-aware; the fix also deletes the dead `tPk` by *using* it.
- **(4)** Verified in AC4.
- **(5)** Current grep `'^SHADOW-SEED '` also matches `SHADOW-SEED OK <table>` and `SHADOW-SEED cycle-backfill` stdout lines that land in `seed-shadow.log`; `tail -1` saves it today only by print ordering. Anchor `'^SHADOW-SEED {'` removes the ordering dependency. Cheap hardening, agree.
- **(6)** `retry: 1` in vitest.config.mjs re-runs the *safety-gate* tests on failure — masking flakiness in the exact contract this packet exists to enforce. Delete.
- **(7)** Backfill pushes one entry per row (`row: i`) but the executor runs `model.update(..., {where: {[bf.col]: null}})` over all rows each time → `rowsPerTable` redundant UPDATEs and an inflated "cycle-backfill rows=N of M" line. Dedupe per (table, col).

**I REJECT nothing.** I add F9.

---

## C. New finding (the reason this round is a DISPUTE, not silent adoption)

**F9 = MAJOR:** `.github/workflows/migration-shadow-check.yml` — no step between "Install backend dependencies" and "Pre-migrate guard" (or after the Assert step) runs `seed-shadow-db.test.mjs`. Combined with the builder's "vitest run blocked locally," Deliverable 2 has zero execution paths anywhere in the packet, while AC2 asserts it passes. Contradiction of a testable builder assertion ("the self-test covers the same contracts" — it covers the pure core, not the vitest file) and of the deliverable list (§10 item 2). **Fix:** insert after `npm ci`:

```yaml
      - name: Run seeder test suite (DB-free)
        working-directory: backend
        run: npx vitest run scripts/seed-shadow-db.test.mjs
```

Residual: `setupFiles: ['./tests/setup.mjs']` content is not in the packet — if it needs a DB, override it (`vitest run --config` variant or make setup DB-free); flag for round 7.

---

=== VERDICT ===
status: DISPUTE
confidence: 92
findings: F1=MAJOR: .github/workflows/migration-shadow-check.yml services.env POSTGRES_PASSWORD "***": literal-asterisk password vs comment/§4 "all named shadow" — migrate run 1 fails auth, the only E2E gate has never run green; builder header "alias bug caught and quoted" documents it | F2=MAJOR: seed-shadow-db.mjs section-3 deps loop (Object.values(m.associations)): ignores attribute-level foreignKeyTarget from normalizeModel → misordering for association-less FKs → NOT NULL FK inserts fail or nullable FKs all backfilled to parent row 0 | F3=MAJOR: seed-shadow-db.mjs `const pkCol = Object.keys(attrs).find(...)` + updateOnDuplicate:[pkCol] + insertedIds v[pkCol] + backfill `?.[0]` with dead `tPk`: composite-PK tables break AC3 (ON CONFLICT target error → fallback dup-PK crash on run 2) and FK children referencing the 2nd PK column get wrong values; test fixture itself ships id+legacyIntId | F4=MINOR: seed-shadow-db.mjs backfill block pushes per-row entries but update() matches all rows → redundant UPDATEs + inflated cycle-backfill count; dedupe per (table,col) | F5=MINOR: backend/vitest.config.mjs L35 `retry: 1` masks first-failure in safety-gate tests; delete | F6=MINOR: workflow Assert step grep '^SHADOW-SEED ' also matches 'SHADOW-SEED OK'/'cycle-backfill' stdout lines in seed-shadow.log, saved only by tail-ordering; anchor to '^SHADOW-SEED {' | F9=MAJOR: .github/workflows/migration-shadow-check.yml has NO step running seed-shadow-db.test.mjs anywhere (steps: checkout→setup-node→npm ci→export URL→guard→migrate→seed→assert→migrate→import→upload); with vitest blocked locally, Deliverable 2 executes nowhere and AC2 is unenforceable; contradicts builder claim "the self-test covers the same contracts"
rebuttals: F1=AGREE | F2=AGREE | F3=AGREE | F4=AGREE | F5=AGREE | F6=AGREE | F9=NEW (this seat, round 6)
open: Q1=does tests/setup.mjs (vitest setupFiles) require a DB — determines whether the new CI test step needs a config override | Q2=confirm composite-PK tables exist among the 217 models (fix is mandatory either way; first green run settles it) | Q3=who runs scripts/scan-secrets.sh over the three new files before merge — AC8 is claimed nowhere in the packet
consensus_block: ADOPT round-5 FIX ALL (1)-(7) verbatim: (1) deps loop also adds attribute-level foreignKeyTarget parents via tableNameToModel — and MOVE the tableNameToModel construction above the deps loop; (2) composite-aware pkCols = Object.keys(attrs).filter(c=>attrs[c].pk) for updateOnDuplicate, insertedIds extraction, and backfill (use the currently-dead tPk); (3) insertedIds stores full PK tuples, backfill indexes the FK's target column; (4) workflow services.env POSTGRES_PASSWORD: "shadow"; (5) Assert grep anchored '^SHADOW-SEED {'; (6) delete vitest.config.mjs retry:1; (7) dedupe backfill per (table,col). NEW (8): add a CI step after npm ci — `npx vitest run scripts/seed-shadow-db.test.mjs` (working-directory: backend) — so Deliverable 2 executes at least once per push; ubuntu-latest resolves the @rollup Linux binary that blocked the local run. ALL fixes require one real green CI run as proof; no successful run exists yet (F1). ACCEPTED INTENTIONAL: PII guard, deterministic generation, synthetic-over-snapshot (§3), F5/F6-deferred items with stated reasons. RESIDUAL RISK: dependency-graph extension may miss implicit FKs expressed neither as associations nor attribute references — manual review of the 217 models advised; composite-PK paths unverifiable until first green run; tests/setup.mjs contents unknown (Q1); AC8 scan-secrets CLEAN unclaimed — run it over all three new files pre-merge.
=== END-VERDICT ===
