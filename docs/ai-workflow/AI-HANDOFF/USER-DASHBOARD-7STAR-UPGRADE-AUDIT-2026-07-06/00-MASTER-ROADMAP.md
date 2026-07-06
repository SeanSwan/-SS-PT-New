# User Dashboard 7★ Upgrade Audit — Master Roadmap (2026-07-06)

**Status:** audit-complete, docs-only (zero code changed).
**Baseline:** origin/main @ `87680741e` audited in isolated worktree (the shared checkout was 132 commits stale — every file:line in this folder refers to main).
**Produced by:** 9 parallel read-only Fable auditors (1.94M tokens, 688 tool calls, 0 errors) + orchestrator synthesis with independent spot-verification of the headline claims.
**Read order for future AIs:** this file → the domain doc for whatever slice you're building. Every domain doc is self-contained with file:line receipts and [VERIFIED]/[LIKELY]/[HYPOTHESIS] tags (Rule 26/30/51 discipline).

---

## 0. The Engraved Prompt (Sean 2026-07-06, enhanced per Rule 66 and executed)

**Sean's original ask (condensed):** "Audit the user dashboard. Add to the upgrade based on what's missing from the vision — 7-star Michelin, but an exercise app / workout community. Design and plan the algorithms the user dashboard will have. Docs, not code — documentation for future AIs. Go through the entire app, leaking from the dashboard into whatever's most important to enhance. We're working on the workout logger, so do the other things. Use a lot of agents, fast. Take this prompt, engrave it, enhance it, use the enhanced version."

**The enhanced prompt that was executed:**

> Run a Michelin-grade upgrade audit of SwanStudios' user-facing experience, centered on the User Dashboard, producing documentation for future AI builders — no code. Baseline = origin/main (deployed truth), audited from an isolated worktree. Exclude the workout logger build lane (the active Phase-1 arc owns it); treat it as an integration point only. Fan out one read-only agent per domain: (1) user-dashboard home & IA, (2) progress/chart data truth, (3) gamification/streaks/XP, (4) community/social feed, (5) notifications & accountability nudges, (6) next-best-action engine extension — EXTEND the existing `nextBestActionService.mjs`, never rebuild, (7) onboarding & first-7-days activation, (8) trainer/admin proof-of-value, (9) mobile/premium polish. Each agent produces: a Canonical Surface Receipt (what actually mounts, file:line — a lazy import is not a mount), Rule-27 surface classification, a data-truth check (real tables vs mock), a vision-gap analysis against the Product Core Loop (log → diary → charts/proof → next best action → shareable milestone), ranked P0–P3 upgrades with acceptance criteria and least-click deltas, and full algorithm specs (inputs/outputs/pseudocode, deterministic-first, zero PII, zero medical advice). Synthesize into one master roadmap ranked by (retention/revenue value × evidence strength ÷ effort), with an explicit Sean-decision queue for anything touching pricing gates, and hard sequencing against the active build lanes.

---

## 1. Domain Scorecard

| Doc | Domain | Grade | One-line verdict |
|---|---|---|---|
| [01](01-user-dashboard-home.md) | Home + IA | **B** | Real data, premium styling — but the persona is forked across TWO diverging homes and the NBA engine reaches neither |
| [02](02-progress-charts-data-truth.md) | Progress/chart truth | **B** | Log→chart loop is genuinely real end-to-end; proof is paywalled at activation time; two 1RM formulas one click apart |
| [03](03-gamification-streaks.md) | Gamification/streaks/XP | **C** | Plumbing is production-grade and idempotent, but the reward moment is unmounted and a competing XP engine splits the economy |
| [04](04-community-social.md) | Community/social | **C** | Impressively wired plumbing; feed is content-starved, unranked, coach-absent — reads as dead |
| [05](05-notifications-nudges.md) | Notifications/nudges | **C** | Session-ops comms are solid; ZERO outbound messages are triggered by workout data — the accountability layer doesn't exist |
| [06](06-next-best-action-extension.md) | NBA engine (keystone) | **B-** | Engine is excellent (deterministic, tested, null-honest) but reaches 2 of 4 roles, ignores 6 signal classes, misroutes its CTA |
| [07](07-onboarding-activation.md) | Onboarding/activation | **C-** | Every ingredient exists (wizard, gate, drip, queue); nothing composes them; the redirect gate is literally dormant code |
| [08](08-trainer-admin-proof-of-value.md) | Trainer/admin proof | **C** | Real stale-client intel exists; the intervention loop dead-ends at buttons with no onClick |
| [09](09-mobile-premium-polish.md) | Mobile/premium polish | **B+** | Token/44px/reduced-motion discipline near-flawless; daily-loop surfaces hide behind a 2-tap hamburger |

