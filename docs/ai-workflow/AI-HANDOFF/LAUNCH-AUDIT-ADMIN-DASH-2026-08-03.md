---
decision: Admin dashboard launch-readiness audit (Lane 2 of 5) — verdict + fixes + handoffs
status: open
supersedes: none
---

# LAUNCH AUDIT — ADMIN DASHBOARD (Lane 2 of 5) — 2026-08-03

**Agent:** VS-Claude (Fable 5) · **Base:** `origin/main` @ `0949eaf6b` (shared wip tree is 1,422 commits behind — all findings verified against main per Ground Rule 1)
**Worktree:** `c:/tmp/ss-launch-audit-lane2-20260803`, branch `claude/launch-audit-lane2-20260803`
**Lane commits (local, NOT pushed — integrator reconciles):** `faf56539d`
**Method:** 6 parallel read-only sweeps (surface map, backend security, KPI data-truth, Launch Gate Zero, Canada-tab privacy, static UX) + first-hand verification of every load-bearing claim (rule 30) + in-lane fixes with hostile pass run dry.

## VERDICT — LAUNCH-READY: **YES, with 2 named non-blocking P1 handoffs**

No P0 anywhere in the admin lane. All 32 admin backend surfaces are server-side role-gated (DB-backed, fail-closed); every KPI on the canonical overview traces to real DB queries; no Stripe/SendGrid key material exists in the repo; the Canada tab is verifiably admin-only. The two P1s that remain are **handoffs, not lane blockers**: (1) charge-card rate limiter (Lane 4 applies — Stripe-adjacent), (2) per-tab error boundary + from-address domain fallback (integrator applies — shared infra). Named blockers to *promotion-scale* launch: none in this lane; DMARC (SWA-13) remains the top SEAN-ACTION for email deliverability.

---

## LAUNCH GATE ZERO (Lane 2 extra duty) — SEAN-ACTION vs BUILDABLE

### SEAN-ACTION (only you can do these)
1. **DMARC (SWA-13) — still pending.** Namecheap → TXT record: host `_dmarc`, value `v=DMARC1; p=none; rua=mailto:<your-reports-inbox>; fo=1; pct=100`. ~10 min. Tighten `p=` after 2–4 weeks of clean reports. Gates inbox placement for nurture/booking email.
2. **Confirm SendGrid Sender Authentication** shows **Verified** for `sswanstudios.com` (SendGrid dashboard → Settings → Sender Authentication).
3. **Confirm Render `SENDGRID_FROM_EMAIL`** is an address on the authenticated domain.
4. **Stripe key rotation (when desired)** — runbook below. No leak was found, so this is hygiene-on-your-schedule, not an emergency.

### BUILDABLE (code — proposed, not yet applied)
1. **P1** — wrong-domain from-address fallback: `backend/utils/notification.mjs:98`, `ManualPaymentStrategy.mjs:260,282`, `EthicalAIPipeline.mjs:438,1018` hardcode `noreply@swanstudios.com` (unauthenticated domain; real domain `sswanstudios.com`). If `SENDGRID_FROM_EMAIL` is ever unset → SPF/DKIM misalignment → spam/reject. Shared infra → §SHARED-INFRA PROPOSALS.
2. **P2** — rename tracked `frontend/.env.production` → `.env.production.example` (scanned clean; placeholder values only; rule-34 gated).
3. **P3** — boot-time warning when `SENDGRID_FROM_EMAIL` domain ≠ authenticated domain.

### Stripe key-material scan result [VERIFIED, presence-only per rule 59]
**ZERO real key material repo-wide.** Longest key-shaped suffix anywhere = 12 chars (test fixture; real keys ~99). All hits = validators/redaction rules, test fixtures, scanner pattern definitions, archived prefix checks. SendGrid `SG.`-shape: zero matches. `.gitignore` env coverage comprehensive; tracked env files are templates (scanned clean). All 4 Stripe webhook `constructEvent` sites verify against the true raw body (global JSON parser excludes webhook paths — `backend/core/middleware/index.mjs:38-48`).

