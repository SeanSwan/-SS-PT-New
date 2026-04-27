# Workflow Paths — Fast / Standard / Deploy

> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: choosing the per-change runbook (Fast / Standard / Deploy) — i.e. how to execute a slice end to end.

> **Disambiguation note.** This document defines the three workflow execution paths (Fast / Standard / Deploy); for the review/verification layers each change must pass through (deterministic tooling, AI cross-review, Village escalation), see `QA-PIPELINE.md`. The two are orthogonal: a single change picks one workflow path AND independently passes through the QA layers its scope requires. Tier-A / Tier-B / Tier-C terminology now belongs exclusively to QA-PIPELINE.md; this doc uses Fast / Standard / Deploy only.

---

## Workflow Paths (MANDATORY)

Choose the appropriate workflow path based on change scope. This is "how I run this change end to end" — separate from "what review layers it must pass."

### Fast Path (single-component changes)
`Code → Playwright Screenshot QA → Ship`
- For: Bug fixes, style tweaks, single file changes
- Skip: AI Village, Gemini review, full blueprint

### Standard Path (feature work)
`Code → Gemini CTO Review → Fix Findings → Playwright QA → Ship`
- For: New features, multi-file changes, new pages
- Run: `node scripts/consult-gemini.mjs --review --file path/to/component.tsx`

### Deploy Path (production pushes)
`Full 11-Brain AI Village → Fix All Findings → Playwright QA → Deploy`
- For: Pushing to main, major refactors, >100 lines changed
- Run: `node scripts/validation-orchestrator.mjs --staged`
- **MANDATORY** before merging PRs

### Path Selection Guide
| Change Type | Path | Time |
|---|---|---|
| Fix a color / font / spacing | Fast | 5 min |
| Add a new card component | Fast | 15 min |
| Build a new dashboard page | Standard | 1-2 hours |
| Rebuild trainer/client dashboards | Standard | 2-4 hours |
| Push to production | Deploy | 30 min validation |
| Major architecture change | Deploy | Full review |

---

## Relationship to QA-PIPELINE.md

The two docs answer different questions:

| Question | Doc |
|---|---|
| How do I run this change end to end? | **WORKFLOW-PATHS.md** (this doc) |
| What review and verification layers must this change pass through? | **QA-PIPELINE.md** |

A Fast-Path change still passes through Tier-A QA (deterministic tooling). A Deploy-Path change passes through Tier-A + Tier-B + (when triggered) Tier-C. Path and QA tier are independent axes.
