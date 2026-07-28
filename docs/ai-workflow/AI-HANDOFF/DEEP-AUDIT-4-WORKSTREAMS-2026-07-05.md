# DEEP AUDIT — Gamification · Dashboard · Dynamic Sessions · Marketing Command Center (2026-07-05)

> **Purpose.** Sean hit `.git` write failures this session and couldn't push some work. This is the
> forensic accounting of **what's fixed (deployed), what's broken (live or half-built), and what
> loose ends remain — so nothing is left behind.** Produced by 5 parallel read-only audit agents +
> direct git forensics. Doubles as the **AI Village 15-brain input packet** (Healer-Lens framing at §9).
>
> **Method.** Every claim is `[VERIFIED]` by `git show`/`git diff`/`git log`/grep against a named ref,
> unless tagged `[LIKELY]`/`[HYPOTHESIS]`/`[UNKNOWN]` (Rule 51). No files were modified during the audit.
> Runtime/prod-DB claims are `[LIKELY]`/`[HYPOTHESIS]` — this was a read-only checkout with no DB/env access.
>
> **Refs.** `origin/main` @ `8408a06cf` = DEPLOYED production truth (Render auto-deploys from `main`).
> `origin/wip/handoff-2026-07-05` @ `80af9c3e5` = main + ONE snapshot commit preserving gamification
> sub-slice-2 + marketing/specials (49 files). This desktop checkout HEAD `40791570a` is **132 commits
> behind** origin/main and dirty.

---

## 0. THE GIT PICTURE (why pushes failed, and what is / isn't at risk)

**Root cause of the push failures:** the local `.git` was OS write-locked (`Invalid argument` on
Windows; Codex saw the same as `Incorrect function` on the `D:` laptop tree). Cause = an
antivirus / OneDrive-Dropbox sync / IDE Source-Control panel holding `.git`. The prior session
worked around it by committing through the **GitHub REST API**, which is why deployed work still
reached `origin/main`. **Git writes DO work on this desktop right now** (verified via tag probe).

**Three buckets — where every piece of work lives:**

| Bucket | Where | Status | Risk |
|---|---|---|---|
| **A. Deployed** | `origin/main` | Live on Render | Safe |
| **B. Preserved-but-undeployed** | `origin/wip/handoff-2026-07-05` (49 files) | gamification sub-slice-2 (half-built) + marketing/specials | Safe on the branch; NOT deploy-ready |
| **C. NEVER-COMMITTED-ANYWHERE** | this working tree ONLY | 178 files / ~20,700 LOC Comms/Notifications platform + bridge edits | **LOSS RISK — exists on no ref** |

**Bucket C is the one true "left behind" danger.** Verified with `git log --all -- <file>` returning
empty for every file. A `git clean -fd` (deletes the untracked half) or `reset --hard`/`checkout .`
(reverts the modified "bridge" files that import them) **permanently destroys it**. A *partial*
commit (bridges without the new files, or vice-versa) crash-loops Render with `ERR_MODULE_NOT_FOUND`
(Rule 42 class). See §5.

> **Note on the raw counts.** `git ls-files --others` shows ~467 untracked, but **175 of those already
> exist byte-identical on `origin/main`** (shipped Challenges/Equipment-Scan/Content-Studio features that
> only *look* untracked because local HEAD is 132 behind — they resolve cleanly on sync). The genuine
> never-committed body is **178 files** (Agent 5, per-file `git log --all` verified).

---

## 1. GAMIFICATION

### ✅ Fixed & deployed (origin/main)
- **Power XP curve is live and correct.** `pointsForLevel(L)=floor(80·(L-1)^1.6)` with an exact inverse
  `calculateLevel` (`backend/utils/levelingAlgorithm.mjs:15-16,185-199`), frontend mirror
  (`frontend/src/types/gamification.ts:9-10`), and a **backend↔frontend parity test guard**
  (`backend/tests/unit/levelingAlgorithm.test.mjs:83-114`) preventing formula drift. `[VERIFIED]`