### Stripe rotation runbook (env var NAMES only)
1. Stripe Dashboard → Developers → API keys → **Roll** secret key (24h grace). Optionally use a restricted `rk_live_` key (code accepts it — `utils/stripeConfig.mjs:197`).
2. Render backend service → Environment → update `STRIPE_SECRET_KEY` → save (redeploys).
3. Dashboard → Developers → Webhooks → endpoint for `/api/webhook/stripe` (alias of `/webhooks/stripe`) → **Roll secret** → update Render `STRIPE_WEBHOOK_SECRET` → redeploy. If `/api/cart/webhook`, `/api/subscriptions/webhook`, `/api/session-packages/webhook` are separately registered endpoints, roll/update each (all verify against the same env var).
4. Publishable key (only if rotating): update `VITE_STRIPE_PUBLISHABLE_KEY` on **frontend build env** (Vite bakes at build) AND backend env (`stripeConfig.mjs:39` reads it); legacy alias `STRIPE_PUBLISHABLE_KEY` read at `adminSettingsController.mjs:400` — set both if present. Redeploy frontend.
5. Verify: no signature failures in Render logs; send dashboard test webhook; `scripts/qa/render-payment-preflight.mjs`; admin Settings shows "configured" (masked). Expire old key.
**Coordinate with Lane 4 before touching any Stripe config** (Lane 4 = sole Stripe owner).

---

## FINDINGS TABLE (consolidated, severity-ranked; all file:line verified on origin/main)

