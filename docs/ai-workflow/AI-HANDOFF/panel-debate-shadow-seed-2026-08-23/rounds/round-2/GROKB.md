# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/rounds/round-2/REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 20334 in / 23966 out · **Cost:** ~$0.1843 · **Wall:** 355.4s · **finish:** stop

---

The two consensus defects are real, locatable, and they sit on this seat’s contracts: insert-order truth and “seed twice is a no-op,” neither of which the DB-free suite can see.

**F1 — deps graph is associations-only.** `normalizeModel` already recovers attribute-level FKs (`a.references` → `foreignKeyTarget`, L274–291), and `generateRowValues` / cycle-break both consume that map (L176–186, L396, L409–411). The graph that `topoSort` actually uses does not:

```368:376:backend/scripts/seed-shadow-db.mjs
    for (const a of Object.values(m.associations || {})) {
      // ...
      if (a.target && a.target.name && registry.has(a.target.name)) {
        parents.add(a.target.name);
      }
    }
    deps.set(nm, parents);
```

A `references:` column with no matching `belongsTo` is ordered as if it had no parent. If the 373 migrations installed a real FK, the child insert fails and the job goes red (false failure). If they did not, the child is counted in `dbRows` with a NULL/wrong FK and the assert at workflow L93–97 still sees `rows > 0` (false success). Brief §5.1.3 required the graph to be built from FK definitions, not from `m.associations` alone.

Naive `parents.add(foreignKeyTarget.table)` is a no-op: deps keys are model names (`User`), `foreignKeyTarget.table` is a table name (`Users`), and `topoSort` L100 drops unknown parents. That is the §9 inert-mutation trap. Resolve through `tableNameToModel` (move L386–387 above the deps loop).

**F2 — single `pkCol` + blind insert.** L422 takes the first PK only. L438–445 then does this:

```438:447:backend/scripts/seed-shadow-db.mjs
      if (pkCol) {
        try {
          inserted = await m.bulkCreate(values, { updateOnDuplicate: [pkCol], individualHooks: false });
        } catch (conflictErr) {
          inserted = await m.bulkCreate(values, { individualHooks: false });
        }
      } else {
        inserted = await m.bulkCreate(values, { individualHooks: false });
      }
```

The catch is not “dialect rejected the conflict target.” It is any `bulkCreate` error. Second-run PK clash then either (a) throws, lands in `failed[]`, L499–500 exits 1 — breaking AC §7 “run the seed twice … does not crash” — or (b) succeeds on a table whose DB constraint is weaker than the model, duplicating rows. Header L21–23 claims `updateOnDuplicate: [pk]` is the idempotence mechanism; the catch path contradicts that claim. Composite PKs never reach the conflict target at all.

`ignoreDuplicates: true` (Sequelize → Postgres `ON CONFLICT DO NOTHING`) is the fail-closed fallback. Do not leave a plain insert on any path, including the no-PK branch (L446–447).

**CI integrity (this seat, not a reject).** Workflow order L64–66 → L75–77 → L79–98 → L103–105 is migrate → seed → assert → migrate. That matches brief §5.3 and is accepted. The assert is fail-closed today: `SHADOW-SEED OK … rows=5` (L453) does not match `"rows":[0-9]*`, so a missing JSON line cannot go green. Still harden L87 to `grep '^SHADOW-SEED {'` so `tail -1` cannot latch onto L453/L480. Residual, not a third required fix: nothing after the second migrate re-counts rows, so a successful `bulkDelete`/`TRUNCATE` stays green.

Safety gate L63–80 / L330–335 is fail-closed (exact hostname, no override, before `associations.mjs`). `/shadow/i` on the whole URL is the brief’s own rule; production is still blocked by the host check. `countRows` L321 quotes the model’s real table name; writes go through `bulkCreate`. The `"Users"` / `users` trap is closed.

Self-test 32/32 and vitest do not import `main()`, do not build `deps`, and do not call `bulkCreate`. Builder’s local-verification list does not cover F1 or F2. CI Postgres 16 is the proving ground.

=== VERDICT ===
status: CONSENSUS
confidence: 90
findings: F1=MAJOR: seed-shadow-db.mjs L368-376: deps built from m.associations only; normalizeModel foreignKeyTarget (L274-291) never enters the graph, so attribute-level FKs are mis-ordered | F2=MAJOR: seed-shadow-db.mjs L422+L438-447: pkCol is find() not filter(); catch and no-pk branches are blind bulkCreate, contradicting header L21-23 and AC “seed twice does not duplicate PKs” | F3=MINOR: migration-shadow-check.yml L87: grep '^SHADOW-SEED ' also matches L453/L480 OK/backfill lines; latch is tail -1 plus JSON extract (fail-closed today)
rebuttals: F1=AGREE | F2=AGREE | F3=AGREE
open: Q1=promote a post-second-migrate recount (catch wipe migrations that still exit 0) to required, or leave residual? | Q2=confirm sequelize version maps ignoreDuplicates to ON CONFLICT DO NOTHING on the workflow’s Postgres 16
consensus_block: Fixes required – (1) In seed-shadow-db.mjs, extend the dependency graph construction to also add parents from `normalizeModel(m)`’s detected `foreignKeyTarget` values, e.g., pushing the target model name into `deps.get(nm)`. (2) Change `const pkCol = …` to `const pkCols = Object.keys(attrs).filter(c => attrs[c].pk)` and pass `pkCols` as the array to `updateOnDuplicate`. If the dialect rejects the conflict target, implement a safe upsert pattern (e.g., `ON CONFLICT DO NOTHING`) rather than a blind plain insert. These issues were not exercised by the DB-free self-test; they must be validated in the real CI environment.
HOW (1) seed-shadow-db.mjs: move tableNameToModel (L386-387) above the L364 loop. After the associations for-loop (L368-375), for each attrs entry with foreignKeyTarget, `const parentNm = tableNameToModel.get(String(a.foreignKeyTarget.table).toLowerCase()); if (parentNm) parents.add(parentNm);`. Do not push the raw table string — topoSort L100 drops names not in the model-name set.
HOW (2) seed-shadow-db.mjs L422: `const pkCols = Object.keys(attrs).filter((c) => attrs[c].pk);`. L438-447: `updateOnDuplicate: pkCols`; on catch, `bulkCreate(values, { ignoreDuplicates: true, individualHooks: false })` (Postgres ON CONFLICT DO NOTHING). Same `ignoreDuplicates: true` on the no-pk branch. Keep insertedIds from `pkCols[0]` (or the FK target key) at L450.
Accepted intentional: workflow migrate→seed→assert→migrate (yml L64-66, L75-77, L79-98, L103-105) matches brief §5.3; validateShadowUrl exact-hostname loopback (L74-76) is stronger than the brief regex and has no override; /shadow/i on the full URL (L77) is the brief’s rule and cannot reach prod past the host check; JSONB `{seed:true,table,row}` (L217) vs brief `{}` is PII-free; lowercase insertedIds keys cannot misroute writes (model bulkCreate + countRows L321 quotes real case); Users/users trap closed; rows>0 (not tables==217) is the specified assert bar; DB-level FK/CHECK present only in the 373 migrations and absent from model associations remains a red-on-insert gate.
Residual: F3 harden yml L87 to `grep '^SHADOW-SEED {'`; no row recount after second migrate (successful wipe stays green); getTableName() object form becomes "[object Object]" in plainTable L311-314 (fails that table’s count, fail-closed if universal); database.mjs not in packet; composite-PK parent ids still expose only pkCols[0]; skipped no-nullable-edge cycles can starve children (reported, not silent).
=== END-VERDICT ===
