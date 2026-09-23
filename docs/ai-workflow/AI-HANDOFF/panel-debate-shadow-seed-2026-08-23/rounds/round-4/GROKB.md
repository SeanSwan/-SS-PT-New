# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/rounds/round-4/REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 19262 in / 29924 out · **Cost:** ~$0.2179 · **Wall:** 477.5s · **finish:** stop

---

The migrate→seed→migrate contract is already in the YAML. The defects that still break the gate are a lying password, an association-only FK graph, and a single-column PK model that cannot tell the truth about composite keys.

**CI trust boundary — password vs comment vs brief.**  
`.github/workflows/migration-shadow-check.yml` L15–16 states user/password/database are the literal word `shadow`. L24 and L26 honour that. L25 does not: `POSTGRES_PASSWORD: "***"`. Brief §4 requires all three named `shadow`. Builder header claims the YAML `***` alias was “caught and quoted” — that only makes the file parse; it leaves the container password as three asterisks. If `DATABASE_URL` (L56, redacted) uses password `shadow`, first migrate never authenticates and the populated-DB gate never runs. If the URL uses `***`, the comment and brief are false. Either way the service contract is broken. Fix L25 to `POSTGRES_PASSWORD: shadow` and make L56 use the same password.

**Ordering is not a defect.**  
L46–48 `npm ci` → L58–60 pre-migrate-guard → L64–66 migrate (empty) → L75–77 seed → L79–98 assert → L103–105 migrate (with data) → L107–109 import → L111–117 upload. That is brief §5.3. Extra assert/upload steps do not reorder the seed across a migrate.

**Seed step does not swallow exit status.**  
L77 is a redirect, not a pipe. GHA Linux is `bash -eo pipefail`. `seed-shadow-db.mjs` L499–500 sets `process.exitCode = 1` when `dbRows === 0` or `failed.length > 0`. A silent no-op is not green on this path. Residual (MINOR): stdout never reaches the step log (`>` without `tee`), and the assert at L93–96 only greps `"rows":N` — it does not reject a non-empty `failed` array. Fail-closed today; not a second independent failed[] guard.

**Data-truth — graph ignores attribute-level FKs.**  
`normalizeModel` L274–289 records `foreignKeyTarget` from associations *and* `a.references`. The topo graph at L368–376 only walks `m.associations`. A `references:` FK with no association is generated as an FK (L176–186) but is not a dependency, so the child can insert before the parent. `parentIds` miss, non-null FKs fail (or go NULL). Build `tableNameToModel` *before* the deps loop; for every `attrs[c].foreignKeyTarget`, add `tableNameToModel.get(table.toLowerCase())` to `parents`. If `a.references.model` is an object, L287’s `String(a.references.model)` becomes `"[object Object]"` — resolve via `getTableName()`/`tableName`.

**Data-truth — one PK column everywhere.**  
L283, L422, L440, L450–451, L467–474, and FK write L180 all use `.find` / a scalar. Composite PK tables: `updateOnDuplicate: [firstPk]` is the wrong conflict target; L441–444 then *plain-inserts*, which on a second run duplicates or throws — that violates acceptance “run twice, no crash, no duplicate PKs”. `insertedIds` stores one column; L180 writes that scalar into every child FK; backfill L474 updates `{ [bf.col]: null }` with a single parent id and ignores `bf.row`. Store the full PK tuple per row; pass every PK column to `updateOnDuplicate`; on conflict-target failure, SELECT/findOrCreate by the full tuple — never a blind `bulkCreate`. Backfill must write the parent row-0 tuple into the matching FK columns and `where` by the child PK.

**Safety gate itself is sound.**  
`validateShadowUrl` L63–80 + `main` L331–336 refuse before any DB import; no override. `/shadow/i` on the full URL is what §5.1 specified. `countRows` L320–321 quotes identifiers (`"Users"`), so the stale `users` trap is not reproduced here. Report `rows` is a post-seed `COUNT(*)` (L482–497), not `inserted.length` — the CI line is honest. Per-table `SHADOW-SEED OK … rows=${inserted.length}` (L453) is insert-return theatre; it is not what the assert reads.

**Assert / retry.**  
`backend/vitest.config.mjs` L35 `retry: 1` now covers `scripts/**/seed-shadow-db.test.mjs` (L16). A flaky safety-gate test can pass on the second try. Do not flip global retry; isolate this file in a vitest project with `retry: 0`.

=== VERDICT ===
status: CONSENSUS
confidence: 92
findings: F1=MAJOR: .github/workflows/migration-shadow-check.yml L25: POSTGRES_PASSWORD is "***" vs L15-16 comment + brief §4 (all named shadow); quoted-alias “fix” leaves auth/contract false | F2=MAJOR: backend/scripts/seed-shadow-db.mjs L368-376: deps from associations only; normalizeModel foreignKeyTarget L274-289 ignored so reference-only FKs are unordered | F3=MAJOR: backend/scripts/seed-shadow-db.mjs L180|L283|L422|L440-444|L450-451|L467-474: first-PK-only upsert/ids/FK/backfill; plain-insert fallback breaks twice-run idempotence | F4=MINOR: backend/vitest.config.mjs L35: retry:1 applies to seed-shadow-db.test.mjs safety tests | F5=MINOR: .github/workflows/migration-shadow-check.yml L77|L93-96: seed stdout not teed; assert checks rows>0 only, not failed:[]
rebuttals: F1=AGREE | F2=AGREE | F3=AGREE | F4=AGREE | F5=AGREE | step-list=REJECT: L64-66 migrate → L75-77 seed → L79-98 assert → L103-105 migrate matches brief 5.3 | seed-exit=REJECT: L77 `>` is not a pipe; GHA bash -eo pipefail + L499-500 exitCode=1 on rows===0 or failed.length>0 — step does not green a no-op
open: Q1=retry:0 scoped to seeder tests this PR vs defer as pre-existing | Q2=whether assert must also reject non-empty failed[] | Q3=post-fix CI must prove password shadow + composite PK upsert
consensus_block: ADOPT candidate. FIX NOW: (a) .github/workflows/migration-shadow-check.yml L25: POSTGRES_PASSWORD: shadow (match L24/L26, comment L15-16, brief §4); L56 DATABASE_URL password must be shadow. (b) seed-shadow-db.mjs: build tableNameToModel before the L364 loop; add parents from each normalizeModel foreignKeyTarget (resolve references.model objects via getTableName/tableName, not String()). Collect all PK cols (not .find). generateRowValues L180: assign full parent PK tuple into the mapped FK cols. L440: updateOnDuplicate: pkCols. Delete L441-444 blind bulkCreate; on conflict-target failure, findOrCreate/SELECT+INSERT by the full PK tuple. L450-451: store PK tuples in insertedIds. L474: backfill parent row-0 tuple; where by child PK (bf.row), not only { [bf.col]: null }. Validate in real CI. INTENTIONAL: synthetic not snapshot (§3); /shadow/i on full URL (§5.1); skip non-nullable cycles; migrate→seed→migrate order already correct; safety gate before import; COUNT(*) report rows. RESIDUAL: skipped cycle tables still empty on second migrate; L453 OK line uses insert length; getTableName() object form untested; e2e insert still unproven locally; F4/F5 not blocking if F1–F3 land.
=== END-VERDICT ===
