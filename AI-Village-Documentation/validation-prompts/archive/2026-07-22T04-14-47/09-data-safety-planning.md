# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-sonnet-4.6 | **Duration:** 94.9s
> **Files:** docs/ai-workflow/AI-HANDOFF/SWANGUARD-REFACTOR-AND-SITE-REDESIGN-MASTER-PLAN-2026-07-21.md
> **Generated:** 7/21/2026, 9:14:47 PM

---

# SwanGuard Refactor + SwanStudios Redesign — Data Safety Audit

**Auditor:** Production Data Safety Review
**Date:** 2026-07-21
**Scope:** SWANGUARD-REFACTOR-AND-SITE-REDESIGN-MASTER-PLAN-2026-07-21.md
**Platform:** sswanstudios.com (live production, real paying customers)

---

## Executive Summary

This plan is primarily a **UI/UX refactor and visual redesign** — it does not explicitly propose new database schemas, new API endpoints, or new data models. However, that framing itself is the primary risk: **the plan contains multiple implicit write paths, new data structures, and storage operations that are not acknowledged as backend changes.** Several findings require resolution before any slice ships to production.

---

## Finding 1 — Action Registry Collapse: Implicit Schema/State Drift

**Severity: CRITICAL**

### What the plan says
> "10 registries → 1" (Workstream 1, action diet ruling). S6/Slice 8: "collapse registries, delete dead actions, re-verify test suites."

### Derived risk
The `actionRegistry*.ts` files catalog **152 `data-action-id` values**. If any of these IDs are persisted to the database — as audit log entries, permission grants, receipt records, ledger rows, or approval workflows — then deleting or renaming them in the registry **orphans existing production rows** that reference those IDs as foreign keys or string identifiers.

The plan explicitly states the trust engine includes **"permission/ledger/receipts spine"** and **"approvals, receipts, fail-closed connectors."** These are almost certainly stored rows keyed to action identifiers.

### Specific risk scenario
```
-- Hypothetical existing production row
INSERT INTO action_receipts (action_id, actor_id, timestamp, outcome)
VALUES ('influence:evidence_intake:create', 42, NOW(), 'approved');

-- After registry collapse, this action_id string no longer exists
-- in any registry. The row is now an orphan with no resolvable meaning.
-- Kill-switch logic that queries receipts by action_id silently misses it.
```

### Recommendations
1. **Before Slice 6/8:** Run a full audit query against every table that stores action identifiers as strings. Produce a mapping of `old_action_id → new_action_id` or `old_action_id → DEPRECATED`.
2. **Do not delete registry entries in the same slice that renames them.** Two-pass: rename first (slice N), delete after confirming zero production rows reference the old ID (slice N+1). The plan's own "two-pass deletion" guardrail applies here but is not explicitly scoped to the registry collapse.
3. **Add a database migration** that either: (a) adds a `legacy_action_id` column to receipt/ledger tables for backward reference, or (b) runs a backfill UPDATE before the registry entry is removed.
4. **Grep is insufficient** — grep finds code references, not database row values. Require a `SELECT COUNT(*) FROM action_receipts WHERE action_id = '<old_id>'` query for every deleted action ID before deletion is permitted.

---

## Finding 2 — "No Backend Changes" Claim vs. Actual Write Paths

**Severity: CRITICAL**

### What the plan says
The plan describes itself as a refactor/redesign and does not explicitly claim "no backend changes." However, **it also does not enumerate any backend changes**, which creates schema-drift risk.

### Derived implicit write paths requiring backend verification

| Plan Feature | Implicit Write Path | Table/Column at Risk |
|---|---|---|
| Auto-load on mount (replacing Load X buttons) | New API calls on every page load | Rate limits, N+1 queries, missing indexes |
| ⌘K palette (new interaction model) | Action dispatch → receipt/ledger write | `action_receipts`, `audit_log` — same rows, new trigger path |
| Kill switch ≤2 interactions SLA | Kill switch state must be readable in ≤1 DB round-trip | `kill_switches` table — missing index on `owner_id`? |
| Morning Brief signature moment | Brief content must be fetched/cached | New `daily_brief` cache table, or unbounded query on mount |
| Owner Console → Settings dissolution | Permission grant/revoke UI moves | `permission_grants` FK to `owner_console_id`? That column may not exist after IA collapse |
| Feature flags for iceboxed modules | Creator Board / Marketplace / Impact behind flags | `feature_flags` table — does it exist? Who can write it? |

### Recommendations
1. **Require an explicit backend change inventory** before Slice 2 (IA collapse). For each item in the table above, confirm: does the column/table exist, does it have the right index, and does the new UI path hit the same endpoint or a new one?
2. **The kill-switch SLA is a data-safety requirement, not just a UX requirement.** A kill switch that takes ≤2 UI interactions but requires 3 sequential DB queries (no index) can fail under load. Verify `EXPLAIN ANALYZE` on the kill-switch read path before S4/Slice 4.
3. **Flag the Owner Console dissolution explicitly** as a schema-impact event. If `owner_console_id` is a FK column anywhere, dissolving the Owner Console into Settings without a migration will break referential integrity.

