# Hostile Review Slam — Registry Index

> The standing list of everything awaiting a hostile review. Run a **Slam**: hostile-review
> every `OPEN` / `REVISE` entry below until zero issues remain. Protocol + rules:
> [`README.md`](./README.md). Add an entry when you ship a substantial slice — **link** the
> target, don't copy it. This file also carries a **[Parked-Work Handoff Tracker](#parked-work-handoff-tracker)**
> (Equipment / Gallery) near the bottom — merged from `origin/main`'s parallel index.

**Status legend:** `OPEN` (needs review) · `IN-REVIEW` (a pass is underway) ·
`REVISE` (issues found, being fixed) · `CLEARED` (a hostile pass found zero issues) ·
`ARCHIVED` (cleared + merged; moved to Archive).

**Owner = the agent accountable for the work** (Prove-or-Named Rule, see [`README.md`](./README.md)):
work shipped without proof of a hostile-review-to-zero-errors is auto-listed here with its owning
agent named, and that agent stays named until a hostile pass CLEARS the entry.

## Summary
| ID | Target | Owner | Status | Reviews |
|----|--------|-------|--------|---------|
| HR-008 | Gamification progression fix (level curve + progress charts) | Fable | **MERGED to main** (`d97b3ace3`) → deploying | 1 |
| HR-007 | Dynamic session pricing / specials (WIP, money path) | Fable/Codex | REVISE → **fix PR #22** (F1+F3+F4; money-path gate) | 2 |
| HR-006 | Client Command Center / trainer-clients dashboard | Fable | REVISE (1 low — owner) | 1 |
| HR-005 | Marketing OS batch (marketing command center) | Fable/Codex | REVISE (2 low — owner) | 1 |
| HR-004 | Hostile Review Slam Registry (this PR) | Claude (Opus 4.8) | CLEARED | 1 |
| HR-003 | PR #20 — companion pet security hardening | Claude (Opus 4.8) | **CLEARED** (fixed `2adc436a6`) | 1 |
| HR-002 | PR #19 — dormant `gamificationRoutes.mjs` deletion + Rule-48 audit | Claude (Opus 4.8) | CLEARED | 1 |
| HR-001 | PR #15 — Companion V2 cleanup + branch refresh | Claude (Opus 4.8) | CLEARED | 1 |

> **Slam pass 1 — 2026-07-05, Claude (Opus 4.8).** Ran a 5-target ref-based hostile fan-out (16 agents:
> 5 reviewers + adversarial verification; every finding re-checked by ≥1 independent skeptic, money/security
> findings by 2 concurring lenses). Code read via `git show <ref>:<path>` (the shared working tree is 132
> commits stale + 762 files staged — a no-write zone; C:/tmp review worktrees proved non-durable this
> session, so reads went straight to git objects). **Net: 2 HIGH (HR-007-F1 info-disclosure, HR-008-F1
> spend-lowers-level), 5 low, 1 finding killed by verification.** The two HIGH were also independently
> re-verified by the lead (Opus 4.8) — 3 concurring reads each. No CLEARED entry has a surviving finding.

