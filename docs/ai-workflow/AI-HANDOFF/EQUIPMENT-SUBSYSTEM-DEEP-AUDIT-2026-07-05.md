# EQUIPMENT SUBSYSTEM — DEEP AUDIT & MICHELIN-GRADE UPGRADE PLAN (2026-07-05)

> **Purpose.** Sean asked for a comprehensive, hostile audit of the **Equipment** feature across the
> admin, trainer, user, and client dashboards — to find how to make it better, more accurate, tied
> deeper into the app, and to give **valid/solid exercise suggestions** ("salad suggestions" =
> *solid* suggestions, transcription). Goal: take Equipment from "competent" to **seven-star /
> Michelin-star**. This doc doubles as the **AI Village input packet** (§10).
>
> **Method.** 3 parallel read-only audit agents (frontend UI · backend security/schema/integrity ·
> cross-dashboard reach + integration accuracy), each returning file:line evidence, then the three
> load-bearing claims were **re-verified by hand** (Rule 30 subagent-skepticism, Rule 54 grep
> evidence). No files were modified. Confidence tags per Rule 51: `[VERIFIED]` = confirmed by direct
> read/grep this session; `[LIKELY]` = strong evidence, runtime/DB-state dependent; `[HYPOTHESIS]` =
> reasoned, needs a probe.
>
> **Refs.** Working tree HEAD `40791570a`. Equipment scan-review workflow was **freshly upgraded**
> (`ca62827b6 feat(equipment): upgrade scan review workflow`, ~4,476 insertions / 27 files, on
> `codex/equipment-manager-release-20260630`). The scan flow is therefore the **mature** part; the
> headroom is in integration, reach, the monolith page, theme, and exercise-mapping accuracy.

---

## 1. EXECUTIVE SUMMARY (plain English)

Equipment today is a **well-built data-entry tool that the rest of the app barely listens to.** A
trainer can scan a gym with their phone, the AI recognizes the gear, and they approve it into a
location profile. That part is genuinely good and freshly hardened. But three things stop it from
being Michelin-grade:

1. **The intelligence is collected and then thrown away.** Every equipment→exercise link the AI
   proposes or a trainer curates is written to a table (`EquipmentExerciseMap`) that **nothing ever
   reads.** The workout generator and Swan Coach don't use it. AI-suggested exercises are stored as
   loose text, never matched to the real 840-exercise library. So "make suggestions accurate" is
   blocked at the root: the accuracy data exists but is disconnected. `[VERIFIED]`

2. **Most of the app can't reach it.** Only the **admin** sees an Equipment tab. Trainers have a
   working equipment page with **no menu button** to find it. Clients/users are **locked out
   entirely** (no page, no menu, API returns 403). So "equipment across all four dashboards" is
   currently **one dashboard**. `[VERIFIED]`

3. **The main screen is a 1,763-line monolith with silent failures.** If the network blips, a
   trainer sees "you have no equipment" instead of an error — their inventory looks *deleted*. The
   file is 5.9× the size limit, off-brand on color, and the approve/reject flow is a keyboard
   dead-end. `[VERIFIED]`

**The opportunity is unusually high-leverage:** the hard part (AI scanning, data capture, real
DB-backed filtering in the planner) already works. Wiring the dormant intelligence into generation +
opening the feature to trainers and clients + polishing the monolith turns an underused utility into
a **differentiating "train with exactly what you have, and here's precisely what to do with it"**
engine — dead-center in the Product Core Loop.

---

## 2. CANONICAL SURFACE RECEIPT (Rules 26–31)

**Frontend mount (canonical, `[VERIFIED]`):**
- Component: `frontend/src/components/EquipmentManager/EquipmentManagerPage.tsx` (default export
  `EquipmentManagerPageWithBoundary`, `:1757`). Lazy-registered at
  `UniversalDashboardLayout.routeComponents.tsx:76` and `main-routes.tsx:176`.
- Mounted (JSX route table, not just a lazy import):
  - **admin** config → `/equipment` → `EquipmentManagerPage` — `UniversalDashboardLayout.routes.tsx:134`
  - **trainer** config → `/equipment` → `EquipmentManagerPage` — `routes.tsx:167`
  - **client** config → **absent** (`routes.tsx:178-203` has no `/equipment`). `[VERIFIED]`
