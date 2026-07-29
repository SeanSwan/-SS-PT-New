# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/08a767d5-78bd-4cf1-a474-3d1ae047cbb9/scratchpad/workout-os-facts-packet-for-kimi.md
**Seed:** (none)
**Tokens:** 1946 in / 5432 out | **Cost:** ~$0.0873 | **Wall:** 209.1s

---

# SwanStudios Workout OS — Independent Plan

**Planning principle:** One component per job, per role — never three. Every consolidation is a nav change first and a deletion last. The 2,581-line save route is treated as untouchable infrastructure: wrap it, test it, never rewrite it.

---

## 1. Target IA + Surface Consolidation

### The shell: one "Workouts" hub, three tabs, role-shaped

Every role gets a single sidebar item — **Workouts** — that opens a mode-switched shell:

| Tab | Client | Trainer | Admin |
|---|---|---|---|
| **Today** (log) | ✅ own logger, dictation OFF (existing deliberate decision) | ✅ logger with client-context banner; dictation ON | ✅ same as trainer |
| **Plan** | ❌ hidden (house law: clients never author) | ✅ authoring | ✅ authoring |
| **Progress** (charts + streak + rings + suggested) | ✅ | ✅ per-client selector | ✅ per-client selector |

Plus a client-only dashboard card: **Suggested for you** (§4).

### Merge / kill decisions

| Surface | Verdict |
|---|---|
| `WorkoutLogger.tsx` (866 lines, canonical) | **THE logger for all roles.** Role differences become a config object (dictation on/off, client-picker on/off), not a second component. |
| `EnhancedWorkoutLogger.tsx` (159 lines) | **Dies.** Audit for any unique behavior (likely none — no dictation, no dock), port if found, then delete after grep-verified zero consumers. |
| Trainer "Log Workout" → clients-list intent flow | **Kept as the client-picker UX**, but it lands *inside* WorkoutLogger in trainer context, not a separate logger. This fixes the two disconnected entry points with one click-path: Clients → pick client → logger opens with their context. |
| Admin URL-only logger routes | Get real nav links via the hub. |
| `WorkoutPlannerPage.tsx` | **THE authoring surface.** Canonical. |
| `TrainerWorkoutForgePage.tsx` ("Build Plan") | **Dies as a page.** Its manual-authoring strengths are absorbed into the planner's Guided mode (§3). Route redirects to planner. |
| `WorkoutPlanBuilder.tsx` (454-line wizard, buried) | **Rescued and relocated** — becomes the planner's Guided mode, first tab. This is the one genuinely good onboarding pattern of the three; it was just buried. |
| `/workout` second dashboard stack | **Dies.** Name collision with the canonical planner is an active bug-generator. |
| `/workout-builder` orphaned page | **Dies.** Its AI logic is already superseded by planner_generate via Swan Coach. |
| Dead outlet wrapper, 38-line mobile placeholder | **Die.** Grep-verified first. |
| Gold accent re-declared in ~9 style files | Hoist to one theme token (`--accent-gold`); the 9 local declarations become var() references. Enforces the "coloring is confusing" complaint at the source: one accent means one meaning. |

Every deletion follows house law: replacement live → grep zero consumers → owner approval → delete. All new routes behind default-off flags until the old path is confirmed dead.

---

## 2. Logging Experience Design

**One logger, one color language, role-configured.**

