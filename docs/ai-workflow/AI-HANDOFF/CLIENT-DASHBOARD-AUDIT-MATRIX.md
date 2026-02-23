# Client Dashboard Launch Readiness Audit Matrix

**Date:** 2026-02-22
**Audited by:** Claude (Phase 0 Playwright baseline)
**Route:** `/client-dashboard` (RevolutionaryClientDashboard)
**User:** Test Client (client@swanstudios.com)

---

## Tab Audit (13 Tabs)

| # | Tab ID | Label | Section | Status Badge | Real Data? | Mock/Fake? | Console Errors | Launch-Ready? | Action |
|---|--------|-------|---------|-------------|-----------|------------|----------------|---------------|--------|
| 1 | `overview` | Overview | Priority | Real | Partial | YES - fake fallbacks: "24" workouts (|| 24), "7" streak (|| 7), "8,250" XP (real from gamification), "1" achievement (real). Onboarding card shows real 0% progress. | 3 errors (notifications 403, sessions 404, API response error) | NO | Rewrite with real data, fix all fake fallbacks |
| 2 | `onboarding` | Onboarding | Priority | New | Unknown | Unknown | - | Unknown | Tab click did not change content (see bug below) |
| 3 | `schedule` | Schedule | Priority | Partial | Unknown | Unknown | - | Unknown | Tab click did not change content |
| 4 | `workouts` | Workouts | Core | Real | Unknown | Unknown | - | Unknown | Tab click did not change content |
| 5 | `progress` | Progress | Core | Real | Unknown | Unknown | - | Unknown | Tab click did not change content |
| 6 | `messages` | Messages | Core | WIP | NO | Placeholder | - | NO | REMOVE for launch |
| 7 | `achievements` | Gamification | Engagement | Partial | Partial | Partial | - | Partial | Keep, verify data |
| 8 | `community` | Community | Engagement | WIP | NO | Placeholder | - | NO | REMOVE for launch |
| 9 | `videos` | Videos | Tools | WIP | NO | Placeholder | - | NO | REMOVE for launch |
| 10 | `logs` | Logs & Trackers | Tools | WIP | Partial | Unknown | - | NO | MERGE into Workouts |
| 11 | `packages` | Packages | Tools | Partial | Partial | Unknown | - | Partial | MERGE into Account |
| 12 | `profile` | Profile | Account | Real | Real | Unknown | - | Partial | MERGE into Account |
| 13 | `settings` | Settings | Account | Real | Uses Profile component | Unknown | - | NO | REMOVE (merge into Account) |

## Critical Finding: Tab Navigation Bug

During the Playwright audit, clicking sidebar tabs (Onboarding, Schedule, etc.) did **NOT** change the content area. The heading remained "Mission Control" (Overview) and the content did not switch. This may be:
1. A production build issue where event handlers aren't properly wired
2. A state management bug where `setActiveSection` doesn't trigger re-render
3. An animation/transition issue where the new content renders but isn't visible

**Impact:** Clients cannot navigate to any tab other than Overview in the current production build. This makes the tab consolidation work even more critical — we need to verify tab switching works after the overhaul.

## Admin Client View (Phase 0B)

| Surface | Data Shown | Real? |
|---------|-----------|-------|
| Client Cards | Name, email, status, tier | Real (2 clients: Vickie Valdez, Test Client) |
| Session Credits | "5 sessions left" (Test Client), "0 sessions left" (Vickie) | Real |
| Package Status | "Active Package" / "No Package" | Real |
| Engagement Score | 35% (Test Client), 22% (Vickie) | Real |
| Workouts | 0 (Test Client), 1 (Vickie) | Real |
| Revenue | $0 total, $375 monthly (Test Client) | Real |

## Trainer View (Phase 0C) — SKIPPED

Trainer audit skipped due to known trainer login redirect bug. Noted in matrix for Phase C follow-up.

---

## Tab Consolidation Spec (13 -> 7)

| Old Tab ID | Old Label | Action | New Tab ID | Rationale |
|-----------|-----------|--------|-----------|-----------|
| `overview` | Overview | KEEP (rewrite) | `overview` | Command center with real data |
| `onboarding` | Onboarding | KEEP | `onboarding` | Real onboarding flow |
| `schedule` | Schedule | KEEP | `schedule` | Core booking feature |
| `workouts` | Workouts | KEEP (expand) | `workouts` | Absorbs logs/nutrition |
| `progress` | Progress | KEEP | `progress` | Real progress tracking |
| `messages` | Messages | REMOVE | -> `overview` | Mock placeholder, erodes trust |
| `achievements` | Gamification | KEEP | `gamification` | Real gamification data |
| `community` | Community | REMOVE | -> `overview` | Mock placeholder, erodes trust |
| `videos` | Videos | REMOVE | -> `overview` | Mock placeholder, erodes trust |
| `logs` | Logs & Trackers | MERGE | -> `workouts` | Nutrition + logs into Workouts |
| `packages` | Packages | MERGE | -> `account` | Session credits in Account |
| `profile` | Profile | MERGE | -> `account` | Profile settings in Account |
| `settings` | Settings | REMOVE | -> `account` | Was using Profile anyway |

---

## Launch Deferrals

### Phase B: Session Usage Ledger (Backend)
- `useSessionCredits()` returns summary only (remaining, package name, expiry)
- Per-session usage history requires new backend endpoint
- Deliberate launch compromise: summary data is sufficient for initial trust
- UX copy mitigates: "Your package: {name} - {remaining} sessions remaining"

### Phase C: Admin/Trainer Client-Card Parity
- Admin and trainer views use separate component trees
- Ensuring identical data surfaces requires hook unification
- Phase 0 audit captures baseline for future comparison

---

## Baseline Screenshots

Saved to `frontend/e2e/screenshots/baseline/client-dashboard/`:
- `01-overview-1280px.png` - Client dashboard Overview at desktop
- `01-overview-375px.png` - Client dashboard Overview at mobile
- `admin-clients-view-1280px.png` - Admin clients management view

## Build Baseline

- `npm run build`: Succeeds (8.73s)
- `tsc --noEmit`: OOM on this machine (4GB limit insufficient). Using `npm run build` as gate.
