# SWAN STUDIOS — "WHAT'S NEXT" MASTER ROADMAP (Kimi's vision) — 2026-07-19

> **What this is.** Sean asked that the Gallery handoff also capture *everything queued after the Gallery* so
> nothing gets dropped. This is that master roadmap. It was **overhauled by Kimi** (the design + product
> architect), not Opus — Sean's directive: build it in Kimi's vision. Three Kimi K3 consults fed it (master
> overhaul + marketing deep-dive + Cortex Phase 1 deep-dive, ~$0.42 total, effort=medium). Raw outputs are local
> at `.ai-workflow/fusion/kimi-whats-next-master.md`, `kimi-marketing-deepdive.md`, `kimi-cortex-deepdive.md`
> (gitignored — their substance is embedded below).
>
> **The one-line answer to "what's after the Gallery":** turn the lights on before building more. Eight shipped
> surfaces sit dark behind flags — activate them, instrument the funnel, *then* pour money in and deepen the
> coaching loop.

---

## KIMI'S THESIS — "Activate before you accelerate."
The backlog's core failure was treating *finishing* and *turning on* as the same thing. 8 surfaces of shipped,
sunk value are sitting dark behind flags; a second redesign program (Unified World) was queuing to re-do work
the first program already did; and marketing was aimed at a funnel whose new front door has never been opened.
Corrected order: **close the program → turn the lights on → pour money into a live, measurable funnel → deepen
adherence.** Nothing net-new is built until what exists is live and measured.

## TWO RULINGS (Kimi decided these first — they collapse the overlaps Sean worried about)

**Ruling 1 — Lane-A wiring vs Unified World: not competitors. "One is the pipe, the other is water."**
Lane-A lens wiring is the *activation of the shipped world engine* — the real path, goes first. The **Unified
World Redesign program is DISSOLVED as a standalone program:**
- **Track A (trinity reskins) — DELETED.** Home/About/Contact were just reskinned as Crystalline consumers
  (#4/#5/#7). Re-mocking them is hedging.
- **Track B (dashboard reskins) — DELETED.** Dashboards shipped (#2); the Chart Charter completes them.
- **Survivor:** the 7-language *exploration* → demoted to a **World-Pack content track** — new worlds authored
  as *versioned token payloads published through Lane-A*, CI-linted + staged preview + Sean sign-off. New worlds
  are content, never a new program, never new mocks outside Appearance Studio.

**Ruling 2 — billing Gallery vs "7-language gallery": a homonym collision, not a conflict.**
The **Gallery (`GalleryPage.tsx`) is billing-critical surface #8/#9 — it ships now**, Crystalline idiom,
money-path bind-only. The "7-language gallery" is a mood-board exercise wearing the same noun → **renamed
"World-Language Exploration," parked behind activation, culled 7→2.** The billing Gallery neither waits for it
nor consumes it.

---

## THE ORDERED PLAN (single list; ⊕ = gap Kimi added that the draft missed)

### WAVE 0 — CLOSE THE PROGRAM
1. **Ship the Gallery** — last surface of the 14; billing-critical, bind-only, additive rendition backend.
   Gate = payment regression suite (checkout / packages / webhooks / credit / VIP / referral / donation truth
   tests) green ⊕. Handoff already written: `NEXT-CHAT-PROMPT-gallery-kimi-vision-2026-07-19.md`.
2. **⊕ Sean Decision Pack** — ONE batched ask that kills four idle-time gates at once: (a) Gallery
   rendition-backend scope sign-off, (b) Cortex §6 answers, (c) About Sean-portrait asset, (d) marketing sender
   domain + owner alert SMS number. Batching removes dead time between waves.

### WAVE 1 — FIRST LIGHT (activation — the multiplier on everything already shipped)
3. **Lane-A lens wiring** — wire Crystallize into the Appearance-Studio *Apply* handler + viewport/surface CSS
   mounts + motion licences. 8 dormant surfaces become a real, world-switching system. **← THE ONE NEXT BUILD.**
4. **⊕ Gate telemetry + Flag-Flip Runbook + rollback drill** — every `*Gate.tsx` emits a fail-closed event; flip
   order, dwell times, abort metrics written *before* any flag moves. Reversible-by-design → reversible-in-practice.
5. **⊕ Measurement Charter** — funnel-event baseline (lead → signup → first session → purchase → adherence)
   captured *before* flag-on, so the redesign's lift and all future marketing spend are attributable. Also seeds
   the Marketing Command Center.
6. **⊕ Performance Budget Charter** — LCP/INP budgets per surface; backdrop-filter/canvas budgets; mobile-Safari
   probe. Money path (Store, Gallery) measured first. Crystalline's biggest real-world risk is effect cost, not
   aesthetics.
7. **Chart Charter** — `--world-data-*` + `--world-z-*`, Victory only. A hard pre-flag gate for the **Dashboards
   surface only** — nothing else waits on it.
8. **⊕ Program-level token-discipline CI** — promote Store's deferred scripts (`check-degalaxy`,
   `check-token-discipline`) into one workspace gate + world-payload contrast lint + a one-page bridge-contract
   doc. Cheap entropy firewall *before* worlds multiply.
9. **Playwright cross-surface QA** — cascade / flicker / forced-colors across all 8 surfaces. This is the
   activation gate itself.
10. **Staged flag-on** — blast-radius ascending: About/Contact → Home → Video → Dashboards → Store → **Gallery
    last**, each with dwell time + runbook abort criteria. Money surfaces flip last, on a proven drill.

### WAVE 2 — SIGNAL (money, pointed at a live funnel)
11. **Marketing Command Center, Epic 1 = PRISM CAPTURE** (speed-to-lead, email-only + referral seeding) — Sean's
    #1. Detailed below. **May run as the ONE sanctioned parallel thread alongside Wave 1** (it's a pure token
    consumer with zero Lane-A dependency).
