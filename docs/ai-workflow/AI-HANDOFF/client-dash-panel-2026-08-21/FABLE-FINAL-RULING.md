# Fable 5 — Final-Decider Ruling

**Reviewer:** OpenRouter `anthropic/claude-fable-5` (Fable via OpenRouter credits; Claude-subscription Fable was capped)
**Document:** docs/ai-workflow/AI-HANDOFF/CLIENT-DASHBOARD-AUDIT-HOSTILE-REVIEW-PACKET-2026-08-21.md
**Seed:** docs/ai-workflow/AI-HANDOFF/client-dash-panel-2026-08-21/SEED-ALL-SEATS.md
**Tokens:** 51058 in / 16000 out · **Cost:** ~$1.3106 · **Wall:** 211.5s

---

# FINAL DECIDER RULING — SwanStudios Client Dashboard Remediation

---

## 1. RULING

**The audit's diagnoses mostly survive. Its prescriptions mostly die.** The audit correctly identified five real diseases (entitlement drift, subject-context drift, URL-borne Coach context, consent misrepresentation, absent release gates) and then prescribed one paywalled dead end, one duplicate of an existing fail-closed subsystem, one destructive community rewrite, and one greenfield architecture program the repo has already paid for. The panel unanimously returned REVISE and is unanimously sustained on that verdict.

**Contradiction resolutions, by name:**

1. **Consent-first vs. messaging-first (Sol, Kimi, GLM, DeepSeek-Flash, Qwen vs. Grok).** Five seats ranked consent #1 — *without knowing A1/A2*. **I overrule all five and side with Grok: messaging is #1.** Reasoning in §2. Consent stays a P0 and ships the same week; only the ordinal changes.

2. **"Messaging gate might be UI-only" (Kimi, GLM, DeepSeek-Pro, Sol flagged `[UNCERTAIN]`).** Resolved by A1: `requireTier('elite','trainer.messaging')` is applied server-side to every messaging route except user search. The uncertainty is closed in the *worse* direction — the fix is three layers (middleware, `MessagingView.tsx:30`, contract test), and the permission key `'trainer.messaging'` literally names the relationship it fails to check. No seat is overruled; all are upgraded.