- Admin nav tab: `dashboard-tabs.ts:547` (`WORKSPACE_CONFIG`, prefix `/dashboard/admin/equipment`,
  icon `Wrench`, no `featureKey` → always shown), consumed by `AdminStellarSidebar.tsx:170`.

**Consumer hook / service:** `frontend/src/hooks/useEquipmentAPI.ts` → REST `/api/equipment-profiles*`.

**Backend route match (`[VERIFIED]`):** `backend/core/routes.mjs:66` import, `:367`
`app.use('/api/equipment-profiles', equipmentRoutes)`. All routes gated
`router.use(protect, authorize(['admin','trainer']))` — `equipmentRoutes.mjs:78`.

**Authoritative model fields:** `EquipmentProfile.mjs`, `EquipmentItem.mjs`, `EquipmentExerciseMap.mjs`,
`EquipmentScanSession.mjs`, `EquipmentScanCandidate.mjs` (NEW family). Drift table in §7.

### 2.1 Role-Reach Table (`[VERIFIED]`) — **"user" and "client" are the SAME role**

`UniversalDashboardLayout.tsx:61-62`: `rawRole = user?.role || 'client'`; `userRole = rawRole === 'user'
? 'client' : rawRole`. Only three role configs exist (`admin | trainer | client`). There is **no separate
"user" dashboard** — the DB `'user'` role collapses into `client` for routing, tabs, sidebar, and API.

| Role | Sees nav tab | Reaches route by URL | Hits API `/api/equipment-profiles` |
|---|---|---|---|
| **admin** | ✅ `dashboard-tabs.ts:547` | ✅ `routes.tsx:134` | ✅ + sees all trainers' profiles (`equipmentRoutes.mjs:166-168`) |
| **trainer** | ❌ **none** — `TrainerStellarSidebar.tsx:53-93` hardcoded nav, no equipment | ✅ `routes.tsx:167` → **ORPHANED** | ✅ scoped to own `req.user.id` |
| **client** | ❌ none | ❌ **no route** (`routes.tsx:178-203`) | ❌ **403** (`authorize(['admin','trainer'])`) |
| **user** | ❌ (== client) | ❌ (== client) | ❌ (== client) |

**Also `[VERIFIED]`:** `TRAINER_DASHBOARD_TABS` and `CLIENT_DASHBOARD_TABS` in `dashboard-tabs.ts` are
**dead config** — grep shows no component imports them; trainer/client sidebars are hardcoded arrays
(`TrainerStellarSidebar.tsx:53-93`, `ClientStellarSidebar.tsx:51-88`). Client equipment access was
deliberately removed in Phase 16.2 (`WorkoutLogger.tsx:949` mounts the picker only when
`!isClientSelfMode`; locked by `WorkoutLogger.clientRoute.test.ts:320-333`).

### 2.2 Surface Classification (Rule 27) — TWO equipment model families

| Family | Tables | Class | Evidence |
|---|---|---|---|
| **NEW** — EquipmentProfile / Item / ExerciseMap / ScanSession / ScanCandidate | `equipment_profiles`, `equipment_items`, `equipment_exercise_map`, `equipment_scan_sessions`, `equipment_scan_candidates` | **CANONICAL / LIVE** | consumed by `aiChatRoutes.mjs:230-239`, `variationRoutes.mjs:103`, `bootcampRoutes.mjs:104`, `workoutBuilderCandidateService.mjs:231`, `useEquipmentAPI.ts` |
| **OLD** — Equipment / ExerciseEquipment | `equipment`, `exercise_equipment` | **DORMANT / LEGACY** | zero runtime readers; `workoutService.mjs:171-178` explicitly SKIPs the join ("does not exist in production"). Archival candidate — **not** "safe to delete" (Rule 34). |

Live exercise-equipment data actually lives in the `Exercise.equipmentNeeded` JSON text column.

---

## 3. THE THREE HEADLINE FINDINGS (why it isn't Michelin yet)

