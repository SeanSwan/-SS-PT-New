# SwanStudios — Active Index

**Read time target:** under 2 minutes.
**Purpose:** one-page map of where active, planned, and archived material lives.
**Paired with:** `CLAUDE.md` (operating rules + load order).
**Last updated:** 2026-04-12

> If you are here for "where does X live" — this is the right file.
> If you are here for "what are the rules" — read `CLAUDE.md`.

---

## 🔥 Operating core (read first)

- **`CLAUDE.md`** — root operating rules, 39 mandatory rules, load order, common gotchas
- **`ACTIVE-INDEX.md`** — this file (surface/archive map)
- **`docs/ai-workflow/references/REPO-HYGIENE-PROTOCOL.md`** — cleanup workflow driven by rules 32–39
- **`docs/ai-workflow/references/RECURSIVE-PLANNING-PROTOCOL.md`** — plan-before-build, mandatory

These four files are the operating base. Everything else is loaded on-demand.

---

## 📘 Active handoff docs (current session continuity)

Location: `docs/ai-workflow/AI-HANDOFF/`

- `SWAN-STUDIOS-VISION-CONTINUITY-HANDOFF-2026-04-11.md` — broader product vision, revenue priorities, premium-gating intent
- `SWAN-COACH-CONTINUITY-HANDOFF-2026-04-11.md` — Swan Coach phase history, verified command-lane status, blocked areas, next-slice logic
- `CURRENT-TASK.md` — active task tracker
- `HANDOFF-PROTOCOL.md` — how cross-AI handoff works

Completed debates rotate to: `docs/ai-workflow/AI-HANDOFF/debate-archive/`

---

## 📗 Compact references (load on-demand, full table in CLAUDE.md)

Location: `docs/ai-workflow/references/`

Core reference set (most frequently used):
- `BLUEPRINT-PROTOCOL.md`
- `DOCUMENTATION-STANDARD.md`
- `DASHBOARD-ARCHITECTURE.md`
- `SWANSTUDIOS-DASHBOARD-VISION-BRIEF.md`
- `NASM-OPT-PROTOCOL.md`
- `GAMIFICATION-SYSTEM.md`
- `CHART-ANALYTICS-SYSTEM.md`
- `SOCIAL-PLATFORM.md`
- `PRIVACY-PROXY.md`
- `BUILD-HARDENING.md`
- `REPO-HYGIENE-PROTOCOL.md` (NEW 2026-04-12)

Full topic → file table lives in `CLAUDE.md` under **Reference Docs**. Do not duplicate here.

---

## 🗺️ Canonical surface map (dashboard route tree)

**Entry point:** `frontend/src/routes/DashboardRoutes.tsx:49-58` mounts `<UniversalDashboardLayout />` at `/dashboard/*`.

**Role route definitions:** `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:597-618`

### Canonical client pages (`/dashboard/client/*`)
Location: `frontend/src/components/DashBoard/Pages/client-dashboard/`

| Route | Component | File |
|---|---|---|
| `/overview` | `ClientHomeTab` | `ClientHomeTab.tsx` |
| `/workouts` | `ClientMyWorkoutsPage` | `ClientMyWorkoutsPage.tsx` |
| `/log-workout` | `WorkoutLogger` | (lazy) |
| `/progress` | `ClientProgressDashboardPage` | `ClientProgressDashboardPage.tsx` |
| `/progress/detailed` | `ClientProgressWrapper` | (lazy) |
| `/ai-consent` | `AiConsentScreen` | (lazy) |

### Canonical admin pages (`/dashboard/admin/*`)
Location: `frontend/src/components/DashBoard/Pages/admin-dashboard/`

### Canonical trainer pages (`/dashboard/trainer/*`)
Location: `frontend/src/components/DashBoard/Pages/trainer-dashboard/`

### Legacy/orphaned-under-current-route-tree
- **`frontend/src/components/ClientDashboard/*`** — `RevolutionaryClientDashboard`, `EnhancedOverviewCrystalline`, `CrystallineSections`. Declared as lazy import at `frontend/src/routes/main-routes.tsx:319-322` but no JSX mount discovered in the canonical route tree (as of 2026-04-12 hygiene scan). Consumed internally by its own tree only. Full classification pending Phase 3 reference audit per rule 27.

---

## 🔌 Canonical read-path map (for the workout-history bug class)

As of 2026-04-12, the dominant frontend read path for client workout history is:

