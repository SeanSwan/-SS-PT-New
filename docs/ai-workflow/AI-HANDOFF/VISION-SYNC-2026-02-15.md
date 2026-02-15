# Vision Sync - 2026-02-15

**Purpose:** Current-state alignment for all AIs before implementation or review.
**Scope:** Overrides stale assumptions in older handoff/status docs.
**Status:** Active

---

## Product Vision (Current)

1. **Data users can trust**
   - Metrics must map cleanly to user-visible behavior.
   - Schedule counts and drill-down rows must match.
   - Labels and definitions must be explicit (no ambiguous KPI semantics).

2. **Reliable account recovery**
   - Forgot-password/reset-password must be production-safe and observable.
   - Email delivery issues must be diagnosable end-to-end (provider activity + app logs + suppression state).

3. **Readable, usable Galaxy-Swan UI**
   - Keep brand direction, improve contrast/readability.
   - Enforce keyboard support and touch-target minimums.
   - Mobile behavior must be intentional, not accidental.

4. **No fragile production dependencies**
   - MCP integrations must not be required for core production paths.
   - Fallback behavior must be explicit and testable.

---

## Active Workstreams

### A) Schedule Overview Integrity
- KPI cards must be interactive and defensible.
- "Available" should represent upcoming open slots.
- Drill-down panel must support larger data sets (scrolling/pagination/load-more).
- Contrast and hierarchy should make values understandable at a glance.

### B) Auth Recovery + Deliverability
- Reset flow is implemented; reliability and monitoring remain critical.
- Provider-level statuses (processed/deferred/dropped/bounced) must be interpreted in triage notes.
- Suppression/blocklist checks are mandatory when requests increase but inbox delivery fails.

---

## Multi-AI Collaboration Model (Now)

### Minimum quorum
1. Implementer AI
2. Reviewer A (correctness/security)
3. Reviewer B (UX/data semantics)

### Optional quorum expansion
4. Tie-break reviewer (use when findings conflict or risk is high)

### Merge gate
- No merge on unresolved high-severity findings.
- Each reviewer must provide file-level evidence for critical claims.

---

## Required Evidence Per Change

1. Build/test output summary
2. Changed files list
3. Behavior-level verification notes
4. If UI-related: before/after screenshots (desktop + mobile)
5. If auth/email-related: app logs + provider event interpretation

---

## Handoff Checklist (Short Form)

- Read `CURRENT-TASK.md`, then this file, then `HANDOFF-PROTOCOL.md`.
- Read `docs/ai-workflow/SKILLS-INFRASTRUCTURE.md` to know which skills apply to your role.
- State assumptions explicitly.
- Keep scope tight; call out out-of-scope debt separately.
- Update docs when priority shifts, not just code.
- Run `verification-before-completion` before claiming any task is done.
- Run `requesting-code-review` before merge to main.

---

## Canonical References

**Precedence (highest to lowest):**
1. `CURRENT-TASK.md` — operational snapshot, overrides all others
2. This file (`VISION-SYNC-2026-02-15.md`) — authoritative delta
3. `HANDOFF-PROTOCOL.md` — workflow rules and guardrails
4. `MASTER-HANDBOOK.md` — top-level index

**Document list:**
- Task queue: `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md`
- Protocol: `docs/ai-workflow/AI-HANDOFF/HANDOFF-PROTOCOL.md`
- Skills infrastructure: `docs/ai-workflow/SKILLS-INFRASTRUCTURE.md`
- Master index: `docs/MASTER-HANDBOOK.md`