---

## 2. The One Diagnosis

**The kitchen is Michelin-grade; the food never leaves the pass.** Across all nine domains the same failure shape repeats: the intelligence, data, and even the UI components EXIST — server-side, tested, real — but the final wire to the user's eyeballs was never connected. This is the single highest-leverage insight of the audit. The 7-star upgrade is mostly *integration*, not construction:

1. The 8-rung **NBA engine** is consumed by ZERO home surfaces — the home "Next Best Action" card is a client-side heuristic impostor (`HomeTabNextBestAction.tsx:40-64`) [VERIFIED by orchestrator: only consumers are `useProgressPulse.ts` (Guardian-gated) + admin `ClientNextBestActionCard.tsx`].
2. The finished **PostWorkoutCelebration** overlay has zero consumers; XP is awarded via `setImmediate` AFTER the save response (`dailyWorkoutFormRoutes.mjs:1197-1224`) — the dopamine beat never fires.
3. The **stale-client dashboard**'s "Send check-in" / "View profile" buttons have NO onClick (`ClientComplianceDashboard.tsx:216-218`).
4. The **onboarding redirect gate** is defined AND unit-tested with zero non-test consumers (`UniversalDashboardLayout.logic.ts:52-61`).
5. The **share-card renderer** (`PostContent.tsx:54-59`) never fires because auto-posts write thin text with no workout metadata (`socialAutoPost.mjs:28-47`).
6. The **day-1/3/7 activation drip** exists but fires from exactly one call site (staff onboarding); self-signup and claim never trigger it.
7. The **renewal-conversation queue** (`measurementMilestoneService.mjs:342-363`) has zero consumers.

**Corollary diagnosis — competing truths:** where two implementations coexist, they disagree: two home surfaces, two streak semantics (day vs ISO-week), two 1RM formulas (Brzycki vs Epley), two XP/level engines, two challenge tables (`challenges` vs `"Challenges"` — same trap class as `users`/`"Users"`), three staleness thresholds. A 7-star product has ONE truth per metric.

---

## 3. Cross-Domain Roadmap

