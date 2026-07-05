# Hostile Review Slam — Registry Index

> The standing list of everything awaiting a hostile review. Run a **Slam**: hostile-review
> every `OPEN` / `REVISE` entry below until zero issues remain. Protocol + rules:
> [`README.md`](./README.md). Add an entry when you ship a substantial slice — **link** the
> target, don't copy it.

**Status legend:** `OPEN` (needs review) · `IN-REVIEW` (a pass is underway) ·
`REVISE` (issues found, being fixed) · `CLEARED` (a hostile pass found zero issues) ·
`ARCHIVED` (cleared + merged; moved to Archive).

## Summary
| ID | Target | Status | Reviews |
|----|--------|--------|---------|
| HR-004 | Hostile Review Slam Registry (this PR) | OPEN | 0 |
| HR-003 | PR #20 — companion pet security hardening | OPEN | 0 |
| HR-002 | PR #19 — dormant `gamificationRoutes.mjs` deletion + Rule-48 audit | OPEN | 0 |
| HR-001 | PR #15 — Companion V2 cleanup + branch refresh | OPEN | 0 |

---

### HR-001 — PR #15: Companion V2 cleanup + branch refresh
- **Status:** OPEN
- **Link:** https://github.com/SeanSwan/-SS-PT-New/pull/15 (branch `feature/companion-v2-goal-loop-2026-07-01`)
- **Added:** 2026-07-05
- **Why review:** removed the non-functional companion response-injection layer that was wired
  to the (unmounted) `gamificationRoutes.mjs`; refreshed the branch against `main`. Touches the
  points-award path. Confirm the per-user pet-state bridge still fires on the live v1 route and
  no dead wiring remains.
- **Review passes:**
  - _(none yet — needs a hostile pass)_

### HR-002 — PR #19: dormant `gamificationRoutes.mjs` deletion + Rule-48 audit
- **Status:** OPEN
- **Link:** https://github.com/SeanSwan/-SS-PT-New/pull/19 (branch `claude/remove-dormant-gamification-routes-20260705`)
- **Added:** 2026-07-05
- **Why review:** deletes a fully-unmounted legacy route file that carried a latent IDOR pattern,
  and rewrites its classification lock test. Confirm zero runtime consumers, no live behavior
  change, and that the rewritten test preserves the canonical-surface guard intent.
- **Review passes:**
  - _(none yet — needs a hostile pass)_

### HR-003 — PR #20: companion pet security hardening
- **Status:** OPEN
- **Link:** https://github.com/SeanSwan/-SS-PT-New/pull/20 (branch `claude/harden-companion-pet-input-20260705`)
- **Added:** 2026-07-05
- **Why review:** adds `sanitizePetName` at the `CompanionPetService` boundary (control/XSS-char
  stripping) + rate limits on the pet mutation routes. Attack the sanitizer for bypasses; confirm
  limiter ordering vs auth, the `/pet/activity` shared-bucket decision, and no route-contract
  regressions.
- **Review passes:**
  - _(none yet — needs a hostile pass)_

### HR-004 — Hostile Review Slam Registry (this PR)
- **Status:** OPEN
- **Link:** https://github.com/SeanSwan/-SS-PT-New/pull/21 (branch `claude/hostile-review-slam-protocol-20260705`) — `docs/ai-workflow/hostile-reviews/` (README + INDEX) + the `CLAUDE.md` / `AGENTS.md` `## AI Coordination` pointer.
- **Added:** 2026-07-05
- **Why review:** new cross-agent protocol. Confirm the pointer edits to `CLAUDE.md`/`AGENTS.md`
  are additive and don't collide with a rule/section; confirm the protocol is clear enough for any
  AI to run a Slam unattended; confirm it doesn't duplicate or contradict the coordination
  review-queue.
- **Review passes:**
  - _(none yet — needs a hostile pass)_

---

## Archive
_(Cleared + merged entries move here. None yet.)_
