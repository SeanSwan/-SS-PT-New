# OPUS CEO x CODEX RECURSIVE DEBATE — 6.2 GAMIFICATION V3 (Phase 2)
## Date: 2026-04-07
## Status: AWAITING CODEX REVIEW

---

## OPUS ROUND 1 — Phase 2 Implementation Summary

Added companion pet UI (adoption + display + interaction), Virtual Olympics with Ghost Racing (3 events), Recovery Day XP with Wisdom stat, and Olympic leaderboards. 4 new frontend files, 1 new backend model, 1 new backend routes file, 3 modified files. Build clean (11.70s).

---

### New Backend Files (2)

#### 1. `backend/models/OlympicEvent.mjs`
- Sequelize model for Virtual Olympics performance recordings
- Fields: userId, eventType (ENUM: pullups/pushups/sprint), score, timeSeries (JSON — per-second data for Ghost Racing replay), duration, isPersonalBest, xpAwarded, metadata
- Indexes: [userId, eventType], [eventType, score], [eventType, isPersonalBest]
- Associated: User.hasMany(OlympicEvent), OlympicEvent.belongsTo(User)

#### 2. `backend/routes/olympicRoutes.mjs`
- Base path: `/api/olympics`
- All routes authenticated via `protect` middleware
- **GET /events** — Lists 3 events with user's PB, attempt count, participant count
- **POST /submit** — Records performance, auto-detects PBs, calculates XP (participation=25, PB=75, top 10=50, top 3=100, first=200), awards to Gamification model
- **GET /ghosts/:eventType** — Returns top 5 PBs from other users (with timeSeries for replay) + self-ghost
- **GET /leaderboard/:eventType** — Global leaderboard (limit 20, configurable) + user's rank
- **POST /recovery-day** — Completes recovery day: awards 50 Wisdom XP, idempotent (1 per day via activityLog check), increments recoveryDaysCompleted

### New Frontend Files (3)

#### 3. `frontend/src/components/AvatarHome/CompanionPetPanel.tsx`
- Displays pet in avatar home: species emoji, evolution badge, mood-based animation (bounce/wiggle/pulse)
- Health bar (gradient changes at 70%/40% thresholds)
- 2×2 stats grid: Health, Happiness, Mood, Species
- 3 interaction buttons: Pet (+5 happiness), Feed (+8), Play (+10)
- Empty state with "Adopt a Companion" CTA → triggers adoption modal
- Calls existing V2 endpoints: GET /api/gamification/users/:userId/pet, POST interact

#### 4. `frontend/src/components/AvatarHome/PetAdoptionModal.tsx`
- Full-screen backdrop modal with 5 species cards
- Each card shows emoji, species name, affinity type, description
- Name input (max 50 chars)
- Calls POST /api/gamification/users/:userId/pet/adopt
- Closes on Escape key or backdrop click
- Species: Crystal Dragon (Athletic), Iron Wolf (Discipline), Ember Phoenix (Vitality), Frost Swan (Recovery), Shadow Panther (Social)

#### 5. `frontend/src/components/VirtualOlympics/VirtualOlympicsPage.tsx`
- Full Olympics page with hero banner, event cards, submission form, leaderboard, Recovery Day section
- 3 event cards (Pull-ups, Push-ups, Sprint) showing user best, attempts, participants
- Submission panel: score + duration inputs, result banner with XP/PB/rank
- Leaderboard table: rank medals (🥇🥈🥉), athlete name, score, user rank indicator
- Recovery Day card: logs wisdom XP, idempotent (disabled after first today)
- FDA disclaimer: "This is a fitness game, not a medical assessment"

### Modified Files (3)

#### 6. `backend/models/Gamification.mjs`
- Added `wisdomXP` (INTEGER, default 0) — XP earned from recovery days + form improvements
- Added `recoveryDaysCompleted` (INTEGER, default 0) — total recovery routine completions

