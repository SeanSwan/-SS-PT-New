# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/ADMIN-DASHBOARD-WIDGET-BLUEPRINT-2026-08-04.md
**Seed:** (none)
**Tokens:** 5329 in / 5898 out | **Cost:** ~$0.1045 | **Wall:** 53.9s | **finish_reason:** stop

---

# K3 Hostile Review — Missing Widgets, Wave Ranking, IA

**Overall verdict:** The blueprint is engineering-honest (Rule 26/27 receipts, verified claims) but product-naive. §5's sort key is *backend effort*, not *money*. The result: the highest-LTV widget in the entire document is scheduled in the **last build slice** (S10), behind a decorative globe (S9). Below, in order.

---

## 1. Widgets STILL missing (owner of a trainer-led PT SaaS)

§5 + §3 cover cost, drift, content, deliverability, renewals, capacity, onboarding. Here's what an owner actually opens the dashboard for that appears **nowhere**:

| # | Missing widget | Why it's load-bearing | Evidence of the gap |
|---|---|---|---|
| M1 | **Failed-payment / dunning queue** (declines, retry status, card-expiring-soon) | The #1 silent revenue leak in subscription PT. §3 has `PendingPaymentsWidget` ("mark paid") — that's *manual* payments, not *failed* ones. Nothing surfaces a Stripe decline with a recovery action. | §3 PendingPayments KEEP row; §5 absent entirely |
| M2 | **Refunds & chargeback/dispute inbox** | Disputes have **hard response deadlines** — this is alert-class, not display-class. Reconciliation (§5 #2) detects drift; it does not triage a chargeback due in 72h. Should emit into the S3 AdminNotification lifecycle. | §5 #2; §2 architecture (natural fit, unclaimed) |
| M3 | **Unredeemed session-credit liability** | Prepaid packages = deferred revenue on the books + breakage question. §5 *defers* this as "custom-package tracker, low-confidence." Wrong call — for a trainer-led business this is a balance-sheet number the owner is asked about constantly. | §5 deferred list |
| M4 | **Trainer payout / comp owed** | Money-out. `CancelledSessionsWidget` (§3, KEEP) already makes per-session billing decisions; the owner still has no "what do I owe trainers this period" view. Trainer-led SaaS without a payout widget is half a ledger. | §3 CancelledSessions row; §5 absent |
| M5 | **Trainer compliance (cert/insurance expiry)** | `ClientComplianceDashboard` is called "best actionability in the app" (§3) — for *clients*. Trainer-side NASM/ACSM cert + liability-insurance expiry is the *legal-risk* surface, and it's absent. | §3 ClientCompliance row; §5 absent |
| M6 | **Lead SLA / speed-to-lead timer** | §5 #4 ships deliverability telemetry and says it "gates the speed-to-lead epic" — but the actual revenue widget (new lead → time-to-first-contact → booked) is never listed. Deliverability without the SLA clock is ops vanity. | §5 #4 vs. the epic it names |
| M7 | **Engagement-decay / at-risk clients (rebuild, not retire)** | §3 **RETIREs** `HighRiskClientsWidget` — correctly, it's dormant with fake endpoints and an admitted-fake "Mark as Contacted." But retiring the *file* silently deletes the *concept* from the roadmap. Renewal/churn (§5 #6) catches subscription churn; a client who stopped *booking* 3 weeks ago is the precursor signal and belongs in Mission Critical. | §3 RETIRE row vs. §5 #6 |
| M8 | **Cancellation/no-show revenue leakage** (aggregate, per trainer, per client) | CancelledSessions handles case-by-case; nobody sums "revenue lost to late-cancels this month." That's the number that changes cancellation policy. | §3 CancelledSessions row |
| M9 | **Activation funnel** (signup → first session booked → first session completed) | §5 #8 "Onboarding Completion Tracker" is profile-completion-shaped. Activation is the retention lever; different widget. | §5 #8 |
| M10 | **Referral performance** | PT's cheapest growth channel; zero surface. | §5 absent |

**Killed correctly:** wearable coverage (§5) — good kill, no live ingestion.

---

## 2. Wave-1/Wave-2 ranking vs. revenue-first

§5's own header confesses the sort key: *"zero/near-zero backend work."* That's an effort ranking wearing a priority ranking's clothes. Consequences:

1. **Renewal/Churn-Risk Queue is wave 2 (#6) because the controller is unmounted.** Mounting a route is the *definition* of near-zero backend work — the model and service already exist. The highest-LTV widget in the document is demoted over a one-line mount, then scheduled in **S10, the final slice**, behind the SwanGlobe showpiece (S9). Revenue-first, this is wave 1, arguably P0-adjacent, and it should emit through the S3 alert lifecycle (a churning client is an *act-now* item, not a chart).
2. **AI Cost & Usage is ranked #1 — a cost-center widget.** Defensive spend visibility is fine, but it headlines the wave over money-in surfaces because the route happens to be mounted (§5 #1).
3. **Video Funnel (#3) is rank-inflated by an assertion.** "Marketing #1 focus" is stated, not evidenced, and 4 endpoints with zero consumers (§5 #3) haven't been shown to return funnel-*stage* data vs. raw view counts. For trainer-led PT, the revenue lever is lead→booked-session conversion (M6), not video views.
4. **Comms Deliverability (#4) is the right wave-1 citizen for the wrong reason** — it only earns its slot paired with M6. Alone it's telemetry.
5. **Notification Center (#5) is not a business widget.** It's the S3 byproduct. Listing it as a "missing widget" inflates the wave's value count.
6. **Trainer Capacity (#7) under-ranked.** Revenue per trainer-hour is the core unit economics of this business; it sits behind a content-funnel widget.
7. **No wave widget commits to actionability.** §3 flags "display-only" as a defect on *existing* widgets (BusinessKPIDashboard, GamificationSummary), yet §5 doesn't state which new widgets emit alerts vs. render passively. M1/M2/M6/churn are all alert-class; the blueprint's own S2 contract (persisted dismiss, bounded window, retention) should be named as their delivery vehicle.

**Revenue-first re-rank:** Reconciliation + Failed-payments (M1) + Disputes (M2) + Renewal/Churn (promote) + Comms+Lead-SLA (M6) → wave 1. AI Cost, Video Funnel, Capacity → wave 2. PLAUD/Bootcamp → wave 3 pending revenue-line evidence.

---

## 3. IA & wireframe critique

### Density
- **The rebuild adds surface, it doesn't subtract.** §1: 21 widgets + 2 bars in six sections. §7 keeps everything and adds 3 wave-1 widgets to Business Lens → ~24+ widgets, with **no widget-count budget and no sunset criteria**. S7 retires *files*; nothing retires *mounted* surface.
- **Business Lens band is overloaded and semantically impure** (§7): Revenue │ Growth │ KPIs │ AI Cost │ Reconciliation │ Video Funnel — six items, and two of them (cost, drift) are finance-*ops*, not money-truth. Mixing spend-risk into the "money truth" band dilutes the band's promise. Move AI Cost to Deep Telemetry; Reconciliation belongs beside Alerts (it *generates* alerts).
- **Mission Critical violates its own label.** "Act now" contains Alerts Center (triage) + Orientation + Waivers (compliance *queues*, act-this-week) + PendingPay + Cancelled (case work). Three different urgency semantics and two different interaction models (dismissible alerts vs. non-dismissible work queues) in one band — and the wireframe never marks which is which. That conflation *is* the noise source.

### Hierarchy
- **SignalBar anchor order ≠ scroll order.** Bar: Mission, Pulse, Ops, Community, Business, Map. Page: Mission → **Business** → Ops/Pulse/Community → Telemetry. Anchor 5 jumps to section 2. Broken wayfinding; also "[Map]" label vs. "Deep Telemetry" section name.
- **60% of the page is unspecified.** "OPERATIONS / PULSE / COMMUNITY (as today, fixed)" — the IA review literally cannot be completed; wave-2 widgets (renewal queue, capacity, onboarding) have **no assigned home**. Renewal queue is Mission-Critical-shaped *and* Business-shaped; the blueprint never decides.
- **Verdict/wireframe contradiction on Revenue.** §3 says the duplicate RevenueChart should become "label + link instead of duplicate chart `[LIKELY]`"; §7 still draws "Revenue (net) ▸ /revenue" as a band item — chart or link? Undecided in the document itself.
- **The whole hierarchy is gated on S11.** Bare `/dashboard/admin` lands on **Master Schedule** (§1 Finding A). If Sean rejects S11, this entire Command Center is one click deep and the SignalBar is moot on first paint. The wireframe never acknowledges the de-facto landing surface.
- **Mobile wireframe is a shrug** ("…one column, bounded lists…"). No mobile ordering rationale, and shipping a static SwanGlobe + city list on 414px is dead weight — collapse Deep Telemetry entirely on mobile.

### Low-noise alert triage
The §2 contract is genuinely good (persisted per-admin dismiss, bulk, bounded window + view-all, expiry cron, idempotency, three distinct states). But the §7 rendering of it is not low-noise:

1. **No severity or aging model.** "● unread(3)" is a *volume* metric. Triage needs severity × age ordering (a chargeback due in 2 days outranks 40 unread finance infos). The wireframe shows a flat recency list with [✓][✕].
2. **No mute/snooze/per-type thresholds.** Dismiss-only means the recomputed finance generator (§2, failure #2) re-floods the moment conditions recur. Need per-type mute, daily-digest mode, and a generator rate cap — none stated.
3. **Refresh cadence unspecified.** §3 cross-cutting defect #2 is "refresh anarchy," S5 fixes it for *other* widgets with `usePolledFetch(60s)`, but the Alerts Center's own poll/push strategy never appears in the §2 sequence diagram.
4. **No ownership/assignment.** The model has per-admin `readBy`/`actionTaken` — multi-admin aware — but the wireframe shows no "claimed by Sean" affordance. Two admins will double-handle the same refund.
5. **Badge truth is split.** AdminSignalBar is KEEP (§3) with verified anchors — does it carry its own alert count? If yes, two badge sources of truth; the wireframe doesn't reconcile them.

---

## 4. Required amendments before panel pass

1. Re-sort §5 by revenue impact; promote Renewal/Churn to wave 1 and into **S8**; demote S9 (globe) behind S10.
2. Add M1–M5 to the missing-widget list; reclassify M3 from "deferred" to wave 2; log M7 as "rebuild-on-demand," not retired-concept.
3. Assign every wave-1/2 widget a named section home; split Mission Critical into **Alerts (dismissible)** vs. **Queues (work items)**.
4. Fix SignalBar order to match scroll order; resolve the Revenue chart-vs-link contradiction; wireframe Ops/Pulse/Community or explicitly defer with owner.
5. Extend the S2/S3 alert contract: severity × age sort, per-type mute + digest, generator rate caps, stated refresh cadence, claim/assign affordance, single badge source.
6. State a widget-count budget per section and sunset criteria, or this surface is back at 30 widgets by wave 3.

**Panel recommendation: conditional pass — S1–S5 proceed as written; §5 ranking, §7 IA, and slice order S8–S10 return for revision.**
