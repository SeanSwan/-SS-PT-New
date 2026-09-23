# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/rounds/round-5/REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 19444 in / 25135 out · **Cost:** ~$0.0501 · **Wall:** 276.1s · **finish:** stop

---

DeepSeek V4 Pro — inference auditor. I checked the builder’s local claims against the code packet. The self-test count is consistent: the selftest file has 32 `ok(...)` calls (8 validate + 4 topo + 4 uuid + 5 serialize + 6 generateRowValues + 5 value-type). I adopt consensus items (2) and (4). I **REJECT consensus items (1) and (3) as stated**, with code evidence below.

**F1 — MAJOR:** `backend/scripts/seed-shadow-db.mjs` L363-L376 builds the dependency graph only from `m.associations`; it never reads `attrs.foreignKeyTarget`. The proposed fix says to add those target **table names** to `deps`, but `topoSort` at L100 filters parents against `nameSet` built from `allNames`, which are **model names** from `registry.keys()` L377. `foreignKeyTarget.table` is a `getTableName()`-derived table name L277-L280. `tableNameToModel` is built only later at L385. So for the canonical case where table name ≠ model name (`User` -> `"Users"`, explicitly called out in the brief), the added table-name dependency is filtered out and the fix is inert. Correct fix: build `tableNameToModel` before the graph loop; for each FK column, resolve `tableNameToModel.get(targetLower)` and add that model name as a parent.

**F2 — MAJOR:** `backend/scripts/seed-shadow-db.mjs` L178-L179 consumes scalar parent IDs: `out[col] = parents[rowIndex % parents.length]`. L449 stores only the first PK value: `values.map((v) => v[pkCol])`. Consensus item (3) says to store full PK tuples in `insertedIds`, but `insertedIds` is passed as `parentIds` L424, so the FK branch would then assign an array/object tuple directly to a scalar FK column. That is a type drift and will break any child of a composite-PK table. The fix must also change `normalizeModel` L282 to retain all PK columns and map each FK column to its component index, then update `generateRowValues` to pick the correct tuple member per FK column. Without that, item (3) is not valid.

**F3 — MINOR:** `.github/workflows/migration-shadow-check.yml` Assert seed step uses `grep '^SHADOW-SEED ' ... | tail -1`. That pattern also matches `SHADOW-SEED OK ...` and `SHADOW-SEED cycle-backfill ...`. It currently fails safe only because the report is the final stdout line, but the assertion is fragile. Exact-fix: match the machine-readable report shape directly, e.g. `grep '^SHADOW-SEED {"tables"'`.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F1=MAJOR: backend/scripts/seed-shadow-db.mjs L363-L376: dependency graph uses only associations; proposed add-table-name fix gets filtered by topoSort L100 because deps are model names and tableNameToModel is built L385 | F2=MAJOR: backend/scripts/seed-shadow-db.mjs L178-L179/L449: storing composite PK tuples in insertedIds without changing generateRowValues will pass tuple objects into scalar FK columns | F3=MINOR: .github/workflows/migration-shadow-check.yml Assert step: `grep '^SHADOW-SEED ' | tail -1` is safe only while the report prints last; match the JSON report shape directly
rebuttals: consensus-item-1=REJECT: table names from `getTableName()` must be mapped to model names via `tableNameToModel`, otherwise topoSort filters them | consensus-item-3=REJECT: tuple storage must be accompanied by FK-component mapping in normalizeModel/generateRowValues; otherwise it is a type drift | consensus-item-2=AGREE | consensus-item-4=AGREE
open: Q1=do any 217 models actually have composite FKs? The selftest fakeAttrs contains two PK columns, so this is not hypothetical | Q2=should cycle skips with no nullable edge be a hard failure rather than only reported? | Q3=does Sequelize bulkCreate with updateOnDuplicate require conflictFields to target the composite PK?
consensus_block: (none — status DISPUTE; revised fixes required in F1 and F2 before this can converge)
=== END-VERDICT ===
