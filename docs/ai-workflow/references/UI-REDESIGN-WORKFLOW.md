# UI/UX REDESIGN WORKFLOW
> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: UI redesign tasks, design constraints, visual QA

---

## UI/UX REDESIGN WORKFLOW (ACTIVE)

### MANDATORY: Read Before Any UI Work
Any AI session that involves frontend UI/UX work MUST read these documents first:

1. **Master Redesign Prompt:** `docs/ai-workflow/SWANSTUDIOS-UI-REDESIGN-MASTER-PROMPT.md`
   - Design philosophy, 5 theme directions, 10-breakpoint matrix
   - Business KPIs with hard fail gates
   - Seed data contract (upsert-by-email pattern)
   - Visual QA protocol with component-level diff thresholds
   - Phased execution plan with DoD/fail gates per phase
   - Release controls (runtime feature flag with localStorage cache)
   - Playwright MCP setup for visual feedback loops

2. **Multi-AI Review Format:** `docs/ai-workflow/AI-REVIEW-TEAM-PROMPT.md`
   - Structured review template for cross-AI feedback
   - Severity table, missing controls checklist, contradiction finder
   - Use when reviewing any design or implementation deliverable

### Redesign Phases
| Phase | Name | Gate |
|-------|------|------|
| 0 | Baseline Capture | Screenshots + Lighthouse for every route |
| 1 | 5 Concept Designs | Owner picks 2 favorites from 5 distinct directions |
| 2 | Design System Extraction | Token file + 6 primitives implemented |
| 3 | Page-by-Page Rollout | Each page behind feature flag, A/B tested |
| 4 | QA + Launch | All KPIs green, no Critical/High regressions |

### Design Constraints
- **Crystalline Swan identity** must be preserved (frozen enchanted forest + luxury vault aesthetic, Ice Wing `#60C0F0` accents, Arctic Cyan `#50A0F0` glows, Midnight Sapphire `#002060` surfaces)
- **Monetization flows are sacred** - checkout, booking, store get component-level diff thresholds (0.5%)
- **No "AI slop"** - Avoid generic gradients, stock patterns, cookie-cutter layouts
- **Runtime feature flag** (`useNewTheme` via `/api/feature-flags`) with localStorage cache + 1.5s timeout
- **Build-time flag** (`VITE_USE_NEW_THEME`) for simpler deploys (requires redeploy to rollback)
- **Concept routes** guarded by `VITE_DESIGN_PLAYGROUND=true` (never shipped to prod)

### Visual QA Tools
- **Playwright MCP** for browser automation and screenshot capture
- **Pixelmatch** or Playwright built-in for screenshot diffing
- **Global threshold:** 0.5% investigate, 2% fail
- **Monetization component threshold:** 0.1% investigate, 0.5% fail
- **Naming convention:** `{page}-{breakpoint}w-{variant}.png` (e.g., `homepage-375w-dark.png`)