### H1 — Dormant intelligence: the accuracy engine is disconnected `[VERIFIED]`
- `EquipmentExerciseMap` is **write-only**. Grep across `backend/` returns only the model, `index.mjs`,
  `associations.mjs`, the route, and the migration — **no candidate/variation/AI service reads it.**
  Every AI-proposed and trainer-curated equipment→exercise link changes **nothing** in generation.
- AI-suggested exercises are stored as **free text**: `equipmentRoutes.mjs:590-599` slugs
  `candidate.suggestedExercises` into `exerciseKey`, sets `isCustomExercise:false`, and **never**
  resolves `customExerciseId` to a real `Exercise`/`CustomExercise` row. The linkage columns exist
  (`EquipmentExerciseMap.mjs:42-55`) and sit empty.
- Rich per-item AI signal (`movementPatterns`, `targetMuscles`, `safetyNotes`, `equipmentKind`) is
  persisted into `aiScanData` (`equipmentRoutes.mjs:569-573`) and **never read**.
- **Split exercise universe:** candidate generation filters the **840-row DB registry**
  (`workoutBuilderCandidateService.mjs:234`), but the swap engine filters an **81-row hardcoded map**
  (`variationEngine.mjs:46-137, 216`). Equipment accuracy differs by which feature you use.
- Equipment is a **hard include/exclude filter, never a ranking signal** — `scoreCandidate`
  (`workoutBuilderCandidateService.mjs:150-158`) ignores equipment; a home plan and a full-gym plan
  rank identically once both pass the gate. Match logic is permissive: empty `equipmentNeeded` always
  passes (`workoutBuilderCandidateEquipment.mjs:36-40`).
- Swan Coach gets equipment as **names-only prompt text** with **soft, LLM-discretionary**
  enforcement and **no post-generation validation** (`aiChatService.mjs:1575-1608`,
  `contextBuilder.mjs:165-169`). The model can propose a barbell lift for a park profile with no guardrail.

### H2 — Reach gaps: "four dashboards" is really one `[VERIFIED]`
- Trainer `/equipment` route is **orphaned** — reachable + API-authorized but no nav tile.
- Clients/users are **fully locked out** (no route, no tab, 403 API, picker hidden by design).
- Dead config (`TRAINER_DASHBOARD_TABS`/`CLIENT_DASHBOARD_TABS`) masks the truth for future agents.

### H3 — The monolith + silent failure + brand drift `[VERIFIED]`
- `EquipmentManagerPage.tsx` = **1,763 lines** (Rule 4 cap 300 → 5.9×). `EquipmentProfilePicker.tsx`
  = 447 (also over).
- **Silent error swallowing** — 8 `catch { // silent }` blocks (`:700,711,739,749,776,791,971,989`).
  A failed `loadProfiles` renders **"No equipment profiles yet"** — an *error* shown as *empty*.
  Highest user-harm bug in the subsystem.
- **Rule 6 theme drift** — main page is nearly all hardcoded hex (`#002060`, `#60c0f0`, `#00FF88`,
  `#FFB800`, three different reds) with off-palette neon green/amber, while the *newer*
  `EquipmentScanBatchPanel.styles.ts` correctly uses `var(--token, #fallback)` + `color-mix`. Same
  feature, opposite compliance.

---

## 4. FRONTEND FINDINGS (UI / a11y / state / UX) — ranked

