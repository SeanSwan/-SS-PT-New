# SwanStudios — Active Index

**Read time target:** under 2 minutes.
**Purpose:** one-page map of where active, planned, and archived material lives.
**Paired with:** `AGENTS.md` / `CLAUDE.md` (operating rules + load order).
**Last updated:** 2026-08-02 (agent workflow router, portable workflow skills, deterministic skill inventory)

> If you are here for "where does X live" — this is the right file.
> If you are here for "what are the rules" — read `CLAUDE.md`.

---

## 🔥 Operating core (read first)

- **`CLAUDE.md`** — root operating rules, mandatory rules, load order, common gotchas
- **`ACTIVE-INDEX.md`** — this file (surface/archive map)
- **`docs/ai-workflow/references/AGENT-WORKFLOW-ROUTER.md`** — task/fog/workspace mode selection, decision discipline, and third-party skill intake
- **`docs/ai-workflow/references/REPO-HYGIENE-PROTOCOL.md`** — cleanup workflow driven by rules 32–39
- **`docs/ai-workflow/references/RECURSIVE-PLANNING-PROTOCOL.md`** — plan-before-build, mandatory
- **`docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md`** — Swan visual source of truth (stack, narrative arc B2, C1-C12 pattern library)
- **`docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md`** — asset archetypes + Seedance 2.0 prompt templates
- **`docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md`** - who/what may do which job at which T0-T4 tier; unregistered = BLOCKED (Fable control layer, 2026-07-03)
- **`docs/ai-workflow/references/FABLE-CONTEXT-COMPRESSION-PROTOCOL.md`** - cost-control rule for Fable token economy: semantic compression, query-first reads, image-context estimator, and proxy safety gates
- **Startup router rule:** fresh AI sessions read `AGENTS.md`/`CLAUDE.md`, then this index; keep bulky protocol details linked here instead of copied into startup context.
- **`docs/ai-workflow/hermes-agentic-os/index.md`** - Hermes Agentic OS map: approval gates, receipts, kill switches, channels, command center
- **`docs/ai-workflow/design-brain/index.md`** - Design Brain map: design.md (canonical, and the sole canonical **copy** — the design.html mirror was retired 2026-08-16; it still ADAPTS SWAN-CINEMATIC-DESIGN-SYSTEM.md and does not outrank it), adapters, archetypes, QA gates
- **`docs/ai-workflow/references/LENS-ADD-A-STYLE.md`** - the 30-minute five-entry recipe for adding Style Lens #N (proven: aurora-console #26 shipped through it with zero count-literal edits); pairs with `LENS-PORTABILITY-CONTRACT.md` (taking the v2 engine to a new host)
- **`docs/ai-workflow/AI-HANDOFF/S0-CONSULT-LANE-HANDOFF-2026-08-14.md`** — **START HERE for consult-lane / receipts / model-review work.** S0 is merged (`5b2aa5030`, PR #42): every paid model call now leaves an auditable receipt, and a call that returns nothing is recorded as a failure rather than as `ok`. Carries the mandated hostile review of that work through **both Kimi K3 and HY3** (exact commands, verified dry-run), model calibration showing HY3 at ~40× better cost-per-usable-review, and a **P1: GitHub Actions has been dead repo-wide since 2026-08-12** (100/100 startup_failure) so every merge to main is currently ungated.
- **`docs/ai-workflow/AI-HANDOFF/SWAN-CONTINUATION-HANDOFF-2026-08-14.md`** — **START HERE for Swan Brain / Forge / taste-curation work.** What is live (Swan Forge, 16 modules, capability truths already paid for — seed and i2i both probed dead, do not re-test), what Sean owes (blind A/B ruling — the file lives ONLY in the primary checkout, `.ai-workflow/` is gitignored), the reviewed 7-slice taste-curation plan (**start at Slice 0**, the contract), how to work alongside parallel agents, and the failure modes that cost this workstream real time. Supersedes `SWAN-MASTER-HANDOFF-2026-08-13.md`
- **`docs/ai-workflow/AI-HANDOFF/BLUEPRINT-lens-world-fusion-2026-07-14/`** - Lens×World fusion build package for Codex (7 slices F0-F6: atmosphere axis, server appearance persistence, Crown Header carousel, v2 rollout, tier-gated Style Studio, world distillation, fusion gates). 3-round hostile review → APPROVE; Codex handoff prompt at the bottom of `07-checkpoints.md`; verdict log inside
- **`docs/ai-workflow/AI-HANDOFF/HERMES-OS-SECOND-BRAIN-CONSULT-REVIEW-2026-07-07.md`** - consult verdict on the Hermes Agentic OS (finish-first + F-1..F-10 enhancement queue), ARMS/Four-C second-brain verification + SB gaps (deterministic `brain-query` retrieval is the top miss), doc-drift findings, Sean decision queue
- **`docs/ai-workflow/AI-HANDOFF/HERMES-OS-7STAR-GAP-REVIEW-2026-07-07.md`** - three-lens 7★ gap review (UX/security/integration) + Final-Decider rulings: E4b-final ship record, Delivery-Quartet build order, product-slice queue (operator credential, Stripe webhook health, stale-client endpoint), Sean decisions
- **`docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/170-hermes-performance-upgrade-prompt.md`** - Hermes performance+utilization upgrade: live-install inventory (keep-alive cold-reload bug, unread inbox), 5090/Qwen3 tuning table, /settings panel spec, §E paste-ready maintainer prompt
- **`docs/ai-workflow/AI-HANDOFF/HERMES-BRAIN-COCKPIT-ULTIMATE-UPGRADE-2026-07-08.md`** - AI-Village verdict (6-lens free panel -> Final-Decider): the binding ultimate-upgrade spec for the graphical brain command center (readability P0 fix, hybrid SVG+HTML-overlay+WebGL rendering, 10-theme tokenized system, Replay-the-Day, mermaid diagrams, wireframe, 6-slice build plan). Raw panel pool in brain-cockpit-panel-2026-07-08/.
- **`.claude/skills/fable-mode/SKILL.md`** - Rule 71: portable Fable working discipline (five gates) + model/effort routing table; mandatory for fallback Final Deciders

These files are the operating base. Everything else is loaded on-demand.

---

## 📘 Active handoff docs (current session continuity)

Location: `docs/ai-workflow/AI-HANDOFF/`

- **`AGENT-WORKFLOW-SKILL-INTEGRATION-AUDIT-2026-08-02.md`** — two-transcript + 44-skill triage, independent GPT-5-class verdict, Kimi spend-gate status, adopted/rejected capability map, and verification contract

- **⭐ USER-DASHBOARD 7★ UPGRADE AUDIT (2026-07-06, active):** `USER-DASHBOARD-7STAR-UPGRADE-AUDIT-2026-07-06/` — 10-doc upgrade audit for future AI builders (read `00-MASTER-ROADMAP.md` first: engraved prompt, domain scorecard, "wire what exists" Wave 1-3 roadmap, Sean decision queue D1-D6, trust flags incl. verified feed private-post leak, algorithm spec index). 9 domain docs: home IA · chart truth · gamification · social · nudges · NBA extension · activation · trainer/admin proof · mobile polish. Complements (does not repeat) FABLE-VISION-REBUILD-DEEP-AUDIT; excludes the workout-logger lane.
- **⭐ FABLE VISION ARC — Rule-48 AUDIT RECORD (2026-07-06):** `FABLE-VISION-ARC-AUDIT-RECORD-2026-07-06.md` — self-contained re-audit snapshot of shipped slices 0.1→2.1b (billing policy, write-path unification, NBA+D1/D2, Save-Success+share, chart modals, shared picker, archiver outage): files, security posture, rollback per slice, 10 future review hooks. Sign-off pending Sean; arc continues.
- **⭐ FABLE VISION REBUILD (2026-07-05, active):** **`FABLE-VISION-BUILD-HANDOFF-PROMPT-2026-07-05.md` = paste-ready prompt for a fresh Fable build session (creative authority, not a spec)** · `../brainstorms/FABLE-VISION-MASTER-BRIEF-2026-07-05.md` (**v3 master brief**; §6 = locked Village decisions) · `FABLE-VISION-REBUILD-DEEP-AUDIT-2026-07-05.md` (11-surface ground truth) · `FABLE-VISION-VILLAGE-OUTPUT-2026-07-05/synthesis.md` (Fable-5 Village verdict, $1.76) · first Hermes learning packet at `../hermes-learning-packets/2026-07-05-fable-vision-village-verdict.md`. Preserved on branch `claude/fable-vision-brief-20260705`. Receipt correction: SessionContext is DORMANT (not a data-loss hotfix — retire-or-wire, Rule 34). Next: Fable builds in its own vision from the handoff prompt.
- `SWAN-STUDIOS-VISION-CONTINUITY-HANDOFF-2026-04-11.md` — broader product vision, revenue priorities, premium-gating intent
- `SWAN-COACH-CONTINUITY-HANDOFF-2026-04-11.md` — Swan Coach phase history, verified command-lane status, blocked areas, next-slice logic
- `CURRENT-TASK.md` — active task tracker
- `HANDOFF-PROTOCOL.md` — how cross-AI handoff works
- `USER-DASHBOARD-SYSTEM-STATUS-2026-05-13.md` - canonical user-dashboard runtime map, current feature inventory, wiring gaps, and future-AI rules
- `SWANSTUDIOS-FUNNEL-ACTIVATION-SURFACE-MAP-2026-05-20.md` - canonical acquisition-to-client-dashboard funnel map with active/dormant route ownership and backend mount notes
- `oracle-requests/ADMIN-CLIENT-TRAINING-FLOW-ORACLE-PACKET-2026-05-25.md` - GPT Pro/Oracle packet and working vision for the admin client-first training flow across Coach Command Center, Clients & Team, and Workouts
- `SWANSTUDIOS-BROAD-REDESIGN-POLISH-BACKLOG-2026-06-01.md` - parked broad redesign/polish backlog for dashboards, media header, social feed, theme sync, Bootcamp, workout UX, and separate command-dispatcher extraction debt
- `SOCIAL-TRY-WORKOUT-FLOW-2026-06-25.md` - canonical receipt, composer/modal wireframe, data contract, and phased flow for making workout-tagged feed posts actionable without colliding with the active chart lane
- `NEXT-SESSION-CONTINUATION-PROMPT-2026-06-01.md` - fresh-session prompt for continuing the recursive slice workflow after the latest Coach selected-client command push

- `USER-DASHBOARD-N-SERIES-AUDIT-RECORD-2026-06-12.md` - rule-48 audit record for workstream N (M7+N1-N5): V3 Observatory as the canonical /user-dashboard hub, social absorbed, Home truth pass, cover editor, training proof, tab compaction
- `FABLE-CONTROL-LAYER-AUDIT-RECORD-2026-07-04.md` — rule-48 audit record for the Fable control layer / Hermes Agentic OS / Design Brain docs + runtime Slice 1 (receipt/queue/digest/prune spine in `scripts/hermes/`, 31/31 tests); security posture, rollback, and future review hooks live here
- `STOREFRONT-INQUIRY-AND-ACCOUNT-ACCESS-AUDIT-RECORD-2026-07-11.md` — rule-48 audit record for two shipped slices: storefront "Ask About Pricing" inquiry button (price-hidden cards → `/api/contact` → notify admin, VERIFIED LIVE) + admin account-access "skeleton key" REMOUNT (`/dashboard/admin/account-access` route + "Account Access" sidebar entry + Enter-to-go; additive to the Coach mount). Security posture (impersonation owner-gate, `/api/contact` abuse), rollback per commit, 6 future review hooks (incl. verify OWNER_ADMIN_EMAILS set in prod)
- `POST-SAVE-HANDOFF-AUDIT-RECORD-2026-07-19.md` — rule-48 audit record for the Post-Save Handoff (Workout Logger terminal proof→next-action→share). SHIPPED to main `f8b00c143..e3042b9a6`, double-gated dark (server `ENABLE_POST_SAVE_HANDOFF` + client `VITE_ENABLE_POST_SAVE_HANDOFF`). Money-path fail-closed, IDOR closed, zero-PII; Kimi money-path go-live GO + 13 hostile passes to convergence. Security posture, rollback, 6-item deferred-LOW backlog, future review hooks. Open post-ship: client-render confirm + paused test-user DB cleanup.
- `OPUS-48-HERMES-OS-BUILD-HANDOFF-2026-07-04.md` — **the Hermes-OS build baton**: slice-by-slice ledger, component-by-component logic map w/ mermaid charts, system-wide hostile review (G-1…G-17 gaps), E1–E6 enhancement plan, and the §11 recursive build loop contract (Sean-authorized goal-driven auto-advance w/ hard-pause gates); Opus 4.8 (or any deputy builder) starts here
- `SWANSTUDIOS-WHATS-NEXT-PRODUCT-PLAN-2026-05-09.md` - next product-depth roadmap prompt for client onboarding, Stripe/session purchases, PLAUD Intake playback, teaching-first UX, and 1440p/4K QA
- `CLIENT-BILLING-ACCOUNT-AUDIT-HANDOFF-2026-07-05.md` — **SHIPPED backend account-control audit trail** (updateClient/createClient/createExternalClient fail-closed AdminAccountAuditLog, 318 tests) + the remaining-slice roadmap (S1-S4 fable-arc frontend billing/FormAnalysis/charts/Overview; S5 deactivate-reactivate lifecycle audit; S6 fulfillment decision) + paste-ready next-AI prompt. Pairs with `CLIENTS-TEAM-COMMAND-CENTER-FABLE-AUDIT-2026-07-05.md` (§8 recipes). Open for hostile review + finish-up.

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

**Strict-model design exposure:** `swan-design-router` is the **only** default-exposed design brain. All UI/visual work auto-routes through it (CLAUDE.md rule 40). Closeout auto-routes through `closeout-evidence-lock` (rule 41). Skill inventory is discovered from disk with `node scripts/ai-workflow/validate-skill-registry.mjs`; do not trust a static total.

### Default-exposed `.claude/skills/`

**Swan orchestration and workflow modes:**
- `swan-orchestrator` — pre-task gate for rules 15/17/26/32
- `wayfinder` — situational map/frontier for multi-session work with material fog
- `goal-contract` — measurable acceptance, validation, checkpoints, uncertainty, and stop conditions
- `worktree-isolation` — verified current baseline and isolated workspace receipt
- `guided-setup` — one verified setup action at a time with the remaining ledger preserved
- `canonical-surface-audit` — rules 26-31 execution surface
- `repo-hygiene-scan` — rules 32-39 execution surface
- `swan-design-router` — the one design brain (loads SWAN-CINEMATIC-DESIGN-SYSTEM.md + SWAN-ASSET-STORYBOARDING.md from `docs/ai-workflow/references/`, and the two reference libraries from `.agents/skills/`)
- `closeout-evidence-lock` — end-of-task evidence gate (preserves substantive code-review checklist from retired `requesting-code-review`)

**KEEP core:**
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

- `docs/ai-workflow/references/AGENT-WORKFLOW-ROUTER.md` — clear/foggy mode selection, goal contracts, workspace isolation, guided setup, decision discipline, and external skill intake

Location: `docs/ai-workflow/references/`

Core reference set (most frequently used):
- `SWANSTUDIOS-MASTER-PROMPT.md` (NEW 2026-06-10) — canonical compact vision loader; paste into any fresh AI session. Deep version: `SWANSTUDIOS-FULL-VISION.md`. Grill record: `docs/ai-workflow/brainstorms/swanstudios-whole-app-vision-regrill-2026-06-10.md`
- `BLUEPRINT-PROTOCOL.md`
- `DOCUMENTATION-STANDARD.md`
- `DASHBOARD-ARCHITECTURE.md`
- `SWANSTUDIOS-DASHBOARD-VISION-BRIEF.md`
- `BEST-IN-CLASS-TRAINING-APP-STRATEGY.md`
- `FABLE-CONTEXT-COMPRESSION-PROTOCOL.md` (NEW 2026-07-04) - when/how to reduce Fable context spend; unreviewed proxies remain blocked
- `NASM-OPT-PROTOCOL.md`
- `GAMIFICATION-SYSTEM.md`
- `CHART-ANALYTICS-SYSTEM.md`
- `SOCIAL-PLATFORM.md`
- `PRIVACY-PROXY.md`
- `BUILD-HARDENING.md`
- `REPO-HYGIENE-PROTOCOL.md` (NEW 2026-04-12)
- `SWAN-CINEMATIC-DESIGN-SYSTEM.md` (NEW 2026-04-12)
- `SWAN-ASSET-STORYBOARDING.md` (NEW 2026-04-12)
- `docs/ai-workflow/coach-brain/` (NEW 2026-06-24) - active Obsidian-compatible Swan Coach Cortex brain vault for Sean-style workout doctrine, guided generation, privacy, full-plan PDF rules, and future Hermes ingestion.

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
| `archive/pending-deletion/2026-05-17/legacy-playwright-python/` | Retired Python Playwright QA scripts removed from active `tests/` |
| `archive/pending-deletion/2026-05-17/legacy-live-login-e2e/` | Retired non-canonical root-level frontend E2E specs/helpers removed from active `frontend/e2e/` |
| `archive/pending-deletion/2026-05-17/backend-secret-scan-blockers/` | Retired direct-production backend repair script sanitized after blocking secret scan |
| `archive/pending-deletion/2026-05-17/backend-root-oneoff-scripts/` | Retired backend root one-off repair/debug/test scripts that had no non-archive references |
| `archive/pending-deletion/2026-06-25/global-ai-entrypoints/` | Retired global bottom-right AI launcher, persistent AI panel, and inline AICommandBar code after Coach Command Center became the active AI surface |
| `archive/pending-deletion/` | Staged for deletion, includes historical cleanup subfolders |
| `docs/archive/` | ~27 superseded fix/complete summaries (ACCESSIBILITY, ADMIN_DASHBOARD_RESTORED, CONNECTION_FIX_COMPLETE, …) |
| `docs/ai-workflow/archive/` | 6 subfolders: `design/`, `homepage-refactor/`, `master-plans/`, `old-versions/`, `phase-0/`, `week-reports/` |
| `docs/ai-workflow/AI-HANDOFF/debate-archive/` | 22+ completed Opus-Codex debates |
| `AI-Village-Documentation/archive/` | AI Village validation archives |
| `AI-Village-Documentation/validation-prompts/archive/` | Old validation prompt surface |

**Rule:** archives are reference-only, never default reading (rule 7 of load order, CLAUDE.md).

---

## 🖼️ QA artifact locations

Canonical smoke command:
- `npm run qa:smoke` - local/default canonical Playwright smoke
- `npm run qa:smoke:prod` - production URL canonical Playwright smoke

Canonical smoke files:
- `scripts/qa/playwright-smoke.mjs` - default smoke launcher for AI agents and humans
- `frontend/e2e/client-dashboard-oracle-smoke.spec.ts` - Client Dashboard smoke
- `frontend/e2e/marketing-native-publishing-smoke.spec.ts` - admin Marketing native publishing smoke

Production smoke skips local Playwright `webServer` startup via
`SWAN_PLAYWRIGHT_SKIP_WEBSERVER=1`.

Current QA cleanup inventory:
- `docs/ai-workflow/REPO-HYGIENE-INVENTORY-2026-05-17.md` - Phase 1 non-destructive classification of legacy QA scripts and archive candidates
- `docs/ai-workflow/BACKEND-ROOT-SCRIPT-HYGIENE-INVENTORY-2026-05-17.md` - backend root one-off script classification and archive list
- `frontend/e2e/README.md` and `tests/README.md` - routing notes so agents do not mistake legacy scripts for the smoke gate

| Folder | Purpose |
|---|---|
| `qa-screenshots/` | Legacy QA screenshots |
| `docs/qa/archive/2026-05-12/qa-screenshots-2026-04-04/` | Archived dated QA run |
| `docs/qa/user-dashboard/2026-05-13/` | Authenticated User Dashboard/Reels Playwright smoke screenshots for tab-click fix and responsive checks |
| `playwright-qa-screenshots/` | Playwright test runs, ignored if regenerated |
| `playwright-qa-full/` | Full-page Playwright captures, ignored if regenerated |
| `.swan/archive/cleanup-2026-05-12/` | Local ignored archive for generated root captures/logs and Playwright MCP captures |

The old `tests/*.py` scripts and non-canonical root-level `frontend/e2e/*`
helpers were moved to `archive/pending-deletion/2026-05-17/`. They are not the
default smoke path and should only be restored after modernization.

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
