# 05 — Slice plan + executable acceptance criteria

Five slices. Commit per slice (`feat(cortex): …`). **STOP at every slice boundary: post diff +
criteria evidence, wait for checkpoint verdict (07) before the next slice.** Push once at batch
end after final checkpoint (Rule 70).

## Slice 1 — Source Library
**Files:** 04 #1–7. **Decisions already made:** table shapes (03 §3.2), seed content (03 §3.5),
schemes allowed for storageLocation (`hermes-vault://`, `r2-private://` only).
**Acceptance criteria (all must show real output):**
1. `cd backend && npx sequelize-cli db:migrate` (project's configured equivalent) completes; then
   `db:migrate:undo` + re-migrate completes (down path proven) — paste output.
2. `node backend/seeders/20260714-seed-cortex-founding-sources.mjs` twice → second run creates 0
   new rows; paste both run logs.
3. `cd backend && npm test -- cortexSourceLibrary` → all pass (≥8 assertions).
4. SQL check pasted: `SELECT "sourceTitle","sourceCategory","historicalStatus" FROM
   knowledge_sources;` shows exactly 10 rows (03 §3.5 catalog), including the ~2000 workshop row
   with `historical` and the NASM OPT textbook row with `restricted` copyright sensitivity.
5. Full backend boots: `npm run dev` backend starts with zero new warnings/errors (paste boot log
   tail). Flag stays unset.
**STOP — checkpoint 1.**

## Slice 2 — Rules layer
**Files:** 04 #8–12. **Decided:** rule schema + status enum + transition map (01/03), snapshot
semantics (immutable rule_versions, changeNote required).
**Acceptance:**
1. Migrate + undo + re-migrate clean (paste).
2. `npm test -- cortexKnowledgeRuleService` → pass; test file asserts: every drawn transition
   allowed; ≥4 undrawn transitions rejected with `invalid_status_transition`; update snapshots
   prior state to rule_versions with versionNumber increment; approve stamps
   approvedByUserId+approvedAt; changeNote <5 chars rejected.
3. Node REPL/script evidence: create draft rule → update → status to needs_sean_review →
   sean_approved → `SELECT count(*) FROM rule_versions WHERE "ruleId"=<id>;` = 3.
**STOP — checkpoint 2.**

## Slice 3 — API + runtime wiring
**Files:** 04 #13–16. **Decided:** endpoint table (03 §3.3), 503 flag gate, admin guard reuse,
cache TTL 5 min.
**Acceptance (curl against local dev, paste real responses):**
1. Flag unset: `curl -s localhost:10000/api/cortex/stats` → `503 {"success":false,"error":"cortex_knowledge_disabled"}`.
2. Flag on + no auth → 401/403 (paste). Flag on + admin token:
   `POST /api/cortex/sources` (valid body) → 201 with id;
   `POST /api/cortex/sources/:id/files` with `storageLocation:"https://x"` → 400
   `invalid_storage_location`;
   `POST /api/cortex/rules` with `status:"sean_approved"` in body → 201 but response rule.status
   = `"draft"` (forced);
   `PUT /api/cortex/rules/:id/status {"status":"sean_approved","changeNote":"…"} `from draft →
   400 `invalid_status_transition`; via needs_sean_review → 200.
3. `npm test -- cortexKnowledgeRoutes` → pass (≥10 assertions).
4. Service proof: script calls the policy loader with flag on → object contains `knowledgeRules`
   array including the approved rule; with flag off → `knowledgeRules: []`. Paste output.
5. Regression: full backend test suite green (`cd backend && npm test`) — paste summary line;
   state pass/fail counts vs baseline (Rule 56: name any pre-existing failures explicitly).
**STOP — checkpoint 3.**

## Slice 4 — Knowledge Console UI
**Files:** 04 #17–24. **Decided:** every screen/state/copy string (02), route + nav registration
points (04 #23), tokens, 44px, low-motion.
**Acceptance:**
1. `cd frontend && npx tsc --noEmit` — zero NEW errors (report baseline count first).
2. `npx vitest run admin-knowledge` → ≥6 tests pass (paste).
3. Screenshots (Playwright or manual) at **1440px and 375px** of: Rules tab with data; empty
   Sources tab (exact empty copy visible); Rule detail drawer with Approve disabled (no change
   note) and enabled (note typed); flag-off notice page. 8 screenshots total.
4. Interaction proof: approve a rule from the UI → toast "Rule approved — live for generation
   within 5 minutes." → row dot turns gold without full page reload.
5. Accessibility spot-check: all buttons/tabs ≥44px (state measured values for the smallest);
   drawer closable by keyboard (Esc) and ✕ focusable.
**STOP — checkpoint 4.**

## Slice 5 — Progression events
**Files:** 04 #25–28. **Decided:** one table both directions, endpoint auth split
(trainer/admin write; client self-read only).
**Acceptance:**
1. Migrate + undo + re-migrate clean; FK target table name verified against
   `WorkoutSession.mjs` real tableName (quote the line from the model file).
2. `npm test -- cortexProgressionEvents` → pass; asserts cross-client GET → 403; trainer POST →
   201; bad enum → 400.
3. curl evidence: trainer POST progression event → 201; client GET own events → 200 list; client
   GET `?userId=<other>` → 403.
4. Full backend suite green again (same Rule 56 disclosure).
**STOP — final checkpoint, then batch push.**

## Definition of phase-done
All 5 checkpoints PASS → builder pushes branch → Fable runs the phase-close review → Rule 48
audit record `CORTEX-PHASE1-AUDIT-RECORD-<date>.md` → flag flip decision goes to Sean (default
stays OFF in prod until he says go).
