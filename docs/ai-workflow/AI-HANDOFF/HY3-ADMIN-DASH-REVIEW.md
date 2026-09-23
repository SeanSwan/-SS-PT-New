# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/ADMIN-DASHBOARD-WIDGET-BLUEPRINT-2026-08-04.md
**Seed:** (none)
**Tokens:** 5568 in / 7447 out | **Cost:** ~$0.0047 | **Wall:** 133.3s | **finish_reason:** stop

---

**Tencent HY3 — Divergent Interaction & Systems Design Pass**
*Panel stance: the blueprint is structurally sound on forensics (P0 root-cause, dead-file retirement, adopting the dormant `AdminNotification` model) but weak on three fronts you asked me to stress-test. Below, I break each seam, then give concrete alternatives. I assume `M1` = "minimal/essential motion only, no ambient animation" per the style-lens tiers; if Sean's tier definition is looser, D1 needs re-negotiation, not just a guard.*

---

## 1. Unified Alert-Lifecycle UX — Triage Speed & Low-Noise

### Stress-test (where the "unified" claim leaks)
- **It isn't one lifecycle, it's two-plus.** S3 merges `ContactNotifications` finance alerts into `AdminNotification`, but `PostReportsWidget` (S1) keeps its own row-mutation pattern. So at ship time you have: (a) `Alerts Center` on `AdminNotification`, (b) `PostReports` on `PostReport.resolve/.dismiss`, (c) `Contact` read-state on `viewedAt`. That's **three muscle memories** for the admin. "Unified" is a goal, not the delivered contract.
- **No severity model.** `AdminNotification` has `actionRequired` (boolean) and `expiresAt`. Triage speed dies when a $0.02 finance rounding glitch and a welfare-check failure (`UpcomingChecks`) sort by timestamp only. Binary "action required" is not prioritization.
- **Bulk is incomplete.** The API exposes `POST /bulk {archive}` but no `resolve`. An admin cannot clear a page of 8 action-required items in one click — they must open each. That guarantees alert fatigue and "clear-read-and-hope" behavior.
- **Multi-admin truth is undefined.** Blueprint says "persisted per-admin `readAt/readBy`" but the model field is singular. If Admin A resolves and Admin B still sees it, that's a safety bug. If A archives and it vanishes for B, that's an audit bug. The doc doesn't pick.
- **Retention is partial.** `expiresAt` + cron exists for `AdminNotification`, but `Contact`/`PostReport` have no TTL. Old dismissed rows stay in DB; a leaky query later resurfaces them.
- **Idempotency can still fatigue.** Upsert-with-key prevents duplicate *rows*, but if a condition persists, re-upsert bumps `updatedAt` and re-surfaces. No suppression window.

### Concrete Alternatives
- **A1 — Adapter, not migration.** Build one `AlertList` primitive with a source adapter interface: `getItems / dismiss / resolve / bulk(op, ids)`. `AdminNotification`, `PostReport`, and `Contact` each implement the adapter. One UX, three stores. Kills the divergence without forcing a schema merge.
- **A2 — Add `severity` (0–3) + `category`.** Sort weight = severity → time. Map `UpcomingChecks` welfare to P0, finance drift to P2. Show a severity rail (not a blink) on each row.
- **A3 — Three verbs, not two.** UI exposes: **Ack** (per-admin seen), **Resolve** (global truth, hides for all), **Archive** (hide without resolving). Add `POST /bulk {resolve}` to the existing route set.
- **A4 — Resolution global, read-state per-admin.** Side table `notification_read_state(adminId, refId, readAt, archivedAt)`. `AdminNotification` keeps `resolvedBy/resolvedAt` global. Fixes the Sean/Jane collision.
- **A5 — Retention matrix.** Explicit per-class TTL: Contact 90d, PostReport 180d soft-delete, System 14d. Extend cron to soft-delete resolved non-`AdminNotification` rows.
- **A6 — Suppression window.** If an alert condition persists > 24h unacknowledged, stop re-surfacing until explicitly acknowledged (prevents the "it yells at me every refresh" loop).

---

## 2. SwanGlobe (Three.js D1) vs M1, Mobile, Perf

