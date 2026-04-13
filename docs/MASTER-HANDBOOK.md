# SwanStudios Master Handbook

**Purpose:** Top-level index for product direction, architecture priorities, and AI workflow governance.
**Last Updated:** 2026-02-15
**Owner:** SwanStudios Core Team (User + Multi-AI Contributors)

---

## Current Vision (Q1 2026)

1. **Trustworthy scheduling data and UX**
   - Schedule metrics must reflect real user intent (for example, "Available" means upcoming open slots, not stale past slots).
   - KPI cards must be actionable and explainable with drill-down evidence.
   - Data tables/panels must feel complete and navigable (scrollable, not clipped).

2. **Secure and reliable account recovery**
   - Forgot-password and reset-password flow must be stable in production.
   - Email dispatch must be observable (provider activity, suppression/block checks, delivery monitoring).
   - Session revocation on reset must remain enforced.

3. **High-signal visual quality**
   - Galaxy-Swan identity is preserved.
   - Contrast/readability is non-negotiable for production UI.
   - Accessibility and touch-target standards are part of completion criteria.

4. **Production-safe architecture**
   - No required MCP dependency in production request paths.
   - Use explicit fallbacks and graceful degradation.

5. **Documentation-led multi-AI execution**
   - Work is coordinated through handoff docs.
   - Decisions are recorded with ownership, evidence, and next actions.

---

## Multi-AI Operating Model (Current)

- **Active collaboration pattern:** 3-AI minimum, 4-AI optional.
- **Required roles per cycle:**
  1. Implementer
  2. Reviewer A (correctness/security)
  3. Reviewer B (UX/data consistency)
  4. Optional tie-break reviewer for disagreement/high-risk changes
- **Decision rule:** no merge on unresolved high-severity findings.

---

## Source of Truth Docs

**Precedence (highest to lowest):**
1. `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md` — operational snapshot
2. `docs/ai-workflow/AI-HANDOFF/VISION-SYNC-2026-02-15.md` — authoritative delta
3. `docs/ai-workflow/AI-HANDOFF/HANDOFF-PROTOCOL.md` — workflow rules
4. This file (`docs/MASTER-HANDBOOK.md`) — top-level index

**Document list:**
- Current execution queue: `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md`
- Collaboration protocol: `docs/ai-workflow/AI-HANDOFF/HANDOFF-PROTOCOL.md`
- 2026-02-15 vision sync (authoritative delta): `docs/ai-workflow/AI-HANDOFF/VISION-SYNC-2026-02-15.md`
- Skills infrastructure: `docs/ai-workflow/SKILLS-INFRASTRUCTURE.md`
- AI status files (operational context): `docs/ai-workflow/AI-HANDOFF/*-STATUS.md`

---

## Skills Infrastructure

Swan visual operating system landed 2026-04-12. Strict model: `swan-design-router` is the only default-exposed design brain; `closeout-evidence-lock` is the default closeout skill. The default-exposed surface in `.claude/skills/` contains 13 skills total:

| Category | Skills |
|----------|--------|
| **Swan orchestration (5)** | `swan-orchestrator`, `canonical-surface-audit`, `repo-hygiene-scan`, `swan-design-router`, `closeout-evidence-lock` |
| **KEEP core process (8)** | `verification-before-completion`, `systematic-debugging`, `test-driven-development`, `webapp-testing`, `agent-browser`, `audit-website`, `full-output-enforcement`, `seedance-swan-video` |

**Reference libraries loaded by `swan-design-router`, not default-steering:** `frontend-design` and `ui-ux-pro-max` — canonical location `.agents/skills/frontend-design/SKILL.md` and `.agents/skills/ui-ux-pro-max/SKILL.md`.

**Quarantined (explicit-invocation-only, relocated to `archive/quarantined-skills/2026-04-12/`):** `minimalist-ui`, `industrial-brutalist-ui`, `high-end-visual-design`, `design-taste-frontend`, `stitch-design-taste`, `redesign-existing-projects`, `web-design-guidelines`, `requesting-code-review` (the latter retired due to missing `superpowers:code-reviewer` dependency; its substantive checklist is preserved in `closeout-evidence-lock`).

Full registry and usage: `docs/ai-workflow/SKILLS-INFRASTRUCTURE.md`
Compact reference: `docs/ai-workflow/references/SKILLS-REFERENCE.md`
Maintenance: `npx skills check` | `npx skills update`

---

## System Handbook Links

- Universal Master Schedule: `docs/systems/UNIVERSAL-MASTER-SCHEDULE-HANDBOOK.md`
- Universal Schedule architecture review: `docs/ai-workflow/reviews/universal-schedule-architecture.md`
- AI handoff workspace: `docs/ai-workflow/AI-HANDOFF/`