```
ClientMyWorkoutsPage
  → useWorkoutSessions (frontend/src/hooks/useDashboardQueries.ts:156)
    → GET /api/workout/sessions
      → ⚠️ backend owner ambiguous (rule 31 audit pending)
      → possible runtime owner: workoutRoutes.mjs:201 → workoutController.getWorkoutSessions (rule-31 shadow audit pending)
      → workoutSessionRoutes also mounted at core/routes.mjs:333 (shadow risk)
```

Other discovered read paths in the same bug class:

| Path | Mount | Consumer | Status |
|---|---|---|---|
| `/api/workout/sessions` | `core/routes.mjs:332-333` (two mounts) | `useWorkoutSessions`, `useClientDashboardData:189` | canonical but **mount-order ambiguous** |
| `/api/workouts/:userId/history` | `clientWorkoutRoutes.mjs:107` | `useWorkoutHistory.ts:49` — only consumed by `components/ClientDashboard/*` | legacy-consumer-only |
| `/api/client-progress/:clientId/workout-history` | `clientProgressRoutes.mjs` | none | dormant (added 2026-04-12) |

⚠️ **Do not claim "canonical client workout history is fixed" without completing the rule 31 mount-order audit on `/api/workout/sessions`.**

---

## 🧭 Planned/unimplemented blueprints

Location: `docs/ai-workflow/references/`

These files describe future work that is NOT yet built. Read only when scoping that future work.

- `HERMES-WIKI-MYTHOS-MASTER-PLAN.md` — AI command center architecture
- `PLAUD-AUDIO-INTELLIGENCE.md` — Voice logging pipeline
- `SWAN-COACH-V1-SPEC.md` / `SWAN-COACH-V1-IMPLEMENTATION-ROADMAP.md` — partially shipped, some slices pending
- `SWANSTUDIOS-EXECUTION-ROADMAP.md` — product sequencing
- `OPENCLAW-PLAN.md` — **SUPERSEDED** by Hermes plan, kept for reference

---

## 📦 Archive map

| Folder | What lives there |
|---|---|
| `archive/` | Top-level historical archive |
| `archive/pending-deletion/` | Staged for deletion, includes `2026-02-13/` subfolder |
| `docs/archive/` | ~27 superseded fix/complete summaries (ACCESSIBILITY, ADMIN_DASHBOARD_RESTORED, CONNECTION_FIX_COMPLETE, …) |
| `docs/ai-workflow/archive/` | 6 subfolders: `design/`, `homepage-refactor/`, `master-plans/`, `old-versions/`, `phase-0/`, `week-reports/` |
| `docs/ai-workflow/AI-HANDOFF/debate-archive/` | 22+ completed Opus-Codex debates |
| `AI-Village-Documentation/archive/` | AI Village validation archives |
| `AI-Village-Documentation/validation-prompts/archive/` | Old validation prompt surface |

**Rule:** archives are reference-only, never default reading (rule 7 of load order, CLAUDE.md).

---

## 🖼️ QA artifact locations

| Folder | Purpose |
|---|---|
| `qa-screenshots/` | Legacy QA screenshots |
| `qa-screenshots-2026-04-04/` | Dated QA run |
| `playwright-qa-screenshots/` | Playwright test runs |
| `playwright-qa-full/` | Full-page Playwright captures |
| `./*.png` (repo root) | ~120+ unsorted QA screenshots — **Phase 2 relocation candidate** per `REPO-HYGIENE-INVENTORY-2026-04-12.md` |

---

## 🧾 Planning specs at root (ambiguous, 2026-04-12)

~18 dashboard `.yml` files currently at repo root. Classification pending Sean's call — either active reference (→ `docs/ai-workflow/planning-specs/`) or superseded (→ `docs/ai-workflow/archive/dashboard-specs/`).

See `docs/ai-workflow/REPO-HYGIENE-INVENTORY-2026-04-12.md` section D for the full list.

---

## 🔒 Do-not-touch without explicit approval

- Anything under `archive/pending-deletion/` — already staged, leave alone
- Anything referenced by `CLAUDE.md` load order
- In-progress test files
- Runtime code files in `frontend/`, `backend/`, `scripts/`, `tests/` unless a rule-26 Canonical Surface Receipt exists
- `render.yaml`, `render.env.example`, `package.json`, `node_modules/`

---

## 📝 How to update this index

- When a file is moved in a Phase 2 cleanup → update the affected section + increment `Last updated`
- When a new canonical surface is verified → update the canonical surface map
- When a new legacy/orphaned tree is discovered → add to the legacy-under-current-route-tree list
- When a new archive folder is created → add to the archive map
- When a new planning doc lands → add to the planned/unimplemented blueprints list

Do not bloat this file. If a section gets long, break it out into a compact reference doc under `docs/ai-workflow/references/` and link it here.