### 🔴 Broken — LIVE IN PRODUCTION
- **Spending points lowers your level and rank title, right now.** Level/tier are still derived from the
  **spendable wallet balance** (`user.points`), not lifetime-earned XP:
  `GamificationPointsService.mjs:245-246`, `awardWorkoutXP.mjs:182-183`, `gamificationController.mjs:2899-2900`.
  A `spend`/`expire`/admin-deduction lowers the balance → lowers `user.level` → demotes rank title.
  There is **zero `lifetimePointsEarned` on origin/main** (grep = 0 hits). `[VERIFIED]`

### 🟡 Half-built fix (preserved on wip, NOT deployed) — with a design flaw
Sub-slice-2 (decouple level from balance) is ~60% done on `origin/wip/handoff-2026-07-05`. **DONE:**
migration adds `lifetimePointsEarned`+`leaderboardOptIn`, `User` model fields, service derives level from
lifetime (monotonic — spending can't lower it, verified via `validateAward` rejecting `points<1`),
`awardWorkoutXP`+`recordWorkoutCompletion` consume ledger `newLevel/newTier`.

**STILL TODO (7 items) — and one is aimed at the wrong target:**
1. **⚠ Leaderboard fix targets DEAD CODE.** The plan edits `gamificationController.getLeaderboard`, but
   that method is **orphaned** — only referenced by the unmounted `gamificationRoutes.mjs`. The **LIVE**
   leaderboard is `progressController.getLeaderboard` (`progressController.mjs:346`, mounted via
   `gamificationV1Routes.mjs:106`), still balance-tainted. **As written, this fix ships a no-op.** `[VERIFIED]`
2. Profile endpoint + `getEffectiveGamificationLevel` still read `user.points` (`gamificationController.mjs:1074`,
   `gamificationRankTitles.mjs:24`) → rank-title eligibility still drops on spend.
3. `workoutLeveledUp` computed but **not returned** in the workout-completion response (`gamificationController.mjs:2907` vs response `:3067+`) → no level-up celebration.
4. Frontend still maps from `points` (`useGamificationData.ts:167`, `gamificationMappers.ts:207,262`).
5. **Missing level/tier backfill script.** The migration backfills the *column* but nothing recomputes
   existing users' `level`/`tier` (SQL can't invert the power curve). Deploy without it = **every existing
   user "violently snaps"** to a stale level (the AI Village explicitly warned this). File does not exist. `[VERIFIED]`
6. **Tests currently FAIL** — `awardWorkoutXP.test.mjs` mocks return only `{pointsAwarded,newBalance}`; new
   code expects `newLevel/newTier` → assertions fail. Branch can't pass Tier-A as-is. `[VERIFIED]`
7. Deferred F-06..F-15 (point expiration, WCAG bar, wearable XP, quests, FHIR) — intentional follow-up.

### 🧵 Other loose ends
- **Unmerged IDOR fix:** `origin/claude/remove-dormant-gamification-routes-20260705` (2 commits ahead)
  deletes the dormant `gamificationRoutes.mjs` — a "missing-ownership IDOR landmine" (write routes like
  `/record-workout` lack `authorizeOwnerOrAdmin`). Not on main. Landing it also removes the orphaned
  leaderboard method → **do the leaderboard re-target (item 1) FIRST** so the fix isn't deleted with it. `[VERIFIED]`
- **Local-only, will be LOST if not pushed:** `codex/gamification-local-hold` @ `9999e81b1`
  (`fix(gamification): reject malformed ledger counters`) exists on no remote. `[VERIFIED]`
- `[HYPOTHESIS]` deploy-safety: code without migration → `user.lifetimePointsEarned` is `undefined` →
  confirm `normalizeBalance(undefined)===0` before any deploy.

**Deploy contract:** migration → decoupled code → **level/tier backfill script** must ship **atomically**.

---

## 2. MARKETING COMMAND CENTER + SPECIALS

### ✅ Fixed & deployed (origin/main)
Readiness Cockpit (Slice 1, `cec1d21d6`), Campaign spine + model + migration + admin CRUD (Slice 2),
Campaign Manager UI (3a), Campaign↔Calendar `campaignId` link (3b), server-side `hot`/`followupsDue`
lead filters (LCC-1), nurture pre-arm + attribution (earlier). Batch `5ce21ea0c` = 24 files, +1535/−30,
incl. 4 test suites. `MarketingCampaign` association registration is **correct** (`associations.mjs:214/421/532/1321-1323/1516`). Main is internally consistent — **checkout/billing on main is SAFE.** `[VERIFIED]`