12. **⊕ Email surface token port** — transactional + lifecycle email in the idiom (sapphire-on-frost inline
    styles, dark-mode-safe). The forgotten surface; required by speed-to-lead *and* receipts.
13. **Polish sprint, traffic-ordered** — Store canvas/social-proof → Video CrystallineCanvas → Contact FAQ port
    → About portrait facet frame. Conversion-surface completeness *after* flags are live; assets unblocked by
    the Decision Pack.

### WAVE 3 — ROOT (adherence + progress-proof)
14. **Swan Guide / "Teach Me" build** — decisions-locked (grill complete) and small; trainer activation is the
    cheapest retention lever. `NEXT-CHAT-PROMPT-swan-guide-2026-07-16.md`. Idiom holds (one primary/surface,
    reduced-motion in JS, <300-line files).
15. **SWAN Training Cortex Phase 1** — detailed below. Acceptance criterion = a **trainer-visible progress-proof
    view**, binding progress-proof value to this epic instead of inventing a new one.
16. **World-Pack v1.5** — the dissolved Unified World program returns as *content*: cull 7 languages → 2, author
    as versioned payloads through Lane-A, CI-linted, staged in Appearance Studio, Sean-gated publish.

**Deliberately NOT added** (Kimi): no social/community anything (we are a coaching OS), no net-new surfaces
beyond email, no new epics for progress-proof (bound to Cortex). RPG game stays deferred — affirmed.

---

## THE ONE NEXT BUILD AFTER THE GALLERY — "FIRST LIGHT (Activation)"
**Lane-A lens wiring → activation gate → staged flag-on, run as a single build.** Why this and not Marketing:
1. **Multiplier on sunk work** — 8 surfaces of shipped value are worth zero while dark; this turns them all on
   for *days* of effort, not weeks.
2. **Lowest-risk high-value move** — fail-closed gates + written runbook = fully reversible by construction.
3. **Protects Sean's #1** — launching marketing mid-flag-flip destroys attribution; activation first gives
   marketing a stable, instrumented funnel to be measured against.
4. **Dissolves the fork** — once Lane-A emits, "Unified World" stops being a competing redesign and becomes
   payloads through a live pipe.