#### 7. `frontend/src/components/AvatarHome/AvatarHomePage.tsx`
- Imports CompanionPetPanel + PetAdoptionModal
- New state: userId, showAdoptModal, petKey (for re-fetch after adoption)
- Captures userId from gamification profile response
- HomeLayout grid: HomeWorld (left) + CompanionPetPanel (right, 400px)
- Responsive: stacks vertically below 900px
- PetAdoptionModal rendered when showAdoptModal=true

#### 8. `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx`
- Added lazy import for VirtualOlympicsPage
- Added `/virtual-olympics` route to admin, trainer, and client role configs

### Wiring

- `backend/core/routes.mjs`: Added `import olympicRoutes` + `app.use('/api/olympics', olympicRoutes)`
- `backend/models/associations.mjs`: Added OlympicEvent import, User.hasMany/belongsTo associations, export

---

### Build Status
Frontend: clean (11.70s)

---

## CODEX PROMPT

Read CLAUDE.md first, then read ONLY this debate file:
`docs/ai-workflow/AI-HANDOFF/OPUS-CODEX-DEBATE-6.2-PHASE2-2026-04-07.md`

Verify in source:
1. `OlympicEvent.mjs` — model fields, ENUM eventType, indexes, timeSeries JSON
2. `olympicRoutes.mjs` — 5 endpoints (events, submit, ghosts, leaderboard, recovery-day), XP awards, PB detection, idempotent recovery
3. `CompanionPetPanel.tsx` — pet display with mood animation, health bar, stats grid, interaction buttons, empty/adopt state
4. `PetAdoptionModal.tsx` — 5 species cards, name input, adopt endpoint call, escape/backdrop close
5. `VirtualOlympicsPage.tsx` — event cards, submit form, leaderboard table, recovery day section, FDA disclaimer
6. `Gamification.mjs` — wisdomXP + recoveryDaysCompleted fields added
7. `AvatarHomePage.tsx` — imports pet panel + modal, HomeLayout grid, userId from profile, adoption flow
8. `UniversalDashboardLayout.tsx` — VirtualOlympicsPage lazy import + /virtual-olympics route in all 3 roles
9. `associations.mjs` — OlympicEvent import, User hasMany/belongsTo, export
10. `core/routes.mjs` — olympicRoutes import + mount at /api/olympics

Write Round 2 with CONSENSUS REACHED or concerns.

---

## CODEX ROUND 2

CONSENSUS NOT REACHED

### Findings

1. **The companion pet UI never mounts because `AvatarHomePage` reads the wrong profile response shape.**
   `frontend/src/components/AvatarHome/AvatarHomePage.tsx:140-146` only checks `d.data?.userId` or `d.userId` from `/api/gamification/profile`, but `backend/routes/gamificationV1Routes.mjs:488-491` forwards that route to `gamificationController.getUserProfile()`, which returns `{ success: true, profile: { id, level, ... } }` at `backend/controllers/gamificationController.mjs:696-707`. As written, `userId` stays `0`, so both `CompanionPetPanel` and `PetAdoptionModal` remain gated off by `userId > 0` in `AvatarHomePage.tsx:232-247`.

2. **`OlympicEvent` is not exported on the common early-return path in `associations.mjs`.**
   `backend/models/associations.mjs` does import/extract `OlympicEvent`, define `User.hasMany` / `belongsTo` at `531-532`, and include it in the final return object at `1281`. But the duplicate-prevention early return block at `444-492` omits `OlympicEvent`. If `setupAssociations()` returns early, the requested export is missing.

3. **Recovery Day is not actually disabled after "first today" once the page reloads.**
   `frontend/src/components/VirtualOlympics/VirtualOlympicsPage.tsx:417` initializes `recoveryDone` to `false` and only flips it to `true` after a same-session successful `POST /api/olympics/recovery-day` at `475-481`. There is no initial fetch of today's recovery status, and the `409 already logged today` response from `backend/routes/olympicRoutes.mjs:297-299` is swallowed. The backend idempotency is real, but the frontend claim that the button is disabled after first today is not.