| # | Sev | Area | file:line | Finding | Status |
|---|---|---|---|---|---|
| 1 | P1 | Security | `backend/routes/adminChargeCardRoutes.mjs:110` | No rate limiter on admin card-charging endpoint (`/charge`, `/test-card`); leaked admin token could hammer Stripe. Every sibling money router has one | **HANDED TO LANE 4** (Stripe-adjacent; exact diff in conflicts file) |
| 2 | P1 | Resilience | `frontend/src/routes/main-routes.tsx:342` (only router-level boundary) | No per-tab error boundary: one throwing tab component ejects the ENTIRE admin dashboard to the root ErrorBoundary (this exact class took down the admin dash in the 2026-04-12 rule-43 incident) | **SHARED-INFRA PROPOSAL** below |
| 3 | P1 | Email | `backend/utils/notification.mjs:98` (+ ManualPaymentStrategy, EthicalAIPipeline) | From-address fallback on unauthenticated domain `@swanstudios.com` | **SHARED-INFRA PROPOSAL** below |
| 4 | P1 | Mobile UX | `admin-specials/adminSpecials.styles.ts:38`, `admin-waivers/adminWaivers.styles.ts:72` | Tables clip/squash at 320–414px (no scroll container; `overflow:hidden`) | **FIXED** `faf56539d` |
| 5 | P1 | Touch targets | `adminSpecials.styles.ts:70` (28px), `AdminSocialManagementView.tsx:455-457` (40px) | Interactive controls below 44px on mounted admin surfaces (rule 2) | **FIXED** `faf56539d` |
| 6 | P2 | Security | `backend/routes/aiBffRoutes.mjs:192-199` | Role `'user'` falls through the client/trainer deny branches on `/api/admin/ai-bff/client-summary/:clientId`. Downstream gates re-deny each sub-fetch (requester's own auth header forwarded), so defense-in-depth gap, not a proven leak. **Same root class as Lane 1's P0 systemic finding: `role === 'client'` written where client-equivalent (`'client'`+`'user'`) was meant** — see conflicts file systemic note | Backlog: replace branchy check with `ensureClientAccess` (`utils/clientAccess.mjs:16` handles `'user'`) |
| 7 | P2 | Security | `backend/routes/adminGalleryRoutes.mjs:1473-1622` | Trainers can execute money-path print-order ops (refund/mark-shipped/retry/delete photo); `galleryAdminOnly` exists but only guards R2 CORS ops | **HANDED TO LANE 4** (refund calls Stripe) |
| 8 | P2 | Security | `backend/routes/adminPaymentSettingsRoutes.mjs:89-93` | GET allows trainer read of Zelle/Venmo payee settings; header doc says "Admin only" (PUT is correctly admin-only) | **HANDED TO LANE 4** |
| 9 | P2 | Security | `backend/routes/adminComplianceRoutes.mjs:86` | `${days}` template-interpolated into SQL `INTERVAL` — currently safe (server-side map, validated period) but one refactor from injection | Backlog: move to `replacements` |
| 10 | P2 | Security | `backend/routes/videoLibraryRoutes.mjs:233-236` | `/api/admin/videos/:id/track-view` open to any authenticated user, no limiter — unbounded writes under `/api/admin` prefix | Backlog: add limiter |
| 11 | P2 | Security | `backend/routes/badgeCreatorRoutes.mjs:19` | Paid Gemini generation admin-gated but unlimited — cost-abuse surface on token leak | Backlog: add limiter |
| 12 | P2 | Data truth | `Pages/admin-dashboard/UsersManagementSection.tsx:426-489` | `setMockData()` injects fake users/stats on fetch failure with no indicator — **BUT file is dormant (0 importers)**; would be P0 if ever wired | Backlog: quarantine/delete candidate (rule 34 checks first) |
| 13 | P2 | UX/a11y | `AdminStellarSidebar.nav.styles.ts:143` | Collapsed-sidebar nav tooltips hover-only — unreachable on touch/keyboard | Backlog (canonical nav, worth a small slice) |
| 14 | P2 | UX | `admin-users/EnhancedUserDataManagement.tsx:636-641` | Fetch/update errors → toast only; no persistent error/retry UI in table region (loading + empty states exist) | Backlog |
| 15 | P2 | Theme | ~408 raw color declarations across admin Pages; worst: EnhancedTrainerDataManagement (33), EnhancedUserDataManagement (31) with off-brand Tailwind raws (`#3b82f6`, `#10b981`, `#ef4444`) | Violates rule 6 token pattern; pages read generic, not Crystalline Swan | Backlog #3 |
| 16 | P2 | Theme | `admin-clients/components/copilot-shared-styles.ts:4-5` | `SWAN_CYAN` constant is actually Wing Purple `#8B5CF6`; `GALAXY_CORE` resurrects retired-theme vocabulary | Backlog (rename; prevents future agents matching wrong color) |
| 17 | P2 | Motion a11y | 15 admin files with looping keyframes lack `prefers-reduced-motion` guards (incl. CreateClientModal, copilot spinners, sidebar) | Rule 25 | Backlog |
| 18 | P3 | Data truth | `analyticsRevenueRoutes.mjs:225`, `analyticsUserRoutes.mjs:144` | "Target" KPI values are synthetic (revenue×1.15, users×1.1), not business-set | Backlog: label as auto-target or make configurable |
| 19 | P3 | Data truth | `adminComplianceRoutes.mjs:173-186` | Check-ins dashboard endpoint is an honest stub (empty arrays); widget slightly over-implies feature exists | Trailhead-truth note |
| 20 | P3 | Privacy note | `backend/routes/immigrationRoutes.mjs:425-590` | `/seed` payload hardcodes sensitive family narrative (roles only, no names/case numbers) into committed source | Sean-owned decision to keep/move |
| 21 | INFO | Hygiene | 8 dormant workspace files, Berry leftovers, `DirectAppRoutes.tsx`, dormant `NASMAdminDashboard`, placeholder `SystemHealthManagementSection` — all 0-importer | Full table in surface receipt (agent output §C) | Cleanup backlog (rules 32-39, separate pass) |

### Verified-GOOD highlights (receipts in agent outputs, spot-checked first-hand)
- **Canonical surface receipt:** `/dashboard/admin/*` → `main-routes.tsx:925-934` → `UniversalDashboardLayout` → 41 nav tabs, all canonical with file:line. `/admin` does not exist as a route.
- **Security:** all 32 admin route files server-side gated; role always read from DB (`authMiddleware.mjs:320` `User.findByPk`), never from token claims; owner gates (`adminOwnerGate.mjs:56-65`, `supportOwnerOnly.mjs`) fail CLOSED (unconfigured → 503). No skeleton-key elevation exists on main (the relocated skeleton-key sits on an unmerged branch — matches memory). No mount-order shadowing found across the eleven `/api/admin` mounts.
- **IDOR spot-checks:** `buildAtRiskComplianceQuery` trainer-scopes via active `client_trainer_assignments` join (`adminComplianceHelpers.mjs:8-19`) [VERIFIED first-hand]; admin client list clamps `limit` ≤ 100 (`adminClientController.mjs:450`) [VERIFIED first-hand].
- **Data truth:** every canonical KPI → real Sequelize/SQL (Order.sum, User.count, Session.count, raw SQL on `"Users"`/`workout_sessions` — dual-table gotcha respected everywhere checked; zero caller↔model drift on Order/Session/User/WorkoutSession/RecoveryCompletion). 17+ `.truth.test.ts` files already pin widgets to real endpoints.
- **Stale-client intervention signal EXISTS** (the wanted launch tool): `ClientComplianceDashboard` on the canonical overview ranks clients critical/warning/watch from real workout data with "No workouts in N days", sessions-remaining badge, compliance %.
- **Revenue visibility:** sessions-remaining per client (at-risk payload + Session Allocation Manager), packages sold by revenue (RevenueAnalyticsPanel), DB-vs-Stripe reconciliation with >5% divergence warning. Gap: no per-charge Stripe feed (disputes/failed charges) — backlog #6.
- **Canada tab: ADMIN-ONLY YES** — router-level DB-role gate on all 9 endpoints, all SQL parameterized + user-scoped, no uploads, no LLM/log exposure, zero schema drift, FK cascade risk already remediated (verify migrations ran in prod).
- **Theme bans clean:** zero retired Galaxy-Swan tokens in live admin code; zero MUI imports; zero rule-43 css-helper hazards.

---

## FIXES SHIPPED (worktree commit `faf56539d`) + PROOF

| Fix | Files | Proof |
|---|---|---|
| Phone-width table scroll (320–414px no longer clips) | `adminSpecials.styles.ts`, `AdminSpecialsTable.tsx`, `adminWaivers.styles.ts`, `AdminWaiversTable.tsx` | New `AdminSpecialsTable.render.test.tsx` pins scroller-wraps-table + actions + empty state; existing waivers manager suite renders the table through the new wrapper. **vitest 24/24 (4 files)** in worktree |
| Keyboard-accessible scrollers | same | `tabIndex={0}` + `role="region"` + aria-label (hostile-pass round 2 catch: overflow divs aren't keyboard-scrollable) |
| 44px touch targets | `adminSpecials.styles.ts` (ActionButton 28→44), `AdminSocialManagementView.tsx` (ActionIcon 40→44; `.post-actions` container verified flexible) | vitest 24/24; container grep receipt `:403` |

**Tier-A disclosure (rule 56):** vitest targeted suites: 24/24 pass [VERIFIED]. Full `tsc --noEmit` **PASSES: exit 0, zero errors, slice included** [VERIFIED] — but ONLY with `NODE_OPTIONS=--max-old-space-size=14336`; at the previously-documented 8GB it still OOM-crashes (reproduced this session). Operational note for all lanes/CI: the 2026-07-16 memory's 8GB guidance is now insufficient — use 14GB. Baseline main type-checks clean at that heap size.
**Hostile pass:** 2 rounds; round 1 found the keyboard-scroll gap (fixed), round 2 found nothing new — **run dry.**

---

## SHARED-INFRA PROPOSALS (C4 — integrator applies once, centrally)

### 1. Per-tab error boundary (P1) — `UniversalDashboardLayout.shellPieces.tsx:93-110`
Wrap each tab element so a throwing tab degrades to an in-shell error card instead of ejecting the whole dashboard:
```tsx
// shellPieces.tsx — inside the visibleRoleRoutes map:
<Route key={route.path} path={route.path} element={
  <TabErrorBoundary tabLabel={route.label}>   {/* new ~40-line component */}
    <Component />
  </TabErrorBoundary>
} />
```
`TabErrorBoundary` = classic componentDidCatch boundary rendering a Crystalline-styled card ("This tab hit an error — Retry / other tabs still work") with a reset key on route change. Benefits all four role dashboards (why it's C4). Suggested location: `components/DashBoard/TabErrorBoundary.tsx`.

### 2. From-address fallback (P1) — three files
```js
// backend/utils/notification.mjs:98  (same shape in ManualPaymentStrategy.mjs:260,282; EthicalAIPipeline.mjs:438,1018)
- from: process.env.SENDGRID_FROM_EMAIL || 'noreply@swanstudios.com',
+ from: process.env.SENDGRID_FROM_EMAIL || 'noreply@sswanstudios.com',
```
(Optionally hoist a single `getDefaultFromAddress()` into `sendgridService.mjs` and import at all three sites.)

---

## CROSS-LANE HANDOFFS (logged in `.ai-workflow/coordination/launch-audit-conflicts.md`)
- → **Lane 4:** charge-card limiter (P1, diff provided), gallery print-order admin gate (P2), payment-settings trainer-read (P2).
- → **Integrator:** the two shared-infra proposals above; Lane 1's systemic `role === 'client'` grep recommendation cross-confirmed by my finding #6 (aiBff `'user'` fall-through is the same class).
- ← **From Lane 1:** their P0 fix in shared `scheduleController.mjs` asserts admin/trainer schedule output shapes unchanged — no action needed in this lane.

## ENHANCEMENT BACKLOG (launch-impact ranked)
1. Apply the two P1 shared-infra proposals (integrator).
2. aiBff `'user'`-role fall-through → `ensureClientAccess` (finding #6) + integrator's backend-wide `role === 'client'` grep.
3. Tokenize off-brand raws in EnhancedUserDataManagement + EnhancedTrainerDataManagement (64 raws — the two flagship management pages read generic-template, not Crystalline Swan).
4. Collapsed-sidebar tooltip reachability (`:focus-within` + `hover:none` fallback).
5. `prefers-reduced-motion` guards on the 15 gap files (start with always-looping spinners).
6. Per-charge Stripe status feed (disputes/failed charges) on the Revenue panel — only real revenue-visibility gap.
7. Persistent error+retry UI in EnhancedUserDataManagement (mirror Client Hub `role=alert` pattern).
8. Rate limiters: track-view + badge-creator (findings #10, #11); SQL INTERVAL hardening (#9).
9. Dormant-file cleanup pass (finding #21 + mock-data file #12) — separate rule-37 pass, Sean-approved.
10. Rename `SWAN_CYAN`/`GALAXY_CORE` constants (finding #16); "Target" KPI labeling (#18).

## PANEL VERDICTS
Not run. The authorized HY3+Kimi panel was skipped: memory law "Kimi = ONE review, ask first" requires a fresh yes that a non-interactive session cannot obtain, and no major IA decision emerged that needs a panel — the exceptions-vs-overview question is already answered on main (overview home + exceptions surfaced via ClientComplianceDashboard + AdminSignalBar). Panel candidates if Sean wants one later: (a) exceptions-first admin home promotion, (b) per-charge Stripe feed design.

## POST-TASK HYGIENE (rule 38)
Created: this artifact; lane file + conflicts file entries; worktree `c:/tmp/ss-launch-audit-lane2-20260803` (+ node_modules, ~2GB — delete after integration via `git worktree remove`); `c:/tmp/lane2-tsc.out`; 1 new test file (permanent, committed). No temp artifacts in the shared tree.

**Next slice:** integrator reconciliation of the 5 lanes (apply shared-infra proposals + Lane 4 handoffs, then batch-push per rule 70) — highest-value because every lane's fixes are stranded on local worktree branches until reconciled.
