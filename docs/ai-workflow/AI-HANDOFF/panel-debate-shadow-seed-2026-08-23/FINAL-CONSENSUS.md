# HOSTILE DEBATE — BUDGET RESULT

**Packet:** `docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/PACKET.md`
**Rounds answered:** 15 · **Real spend:** ~$5.4272 · **Strongest seat:** dspro
**Roster:** GLM 5.3 · Grok 4.6 (seat A) · Grok 4.6 (seat B) · DeepSeek V4 Pro · Ox Alpha (stealth)

---

> ⚠ **DISPUTE REMAINS** — debate stopped at round 15 of 20 (budget). No fake consensus: the strongest candidate ruling so far is below; the unresolved items are listed in `docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/debate-state.json`.

Candidate block:

FIX ALL: (1) AMENDED — seed-shadow-db.mjs: DELETE the §3 associations walk; build deps solely from meta attrs with foreignKeyTarget (complete only after fix below). (1a) normalizeModel(): change the association lookup to require `x.associationType === 'BelongsTo' && x.foreignKey === col` before using found.target; keep the a.references.model fallback. (2) pkCols=Object.keys(attrs).filter(c=>attrs[c].pk); pass pkCols to updateOnDuplicate. (3) Store full PK maps in insertedIds; generateRowValues sets out[col]=parentRow[a.foreignKeyTarget.pk]; backfill reads insertedIds[targetLower][0][attrs[bf.col].foreignKeyTarget.pk]; delete unused tPk .find; update fixtures. (4) workflow L25 POSTGRES_PASSWORD: "shadow"; DATABASE_URL password must be shadow. (5) Assert grep '^SHADOW-SEED {'. (6) NO CHANGE to vitest retry. (7) dedupe backfill on (table,col). (8) NO CHANGE: 32/32 selftest claim stands. NEW (9) workflow: add step after npm ci — `node scripts/seed-shadow-db.selftest.mjs` (dependency-free). NEW (10) Seed step: `> seed-shadow.log 2>&1` so SKIP/FAIL reach the artifact. ACCEPTED INTENTIONAL: PII guard, deterministic generation, synthetic-over-snapshot (§3), F5/F6 deferred. RESIDUAL RISK: composite-PK FK targets resolve to first pk column only until verified; FKs expressed neither as attributes nor BelongsTo associations are missed; hard-cycle tables without nullable edge stay empty for migration run 2.