| ID | Sev | Finding | Evidence |
|---|---|---|---|
| ST1 | **CRITICAL** | Silent error swallowing — failures render as empty states | `EquipmentManagerPage.tsx:700,711,739,749,776,791,971,989` |
| A1 | **CRITICAL** | 1,763-line monolith (Rule 4). Styles `:51-615`, body `:656-1723` | full file |
| T1 | **CRITICAL** | Hardcoded hex throughout, no token pattern (Rule 6) | `:67,89,104,115,135,220-223,542` |
| A2 | HIGH | ~20 `useState` in one component; 9-dep queue-advance effect | `:658-687,882-893` |
| AC1 | HIGH | Modals: no Escape, no focus trap, no focus return/restore | `:1284-1341,1540-1611,1618-1717` |
| AC2 | HIGH | Nested interactive elements (button inside role=button) | `:1480-1481+1516-1529`, `:1251-1252+1270` |
| ST2 | HIGH | Detail view has no loading state; stale items not cleared on profile switch | `:726-730,707-714` |
| ST3 | HIGH | Archive profile / remove item = instant, no confirm, no undo | `:744-752,781-793` |
| R1 | HIGH | Sub-44px targets: "Review" CTA 36px (`$compact`), picker "Clear" ~24px | `:122,1516-1524`; `Picker:316-323` |
| M1 | HIGH | Zero `prefers-reduced-motion` (grep-confirmed 0 matches); infinite `scanLine`/`pulse` | `:53-56,483-489,576-584` |
| A3 | HIGH | Dead exports: exercise-mapping methods, `updateProfile`, `MutedRow` | `useEquipmentAPI.ts:139,243-270`; `styles.ts:242` |
| T2 | HIGH | Off-palette neon green `#00FF88` / amber `#FFB800`; 3 different reds | `:220,235,240,542,597` |
| U1 | HIGH | Two competing review surfaces (modal + batch tray) can co-exist | `:838,1453-1466` |
| T3 | MED | Signature Dual-Button Glow absent — no glow shadow on any button | `:113-128` |
| R2 | MED | Container hard-capped 900px; single-column; dead space at 2560/3840 | `:73` |
| U2 | MED | Approved items not editable (rename/re-categorize) though `updateItem` exists | `:1527`, `useEquipmentAPI.ts:174` |
| U3 | MED | API supports category/status filters + pagination; UI renders flat unfiltered list | `useEquipmentAPI.ts:153-164`; `:1475-1534` |
| AC3-6 | MED/LOW | ConfidenceMeter color-only (no `progressbar`); weak alt text; low-contrast alpha text; unlabeled emoji icons | `:530-546,1421,1643,348,374` |
| A4 | MED | Duplicated `EquipmentProfile` type + duplicated icon/label maps drift | `Picker:18-26` vs `equipmentApiTypes.ts:8-21` |
| M2 | MED | `scanLine` animates `top` (layout-triggering, not GPU-safe) | `:53-56,474` |

**Enhancement ideas (UI):** visual equipment cards using the captured `photoUrl` (never rendered
today); per-item "N exercises" + confidence + `needsHumanReview` badges; category grouping with
counts; quantity steppers via existing `updateItem`; profile cover photos (`coverPhotoUrl` captured,
unused); unified review tray with inline approve/reject + keyboard shortcuts (A/R/←/→) + optimistic
UI + undo snackbar.

---

## 5. BACKEND FINDINGS (security / integrity / accuracy / perf) — ranked

| ID | Sev | Finding | Evidence |
|---|---|---|---|
| B5.1 | **HIGH** | Multi-item scan write is **non-atomic** — partial failure leaves committed items, no ledger, stale count | `equipmentRoutes.mjs:541-615` (no `transaction`) |
| B5.2 | **HIGH** | Soft-delete + **non-partial** unique index `(profileId,name)`/`(trainerId,name)` blocks legit re-add after reject/archive (409/500) | migration `…000001.cjs:69,149`; `equipmentRoutes.mjs:786,399-401` |
| B1.1 | HIGH | **FK-target drift**: `equipment_profiles.trainerId → 'users'` (stale) while sibling scan tables → `'Users'`. Can break profile create / default-seed for trainers only in `"Users"` | migration `…000001.cjs:16` vs `…030000.cjs:17` `[VERIFIED]` fact / `[LIKELY]` impact |
| B3.1 | MED-HIGH | **IDOR**: `variationRoutes.mjs:103-106` reads any `equipmentProfileId` with no `trainerId` gate → cross-trainer inventory enumeration. Correct pattern exists at `aiChatRoutes.mjs:239` | `[VERIFIED]` |
| B4.2 | MED | AI `suggestedExercises` never validated against the real catalog before write → dead/hallucinated mappings | `equipmentRoutes.mjs:590-601` |
| B4.1 | MED | No-confidence detections auto-promoted (`clampConfidence` returns **0.65**, gate is ≥0.55) → false positives | `equipmentScanV2Result.mjs:29-33,20` |
| B5.3 | MED | `equipmentCount` = lost-update race (read-modify-write) AND never updated by the scan path AND semantics wrong (counts all active, comment says "approved") | `:416-417,466-467,765-766,186`; `EquipmentProfile.mjs:69` |
| B3.2 | MED | In-memory `scanRateMap` not restart/multi-instance safe; failed scans still consume quota | `equipmentRoutes.mjs:81,90,498-505` |
| B2.3 | MED | Two incompatible category taxonomies (OLD 10-value ENUM vs NEW 16-value) + a 3rd token-normalizer | `Equipment.mjs:26` vs `EquipmentItem.mjs:51-55` vs `workoutBuilderCandidateEquipment.mjs:6` |
| B4.3 | LOW-MED | Dedupe is pure token equality → "Dumbbell Rack" vs "Dumbbells" don't dedupe → duplicate rows | `equipmentScanV2Support.mjs:221-235` |
| B5.4 | LOW-MED | Orphaned `EquipmentExerciseMap` rows on item soft-delete; mappings query ignores `item.isActive` | `:462,797-800,818` |
| B3.3-3.4 | LOW | Unvalidated cross-profile item refs in review write; client-declared MIME (not magic-byte) | `outcomeService:107-108`; `equipmentRoutes.mjs:67-73` |
| B5.5 | LOW | `rawResponse` blob duplicated into every item's JSONB + the session row (7× for a 6-item scan) | `:577`, `persistence:97` |
| B6.1-6.3 | LOW | Stats = 3 unbounded count/join queries; chatty per-item scan writes; missing composite `(profileId,isActive,name)` index | `:210-232,548-615,289-291` |