### 🔴 Systemic infra bug (Codex REVISE — VERIFIED and WORSE than reported) — reaches the payment path
- **(a) Migrations fail OPEN at two layers.** `safe-migrate.mjs:189` marks a *genuinely failed* migration
  as "completed" in `SequelizeMeta` (never retries), then exits `0` regardless of failures (`:194-206`) —
  so `render-start.mjs:83`'s "non-fatal" catch never even fires. **A real schema failure is silently
  swallowed and the server boots anyway.** `[VERIFIED]`
- **(b) `.mjs` migrations are NEVER discovered/run.** `safe-migrate.mjs:118-122` globs only `.cjs/.js`;
  sequelize-cli itself (`node_modules/sequelize-cli/lib/core/migrator.js:52`) matches only `.cjs/.js/.cts/.ts`
  — **not `.mjs`.** So:
  - `20260516000100-create-marketing-calendar-items.mjs` never runs → the campaign↔calendar link's base
    table exists on prod **only** via the model-sync fallback (`syncDatabaseSafely`).
  - **`20260520000001-add-payment-idempotency-unique-indexes.mjs` — the migration that prevents DUPLICATE
    STRIPE CHARGES — is also `.mjs` and also never runs via the migration path.** It too depends on the
    sync fallback. **All 32 `.mjs` migrations share this fate.** `[VERIFIED]`
  - The sync fallback is gated: `shouldRunProductionDatabaseSync()` returns true unless
    `STARTUP_DATABASE_REPAIR==='false'`. **If that env is ever set to `false`, both the marketing calendar
    schema and the payment-idempotency indexes silently vanish.** `[VERIFIED code; prod env UNKNOWN]`
  - Misleading comments (`safe-migrate.mjs:10/188/204`) claim `sync({alter:true})` handles schema in prod —
    it does **not** (that path is dev-only). The false comfort is what let this ship. `[VERIFIED]`

### 🟡 Specials money-path system — coherent, but 100% uncommitted (wip-only) & entangled
A defense-in-depth special-offer redemption engine (`specialOfferService.mjs` +317, admin-specials UI,
`YourSpecialCard.tsx`, migration `20260704000000`) with fail-closed re-verification before Stripe
(`v2PaymentRoutes.mjs` +22, 503 if unverifiable) and redemption recording in the grant txn
(`SessionGrantService.mjs` +16). **All wip-only, none deployed.** Two half-deploy hazards:
- `storeFrontRoutes.mjs` filters on `isSpecialOffer` — deploying it **without** migration `20260704000000`
  **500s the entire public storefront** (`column "isSpecialOffer" does not exist`). `[VERIFIED]`
- `customPackageRoutes.mjs` **top-level** `import specialOfferService` — deploying without the service
  crashes route load / boot. `[VERIFIED]`
- The wip commit **also carries the half-built gamification sub-slice-2**, so **wip cannot be deployed
  wholesale.** The specials set must be split onto its own branch, shipped *with* its migration, money-path reviewed.

### 🧵 Loose ends
- **Codex's REVISE debate file exists NOWHERE in the repo** (`OPUS-CODEX-DEBATE-MARKETING-OS-BATCH-2026-07-05.md`
  was written on the dead `D:` tree). The verdict isn't captured in-repo — re-materialize it. `[VERIFIED absent]`
- `[HYPOTHESIS→verify on prod]` confirm `marketing_calendar_items.campaignId` + payment-idempotency indexes
  actually exist on the deployed DB, and that `STARTUP_DATABASE_REPAIR` isn't `'false'` on Render.

---

## 3. DYNAMIC SESSIONS / SCHEDULE  (healthiest workstream)