> **Slam pass 1 — Fixes applied (2026-07-05, Sean-directed).** Each fix: failing-first proof + `node --check` + secret-scan CLEAN + Rule 42/20 audits; full `vitest` deferred to CI (fresh worktrees, Rule 56).
> - **HR-003 → CLEARED** — fixed on PR #20 (`2adc436a6`): `sanitizePetName` now strips C1 controls (0x7f–0x9f) + caps by code point (surrogate-safe). 13/13 algorithm proof; old code proven to leak C1 + leave a lone surrogate.
> - **HR-007-F1 → fix PR #22** (`2aefd4f24`, base `wip/handoff-2026-07-05`): `GET /api/storefront/:id` now filters `isSpecialOffer:false` (hidden specials 404 publicly; owner path via authed `/api/custom-packages/my` unaffected). **Money-path (Rule 16/50) — Codex/Fable review + fold into the clean pricing branch before merge.**
> - **HR-007 2nd-pass (2026-07-06) → +F3/F4 in PR #22** (`ec4cea804`): an independent Rule-20 sibling sweep of every `StorefrontItem` read found the F1 fix was INCOMPLETE. `sessionPackageRoutes.mjs` had the same class twice — **F3** public `GET /api/session-packages` leaked specials (no `isSpecialOffer` filter), and **F4 (money-path IDOR)** `POST /api/session-packages/purchase` had no ownership/`isSpecialOffer` guard, so any authed user could buy another client's special via that generic path (skipping `assertClientOwnsActiveSpecial` + redemption guards). Both fixed with `isSpecialOffer:false`; source-contract test extended; failing-first proven. Cleared siblings: storeFrontRoutes writes all `protect`-gated; `/api/health` returns a readiness boolean only; `isSpecialOffer` is NOT NULL default false. **Residual flagged to Codex: gut-check the other grant paths (achPayment/offlinePayment/adminChargeCard/credits) for the same ownership-guard gap — I swept the reads, not the grants.**
> - **HR-008-F1 → MERGED to main** (PR #23 `31e5c9cba` → merge `d97b3ace3`, 2026-07-06, Sean-directed): level/rank now derived from `User.lifetimePointsEarned` (not the spendable balance) across `recordLedgerEntry` + `awardWorkoutXP` + `gamificationController`; migration `20260705010000` adds the column + backfills from the ledger. Rule-20 sweep found + fixed `gamificationController:2899`; `GamificationEngine.mjs` legacy level calc flagged as a residual (left untouched per the approved design). Pre-merge due diligence: conflict-free (0 commits on the 4 modified files across an 18-commit main advance), `lifetimePointsEarned` new (no redundancy/collision), bug still live on pre-merge main, new `workoutXpAwardStep` adapter delegates to the fixed `awardWorkoutXP`. Render auto-deploy in progress (build-phase `migrate:production`); health-watched. **Residual: verify the backfill on the live DB (Rule 47 read-only launcher) once deployed.**
> - **Deferred to owners (Sean's call):** HR-005 (2 low, `leadRoutes.mjs`), HR-006 (1 low, stale comment) — recorded with exact fixes; their owning lanes clear them.
>
> ✅ **Registry unified (2026-07-06):** `origin/main`'s parallel `hostile-reviews/INDEX.md` (a `# Hostile-Review Registry` Equipment + Gallery handoff tracker) has been **merged into this file** as the [Parked-Work Handoff Tracker](#parked-work-handoff-tracker) section below, so PR #21 merges cleanly. One file now holds two indexes: the **HR-NNN Slam registry** (discrete findings → Prove-or-Named) and the **handoff tracker** (parked feature work → self-contained handoff docs).

---

### HR-001 — PR #15: Companion V2 cleanup + branch refresh
- **Status:** CLEARED
- **Owner:** Claude (Opus 4.8) — CLEARED 2026-07-05
- **Link:** https://github.com/SeanSwan/-SS-PT-New/pull/15 (branch `feature/companion-v2-goal-loop-2026-07-01`)
- **Added:** 2026-07-05
- **Why review:** removed the non-functional companion response-injection layer that was wired
  to the (unmounted) `gamificationRoutes.mjs`; refreshed the branch against `main`. Touches the
  points-award path. Confirm the per-user pet-state bridge still fires on the live v1 route and
  no dead wiring remains.
- **Review passes:**
  - [2026-07-05] Claude (Opus 4.8) Slam: **APPROVE (CLEARED)** — dead response-injection wiring fully removed (`git grep companionEventBridgeResponseMiddleware`/`companionEvents` on-branch = 0 hits). Per-user pet-state bridge still fires on the live path: `GamificationPointsService.mjs:294,299` invoke `scheduleCompanionLedgerEvents` (not merely import), `CompanionEventBridgeService.mjs:76` uses `recordActivity`. No dead wiring, no behavior change. Verified via git objects on-branch (reviewer + independent skeptic).

### HR-002 — PR #19: dormant `gamificationRoutes.mjs` deletion + Rule-48 audit
- **Status:** CLEARED
- **Owner:** Claude (Opus 4.8) — CLEARED 2026-07-05
- **Link:** https://github.com/SeanSwan/-SS-PT-New/pull/19 (branch `claude/remove-dormant-gamification-routes-20260705`)
- **Added:** 2026-07-05
- **Why review:** deletes a fully-unmounted legacy route file that carried a latent IDOR pattern,
  and rewrites its classification lock test. Confirm zero runtime consumers, no live behavior
  change, and that the rewritten test preserves the canonical-surface guard intent.
- **Review passes:**
  - [2026-07-05] Claude (Opus 4.8) Slam: **APPROVE (CLEARED)** — `backend/routes/gamificationRoutes.mjs` confirmed deleted on-branch (`git cat-file -e` → absent). ZERO live consumers: the only `import ... gamificationRoutes` hit is `masterPrompt/index.mjs:16` importing a DIFFERENT file (`./gamification.mjs`); live mount is `gamificationV1Routes` (`core/routes.mjs:414-416`); all other refs are comments / frozen migrations / deletion-asserting tests. No behavior change.

### HR-003 — PR #20: companion pet security hardening
- **Status:** REVISE (2 low — data-hygiene, non-exploitable)
- **Owner:** Claude (Opus 4.8) — accountable until CLEARED
- **Link:** https://github.com/SeanSwan/-SS-PT-New/pull/20 (branch `claude/harden-companion-pet-input-20260705`)
- **Added:** 2026-07-05
- **Why review:** adds `sanitizePetName` at the `CompanionPetService` boundary (control/XSS-char
  stripping) + rate limits on the pet mutation routes. Attack the sanitizer for bypasses; confirm
  limiter ordering vs auth, the `/pet/activity` shared-bucket decision, and no route-contract
  regressions.
- **Review passes:**
  - [2026-07-05] Claude (Opus 4.8) Slam: **REVISE** — 2 LOW data-hygiene gaps (both CONFIRMED; NOT exploitable — `<`/`>` are stripped so no stored-XSS, no crash):
    - **HR-003-F1** (low, input-validation): `CompanionPetService.mjs:41` strips C0 controls + DEL but NOT C1 controls (U+0080–U+009F), so e.g. U+0085 (NEL) survives into the stored name — contradicts the fn's "strips control characters" doc; the unit test only covers C0 (false confidence). Fix: `if (code < 0x20 || (code >= 0x7f && code <= 0x9f) || ch==='<' || ch==='>') continue;` + a C1 test case.
    - **HR-003-F2** (low, correctness): `CompanionPetService.mjs:44` final `.slice(0,50)` is UTF-16-unit-based while the sanitize loop is code-point-based → an emoji straddling index 50 is cut mid-surrogate → lone surrogate → U+FFFD on persist. Fix: `[...cleaned].slice(0,50).join('')`.
    - CLEAN: limiter ordering (auth+`authorizeResourceAccess` before limiter; key `companion:${req.user?.id||req.ip}`), `<`/`>` stripped, non-string→'', no input throws, empty sanitized name rejected (controller `:3946,4010`).

### HR-004 — Hostile Review Slam Registry (this PR)
- **Status:** CLEARED
- **Owner:** Claude (Opus 4.8) — CLEARED 2026-07-05
- **Link:** https://github.com/SeanSwan/-SS-PT-New/pull/21 (branch `claude/hostile-review-slam-protocol-20260705`) — `docs/ai-workflow/hostile-reviews/` (README + INDEX) + the `CLAUDE.md` / `AGENTS.md` `## AI Coordination` pointer.
- **Added:** 2026-07-05
- **Why review:** new cross-agent protocol. Confirm the pointer edits to `CLAUDE.md`/`AGENTS.md`
  are additive and don't collide with a rule/section; confirm the protocol is clear enough for any
  AI to run a Slam unattended; confirm it doesn't duplicate or contradict the coordination
  review-queue.
- **Review passes:**
  - [2026-07-05] Claude (Opus 4.8) Slam: **APPROVE (CLEARED)** — `CLAUDE.md` + `AGENTS.md` each get a single ADDITIVE bullet pointer to this registry (branch diff +267/-0 across 5 doc files; the pointer is a `- **…**` bullet, not a numbered rule → no rule collision). Protocol is self-contained and explicitly distinguishes itself from the ephemeral coordination review-queue (README §"Why this exists"). _(Self-review of own protocol PR — welcomes a second AI's concurring pass.)_

---

### HR-005 — Marketing OS batch (marketing command center)
- **Status:** REVISE (2 low — privileged-caller robustness, not a security breach)
- **Owner:** Fable/Codex (recent `origin/main` push — confirm owner)
- **Link:** `origin/main` @ `5ce21ea0c` "feat(marketing): Marketing OS batch — campaign spine + UI + calendar link + lead filters (Slices 2/3a/3b/LCC-1)"; related WIP on `origin/wip/handoff-2026-07-05` @ `80af9c3e5`.
- **Added:** 2026-07-05 (Sean-directed handoff)
- **Why review:** the Marketing Command Center is the #1 acquisition focus. Viciously review the campaign spine, lead filters, calendar link, and lead-capture path — authorization on admin marketing routes, input validation, secrets, PII in campaigns (Rule 8), and lead/money-path correctness.
- **Review passes:**
  - [2026-07-05] Claude (Opus 4.8) Slam: **REVISE** — authz / PII / secrets / IDOR / RBAC-test fidelity all SOLID; 2 LOW robustness gaps remain (both CONFIRMED, reachable ONLY by an already-authenticated admin/trainer → HTTP 500, not privilege escalation):
    - **HR-005-1** (low, input-validation): `leadRoutes.mjs:68` uses `sortBy` directly as the ORDER BY column with no whitelist (only `sortOrder` is sanitized) → `GET /api/leads?sortBy=notacolumn` → Sequelize quotes the identifier → Postgres "column does not exist" → 500. Not SQLi (v6 quotes it). Fix: whitelist sort columns.
    - **HR-005-2** (low, input-validation): `leadRoutes.mjs:64` `offset=(parseInt(page)-1)*parseInt(limit)` unclamped → `?page=0`→OFFSET −50, `?limit=-1`→negative LIMIT → 500. Fix: `Math.max(1,…)` clamps + numeric fallback.
    - CLEAN (file:line): campaigns `router.use(protect,adminOnly)` (`adminMarketingCampaignRoutes.mjs:20`, mount `core/routes.mjs:459`); leads `protect`+`trainerOrAdminOnly` (mount `:678`) with `assignedTrainerId` trainer-scoping on every read, admin-only DELETE, admin-only `assignedTrainerId` mutation; both `.rbac.test.mjs` assert real 403 + not-queried denial; readiness service is counts/booleans only, no secret values (Rule 8/59); migration FKs → `Users` (PascalCase); no schema drift; lead search uses parameterized `Op.iLike` (no raw SQL).

### HR-006 — Client Command Center / trainer-clients dashboard
- **Status:** REVISE (1 low — comment drift; IDOR paths confirmed clean)
- **Owner:** Fable (SESSION-Q) — confirm owner
- **Link:** `origin/main` @ `3f4808d56` "feat(trainer): mount the selected-client command workspace at /dashboard/trainer/clients" + `628233f6f` "SESSION-Q Client Command Center handoff + rule-48 audit record".
- **Added:** 2026-07-05 (Sean-directed handoff)
- **Why review:** recently-shipped dashboard/workspace. Confirm canonical-surface mount (Rule 26), per-user/role scoping (a trainer sees only assigned clients — IDOR), data-truth of the surfaced charts, and mobile/4K responsiveness (Rule 24).
- **Review passes:**
  - [2026-07-05] Claude (Opus 4.8) Slam: **REVISE** — 1 LOW (comment drift, NOT a security hole). Every IDOR path CONFIRMED server-side-scoped (the reviewer read the BACKEND routes+middleware, so verdicts are CONFIRMED not [HYPOTHESIS]):
    - **HR-006-01** (low, correctness): `trainingWorkflowModes.ts:88` comment claims the History/Inputs backend is `authorize(['admin'])`-only; actually `adminWorkoutLoggerRoutes.mjs:8` = `authorize(['admin','trainer'])` + per-client `ensureClientAccess` assignment guard. Comment-vs-code drift → risks a maintainer needlessly withholding the lane, or weakening the real per-request guard on the false premise the frontend hide was the boundary. Fix: correct the comment (and treat trainer History/Inputs exposure as a safe product decision).
    - CLEAN: Rule 26 mount = real JSX (`shellPieces.tsx:94-110` → `TrainerClientsWorkspace`); IDOR closed on workout-history (`ensureClientAccess`/`clientAccess.mjs:84-96`, fail-closed), ROM baseline (`verifyClientAccessByUserId`), progress charts (`requireOwnershipOrTrainer`/`authMiddleware.mjs:840-912`), macros (`assertAssignmentOrAdmin`), roster membership (`clientTrainerAssignmentRoutes.mjs:543` trainer≠self→403); admin lifecycle controls admin-only server-side (`adminClientRoutes.mjs:290-291`); detail-tab allowlist coerces out-of-list deep-links (`ClientDetailView.tsx:98-104`); charts pull real server aggregation (no mock). The handoff-flagged "/api/admin router-order gate hole for trainer History/ROM" was specifically probed → NOT an IDOR (trainer-authorized WITH per-client assignment guard).
    - NOT COVERED (coverage gap, not a clean claim): Rule 24 responsive matrix (320/414/2560/3840) was not audited; write-path body validation inside logWorkout/editWorkout not deep-audited; `requireTier('pro','charts.full')` bypass surface not probed.

### HR-007 — Dynamic session pricing / specials (WIP — money path)
- **Status:** REVISE (1 HIGH info-disclosure) — **MONEY PATH, Rule 16/50 gate on any fix**
- **Owner:** Fable/Codex (WIP — confirm owner + the branch/PR it lands on)
- **Link:** WIP snapshot on `origin/wip/handoff-2026-07-05` @ `80af9c3e5` (marketing/specials). NOTE: not yet on a clean feature branch/main — locate the real branch/PR when it lands before clearing.
- **Added:** 2026-07-05 (Sean-directed handoff)
- **Why review:** **MONEY PATH — highest stakes (Rule 16/50).** Vicious review of price computation correctness, who can set/override pricing (authorization, no client-side price trust), rounding/currency, and any path that could under/over-charge. Flag anything Stripe/billing-adjacent for the paid-Village gate before merge.
- **Review passes:**
  - [2026-07-05] Claude (Opus 4.8) Slam: **REVISE** — charge integrity SOLID; 1 HIGH info-disclosure (2 independent verify lenses CONFIRMED + lead reviewer + lead Opus re-read = 3 concurring):
    - **HR-007-F1** (HIGH, info-disclosure): `storeFrontRoutes.mjs:583` `GET /api/storefront/:id` is PUBLIC (no `protect`) and its query (`:596`) has NO `isSpecialOffer` filter, so anyone can read a hidden client-scoped "SwanStudios Special" by sequential integer id — leaking the private per-client deal (name, "X paid + Y bonus" description, price, effective $/session, and any client name an admin puts in the name/description = Rule 8). Sibling `GET '/'` DOES filter (`:334 whereClause.isSpecialOffer=false`); the single-item read was missed. **Fix:** if `item.isSpecialOffer===true`, require the authenticated owner (`CustomPackage.clientId===req.user.id`) or admin else 404; simplest = add `isSpecialOffer:false` to the where-clause for non-owner/unauth requests.
    - CLEAN (VERIFIED incl. lead Opus 3rd read): create = `protect,adminOnly` (`customPackageRoutes.mjs:45`; override/approvedByAdminId = server `req.user.id`); no client price trust (`CartItem.create({price: snapshot.price})`, server-derived from StorefrontItem); double-redemption closed (add + update + checkout `assertCartSpecialsRedeemable` fail-closed 503 + grant dedup; `SPECIAL_ALREADY_IN_CART`; variant-spoof bypass attempted & blocked); IDOR closed (`assertClientOwnsActiveSpecial` at add/checkout/grant); rate-gate boundaries exact (60→below_floor, 100→below_warning, 120→clear; NaN/≤0→hardBlock); schema parity camelCase no drift; charge always paid×$175 (sticker never drops, discount = bonus sessions).
    - KILLED by verify (0C/2 of 2): **HR-007-F2** "redemption fail-open on dynamic-import failure" — verifiers could not confirm (the import effectively never fails). RESIDUAL (below finding bar): `recordSpecialRedemption` decrement locks the CART not the CustomPackage row → theoretical under-count only if the same special could sit in two concurrent carts (not demonstrable — add-to-cart uses one active cart + already-in-cart guard). Worth a lock-on-CustomPackage if multi-cart ever becomes possible.
    - **GATE:** F1's fix is a small security filter but lands on the pricing WIP branch (Fable/Codex lane, Rule 67) and touches the money-path feature (Rule 16/50) — coordinate/gate before applying.

### HR-008 — Gamification progression fix (level curve + progress charts)
- **Status:** REVISE (1 HIGH — spend lowers level/rank; new curve amplifies it)
- **Owner:** Fable (SESSION-M / progress) — confirm owner
- **Link:** `origin/main` @ `5e190ea3e` "fix(gamification): replace sqrt level curve with sane power curve (L25 62.5k->~12.9k)" + `3d1e636d7` "feat(progress): truthful chart insight layer + body-composition panel across admin and client grids"; handoff `8408a06cf`.
- **Added:** 2026-07-05 (Sean-directed handoff)
- **Why review:** progression/leveling curve + progress charts. Confirm the new level-curve math is correct + monotonic (no regression to existing users' displayed levels), idempotency on awards (no double-award), schema drift on progress data (Rule 58), and data-truth of the chart insight layer.
- **Review passes:**
  - [2026-07-05] Claude (Opus 4.8) Slam: **REVISE** — the NEW curve itself (the subject of `5e190ea3e`) is provably CLEAN (monotonic; exact FE/BE parity; zero level-drop vs the retired sqrt curve — verified by 2 Node reproductions + lead Opus read). 1 HIGH caller defect the new curve AMPLIFIES:
    - **HR008-F1** (HIGH, correctness): level is derived from the SPENDABLE point balance, so redeeming a reward LOWERS level/rank — violating `levelingAlgorithm.mjs`'s own header ("level driven by LIFETIME earned XP, never spendable balance"). `GamificationPointsService.mjs:246` `calculateLevel(Math.max(newBalance,0))` + `:265` persists lowered level/tier; same pattern `awardWorkoutXP.mjs:182`. A user at 12,924 lifetime (L25) redeeming 5,000 pts → balance 7,924 → **L18 (drops 7 levels**; the old sqrt curve dropped only 3). 2 verify lenses + lead Opus re-read = CONFIRMED.
    - **FIX ALREADY IN-FLIGHT on `origin/wip/handoff-2026-07-05` (NOT yet on main):** adds `User.lifetimePointsEarned` (migration `20260705010000-add-lifetime-points-earned-to-users`) + rewrites `GamificationPointsService.mjs:251-254` to `lifetimeDelta = isSpendLike ? 0 : pointsToRecord; newLevel = calculateLevel(newLifetime)`. **Recommendation:** land that fix on main (migration + service + verify the `awardWorkoutXP` path is also switched to lifetime). Do NOT write a duplicate.
    - CLEAN: award idempotency (idempotencyKey on every ledger entry + `recordLedgerEntry` dedup returns existing balance on dup); chart IDOR (`requireOwnershipOrTrainer`); `useAdminBodyCompCharts` ↔ `chartDataController` response-shape parity exact (Rule 58); data-truth empty-states honest (facts return `[]` on 0 points, pulse `tone:'empty'`, no mock/zero mislabeled; body-fat/weight use neutral signed delta, never labeled "improvement").

---

## Parked-Work Handoff Tracker
> Merged from `origin/main`'s parallel `hostile-reviews/INDEX.md` (2026-07-06). Substantial work parked
> here to **come back to, hostile-review, fix, and finish** — each row links a self-contained handoff/audit
> an AI (or Sean) can pick up cold. Distinct from the HR-NNN Slam registry above: this tracks parked
> *feature* work by handoff doc; the Slam registry tracks discrete *findings* through Prove-or-Named. Add new rows on top.

| Date | Item | Handoff / audit doc | Review status | Next action |
|------|------|---------------------|---------------|-------------|
| 2026-07-05 | **Equipment Michelin Upgrade** — Slice 1 COMPLETE + deployed (3/3 tests incl. modal error); P0.4 (FK) + P1.2 (bootcamp) done by other agents; **P0.2/P0.3/P0.5 backend-safety = Claude's active lane** `claude/equipment-p0-safety` | [`EQUIPMENT-REMAINING-SLICES-HANDOFF-2026-07-05.md`](./EQUIPMENT-REMAINING-SLICES-HANDOFF-2026-07-05.md) (see 2026-07-08 reconciliation) · audit: [`../AI-HANDOFF/EQUIPMENT-SUBSYSTEM-DEEP-AUDIT-2026-07-05.md`](../AI-HANDOFF/EQUIPMENT-SUBSYSTEM-DEEP-AUDIT-2026-07-05.md) | P1.x = **Codex's lane — do not collide**; Slice-1 Codex R7 never ran (low-risk, deployed) | Claude building **P0.5 IDOR + P0.2 atomic write**; P0.3 index migration = guarded sub-slice |
| 2026-07-06 | **Gallery Photo Studio** — Slices 1+2 shipped; **3a (un-watermarked master pipeline) + 3b (Stripe money-loop + the missing `print_orders` table) BUILT, uncommitted** | [`GALLERY-PHOTO-FEATURE-HANDOFF-2026-07-05.md`](./GALLERY-PHOTO-FEATURE-HANDOFF-2026-07-05.md) **§7** | **Codex EOD batch → review §7**: 3a paywall leak audit · 3b money-loop (replay/race/idempotency) · ⚠ Rule-58 `print_orders`-never-existed finding | after review: Sean commits+pushes (deploys the new table + migration), then Slice 3c Prodigi |

### How to use the handoff tracker
- Read the linked handoff for full context (each is self-contained — files, slices, gates, hooks).
- Do the hostile review; record findings in the linked doc (append a "Review Log" section).
- When a slice ships, update the row's status and next action.
- Build in an isolated worktree off `origin/main`, never the shared desktop tree.

---

## Archive
_(Cleared + merged entries move here. None yet.)_