### Wave 1 — "Wire what exists" (integration slices, mostly S/M effort, ~2 focused weeks)
| # | Slice | Doc | Effort | Click delta |
|---|---|---|---|---|
| 1.1 | **Trust triple:** feed private-post leak fix (`posts.mjs:311-321` — friend branch has no visibility filter; orchestrator-verified), consent field on auto-posts (public-by-default today), `transformation` + `new_follower` enum drift fixes | 04, 05 | S-M | — |
| 1.2 | **NBA hero on both homes** via shared `useNextBestAction` hook + LOG_HREF fix (points at history, not the logger) + free-tier NBA-lite (rungs 1-3) *(gated on Sean D1)* | 06, 01 | M | next action 2-taps+gate → 0 taps |
| 1.3 | **Reward moment:** return xp/streak/levelUp in the save response (swap fire-and-forget for `runWorkoutXpAwardStep`) + mount PostWorkoutCelebration *(backend-first; overlay mounts via logger-lane handoff)* | 03 | S-M | reward visibility 2 taps → 0 |
| 1.4 | **Activation wiring:** mount the dormant onboarding redirect gate + wizard→logger CTA + claim auto-login | 07 | S+S+M | onboarding discovery 2 missable taps → 0 |
| 1.5 | **Rich auto-post share cards** (pass workoutId + milestone metadata; renderer already built) + one-challenge-truth repoint | 04 | S-M | the #1 dead-feed content fix |
| 1.6 | **Wire the dead intervention buttons** on ClientComplianceDashboard (deep-link Client Hub + message compose) | 08 | S | impossible → 1 tap |
| 1.7 | **Bottom tab bar on /dashboard/client/*** with raised Log slot (pattern proven on /user-dashboard) | 09 | M | log from any tab 3 taps → 1 |
| 1.8 | **One 1RM formula** (Brzycki via `oneRepMaxService`, delete inline Epley) | 02 | S | kills number drift |

### Wave 2 — "One truth" (unification, M effort each)
- **Unify the XP economy** — stop `workoutService.updateGamification`'s parallel level/streak/XP engine; level = lifetime XP, never demote on spend (03).
- **One streak semantic** user-facing (day-streak vs week-streak labeled or merged) + shared plan-aware staleness/adherence module consumed by at-risk query, progress pulse, and brief dispatcher (01, 02, 08).
- **Feed ranking v1** (recency × relationship × milestone-weight × richness) + keyset cursor pagination (04).
- **Accountability Nudge Engine v1** — compose existing NBA triggers + automation caps/suppression/quiet-hours + createNotification; prerequisite: `User.timezone` migration + unified DEFER semantics (05).
- **Proof-Point milestone engine** at the unified write path (sibling of `workoutXpAwardStep`), embedded in progress-pulse, one-tap share (02) — *after the logger lane stabilizes*.
- **Starter proof-teaser tier** — 2 free charts + de-scoped compass *(gated on Sean D2)* (02).

### Wave 3 — "7-star moments" (premium differentiation)
- Home convergence into one role-framed composition *(Sean D4)* (01).
- Trainer action queue + admin exceptions ribbon + celebrate queue *(hard-gated on the /api/admin router-order auth slice)* (06, 08).
- Consent-gated staff celebration pipeline + renewal-conversation queue widget (08).
- Day-1/3/5/7 activation playbook + activation score + trainer new-client-at-risk badge (07).
- "Training Chronicle" signature moment on My Workouts (streak crystal, PR glints — real logs only) + mobile chrome compression (09).
- Weekly challenge loop (Monday launch / Friday celebration) + challenge-completion celebration posts (04).

---

## 4. Sean Decision Queue (pricing/product calls the audit cannot make)

| # | Decision | Tension | Doc |
|---|---|---|---|
| D1 | Un-gate NBA rungs 1-3 (log_first_workout / return_after_gap / streak_at_risk) for free tier? | Activation guidance vs `analytics.advanced` paywall — free trainees currently get ZERO engine guidance in their critical first 7 days | 06, 01 |
| D2 | Starter proof-teaser (2 free charts + de-scoped compass)? | First visible progress proof ≤7 days (strategy gate) vs Guardian chart paywall — today a Starter's first workout earns a lock overlay | 02, 07 |
| D3 | Free client↔assigned-trainer DMs? | "First coach interaction ≤7 days" vs Crystalline messaging gate (`tierCatalog.mjs:179`) | 05, 07 |
| D4 | Converge the two homes (user + client) into one composition? | Feature-fork today: ticker/enrichment/streak-rescue vs assignment-card/chart-cube/next-session — each home lacks the other's best half | 01 |
| D5 | Admin default landing: keep /master-schedule or flip to /overview (where the proof-of-value intel lives)? Or exceptions ribbon on master-schedule? | 08 | |
| D6 | Consent model for celebration shares (client opt-in flag) — also fixes auto-post public-by-default | Trust posture | 04, 08 |

---

## 5. Trust & Data-Integrity Flags (fix regardless of roadmap order)

1. **[VERIFIED, orchestrator-confirmed] Friends' private posts leak into feeds** — `posts.mjs:311-321` friend branch has no visibility filter; single-post GET at :895 blocks them. Fix in Wave 1.1.
2. **[VERIFIED] Auto-posts are unconditionally PUBLIC with zero consent check** (`socialAutoPost.mjs:44-46`).
3. **[LIKELY — needs Rule-55 probe] Follow flow 500s**: `new_follower` notification type absent from `Notification.mjs:32` enum → ValidationError inside the follow transaction (`socialController.mjs:100`).
4. **[VERIFIED] Spend demotes level** — `GamificationPointsService.recordLedgerEntry:245-268` recomputes level from post-spend balance, violating the lifetime-XP contract.
5. **[VERIFIED] Same-day double-XP path** — `PUT /api/workout/sessions/:id` → `workoutService.mjs:809-896` parallel engine with a different idempotency key space.
6. **[VERIFIED] Fabricated admin metrics** — broadcast delivered/opened synthesized (`adminNotificationsRoutes.mjs:57-63`); trainer rating/revenue cards permanently 0 (`adminRoutes.mjs:44-59` returns none of the read fields); AutomatedCheckInsWidget reads a hardcoded-empty stub.
7. **Rule-58 pre-migration checks required:** prod ENUM labels for `SocialPost.type`, dual challenge tables `challenges` vs `"Challenges"`, and FK targets must reference `"Users"`.

---

## 6. Hard Sequencing Gates

- **Workout logger lane (active, SESSION-X Phase 1):** owns the unified write path + logger UI. Slices 1.3 (celebration mount), Wave-2 Proof-Point engine, and 1.7's Log slot integrate WITH it — backend-first, UI via handoff. Do not touch `dailyWorkoutFormRoutes` write internals without that lane.
- **/api/admin router-order auth fix (named next slice in SESSION-Q handoff):** blocks ALL trainer-facing at-risk/rollup/queue work (trainer requests currently 403 on every `/api/admin/*` [HYPOTHESIS-high-confidence, needs probe]). Sequence Wave-3 trainer surfaces behind it; do not fork it.
- **`User.timezone` migration** before the nudge engine goes wide (quiet hours currently compare server/UTC).
- **Unmerged comms WIP branch** (`wip/comms-notifications-2026-07-05`): doc 05 audited MAIN only; nudge engine design composes with it — reconcile before building on that branch's surfaces.
- **Codex lanes:** storefront/Stripe/checkout internals, `paymentActivationStatusService` (activation-ladder rungs touch it — coordinate first).