### ✅ Fixed & deployed (origin/main)
- **AI scheduling co-pilot is safely advisory-only by default.** `backend/services/schedule-ai/` (~2,900 LOC):
  deterministic fallback (no LLM unless env-enabled), **PII stripped before any provider payload**
  (`scheduleAiPrivacy.mjs`, Rule 8), per-tool role gates, returns a **PROPOSAL only — zero DB writes on the
  AI path**; write/billing proposals default OFF. Wired end-to-end (dock → `/api/schedule-ai/proposals` →
  engine → human executes via existing `/api/sessions/*`). `[VERIFIED]`
- **Billing integrity is strong:** atomic `increment/decrement` (fixes lost-update, `78553d7e7`), idempotent
  cancellation restore (at-most-one credit, txn+`LOCK.UPDATE`), 24h-grace settlement-policy gating
  (`62d5c940a`), no-pay guards swept consistently (Rule 20/58), append-only audit for **manual** grants
  (`17aa8b71d`). Session-status enum `assigned` added idempotently (`ab02f0eb0`); no code references a
  status outside the enum. `[VERIFIED]`

### 🟡 Fully built but GATED OFF (activation decision, not broken code)
- The **auto-settlement/deduction worker** (`sessionSettlementWorker.mjs`) is complete, tested, and wired
  into boot — but no-ops unless `SESSION_SETTLEMENT_WORKER_ENABLED==='true'`. Whether it's flipped on Render
  is `[UNKNOWN]`.

### 🔴/🟡 Findings to close BEFORE enabling the worker
- **[MEDIUM] Forensic asymmetry:** the *automatic* deduction path and cancellation-restore write only
  `session.notes` markers — **not** `AdminAccountAuditLog` rows (only *manual* grants do). Close this before
  enabling auto-settlement. `[VERIFIED]`
- **[LOW/latent]** Auto-settlement only fires for `attendanceStatus∈{present,late}`; if attendance is rarely
  captured, the worker silently no-ops. Verify attendance capture is actually used.
- **[LOW]** `processSessionDeductions` holds `FOR UPDATE` locks across the whole backlog in one txn — chunk at scale.

### 🧵 Loose ends
- Money-path edit on wip: `SessionGrantService.grantSessionsForCart` +16 lines records special-offer
  redemptions — depends on the uncommitted specials service + migration. Ship as a unit or drop (see §2).
- Stale/absorbed branch `origin/upgrade/schedule-ops-slice-1-auto-settlement` (empty diff vs main — hygiene delete candidate).
- Unmerged `7ea55256b feat: schedule companion events from ledger entries` (companion feature) — scope decision.

---

## 4. DASHBOARDS (user · client-hub · admin · trainer · progress)

### ✅ Fixed & deployed (origin/main)
- **User dashboard:** stats ticker + feed enrichment (full-post nature cards), smart-cover carousel + editor
  dock, themeable background studio / swan catalog / shared role-home backgrounds, quick-stats gold framing,
  home-action prioritization. **Real data path** (no-mock contract tests enforced). `[VERIFIED]`
