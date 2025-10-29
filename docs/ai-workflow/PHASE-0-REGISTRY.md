# Phase 0 Design Review Registry

**Purpose:** Central index tracking all Phase 0 design reviews across the project
**Rule:** Keep this file lightweight - details live in individual review files

---

## 🟡 Active Reviews (In Progress)

| Feature | File | Status | Approvals | Started | Owner |
|---------|------|--------|-----------|---------|-------|
| **Homepage Hero Enhancement** | [reviews/homepage-hero-enhancement.md](reviews/homepage-hero-enhancement.md) | 🟡 PENDING (3/5) | Claude Code ✅, Roo Code ✅, ChatGPT-5 ✅ | 2025-10-28 | Product Team |
| **Test Feature Example** | [reviews/test-feature-example.md](reviews/test-feature-example.md) | 🟡 PENDING (0/5) | None yet | 2025-10-28 | Test User |

**Total Active:** 2

---

## 🟢 Consensus Reached (Ready for Implementation)

| Feature | File | Consensus Date | Implementation Status |
|---------|------|----------------|----------------------|
| _(None yet - first feature in progress)_ | - | - | - |

**Total Ready:** 0

---

## 🔴 Blocked Reviews

| Feature | File | Blocker | Raised By | Date |
|---------|------|---------|-----------|------|
| _(None)_ | - | - | - | - |

**Total Blocked:** 0

---

## ✅ Completed & Implemented

| Feature | File | Completed | Deployed | Archive |
|---------|------|-----------|----------|---------|
| _(Example: Admin Dashboard Enhancement)_ | [archive/completed-2025-10.md#admin-dashboard](archive/completed-2025-10.md#admin-dashboard) | 2025-10-27 | 2025-10-27 | ✅ |

**Total Completed:** 0 (starting fresh with new system)

---

## 📊 Quick Stats

- **Active Reviews:** 1
- **Awaiting Consensus:** 1
- **Ready for Implementation:** 0
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
- Update "Approvals" column with ✅
- When 5/5 approve, move to "Consensus Reached" section
- Link to archive when implemented

### Archiving

When feature is deployed:
- Move review to `archive/completed-YYYY-MM.md`
- Update "Completed & Implemented" table
- Keep link for historical reference

---

## Review File Locations

- **Active reviews:** `docs/ai-workflow/reviews/[feature-name].md`
- **Templates:** `docs/ai-workflow/templates/`
- **Archives:** `docs/ai-workflow/archive/completed-YYYY-MM.md`
- **This registry:** `docs/ai-workflow/PHASE-0-REGISTRY.md`

---

**Last Updated:** 2025-10-28
**Next Review:** Homepage Hero Enhancement (awaiting Claude Desktop + Gemini reviews)
