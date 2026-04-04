# 3-Tier Development Workflow
> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: choosing dev workflow tier, fast/standard/deploy paths

---

## 3-Tier Development Workflow (MANDATORY)

Choose the appropriate workflow tier based on change scope:

### Tier 1: Fast Path (single-component changes)
`Code → Playwright Screenshot QA → Ship`
- For: Bug fixes, style tweaks, single file changes
- Skip: AI Village, Gemini review, full blueprint

### Tier 2: Standard Path (feature work)
`Code → Gemini CTO Review → Fix Findings → Playwright QA → Ship`
- For: New features, multi-file changes, new pages
- Run: `node scripts/consult-gemini.mjs --review --file path/to/component.tsx`

### Tier 3: Deploy Path (production pushes)
`Full 11-Brain AI Village → Fix All Findings → Playwright QA → Deploy`
- For: Pushing to main, major refactors, >100 lines changed
- Run: `node scripts/validation-orchestrator.mjs --staged`
- **MANDATORY** before merging PRs

### Tier Selection Guide
| Change Type | Tier | Time |
|---|---|---|
| Fix a color / font / spacing | 1 (Fast) | 5 min |
| Add a new card component | 1 (Fast) | 15 min |
| Build a new dashboard page | 2 (Standard) | 1-2 hours |
| Rebuild trainer/client dashboards | 2 (Standard) | 2-4 hours |
| Push to production | 3 (Deploy) | 30 min validation |
| Major architecture change | 3 (Deploy) | Full review |
