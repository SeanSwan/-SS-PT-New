# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/rounds/round-15/REVIEW-DOC.md
**Tokens:** 18905 in / 18097 out (reasoning: 15359) | total 37002
**Wall:** 235.6s

---

# ROUND 15 — GLM 5.3 (full-spectrum: correctness, security, schema truth, 8 ACs line-by-line)

## A. Consensus candidate — adoption status

I adopt FIX items (1), (1a), (2), (3), (4), (5), (6), (7), (8), (9), (10) **verbatim**. Spot-verification of each against the packet:

- **(1)/(1a)** — confirmed at `seed-shadow-db.mjs` §3: the deps walk `for (const a of Object.values(m.associations || {}))` adds *every* association target as a "parent". A mutual `User.hasMany(Post)` + `Post.belongsTo(User)` pair (the standard pattern in an associations file) yields deps `User→{Post}, Post→{User}` — a **false cycle**; a NOT NULL FK on Post then hits the `allBlocked` skip path and Post is silently dropped. Deleting the walk and deriving deps from `foreignKeyTarget` attrs is the correct repair; self-edges survive via attribute `references` (topoSort explicitly retains them). Implementation note: `tableNameToModel` is currently built *after* deps — under (1) it must be built *before*, since deps become table-keyed.
- **(1a)** — confirmed: `Object.values(assocs).find((x) => x.foreignKey === col)` matches HasMany associations too (their `foreignKey` names a column on the *other* table); requiring `associationType === 'BelongsTo' && foreignKey === col` fixes target resolution.
- **(2)** — confirmed: `const pkCol = Object.keys(attrs).find((c) => attrs[c].pk)` takes only the first PK; Postgres `ON CONFLICT (pk1)` against a composite PK errors, the catch falls back to a plain insert, and AC-3 (double-run, no dup PKs) breaks for every composite-PK table.
- **(3)** — confirmed: FK fill `out[col] = parents[rowIndex % parents.length]` uses the parent's *own first PK value*, not `foreignKeyTarget.pk`; wrong for any non-`id` target key. Also §4b `const tPk = Object.keys(tAttrs).find(...)` is computed and never used — dead code, delete. One refinement: under row-map storage the backfill-push guard must treat an **empty** row-map list as "parent absent" (currently `!insertedIds.has(tLower)` is falsy for pk-less parents that set an empty array — the running-state §4 finding).
- **(4)** — confirmed: workflow `services.shadow-postgres.env.POSTGRES_PASSWORD: "***"` vs a `DATABASE_URL` carrying `shadow` as password; `pg_isready` doesn't authenticate, so the service goes healthy and the *migrate* step dies on password auth. Align both to `shadow`.
- **(5)** — confirmed: `grep '^SHADOW-SEED '` also matches `SHADOW-SEED REFUSED/FAILED/SKIP/OK/note/CRASH` lines; `tail -1` is print-order luck. `'^SHADOW-SEED {'` is the correct anchor (only `serializeReport` emits the JSON).
- **(9)** — confirmed: the workflow has no step executing any test; the selftest is dependency-free (`import * as m from './seed-shadow-db.mjs'` plus node builtins only) so `node scripts/seed-shadow-db.selftest.mjs` after `npm ci` (working-directory `backend`) enforces the §5.2 contracts in CI.
- **(10)** — confirmed: `node scripts/seed-shadow-db.mjs --rows 5 > seed-shadow.log` drops the `console.error` REFUSED/FAIL/SKIP diagnostics from the uploaded artifact. `> seed-shadow.log 2>&1` — note (5) is then *mandatory*, since `SHADOW-SEED REFUSED…` would otherwise become a grep hit.
- **(6)(7)(8)** — verified no objection: `retry: 1` stays; backfill pushes once per row for a column-wide UPDATE (dedupe on `(table,col)` correct); selftest 32-check claim consistent with the file's `ok(...)` count.

## B. NEW MAJOR — the consensus misses a schema-truth defect: enum values are read from the wrong location

**Evidence chain, all in the packet:**

1. `seed-shadow-db.mjs` `normalizeModel()`: `enum: Array.isArray(a.values) ? a.values : undefined` — in Sequelize v6, enum values for the standard definition form `DataTypes.ENUM('a','b')` live at **`a.type.values`**; the attribute-level `a.values` key exists only in the legacy `{ type: DataTypes.ENUM, values: [...] }` style. For the standard form, `entry.enum === undefined`.
2. `generateRowValues()` ENUM branch: `out[col] = Array.isArray(a.enum) && a.enum.length > 0 ? a.enum[0] : null` — the type string `ENUM('a','b',…)` matches the branch trigger, `a.enum` is undefined, so **every enum column gets NULL**.
3. Consequence: any NOT NULL enum column (status columns — near-certain among 217 models) fails its `bulkCreate` → `failed[]` → `dbRows===0 || failed.length>0` → `process.exitCode = 1` → **the CI seed step is permanently red**; if all enums are nullable, rows insert with silently all-NULL enums, violating brief §5.1-4: "ENUM → the first value in the enum's allowed list".
4. Why no test caught it — the §9 "green while inspecting the wrong surface" trap, in the deliverables themselves: `seed-shadow-db.test.mjs` `fakeAttrs.status` carries `enum: ['draft','active','archived']` **in the already-normalized shape**, and `seed-shadow-db.selftest.mjs` does the same (`status: { type: 'ENUM', …, enum: ['active','paused'] }` then asserts `a0.status === 'active'`). Neither suite ever passes a model through `normalizeModel()`, so the 32/32 selftest and the vitest enum tests verify a shape the production path never produces. The builder's "self-test covers the same contracts" claim is contradicted for the enum contract specifically.

