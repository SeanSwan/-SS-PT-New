# CLAUDE.md - SwanStudios Project Intelligence

## Project Overview
SwanStudios (SS-PT) is a production personal training SaaS platform deployed on Render (sswanstudios.com).
- **Stack:** React 18 + TypeScript + styled-components (frontend), Node.js + Express + Sequelize + PostgreSQL (backend)
- **Theme:** Galaxy-Swan (cosmic gradients, glass surfaces, swan motifs)
- **Core Tokens:** Galaxy Core `#0a0a1a`, Swan Cyan `#00FFFF`, Cosmic Purple `#7851A9`

## Build & Run
- **Frontend:** `cd frontend && npm run build` (Vite)
- **Backend:** `cd backend && node server.mjs`
- **Tests (frontend):** `cd frontend && npx vitest run --reporter verbose`
- **Tests (backend):** `cd backend && npm test`
- **Type check:** `cd frontend && npx tsc --noEmit`

## Key Directories
- `frontend/src/components/` - React components (styled-components, NO MUI)
- `backend/routes/` - Express API routes
- `backend/models/` - Sequelize models (PostgreSQL)
- `backend/migrations/` - Database migrations (.cjs files)
- `docs/ai-workflow/` - AI coordination docs, blueprints, handoff protocols

## Code Conventions
- **No Material-UI** - All UI uses styled-components with Galaxy-Swan theme tokens
- **44px minimum touch targets** on all interactive elements (mobile-first)
- **10-breakpoint responsive matrix:** 320px, 375px, 430px, 768px, 1024px, 1280px, 1440px, 1920px, 2560px, 3840px
- **Blueprint-first development** - Architecture docs before code (see `docs/ai-workflow/blueprints/`)
- **Level 5/5 documentation standard** - Embedded architecture diagrams in code headers
- **RBAC enforcement** - Admin/Trainer/Client role isolation on all endpoints

## Git Workflow
- Deploy target: Render auto-deploys from `main` branch
- Commit style: `type(scope): description` (e.g., `fix(schedule): enterprise audit P0 fixes`)
- Always push to trigger Render deploy after commits

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
- **Galaxy-Swan identity** must be preserved (dark cosmic aesthetic, cyan accents)
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

---

## AI Coordination
- This project uses a Multi-AI Swarm (see `.clinerules` for full protocol)
- **Current task tracker:** `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md`
- **Handoff protocol:** `docs/ai-workflow/AI-HANDOFF/HANDOFF-PROTOCOL.md`
- **Vision sync:** `docs/ai-workflow/AI-HANDOFF/VISION-SYNC-2026-02-15.md`
- **Skills infrastructure:** `docs/ai-workflow/SKILLS-INFRASTRUCTURE.md`
- **AI status files:** `docs/ai-workflow/AI-HANDOFF/[AI-NAME]-STATUS.md`
- **Master handbook:** `docs/MASTER-HANDBOOK.md`

## AI Agent Skills (10 installed)
Skills are in `.agents/skills/` (symlinked to `.claude/skills/`). Key process skills:
- `verification-before-completion` — MANDATORY before any "done" or "fixed" claim
- `systematic-debugging` — MANDATORY for any bug investigation (root-cause-first)
- `requesting-code-review` — MANDATORY before merge to main
- `test-driven-development` — write tests before production code
- `webapp-testing` — Playwright-based frontend testing
- `web-design-guidelines` — UI accessibility/contrast audit
- `audit-website` — comprehensive site audit (SEO, perf, security, a11y)
- `agent-browser` — browser automation for visual verification
- `frontend-design` + `ui-ux-pro-max` — design and styling skills
- **Maintenance:** `npx skills check` | `npx skills update` | `npx skills find <keyword>`

## Common Gotchas
- `transform: translateZ(0)` creates CSS stacking contexts - add `position: relative; z-index` to parent if dropdowns are trapped
- Vite env vars (`VITE_*`) are build-time only - not changeable at runtime without redeploy
- Render deploys take 2-5 minutes after push; users may see cached old bundles
- Windows dev environment - use forward slashes in imports, `.cjs` extension for CommonJS migrations
