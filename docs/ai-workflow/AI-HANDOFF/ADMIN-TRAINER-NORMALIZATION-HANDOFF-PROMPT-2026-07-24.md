# Admin/Trainer Normalization — FRESH-CHAT HANDOFF PROMPT

**Sean: copy everything between the two `=====` lines below into a NEW chat.** It is self-contained — the builder agent needs no prior context. It embeds Kimi K3's diagnosis + target architecture + Kimi's mandatory "Slice 0 visual-debt gate", and points at exact files.

Source analysis: `docs/ai-workflow/AI-HANDOFF/KIMI-ADMIN-TRAINER-NORMALIZATION-2026-07-24.md` (Kimi verdict: SHIP-WITH-CHANGES — architecture approved, add Slice 0 + design contracts).

---

===== COPY BELOW INTO A NEW CHAT =====

You are the builder agent (Opus 4.8, lead orchestrator) for SwanStudios (SS-PT). This is a NEW workstream: **normalize the admin ↔ trainer dashboards so the admin (Sean, the site owner) can do EVERYTHING from the admin dashboard, is NEVER bounced into the trainer dashboard, and the two dashboards stop diverging — with ZERO features lost.** Read your CLAUDE.md house rules first, then follow this exactly.

## The problem (Sean's words)
"When I'm admin, sometimes it turns me into a trainer when I'm doing things — it takes me to the trainer dash — and it's confusing. My trainer and admin dashboards aren't in sync; they're different, with some components in one and not the other. As admin I need to do EVERYTHING from my admin dashboard without switching to trainer. The transition while I'm logging client info is confusing. Normalize toward my best/most-mature components. Everyone should be on the same page. I do NOT want to give up features — everyone should have everything, rounded up and working."

