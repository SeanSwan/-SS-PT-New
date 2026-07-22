---
decision: Build spec for the client-dashboard Off-Day Recovery panel ("Recovery Compass") — auto-queried, real-client-data-grounded NASM recovery/corrective recommendations for rest days. Fable-drafted; Kimi K3 co-design pending.
status: open
supersedes: none
---

# Recovery Compass — Off-Day Recovery Panel (client dashboard) — Build Spec v1

**Sean's intent (verbatim distilled):** on days off, clients should be shown what to do that is NOT part of the
main plan but solidifies them: flexibility, muscle recovery, myofascial release / foam rolling especially,
corrective work for posture (upper/lower-crossed syndrome, scapular retraction class), and fat-burn cardio —
things that pull the body back where it's supposed to be and that will NOT hurt the next planned workout. It
must query AUTOMATICALLY on the client dashboard and display where the client sees it easily.
**HARD LAW (Sean, this session): every recommendation derives from the client's REAL data with visible
provenance. No generic filler. Not enough data → honest cold-start, never invented picks.**

## Ground truth (discovery receipt, verified — full receipt in session log)
- Client home = `ClientDashboardHome.sections.tsx` — `TodaysAssignmentCard` (line 247) is the "today" slot; a
  recovery panel belongs beside/in-place-of it on off-days. No recovery surface exists there today.
- Backend recommendation engine EXISTS: `workoutService.getExerciseRecommendations` (workoutService.mjs:1112+)
  with `rehabFocus` filter (`exerciseType IN (injury_prevention,injury_recovery,flexibility,stability) OR
  cesProtocolStep != null`); route `GET /api/exercises/recommended` (exerciseRoutes.mjs:534, client-self-reachable).
- Exercise taxonomy: `exerciseType` ENUM (flexibility/stability/balance/injury_*, NO cardio/SMR/corrective values);
  `bodyPartCategory` free-text carries `recovery`/`cardio`; SMR/corrective = `cesProtocolStep`
  (inhibit/lengthen/activate/integrate) + `nasmCorrectiveCategory` JSON tags (e.g. upper_crossed_syndrome);
  `contraindicationNotes`; `experiencePointsEarned`; `canBePerformedAtHome`; `optPhases`.
- Plan model: `WorkoutPlan(status=active)` → `WorkoutPlanDay.dayType ∈ (training,active_recovery,rest,assessment,
  specialization)` → `WorkoutPlanDayExercise`. Client reads own plan: `clientWorkoutRoutes.mjs:58 /:userId/current`.
- Swan Coach tool `view_exercise_recommendations` exists but `roleRequired:['admin','trainer']` — clients cannot ask.
- Streak model exists (`streakType` ENUM without 'recovery'); `updateStreak` fires only on logged workouts.
- GAPS (7): no client UI consumer · no off-day mode on the endpoint · no client Coach tool · no day-state
  detection · no plan-conflict avoidance · no first-class SMR/cardio taxonomy · no recovery streak/XP hook.

## Architecture (ENHANCE the existing engine — no greenfield)

