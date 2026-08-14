# HANDOFF v2 — Schema-truth campaign closed; next mission: Playwright harness hostile review until dry

**Written:** 2026-08-14, closing the long session (Opus 5 → Fable 5) · **Supersedes** the still-valid
`SCHEMA-TRUTH-CAMPAIGN-HANDOFF-2026-08-13.md` (read it SECOND — its banked evidence, environment
map, and mechanical traps all still hold; this doc adds everything since and re-orders the queue).

**Owner directive for YOU, the next agent (Sean, verbatim intent):** *"run a hostile review with
Kimi and make all the fixes, enhance and update as needed, and don't stop until we run dry."*
Subject: **the Playwright QA harness** — Sean wants to try it and wants it bulletproof first.
That is your Mission 1. Everything else queues behind it.

---

## 1. Mission 1 — Kimi hostile review of the Playwright harness, fix until dry

**Scope of the review packet** (full source, one remit per reviewer — dual-remit packets make one
model role-play both, learned 2026-08-13):
- `frontend/e2e/mission/production-dashboard-crawl.mission.spec.ts` + `.report.ts` + `.routes.ts`
- `frontend/e2e/mission/crawlWorklist.ts`, `qaFindings.ts`, `qaSuppressions.ts`, `qaSuppressions.audit.ts`
- `frontend/e2e/mission/dashboard-crawl-report.contract.mission.spec.ts`, `qa-findings.contract.mission.spec.ts`
- `scripts/qa/playwright-mission.mjs` (+ its `scripts/__tests__/` tests — they are VITEST, not node:test)
- `scripts/qa/mission-report.mjs`

**Already-known open items to fold into the same dry-loop** (do not rediscover):
- Suppressions registry covers only the crawl; THREE other allowlists remain permanent
  (`missionHarness.ts:74`, `production-live-readonly.mission.spec.ts:24`,
  `client-card-responsive-layout.ts:308`) — migrating them was filed on SWA-157.
- Fixes 1–2 of slice 0 were proven by unit test + dead-origin run, never by a live authenticated
  production crawl (needs `SWAN_PROD_*_AUTH_STATE` files — capture scripts:
  `npm run qa:prod-auth:capture:admin|trainer|client` from `frontend/`).
- Route table is still hand-typed (85 routes); the manifest generator + drift gate is designed
  but unbuilt. Depth is still 1 (fixpoint exploration unbuilt). Cross-role two-session journeys
  unbuilt (their DB infrastructure is DONE and green — see §3).

**Dry-loop law applies in full:** rounds with NEW vantages until CLEAN×2; every Kimi finding
verified against source before fixing (this session: 33/33 externally-reported findings were
checked; several real-HY3 ones were FALSE because the packet omitted evidence — reviewer quality
tracks packet completeness, so include the complete state).

**How Sean tries it** (give him these when the dry-loop closes):
```powershell
# contract suite, no auth needed (64+ tests, Desktop+Mobile):
cd C:\tmp\ss-qa-harness-slice0
node scripts/qa/playwright-mission.mjs --grep="dashboard crawl report contract|qa findings worklist"
# the real read-only production crawl (after capturing auth states):
node scripts/qa/playwright-mission.mjs --prod-live-readonly
```

## 2. Everything DONE this campaign (all pushed, prod verified healthy)

