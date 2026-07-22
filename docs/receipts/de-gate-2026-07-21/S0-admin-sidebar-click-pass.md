---
decision: Authenticated production click-pass required before S0 completion and after deploy
status: awaiting-sean
supersedes: none
---

# S0 Admin Sidebar Click-Pass

## How to run (about 10 minutes)

1. Open `https://sswanstudios.com/dashboard/admin/overview` in your existing authenticated admin session.
2. Click each item from the actual Stellar sidebar; do not paste the destination directly.
3. Record the final URL and one outcome: `renders`, `redirects intentionally`, `404`, `blank/crash`, or `wrong page`.
4. If anything fails, copy the visible error text and take a screenshot. Do not include tokens, cookies, client names, or other PII.
5. Open Launch Control read-only and record which of the ten rows show an active override versus env baseline. Do not flip or clear anything during S0.

Local code has 33 `WORKSPACE_CONFIG` entries and matching route definitions, but the current contract test only asserts five admin IDs. This live pass distinguishes stale-deploy behavior from a code parity gap.

## Command

| # | Sidebar item | Expected final prefix | Outcome | Actual final URL / note |
|---:|---|---|---|---|
| 1 | Coach Command Center | `/dashboard/admin/coach-assistant` | [ ] | |
| 2 | Dashboard | `/dashboard/admin/overview` | [ ] | |
| 3 | Messages | `/dashboard/admin/messages` | [ ] | |
| 4 | Report Room | `/dashboard/admin/support` | [ ] | |
| 5 | Clients & Team | `/dashboard/admin/client-management` | [ ] | |
| 6 | Waivers | `/dashboard/admin/waivers` | [ ] | |
| 7 | Scheduling | `/dashboard/admin/master-schedule` | [ ] | |
| 8 | Trainers | `/dashboard/admin/trainer-management` | [ ] | |
| 9 | Assignments | `/dashboard/admin/client-trainer-assignments` | [ ] | |
| 10 | Session Allocation | `/dashboard/admin/session-allocation` | [ ] | |
| 11 | Workout Planner | `/dashboard/admin/workout-planner` | [ ] | |
| 12 | Bootcamp Creator | `/dashboard/admin/bootcamp` | [ ] | |
| 13 | Equipment | `/dashboard/admin/equipment` | [ ] | |
| 14 | Pain Charts | `/dashboard/admin/body-map` | [ ] | |
| 15 | Nutrition | `/dashboard/admin/meal-planner` | [ ] | |
| 16 | Store & Revenue | `/dashboard/admin/admin-packages` | [ ] | |
| 17 | Pending Orders | `/dashboard/admin/pending-orders` | [ ] | |
| 18 | Analytics | `/dashboard/admin/revenue` | [ ] | |
| 19 | Trainer Payouts | `/dashboard/admin/trainer-payouts` | [ ] | |
| 20 | Marketing | `/dashboard/admin/marketing` | [ ] | |
| 21 | Gamification | `/dashboard/admin/gamification` | [ ] | |
| 22 | Content Studio | `/dashboard/admin/content` | [ ] | |
| 23 | Photo Galleries | `/dashboard/admin/gallery` | [ ] | |
| 24 | Security | `/dashboard/admin/security` | [ ] | |
| 25 | Account Access | `/dashboard/admin/account-access` | [ ] | |
| 26 | Launch Control | `/dashboard/admin/launch-control` | [ ] | |
| 27 | Feature Access | `/dashboard/admin/feature-access` | [ ] | |
| 28 | Trainer Permissions | `/dashboard/admin/trainer-permissions` | [ ] | |
| 29 | System | `/dashboard/admin/style-guide` | [ ] | |
| 30 | Workout Design Lab | `/dashboard/admin/workout-design-lab` | [ ] | |
| 31 | Badge Creator | `/dashboard/admin/badge-creator` | [ ] | |
| 32 | Canada Immigration | `/dashboard/admin/immigration` | [ ] | |
| 33 | My Home | `/dashboard/admin/my-home` | [ ] | |

## Launch Control read-only row check

For each row, record `override active`, `env baseline`, or `missing`. Do not copy actor IDs or audit metadata.

| Flag | Board state source | Current public value |
|---|---|---:|
| `homeVNext` | | true |
| `dashboardV2` | | true |
| `dashboardV2Finance` | | true |
| `storeV4` | | true |
| `aboutVNext` | | true |
| `videoVNext` | | true |
| `contactVNext` | | true |
| `galleryVNext` | | true |
| `prismCapture` | | true |
| `postSaveHandoff` | | true |

## Return format

Reply with either:

- `33/33 render or intentional redirect; no 404/blank/wrong page`, plus the Launch Control source column; or
- only the failed row numbers with actual URL/outcome/screenshot, plus the Launch Control source column.