**Good, credit where due `[VERIFIED]`:** AI output is fully sanitized before DB write (allowlists,
string slicing, bbox 0–1 clamp, confidence clamp — `equipmentScanV2Result.mjs:22-96`) → prompt-injection
via text-in-image cannot escape the JSON schema. Prompts carry **no PII** (static, names-only). Scan
retry/queue/caption-fallback pipeline is mature and test-backed.

**Privacy note (Rule 8) `[LOW-MED]`:** a trainer photographing a gym floor can incidentally capture
bystanders/clients; that raw image goes to Google and the full `rawResponse` is persisted. Not "PII in
a prompt," but a biometric-image/consent surface worth an explicit policy line.

---

## 6. INTEGRATION & ACCURACY (the "solid suggestions" core)

**Where equipment data actually flows today:**
- **Guided candidates (admin/trainer planner)** — REAL filter. `workoutBuilderCandidateService.mjs:231-238`
  loads approved items → category tokens → filters the 840-row DB registry via `matchesEquipmentProfile`.
  Source: `clientIntelligenceService.mjs:539-546` (trainer's profiles, approved items only).
- **Variation/swap engine** — REAL filter but on the **81-row hardcoded** `EXERCISE_REGISTRY`
  (`variationEngine.mjs:179-190`). Split-brain vs candidates.
- **Swan Coach AI** — names-only prompt context, soft enforcement (`aiChatService.mjs:1575-1608`).
- **Frontend pickers** — `useWorkoutPlannerEquipmentProfileState.ts` (admin/trainer only),
  `BootcampEquipmentProfileFilter.ts` (client-side mirror of the backend token filter).

**Accuracy gaps (root causes of weak suggestions):**
1. `EquipmentExerciseMap` dormant (H1). 2. Free-text exercises unlinked to catalog. 3. Rich AI signal
discarded. 4. Split exercise universe (840 vs 81). 5. Coarse/permissive token match. 6. Equipment
never ranks. 7. No AI post-gen validator.

**The enabler:** `EquipmentExerciseMap` must become the canonical, **read** join between
`equipment_items` and the real `Exercise`/`CustomExercise` tables — then consumed by the candidate
service + an AI validator. This single wiring change is the backbone of every accuracy and
cross-dashboard win below.

---

## 7. SCHEMA CROSS-CHECK ARTIFACT (Rule 29) — NEW family

Repo-wide model grep: `equipmentRoutes.mjs`, `workoutBuilderCandidateEquipment.mjs`,
`aiChatRoutes.mjs`, `variationRoutes.mjs`, `clientIntelligenceService.mjs`. Drift table:

| Caller field | Real model column | Match? |
|---|---|---|
| `EquipmentItem`: name, trainerLabel, category, resistanceType, description, photoUrl, aiScanData, approvalStatus, approvedAt, isActive, quantity, profileId | `EquipmentItem.mjs:22-105` | **MATCH** |
| `EquipmentExerciseMap`: equipmentItemId, exerciseKey, exerciseName, isCustomExercise, customExerciseId, isPrimary, isAiSuggested, confirmed | `EquipmentExerciseMap.mjs:18-73` | **MATCH** (but table is write-only) |
| `EquipmentProfile`: trainerId, name, locationType, description, address, isDefault, isActive, equipmentCount | `EquipmentProfile.mjs` | **MATCH** except FK target (B1.1) + `equipmentCount` semantics (B5.3) |
| `EquipmentProfile.coverPhotoUrl` | `EquipmentProfile.mjs:71` | **DORMANT** (declared, never read/written) |
| aiChat raw SQL camelCase (`"resistanceType"`,`"profileId"`,`"isActive"`) | migration identifiers | **MATCH** |

No column-name/case drift within the NEW family. FK-target drift = the one real schema bug (B1.1).

---

## 8. MICHELIN-GRADE UPGRADE ROADMAP (phased, each phase = a reviewable slice)

> Ordered by **risk-then-value**: correctness/safety first (things that hurt users or data now),
> then the accuracy engine, then reach, then delight. Every slice: TDD where feasible + Rule 61
> internal hostile review + Rule 46/Tier-2 triangle review before commit.

**P0 — Stop the bleeding (correctness & safety)**
- P0.1 Replace 8 silent catches with real error/empty/loading states + retry; add detail-view spinner;
  clear `items` on profile switch. (ST1, ST2)
- P0.2 Wrap the multi-item scan write in `sequelize.transaction`; batch item inserts. (B5.1, B6.2)
- P0.3 Partial unique indexes `WHERE "isActive"=true` on `equipment_items`/`equipment_profiles`. (B5.2)
- P0.4 Repair `equipment_profiles.trainerId` FK → `"Users"`; align model. (B1.1)
- P0.5 Close the variationRoutes IDOR (add trainer/admin gate, copy `aiChatRoutes.mjs:239`). (B3.1)

**P1 — The accuracy engine ("solid suggestions") — the marquee work**
- P1.1 On scan/manual-add, **resolve** `suggestedExercises` → canonical `Exercise`/`CustomExercise`
  (fuzzy match; populate `customExerciseId`/`isCustomExercise`; flag `needsReview` on no-match). (B4.2)
- P1.2 Make `workoutBuilderCandidateService` **read** confirmed `EquipmentExerciseMap` links. (H1)
- P1.3 Make equipment a **ranking boost** in `scoreCandidate`, not just a gate. (H1)
- P1.4 Add an **AI post-generation equipment validator** (reuse `matchesEquipmentProfile`) so Coach
  proposals are checked against the profile, not just prompted. (H1)
- P1.5 Unify the exercise universe — bridge the 81-row swap registry onto the 840-row DB loader. (H1)
- P1.6 Lower/remove the 0.65 no-confidence auto-promote; route unscored → `possibleItems`. (B4.1)
- P1.7 Feed the trainer's existing inventory + canonical vocab INTO the scan prompt (model-side dedupe
  + naming discipline). (B4.3, accuracy)