4. **Event cards can show the wrong units for non-selected events.**
   `frontend/src/components/VirtualOlympics/VirtualOlympicsPage.tsx:494-520` uses `isSprintEvent` derived from the currently selected event when rendering every event card. If Sprint is selected, all cards show `s`; otherwise all cards show `reps`, even for Sprint.

### Verified

- `backend/models/OlympicEvent.mjs` defines the expected fields, uses `ENUM('pullups', 'pushups', 'sprint')` for `eventType`, stores `timeSeries` as JSON, and includes the requested indexes.
- `backend/routes/olympicRoutes.mjs` does expose all 5 endpoints: `events`, `submit`, `ghosts/:eventType`, `leaderboard/:eventType`, and `recovery-day`.
- `olympicRoutes.mjs` does implement PB detection, XP awards, and idempotent recovery-day logging via `activityLog`.
- `frontend/src/components/AvatarHome/CompanionPetPanel.tsx` contains the pet display, mood animation, health bar, 2x2 stats grid, interaction buttons, and adopt empty state.
- `frontend/src/components/AvatarHome/PetAdoptionModal.tsx` contains 5 species cards, name input, adopt endpoint call, and closes on Escape or backdrop click.
- `frontend/src/components/VirtualOlympics/VirtualOlympicsPage.tsx` contains event cards, submission form, leaderboard table, recovery day section, and the FDA disclaimer text.
- `backend/models/Gamification.mjs` adds both `wisdomXP` and `recoveryDaysCompleted`.
- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx` lazy-loads `VirtualOlympicsPage` and wires `/virtual-olympics` into admin, trainer, and client routes.
- `backend/core/routes.mjs` imports `olympicRoutes` and mounts it at `/api/olympics`.

### Recommendation

- Fix `AvatarHomePage` to read `d.profile.id` and `d.profile.level` from the gamification profile response.
- Add `OlympicEvent` to the early-return object in `backend/models/associations.mjs`.
- If the page should truly disable Recovery Day after the first completion each day, return today's status from the backend or derive it from fetched profile data on load.
- Render card units from each card's `eventType`, not from the globally selected event.

---

## OPUS ROUND 3 — Codex Fixes Applied

All 4 fixed. Build clean (15.98s).

### Fix 1: AvatarHomePage reads correct profile response shape
- `AvatarHomePage.tsx`: Now reads `d.profile || d.data || d` to handle `{ success, profile: { id, level } }` response shape
- Checks `profile.id` for userId, `profile.level` for level — covers both V1 and V2 response formats

### Fix 2: OlympicEvent added to early-return object in associations.mjs
- Added `VideoSession, AvatarHome, OlympicEvent` to the early-return block (all three were missing)
- Line ~491: `// Video Chat + Avatar + Olympics Models`

### Fix 3: Recovery Day properly disabled on page reload
- Added `GET /api/olympics/recovery-status` backend endpoint — checks `activityLog` for today's `recovery_day` entry, returns `{ doneToday, wisdomXP, recoveryDaysCompleted }`
- `VirtualOlympicsPage.tsx`: On mount, fetches `/api/olympics/recovery-status` via GET (not POST probe), sets `recoveryDone=true` if `doneToday`
- Button now correctly shows "Done Today ✓" even after page reload

### Fix 4: Event cards use per-card units
- Changed `isSprintEvent` (global) → `ev.eventType === 'sprint'` (per-card) in the event cards map
- Each card now shows correct units: sprint cards show `s`, rep cards show `reps`
---

## CODEX ROUND 4

CONSENSUS REACHED

Verified in source:

- `AvatarHomePage.tsx` now reads `d.profile || d.data || d` and uses that object for both `level` and `userId`
- `associations.mjs` early-return object now includes `VideoSession`, `AvatarHome`, and `OlympicEvent`
- `olympicRoutes.mjs` now exposes `GET /recovery-status` and returns `doneToday`, `wisdomXP`, and `recoveryDaysCompleted`
- `VirtualOlympicsPage.tsx` now fetches `/api/olympics/recovery-status` on mount and uses `ev.eventType === 'sprint'` for per-card units

No remaining concerns in this Round 3 scope.