- **Component:** `WorkoutLogger.tsx` extended with a `loggerContext` prop: `{ role, clientId, dictationEnabled }`. No second logger component ever again.
- **Trainer context mode:** persistent banner — "Logging for **[Client Name]**" — with a switch-client control. Saves pass `clientId` through the existing canonical save (which already handles per-client scope). This is the fix for the current trainer dead-ends.
- **Color semantics fix (the owner's actual complaint):** exactly three set-state colors, token-driven, repo-wide contract: **pending** (Frost White dim), **active** (Ice Wing cyan), **complete** (Gilded Fern gold — the *only* place gold appears in the logger). Wing Purple is reserved for Swan Coach presence. No other hues in the log flow. Contract tests already exist for 44px; add a token-usage test so nobody reintroduces a local hex/alias.
- **Coach dock stays** as-is; dictation stays admin/trainer-only; 44px touch targets enforced.
- **Post-save:** mount the celebration (§5) immediately on canonical-save success.

What I do **not** do: refactor the internals of the 866-line component beyond the context prop. It works, it's tested, and ~50 co-located files mean internal surgery is high-risk/low-reward. ≤300-line rule applies to *new* files, not a forced rewrite of this one.

---

## 3. Plan-Authoring Experience Design

**One planner, two modes, one copilot.**

- **Surface:** `WorkoutPlannerPage.tsx` becomes the sole authoring UI (trainer + admin only, per house law).
- **Mode 1 — Guided (default):** the 4-step wizard from `WorkoutPlanBuilder.tsx`, lifted out of the Client Hub sub-tab and made the planner's default entry. Good for 90% of Sean's real work.
- **Mode 2 — Power:** the existing planner canvas (AI generation, saved-plan vault, cursor advance). One toggle between modes; both write the same `WorkoutPlan.planData` JSONB shape with UUID ids.
- **One copilot pattern:** the planner's coach dock becomes the single AI-interaction UI repo-wide for workout surfaces. The Forge's divergent copilot panel dies with the Forge. Three copilot patterns → one.
- **Write model unchanged (deliberately):** planner_* coach commands stay FRONTEND_DISPATCH — they mutate the open form; the human presses Save. Server writes plans only through the human-approval proposal engine. This is the correct trainer-indispensability posture and I keep it.
- **Storage:** `planData` JSONB stays the plan-of-record. I explicitly do **not** wire the dormant `WorkoutPlanDay`/`WorkoutPlanDayExercise` normalized tables (see §9). The suggestion engine reads JSONB.

---

## 4. Suggested-Workouts Engine

**Name:** `/api/workout-suggestions` — never `/api/recommendations` (e-commerce trap, verified).

**Architecture: deterministic rules engine, zero LLM.**

```
Inputs (all server-side, ID-scoped, no PII leaves the DB):
  ClientPainEntry (active, correct window) ─┐
  OHSA compensations                        │
  onboarding coverage                       ├─→ Eligibility filter ─→ Ranking ─→ Suggestion[]
  readiness signal (Green/Yellow/Red caps)  │    (BLOCKING)            (+ reason strings)
  logged history (recency per movement)     ─┘
  NASM 736-exercise taxonomy (tags)
```

- **Eligibility filter is blocking, not advisory.** Even though the Cortex program owns the deep safety engine, the suggestion engine gets its own hard gate: any exercise contraindicated by active pain or OHSA compensation is excluded before ranking, full stop. This is the workout-surface program's own duty of care and does not duplicate Cortex — it consumes the same signals. When Cortex ships its fixed pain-window and blocking gate, the filter swaps to the shared module.
- **Readiness caps applied at output:** Red-day clients get mobility/activation suggestions only, with intensity capped; Yellow capped per existing signals.
- **Every suggestion carries a reason string** from the rule that generated it ("lateral hip shift noted — glute medius activation", "no pulling pattern logged in 9 days"). Template-based copy; no LLM anywhere in the path. This is what makes it trustworthy for a NASM-credentialed owner.
- **Surfaces:**
  - **Client dashboard card** "Suggested for you" — read + do. Client taps a suggestion → it loads into *their logger* as a session, never into a plan.
  - **Trainer view** — same suggestions *with rationale*, plus **"Push to plan"** which opens the planner with the suggestion pre-staged in the FRONTEND_DISPATCH form (human Save still the write).
  - **Swan Coach**: new command `suggest_workout` reads the engine and explains (clients) / proposes (trainers). Fits the existing 134-command registry and approval engine.
- **Cold start:** onboarding coverage + OHSA alone produce a valid first-week suggestion set; history deepens it.

---

## 5. Charts / Celebration / Streak / Badge Fixes

This is the cheapest visible-value work in the packet — four fully-built assets with zero mounts.

1. **Mount `PostWorkoutCelebration`** on canonical-save success in the logger, fed by the **server-computed completion receipt** (which currently has zero consumers). One wire, two dead assets revived.
2. **Streak chart:** streak is already computed; add one endpoint to the canonical 15-endpoint registry and one Victory chart card on the Progress tab.
3. **Badges auto-award:** call the existing (never-invoked) badge write path from the XP flow's milestone branch. A few lines; huge perceived-value win.
4. **Apex Rings:** mount the existing weekly-ring endpoint as the top card on the client Progress tab.
5. **Read-path convergence:** deprecate the legacy 13-chart trainer path reading `DailyWorkoutForm.formData`. Migrate its consumers to the canonical registry (which honestly reads workout_logs/workout_sessions), then mark the 13 endpoints deprecated (joining the 5 that already return empty by design). One chart truth, one registry.
6. **Write-path convergence (the real data-integrity fix):** the older `WorkoutExercise`+`Set` writers still live alongside flat `WorkoutLog` rows. Freeze new writes to the normalized path: route every workout save through `/api/workout-forms` (the only save). Give the chart registry a read-adapter for historical normalized rows so old data stays visible. No migration of old rows — adapt reads, converge writes.

---

## 6. Demo Mode Stance

**Adopt the stranded Swan Guide plan. It is already grill-locked and correct.**

- Interactive **Demo Mode** = checklist hub + spotlight tours, in-house engine, `data-tour` anchor registry + CI test, checkmark granted only when the real action completes, XP + badge on completion, warm-coach voice. Port it from the never-merged branch to main behind a default-off flag.
- **Teach Me is replaced, not deleted overnight.** Migration path: the ~1,961 lines of per-route copy become tour-step and tip content (it's actively maintained copy — its value is the writing, not the panel chrome). The per-exercise education generator with content-honesty guards survives as the "Learn more" leaf inside Demo Mode. Teach Me panels retire only after tour parity per route, grep-verified, owner-approved.
- **Demo persona:** wire the existing 90-day realistic dataset seeder + 55yo risk-persona client into a "Try it as a demo client" entry — every chart and the suggestion engine light up with real-feeling data. localStorage seen-state stays for v1.
- This also feeds §5: completing a tour earns XP/badges through the now-wired auto-award path.

---

## 7. Slice Sequence (ranked by harm-reduction-per-hour)

| # | Slice | Harm reduced | Size |
|---|---|---|---|
| **0** | **Feature-flag scaffolds + Workouts hub nav shell** (per-role sidebar, tab frame, route registry incl. fixing the `/workout` name collision). Everything else lands inside this shell. | Users lost in split surfaces | **S** (2–3 d) |
| **1** | **Dead-code excision:** grep-verify + delete `/workout` dashboard stack, `/workout-builder`, dead outlet, mobile placeholder. Owner-approved. | Nav confusion, collision bugs; near-zero cost | **S** (1–2 d) |
| **2** | **Logger convergence:** `loggerContext` prop on WorkoutLogger; trainer client-picker → in-logger context banner; admin nav link; audit + retire `EnhancedWorkoutLogger`. Single 3-color set-state language + gold token hoist. | The owner's #1 complaint; two disconnected trainer entry points | **M** (4–6 d) |
| **3** | **Charts activation:** mount celebration + receipt consumer, badges auto-award hook, streak endpoint+card, Apex Rings mount. | Four dead assets; zero-effort visible delight; retention signal | **S** (2–4 d) |
| **4** | **Planner consolidation:** wizard lifted in as Guided mode; Forge redirected then deleted; one copilot dock; shared planData writer. | Three authoring UIs, none linked | **M–L** (1.5–2 wk) |
| **5** | **Chart/storage convergence:** freeze normalized-set writes, read-adapter for legacy rows, migrate consumers off the 13-chart legacy path. | Data drift → charts that disagree | **M** (1 wk) |
| **6** | **Suggestion engine v1:** deterministic eligibility+ranking, client card, trainer push-to-plan, coach `suggest_workout` command. | Owner's headline ask; zero today | **L** (2 wk) |
| **7** | **Demo Mode:** port Swan Guide branch, data-tour anchors + CI, demo persona entry, Teach Me copy migration, Teach Me retirement after parity. | Onboarding/help modernization | **M–L** (1.5–2 wk) |

Golden-master contract tests on `POST /api/workout-forms` (billing deduction, cursor advance, receipt, PR detection, XP) land in Slice 2 **before** any slice that touches a save consumer — non-negotiable precondition.

---

## 8. Top 5 Risks

1. **The 2,581-line mega-transaction breaks silently** (billing, XP, cursor in one tx). *Mitigation:* never refactor it; golden-master contract tests before any consumer change; all save-adjacent work behind flags with instant rollback.
2. **Two set-storage shapes produce contradictory charts** mid-migration, eroding Sean's trust in "every useful piece of data reaching charts." *Mitigation:* converge writes first (Slice 5), adapt reads, and run a reconciliation query comparing both stores per client before cutting the legacy chart path.
3. **Consolidation regresses a workflow Sean actually uses** (he's the power user of the planner). *Mitigation:* replacements live side-by-side behind flags; Sean dogfoods each replacement before the old surface is even proposed for deletion; grep-zero + owner approval gate stands.
4. **Suggestion engine surfaces an unsafe exercise** because pain-window/eligibility defects are real today and Cortex's fix timeline is not mine to control. *Mitigation:* the engine ships its own blocking eligibility filter and readiness intensity caps (§4); coordinate with Cortex on a shared module but never block on it; the 55yo risk-persona seeder becomes the safety regression test fixture.
5. **Solo-maintainer scope explosion** — seven slices, one developer. *Mitigation:* one flag in flight at a time; every slice ships to production green before the next starts; Slices 3 and 1 front-load morale-value wins at trivial cost.

---

## 9. Explicit Not-Build List (at this scale)

1. **Wiring the normalized `WorkoutPlanDay`/`WorkoutPlanDayExercise` tables** — planData JSONB works; normalization is a migration with zero user-facing payoff for a solo trainer.
2. **Native mobile app / PWA-offline mode** — 44px-tested responsive web is the correct ceiling for one trainer.
3. **Realtime multi-user collaboration** on plans or logs — no second simultaneous editor exists in this business.
4. **Any new LLM features** — no generative program-writing beyond existing planner_generate, no LLM in the suggestion engine. Deterministic first is both house law and the right product call for a 26-year NASM trainer's brand.
5. **Client-facing voice dictation** — the role gate is a deliberate prior decision; reopening it is scope creep with PII-pipeline cost.
6. **A second charting library, custom chart framework, or D3** — Victory-only, period.
7. **Social/community/marketplace features** (client feeds, exercise marketplace, trainer network) — B2B2C ambition does not justify platform surface area before the core loop is consolidated.
8. **Multi-staff/gym-tier admin** (roles beyond admin/trainer/client, org hierarchies) — the TrainerPermissions drift gets fixed by Cortex's lane; I don't build tiering for customers who don't exist.
9. **Wearable/HealthKit/Strava integrations** — readiness signals already exist internally; ingestion pipelines are a maintenance tax with no current demand.
10. **A design-system rebuild** — the token system is already clean (zero naked hex); the only styling work is the gold hoist and the 3-color log language. Resist the rewrite urge.

---

**Bottom line:** Slices 0–3 land in roughly two weeks and fix the owner's stated pain (confusing logger, split surfaces) plus four dead delights. Slices 4–6 deliver the headline ask (one authoring surface, suggested workouts) on a converged data spine. Slice 7 modernizes help into Demo Mode using the plan that was already grill-locked. Nothing is deleted before its replacement is live, nothing reaches an LLM, and clients read and do — trainers decide.
