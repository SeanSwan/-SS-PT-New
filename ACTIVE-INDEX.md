# SwanStudios — Active Index

**Read time target:** under 2 minutes.
**Purpose:** one-page map of where active, planned, and archived material lives.
**Paired with:** `CLAUDE.md` (operating rules + load order).
**Last updated:** 2026-05-15 (repo hygiene cleanup: retired MCP/theme/mock/demo/debug artifacts)

> If you are here for "where does X live" — this is the right file.
> If you are here for "what are the rules" — read `CLAUDE.md`.

---

## 🔥 Operating core (read first)

- **`CLAUDE.md`** — root operating rules, 41 mandatory rules, load order, common gotchas
- **`ACTIVE-INDEX.md`** — this file (surface/archive map)
- **`docs/ai-workflow/references/REPO-HYGIENE-PROTOCOL.md`** — cleanup workflow driven by rules 32–39
- **`docs/ai-workflow/references/RECURSIVE-PLANNING-PROTOCOL.md`** — plan-before-build, mandatory
- **`docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md`** — Swan visual source of truth (stack, narrative arc B2, C1-C12 pattern library)
- **`docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md`** — asset archetypes + Seedance 2.0 prompt templates

These six files are the operating base. Everything else is loaded on-demand.

---

## 📘 Active handoff docs (current session continuity)

Location: `docs/ai-workflow/AI-HANDOFF/`

- `SWAN-STUDIOS-VISION-CONTINUITY-HANDOFF-2026-04-11.md` — broader product vision, revenue priorities, premium-gating intent
- `SWAN-COACH-CONTINUITY-HANDOFF-2026-04-11.md` — Swan Coach phase history, verified command-lane status, blocked areas, next-slice logic
- `CURRENT-TASK.md` — active task tracker
- `HANDOFF-PROTOCOL.md` — how cross-AI handoff works
- `USER-DASHBOARD-SYSTEM-STATUS-2026-05-13.md` - canonical user-dashboard runtime map, current feature inventory, wiring gaps, and future-AI rules

- `SWANSTUDIOS-WHATS-NEXT-PRODUCT-PLAN-2026-05-09.md` - next product-depth roadmap prompt for client onboarding, Stripe/session purchases, PLAUD Intake playback, teaching-first UX, and 1440p/4K QA

Completed debates rotate to: `docs/ai-workflow/AI-HANDOFF/debate-archive/`

---

## Active video production workflow

Location: `scripts/swan-video-studio/`

- `launch-swan-video-studio.ps1` - local launcher for the Codex + video-use + HyperFrames workflow.
- `swan-video-studio-lib.ps1` - launcher helpers for workspace setup, Codex skill registration, dependency checks, and project folder creation.
- `SWAN_VIDEO_STYLE.md` - Swan-specific exercise-video style, safety, privacy, metadata, and QA rules.
- `WORKFLOW_PROMPTS.md` - reusable Codex prompts for trim, motion graphics, render, YouTube upload handoff, and Swan catalog import.
- HyperFrames agent skills installed locally under `.agents/skills/` by `npx skills add heygen-com/hyperframes`; generated skill-pack folders are ignored from Git.
- Runtime media belongs in `%USERPROFILE%\Videos\SwanStudios-Video-Studio`, not in Git.

---

## 🎨 Swan visual operating system (Phase 3 landed 2026-04-12)

**Strict-model design exposure:** `swan-design-router` is the **only** default-exposed design brain. All UI/visual work auto-routes through it (CLAUDE.md rule 40). Closeout auto-routes through `closeout-evidence-lock` (rule 41). `.claude/skills/` contains exactly **13** default-exposed entries.

### Default-exposed `.claude/skills/` (13 total)

**Swan orchestration (5):**
- `swan-orchestrator` — pre-task gate for rules 15/17/26/32
- `canonical-surface-audit` — rules 26-31 execution surface
- `repo-hygiene-scan` — rules 32-39 execution surface
- `swan-design-router` — the one design brain (loads SWAN-CINEMATIC-DESIGN-SYSTEM.md + SWAN-ASSET-STORYBOARDING.md from `docs/ai-workflow/references/`, and the two reference libraries from `.agents/skills/`)
- `closeout-evidence-lock` — end-of-task evidence gate (preserves substantive code-review checklist from retired `requesting-code-review`)

**KEEP core (8, unchanged):**
`systematic-debugging`, `test-driven-development`, `verification-before-completion`, `webapp-testing`, `agent-browser`, `audit-website`, `full-output-enforcement`, `seedance-swan-video`

### Reference libraries loaded by `swan-design-router`, NOT default-exposed
- `.agents/skills/frontend-design/SKILL.md` — guardrails layer (accessibility, responsiveness, anti-generic)
- `.agents/skills/ui-ux-pro-max/SKILL.md` — breadth / idea library
- These sources remain in place at `.agents/skills/`. They are **not archived** and **not quarantined**. They are loaded by the router on demand from their `.agents/skills/` paths. They are not in `.claude/skills/`.

### Quarantined skills — explicit-invocation-only (8)
Sources relocated to **`archive/quarantined-skills/2026-04-12/`** as of Phase 3:
- `minimalist-ui`
- `industrial-brutalist-ui`
- `high-end-visual-design`
- `design-taste-frontend` (LILA BAN conflict)
- `stitch-design-taste`
- `redesign-existing-projects`
- `web-design-guidelines`
- `requesting-code-review` (retired — broken `superpowers:code-reviewer` dependency; substantive checklist inherited by `closeout-evidence-lock`)

Phase 3 move is reversible via `git mv` back if any quarantined skill needs to return to the default-exposed surface.

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
- `SWAN-CINEMATIC-DESIGN-SYSTEM.md` (NEW 2026-04-12)
- `SWAN-ASSET-STORYBOARDING.md` (NEW 2026-04-12)

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
| `archive/cleanup-2026-05-12/` | Current cleanup pass: archived root specs/docs and dormant dashboard code |
| `archive/pending-deletion/2026-05-15/` | Current staged cleanup: retired MCP docs/runtime, retired theme docs, public debug artifacts, dangerous admin/password scripts, unmounted demo panels, legacy theme infra, stale source-folder docs, stale gamification hook/scripts/mock challenge fixtures, stale shop order history, stale client-dashboard workout variant, old schedule/mock API services, and unmounted schedule/homepage/checkout variants |
| `archive/pending-deletion/` | Staged for deletion, includes historical cleanup subfolders |
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
| `docs/qa/archive/2026-05-12/qa-screenshots-2026-04-04/` | Archived dated QA run |
| `docs/qa/user-dashboard/2026-05-13/` | Authenticated User Dashboard/Reels Playwright smoke screenshots for tab-click fix and responsive checks |
| `playwright-qa-screenshots/` | Playwright test runs, ignored if regenerated |
| `playwright-qa-full/` | Full-page Playwright captures, ignored if regenerated |
| `.swan/archive/cleanup-2026-05-12/` | Local ignored archive for generated root captures/logs and Playwright MCP captures |

---

## 🧾 Planning specs at root (ambiguous, 2026-04-12)

Dashboard `.yml` browser snapshots formerly at repo root were archived under `archive/cleanup-2026-05-12/root-dashboard-snapshots/`.

Historical hygiene inventories were moved under
`archive/pending-deletion/2026-05-15/old-hygiene-inventories/`.

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
