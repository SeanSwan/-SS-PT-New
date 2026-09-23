# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/rounds/round-6/REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 19762 in / 17888 out · **Cost:** ~$0.1467 · **Wall:** 242.9s · **finish:** stop

---

The migrate→seed→assert→migrate order in `.github/workflows/migration-shadow-check.yml` is the one brief §5.3 specified. That path is not the defect. The gate never reaches it.

**F1 (MAJOR) — auth contract is a documented lie.** Workflow comment at L15–16: user/password/database are “all the literal word `shadow`.” L25 sets `POSTGRES_PASSWORD: "***"`. Builder header: “YAML `***` alias bug caught and quoted.” Quoting makes `yaml.safe_load` succeed (acceptance box checked) and stores the literal three asterisks. Clients (brief §4, seeder gate, migrate) authenticate as `shadow`/`shadow`. `pg_isready -U shadow -d shadow` (L30) does not verify a password, so the service goes healthy and migrate run 1 dies on auth. The only E2E surface has never been green. Builder’s “UNPROVEN-by-necessity” is false: this is proven-broken, fail-closed, and it certifies nothing.

**F2 (MAJOR) — deps graph is associations-only.** `seed-shadow-db.mjs` section-3 loop (~L363–L376) walks `m.associations` only. `normalizeModel` already lifts `a.references` into `foreignKeyTarget` without an association. Those parents never enter `deps` → Kahn. Nullable attribute-only FKs insert as NULL (`generateRowValues` FK branch), `failed[]` stays empty, `countRows` > 0, exit 0. Seed is green; the FK column is empty. That is the §9 “signal that is always true.”

**F3/F4 (MAJOR) — single `pkCol` / scalar `insertedIds`.** `const pkCol = Object.keys(attrs).find(...)` then `updateOnDuplicate: [pkCol]`, `values.map(v => v[pkCol])` into `insertedIds` (~L449), backfill `tPk = ...find(...)` + `[0]`. `generateRowValues` L178–L179 assigns that scalar to every FK. Composite PK: wrong conflict target, wrong parent id, wrong backfill element.

**F5 (MINOR) — assert is not pinned to the report line.** Assert step: `grep '^SHADOW-SEED '`. Stdout also has `SHADOW-SEED OK …` and `SHADOW-SEED cycle-backfill …`. `tail -1` plus `grep -o '"rows":[0-9]*'` happens to work only because `serializeReport` is printed last. Anchor is `'^SHADOW-SEED {'`.

**F6 (MINOR) — `retry: 1`.** `backend/vitest.config.mjs` L35. Global false-success multiplier on the suite this packet just wired the seed tests into.

**F7 (MINOR) — backfill not deduped.** One `{table,col,targetLower,row}` per row; `model.update(..., { where: { [bf.col]: null } })` ignores `bf.row`. First hit updates every NULL in that column; the rest are no-ops; `backfilled of N` is not a row count.

Adopting the candidate verbatim. No REJECT.

=== VERDICT ===
status: CONSENSUS
confidence: 92
findings: F1=MAJOR: .github/workflows/migration-shadow-check.yml L25: POSTGRES_PASSWORD is literal "***" while comment L15-16 + brief §4 + all clients use "shadow"; healthcheck L30 does not auth; migrate run 1 never connects; only E2E gate has never been green | F2=MAJOR: backend/scripts/seed-shadow-db.mjs section-3 deps ~L363-L376: parents collected from associations only; attribute-level foreignKeyTarget omitted so nullable FKs seed as NULL and the job can still exit 0 | F3=MAJOR: backend/scripts/seed-shadow-db.mjs pkCol .find + updateOnDuplicate [pkCol] + insertedIds ~L449: single PK column only | F4=MAJOR: backend/scripts/seed-shadow-db.mjs generateRowValues L178-L179 + backfill tPk .find/[0]: insertedIds stores scalars; composite / target-pk element is wrong | F5=MINOR: .github/workflows/migration-shadow-check.yml Assert step: grep '^SHADOW-SEED ' also matches OK/cycle-backfill lines | F6=MINOR: backend/vitest.config.mjs L35: retry:1 is a false-success multiplier | F7=MINOR: backend/scripts/seed-shadow-db.mjs backfill loop: duplicate entries; update where col IS NULL ignores bf.row
rebuttals: F1=AGREE | F2=AGREE | F3=AGREE | F4=AGREE | F5=AGREE | F6=AGREE | F7=AGREE
open: Q1=first green CI run after the 7 fixes is the only acceptable proof | Q2=whether any of the 217 models actually declare composite PKs (fixes 2-3 stay mandatory either way)
consensus_block: FIX ALL: (1) seed-shadow-db.mjs section-3: build tableNameToModel before the deps loop; after the associations walk, also add parents from normalizeModel(m)/attrs with foreignKeyTarget, resolved via tableNameToModel.get(table.toLowerCase()) or registry, only if present. (2) Replace `const pkCol = Object.keys(attrs).find(c=>attrs[c].pk)` with `const pkCols = Object.keys(attrs).filter(c=>attrs[c].pk)`; pass updateOnDuplicate: pkCols; use the same pkCols at insertedIds extraction and backfill tPk lookup. (3) Store full PK tuples in insertedIds (`values.map(v => pkCols.map(c => v[c]))`); generateRowValues and backfill read the tuple element matching foreignKeyTarget.pk (else index 0). (4) .github/workflows/migration-shadow-check.yml L25: POSTGRES_PASSWORD: "shadow" (quoted). (5) Assert step: line=$(grep '^SHADOW-SEED {' seed-shadow.log | tail -1). (6) Delete backend/vitest.config.mjs L34-L35 (comment + retry: 1). (7) Dedupe backfill by table+col+targetLower before update (or key where on the row PK and use bf.row). All seven require one real green CI run as proof — F1 shows no successful run exists yet. ACCEPTED INTENTIONAL: PII guard, deterministic generation, synthetic-over-snapshot decision (§3), F5/F6 deferred with reasons. RESIDUAL RISK: dependency-graph extension may miss implicit FKs not expressed as attributes or associations — manual review of the 217 models advised; composite-PK paths remain unverified until the first green CI run. Verified non-defect: workflow step order is install → migrate → seed → assert → migrate → import (brief §5.3).
=== END-VERDICT ===