### Backend
1. **`backend/services/recovery/recoveryCompassService.mjs`** (new, <300 lines) — the composer:
   - **Day-state detection:** active plan's day for today (dayType) + today's logged session ⇒
     `training | active_recovery | rest | unplanned | already-trained`. No active plan ⇒ `no-plan` cold start.
   - **Real-data inputs (provenance-carrying):**
     a. **Recent load** — muscle groups from the client's logged sets, last 48–72h ⇒ SMR/stretch targets
        ("You trained back + shoulders yesterday → foam-roll lats, stretch pecs").
     b. **Posture/corrective flags** — movement-screen / pain-entry records where present ⇒
        `nasmCorrectiveCategory` matched exercises in CES order ("Your screen flagged forward head →
        scapular retraction activation").
     c. **Tomorrow's plan day** — conflict avoidance: exclude loading/fatiguing work for muscle groups scheduled
        within next 24h; recovery work only (inhibit/lengthen OK, heavy activation excluded).
     d. **Goals** — fat-loss goal ⇒ include a low-impact cardio block (`bodyPartCategory='cardio'`,
        `canBePerformedAtHome` preferred), framed as optional zone work.
     e. **Contraindications** — `contraindicationNotes` + pain-entry joins filter everything.
   - **Output = CES-ordered ritual blocks:** `inhibit (SMR/foam-roll) → lengthen (stretch) → activate
     (corrective) → optional cardio` — each block: exercises (id, name, thumb/video, duration/sets, XP),
     `why: []` provenance strings (plain-language, trainer-visible reasoning), `dataSources: []` machine tags.
   - **Determinism:** pure query/compose logic, NO LLM call ⇒ zero-PII concern, cacheable, testable.
2. **`backend/routes/recoveryRoutes.mjs`** — `GET /api/recovery/today` (protect, self-scoped; trainer/admin may
   pass `?clientId=` with existing `authorizeResourceAccess` pattern). Returns `{dayState, blocks, coldStart,
   generatedAt}`. Reuses `getExerciseRecommendations` internals where possible rather than duplicating filters.
3. **Swan Coach client tool** — register `view_recovery_suggestions` in the command registry with client role
   allowed, self-scope only ⇒ client can ask Coach "what should I do today?" and get the same composed answer
   (dispatcher calls recoveryCompassService; same provenance strings).
4. **Completion hook (slice-scoped):** `POST /api/recovery/complete` — records a lightweight recovery-activity
   record + awards exercise XP via the existing gamification engine WITH idempotency key (one award per
   client/day). `streakType='recovery'` ENUM addition is DEFERRED (Postgres enum migration risk) — flagged as
   follow-up; XP lands now.

### Frontend
5. **`RecoveryTodayCard`** (new folder `frontend/src/components/UserDashboard/components/RecoveryToday/`):
   `RecoveryTodayCard.tsx` + `.styles.ts` + `useRecoveryToday.ts` hook + types + tests. Mounted in
   `ClientDashboardHome.sections.tsx` beside `TodaysAssignmentCard`:
   - **Off-day (rest/active_recovery/unplanned):** panel takes the "today" priority slot — headline "Recovery
     day — pull your body back", CES ritual blocks as a checkable sequence, each item: thumb, name, dose,
     one-line why (provenance), 44px targets, video open via existing library patterns.
   - **Training day / already-trained:** collapses to a compact strip ("Cooldown tools" — SMR for today's
     trained muscles only), never competes with the plan.
   - **Cold start (no plan / no data):** honest state — foundational routine offer + "Complete your movement
     screen so your coach's protocol can personalize this" CTA. NEVER fabricated personalization.
   - Auto-query on dashboard load (hook, loading skeleton per Wave 0.3 pattern), lens tokens/`var(--token,#fb)`,
     styled-components, reduced-motion compliant, no MUI, Victory n/a.
6. **Trainer visibility (indispensability):** copy frames the engine as the coach's protocol ("Curated from your
   coach's NASM protocol"); provenance strings visible to trainer on their client view (read-only slice 1);
   trainer pin/exclude override = follow-up slice. Clients read+do, never decide plan content.

### Rules compliance
Rule 4 (≤300/file, split styles/hooks/types) · Rule 6 tokens · Rule 2 (44px) · Rule 8 (no LLM in path; Coach
tool returns IDs/names via existing patterns) · Rule 9 (say stretching/flexibility — never yoga) · Rule 58
(schema-drift check on every touched model/query — taxonomy is two-system, treat carefully) · Rule 26 receipt
(done — discovery) · Bugfix/TDD: service unit tests for day-state, conflict-avoidance, provenance, cold-start;
component tests for the four render states.

### Acceptance metrics (closeout payload)
- Day-state correctness: unit-tested matrix (plan day types × logged-today × no-plan).
- Provenance: 100% of recommended items carry ≥1 real-data `why`; zero recommendations render without one.
- Conflict-avoidance: tested — tomorrow's scheduled muscle groups never receive loading recommendations.
- Cold start renders the honest state with movement-screen CTA when data is insufficient.
- Client taps from dashboard-load → first recovery action started ≤2.

## Open design questions for Kimi (co-designer)
K1. **Presentation shape:** CES ritual as a vertical checkable sequence vs horizontal phase-stepper vs a single
    "Start recovery ritual" guided flow (one exercise at a time, full-bleed)? Least-clicks + gym-floor/home use.
K2. **Provenance UX:** inline one-liners per exercise vs a "Why these?" expandable that lists the data story?
    Trainer-trust vs clutter tradeoff on a phone.
K3. **Training-day collapsed strip:** worth shipping in slice 1, or off-day-only first?
K4. **Signature moment** for the panel within the Crystalline lens (dark-first, Ice Wing/Wing Purple glow
    discipline, reduced-motion fallback) — what makes this feel marvelous, not a to-do list?
K5. **Naming:** "Recovery Compass" vs "Restore Day" vs other — client-facing, premium, no yoga/meditation words.
K6. Anything mis-sequenced, over-scoped, or under-specified for a slice-1 ship? Cardio block in slice 1 or 2?