**Fix (endorse as engineering):**
- `normalizeModel()` line `enum: …`: → `enum: Array.isArray(a.values) ? a.values : ((a.type && Array.isArray(a.type.values)) ? a.type.values.map(String) : undefined)`.
- `generateRowValues()` ENUM branch: when `a.enum` is absent and the type string contains quoted values, parse them: `[...type.matchAll(/'([^']*)'/g)].map(m=>m[1])[0]` as the value; keep `null` only when `allowNull` and no values are recoverable.
- Add to **both** suites: construct a fake model `{ rawAttributes: { status: { type: { toString: () => "ENUM('a','b')", values: ['a','b'] }, allowNull: false } } }`, run `normalizeModel`, assert `enum` is `['a','b']` and `generateRowValues` returns `'a'` — this closes the shape-divergence class, not just this instance.

## C. The 8 acceptance criteria, line by line

1. **Gate exit-1** — PASS. `validateShadowUrl` host/`shadow`/parse checks; `main()` gates before any models import; builder live-verified all four paths; code matches.
2. **Test suite passes, covers §5.2** — PARTIAL. Vitest is unrunnable locally (rollup native binary) and no CI step runs it; fix (9) substitutes the selftest, which covers all five §5.2 cases. But per §B above, both suites bypass `normalizeModel` — coverage is shape-divergent until (11) lands.
3. **Double-run idempotence** — PASS after (2); broken today for composite-PK tables (first-pk-only conflict target).
4. **YAML parses** — PASS as text (quoted `"***"` parses); FAIL at runtime until (4) (password auth mismatch kills the migrate step).
5. **Step order** — PASS: migrate → Seed → Assert → migrate again → import matches §5.3 exactly.
6. **No `@`/names/phones** — PASS: generator emits `seed-<table>-<n>` labels only; belt-and-braces `looksLikeEmail` throws.
7. **`grep "REFERENCES users"`** — PASS: the string `REFERENCES` does not occur in the seeder; `countRows` quotes `"Users"` from the model's real table name.
8. **`scan-secrets.sh` CLEAN** — **UNVERIFIED**: absent from the builder's verification list in the packet header. NOTE finding: must be run and recorded before merge.

## D. Residual risks to record (amend the candidate's list)

- `validateShadowUrl` vs `pg-connection-string` `?host=` query-param divergence (running-state item dropped from the candidate): fail-closed for the CI URL as written, but it belongs in the residual-risk list, not in silence.
- Vitest remains unexecuted in CI; the selftest is the enforced contract, not the vitest file.
- Composite-PK FK *targets* still resolve to first PK column (candidate already records this).

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F1=MAJOR: seed-shadow-db.mjs normalizeModel() "enum: Array.isArray(a.values)?a.values:undefined" — Sequelize enum values live at a.type.values for DataTypes.ENUM('a','b'), so entry.enum is undefined and generateRowValues() ENUM branch "out[col]=Array.isArray(a.enum)&&a.enum.length>0?a.enum[0]:null" emits NULL for every enum column; NOT NULL enums -> failed tables -> exit 1 (CI permanently red), nullable enums silently all-NULL, violating brief §5.1-4 "ENUM -> first value"; both test suites inject the normalized shape by hand (test.mjs fakeAttrs.status enum array; selftest.mjs attrs status enum ['active','paused']) so 32/32 verifies a shape the code never produces | F2=NOTE: brief AC-8 scan-secrets.sh CLEAN is absent from the builder's verification list | F3=NOTE: ?host= query-param divergence between validateShadowUrl and pg-connection-string dropped from the candidate residual-risk list though fail-closed today
rebuttals: FIX1=AGREE | FIX1a=AGREE | FIX2=AGREE | FIX3=AGREE with guard refinement: backfill-push must treat empty row-map list as parent-absent | FIX4=AGREE | FIX5=AGREE | FIX6=AGREE | FIX7=AGREE | FIX8=AGREE | FIX9=AGREE | FIX10=AGREE | no REJECTs carried
open: Q1=other seats confirm Sequelize v6 stores ENUM values at rawAttributes[col].type.values (not attribute-level .values) — the factual basis of F1 | Q2=adopt amended block below (candidate verbatim + NEW 11 + residual amendments)
consensus_block: AMENDED RULING — adopt candidate FIX ALL (1)(1a)(2)(3)(4)(5)(6)(7)(8)(9)(10) verbatim, with: NEW(11) seed-shadow-db.mjs normalizeModel(): enum: Array.isArray(a.values)?a.values:((a.type&&Array.isArray(a.type.values))?a.type.values.map(String):undefined); generateRowValues() ENUM branch: parse "ENUM('a','b')" type string as fallback before null (null only when allowNull and no values recoverable); add to seed-shadow-db.selftest.mjs AND seed-shadow-db.test.mjs a normalizeModel-driven case (fake model with ENUM type instance) asserting enum=['a','b'] and generated value 'a'; (3)-refinement: backfill-push guard keys on parent row-map list being present AND non-empty; RESIDUAL RISK adds: validateShadowUrl checks URL text while pg-connection-string honours ?host= (fail-closed for the CI URL as written); vitest suite not executed in CI — selftest is the enforced contract; AC-8 scan-secrets.sh CLEAN must be run and recorded pre-merge. All other candidate text (ACCEPTED INTENTIONAL, existing residual risks) unchanged.
=== END-VERDICT ===