> **Naming note.** Kimi independently used "FIRST LIGHT" for *both* the activation build *and* the marketing
> epic, because they are the twin "turn the register on / open the front door" moves. This doc names them
> distinctly: **FIRST LIGHT (Activation)** = Lane-A wiring (Wave 1, #3); **PRISM CAPTURE** = speed-to-lead
> (Wave 2, #11). PRISM CAPTURE has **zero Lane-A dependency** and is the one sanctioned parallel money thread.

---

## WAVE 2 DETAIL — MARKETING EPIC 1: "PRISM CAPTURE" (speed-to-lead)
*Kimi's verdict on the Marketing Trinity handoff: "a beautiful answer to the wrong first question — it rebuilds
the window dressing before the register works." Today a stranger hits a multi-field contact form whose alert
path is "SendGrid + Twilio best-effort on env keys." Best-effort alerting is where speed-to-lead goes to die.*

**The epic:** *one beam in, spectrum out.* An email-only, one-click capture surface on every marketing page,
wired to a **guaranteed sub-5-minute alert loop**, whose success state refracts into booking, trainer-intent,
and a seeded referral link. Flag-gated, fail-closed, bind-only to the money path. Rides HomePage.V4 hero today;
re-mounts untouched into the Trinity rebuild later (pure `--world-*` consumer).

**Minimal-click funnel (ONE required click):**
- Click 0 — land on `/`; above the fold at 414px: headline + `PrismCapture` = ONE frosted email field + ONE
  primary GlowButton. Secondary text-link "I'm a trainer →".
- Click 1 — submit email → `POST /api/leads`. No modal, no nav, no account, no name field.
- Refraction state (0 clicks, each beam 1 click, none gating): **Book a free consult** (OrientationForm modal,
  email prefilled) · **I'm a trainer** (`/contact?intent=trainer`) · **Share** (`navigator.share` / copy
  `?ref=<CODE>`).
- Parallel (0 clicks): auto-ack email (booking + referral link) within seconds; **guaranteed SMS to Sean**.
- Funnel B (trainer) = same pipeline, `intent=trainer`, owner SMS flagged **TRAINER** (highest-value).
- Funnel C (referral) = every lead gets a `ref_code`; `useAttribution` stashes `?ref=` in sessionStorage;
  any capture attaches `referred_by`; **no rewards economy in epic 1** (money decision, made later with data).

**Files (frontend `components/marketing/PrismCapture/`):** `PrismCaptureGate.tsx` (house lazy+ErrorBoundary+rAF
probe → fail-CLOSED to current hero CTA) · `PrismCapture.tsx` (orchestrator, <300, css`` helper) ·
`PrismCapture.tokens.ts` (the ONE bridge; pure consumer; `var(--token,#fallback)`) · `PrismField.tsx` (frosted
facet input, sapphire caustic focus, 44px) · `PrismRefraction.tsx` (3 beams; full tier = one M3 refract beat/
session; reduced-motion + essential = static frost GlassCard, identical content) · `useAttribution.ts`. Mounts:
HomePage.V4 hero + final-CTA; About + Contact reuse. Events via `lib/acquisition.ts`.

**Backend (additive; contact routes stay byte-equivalent):** `leadRoutes.mjs` → `POST /api/leads`
`{email,intent?,source,utm{},ref?}` → validate → dedupe-upsert by email → row → async alert → `200{ok,refCode}`
(mount beside contact in `core/routes.mjs`). `leadAlertService.mjs` → `notifyOwner()` (Twilio SMS; **boot-time
env check, log LOUD if missing**; SendGrid fallback; one retry; `alerted_at`) + `sendAck()` (`ack_sent_at`).
Schema: extend CRM leads table (`intent, ref_code, referred_by, utm_json, alerted_at, ack_sent_at, status`) +
`acquisition_events`. No third-party analytics dependency. Rule 58 information_schema prod check before landing.

**Gaps closed in-epic:** guaranteed alert path · booking target (OrientationForm prefilled default) · a **Lead
Inbox** so Sean sees leads aging (unworked leads are worse than none) · 3-email nurture (day-0/2/5) · attribution
parity (contract test) · referral OG cards (bind to Trinity Phase 1 meta) · consent microcopy + working
unsubscribe · one weekly funnel number Sean can say out loud.

**Sequence:** Gallery → FIRST LIGHT (activation) → PRISM CAPTURE absorbs Trinity Phase 5 (trainer-intent deep
link) + Phase 1 (OG meta) and delivers them earlier; Trinity keeps everything else and beautifies surfaces whose
capture already converts.

---

## WAVE 3 DETAIL — CORTEX PHASE 1, SLICE 1: "THE RULEBOOK (Progression Engine v0)"
*Kimi: the first slice of the brain is not ingestion — it's a **write path with a consumer**. Ingestion-first is
a write-only DB; the core loop doesn't move for a month and the repo has enough JSONB graveyards.* Trainer-
authored progression/regression rules, versioned + approved, evaluated deterministically after every logged
session, emitting trainer-gated `ProgressionEvent`s that land as the client's next-best-action.

**Data contract (4 tables — 2 of the ratified 12, reuse existing patterns):**
- **`KnowledgeRule`** (NEW): `trainerId/clientId/exerciseId` (NULLs = scope broadening; NULL trainer = SWAN-global
  seed) · `ruleType ENUM('progression','regression')` (v0 only) · `condition JSONB` (template: rep_target_streak
  / pr_achieved / pain_threshold / rpe_stall) · `action JSONB` (increase/decrease_load / adjust_reps + cap) ·
  `naturalLanguage TEXT` · `priority INT` · `status ENUM(draft,active,paused,archived)` · `provenance JSONB`.
- **`RuleVersion`** (NEW, `WaiverVersion` pattern) — immutable; any edit = new version.
- **`ProgressionEvent`** (NEW, the decision-5c log): `direction, triggerType, ruleId/ruleVersionId, evidence
  JSONB` (immutable progress proof) `, fromState/toState, status ENUM(proposed,approved,applied,dismissed,
  expired), dedupeKey UNIQUE` (idempotent re-runs) `, decidedBy/decidedAt/decisionNote/appliedAt`. Approval
  shape reused from `LongTermProgramPlan` — no new approval framework, no separate audit table.

**Service:** `ruleEngineService.mjs` → `evaluateClientSession(clientId, sessionId)`, fired **async off the
`WorkoutSession` completion path, wrapped in try/catch — engine failure must NEVER block the session write**
(logging is sacred, the brain is downstream/expendable). Closed registry of pure, unit-testable condition
evaluators, zero LLM. Upserts `ProgressionEvent(proposed)` via `dedupeKey`.

**Surfaces:** `ruleRoutes.mjs /api/rules` (trainer/admin CRUD) · `progressionEventRoutes.mjs` (trainer review
queue) · `POST /api/progression-events/:id/decide` (**trainer only, client 403**) · `GET /api/me/next-action`
(client, `approved+` only). Trainer UI: `CoachRulebook.tsx` + `ProgressionReviewQueue.tsx` as a tab in the
**Coach Command Center** (template picker + numeric params + live `naturalLanguage` preview; no free-form DSL).
Client UI: `NextActionCard.tsx` ("Coach's call: Goblet Squat 3×12 @ 105 lb ↑" with evidence inline).

**How it closes the core loop:** on `approve`, the service mutates **only numeric targets**
(`targetLoad`/`targetReps`) on the referenced `WorkoutPlanDayExercise` — the existing client logging UI renders
new numbers with **zero client-UI changes** (the plan is the message bus). v0 mutates numbers, never structure.

**Trainer-indispensability (structural):** rules writable trainer/admin only (403 + unmounted for clients) ·
clients never see `proposed` (server status filter) · nothing auto-applies (engine proposes, trainer decides —
same philosophy as `ENABLE_CLIENT_PLAN_SELFGEN=off`) · every card renders "Approved by Coach {name}" · SWAN-
global NASM/OPT seeds ship `draft` (nothing fires until a trainer activates).

**Deliberately out of v0:** ingestion pipeline (S2), rule_conflicts (priority only), structured contraindications
(S3) — so regression triggers v0 use only fields that exist today (`ClientPainEntry.level`, `Set.rpe`, missed
sessions); no readiness score, no MovementProfile, no swaps, reactive/post-session only.
**Rest of Phase 1:** S2 ingestion spine (vault sections → draft rules) · S3 safety (contraindications +
safety/substitution ruleTypes) · S4 (parallel-safe) credentials/CE + swan_methodology B2B2C trust layer.

---

## RESUME POINTERS (for the next agent)
- **Program state / proven per-surface recipe:** `SWAN-DESIGN-OVERHAUL-PROGRAM-TRACKER-2026-07-18.md`,
  `NEXT-CHAT-PROMPT-design-overhaul-2026-07-18.md`.
- **Gallery (do this first, its own handoff):** `NEXT-CHAT-PROMPT-gallery-kimi-vision-2026-07-19.md`.
- **Design law + canon:** `.claude/skills/swan-design-router/SKILL.md` + `docs/ai-workflow/design-brain/design.md`.
- **Broader-roadmap source docs:** Marketing — `MARKETING-TRINITY-REBUILD-HANDOFF-2026-07-16.md`,
  `MARKETING-OS-CONTINUITY-HANDOFF-2026-07-05.md`. Cortex — `SWAN-CORTEX-UNIFIED-BRAIN-MASTER-DIRECTIVE-2026-07-12
  .md`, `CORTEX-PHASE0-RECONCILIATION-2026-07-14.md`. Swan Guide — `NEXT-CHAT-PROMPT-swan-guide-2026-07-16.md`.
  Unified World (now dissolved → World-Pack) — `SWAN-UNIFIED-WORLD-REDESIGN-MASTER-2026-07-16.md`.
- **Raw Kimi consults (local, gitignored):** `.ai-workflow/fusion/kimi-whats-next-master.md`,
  `kimi-marketing-deepdive.md`, `kimi-cortex-deepdive.md`.

## PROVENANCE
Kimi K3 (`moonshotai/kimi-k3`, effort=medium) × 3 consults, ~$0.42. Overhaul in Kimi's vision per Sean 2026-07-19.
Design-overhaul program: 7 surfaces shipped flag-off to main (lens/Dashboards/Store/Home/About/Video/Contact),
Gallery = last surface, handoff ready. This roadmap supersedes the ad-hoc "what's next" ordering in prior handoffs.