### Stress-test
- **M1 compliance is hand-wavy.** D1 says "idle = static beauty; rotation/arc animation only on hover/drag when `motionMode=auto` + `prefers-reduced-motion` allows." Drag-rotate is *essential* (spatial navigation) — fine. But "Gilded Fern signup pulses" are ambient/decorative. If M1 forbids non-essential motion, pulses violate it even when gated. The blueprint never defines the pulse as transactional.
- **Mobile bundle waste.** Wireframe says mobile = "static render + city list, no WebGL loop." But S9 says "Three.js in a lazy chunk." If mobile never animates, **why ship 300–500kb JS to a phone for a static picture?** The SVG fallback should be the default on coarse-pointer/short-viewport, with the chunk never fetched.
- **Perf claims unsubstantiated.** "60fps interact" with no spec for: `devicePixelRatio` clamp, offscreen render pause (`IntersectionObserver`), geometry disposal on unmount, or instanced sprites for 1k+ arcs. A naive Three.js globe with per-city meshes will jank.
- **Information compression is poor.** A globe is beauty, not telemetry. Admin needs "top 10 cities by signup/visitor" ranked — the globe alone fails the density test for a *deep-telemetry* section.
- **No context-loss handler.** WebGL context loss (common on tab backgrounding) will hard-crash the widget to black.

### Concrete Alternatives
- **B1 — Strict M1 interpretation.** Idle = static obsidian sphere, no pulses. Drag = camera only. Hover/focus a city = highlight that one marker (no animated arc). New signup = **single** pulse on ingest, then stop. No ambient loop, ever.
- **B2 — Conditional import, not just lazy.** `if (isDesktop && hasWebGL && motionAllowed) { import('./SwanGlobe') } else { <SvgMap/> }`. Measure bundle delta; assert zero Three.js in mobile transfer via `@size-limit`.
- **B3 — Perf contract in S9 AC.** Add to acceptance: `setPixelRatio(Math.min(dpr,2))`, `IntersectionObserver` pause + `visibilitychange` pause, `dispose()` on unmount, merged `BufferGeometry` + `InstancedMesh` for points.
- **B4 — Split-pane, not full-bleed.** Globe left (60%), sortable geo-table right (40%) synced to hover/focus. Table is the truth; globe is the "where." Fixes compression.
- **B5 — Context-loss → SVG.** `renderer.domElement.addEventListener('webglcontextlost', fallbackToSvg)`.

---

## 3. Failure States & Information Compression Across the Grid

### Stress-test
- **False negatives are systemic, not per-widget.** UpcomingChecks, SessionTracking, Gamification, PostReports, SystemHealth all collapse error→empty/zero. S5 treats these as "micro-fixes" — but with 31 widgets (21 + 10 new) the defect class will recur unless there's a **systemic shell**.
- **No error isolation.** No `ErrorBoundary` per widget mentioned. One throw in `RevenueChart` white-screens the Command Center for every admin.
- **Compression is unmanaged.** 21 → ~31 widgets in six one-scroll sections. SignalBar anchors but the page is a 5,000px scroll. Cognitive overload; "bounded window" only applies to alerts.
- **Staleness mixed with liveness.** `RealTimeSignupMonitoring` has unbounded upsert array + 30s poll that resets pagination; `BusinessKPIDashboard` is fetch-once. No consistent freshness signal.

### Concrete Alternatives
- **C1 — `WidgetShell` mandate.** A wrapper enforcing: header (title, last-updated, refresh), and three distinct slots — `loading` (skeleton, never false-zero), `empty` (explicit "nothing to act on"), `error` (explicit message + retry). All 31 widgets adopt it. This retires the false-negative class at the root.
- **C2 — Per-widget `ErrorBoundary` + `Suspense`.** Isolate crashes; degraded widget shows "unavailable" not white-screen.
- **C3 — Adaptive density.** Widgets in "healthy/empty" default auto-collapse to a 44px title bar with a count badge. Mission-critical with items stays open. Turns 31 widgets into 6 scannable sections with drill-down.
- **C4 — Explicit error vs empty test.** Add a slice-acceptance test: mock `fetch → 500`; assert `UpcomingChecks` renders "Data unavailable," not "All clients up to date."
- **C5 — Section-level freshness.** Each section shows "updated 2m ago"; > threshold = amber "stale" dot. Unifies the refresh anarchy (30s/manual/none).
- **C6 — Mobile accordion + below-fold lazy-mount.** Don't just 1-col stack; accordion the six sections, `IntersectionObserver`-mount below-fold widgets to cut TTI.

---

## Where the Blueprint Is Weakest (HY3 verdict)
1. **"Unified" alert UX** is partially unified — ship A1/A3 or admit it's a family of patterns.
2. **SwanGlobe M1** is asserted, not specified — B1/B2 prevent a license violation and a mobile bandwidth hit.
3. **No systemic widget error/loading architecture** — S5 micro-fixes will rot; C1/C2 are foundational, not optional.
4. **Widget-count growth unmanaged** — 31 widgets need C3 compression or the overview becomes noise (ironic, given the P0 is "kill noise").

*Strong points to keep: adopting the dormant `AdminNotification` model (no fourth system), retiring 14 dead files, bounded alert windows, keeping SVG as fallback, keyboard-focusable city list. Those are correct.*

— HY3, ready for Kimi K3 / Opus 5 panel merge.
