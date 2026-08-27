---
decision: Phase 0 read-only harvest inventory for the Swan Component Forge — adoption priority list against origin/main
status: open
supersedes: none
---

# Forge Phase 0 — Component Inventory (origin/main @ d73468d37, 2026-08-24)

**Method:** read-only `git fetch` + `git show`/`git ls-tree`/`git grep` against `origin/main` with `MSYS_NO_PATHCONV=1` (this working tree is ~2,221 commits behind and was NOT used as evidence). No files modified. Rule 27 classifications below; "canonical" here = strongest harvest anchor by consumer count/content, with route-mount proof deferred to the component's own build slice where noted.

## Harvest table (day-one scope per ratified D6)

| Forge entry | Harvest anchor on origin/main | Class | Evidence | Forge action |
|---|---|---|---|---|
| **Button** | `frontend/src/components/ui/buttons/GlowButton.tsx` (730 lines) | **canonical** | 84 consumer files import GlowButton; `ui/GlowButton.ts` is a 3-line re-export shim (legacy alias); 6-variant Crystalline scheme (`primary/accent/gilded/success/danger/ghost` + cosmicGradient) with legacy alias map, UniversalThemeContext integration, `GlowButton.lensTone.test.tsx` exists | Rebuild as three-layer (headless core + variants + zero-runtime tokens). 730 lines > Rule 4 cap — decomposition is required anyway. **Sean taste anchor: the ORIGINAL GlowButton (per §10.2 of the plan) — confirm the origin/main version IS the original he likes before styling lock** |
| **Card** | No single canonical code implementation | **standard-without-canon** | House standard lives in the `SwanStudios Store Card -Handoff-.html` design handoff + CLAUDE.md Swan Card/Button Standard; implementations scattered (StatCard, clientCard system, AIFeedbackCard) | Forge Card is net-new from the written standard (SheenCard chrome variant + low-motion data variant). Cleanest possible start — no legacy API to honor |
| **Input** | `frontend/src/components/ui/crystalline-primitives/GlacialInput.tsx` | **canonical (primitive)** | Lives in the curated `crystalline-primitives` index; sibling `ui/input.tsx` exists (generic, classify at build) | Harvest GlacialInput's look; headless core adds form-state/a11y contract |
| **Modal/Drawer** | `frontend/src/components/ui/crystalline-primitives/VaultDrawer.tsx` + `ui/dialog.tsx` | **competing/ambiguous** | Two patterns (drawer vs dialog); LeadCaptureDrawer also in primitives | Build slice must classify both, pick the standard, keep the other as variant |
| **Skeleton** | `crystalline-primitives/CrystallineSkeleton.tsx` + `FrostedBone.tsx` | **canonical (primitive)** | In curated index | Direct harvest |
| **Dashboard shell** | `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx` (+ `.routes.tsx`, `.routeComponents.tsx`) | **canonical** | Heavily tested (6+ dedicated test files on origin/main); same trio cited as canonical mount evidence in the Swan Coach blueprint §2 | Harvest the shell pattern (role-tabbed layout contract); NOT a Phase 1 item (Phase 2) |
| **Data-card cluster** | `DashBoard/v2/sections/StatCard.tsx` + `TrainerDashboard/ClientManagement/MyClientsView.clientCard*.tsx` + `workspaces/clients-team/clientCard*.ts` | **canonical (mature system)** | Client-card system split across readiness/quick-actions/system modules — already decomposed | Phase 2 harvest; unify under Forge Card variants |
| **Auth forms** | `frontend/src/pages/EnhancedLoginModal.tsx` (+ `EnhancedLoginProviders.tsx`) | **likely-canonical** | Only live non-devtool login surface found; mount proof deferred to build slice | Phase 2 |
| **Chart wrapper** | `frontend/src/components/Charts/SafeChart.tsx` | **canonical** | Matches CLAUDE.md SafeChart boundary doctrine; Victory per Rule 10 | Phase 2: wrap behind adapter interface (ratified plan §1) |
| **Hero** | `frontend/src/pages/HomePage/components/Hero-Section.V2.tsx`; Swans.mp4 via `frontend/src/config/videoAssets.ts` | **competing/ambiguous** | HomePage.V3.tsx AND HomePage.V4.tsx both live on origin/main; an entire earlier cinematic HomePage tree sits in `archive/pending-deletion/2026-07-16/` (incl. `cinematic-tokens.ts` — prior art for token packs) | Hero build slice starts with a Rule 26 route-mount receipt to resolve V3-vs-V4 before harvesting. KEEP Swans.mp4 footage (standing Sean directive) |

## Environment findings

- **Swan Brain vault: REACHABLE** — `node scripts/swan-brain.mjs "glow button"` → 5 hits, fast. §10.3 design-pass integration is unblocked.
- **origin/main HEAD at inventory time:** `d73468d37`.
- **Stale-tree hazard confirmed:** the wip session tree lacks `GlowButton.lensTone.test.tsx` and all v2 dashboard sections — any Forge build must source from origin/main, not this tree.
- **Prior art worth mining:** `archive/pending-deletion/2026-07-16/.../cinematic-tokens.ts` — an earlier token-pack attempt; read during Phase 1 token-contract design for lessons, per Rule 34 (read-only, no resurrection without approval).

## Residual risks

- Consumer count (84) for GlowButton means the Forge Button's compat surface is large; the strangler PR must keep the legacy alias map working.
- "Original GlowButton" identity: Sean reverted a newer experiment back to the original — origin/main's current file is PRESUMED the original he likes `[LIKELY]`; confirmed visually with Sean before Phase 1 styling lock (grill checkpoint).
- HomePage V3/V4 competition is untriaged — deliberately out of Phase 0 scope (read-only pass; Rule 31 narrow-scope).
