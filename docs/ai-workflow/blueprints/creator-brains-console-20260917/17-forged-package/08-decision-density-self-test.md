# PART C — Decision-Density Self-Test

> Every remaining builder choice: decided-in-package, or delegated-with-bounds.

---

| Remaining builder choice | Disposition |
|---|---|
| Where the console lives | **Owner decision:** recommend `packages/creator-brains-console`; no move until D7 resolved. |
| Whether to modify engine walker/locking | **Decided:** forbidden in console slices; failing gates return to engine owner. |
| How to avoid add blocking | **Decided:** worker resolves only; parent engine call commits against fresh registry. |
| Add timeout, queue, retries | **Decided:** 185s resolver ceiling, one pending add, no queue or automatic retry. |
| Existing creator consent/counts | **Decided:** preserve consent; measured counts or null. |
| Brain identifier | **Decided:** channel ID; compatibility property remains named `slug`. |
| Claims and generation consistency | **Decided:** four allowlisted files from one pinned generation. |
| Markdown renderer | **Decided:** escaped plain text in v1. |
| Error/transport semantics | **Decided:** confirmed refusal versus uncertain outcome; no fake rollback. |
| Cross-origin writes | **Decided:** Origin, JSON, custom header, no CORS permission. |
| Health freshness | **Decided:** worker refresh, 60s TTL, explicit history/unknown provenance. |
| Run ID before engine starts | **Decided:** request ID plus null run ID; correlate later. |
| External runner concurrency | **Gate:** real two-process test; no invented console-only guarantee. |
| Repair meaning | **Decided:** reconcile/build/export and projected engine counts. |
| Backup scope/destination | **Owner decision:** absolute transcript-export prohibition currently blocks implementation. |
| Cancel behavior | **Decided:** cancel before submit only; closing after dispatch does not cancel work. |
| Poll cadence/cancellation | **Decided:** 2s active, 5s prolonged/idle, 15s hidden; abort reads and discard late responses. |
| Scene loading/motion | **Decided:** explicit eligibility gate, late-dolly deadline, numeric drift, DPR and teardown bounds. |
| Layout/node geometry | **Bounded delegation:** deterministic channel-ID-sorted layout; no occluded required actions; size/coverage encode real counts; null remains unknown. |
| Minor spacing and component extraction | **Bounded delegation:** existing spacing tokens, drawn hierarchy, ≤300 lines/file, viewport and focus gates. |
| Three.js package version | **Bounded delegation:** pin the selected version in the web lockfile; prove bundle/browser budgets; no engine dependency installation. |
| Review transport | **Decided:** preserve current task authority and receipts; no paid fallback or retry inferred from this package. |
| Snapshot and transfer | **Decided:** include untracked owned source in hash manifest; S7 requires explicit go and receiver evidence. |
| Unknown integration behavior discovered during implementation | **Bounded:** stop the affected slice, return a concrete failing case and contract amendment; do not improvise silently. |

**Result:** material choices are decided, bounded, or explicitly blocked. The package is emitted; implementation readiness and archive completion remain unestablished because the required evidence and writes were not available in this read-only pass.