**P2 — Reach (turn "one dashboard" into the real four surfaces)**
- P2.1 De-orphan trainer: add an Equipment entry to `TrainerStellarSidebar` nav. (H2 — ~1-line class)
- P2.2 Client/user "**Train with what you have**": a client-safe **read** endpoint
  (`/api/equipment-profiles/for-me`, own/assigned location) + a lightweight "Where are you training
  today?" location chip in client `WorkoutLogger`/`ClientMyWorkoutsPage` so self-serve clients get
  equipment-filtered suggestions. (H2) — **gate this through grill-me/chromie: it re-opens a surface
  Phase 16.2 deliberately closed; confirm the product intent before building.**
- P2.3 Admin proof-of-value: surface stale/empty location profiles + pending-approval counts in the
  admin equipment view (reuse the stats endpoint). Ties to the admin "what needs intervention" loop.
- P2.4 Delete the dead `TRAINER_/CLIENT_DASHBOARD_TABS` config (Rule 34 approval) to stop misleading
  future agents.

**P3 — Delight (Michelin polish)**
- P3.1 Decompose the 1,763-line page per the frontend plan (`useEquipmentScanFlow`,
  `useEquipmentManager`, view components, `equipment.styles.ts`). (A1, A2)
- P3.2 Full Rule 6 token migration + reconcile warning/error/success palette + add Dual-Button Glow.
  (T1, T2, T3)
