# ADMIN DASHBOARD WIDGET AUDIT — MASTER PROMPT v1 (2026-08-04)

> **Status:** ready-to-run · **Author:** Fable 5 (enhanced from Sean's dictated prompt, 2026-08-04)
> **decision:** Run a comprehensive multi-brain audit of the admin dashboard widget system, then produce the build blueprint.
> **status:** open
> **supersedes:** none

---

## 0. AUTHORIZATION & BUDGET (recorded from Sean's directive)

- Sean has **pre-authorized up to 15 total external panel calls** (Kimi K3 + HY3, via the
  `opus-kimi-consensus` dry-first panel — `scripts/ai-workflow/run-opus-kimi-consensus.ps1` /
  `scripts/ai-workflow/opus-kimi-consensus/cli.mjs`) for this workstream. This is the fresh,
  explicit yes required by the "Kimi = ONE review, ask first" standing law. Do NOT exceed 15;
  report the running count after every call. Cost gate (`scripts/lib/cost-gate.mjs`) stays active.
- Claude (Fable) runs the hostile loops itself (DRY-LOOP LAW). The paid panel is for
  **perspective and gap-finding**, not for iterating hostile rounds.
- **Rule 8 — zero PII to the panel.** Everything sent to Kimi/HY3 is IDs, roles, component names,
  and schema shapes only. Never real client names, emails, revenue rows, or geo data samples.

## 1. MISSION

Perform a comprehensive deep-dive audit of the **SwanStudios admin dashboard widget system**, then
produce a **final build blueprint** (plan + wireframes + Mermaid flowcharts + numbered shippable
slices) that:

1. **Hostile-reviews every mounted widget** — correctness, data truth, UX, mobile, Swan Lens
   conformance — and ranks each KEEP / UPGRADE / REBUILD / RETIRE.
2. **Fixes the data-lifecycle failure class** — Business Intelligence alerts (and every other
   alert/notification/feed widget) currently have **no way to clear, dismiss, archive, or delete
   items**, so widgets clutter and expand unboundedly. This is the P0 defect class.
3. **Finds the missing widgets** — gap analysis of what the admin dashboard SHOULD surface based on
   the data that already exists in the app, especially the **user dashboard** and **trainer
   dashboard** implementations.
4. **Designs one signature visual upgrade** — a Three.js-powered showpiece widget (see §6,
   Workstream E) that makes the dashboard visually striking while staying GPU-safe and
   reduced-motion compliant.
5. Aligns everything with **Swan Lens** (Style-Lens system: `paletteThemeId`, `motionMode`
   auto|reduced|off, tiers free|pro|elite, `colorScience.ts` WCAG+OKLab audit) and Sean's
   **roadmap priorities** (Marketing Command Center = #1 money focus; admin sees proof-of-value
   across clients per the Product Core Loop).

**Scope interpretation (state at kickoff, confirm with Sean if he objects):** the primary audit
target is the **ADMIN dashboard**. The user + trainer dashboards are the *data-source inventory*
for the gap analysis — what they capture that admin can't yet see. Enhancements to the user
dashboard itself are logged as follow-up candidates, not built in this workstream.

## 2. NON-NEGOTIABLE GATE ZERO — BRANCH DRIFT

The working tree (`wip/comms-notifications-2026-07-05`) is **~1,506 commits behind origin/main**.
Local files may not reflect production. Before ANY finding is recorded:

- `git fetch origin` and audit widget files **as they exist on `origin/main`**
  (`git show origin/main:<path>`, or a worktree checked out at `origin/main`).
- Every finding cites which ref it was verified against. A defect found only on the stale wip tree
  and already fixed on main is **not a finding**.
- Any fix slices produced by this blueprint are planned **against main**, never this wip branch.

## 3. GROUND-TRUTH RECON (Rules 26/27 — before any judgment)

Produce a **Canonical Surface Receipt** for the admin dashboard:

- Route file that mounts the admin dashboard URL → mounted layout
  (`admin-dashboard-view.tsx`, `AdminOverviewPanel.tsx`, `AdminOverviewSection.tsx`,
  `AdminStellarSidebar.tsx`) → which widget components are **actually rendered as JSX** (a lazy
  import declaration is not a mount).
- **Surface Classification Table** for every widget file found under
  `frontend/src/components/DashBoard/Pages/admin-dashboard/` — canonical / legacy / dormant /
  competing — with file:line evidence. Known inventory on the local tree (re-verify on main):
  `BusinessKPIDashboard`, `RevenueAnalyticsPanel`, `RevenueChart`, `UserGrowthChart`,
  `PendingPaymentsWidget`, `PendingOrdersAdminPanel`, `AdminFulfillmentQueue(+Card)`,
  `ContactNotifications(+Item)`, `RecentActivityFeed`, `RealTimeSignupMonitoring`,
  `SessionTrackingWidget`, `CancelledSessionsWidget(+Card)`, `UpcomingChecksWidget`,
  `AutomatedCheckInsWidget`, `ClientActivityWidget`, `ClientComplianceDashboard`,
  `HighRiskClientsWidget`, `TopTrainersWidget`, `GamificationSummaryWidget`,
  `SocialOverviewWidget`, `ModerationWidget`, `BulkModerationPanel`, `PostReportsWidget`,
  `OrientationIntakeWidget`, `WaiverSummaryWidget`, `OracleInsightsWidget`, `VisitorGeoWidget`,
  `VisitorWorldMap`, `AdminSystemHealthPanel`, `AdminSignalBar`, `AdminQuickActions`,
  `MetricCard`, plus `useBusinessIntelligence` (UniversalMasterSchedule hook) and
  `AdvancedAnalyticsDashboard`.
- For each canonical widget: consumer hook/service → exact frontend API path literal → backend
  route match → authoritative model fields (Rule 58 schema-drift check on every model touched).

## 4. WORKSTREAM A — HOSTILE REVIEW OF EVERY MOUNTED WIDGET

For each canonical widget, run the hostile checklist and record a verdict row:

| Check | What to prove |
|---|---|
| Data truth | Real data from real logs/sessions, or mock/placeholder? (mock = flagged gap per Data Truth Rule) |
| Loading/empty/error | All three states exist and render correctly |
| Refresh/staleness | Does it poll, socket, or go stale silently? Stale-after-failure behavior |
| Item lifecycle | Can items be dismissed/cleared/archived? Is dismissal persisted server-side? (feeds into Workstream B) |
| Unbounded growth | Pagination/caps, or does the widget expand forever as data accumulates? |
| Mobile (320/375/414px) | No overlap, no clipped text, no hover-only actions, 44px targets |
| Swan Lens conformance | `var(--token, #fallback)` only, no hardcoded colors, no retired Galaxy-Swan tokens, motionMode respected, `prefers-reduced-motion` fallback |
| Card standard | SheenCard geometry, low-motion data-card discipline, no duplicated facts |
| Accessibility | Keyboard operability, focus states, WCAG 4.5:1 |
| Perf | Lazy chart loading (Victory + SafeChart boundary), no eager heavy imports, GPU-safe animation |
| Actionability | Does it answer "what should I DO next?" or just decorate? (next-best-action north star) |

**Verdict per widget:** KEEP / UPGRADE (list exact upgrades) / REBUILD / RETIRE (with evidence) /
MERGE (duplicates another widget's facts).

## 5. WORKSTREAM B — DATA LIFECYCLE / DELETABILITY AUDIT (P0)

Sean's core pain: **Business Intelligence alerts cannot be cleared**, and the same class of
"no-delete" clutter affects other notification/data widgets. For EVERY widget that renders a list
of alert/notification/event items:

1. Trace the full lifecycle: where items are created (backend service/model) → fetched → rendered
   → whether ANY dismiss/clear/ack/archive path exists (UI affordance + API endpoint + DB column).
2. Classify: **no lifecycle at all** / **UI-only dismiss (returns on refresh)** / **persisted
   dismiss** / **auto-expiry**.
3. Design the fix as a **unified alert-lifecycle pattern**, not per-widget one-offs:
   - Per-item: acknowledge/dismiss (persisted per admin user), archive, and where destructive —
     delete with confirm (keyboard-operable, not mouse-only — this exact defect shipped before).
   - Bulk: "clear all," "clear read," filter by severity/age.
   - Retention: auto-archive after N days; widgets render bounded windows with "view all" drill-in.
   - Backend: dismissal state persisted server-side (per-admin `acknowledged_at` /
     `archived_at` — schema addition planned with migration, FKs referencing `"Users"`).
4. Start with `useBusinessIntelligence` + the BI alert surface, then sweep:
   `ContactNotifications`, `RecentActivityFeed`, `RealTimeSignupMonitoring`,
   `CancelledSessionsWidget`, `PostReportsWidget`, `ModerationWidget`, `OrientationIntakeWidget`,
   `PendingPaymentsWidget`, `AdminFulfillmentQueue`, `OracleInsightsWidget`, `UpcomingChecksWidget`
   — and any others recon surfaces (Rule 20 sibling sweep with the literal `rg` commands shown).

## 6. WORKSTREAM C — MISSING-WIDGET GAP ANALYSIS (Kimi's hostile lens)

Inventory what the app ALREADY captures that the admin dashboard does NOT surface. Sources:

- **User dashboard** (workout logs, progress charts, streaks, gamification/XP, social activity,
  measurements, goals) — what aggregate/exception views should admin have?
- **Trainer dashboard** (client rosters, session logging, plans, compliance, permissions) — what
  cross-trainer oversight views are missing?
- **Backend models with no admin surface at all** (enumerate: e.g. packages/orders, waivers,
  e-mail/nurture state, referral/marketing funnel, PLAUD ingests, Swan Coach usage, scheduling
  utilization).
- Grade every candidate against: Product Core Loop (who trained, what changed, what's stale, what
  needs intervention, what's celebration-worthy), Marketing Command Center focus (speed-to-lead,
  funnel, revenue), and Rule 62 strategy gate. Kill decorative candidates.
- Deliver a **ranked missing-widget list**: name, data source (model/route that already exists),
  admin question it answers, effort S/M/L, value rank.

## 7. WORKSTREAM D — SWAN LENS CONFORMANCE SWEEP

- Every widget audited against the Style-Lens system: global Lens vs scoped skin
  (`data-console-root` — remember the third lying-gate: UniversalThemeContext ≠ Style-Lens
  `paletteThemeId`), `motionMode` auto|reduced|off honored, tier gating free|pro|elite where
  relevant, `colorScience.ts` WCAG+OKLab audit reused (never reinvented).
- Output: conformance table + the exact token/wrapper fixes per non-conforming widget.

## 8. WORKSTREAM E — SIGNATURE THREE.JS VISUAL UPGRADE

Sean wants one widget taken to a cinematic tier with **Three.js** — "more visual, more beautiful,
make it pop."

- **Primary candidate:** `VisitorWorldMap`/`VisitorGeoWidget` → interactive 3D globe (visitor
  arcs, signup pulses) — the classic high-impact Three.js surface, and it feeds the marketing
  focus. **Secondary interpretation:** a new "Roadmap/Command" widget visualizing Sean's business
  roadmap and priorities in 3D. **Flag this ambiguity to Sean at kickoff (one question), default
  to the globe if unanswered.**
- Constraints the concept MUST satisfy: lazy-loaded chunk (Three.js never in the main bundle),
  `prefers-reduced-motion` + `motionMode` fallback to a static render, animation-performance-tiers
  law (full on desktop, reduced elsewhere), 60fps budget, graceful WebGL-unavailable fallback,
  Crystalline Swan palette only, and it must still answer an admin question (data-first, not
  decoration-first).
- Router discipline: this goes through `swan-design-router`'s concept-direction ideation gate
  (2–3 directions) before any build slice is written.

## 9. PANEL CALL ALLOCATION (≤15 total — dry-first, log every call)

| Phase | Calls (max) | Purpose |
|---|---|---|
| C1. Widget-inventory hostile pass | 2 | Kimi + HY3 each review the recon inventory + verdict table: "what did Fable miss / misjudge?" |
| C2. Missing-widget gap hunt | 3 | Kimi hostile pass on Workstream C with the sanitized data-model inventory; HY3 counter-pass; 1 reconciliation |
| C3. Alert-lifecycle design review | 2 | Panel attacks the unified lifecycle pattern (schema, bulk ops, retention) |
| C4. Three.js concept review | 2 | Panel critiques the 2–3 design directions for perf + wow + usefulness |
| C5. Final blueprint hostile pass | 2 | Full blueprint reviewed before it's declared final |
| Reserve | 4 | Follow-ups where a round genuinely disagrees; unused = unspent |

Rules: never send PII or raw data samples; send component names, schema shapes, IDs, and the
question. If the two brains agree and Fable's hostile pass runs dry, do NOT spend reserve calls.

## 10. FINAL DELIVERABLE — THE BLUEPRINT

One document at `docs/ai-workflow/AI-HANDOFF/ADMIN-DASHBOARD-WIDGET-BLUEPRINT-<date>.md`:

1. **Canonical Surface Receipt + classification table** (Rule 26/27, verified against origin/main).
2. **Per-widget verdict table** (Workstream A) with evidence.
3. **Alert-lifecycle architecture** — Mermaid sequence diagram (UI → API → model → persisted
   dismissal), schema migration plan, bulk-ops spec.
4. **Missing-widget ranked list** (Workstream C) with data-source proof each is buildable today.
5. **Swan Lens conformance table** + fix list.
6. **Three.js signature widget spec** — chosen direction, wireframe, perf budget, fallback tree.
7. **Wireframes** — desktop + mobile (414px) ASCII/HTML for the upgraded dashboard layout,
   including widget priority order (workout/progress truth and money surfaces before decorative).
8. **Mermaid flowcharts** — overall dashboard data-flow architecture + the alert lifecycle.
9. **Numbered, independently-shippable slices** — each with files, acceptance criteria, and tests,
   ordered: P0 alert lifecycle → widget fixes → missing widgets (top-ranked) → Three.js showpiece.
   Each slice buildable by a worker-bot with zero further questions (Rule 68 detail bar).
10. **Panel log** — every Kimi/HY3 call, verdict, what changed because of it (Rule 46-style log).

**Definition of done for THIS workstream:** blueprint exists, panel pass C5 is clean, Fable's own
hostile loop on the blueprint runs dry, and Sean signs off on slice order. Building the slices is
the NEXT workstream (against main, batch-push cadence per Rule 70).

## 11. WHAT NOT TO DO

- Do NOT write widget code in this workstream — this is audit + blueprint. (Exception: none.)
- Do NOT audit against the stale wip tree without the origin/main cross-check (§2).
- Do NOT send PII, revenue rows, or geo samples to Kimi/HY3 (Rule 8).
- Do NOT exceed 15 panel calls or re-review the same topic without logged disagreement.
- Do NOT propose Recharts, MUI, hardcoded colors, retired Galaxy-Swan tokens, or hover-only /
  mouse-only controls anywhere in the blueprint.
- Do NOT let the Three.js showpiece become decoration-first — it must answer an admin question.
- Do NOT mark anything "done" without proof + a dry hostile pass (Rule 73/74).
