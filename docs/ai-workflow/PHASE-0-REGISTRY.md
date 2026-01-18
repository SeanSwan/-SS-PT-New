# Phase 0 Design Review Registry

**Purpose:** Central index tracking all Phase 0 design reviews across the project
**Rule:** Keep this file lightweight - details live in individual review files

---

## Active Reviews (In Progress)

| Feature | File | Status | Approvals | Started | Owner |
|---------|------|--------|-----------|---------|-------|
| **Dashboard Architecture Review** | [reviews/dashboard-architecture-review.md](reviews/dashboard-architecture-review.md) | PENDING (0/5) | | 2025-11-08 | Claude Code |
| **Universal Schedule Architecture** | [reviews/universal-schedule-architecture.md](reviews/universal-schedule-architecture.md) | PENDING (0/5) | | 2026-01-17 | AI Village |
| **Homepage Refactor v2.0 (Option C+)** | [HOMEPAGE-REFACTOR-FINAL-PLAN.md](HOMEPAGE-REFACTOR-FINAL-PLAN.md) | APPROVED (5/7) | Roo Code APPROVED, ChatGPT-5 APPROVED, Gemini APPROVED, Claude Code APPROVED, User APPROVED | 2025-10-31 | Claude Code |
| **Homepage Hero Enhancement** | [reviews/homepage-hero-enhancement.md](reviews/homepage-hero-enhancement.md) | PENDING (3/5) | Claude Code APPROVED, Roo Code APPROVED, ChatGPT-5 APPROVED | 2025-10-28 | Product Team |

**Total Active:** 4

---

## Consensus Reached (Ready for Implementation)

| Feature | File | Consensus Date | Implementation Status |
|---------|------|----------------|----------------------|
| **React Error #306 Fix** | [reviews/react-error-306-fix.md](reviews/react-error-306-fix.md) | 2025-10-30 | IMPLEMENTED (hotfix) |

**Total Ready:** 1

---

## Blocked Reviews

| Feature | File | Blocker | Raised By | Date |
|---------|------|---------|-----------|------|
| _(None)_ | - | - | - | - |

**Total Blocked:** 0

---

## Completed and Implemented

| Feature | File | Completed | Deployed | Archive |
|---------|------|-----------|----------|---------|
| _(Example: Admin Dashboard Enhancement)_ | [archive/completed-2025-10.md#admin-dashboard](archive/completed-2025-10.md#admin-dashboard) | 2025-10-27 | 2025-10-27 | YES |

**Total Completed:** 0 (starting fresh with new system)

---

## Quick Stats

- **Active Reviews:** 4
- **Awaiting Consensus:** 4
- **Ready for Implementation:** 1
- **Blocked:** 0
- **Completed (All Time):** 0
- **Average Time to Consensus:** TBD
- **Average Issues per Review:** TBD

---

## How to Use This Registry

### Starting a New Phase 0 Review

1. Copy `templates/PHASE-0-REVIEW-TEMPLATE.md`
2. Save to `reviews/[feature-name].md`
3. Add entry to "Active Reviews" table above
4. Post design artifacts in the review file
5. Share link with all 5 AIs for review

### Updating Status

When AIs approve:
- Update "Approvals" column with APPROVED
- When 5/5 approve, move to "Consensus Reached" section
- Link to archive when implemented

### Archiving

When feature is deployed:
- Move review to `archive/completed-YYYY-MM.md`
- Update "Completed and Implemented" table
- Keep link for historical reference

---

## Review File Locations

- **Active reviews:** `docs/ai-workflow/reviews/[feature-name].md`
- **Templates:** `docs/ai-workflow/templates/`
- **Archives:** `docs/ai-workflow/archive/completed-YYYY-MM.md`
- **This registry:** `docs/ai-workflow/PHASE-0-REGISTRY.md`

---

**Last Updated:** 2026-01-17
**Next Review:** Universal Schedule Architecture (awaiting 5 AI reviews)