3. **"Maybe packages DO set tier" (GLM Blocker 1's escape branch).** Closed by A2: zero tier writes in any purchase controller. A $33,600 package leaves `tier === 'free'` and the client is server-side 402/403-blocked from their trainer. GLM's lower-severity branch is dead; the higher reading stands.

4. **Build `DashboardActorContext` / `DashboardCapabilityPolicy` / `DashboardActionRouter` (audit stage 2; DeepSeek-Flash scheduled it as a 2–3 week build).** **Overruled by A3.** `requireOwnershipOrTrainer`, `checkTrainerClientRelationship`, `ClientTrainerAssignment`, `FEATURE_GATES`/`tierCatalog`, and `viewAsGuard` already exist and are already applied across ~19 analytics routes. Stage 2 collapses from an architecture program into a **wiring task**: apply the existing pattern to messaging, and make the frontend *consume* server-issued capabilities instead of recomputing them. GLM's Blocker 5 is sustained: a new frontend mega-context would be the 22nd competing context. Any client-side context is **advisory projection only**; the server re-resolves policy at every sensitive operation (Sol Blocker 5 and GLM Blocker 5 sustained on staleness).

5. **Rulesets as the branch-protection escape hatch (Kimi, DeepSeek-Flash, Qwen proposed it).** **Overruled by A5** — rulesets return the same 403. GLM is sustained: **buy GitHub Pro, day one, non-blocking.** Pre-push hooks are killed as a substitute (`--no-verify`); CI-red-means-stop + CODEOWNERS-by-convention is the *interim compensating procedure*, explicitly not fulfillment.

6. **"Mount the canonical feed in Client Community, stage 1" (audit) vs. "extract the card later" (all seats).** Panel consensus sustained and **hardened by A6**: the canonical feed's PostCard, PostContent, moderation hooks, and types are in active flux in the 47-file drift. Mounting a moving target this week is scheduling a rework. The community item is removed from the hotfix window entirely.

7. **Sol's same-day Coach kill switch.** **Partially overruled.** A blanket Coach shutdown on a live product is over-correction; the surviving remedy is a server-side outbound field allowlist (slice 5) shipped in week 1 with strict defaults, plus the payload audit lookup. If the audit reveals medical narrative currently leaving the server, the allowlist default already blocks it — same protection, no outage.

8. **GLM's "one-day entitlement matrix must precede the messaging fix."** **Partially overruled.** The matrix is valuable and is scheduled (slice 2 deliverable), but A3 proves the relationship primitive exists, so the messaging fix does not wait on a survey. Fix the confirmed harm now; map the class in parallel.

9. **Kimi's "the tier-gate test may protect a business decision."** Sustained as an *unknown*, not a blocker. The fix **splits** the capability (`canMessageAssignedCoach` relationship-derived; `canUseCommunityDirectMessages` stays tier-gated), so the possible monetization rule for social DMs is preserved intact regardless of what Sean decides. No revenue policy is being overturned silently.

**What the audit got right and is preserved:** the messaging diagnosis (understated, in fact); the teachPrompt condemnation; the subject-drift concern; the five-destination IA direction; review-first Coach truthfulness (`'Do not claim the workout was logged'` stays tested); preview→confirm→execute→verify→receipt for any Coach write; consent lifecycle machinery; JWT-derived analytics; Crystalline identity.

---

## 2. FINAL P0 SET (cost-of-wrong × likelihood, addendum-weighted)

**#1 changes: MESSAGING, not consent.** The five consent-first seats ranked under the belief the messaging gate might be a frontend-only wall a client could conceivably route around, and without proof the highest payers were affected. A1+A2 close both: the block is **server-enforced, hits every non-elite paying client with probability ~1, right now, on the accountability/safety/retention channel of a $175–$33.6k product.** Harm is *occurring*, not latent. Consent is a severe but *latent* liability — realized on complaint, breach, or regulatory contact — and its fix is copy + policy, which ships the same week regardless of rank. Active bleeding outranks exposure. Grok's ordering is adopted.

| # | P0 | Why here | Addendum weight |
|---|---|---|---|
| **P0-1** | **Trainer-messaging relationship lane.** Split `canMessageAssignedCoach` (from active `ClientTrainerAssignment`) from `canUseCommunityDirectMessages` (tier-gated, preserved). Fix all three layers. | Confirmed, server-enforced, live harm to top-paying clients; safety channel (pain/injury follow-up). | A1 (server-enforced, 3 layers), A2 (tier stays `free`), A3 (primitives exist → days, not weeks), A4 (trial divergence fixed by same change). |
| **P0-2** | **Consent misrepresentation + outbound LLM policy.** Four surfaces claim "anonymous/identity hidden" while a *stable* pseudonym + medical data flows. Fix copy everywhere consent is captured; enforce a server-side outbound field allowlist. | Consent-validity defect at the legal capture moment; compounds with every new signup; cheapest P0. | A7 (the two consent files are the two worst 300-line violators — split lands in same effort). |
| **P0-3** | **`teachPrompt` → server-backed `CoachContextEnvelope`.** One implementation, all four producers including the admin planner. Single-use, TTL, actor-bound, IDs+revisions only. | Health-adjacent text leaking into history/logs/analytics/referrers; also the IDs-only LLM rule. | Producers confirmed at 4 sites; scope exceeds client dashboard. |
| **P0-4** | **Single entitlement oracle.** Frontend stops computing entitlement (`isElite`, `hasCrystallineAccess`, trial rules) and consumes server-issued capabilities. | A4 proved two oracles already disagree in *both* directions (paying client blocked; trial user allowed-by-API, blocked-by-UI). Every future gate inherits this disease until killed. | A1/A4 make the divergence cited fact, not inference. |
| **P0-5** | **Release gates: buy GitHub Pro day one (owner action, ~$4/mo), then require checks.** Interim: CI red = stop, by convention. Non-blocking to all other slices. | Real risk multiplier, but not a customer-facing failure; remedy is a purchase, not engineering. | A5 (rulesets also paywalled — the only remedy left standing). |
| **P0-6** | **Subject-context hygiene.** `GlobalClientContext` sessionStorage cleared on auth change; view-as banner + exit on the *existing* guard; subject-mismatch telemetry; strangler migration of consumers. | Real drift, 21 consumers, but no verified exploit and backend JWT derivation is sound. Structured migration, not a gate. | A3 (viewAsGuard exists → surface it, don't rebuild). |

**Demoted to P1:** Community divergence (deferred per A6), Progress simplification, IA collapse, drawer a11y (shipped as a cheap slice anyway), CWV budgets (need baseline first).

---

## 3. KILLED

| # | Killed item | Reason |
|---|---|---|
| K1 | **"Add an explicit, audited View-as-Client mode" (hotfix 1.3)** | Exists, fail-closed, tested (§3.4, A3). Scheduling it builds a second, weaker impersonation path — worst possible outcome for auth code. Replaced by banner/exit + deliberate allowlist expansion. |
| K2 | **"Protect main + require checks" as stage-1 engineering task** | Paywalled (§3.5) and rulesets are too (A5). Not engineering — a purchase. Moved to day-one owner ops ticket, non-blocking. |
| K3 | **Pre-push hooks / "convention" as gate fulfillment** | Bypassable (`--no-verify`); convention is what produced the D grade. Interim procedure only, never marked done. |
| K4 | **"Retire the client-only Community renderer; mount canonical feed" (stage 1)** | §3.7: page carries factions/parties/challenges/hashtags the audit never saw; A6: canonical feed is a moving target *this week*. Literal execution deletes live features into an unstable dependency. Deferred to parity-gated card extraction after feed stabilizes. |
| K5 | **Greenfield `DashboardActorContext` + `DashboardCapabilityPolicy` + `DashboardActionRouter`** | A3: the capability policy already exists (`requireOwnershipOrTrainer` + `FEATURE_GATES`). A new frontend mega-context = 22nd competing context (GLM). Replaced by composition + thin advisory projection. |
| K6 | **Immutable client-side `entitlementSnapshot`/`consentSnapshot` as authorization** | Stale-allow window on revocation (Sol B5, GLM B5). Snapshots explain denials; the server decides, live, at execution. |
| K7 | **Stage-1 "opaque context ID" as a separate ad-hoc token before the stage-3 envelope** | Builds a throwaway token lacking actor binding/expiry/replay control (Sol B6, Grok B5). One envelope, built once, in slice 6. |
| K8 | **Blanket "stop expanding the dashboard" freeze** | Unjustified for a live business (all seats). Replaced by scoped freeze: no new subject-context consumers, no new `teachPrompt` producers, no new impersonation paths, no parallel social renderers. Booking, billing, content, incident fixes keep shipping. |
| K9 | **Big-bang five-destination route collapse** | IA direction survives; route deletion before aliases/redirects/deep-link inventory breaks bookmarks and notification links. Phased with aliases (slice 11). |
| K10 | **"Sixteen sidebar destinations"** | It's 15 (§3.8). No audit numeral enters this brief unverified. |
| K11 | **CWV budget gate (LCP ≤2.5s etc.) as an immediate gate** | No baseline exists — the audit never had an authenticated session. Instrument first, then gate. |
| K12 | **Sol's same-day blanket Coach kill switch** | Over-correction on a live product. Replaced by strict-default outbound allowlist (slice 5) — same protection, no outage. |
| K13 | **Deleting `useMessaging.tierGate.test.ts` silently** | It's a deliberate lock. It is *retired with a commit message naming this ruling*, replaced by two behavioral tests (relationship lane, social lane), and the possible social-DM monetization rule is preserved pending Sean (§7). |

---

## 4. ORDERED SLICE LIST

**Slice 0 — GitHub Pro (owner ticket, day one, non-blocking)**
- **Goal:** Restore enforceable branch protection. **Files:** none (GitHub settings). **AC:** Pro active; `main` requires PR + green checks (`ai-eval-gate`, `bodymap-validation`, `swan-lens-guards`, plus suites as they land); direct push rejected. **Test:** attempt a direct push → rejected; API `GET .../branches/main/protection` → 200. **Rollback:** disable rule (settings toggle). **Interim until purchased:** CODEOWNERS file + CI-red-means-stop, explicitly logged as *not done*.

**Slice 1 — Messaging relationship lane (backend)** — *blocks slice 2*
- **Goal:** A client with an active trainer relationship reaches their trainer regardless of tier; community DMs stay tier-gated.
- **Files:** `backend/middleware/requireMessagingAccess.mjs` (NEW, ≤300 lines), `backend/routes/messagingRoutes.mjs` (swap `messagingTier` → `requireMessagingAccess` on all gated routes).
- **Spec:** middleware allows if (a) staff/trainer/admin (preserve existing bypass), OR (b) `checkTrainerClientRelationship()` / active `ClientTrainerAssignment` row links actor to a conversation participant (for conversation-scoped routes) or actor has *any* active assignment (for `GET/POST /conversations`), OR (c) `requireTier('elite','trainer.messaging')` passes (community lane). Relationship-only users may create/join only conversations whose participants ⊆ {self, assigned trainer(s)}. Respect `TIER_GATING_ENABLED` kill switch. Fail closed on DB error for lane (b); preserve existing JWT fallback for lane (c).
- **AC:** (1) user tier=`free` + active assignment → 200 on list/create/send with assigned trainer; (2) same user → 403 creating a conversation with an unrelated user; (3) tier=`elite`, no assignment → 200 on community DMs (unchanged); (4) no assignment, tier=`free` → 403 everywhere (unchanged); (5) trial user → API behavior unchanged (A4 already permits).
- **Test:** NEW `backend/tests/api/messagingRelationshipLane.test.mjs` covering all five AC cases with seeded `ClientTrainerAssignment` rows.
- **Rollback:** revert the one-line middleware import/apply in `messagingRoutes.mjs`; old behavior returns intact.

**Slice 2 — Messaging capabilities endpoint + frontend + test retirement** — *requires slice 1*
- **Goal:** Frontend stops computing entitlement; consumes server truth. Fixes A4 trial divergence as a side effect.
- **Files:** `backend/routes/messagingRoutes.mjs` (add `GET /api/messaging/capabilities` → `{ canMessageAssignedCoach, canUseCommunityDirectMessages }` computed by the same middleware logic), `frontend/src/components/Social/Messaging/MessagingView.tsx` (line 30: replace `isStaffRole || isElite` with fetched capabilities; render trainer lane when `canMessageAssignedCoach`, upsell wall only for the community lane), DELETE `useMessaging.tierGate.test.ts`, NEW `useMessaging.capabilities.test.ts`.
- **Deliverable artifact:** repo-wide inventory of `isElite` / `hasCrystallineAccess` / `tier ===` consumers (GLM's matrix), committed as `docs/entitlement-matrix.md`.
- **AC:** grep shows zero frontend entitlement computation on the messaging path; trial user sees messaging enabled (matches API); free+assigned client reaches trainer thread in UI; commit message for test deletion references this ruling.
- **Test:** two behavioral tests — relationship lane renders composer; community lane renders wall for `free`/no-assignment.
- **Rollback:** revert `MessagingView.tsx`; capabilities endpoint is additive and inert.

**Slice 3 — Consent copy correction (all four surfaces)** — *parallel with 1–2*
- **Goal:** Stop capturing consent under a false description.
- **Files:** NEW `frontend/src/content/aiConsentCopy.ts` (single source of truth, ≤300); edit `AiConsentScreen.tsx:659`, `ConsentSection.tsx:209/232/257`, `ClientOnboardingWizard.tsx:735` to import from it; update comment `deIdentificationService.mjs:185`.
- **Exact replacement copy:** *"Your data is pseudonymized, not anonymous. Swan Coach sees a stable client ID instead of your name or contact details. The following are processed to personalize coaching: age, gender, measurements, medical conditions, injuries, current pain, supplements, sleep, stress, and activity level. Your name, email, phone, and handles are never sent. You can withdraw at any time; withdrawal stops future AI processing but does not delete previously generated outputs."* Bump `consentVersion`.
- **AC:** grep zero remaining "anonymous"/"identity is hidden"/"never sent" claims about AI processing; new consentVersion recorded on grant; copy sourced from one module.
- **Test:** RTL snapshot/text assertions on all three components asserting the new copy and absence of "anonymous".
- **Rollback:** revert copy module import; **note:** rollback restores a legal defect — flag to Sean if triggered.

**Slice 4 — Consent-surface file decomposition (house rule)** — *after slice 3*
- **Goal:** `ClientOnboardingWizard.tsx` (789), `AiConsentScreen.tsx` (770), `ConsentSection.tsx` (304) → all files ≤300 with zero behavior change.
- **Files:** split into step/section subcomponents under `onboarding/components/` and `client-dashboard/consent/`; styled-components only; no MUI introduced.
- **AC:** every resulting file ≤300 lines; existing tests pass unmodified; visual snapshots unchanged.
- **Test:** existing suites + snapshot diff = zero.
- **Rollback:** revert; splits are pure refactors.

**Slice 5 — Outbound LLM field allowlist (server-side)** — *parallel*
- **Goal:** Enforce, at the last hop before the LLM provider, a strict allowlist of outbound fields.
- **Files:** `backend/services/deIdentificationService.mjs` (or its caller in the Coach pipeline): add `OUTBOUND_ALLOWLIST` — pseudonym ID, entity IDs, revisions, workout structure (exercise names, sets, reps, dates). **Default-deny:** medical conditions, injuries, pain, supplements, sleep, stress, measurements, age, gender — held behind env flag `COACH_HEALTH_FIELDS_ENABLED` (default off) until Sean + counsel approve the list (§7).
- **AC:** any non-allowlisted field is stripped and logged (field name only) before provider call; flag off = strict.
- **Test:** unit test feeding a full client record through the pipeline; assert output contains only allowlisted keys.
- **Rollback:** set env flag on (restores current behavior) — deliberately loud.

**Slice 6 — `CoachContextEnvelope` v1, all four producers** — *parallel; the one Coach handoff build*
- **Goal:** Replace every `teachPrompt` URL param with a redeemable, server-stored, single-use context.
- **Files:** NEW `backend/models/CoachContext.mjs` + migration (contextId UUID, actorId, subjectId, sourceSurface, entities JSON [ids+revisions only], consentVersion, issuedAt, expiresAt=+10min, consumedAt nullable); NEW `backend/routes/coachContextRoutes.mjs` (`POST /api/coach/context` behind `protect`; `GET /api/coach/context/:id` behind `protect`, 403 unless `actorId === req.user.id`, 410 if expired/consumed, marks consumed); edit `ClientObservatoryData.ts:114`, `ClientCurrentWorkoutCoachAction.ts:81`, `ClientMyWorkoutsPage.logic.ts:78`, `workoutPlannerHandoffRoutes.ts:193` → POST then navigate `?ctx=<id>`; Coach assistant page redeems and the **server** rebuilds the teaching prompt from authoritative records, retaining the `'Do not claim the workout was logged'` instruction server-side.
- **AC:** repo-wide grep `teachPrompt` = 0 in runtime code; envelope carries no prose, only IDs+revisions; replay of consumed ctx → 410; expired → Coach opens in plain chat with a visible "context expired — reopen from your workout" notice (no silent failure); client lane remains chat-only (`operatorEnabled` untouched); `ClientCurrentWorkoutCard.test.tsx:136` assertion moved server-side and still passes.
- **Test:** API tests (create/redeem/replay/expiry/wrong-actor); one E2E: workout card → Coach opens with correct assignment context.
- **Rollback:** feature flag `COACH_CONTEXT_ENVELOPE` reverting producers to legacy param (kept one release, then deleted).

**Slice 7 — View-as surfacing on the existing guard** — *parallel*
- **Goal:** Persistent banner + one-click exit; deliberate allowlist widening. **No new impersonation machinery.**
- **Files:** NEW `frontend/src/components/DashBoard/ViewAsBanner.tsx` (≤300; fixed-position; shows subject name + "Exit view-as"; 44px targets; `var(--token,#fallback)` palette; dark-first); mount in client dashboard shell; `backend/config/viewAsSupportedEndpoints.mjs`: add **only** GET routes already guarded by `requireOwnershipOrTrainer` (the ~19 analytics chart routes, `analyticsRoutes.mjs:162-183`), each with a one-line justification comment in the existing `'unsafe'`/`'self-only'` discipline. `/api/messaging/*`, `/api/consent/*`, `/api/auth/*` stay excluded — permanently.
- **AC:** banner visible on every client-dashboard route while viewAs active; exit clears state and returns to trainer/admin dashboard; every mutation under viewAs still 403s (existing tests must stay green); allowlist diff contains GETs only.
- **Test:** extend `gamificationViewAs.test.mjs` pattern to two newly added analytics GETs + one mutation-denial assertion; RTL test for banner render/exit.
- **Rollback:** unmount banner; revert allowlist additions.

**Slice 8 — Subject-context hygiene** — *after slice 2 (uses capabilities pattern)*
- **Goal:** Kill the stale-subject window without building a mega-context.
- **Files:** `frontend/src/context/GlobalClientContext.tsx` (clear sessionStorage keys on logout AND on authenticated-user-id change; emit `subject_context_mismatch` telemetry when a consumer's subject ≠ server effective read user).
- **AC:** logout→login as different user in same tab rehydrates nothing (Sol's test scenario passes); mismatch events visible in telemetry; zero new context providers created.
- **Test:** unit test of the rehydration guard across simulated auth change.
- **Rollback:** revert; behavior returns to current (known-degraded) state.

**Slice 9 — Mobile drawer focus containment** — *parallel, any time*
- **Goal:** Complete modal semantics. **Files:** the drawer component (locate via `ClientStellarSidebar` mobile usage). Add initial focus, Tab/Shift+Tab trap, `inert` background, focus restore to trigger; keep existing Escape/scroll-lock.
- **AC:** keyboard-only traversal cannot leave drawer; closing returns focus to hamburger; axe passes.
- **Test:** RTL keyboard-navigation test + automated a11y assertion.
- **Rollback:** revert component.

**Slice 10 — 'Today' Home recomposition** — *after 1–8; per wireframe §6*
- **Goal:** Replace the ~17-module inventory with the daily loop: today's assignment → one next action → why (Coach) → one verified proof → trainer contact → community preview → Explore.
- **Files:** client Home page component tree (split to ≤300-line files); no new data sources — recompose existing queries; Victory-only for any sparkline; Dual-Button Glow on the primary CTA.
- **AC:** matches §6 wireframes at 1280px and 375px; ≤6 modules above the fold; all removed modules reachable under Explore; empty/rest/completed/slow-API states render truthful placeholders (no fake zeros).
- **Test:** RTL state-matrix test (new/empty/active/rest/completed/error) + visual snapshots at both breakpoints.
- **Rollback:** route flag swapping old/new Home.

**Slice 11 — Progress phase 1 (`ClientProgressStory`)** — *after 10; baseline CWV instrumented first*
- **Goal:** Primary insight + 2–4 charts + accessible tables; theatrical modes lazy-loaded under Explore, not deleted.
- **Files:** Progress page tree (≤300-line files); Victory only; every chart gets a table equivalent and an "Ask Swan Coach" button that creates an envelope (slice 6) with `{chartId, datumRef, subjectId}` — never prose.
- **AC:** initial route loads only the story surface (network tab shows no cockpit/cube/war-room bundles); failed chart queries render labeled error states, never 0; CWV RUM instrumentation live for 2 weeks before any budget becomes a gate.
- **Test:** bundle-split assertion; RTL error-state test; envelope-payload unit test (IDs only).
- **Rollback:** route flag.

**Slice 12 — Five-destination IA shell with aliases** — *last*
- **Goal:** Today / Training / Progress / Community / Profile + global utilities + Explore; **zero route deletions**.
- **Files:** `ClientStellarSidebar.tsx` (5 primaries + Explore group), route alias map (all 15 legacy paths 301-redirect into new tree), navigation telemetry.
- **AC:** every legacy path resolves; deep links from notifications/bookmarks land correctly; sidebar shows 5+Explore; telemetry records legacy-path hits for later retirement decisions.
- **Test:** route-matrix test iterating all 15 legacy paths → expected destination.
- **Rollback:** revert sidebar + alias map (aliases are additive).

---

## 5. MERMAID BLUEPRINT

### (a) Entitlement/authorization decision path — Messages, Coach, Progress

```mermaid
flowchart TD
    A[Client request] --> B{JWT valid? protect}
    B -- no --> Z1[401]
    B -- yes --> C{Destination}

    C -- Messages --> D{Staff / trainer / admin?}
    D -- yes --> M1[Full messaging access]
    D -- no --> E{Active ClientTrainerAssignment\nlinks actor to participant?\nRELATIONSHIP DECIDES}
    E -- yes --> M2[Trainer lane: conversations with\nassigned trainer only - tier IGNORED]
    E -- no --> F{requireTier elite/premium\nor live trial\nSUBSCRIPTION DECIDES}
    F -- yes --> M3[Community DM lane]
    F -- no --> Z2[403 + upsell wall\ncommunity lane only]

    C -- Coach --> G{AI consent granted\nat current consentVersion?}
    G -- no --> Z3[Consent screen - blocked server-side]
    G -- yes --> H{ctx param present?}
    H -- yes --> I{Redeem envelope:\nactor-bound, unexpired, unconsumed}
    I -- valid --> J[Server builds prompt from\nauthoritative records via\noutbound field ALLOWLIST]
    I -- invalid --> K[Plain chat + context expired notice]
    H -- no --> K
    J --> L[Client lane = chat-only\noperatorEnabled false]
    K --> L

    C -- Progress --> N{requireOwnershipOrTrainer:\nself OR trainer with relationship\nRELATIONSHIP DECIDES}
    N -- yes --> P1[Charts + tables served]
    N -- no --> Z4[403]
    