| Item | Proof anchor |
|---|---|
| Playwright crawl slices 0–1: crash-durable evidence, honest coverage, ranked worklists, expiring suppressions, `mission-report.mjs` rewritten from a read-nothing facade | contract tests 64/64 via runner |
| Waiver outage fixed LIVE (SWA-158): 5 columns, observed 500→200, class eradicated DB-wide | audit `column-missing 5→0` |
| `packages` boot-created; creation-order one-liner | prod `to_regclass` ✓, 10 cols |
| **108 indexes created in prod** (101 batch 9.9s + 7 after squatter drop), 0 failures, 0 INVALID | `index-missing 112→9`; dwf 1→10 |
| Achievements split resolved: empty lowercase twin DROPPED (0 rows/0 FKs/no owner, re-verified in-session), real table fully indexed | SWA-96 |
| **Challenges family RETIRED** (Sean's canon): route 796→94 (only canonical `/active`), trio unregistered (registry 164→161), 3 empty Pascal tables dropped, tests re-anchored + RUNTIME retirement contract | SWA-96, commits `8726fdcbd`→`7181704ab` |
| SWA-159 CLOSED: dangling `teamId` FK reference removed — model now exactly matches prod | same slice |
| QA container fully green: 231 models → 198 tables, 0 import-graph failures, column-level verify CLEAN, manifest JSON | `scripts/qa/qa-schema.mjs` |
| Drift auditor: 5 classes, shared resolver, QA-rehearsable; generator with fail-closed skips + sidecar | 4 prod runs this session |
| Triple review (self + Kimi + HY3) of the closed campaign: 7 Kimi findings → 3 fixed same-turn (pagination tiebreaker, drift-telemetry on the degradation path, runtime contract), 4 answered/filed | `KIMI/HY3-CAMPAIGN-FINAL-2026-08-13.md` |
| Linear works headless (`scripts/linear-cli.mjs`); MCP on API-key auth; SWA-157/158/159/96 all current | board |

## 3. The queue AFTER Mission 1 (re-ranked by the reviewers' convergence)

1. **Boot drift tripwire** — BOTH external reviewers independently ranked this #1 from different
   layers. CI/boot assertion diffing enumeration lists vs registry; makes "silently missing"
   impossible. Days of work. Prod-boot surface → Sean gate on the wiring.
2. **Baseline migration (Kimi plan D→A′)** — makes prod rebuildable (today it is NOT: 367
   migrations, none creates `Users`). MUST fold in: K6 (3 migrations still reference the dropped
   `ChallengeTeams` — grep list in SWA-96 comments), the pg_catalog VERBS inventory (triggers/
   views/functions/RLS/grants — HY3: "you audited the nouns"), and the 7-item unresolvable
   sidecar governance.
3. **Cross-role journeys** (the original mission): persona seeding → two concurrent authed
   Playwright sessions → trainer POSTs `/api/workout-forms` → client reads `/api/client/analytics/*`.
   Write path verified real at `dailyWorkoutFormRoutes.mjs:611`; needs the trainer↔client
   relationship row (`checkTrainerClientRelationship`). Cleanup exists (`cleanup-qa-and-sessions.mjs`).
4. **Orphan/dormant disposition as migrations** — 85 orphan tables + ~35 dormant models +
   3 retired social model files awaiting Rule-34 quarantine. Access-log evidence before any drop
   (grep is not caller-truth — K1).
5. **House pattern going forward:** retirements ship 410-tombstone routes + endpoint-tagged
   logging for a watch window BEFORE deletion.

## 4. OPEN QUESTIONS SEAN RAISED (2026-08-14) — surface these to him, do not decide

- **Graphify re-decision.** Sean: "why would I not wanna use that? It helps the AI see my whole
  system better, doesn't it?" The honest frame for him: the 2026-07-19 tombstone (his approval)
  and rule 72 rejected graph/RAG **for flat lookups** — "where is X" questions that grep answers
  cheaper and more reliably; the repo's catalog is the recall layer. The policy's OWN carve-out:
  a graph earns its cost on CHAIN questions ("which surfaces use pattern C11 → which decisions
  constrain them → which have expired review hooks"). Rule 72 has an explicit re-decision gate
  that belongs to Sean. If he reopens it, scope it properly (quarantine-first per the archived
  policy, bounded inputs, PII-clean) — and note the campaign map artifact was the flat-file
  version of "see what we got"; a LIVE graph would be a real build.
- **Community challenges content:** only 1 of 18 challenges is active+public+unexpired — the
  repaired page is nearly empty by CONTENT. Product call: seed new challenges, extend dates, or
  surface ended ones differently.

## 5. Where everything lives

- Worktree (current, use it): `C:/tmp/ss-qa-harness-slice0` · stale main tree only for its `.env`.
- Prior handoff (evidence bank + env map + traps): `SCHEMA-TRUTH-CAMPAIGN-HANDOFF-2026-08-13.md`.
- Reviews: `KIMI-QA-HARNESS-*`, `KIMI-QA-TOOLING-*`, `KIMI/HY3-CAMPAIGN-FINAL-*`, `KIMI-MIGRATION-CHAIN-VERDICT-*` (all in AI-HANDOFF/).
- Campaign map artifact (Sean-visible page): claude.ai/code/artifact/e647019e-dbb3-4779-bfb8-a08e42b40bae.
- Hermes: 13 memos this session in `.ai-workflow/hermes-inbox/pending/` + 1 durable packet; drain cycle proven live mid-session.
- Suggested skills: `lesson-recall` FIRST (the traps recurred against written warnings), `blast-radius-guard` before any SQL, closeout gates are Stop-hook-enforced (dual-tier, dry-loop ledger, PROOF line, LINEAR sync, Hermes memo — in the turn's FINAL message).

## 6. Definition of done for Mission 1

Kimi review received on a COMPLETE packet → every finding verified-then-fixed or verified-then-
refuted with evidence → new/changed behavior covered by tests that failed before the fix →
CLEAN×2 dry rounds from fresh vantages → pushed → SWA-157 updated → Sean handed the two try-it
commands above.
