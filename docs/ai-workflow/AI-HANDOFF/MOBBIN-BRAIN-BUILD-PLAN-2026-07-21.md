# Mobbin Brain — Ranked Build Plan (2026-07-21)

> **SUPERSEDED (2026-07-21, same day):** the plan of record is now
> `MOBBIN-BRAIN-BUILD-PLAN-v2-FABLE-KIMI-2026-07-21.md` — Fable-upgraded, Kimi K3 co-signed (R1
> SHIP-WITH-CHANGES → R2 SHIP). This v1 stays as the research-ranked baseline; do not sequence work from it.

**Source:** distilled from `MOBBIN-BRAIN-COVERAGE-PLAN-2026-07-21.md` — Section A (fitness, 12 domains) top-10
candidates + Part C (website archetypes) 8 Swan cross-benefits. **This is a prioritization of RESEARCH
CANDIDATES, not approved work.** Every item still passes the gate chain before any code:
`grill-me` (rule 64) → `chromie` if the bet is unproven (rule 65) → `swan-orchestrator` (rule 15/26/32) →
`swan-design-router` if UI (rule 40) → build → `closeout-evidence-lock`. Nothing here is built yet.

## Ranking rubric (why the order is what it is)
Weighted by, in order: **(1) Marketing Command Center = #1 focus** (acquisition/money is the current gap; RPG
deferred — per Sean's standing directive) · **(2) Product Core Loop** (workout-progress-first: log → chart →
next action → share) · **(3) trainer-indispensability** (clients read+do, trainer decides) · **(4) least-clicks
mandate** · **(5) effort vs risk** (S/M/L = rough estimate, `[HYPOTHESIS]` until scoped) · **(6) unblocks-others**.
Rule 62 strategy gate applied throughout: kill anything that doesn't strengthen coaching, adherence, progress
proof, community, revenue, or trust.

## Important framing (honest caveats)
- **Most items ENHANCE existing surfaces, not net-new.** Per project context `[LIKELY]`, Swan already has:
  workout logging, Victory charts, basic gamification (XP/levels/streaks), social feed, Swan Coach (gated),
  store/packages, onboarding, 4 dashboards, dictation→records, a theme/lens system. Framed as "gap-fill/enhance"
  below, not "build from scratch." Each needs a Canonical Surface Receipt (rule 26) to confirm the real current
  state before work.
- **High-stakes items** (billing/Stripe, auth, multi-tenant) trigger Rule 50 Tier-C (Village) + Sean's explicit
  approval. Flagged with ⚠.
- **The DORMANT `PostWorkoutCelebration` completion-card question** (from the completion-blueprint addendum) is a
  prerequisite decision inside Wave 1 — where does a CLIENT complete their own workout? Answer via a
  canonical-surface-audit before Wave 1 UI.
- **The public site-overhaul (theme/lens wiring) is with ANOTHER agent** (SITE-OVERHAUL handoff). The theme-toggle
  item here is REFERENCE only — coordinate, do not collide (rule 67).
- **Gamification-V2 RPG is business-DEFERRED** despite being the research goldmine — Sean's memory: RPG deferred,
  Marketing is the focus. Honest tension noted; it's Wave 4, not Wave 1.

---

## THE RANKED PLAN (waves = sequence; within a wave, top = do first)

### Wave 0 — UX foundation (small, high-leverage, unblocks the rest) — DO FIRST
| # | Item | Why now | Effort | Gate |
|---|------|---------|--------|------|
| 0.1 | **Empty-state coaching + inline form validation + branded 404** (pass 39) | Data-truth rule: new clients have no data — coach the first action ("Log your first workout") instead of blank/mock charts. Cheap, honest, touches every dashboard. | S | design-router |
| 0.2 | **⌘K command palette + global search** on admin/trainer dashboards (pass 40) | Least-clicks mandate, highest daily-use nav win — jump-to-client/workout/setting in one keystroke. | M | orchestrator+design-router |
| 0.3 | **Chart/list skeleton loading** (pass 39) | Kills the layout-jump that reads as janky; trivial polish across dashboards. | S | design-router |

### Wave 1 — Core loop / proof-of-value (the product's reason to exist; retention + upsell proof)
| # | Item | Why now | Effort | Gate |
|---|------|---------|--------|------|
| 1.1 | **Workout logger: PREVIOUS/last-time column + auto-rest-timer (±15/skip) + RPE/AMRAP + inline set notes** (pass 30) | Core-loop table stakes; "log against last time" is the #1 progressive-overload UX. Unblocks 1.2/1.3 (needs the richer logged data). | M | orchestrator+design-router |
| 1.2 | **Per-exercise analytics: e1RM + per-rep-range PR records + PR badges on sets** (pass 22) | Progress proof from REAL logs (data-truth) — the core-loop payoff Swan charts are currently coarser on. | M | design-router |
| 1.3 | **Muscle-readiness body map from logged volume** (pass 28) | Strength-native readiness (Fresh/Recovering/Fatigued) — trainer coaching tool; depends on 1.1 data flowing. | M | design-router |
| 1.4 | **Resolve + build the workout-completion proof card** (completion-blueprint) | Wires the DORMANT `PostWorkoutCelebration`; ties log→celebrate→share. **Prereq:** canonical-surface-audit of the client-completion surface first. | M | orchestrator (Fable review already on file) |