- P3.3 Visual equipment cards (photo thumbnails, exercise-count/confidence/needs-review badges,
  category grouping, quantity steppers). (E1–E6)
- P3.4 Unified review tray: inline approve/reject, keyboard shortcuts, optimistic UI, undo snackbar,
  filters/search. (U1–U4)
- P3.5 A11y: modal Escape/focus-trap/focus-return, remove nested interactives, `progressbar` on the
  confidence meter, `prefers-reduced-motion`, GPU-safe `scanLine`. (AC1-6, M1-2)
- P3.6 Progress-loop tie-in: stamp `equipmentProfileId`/location on logged sessions so charts can
  answer "what can this client progress with at home vs gym."

---

## 9. TOP 10 (merged, cross-domain, ranked by value×leverage)

1. **Wire `EquipmentExerciseMap` into generation + link AI exercises to the real catalog** (P1.1-1.2) — root fix for accuracy; activates already-collected data.
2. **Replace silent error swallowing with real states** (P0.1) — highest user-harm-to-effort ratio.
3. **Atomic scan write + partial unique indexes** (P0.2-0.3) — kills partial-write corruption + "can't re-add rejected item."
4. **Equipment as a ranking signal + AI post-gen validator** (P1.3-1.4) — turns soft prompt into enforced accuracy.
5. **FK → "Users" repair + variationRoutes IDOR fix** (P0.4-0.5) — schema-drift + cross-trainer leak.
6. **De-orphan trainer nav** (P2.1) — one-line-class fix exposes a fully-built feature.
7. **Client "train with what you have" read path** (P2.2) — unlocks the client core loop (product-gate first).
8. **Decompose the monolith + extract `useEquipmentScanFlow`** (P3.1) — unblocks every future change.
9. **Theme/Rule-6 pass + Dual-Button Glow** (P3.2) — brand-authentic, mostly mechanical.
10. **Visual cards + unified review tray + a11y** (P3.3-3.5) — the visible "Michelin" jump.

---

## 10. AI VILLAGE INPUT PACKET (§ for the paid Tier-3 run Sean flagged)

**Framing question for the Village:** *"Equipment captures rich AI intelligence and then ignores it.
Given the Product Core Loop (log → progress proof → next best action) and the trainer-led B2B2C wedge,
what is the highest-ROI sequence to turn Equipment into an accuracy engine and open it to trainers +
clients — without re-introducing the risk Phase 16.2 closed?"*

**Binary Tier-C triggers that DO fire here (Rule 50):** multi-tenant scoping (the IDOR + client read
path), a minor's-data path (clients can be minors — the client "train with what you have" surface),
and a cross-service architectural change (the exercise-universe unification). → **A paid Village run is
justified — but requires Sean's explicit per-run permission (Rule 16).** Recommend the **Village →
triangle → final** chain (CLAUDE.md fusion doctrine): Village drafts, a free triangle ratifies.

**Specific things to put to the Village:**
1. Should client equipment access be re-opened (P2.2), and if so read-only vs full? (Phase 16.2 closed it.)
2. Ranking weight for equipment-appropriateness vs phase/goal/readiness in `scoreCandidate`.
3. Fuzzy-match strategy for AI exercise names → canonical catalog (embeddings vs alias table vs LLM).
4. Whether to retire the OLD Equipment/ExerciseEquipment family and the 81-row registry outright.
5. Privacy posture for gym-floor photos capturing bystanders (consent/redaction/retention).