---

## Finding 3 — Photographic Asset Storage: No Cleanup Strategy Defined

**Severity: HIGH**

### What the plan says
> "All assets on R2; scroll-video hero uses the canvas frame-scrub technique already researched." (Workstream 2, Asset strategy)
> Sources: Seedance 2.0 cinematic loops, licensed 4K nature photography, real Sean/client training photography.

### Derived risks

**3a — Unbounded R2 growth**
The plan describes multiple asset categories (hero loops, ambient b-roll, stills, editorial athlete photography) with no stated size limits, no asset versioning policy, and no cleanup trigger when a page section is removed or a design phase is superseded. P0 concept comps alone may generate 3–5 hero variants × multiple image formats. If P0 comps are rejected (as vNext was), those assets remain on R2 indefinitely.

**3b — Client training photography — PII/privacy**
> "real Sean/client training photography (editorial grade) for authenticity surfaces"

Client photographs are **personally identifiable information**. The plan does not state:
- Whether clients have provided written consent for use on a public-facing commercial website
- How long these photographs are retained
- What happens to the R2 object when a client relationship ends or a client requests deletion (GDPR/CCPA right to erasure)
- Whether the R2 bucket has public-read ACL (which would make client images permanently crawlable)

**3c — No parent-record deletion cascade**
If a `StorePage` or `HeroSection` record is deleted from the CMS/database, the R2 objects it references are not automatically deleted. Over time this creates orphaned objects with no cleanup path.

### Recommendations
1. **Immediately before P1:** Define an R2 lifecycle policy — maximum object age for draft/rejected assets (suggest 30 days), and a tagging scheme (`status: draft | approved | archived`) that lifecycle rules can act on.
2. **Client photography requires explicit written consent** before any image is uploaded to a public R2 bucket. Add a consent-capture step to the asset intake workflow. This is not optional — it is a legal requirement in most jurisdictions.
3. **Implement a deletion cascade:** when a `HeroSection` or `PageSection` record is soft-deleted or hard-deleted, enqueue an R2 object deletion job. Do not rely on manual cleanup.
4. **Audit R2 bucket ACL** before P1 ships. Client photographs must not be in a public-read bucket without explicit consent documentation attached to each object's metadata.
5. **Size budget per page:** Define a maximum total asset weight per page (suggest hero loop ≤ 8MB compressed, stills ≤ 500KB each) to prevent unbounded storage growth and protect mobile users.

---

## Finding 4 — Morning Brief: Sensitive Data Retention Undefined

**Severity: HIGH**

### What the plan says
> "intelligence briefs (daily brief, readiness, civic/official sources)" — preserved as the heart of the product.
> "photographic Morning Brief as the signature moment" — a new visual surface for existing brief data.

### Derived risks
The Morning Brief aggregates **civic intelligence, comment intelligence, influence intelligence** — this is behavioral and potentially sensitive data about family members and external actors. The plan does not address:

- **Retention period:** How long are brief snapshots stored? If each daily brief is persisted as a row/JSONB blob, a family using the product for 3 years accumulates 1,095+ brief records with potentially sensitive civic/behavioral content.
- **Who can read historical briefs:** If the new IA collapse moves the Owner Console into Settings, does the permission model for reading historical briefs change? Can non-owner family members now access briefs they previously could not?
- **Brief content as audit evidence:** If briefs contain "influence evidence" (the plan mentions `influence:evidence_intake:create`), these records may have legal/evidentiary implications. Retention and deletion policy matters.

### Recommendations
1. **Define a brief retention policy** before the Morning Brief signature moment ships (Slice 5). Suggest: rolling 90-day window with explicit owner opt-in for longer retention, hard delete (not soft delete) on expiry.
2. **Verify permission model continuity** through the IA collapse. The Owner Console dissolution (Finding 2) must not inadvertently broaden read access to brief history for non-owner roles.
3. **Add a `brief_retention_days` column** to the owner/family settings table, defaulting to 90, with a scheduled job that hard-deletes expired brief rows. Document this in the privacy policy before shipping.

---

## Finding 5 — Soft-Delete Integrity Through IA Collapse

**Severity: HIGH**

### What the plan says
> "14 modules → 5 spaces" (IA collapse, Slice 2). Modules being iceboxed: Creator Board, Marketplace, Impact (behind feature flags). Owner Console dissolves into Settings.

### Derived risk
If any of the 14 current modules have associated database records (e.g., `marketplace_listings`, `impact_records`, `creator_board_items`) and those modules are soft-deleted or feature-flagged off, the read paths for those records must be audited.

**Specific concern:** The plan's two-pass deletion guardrail applies to UI components, but it does not explicitly cover the **database read paths** that serve those components. If `marketplace_listings` has a `deleted_at` column but the new consolidated API endpoint for the Family space does a `SELECT *` without a `WHERE deleted_at IS NULL` clause, soft-deleted marketplace items will resurface in the Family view.