### Wave 2 — Money / acquisition (Marketing Command Center = #1 focus)
| # | Item | Why now | Effort | Gate |
|---|------|---------|--------|------|
| 2.1 | **Coach acquisition surface: booking (slot grid + reschedule-with-credit-policy) + trainer profile (case-study/portfolio shape) + directory** (passes 26, 33, 35) | The acquisition/booking money-path; "hire this trainer" = marketplace + portfolio profile merged. Directly serves the #1 focus. | L | grill-me→chromie→orchestrator→design-router |
| 2.2 | ⚠ **Transparent trial-timeline paywall + Free-vs-Guardian-vs-Crystalline comparison + session-package usage meters + tier up/downgrade + billing hub** (passes 24, 37) | Money conversion + self-serve billing; tier-change is a current gap. **HIGH-STAKES (Stripe/billing → Tier-C Village + Sean approval).** | L | Village + Sean approval |
| 2.3 | **Admin financial dashboard** (fintech patterns: revenue chart w/ compare-period + package "holdings" table + payments ledger) (pass 34) | Admin proof-of-value + Marketing revenue view; depends on 2.2 billing data. | M | design-router |

### Wave 3 — Coaching depth & content
| # | Item | Why now | Effort | Gate |
|---|------|---------|--------|------|
| 3.1 | **Trainer plan-builder: structured set-schemes + supersets + reusable template library (build once → assign many)** (pass 25) | Trainer-OS depth (makes Swan a coach OS, not a logger); larger build, benefits from Wave-1 logger data model. | L | grill-me→orchestrator→design-router |
| 3.2 | **Data-grounded Swan Coach** (answers cite the user's real logged data/readiness) (pass 21) | Biggest AI-coaching upgrade; needs Wave-1 logged-data plumbing. Keep trainer-gated + never "AI" user-facing. | M | orchestrator (privacy rule 8) |
| 3.3 | **Video Collections / member-playlists + multi-facet filter** (pass 29) | Video-library strategy (free funnel → member playlists); trainer-curated collections + bookmarks. | M | design-router |
| 3.4 | **Onboarding physical self-assessment → personalized plan-preview reveal** (pass 24) | Assess-before-prescribe; ends onboarding with "your coach built THIS for you." Trainer-gated. | M | grill-me→orchestrator→design-router |

### Wave 4 — Deferred / gated (real value, but business-sequenced later)
| # | Item | Why later | Gate |
|---|------|-----------|------|
| 4.1 | **Gamification-V2 RPG** (consistency-driven avatar evolution + weekly-league ladder + daily-quest engine) (pass 27) | Research goldmine, but **business-DEFERRED** (Sean: RPG deferred, Marketing first). Revisit after Waves 1-2 prove retention need. | grill-me→chromie→orchestrator |
| 4.2 | ⚠ **Post-auth role router (client/trainer/admin → right surface) + SSO/passkey/magic-code polish** (pass 36) | Swan auth (JWT) works; this is polish. Auth = high-stakes; do when there's a reason. | Village if auth-core touched |
| 4.3 | **Trainer/client DM w/ "Offer 1:1 help" + message-requests gate** (pass 38) | Social kit; Swan social exists — enhance only if it reinforces coaching (rule 62), not a noisy feed. | orchestrator |

---

## Dependencies (build-order truth)
- **Wave 1 logger (1.1) is the spine** — 1.2 (analytics), 1.3 (readiness map), 1.4 (completion card), and 3.2
  (data-grounded Coach) all consume its richer logged-data model. Build 1.1 first.
- **2.2 billing** must land before **2.3 admin financial dashboard** (dashboard reads billing/payments data).
- **2.1 booking** is independent of the loop — can run in parallel with Wave 1 (different surface), which is
  attractive since it's the #1-focus money path.
- **0.x foundation** touches every later surface — cheapest to do first.

## What this plan deliberately does NOT recommend building
- Anything Swan already has that research merely re-confirmed (basic streaks/badges, basic class detail, self-
  schedule/add-to-cal, e-commerce cart, global leaderboard) — noted DEEP-DRY/already-logged in the coverage doc.
- Pure GPS/route/elevation cardio tracking (deprioritized — Swan is strength/trainer-led, pass 23).
- Live-studio class social layer (no live studio, pass 29).
- Generic social-media-feed behavior that doesn't reinforce coaching (rule 62).

## Recommended first move
**Wave 0.1 + 0.2 + Wave 1.1** as the opening slice set (foundation + the logger spine), because 1.1 unblocks the
most downstream value and 0.x is cheap. **In parallel, if Marketing is the priority right now, 2.1 (coach
booking/acquisition) can start independently** — that's the money path and Sean's #1 focus. If forced to pick ONE
to start: **Wave 1.1 logger** (unblocks the most) OR **2.1 booking** (serves the #1 business focus) — Sean's call
on which lever to pull first.

**Next-slice recommendation:** take the top of whichever lever Sean picks (logger spine vs coach-acquisition)
into `grill-me` to extract his exact intent, then `swan-orchestrator`. No code until that gate runs.