## Core principles (non-negotiable)
- **Admin = strict superset of trainer.** Admin does everything a trainer can, in-place, from `/dashboard/admin/*`. No forced role switch, no bounce to `/dashboard/trainer/*` when the actor is an admin.
- **No feature loss.** Normalization ROUNDS UP: take the most mature component, bring the weaker surface up to it. Never delete a capability. (Deleting a *redundant duplicate render path* is not feature loss — see `*WithFallback` below.)
- **Normalize toward the mature audience-scoped pattern, not by copying markup.** Whichever component is better DESIGNED wins, not whichever is longer.
- **Trainer stays a scoped subset** — "everyone has everything" means every role gets its full entitled set, NOT that trainers gain admin-only surfaces. The asymmetry is intentional.
- Least clicks / least confusion (Sean's standing mandate).

## Root cause (verified in-repo 2026-07-24) — TWO parallel client-management systems

**System A — MATURE, keep + extend:** `frontend/src/components/DashBoard/workspaces/`
`clients-team/clientHubAudience.ts` implements "one workspace, two audiences" correctly. Admin gets its OWN bases and more tabs:
```
admin:   clientManagementBase '/dashboard/admin/client-management', coachAssistantBase '/dashboard/admin/coach-assistant', workoutPlannerBase '/dashboard/admin/workout-planner', visibleDetailTabs [training,progress,nutrition,biometrics,overview,settings], canManageAccounts true, showRosterOpsPanels true
trainer: clientManagementBase '/dashboard/trainer/clients',        coachAssistantBase '/dashboard/trainer/coach-assistant',  workoutPlannerBase '/dashboard/trainer/workout-planner',  visibleDetailTabs [training,progress,nutrition,biometrics],                    canManageAccounts false, showRosterOpsPanels false
```
When THIS pattern is used, admin never leaves the admin dashboard. Extend it; don't fork it.

**System B — LEGACY, the bug source:** `frontend/src/components/TrainerDashboard/`
`ClientManagement/MyClientsView.tsx`, `MyClientsViewWithFallback.tsx`, `ClientProgress/EnhancedClientProgressView.tsx`, etc. hardcode trainer routes for EVERYONE:
```
MyClientsView.tsx:110  navigate(`/dashboard/trainer/log-workout?clientId=${clientId}&loadPlan=today`);
MyClientsView.tsx:114  navigate(`/dashboard/trainer/client-progress?clientId=${clientId}`);
MyClientsView.tsx:127  navigate(`/dashboard/trainer/workout-planner?clientId=${clientId}&source=my-clients`);
```
When an admin lands on a System-B surface and clicks "log workout / view progress", they get thrown to `/dashboard/trainer/*` — THIS is "it turns me into a trainer."

**Keep separate — the LEGITIMATE feature:** admin "View As" (audit-safe, data-fetch, no JWT swap) — `DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.tsx`, `DashBoard/components/ViewAsBanner.tsx`, `Admin/AdminAccountSwitcher.tsx`. Do NOT remove View-As. But it is visually conflatable with the accidental bounce — fix its design (below) so Sean stops confusing the two.

**Nav divergence:** admin nav is config-driven — 36 entries in `frontend/src/config/dashboard-tabs.ts` (`WORKSPACE_CONFIG`, sections command/clients/training/business/system). Trainer nav is a HARDCODED 17-item array in `DashBoard/Pages/trainer-dashboard/TrainerStellarSidebar.tsx`. Two different nav systems = guaranteed drift.

## Audience-resolution rule (apply mechanically everywhere)
Given the logged-in role, EVERY client-action deep link is built from `getClientHubAudienceConfig(role).*Base` — NEVER a hardcoded `/dashboard/trainer/...` when the actor is admin. If you write a literal trainer path in a shared component, that's the bug.

## MANDATORY SLICE 0 — Component Maturity Scorecard & Visual-Debt Gate (Kimi K3, do this FIRST)
Before ANY migration, build a matrix. Rows = every client-management capability across both systems (client list, progress view, workout-logging entry, planner entry, messaging, biometrics, account ops). Columns (each a yes/no check):
1. styled-components only (no MUI)   2. Victory charts only (no Recharts)   3. colors are `var(--token, #CrystallineFallback)` (no hardcoded hex, no retired Galaxy-Swan `#0a0a1a/#00FFFF/#7851A9`)   4. ≤300 lines   5. 44px touch targets   6. `prefers-reduced-motion` safe   7. routes are audience-aware.

Per capability the row with more checks wins; the loser is mined for BEHAVIOR ONLY, never markup. **No component crosses into System A carrying MUI, Recharts, hardcoded hex, or Galaxy-Swan values — migration = re-skin to Crystalline as part of the SAME slice, not a later ticket.** Run these gates and record results in the Linear issue:
```
grep -rn "@mui\|recharts" frontend/src/components/DashBoard/workspaces        # must be zero before A is crowned
grep -rn "@mui\|recharts" frontend/src/components/TrainerDashboard             # audit what B would drag in
grep -rn "dashboard/trainer" frontend/src --include="*.tsx" --include="*.ts"   # every hardcoded trainer path
grep -rn "navigate(\|window.location" frontend/src/components/TrainerDashboard # bounces hide in callbacks/effects too
grep -rni "yoga\|meditation\|NASM-certified" frontend/src/components/TrainerDashboard  # forbidden copy
```
If `EnhancedClientProgressView` uses Recharts, its migration slice INCLUDES the Recharts→Victory port. Decide `MyClientsView` vs `MyClientsViewWithFallback` — one is canonical, the redundant path is deleted (redundant-path deletion ≠ feature loss).

## SLICE PLAN (round-up, no feature loss; each slice: hostile-review-until-dry + real test proof + commit)
- **S0** — Maturity scorecard + visual-debt gate (above). Output = the matrix in Linear. No code.
- **S1** — Audience-resolution helper hardening: ensure every shared client-action deep link resolves via `getClientHubAudienceConfig(role).*Base`. Replace hardcoded `/dashboard/trainer/*` in shared components with audience-resolved paths. Regression test: as admin, every client action stays under `/dashboard/admin/*`.
- **S2** — Migrate System-B unique capabilities into the System-A audience-scoped family (re-skinned to Crystalline per S0 verdicts; extract sub-components so no file >300 lines), then retire System B. Preserve every capability; list any B-only capability explicitly before removing B.
- **S3** — Config-drive the trainer sidebar from a SHARED nav source, role-filtered, so admin and trainer can't drift again (trainer sees its entitled subset; admin sees all). Preserve logical focus order when items are filtered (filter ≠ unmount mid-tab-order).
- **S4** — View-As design fix: `ViewAsBanner` becomes unmistakable + persistent — full-width top banner, a distinct warning-adjacent token (NOT Crystalline cyan primary, which reads as "normal"), client avatar + name, ≥44px "Exit View As" with Dual-Button Glow. So Sean never confuses View-As with the (now-fixed) bounce.
- **S5 (design-forward, optional but recommended)** — role-aware Cmd+K command palette over the unified nav config: admin types a client name → "Log workout / View progress / Message / Open planner", each audience-resolved, zero nav traversal. This is the real "least clicks" answer and the unified config is its perfect data source.

## Design contracts (Sean's per-UI-slice rule — REQUIRED before building any visible surface)
Before S2/S3/S4 touch pixels, write a 1-page Crystalline design contract per surface (client-command workspace, unified sidebar, ViewAsBanner): token map, component anatomy, spacing rhythm, empty/loading/error states, one signature moment, and responsive behavior at 320/375/414/768/1024/1440/2560/3840. Show Sean each contract for approval before coding it. Specifics Kimi flagged: client detail has 6 tabs — spec the tab-overflow pattern at 375px (horizontal scroll vs "More"); data-dense client tables need a mobile card transformation; client rows that are clickable AND contain action buttons need `stopPropagation` + separate focus targets (avoid row-click firing on button-click).

## Hard rules
- styled-components only (no MUI); Victory charts only (no Recharts); Crystalline Swan palette via `var(--token, #fallback)` (reject retired Galaxy-Swan); 44px touch targets; `prefers-reduced-motion`; 300-line file cap (extract sub-components); WCAG 4.5:1; no yoga/meditation language (use "stretching"/"flexibility"); credentials framing "26+ years / NASM-protocol", never "NASM-certified".
- Admin = superset, trainer = scoped subset. No hardcoded `/dashboard/trainer/*` for admins anywhere.
- Per slice: hostile-review until a full pass finds nothing (DRY-LOOP CLEAN×2), a `PROOF:` line with real executed evidence (run the real vitest suite — deps install via `npm ci` in `frontend/` and `backend/`), no "done" without proof.
- Shared tree (Rule 67): read `.ai-workflow/coordination/*.lane.md` before editing; stage EXPLICIT paths only, never `git add -A`.
- **Branch:** this is a SEPARATE workstream from trainer-economics (which lives on `feat/trainer-economics-s1`). Create a NEW branch off fresh `origin/main` (fetch first — the local wip branch is ~1000 commits stale). Commit per slice; do not merge to main without Sean's OK.
- Create a Linear issue for this workstream (SwanStudios team, SS-PT-New project) and update it per slice with the S0 matrix and each slice's proof.

## First actions
1. Read CLAUDE.md. 2. Fetch origin/main, branch off it in a fresh worktree. 3. Do S0 (the scorecard + all the grep gates) and post the matrix to the new Linear issue. 4. Bring the S0 findings + the S1 plan back to Sean before writing migration code. 5. Proceed slice by slice with design contracts + proof.

===== COPY ABOVE INTO A NEW CHAT =====
