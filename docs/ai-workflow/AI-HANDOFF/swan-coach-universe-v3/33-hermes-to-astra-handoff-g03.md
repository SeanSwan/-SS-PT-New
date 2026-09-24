# 33 — Hermes -> Astra handoff: G03 complete, G04 next (2026-09-07)

Current amendment: read [34, hostile review/repair evidence](34-astra-hostile-review-and-repairs.md) and [35, premium Luna Extra High / Astra workflow](35-luna-astra-review-loop.md). The receipt below is preserved handoff history, not current approval or deployment proof.

Comprehensive handoff report from the Hermes (Gwen) lane to the Astra lane.
Everything in this report is receipt-backed; logs live at the cited `/tmp`
paths (WSL `/tmp` — copy to your lane's evidence dir if you outlive that tmp).

## 1. Campaign state at handoff

| Slice | Scope | Status |
|---|---|---|
| G01 / S4 | Truthful proposal results + recovery (intent/atomic/readback) | Historical G01 frontend 33/33; actual PG gates were 24 + 13 + 15. Current repaired evidence in 34. |
| G02 / S1–S2 | Producer/focus/generation parity + stored confirmation projection | IMPLEMENTATION VERIFIED — FE 152/152, shell 17/17, TSC 0, BE unit 84/84, BE API 18/18, prod build clean; receipts frozen in doc 31 |
| G03 / S3 | Task-UUID + stable requestKey idempotency (staff workout-drafts endpoint) | **IMPLEMENTATION VERIFIED — this handoff** |
| G04 / S6 | Session Desk reconciliation + shared shell draft UI | NEXT — see §6 |
| G05–G11 | Per the fixed build-order table in doc 31 | remaining |
| Hostile review | GLM 5.3 (primary) + GLM 5.3-flash (secondary), Sean-confirmed, after G11, iterate until dry | pending Sean's Z.ai spend approval |

Lane: owned worktree
`C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/tmp/worktrees/swan-coach-astra-owned-20260906`
(WSL `/mnt/c/Users/.../SS-PT/tmp/worktrees/swan-coach-astra-owned-20260906`),
branch `codex/swan-coach-astra-owned-20260906`, HEAD `b88dd9e5` (G01–G03 work
is UNCOMMITTED on the worktree — commit with scope or leave for the next
builder; the ~14k dirty entries include pre-existing SS-PT state, do not
blind-clean).

## 2. What G03 implemented (the slice you are inheriting as GREEN)

Staff endpoint `POST /api/coach/proposals/workout-drafts` on the existing
`coachProposalRoutes` router:

- New service `backend/services/ai/coachWorkoutDraftRequestService.mjs`:
  validates `{schemaVersion:1, taskId, requestKey, draftRevision,
  targetUserId, workout}`, UUID-checks taskId/requestKey, nonnegative safe-int
  revision, positive safe-int target, strict workout + allowlisted session
  fields (duration/intensity/title/notes/source), entry gate
  `COACH_VERIFIED_WORKOUTS_ENABLED === 'true'` (no legacy fallback), actor
  from auth, current target access check, task metadata stored in encrypted
  reviewed input, delegates to the shared `createCoachActionProposalDraft`.
- Shared path extension: `persistCoachActionProposal` (in
  `coachWorkoutIntentDraftService.mjs`) now accepts a `requestKey` and dedupes
  INSIDE its transaction: pre-read by (actorId, requestKey); same normalized
  hash -> existing proposal returned idempotently; changed hash -> 409
  `WORKOUT_DRAFT_HASH_MISMATCH`; race loser (row appeared after pre-read)
  re-reads and recovers the authorized winning record.
- `coachActionProposalService.createCoachActionProposalDraft` accepts +
  forwards `requestKey`; the AI-generated path still mints a fresh UUID
  (compat preserved).
- THE KEY FIX (shared code — this is why the no-regression gate matters):
  `coachWorkoutLibraryResolver.resolveClientLibraryExercises` is now PURE.
  `exerciseInstanceId` = caller-provided id if present, else
  `deterministicInstanceId(lookup, index)` (createHash-derived; the old
  `randomUUID()` import was removed). Before this, 20 concurrent creates of
  one logical workout minted 20 different instance UUIDs -> 20 different
  normalized hashes -> 19 race losers got `WORKOUT_DRAFT_HASH_MISMATCH`.
  Unit tests masked the bug (mock resolver returns stable ids); only the PG
  20-way race caught it. One raw-hash formula over the normalized payload is
  now identical across create, review (`assertWorkoutIntentInput`), commit
  (`startWorkoutIntent` re-resolve + `stableStringify` equality) and
  promotion. The strict validator accepts arbitrary identifiers <=128 chars,
  so non-UUID instance ids are valid.
- `normalizeSessionFields` is exported from the draft service; the request
  service imports the same function (no divergent copy).

Files touched (SHA-256, compute these to prove preservation before G04):

```
94020b898cb588ce716d73b9fd1ad8c7476f5fec4a5c30b5f4c9950ad6c121d6  backend/services/workout/coachWorkoutLibraryResolver.mjs   (PATCHED)
81081b1bc4303e519f1d9fadfd6c00813e99fe12805674cf67c21e4c8267c36d  backend/services/ai/coachWorkoutIntentDraftService.mjs    (PATCHED)
9eadccc0b530eea5c943fe8b87554ad72d0d879c1d2195af2108af4769f08933  backend/services/ai/coachActionProposalService.mjs        (PATCHED)
130700a26792baf89609ed8d1c6d96ed7107ccd29734cd8b1c8397e5d30e9498  backend/services/ai/coachWorkoutDraftRequestService.mjs   (NEW)
ccb8d4875ac599e49106b39e374cafd7927a5ce972ad11a5dc5f23fc6d08cbaf  backend/routes/coachProposalRoutes.mjs                    (PATCHED)
577fd93c5483620a766a4ccb8887abc3c5b89751731e3311578c0d7d82bcda59  backend/tests/unit/coachWorkoutDraftRequest.test.mjs      (NEW)
921e4e541aa1c9902079acad11c3f47e959215c85a0ca09b3ea886330feabf4e  backend/tests/api/coachWorkoutDraftRoute.test.mjs         (NEW)
9d3e6acb54ca0cc2b0a5f3cf9d2b505920d2afeebd01d8a4bdc57969ba551bb2  backend/tests/integration/coachWorkoutDraft.postgres.test.mjs (NEW)
a4738e8c75c82f51cb32508b9bb652b863029d218606a1e7d8960311a4a6963a  backend/tests/helpers/coachWorkoutDraft.postgres.config.mjs   (NEW)
```

## 3. G03 verification receipts (all local, none deployed)

Run from the worktree `backend/` directory. All use disposable PG on port
15433 (`SWAN_COACH_TEST_PORT=15433`), trust auth, db `coach_test_20260906`
in container `swan-g01-disposable-pg-20260906`.

| Gate | Result | Log |
|---|---|---|
| G03 PG gate (T11–T16, T46) | **7/7 GREEN, exit 0** | `/tmp/swan-g03-pg-run10.log` (RED->GREEN trail: run4–run9) |
| G03 unit (request service + route) | **14/14 GREEN, exit 0** | `/tmp/swan-g03-green-unit6.log` |
| Scoped no-regression (11 frozen unit + 3 frozen API + 2 G03 suites) | **116/116 GREEN, exit 0** | `/tmp/swan-g03-final-scoped.log` |
| G01 PG: intent | 24/24, exit 0 | `/tmp/swan-g03-verify-pg2-Intent.log` |
| G01 PG: atomic | 13/13, exit 0 | `/tmp/swan-g03-verify-pg2-Atomic.log` |
| G01 PG: readback | 15/15, exit 0 | `/tmp/swan-g03-verify-pg-Readback.log` |
| G03 PG (in combined run) | 7/7, exit 0 | `/tmp/swan-g03-verify-pg2-Draft.log` |

Canonical commands:

```
# PG gate
SWAN_COACH_TEST_PORT=15433 node node_modules/vitest/vitest.mjs run \
  --config tests/helpers/coachWorkoutDraft.postgres.config.mjs

# G03 unit+route
node node_modules/vitest/vitest.mjs run --reporter=verbose \
  tests/unit/coachWorkoutDraftRequest.test.mjs tests/api/coachWorkoutDraftRoute.test.mjs

# Scoped combined (exact file list) — full command in /tmp/swan-g03-final-scoped.log
```

### Contract corrections discovered during G03 (bake these into any new PG tests)

1. `availableSessions` is a VIRTUAL model field — no physical column on
   `"Users"` (raw insert -> `42703`). Omit it from raw-SQL fixtures.
2. `coach_intents` stores camelCase columns: raw SQL must quote
   `"requestKey"` or PG folds to lowercase and misses rows.
3. `client_trainer_assignments` has NO cascade FK from `Users`:
   `TRUNCATE "Users" CASCADE` does not clear it. Explicit
   `TRUNCATE client_trainer_assignments` in `beforeEach`, else stale rows
   collide with `idx_unique_active_client_trainer`
   (`clientId, trainerId WHERE status='active'`).
4. T14 crash-after-claim: the workout writer's claim
   (`startWorkoutIntent` -> `executing`) runs INSIDE the same domain
   transaction as the write, so a crashed write rolls the claim back to
   `awaiting_approval`. The generic `claimed -> unknown` CAS
   (`markCoachIntentUnknown`) belongs to non-workout command paths. Do not
   assert `unknown` for a crashed workout write.
5. Migration import names are 14-digit timestamps on disk
   (`20260904000000-...`, `20260906000000-...`); copy them exactly from
   `migrations/` — a one-digit typo fails collection.

## 4. Environment gotchas that will bite the next lane

- **9p/WSL mount**: `git status --porcelain` full-scan times out (exit 124);
  use `GIT_DIR=.../.git/worktrees/swan-coach-astra-owned-20260906
  GIT_WORK_TREE=<worktree>` + `git diff --name-only`. Python3 heredocs stall
  (exit -1) — use Node. Recursive `grep -r` can silently return empty —
  scope it. Long vitest runs: launch background + poll; a foreground tool
  timeout does NOT kill the process.
- **Full-suite runs on this mount are wall-clock traps**: the default
  ~1242-file run produced 42 file-level failures — mostly 30s test/hook
  timeouts (transform ~800s, import load ~15000s) plus a minority of
  non-timeout assertion failures in non-frozen files (mediaSyncAudioExtract,
  renderAgentClassification). Within the frozen gates, only A13
  (destructiveOperationsAdversarial) failed, as a 30s timeout; it passes in
  the idle 116/116 scoped run. Verify with the canonical scoped commands,
  not the full-suite wall clock; reserve a clean full-suite proof for G11 on
  a native-FS checkout.
- **Vitest reporter**: the config's custom `html` reporter ERR_LOAD_URLs on
  this mount; always `--reporter=verbose`.
- **Concurrency OOM**: running tsc/heavy suites concurrently with vitest
  workers OOMs; PG gates under a heavy unit run fail with 30s HOOK timeouts
  (that is what happened to the intent/atomic gates on first verification —
  all pass on idle machine).
- Docker binary (if the disposable PG container died):
  `/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe` (not on WSL
  PATH).
- No credentials were written to any test/log file: trust auth on loopback,
  providers mocked, signing key only in `tests/setup.mjs`.

## 5. What was NOT done (do not claim otherwise)

- G04–G11 untouched (Session Desk, provider boundary, speech lifecycle,
  evidence/metrics, 24 domain adapters, memory, proactive worker, release
  audit).
- Nothing committed, pushed, deployed, migrated, or sent; no provider spend.
- The historical full-suite run had 42 file-level failures, including both timeouts and genuine assertion failures. They are not all environmental; each still requires triage and clean G11 evidence. Raising timeouts alone is not a fix.
- Current review uses its own disposable PostgreSQL container bound explicitly to 127.0.0.1:15434. The inherited 15433 container was observed bound to all interfaces despite this handoff's loopback description; this task did not reconfigure the other agent's container.
- Packet 31's G02 prod-build citation predates the repo relocation to
  `@Everything/` (build was verified at the old mount; same HEAD/branch) —
  non-blocking, but re-run `vite build` from the new mount in G04 if you
  want a fresh citation.

## 6. Exact next slice for Astra: G04 / S6

Per doc 31 build-order: reconcile earlier Session Desk and root UI
refinement, then implement the shared shell-owned draft, editable canonical
rows, Logger bridge, receipts timeline, Floor Mode, target-switch choices
and all UI states. No copied parallel draft store. The Session Desk vision
section of doc 31 (Direction B/C, layout grid, state ownership rules,
design-law) is the spec. Start by re-running the G02 frontend baseline
(152/152 across 11 files) to confirm the FE tree is still green at the new
mount, then RED-freeze the G04 suites per doc 31/32 before implementing.
Recompute the §2 SHA-256 fingerprints first to prove G03 preservation.

## 7. Hostile review protocol (after G11)

GLM 5.3 (primary) AND GLM 5.3-flash (secondary) — Sean-confirmed
2026-09-07, "glm 5.3 not 5.2". Both seats iterate on the finished G04–G11
work until no new findings, then fixes, then re-verify. Z.ai egress:
`GLM_API_KEY` against `https://api.z.ai/api/paas/v4/chat/completions` —
NOT OpenRouter, NOT `/api/v1` (that is the panel-seat-egress runbook).
External spend requires Sean's scoped approval.
