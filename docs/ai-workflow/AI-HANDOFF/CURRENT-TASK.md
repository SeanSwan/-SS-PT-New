# CURRENT TASK - SINGLE SOURCE OF TRUTH

**Last Updated:** 2026-02-15
**Updated By:** Implementer (last: Claude Code / Opus 4.6)

---

## CURRENT VISION SNAPSHOT (2026-02-15)

### Active Product Priorities
1. **Schedule truthfulness and usability**
   - KPI counts must match filter semantics and user expectations.
   - "Available" must represent upcoming open slots (not stale past slots).
   - Drill-down must be readable, high-contrast, and visibly scrollable when data is large.
2. **Auth recovery reliability**
   - Forgot/reset password flow is production priority.
   - SendGrid delivery observability and suppression hygiene are required.
3. **Quality bar**
   - Accessibility, contrast, and mobile touch targets are required deliverables.
   - No regressions in auth, sessions, checkout, or RBAC.

### Multi-AI Review Quorum (Current)
- Minimum 3 AIs per high-impact change:
  1. Implementer
  2. Reviewer A (security/correctness)
  3. Reviewer B (UX/data semantics)
- Optional 4th AI for tie-breaks or high-risk disagreements.

### Handoff Rules (Operational)
- Start every cycle by reading:
  1. `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md` (this file)
  2. `docs/ai-workflow/AI-HANDOFF/VISION-SYNC-2026-02-15.md`
  3. `docs/ai-workflow/AI-HANDOFF/HANDOFF-PROTOCOL.md`
  4. `docs/ai-workflow/SKILLS-INFRASTRUCTURE.md`
- Record evidence for major changes (build, tests, screenshots/logs when relevant).
- Use `verification-before-completion` skill before any completion claim.
- Use `requesting-code-review` skill before merge to main.
- Do not merge unresolved high-severity findings.

### Skills Infrastructure (2026-02-15)
10 AI agent skills installed in `.agents/skills/`. Key skills:
- **Process:** `verification-before-completion`, `systematic-debugging`, `requesting-code-review`, `test-driven-development`
- **Testing/QA:** `webapp-testing`, `web-design-guidelines`, `audit-website`
- **Browser/Design:** `agent-browser`, `frontend-design`, `ui-ux-pro-max`
- **Full registry:** `docs/ai-workflow/SKILLS-INFRASTRUCTURE.md`
- **Maintenance:** `npx skills check` | `npx skills update`

### Locked Files (Active as of 2026-02-15)
- _None currently tracked in this snapshot._

---

> Legacy backlog (Phases 0-5, old locked files, completed-today logs) has been
> moved to `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK-ARCHIVE.md` for reference.
