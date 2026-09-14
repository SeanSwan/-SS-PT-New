# HANDOFF — Schema-truth campaign: continue SWA-96, SWA-159, SWA-157

**Written:** 2026-08-13, closing a single long session (Opus 5 → Fable 5) · **For:** the next agent, fresh context
**Owner directive:** *"seamlessly continue"* — SWA-96 and SWA-159 as suggested, and SWA-157's build track.
**Read order for you:** this doc → the three Linear issues (each carries its full evidence trail) → nothing else before starting. Do NOT re-derive anything in §3; it is all verified evidence from live production, this session.

---

## 1. Where everything stands (all verified, all pushed, prod healthy)

| Done this session | Proof |
|---|---|
| **Waiver outage found + fixed live** (SWA-158, closed loop) | Public endpoint was HTTP 500 (observed); 5 additive columns applied after backup+rehearsal; now 200; `column-missing` 5→0 database-wide |
| **`packages` table boot-created in prod** | Was never created (hardcoded creation-order list); one-line fix; verified existing, 10 cols |
| **101 missing indexes CREATED in production** (Sean's GO, off-peak) | 101/101 in 9.9s, 0 failures, 0 INVALID; `index-missing` 112→16; `daily_workout_forms` 1→10 indexes; waiver idempotency partial unique EXISTS |
| **Drift tooling built + Kimi-hostile-reviewed (10 findings fixed)** | `backend/scripts/audit-schema-drift.mjs` (5 index classes, PG_HOST rehearsal mode), `generate-index-remediation.mjs`, shared `lib/declaredIndexes.mjs` |
| **Disposable QA Postgres + guards, FULLY GREEN** | `docker-compose.qa.yml` + `scripts/qa/qa-db.mjs` (sentinel positive-identity) + `qa-schema.mjs`: 231 models → 197 tables, 0 import-graph failures, column-level verify CLEAN |
| **Playwright crawl hardened (slices 0-1)** | Per-route isolation, crash-durable evidence, ranked worklist, expiring suppressions — `frontend/e2e/mission/` |
| **Linear works headless** | `scripts/linear-cli.mjs` (env `LINEAR_API_KEY`, persistent user var); MCP fixed to API-key auth in `~/.claude.json` |

**Everything is on `main`** (worktree `C:/tmp/ss-qa-harness-slice0`, branch `claude/qa-harness-slice0-20260811`, repeatedly fast-forwarded). The `Desktop/quick-pt/SS-PT` tree is ~1700 commits stale — never build there; its `.env` is the only one with prod credentials.

**Fresh proven-restorable backup exists:** `Z:\SwanStudios-backups\db\` newest dump, 258 tables / 6,157 rows, restore-tested, digest-matched. Re-run before any prod mutation: `node --env-file=<main-tree .env> backend/scripts/backup-db.mjs`.

---

## 2. The disease this campaign is fighting (name it in your reports)

Four **split table families** in production — a model/table pair where an old and a new incarnation coexist and different code paths hit different ones:

1. `challenges` (17 rows, cron writes) vs `Challenges` (0 rows, API reads) — SWA-96 original
2. `"Achievements"` (45 cols, 3 idx, **registered model reads this one — unindexed**) vs `"achievements"` (36 cols, 8 idx, squats on the index names) — SWA-96, added this session
3. `challenge_participants.teamId` **uuid** vs `ChallengeTeams.id` **int4** — FK impossible, teams broken-by-design — SWA-159
4. Two `ChallengeParticipant` model FILES (`models/` + `models/social/`) — glob-importing the second silently redefines the first

Plus three **hardcoded-enumeration facades** in the boot "repair" path (heals only what someone listed): `MISSING_COLUMNS` (26 entries — why waivers stayed broken), `TABLE_CREATION_ORDER` (why `packages` never existed; **107 of 164 registered models are not on it** — every new model repeats this), and a validator that compares quoted names wrong.

And six **confident-output-no-input facades** found across the session (QA report that read nothing, suppression gate wired to a log line, `/render-job` queueing nothing, etc.). When a tool reassures, check what it reads.

---

## 3. The three tasks, with ALL banked evidence

### SWA-96 — split-family canon + merge (Achievements + challenges)
**Decision needed from Sean first:** which incarnation is canon per family. Evidence to gather to FRAME that decision (read-only): row counts both sides, which routes/services read/write which table (grep + the runtime import graph), last-write timestamps. The challenges half already has it: cron→`challenges` (17 rows), API→`Challenges` (0 rows) — i.e., data lands where nobody reads.
**After canon:** data migration (backup → rehearse in QA container → blast-radius-guard → transactional apply → re-audit), then retire the loser, then the 7 Achievements indexes land (they no-op'd: Postgres index names are schema-wide; `IF NOT EXISTS` skipped because lowercase `achievements` owns the names).
**Trap:** `.mjs` models may pin either casing; Postgres folds unquoted identifiers lowercase. Never trust a name without `to_regclass` both casings.

### SWA-159 — teams uuid/int4
**Banked evidence:** `challenge_participants.teamId = uuid` · `ChallengeTeams.id = int4` · prod FK list for participants = challengeId/userId/verifiedBy ONLY · root model declares teamId UUID → matches the participant column, not the team table.
**First step:** row counts (`ChallengeTeams`, participants with non-null teamId). If ~zero real data, the migration is trivial in either direction and this collapses into SWA-96's decision batch. Repair = choose canon + migrate + add the FK. Sean-gated for the mutation.

### SWA-157 — QA harness build track (the original mission: prove trainer-logs → client-sees)
Infrastructure is DONE and green. Remaining build order:
1. **Persona seeding** — idempotent seeder for one trainer + one client on `@swanstudios-qa.local`, PLUS the trainer↔client relationship `checkTrainerClientRelationship` requires (read `backend/routes/dailyWorkoutFormRoutes.mjs:611` for the write path; mount `/api/workout-forms` at `core/routes.mjs:774`). Cleanup pattern exists: `backend/scripts/cleanup-qa-and-sessions.mjs`.
2. **Two-session harness** — two concurrently authenticated Playwright contexts (trainer + client). Nothing in the suite has this primitive; it is what makes the test genuinely cross-role (client analytics derive userId from JWT — `core/routes.mjs:474`).
3. **The journeys** — trainer POSTs a workout → assert persisted → client reads `/api/client/analytics/*` → assert the value appears. Replace the tautological `staging-write-safety.mission.spec.ts` (its guard assertions are worth keeping).
**Standing limitation to restate wherever cited:** the QA schema derives from MODELS; it proves code-vs-declared-schema, not code-vs-production-schema (rule 58).
Also open on this issue: 9 unregistered-family indexes (registry unification), 7 expression-index hand-writes (`.skipped.json` sidecar beside the generated SQL), Kimi's gated boot upgrades (drift tripwire, creation-order convergence sweep, migration reconciler), and the baseline-migration slice (Kimi verdict D→A′→C-interim→B-never in `KIMI-MIGRATION-CHAIN-VERDICT-2026-08-12.md`; A′ input = drift-audit JSON; **migrations cannot build from empty** — 367 files, none creates `Users`).

---

## 4. Environment map + commands (PowerShell-safe; Sean's shell has no `&&`)

- **Worktree:** `C:/tmp/ss-qa-harness-slice0` — work here. Rebase onto `origin/main` before pushing; push = deploy (Render, paid plan).
- **QA container:** `docker compose -f docker-compose.qa.yml up -d` → `node scripts/qa/qa-db.mjs bootstrap` → `assert`. Port **15433** loopback (55433 is Windows-reserved; 5432 is dev PG). Schema: `node scripts/qa/qa-schema.mjs rebuild|verify` (writes `.qa-schema-manifest.json`). Rehearse EVERY prod-bound statement here first.
- **Prod (read-only) audit:** from worktree `backend/`: `node --env-file="<REPO>/.env" scripts/audit-schema-drift.mjs --out c:/tmp/prod-drift.json`
- **Prod ad-hoc read-only queries:** same env-file pattern, import `database.mjs` via `pathToFileURL` — never print the credential, never `SELECT` secrets.
- **Linear:** `node scripts/linear-cli.mjs whoami|list|search|create|comment` — ALWAYS `search` before `create`; bodies via `--body-file`. If MCP tools are absent, this CLI is the path — never report the board blocked.
- **Boot behavior (verified):** prod boot runs additive `createMissingTables` (hardcoded list) + `addMissingColumns` (hardcoded list); mutative ALTER is OFF (`STARTUP_SCHEMA_ALTER`, keep it off — 2026-08-04 review comment in `productionDatabaseSync.mjs:339` is the best doc in the repo).

## 5. Non-negotiables (hooks enforce most; the rest are owner law)

Backups before any prod mutation (proven-restorable, not assumed) · rehearse exact SQL in QA first · `blast-radius-guard` skill before any DB-reaching statement · additive-only without a fresh Sean gate · closeout gates: dual-tier summary (plain-English FIRST), `DRY-LOOP: CLEAN×2 (rounds: N)` with real rounds, `PROOF:` line of executed evidence, `LINEAR: SWA-n` sync, Hermes memo (`.ai-workflow/hermes-inbox/pending/`) with a `## Mistakes I made` section — all in the FINAL message of the turn (hooks read only the last message).

## 6. Mechanical traps that burned this session (each ≥2 times)

1. **Piped exit codes lie**: never `echo $?` after `| head/tail` — five misreads.
2. **Scripted python/sed edits on escape-bearing content corrupt `\n`** — use the Edit tool; after ANY scripted edit, grep for a token that only exists if it applied.
3. **`node --check` passes on reference errors** — after a mechanical split/refactor, RUN the tool.
4. **`node -e` with top-level `await import` is ESM** — `require` is undefined; all-import style.
5. **Windows**: `spawnSync('npx.cmd')` throws EINVAL (invoke JS entrypoints with `process.execPath`); string-built `file://` breaks (use `pathToFileURL`); check `netsh interface ipv4 show excludedportrange` before binding ports.
6. **`IF NOT EXISTS` "ok" ≠ created** — verify the object exists where intended after idempotent DDL.
7. **Kimi externals**: `consult-openrouter-panel.mjs --confirm-spend` (~$0.01, huge ROI on full source); scan the packet and check the SCANNER'S exit code before sending; redact URL shapes.

## 7. Suggested skills for the next session

`lesson-recall` (first — §6 recurred against written warnings) · `blast-radius-guard` (before any SQL) · `swan-orchestrator` (pre-task gate for the SWA-96/159 slices) · `linear-todo` (board discipline) · `handoff` (when your session ends). For SWA-96 evidence-framing, plain read-only queries beat everything; for the merge itself consider `/swan-debate` if canon is genuinely contested.

## 8. Definition of done

- **SWA-96:** canon chosen (Sean), loser's data migrated + table retired, 7 Achievements indexes live, challenges cron+API on one family, re-audit clean, rollback stated.
- **SWA-159:** row counts gathered, canon chosen (Sean), types unified + FK created, re-audit shows no impossible-FK state.
- **SWA-157:** a failing-then-passing cross-role journey — trainer logs via `/api/workout-forms`, client sees it via `/api/client/analytics/*` — running against the sentinel-guarded QA stack, in CI, with honest coverage reporting.