---

## 7. Algorithm Spec Index (where each algorithm lives)

| Algorithm | Doc § | Core idea |
|---|---|---|
| NBA extension (6 new rungs, pain decorator, per-role voice, cache) | 06 §6 | Extend the 8-rung deterministic ladder; priority IS the score; LLM may consume, never produce |
| Streak engine (grace/freeze/repair, timezone) | 03 | Fix in the gap branch of `awardWorkoutXPSupport`, not a new service |
| XP curve + level pacing | 03 | Curve healthy for 90 days; add declared-but-unwired POINTS_CONFIG earners with daily caps, don't rebuild |
| Milestone detection + share-worthiness score | 03, 02 | Server-side in the XP step, single writer, once/day idempotent; prompt at score ≥60 |
| Proof-Point engine (PR/volume/streak events → pulse → share) | 02 | Embed `latestProofEvent` in /progress-pulse exactly as nextBestAction already is |
| Feed ranking v1 | 04 | `exp(-ageHours/36) × relationshipW × milestoneW × richnessW` in JS over the existing candidate window |
| Accountability nudge engine (triggers/channels/caps/quiet-hours) | 05 | Composition of NBA codes + automation substrate; in-app first; sub-cap 2/week |
| Activation score + day-N playbook | 07 | 0-100 weighted gates; sibling of NBA on the same route family; idempotent per (userId, step) |
| Stale-client scoring v2 + roster KPIs + coach-response-time | 08 | Extend `adminComplianceHelpers`; plan-aware weekly target = COUNT(plan days), fallback 2 |

---

## 8. Verification & Residual Risk

**Verified by the orchestrator (not just agents):** all 9 docs exist (1,517 lines); `requireFeature('analytics.advanced')` gate at `clientAnalyticsRoutes.mjs:61`; NBA frontend consumers = exactly `useProgressPulse.ts` + `ClientNextBestActionCard.tsx` (no home surface); the feed private-post leak query shape at `posts.mjs:311-321`.
**Needs a Rule-55 probe before its fix lands:** the trainer 403 router-order shadow (08), the `new_follower` enum 500 (05), trial-tier coverage of the Guardian gate (02 [UNKNOWN]).
**Honest scope limits:** static audit — no browser/runtime probes were run; mobile findings (09) are code-derived, not device-tested; prod DB ENUM/table checks (Rule 58) were NOT run and must precede any migration.

## 9. Post-Task Hygiene (Rule 38)
Created: this 10-doc folder (committed on branch `claude/upgrade-audit-20260706`, mirrored untracked into the shared tree for immediate reading) + one ACTIVE-INDEX pointer line. Worktree `c:/tmp/ss-audit-20260706` can be removed after merge (`git worktree remove`). No temp artifacts elsewhere.