**Open items needing a probe to reach `[VERIFIED]` (currently `[LIKELY]`):** prod-DB state of the
stale `users` table (B1.1 impact); real-device responsive/contrast QA (R2, AC5); live frequency of the
soft-delete unique collision (B5.2).

---

## 11. HYGIENE & CLOSEOUT (Rules 38, 60)

- **Artifacts created:** this audit doc only. No temp files, no screenshots, no code changes.
- **Coordination (Rule 67):** read-only pass; no lane claim needed; Codex idle; no collision. The
  scan-review workflow is fresh Codex work (`codex/equipment-manager-release-20260630`) — coordinate
  with Codex before touching the scan pipeline specifically.
- **Anti-rework note (Rule 52):** the scan flow passed a recent gate and is heavily tested — this
  audit does **not** re-flag it as broken; the P0-P3 work is additive (integration, reach, monolith,
  theme), not a redo of the scan pipeline.
- **Next slice (Rule 60):** `P0.1 — real error/empty/loading states for EquipmentManagerPage` — the
  single highest user-harm fix (a network blip currently reads as "your equipment is gone"), small,
  self-contained, no cross-service risk, and it's a clean warm-up before the P1 accuracy engine.
  Alternative if Sean wants to lead with impact: `P1.1 — link AI exercises to the real catalog` (the
  marquee accuracy fix). Sean picks the entry point.

---

## 12. TRIANGLE FUSION VERDICT (2026-07-05 — ratified plan of record)

Free Tier-2 triangle run on this audit (`.ai-workflow/fusion/equipment-audit-triangle-2026-07-05/synthesis.md`).
Degraded to a **Claude+Gemini duo** (headless Claude timed out on the heavy read; Codex idle/absent) —
diversity reduced but ≥2 brains fused. **P0→P3 phase ordering ratified unchanged.** Deltas folded in:

**Blind spots adopted into the roadmap (Gemini-caught):**
- **P1 now MUST include a one-off backfill script** for existing free-text `EquipmentExerciseMap` rows
  (apply the same alias/embedding match to historical data) — the audit only covered *new* scans. #1 catch.
- **Per-phase testing made explicit:** P0 regression test for the IDOR + integration test for the atomic
  write; P1 unit tests for ranking/validator/fuzzy-match + an E2E "scan → approve → ranked workout".
- **"Kill silent catches" → structured logging + alerting**, not only UI states.
- **Composite/FK indexes on `equipment_exercise_map`** before candidate-gen reads/ranks on it at scale.
- **Client access (P2) ships behind a feature flag**, phased — not big-bang.

**Open-decision verdicts (recommended plan of record; escalate to paid Village only if must-be-right):**
- (a) Client access: **re-open READ-ONLY + feature-flagged.** (Read-only ⇒ clients don't upload ⇒ the
  bystander-photo risk stays entirely on the trainer scan path.)
- (b) Ranking: **dynamic/configurable weight by goal/phase**, conservative default — not a static boost.
- (c) Fuzzy-match: **hybrid — alias table (primary) → embeddings (fallback) → offline LLM (backfill +
  propose new aliases for human approval).** No real-time LLM matching.
- (d) OLD family: **retire via 4-step deprecation** — migrate → dual-write → remove old writes → drop tables.
- (e) Privacy: **P0 = trainer consent/ack gate + retention/policy line**; automated face-detection+blur is a
  **P1/P2 feature** and a **hard gate before any client-side capture** (out of scope for read-only P2). Minors
  amplify the risk → ship the trainer consent gate early.

**Judge refinement — monolith timing:** surgical early extraction of `useEquipmentScanFlow` + error states
(P0/P1, since the accuracy work touches that code) but keep the full cosmetic view decomposition at P3.

**Revised first move (Rule 60) — two tight slices, discoverability+stability first:**
- **Slice 1 (frontend, Claude lane):** silent-catches → real error/empty/loading states (+ structured
  logging) **AND** de-orphan the trainer nav tile. One small release that makes a half-built feature both
  discoverable and stop-looking-broken.
- **Slice 2 (backend, Claude money-path-safety lane):** atomic scan write + partial unique indexes +
  FK→"Users" + variationRoutes IDOR, each with a regression test. Coordinate with Codex (fresh scan work).