### Recommendations
1. **For every module being iceboxed or dissolved**, enumerate its database tables and verify that every ORM query on those tables includes the soft-delete filter. Do not assume Sequelize's `paranoid: true` is set on all models — verify per-model.
2. **Add an integration test** for each iceboxed module that confirms its records do not appear in the consolidated space's API response after the module is flagged off.
3. **The Owner Console dissolution is the highest-risk case:** permission grants, kill switch states, and approval records must remain fully readable and writable through the new Settings path. Verify no query was scoped to `module = 'owner_console'` as a filter.

---

## Finding 6 — Concurrent Kill-Switch Mutation

**Severity: HIGH**

### What the plan says
> "Critical Action SLA: kill switch/approve/revoke ≤2 interactions from anywhere, scripted task test per slice."
> "owner gates, kill switches, approvals, receipts, fail-closed connectors" — preserved as the trust spine.

### Derived risk
Kill switches are **fail-closed safety controls**. If two owner-role users (or the same user on two devices) attempt to toggle a kill switch simultaneously, a race condition can produce an inconsistent state:

```sql
-- Session A reads: kill_switch.state = 'active'
-- Session B reads: kill_switch.state = 'active'
-- Session A writes: state = 'disabled'  (intent: disable)
-- Session B writes: state = 'active'    (intent: re-enable)
-- Result: last-write-wins, no audit of the conflict
```

The refactor's new ⌘K palette and the ≤2-interaction SLA **increase the surface area** for concurrent kill-switch mutations by making the action faster and more accessible from more surfaces.

### Recommendations
1. **Add optimistic locking** to the kill switch write path: include a `version` or `updated_at` column in the UPDATE WHERE clause. If the row has changed since the client read it, return HTTP 409 and force a re-read.
2. **Alternatively, use a database-level advisory lock** (`SELECT FOR UPDATE`) on the kill switch row during the toggle transaction.
3. **Every kill switch mutation must write an audit receipt** atomically in the same transaction. If the receipt write fails, the state change must roll back.
4. **The scripted task test for the Critical Action SLA must include a concurrent-mutation scenario** — two simultaneous toggle requests — as a required gate before each slice ships.

---

## Finding 7 — Auto-Load on Mount: Unbounded Query Fan-Out

**Severity: HIGH**

### What the plan says
> "auto-load on mount + refresh affordance" — replacing all "Load X" buttons.
> Slice 1 / The Purge: auto-load everything.

### Derived risk
Currently, users manually trigger each of the 14+ module loads. After Slice 1, **every module loads simultaneously on mount.** If each module makes 1–3 API calls, a single page load now generates 14–42 simultaneous backend requests per user session. At production scale with multiple concurrent users, this is a **query fan-out / thundering herd** problem.

Additionally, if any of these auto-loaded queries hit tables without proper indexes (e.g., `civic_intel` filtered by `family_id` without an index on `family_id`), each page load triggers a full table scan.

### Recommendations
1. **Do not ship Slice 1 auto-load without a load-test** against the production database. Simulate 50 concurrent users each triggering 14+ simultaneous queries.
2. **Implement priority-tiered loading:** Today/brief loads immediately; Intelligence and Trust spaces load on tab-focus or after a 500ms defer; Owner/Settings loads on explicit navigation only.
3. **Add per-endpoint rate limits** for the auto-loaded endpoints (see Finding 8).
4. **Run `EXPLAIN ANALYZE`** on every query that was previously behind a manual "Load X" button. These queries were never profiled under concurrent load because users triggered them manually and sequentially.
5. **Add a `stale-while-revalidate` cache layer** (Redis or in-memory) for intelligence briefs and civic data that does not change more than once per hour. Do not hit the database on every mount.

---

## Finding 8 — Rate Limiting: New Endpoints and Auto-Load Paths

**Severity: HIGH**

### What the plan says
The plan introduces: auto-load on mount (Slice 1), ⌘K palette action dispatch (Slice 3), Morning Brief fetch (Slice 5), and the SwanStudios photographic site with scroll-video frame-scrub (Workstream 2).

### Derived risks

| New Path | Rate Limit Risk |
|---|---|
| Auto-load on mount (14+ endpoints) | No per-user burst limit → DoS via rapid page refresh |
| ⌘K palette | Fuzzy-search on every keystroke → unbounded query rate |
| Morning Brief fetch | If not cached, DB hit on every app open |
| Scroll-video frame-scrub | R2 GET requests on every scroll event → R2 egress cost explosion |
| P0 concept comp delivery | Large image assets served without CDN cache headers |

### Recommendations
1. **⌘K palette search must be debounced** (minimum 300ms) and rate-limited per user (suggest 60 requests/minute). If it queries the database, add a full-text index or use a pre-built search index.
2. **Scroll-video frame-scrub must use pre-extracted frames** served from R2 with aggressive CDN caching (`Cache-Control: public, max-age=31536000, immutable`). Never scrub directly against a video file on scroll events.
3. **Add per-user rate limits** to every auto-loaded endpoint: suggest 10 requests/minute per endpoint per user for intelligence/civic data endpoints.
4. **Morning Brief must be cached** at the application layer with a TTL matching the brief generation frequency. A Redis key per `(family_id, date)` is the minimum viable cache.

---

## Finding 

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