- **Client Hub:** Training tab collapsed 7 sub-tabs → **3 workflow modes** (Today/Plan/History&Inputs) with the
  7 legacy `trainingSection=` IDs preserved as deep-link contract (`6e7b7da94`); roster status filters; Body Map
  evidence uploads (PR #18). **Trainer parity:** `/dashboard/trainer/clients` mounts assigned-roster-only
  workspace with admin controls hidden (`3f4808d56`). `[VERIFIED]`
- **Progress:** truthful chart insight layer across ALL cards + `AdminBodyCompPanel` from real
  `body_measurements`/`daily_macro_logs` (`3d1e636d7`); progress-pulse endpoint + deterministic coach
  next-best-action reading real `workout_logs` (`93d17838e`); chart-point→workout drill-downs. `[VERIFIED]`
- **Admin:** command-center overview refactor (`fb6b173fa`); theme system (brand-token RGB bridge, +10 themes,
  38-theme WCAG floors, curated picker). `[VERIFIED]`

### 🔴 Broken / live data-truth & safety gaps
- **[P0 money path] Client Hub billing toggle:** `SettingsTabContent.tsx:66` flips `sessionBillingMode` with
  **no confirm dialog**, zeros `availableSessions` **client-side only** (client/server drift), and the backend
  writes **no `AdminAccountAuditLog` row**. Backend audit-log fix is **written but UNPUSHED** on branch
  `claude/admin-client-audit-log-20260705 @ 3c663de21`. `[VERIFIED]`
- **[P0 data-truth] FormAnalysis:** rendered with **zero props** (`BiometricsTabContent.tsx:218`) → shows the
  *viewer's* data, not the selected client. `[VERIFIED]`
- **[P0/HIGH white-screen] Admin Progress deck:** `AdminProgressChartsGrid` has **no `SafeChart`/`ErrorBoundary`/lazy**
  — one bad datapoint can blank the Progress tab (violates the "never eagerly load full gallery" rule). `[VERIFIED]`
- **[data-truth] Admin Overview tiles show placeholders as fact:** always "Phase 1", Revenue "$0", Achievements
  "0", permanent "Loading…" on fetch failure (`OverviewTabContent.tsx:92,158-159,195`). `[VERIFIED]`
- **[HIGH auth] `/api/admin` router-order shadow gate:** `adminClientRoutes.mjs:290-291` `authorize(['admin'])`
  403s all `/api/admin/*` for trainers, killing `authorize(['admin','trainer'])` grants → trainer History&Inputs
  + ROM card are HIDDEN as a workaround. Rule-55 supertest probe required before fixing. `[HYPOTHESIS→probe]`
- **[HIGH multi-tenant]** `/api/macros/client-timeline` reads `userId` from query, **not assignment-scoped** —
  any trainer can query any user's timeline (`dailyMacroRosterTriageRoutes.mjs:95,173`). Pre-existing. `[VERIFIED]`
- **[non-functional]** `TrainerVideosPage.tsx:250` upload button = `console.warn('TODO')`.

### 🟠 Canonical-vs-legacy ambiguity (ties into §5)
`EnhancedAdminClientManagementView.tsx` (2182 LOC monolith + children `ClientProgressDashboard`,
`CommunicationCenter` 1445 LOC, etc.) is **NOT mounted by any live route/JSX** — yet the never-committed
Communications workstream (§5) was wiring an admin Moderation tab **into** its `CommunicationCenter` child as
"the canonical admin comms surface." **Genuine canonical/legacy conflict — needs a Rule 26/27 receipt before
the Village treats the monolith as live or dead.** `[VERIFIED]`

### 🧵 In-progress / paused (from `claude.lane.md`)
- **Admin photography deals-gallery restore loop — IN PROGRESS** (SESSION-T, `🔒 EDITING NOW`): the admin gallery
  UPLOAD UI (`AdminGalleryManager`, 1921 LOC) is **archived** (host `UnifiedAdminRoutes` archived 2026-05-15,
  never migrated) — "that's why Sean hasn't seen it." Backend `/api/admin/gallery/*` is LIVE. Batch "download all"
  MISSING; print-store DORMANT (Stripe fulfillment webhook absent).
- **2 open Codex hostile-review REQs** on the shipped Client Command Center arc (`review-queue.md`).
- **Codex Rule-46 review gap on the ENTIRE user-dashboard M7+N series** (never hostile-reviewed).
- Pre-existing test flakes (disclosed, verified on clean main): `ClientWorkoutPlansPanel.homework`,
  `ClientTrainingCommandBar` (×2), `MyClientsView.clientCardAccessibility`.
- **No live browser/Playwright pass was run** — all dashboard claims are static (git-show + grep); responsive/a11y unverified at runtime.

---

## 5. THE NEVER-COMMITTED COMMUNICATIONS / NOTIFICATIONS PLATFORM  (⚠ loss risk)

**178 files / ~20,736 LOC** (101 prod / 77 test — near-1:1, disciplined TDD). Exists on **no ref anywhere.**
Near-complete, coherent full-stack vertical, **wired end-to-end** via modified-tracked "bridge" files that are
**themselves uncommitted** (`notificationRoutes.mjs`, `messagingController.mjs`, `associations.mjs`,
`models/index.mjs`, `socket/socket.mjs`, `store/slices/notificationSlice.ts`, `MessageThread.tsx`).

| Category | Files |
|---|---|
| Messaging-Governance (safety/moderation/attachments/actions/coach-intel) | 42 |
| Notification-Preferences / Center | 31 |
| Notifications-Delivery (orchestrator, retry queue+worker, ledger, policy, snooze, grouping) | 27 |
| Admin-Gallery-UI (the SESSION-T restore) | 16 |
| HomeFeed-Focus | 13 |
| Admin-Broadcast / Delivery-Health | 13 |
| Communications-Audit (append-only) | 11 |
| BodyMap pain-insights | 8 |
| Feature-Access catalog | 3 |
| Other contract/tests | 14 |

- **6 genuinely-uncommitted migrations** (`notification_deliveries`, `communication_audit_logs`, `message_saves`,
  + columns on `notifications`/`messages`). **All non-destructive on `up()` and idempotent** (guards +
  `IF NOT EXISTS`). Nit: `080000` lacks the `tableExists` pre-guard its siblings have. FKs → `"Users"` (correct casing).
  (3 other "untracked" migrations — content-projects/challenge-submissions/equipment-scan — are **byte-identical
  to origin/main**, not collisions.) `[VERIFIED]`
- **No collision** with shipped features; the 6 create/alter *different* tables. `[VERIFIED]`
- **Security/PII sound (spot-check):** coach-intelligence briefs built **client-side only** (no LLM calls, Rule 8);
  audit log stores **IDs only**, append-only, fail-soft, no message body; moderation uses parameterized SQL +
  allowlists + bounded limits. **Watch item:** `metadata` JSONB is free-form — review the 8 `recordCommunicationAudit`
  call-sites to confirm no content/PII leaks in. `[VERIFIED spot-check; tests UNVERIFIED — not executed]`

### ⚠ Two acute hazards
1. **Loss:** `git clean -fd` deletes the 178 untracked; `reset --hard`/`checkout .` reverts the bridge edits. Either destroys ~20,700 LOC.
2. **Crash:** a *partial* commit (bridges without the new modules) → Render `ERR_MODULE_NOT_FOUND` crash-loop (Rule 42).

**Recommendation: PRESERVE-TO-BRANCH NOW** (snapshot untracked + bridge files **together**, explicit paths, never
`git add -A` — Rule 67). Mirror the existing `wip/handoff` pattern → `wip/comms-notifications-2026-07-05`. **Do NOT
deploy from it** (6 migrations auto-run on Render build; unreviewed; tests unrun). Finish + Rule-46 review later as a deliberate pass.

---

## 6. CROSS-CUTTING SYSTEMIC FINDINGS (the ones that matter most)

1. **`.mjs` migrations never run (P0 infra, payment-affecting).** The migration runner AND sequelize-cli both
   exclude `.mjs`. All 32 `.mjs` migrations — including **payment-idempotency unique indexes** — exist on prod only
   via the gated model-sync fallback. Fix: rename `.mjs`→`.cjs` with idempotency guards (safer than widening the glob,
   since sequelize-cli can't load `.mjs` either). §2.
2. **Migrations fail open (P0 infra).** Failed migrations are marked "completed" and boot continues. §2.
3. **Gamification decoupling still live-broken in prod** — spending demotes level/rank. §1.
4. **Two P0 money/data-truth dashboard bugs** (billing toggle, FormAnalysis) + a white-screen risk. §4.
5. **20,700 LOC exists on no ref** — preserve before any tree reset. §5.
6. **Canonical/legacy ambiguity** between the unmounted admin monolith and the uncommitted comms surface. §4/§5.
7. **Verification gaps to honor (Rule 51/55/56):** no live browser QA; several fixes are `[HYPOTHESIS]` pending a
   supertest/DB probe; the comms platform's 77 tests were inventoried, not executed; full-repo Tier-A baseline UNVERIFIED.

---

## 7. CONSOLIDATED SCORECARD

**FIXED & DEPLOYED:** gamification curve+parity · marketing readiness/campaign/calendar/lead-filters · AI
schedule co-pilot (advisory) + billing-integrity hardening · user/client-hub/admin/trainer/progress dashboard
suite · Hermes-OS E-slices · Fable-judge AI Village.

**BROKEN (live in prod):** gamification level-demotion-on-spend · Client Hub billing toggle (no audit/confirm) ·
FormAnalysis wrong-client · Admin Progress white-screen risk · Admin Overview placeholders-as-fact · `/api/admin`
trainer shadow-gate · macros multi-tenant leak · `.mjs` migrations never run (+ fail-open) — payment-idempotency exposure.

**LOOSE ENDS (uncommitted/unmerged):** 178-file comms platform (never committed) · gamification sub-slice-2 (half-built,
wrong-target leaderboard, missing backfill, failing tests) · specials money-path (wip-only, entangled) · unpushed
billing-audit branch `3c663de21` · unmerged IDOR-deletion branch · local-only `9999e81b1` · missing marketing debate
file · settlement worker gated off · admin-gallery restore in-progress.

---

## 8. RANKED ACTION PLAN

### P0 — do first (loss + prod safety)
1. **Preserve the 178-file comms platform to `wip/comms-notifications-2026-07-05`** (untracked + bridges together, explicit paths). Before ANY tree reset.
2. **Fix `.mjs` migration discovery + fail-open** (`safe-migrate.mjs`, `render-start.mjs`) on a clean branch off main — restores payment-idempotency + marketing schema guarantees. Verify prod DB actually has those indexes/columns + `STARTUP_DATABASE_REPAIR≠false`.
3. **Ship the Client Hub billing-toggle safety fix** (push `3c663de21` after review; add confirm; stop client-side zeroing). Money path → triangle/Village gate.
4. **Wrap Admin Progress charts in `SafeChart`/lazy** (white-screen) and **pass client props to FormAnalysis** (data-truth).

### P1 — complete the half-built fixes
5. **Finish gamification sub-slice-2 correctly:** re-target the leaderboard to `progressController.getLeaderboard`, write the missing level/tier backfill script, fix the failing tests, finish profile/frontend wiring — then ship migration+code+backfill atomically. Reconcile the IDOR-deletion branch (leaderboard re-target first).
6. **Isolate + money-path-review the specials slice** (own branch, with its migration, excluding gamification wip).
7. **Resolve the `/api/admin` trainer shadow-gate** (supertest probe first) and the macros multi-tenant scoping.

### P2 — hygiene / decisions
8. Resolve canonical-vs-legacy (`EnhancedAdminClientManagementView`) with a Rule 26/27 receipt. Decide settlement-worker activation (close audit-trail asymmetry first). Cherry-pick or drop local-only `9999e81b1`. Re-materialize the marketing debate file. Reconcile local HEAD (132 behind). Sync-safe hygiene sweep of stale branches (Rule 34). Close the 2 open Codex REQs + the M7+N review gap.

---

## 9. AI VILLAGE 15-BRAIN PACKET — "FABLE THE HEALER" LENS

This document is the input packet. When run through the Fable-judge Village
(`SWAN_VILLAGE_FABLE_CONFIRM=yes node scripts/validation-orchestrator.mjs --mode plan --document <this file>`),
prepend the **Healer-Lens mandate** to the judge context so Fable does not merely arbitrate the findings above:

> **HEALER-LENS MANDATE (Fable, every run):** Beyond the questions in this audit, scan the SwanStudios app as a
> whole — inside and outside the stated scope — for everything that can be *healed, hardened, upgraded,
> strengthened, or made more solid*: security, privacy/PII, billing correctness, data-truth, performance,
> resilience/failure-modes, accessibility, least-clicks UX, and revenue. Surface **ranked, unsolicited**
> recommendations (including things no analyst and this packet did not raise), each tied to how it makes the app
> stronger and how much value/risk it addresses. Treat the four workstreams as one system, not four silos.

(Permanent version: add a "Whole-System Healing Opportunities" section to `scripts/lib/fusion-synthesis.mjs`
`buildSynthesisPrompt` — to be done on a clean branch off `origin/main`, not this stale tree.)

---
*Generated 2026-07-05 by 5 parallel read-only audit agents + git forensics. No files modified during the audit.
All `[VERIFIED]` claims backed by `git show`/`git diff`/grep against the named ref. Prod-DB/env claims are `[LIKELY]`/`[HYPOTHESIS]`/`[UNKNOWN]`.*
