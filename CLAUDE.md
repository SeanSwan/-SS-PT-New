# CLAUDE.md - SwanStudios Project Intelligence

## Project Overview
SwanStudios (SS-PT) is a production personal training SaaS platform deployed on Render (sswanstudios.com).
- **Stack:** React 18 + TypeScript + styled-components (frontend), Node.js + Express + Sequelize + PostgreSQL (backend)
- **Theme:** Enchanted Apex: Crystalline Swan (frozen enchanted forest + deep-ocean luxury vault + competitive arena)
- **RETIRED:** Galaxy-Swan theme (cosmic gradients, `#0a0a1a`, `#00FFFF`, `#7851A9`) — do NOT use these tokens for new work
- **Active Palette:**
  - Midnight Sapphire `#002060` (Primary — logo deep navy, blue button background)
  - Royal Depth `#003080` (Surface — logo circle background, elevated cards)
  - Ice Wing `#60C0F0` (Cyan Glow — glow on purple buttons, XP bars, gaming accents)
  - Arctic Cyan `#50A0F0` (Data Only — charts, data viz, cold metrics. NOT for buttons/glow)
  - Gilded Fern `#C6A84B` (Luxury Accent — gold contrast)
  - Frost White `#E0ECF4` (Background — logo head highlight)
  - Swan Lavender `#4070C0` (Tertiary — logo mid-body purple-blue)
  - Wing Purple `#8B5CF6` (Glow Accent — purple button bg, glow on blue buttons, focus rings, hover states)
  - Abyssal Navy `#001840` (WCAG Dark — compliant dark backgrounds)
- **Dual-Button Glow System:**
  - Blue buttons (`#002060` bg) → Wing Purple `#8B5CF6` glow
  - Purple buttons (`#8B5CF6` bg) → Ice Wing Cyan `#60C0F0` glow
  - Cosmic Nebula gradient (`#8B5CF6 → #60C0F0`) → for premium/hero CTAs
  - This breaks up solid-blue monotony and reflects both logo colors
- **Typography:** Headings: "Plus Jakarta Sans". Drama: "Cormorant Garamond" Italic. Data: "Fira Code". UI/Gaming: "Sora"
- **Rarity System:** Common=Swan Lavender, Rare=Gilded Fern, Epic=Wing Purple, Legendary=animated gradient (sapphire→purple→cyan→gold)

## Build & Run
- **Frontend:** `cd frontend && npm run build` (Vite)
- **Backend:** `cd backend && node server.mjs`
- **Tests (frontend):** `cd frontend && npx vitest run --reporter verbose`
- **Tests (backend):** `cd backend && npm test`
- **Type check:** `cd frontend && npx tsc --noEmit`

## Co-Orchestrator: Gemini 3.1 Pro (Lead Design Authority)
Gemini 3.1 Pro is the Lead Design Authority for SwanStudios. Claude Opus 4.6 is the CEO with FINAL authority:
- **Gemini designs, Claude implements.** Gemini's design opinions are authoritative on aesthetics.
- **Opus 4.6 (CEO) overrides ALL decisions** — Gemini is CTO, Sonnet is VP Engineering. Opus reviews and ratifies.
- **Consult Gemini before major UI/UX plans:** `node scripts/consult-gemini.mjs --plan "plan text"`
- **Get design specs:** `node scripts/consult-gemini.mjs --design "component description"`
- **Design review:** `node scripts/consult-gemini.mjs --review --file path/to/component.tsx`
- **Ask questions:** `node scripts/consult-gemini.mjs --ask "design question"`
- **CEO debate:** `node scripts/consult-gemini.mjs --ask "Round N: [CEO position]"` (Opus ↔ Gemini, max 5 rounds)
- Output saves to `AI-Village-Documentation/gemini-consults/latest.md`
- **IMPORTANT:** Do NOT use Flash 2.5 or any other model's design vision. Gemini 3.1 Pro creates from scratch.
- **IMPORTANT:** Always verify Gemini's recommendations against CLAUDE.md. Gemini sometimes references the RETIRED Galaxy-Swan theme — reject and correct.

## Key Directories
- `frontend/src/components/` - React components (styled-components, NO MUI)
- `backend/routes/` - Express API routes
- `backend/models/` - Sequelize models (PostgreSQL)
- `backend/migrations/` - Database migrations (.cjs files)
- `docs/ai-workflow/` - AI coordination docs, blueprints, handoff protocols

## Code Conventions
- **No Material-UI** - All UI uses styled-components with Crystalline Swan theme tokens
- **44px minimum touch targets** on all interactive elements (mobile-first)
- **10-breakpoint responsive matrix:** 320px, 375px, 430px, 768px, 1024px, 1280px, 1440px, 1920px, 2560px, 3840px
- **Blueprint-first development** - Architecture docs before code (see `docs/ai-workflow/blueprints/`)
- **7-Star Documentation Standard** - See section below (MANDATORY for all files)
- **No-Monolith File Rule** - Max 300 lines of code per file (see section below)
- **RBAC enforcement** - Admin/Trainer/Client role isolation on all endpoints
- **NASM OPT Protocol** - All workouts follow 5-phase periodization model (see section below)

## Git Workflow
- Deploy target: Render auto-deploys from `main` branch
- Commit style: `type(scope): description` (e.g., `fix(schedule): enterprise audit P0 fixes`)
- Always push to trigger Render deploy after commits

---

## Blueprint-First Protocol (MANDATORY)

Every major component (>100 lines) MUST have a blueprint comment block at the top of the file. This is the guardrail that prevents "vibe coding" as the project grows across multiple AI agents.

### What Goes in the Blueprint
1. **Component name, purpose, owner, last validation date**
2. **ASCII wireframe** showing the visual layout
3. **Data flow** (props in, state, API calls, events, children)
4. **Architecture diagram** (Mermaid-style component tree)

### Blueprint Format (Main Components)
```
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: [Name]                                           ║
 * ║  PURPOSE: [One-line description]                              ║
 * ║  OWNER: [AI/person who last modified]                         ║
 * ║  LAST VALIDATED: [Date of last AI Village run]                ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────┐
 * │ [Visual layout of the component]       │
 * └────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { ... }
 * State:     { ... }
 * API Calls: GET /api/..., POST /api/...
 * Events:    customEventName
 * Children:  SubComponent1, SubComponent2
 *
 * ARCHITECTURE:
 * graph TD
 *   A[Parent] --> B[Child1]
 *   A --> C[Child2]
 */
```

### Sub-Component Blueprint (shorter)
```
/**
 * ┌─── SUB-COMPONENT: [Name] ──────────────────────┐
 * │ PARENT: [ParentComponent]                        │
 * │ PURPOSE: [What it does]                          │
 * │ WIREFRAME: [ASCII layout]                        │
 * │ Props: { ... }                                   │
 * └──────────────────────────────────────────────────┘
 */
```

### Enforcement Rules
- **No component >100 lines may exist without a blueprint header**
- **When modifying a component, update its blueprint FIRST**
- **Sub-components reference their parent's blueprint**
- **AI Village validation checks for blueprint presence**
- **Master prompt V1:** `docs/ai-workflow/blueprints/EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT.md`
- **Master prompt V2 (CURRENT):** `docs/ai-workflow/blueprints/EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT-V2.md`

### Embedded AI Terminal Architecture
The AI assistant is **embedded into every admin dashboard tab** at the top of the content area (not a floating drawer). Each tab auto-sets the AI context based on its data domain. The floating FAB remains for non-admin pages.

| Dashboard Tab | AI Context | Tab Route |
|--------------|------------|-----------|
| Overview | `general` | `/dashboard/default` |
| Schedule | `scheduling` | `/dashboard/schedule` |
| Training Sessions | `workout_generation` | `/dashboard/admin-sessions` |
| Client Progress | `progress_analysis` | `/dashboard/client-progress` |
| Client Management | `client_review` | `/dashboard/client-management` |
| NASM Exercises | `exercise_library` | `/dashboard/nasm-exercises` |
| Reports | `data_analysis` | `/dashboard/reports` |

### NASM Exercise Database (V2 — 530+ Exercises)
- **75 official NASM exercises** from nasm.org + **455+ exercises** from free-exercise-db, P90X, Tae Bo, Squat University, manual curation
- **10 filter chips:** All, Chest, Back, Shoulders, Arms, Legs, Core, Full Body, Cardio, Recovery
- **12 equipment categories:** Barbell, Dumbbell, Cable, Machine, Bodyweight, Kettlebell, Resistance Band, Stability Ball, Medicine Ball, Landmine, Cardio Equipment, None
- **3 difficulty levels + source tracking:** Each exercise tagged with source (nasm, free-exercise-db, custom, p90x, taebo, squat-university)
- Autocomplete rolodex UI with react-window virtualization for 530+ exercises
- **Draft Mode RBAC:** Admin creates = active+global. Trainer creates = draft+trainer. Drafts blocked from production logs until approved.
- **Admin custom exercise management:** Only admins can create/edit/soft-delete custom exercises. NASM exercises are read-only.
- Full database in: `docs/ai-workflow/blueprints/EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT-V2.md` (Appendix C)

---

## 7-Star Documentation Standard (MANDATORY)

Every file in the codebase MUST follow this documentation pattern. Junior developers must understand every component without asking anyone.

### Level 1: File Header (ALL files)
```typescript
/**
 * ============================================================================
 * FILE: ComponentName.tsx
 * PURPOSE: [One clear sentence]
 * AUTHOR: [Creator] | LAST MODIFIED: [Date]
 * AI VILLAGE VALIDATED: [Date]
 * ============================================================================
 *
 * WHAT THIS FILE DOES: [2-3 sentences in plain English]
 * HOW IT FITS IN THE APP: Parent → Children → Data flow
 * KEY DECISIONS: [Why approach X over Y]
 * NASM PROTOCOL CONTEXT: [OPT phase relevance, if any]
 */
```

### Level 2: Section Comments (every logical section)
```typescript
// ─────────────────────────────────────────────────────────────
// SECTION: [Name]
// PURPOSE: [What this section does]
// WHY: [Non-obvious architectural reasoning]
// ─────────────────────────────────────────────────────────────
```

### Level 3: Inline Comments (non-obvious logic only)
```typescript
// Brzycki formula: estimated1RM = weight / (1.0278 - 0.0278 × reps)
// More accurate than Epley for 1-10 rep range (NASM standard)
```

### Level 4: Function Docs (all exported functions)
```typescript
/**
 * [Description]. [WHY this approach]. @param / @returns / @example
 */
```

### Level 5: Blueprint Header (components >100 lines)
See Blueprint-First Protocol above.

---

## No-Monolith File Rule (MANDATORY)

**No single file may exceed 300 lines of code (excluding comments and blank lines).**

### Why
- Monolith files cause merge conflicts in multi-AI development
- Files >300 lines exceed reasonable context window reasoning
- Smaller files = faster AI Village validation

### Decomposition Strategy
When a component approaches 300 lines:
1. **Extract sub-components** — JSX inside `.map()` → own file
2. **Extract hooks** — Data fetching, state machines → `use[Feature].ts`
3. **Extract utils** — Pure functions → `utils/[feature].ts`
4. **Extract types** — Shared interfaces → `[Feature]Types.ts`
5. **Extract constants** — Config, defaults → `[Feature]Constants.ts`
6. **Extract styled components** — When >5 styled components → `[Feature]Styles.ts`

### Exceptions
- Migration/seed data files (sequential SQL / large datasets)
- Type definition files (many interfaces)
- Test files (test suites can be long)

---

## NASM OPT Protocol (MANDATORY for Workout Features)

All workout generation, logging, and planning MUST follow the NASM Optimum Performance Training (OPT) model.

### 5-Phase Periodization
| Phase | Name | Reps | Sets | Tempo | Rest | %1RM |
|-------|------|------|------|-------|------|------|
| 1 | Stabilization Endurance | 12-20 | 1-3 | 4/2/1 | 0-90s | 50-70% |
| 2 | Strength Endurance | 8-12 | 2-4 | 2/0/2 | 0-60s | 70-80% |
| 3 | Hypertrophy | 6-12 | 3-5 | 2/0/2 | 0-60s | 75-85% |
| 4 | Maximal Strength | 1-5 | 4-6 | X/0/X | 3-5min | 85-100% |
| 5 | Power | 1-5/8-10 | 3-6 | X/0/X | 3-5min | 30-45%/85-100% |

### Tempo Notation
`Eccentric/Isometric/Concentric` — e.g., "4/2/1" = 4s lowering, 2s hold, 1s lifting

### 1RM Formula (Brzycki)
`estimated1RM = weight / (1.0278 - 0.0278 × reps)` — valid for 2-10 reps

### AI Workout Generation Rules
- AI MUST know client's current OPT phase before generating workouts
- All generated exercises include: sets, reps, weight (from 1RM × phase %), tempo, rest
- Phase 5 uses superset format: strength exercise (85-100%) + power exercise (30-45%)

### NASM Calculators
4 built-in calculators (no leaving the app): 1RM, Calorie/TDEE, Body Fat %, BMI
- Full specs: `docs/ai-workflow/blueprints/EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT-V2.md` (Sections 6-7)

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

---

## 11-Brain Recursive Consensus System (MANDATORY)
SwanStudios uses an 11-Brain AI validation pipeline. **Run before every production deploy.**

```bash
# Run validation on recent changes
node scripts/validation-orchestrator.mjs

# Run on specific files
node scripts/validation-orchestrator.mjs --files path/to/file.tsx

# Run on staged changes
node scripts/validation-orchestrator.mjs --staged
```

### Architecture
- **Phase 1:** 9 parallel validators (Gemini 2.5 Flash, Claude Sonnet, Step 3.5 Flash, Gemini 3 Flash, Gemini 3.1 Flash, MiniMax M2.1, DeepSeek V3.2, MiniMax M2.5, Claude Sonnet [Data Safety])
- **Phase 2:** Code quality recursive debate — Gemini 3.1 Pro (CTO) ↔ Claude Sonnet (CEO). Max 5 rounds. Claude Sonnet = interim authority.
- **Phase 3:** UX/UI design recursive debate — Gemini 3.1 Pro (Creative Director) ↔ Claude Sonnet (Collaborator). Max 5 rounds. Gemini = design authority.
- **Phase 4 (MANDATORY): Opus CEO Review** — Claude Opus 4.6 reviews Phase 2+3 consensus, then debates Gemini 3.1 Pro directly for max 5 rounds. **Opus 4.6 = FINAL authority on ALL decisions.** Sonnet's decisions are recommendations, not final rulings.
  - Opus reads the Phase 2 debate log + fix-instructions.md + design-recommendations.md
  - Opus reviews what Sonnet agreed to, identifies gaps, and corrects any errors
  - Opus engages Gemini CTO directly via `node scripts/consult-gemini.mjs --ask`
  - Max 5 rounds. Opus has FINAL SAY on severity ratings, launch blockers, deferrals, and implementation
  - Opus must verify Gemini's recommendations against CLAUDE.md (theme tokens, conventions, etc.)
  - If Gemini references RETIRED theme tokens (Galaxy-Swan: #0a0a1a, #00FFFF, #7851A9), Opus REJECTS and corrects
  - Output: Final CEO ruling saved to `AI-Village-Documentation/validation-prompts/latest/opus-ceo-ruling.md`
- **Output:** `AI-Village-Documentation/validation-prompts/latest/` (summary, per-track reports, debate logs, fix instructions, opus-ceo-ruling)
- **Setup:** `OPENROUTER_API_KEY` in .env (required). `GEMINI_API_KEY` in .env (enables Phase 2+3+4 debates).
- **Full docs:** `AI-Village-Documentation/AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V5.md`

### Chain of Command (MANDATORY)
The AI Village has a strict hierarchy for decision-making:
1. **Claude Opus 4.6 (CEO)** — FINAL authority on ALL decisions. Overrides everyone.
2. **Gemini 3.1 Pro (CTO / Creative Director)** — Lead Design Authority. Authoritative on design, but Opus can override on engineering/business grounds.
3. **Claude Sonnet (VP Engineering)** — Runs initial debates, makes interim recommendations. Opus reviews and ratifies or overrides.
4. **Phase 1 validators (Staff Engineers)** — Surface findings. No decision authority.

This hierarchy applies to:
- Severity ratings (CRITICAL/HIGH/MEDIUM/LOW)
- Launch blocker decisions
- Deferral decisions (what ships now vs post-launch)
- Theme token enforcement (Opus enforces CLAUDE.md as source of truth)
- Any disagreement between Gemini and Sonnet

### When to Run
- **MANDATORY:** Before pushing to main (production deploys)
- **MANDATORY:** Before merging PRs with >100 lines changed
- **RECOMMENDED:** After major refactors or new features

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

## Build Hardening Checklist (MANDATORY)
Every component and endpoint must pass these checks BEFORE commit. These rules exist because AI Village repeatedly caught these same patterns post-build.

### React Component Rules
- **No portals inside `.map()` loops** — Creates N portals per render, leaks memory. Use ONE portal outside the loop, driven by state (`activeId`).
- **Every button must have an `onClick`** — Dead buttons with no handler are a recurring bug. If the handler isn't built yet, add `onClick={() => console.warn('TODO: implement')}` with a `// TODO` comment.
- **Wrap expensive parsing in `useMemo`** — Any `parse*()`, `JSON.parse()`, or regex in render must be memoized. Re-parsing on every keystroke kills performance.
- **`React.memo` on list item components** — Any component rendered inside `.map()` over a data array must be wrapped in `React.memo`.
- **Lazy-load heavy components** — `React.lazy()` for 3D, AI, charts, and any component >30KB. Keep CRUD modals eager.
- **No hardcoded hex colors** — Use `${({ theme }) => theme.x || '#fallback'}` pattern. Fallback MUST be from the active Crystalline Swan palette, never retired Galaxy-Swan tokens.
- **All interactive elements: 44px min touch target** — Buttons, pills, tabs, close icons. No exceptions.
- **WCAG contrast: 4.5:1 minimum** — Test text color against its background. Common failures: `#64748b` on dark bg (use `#94a3b8`+), `rgba(255,255,255,0.3)` placeholder (use `0.5`+).
- **Focus trap on modals/drawers** — `role="dialog" aria-modal="true"`, Escape to close, focus returns to trigger on close.
- **Error boundaries on async UI** — Any component that fetches data needs error state + retry button, not silent failure.

### Backend Rules
- **Non-fatal dependency creation** — If creating a child record (e.g., `ClientProgress`) during a parent create (e.g., `User`), check table existence first. Never let optional records kill the transaction.
  ```javascript
  // Pattern: Check table exists before insert in transaction
  const [check] = await sequelize.query(`SELECT to_regclass('table_name') AS exists`, { transaction });
  if (check?.[0]?.exists) { await Model.create({...}, { transaction }); }
  ```
- **Soft-delete with audit trail** — Never hard-delete user data. Use `isActive: false, deletedAt, deletedBy`.
- **Destructive endpoints require confirmation** — Delete routes must require `confirmEmail` matching the record, not a boolean.
- **Every `async` callback needs try/catch** — Especially `refreshAllData`, `fetchClients`, and similar reload functions. Set error state on failure.
- **Don't reference non-existent columns in models** — Before adding a foreign key field to a Sequelize model, verify the referenced table AND column exist in production. Check migrations actually ran.
- **Route aliases for external services** — When external services (Stripe, SendGrid) are configured with a webhook URL, mount the handler at THAT EXACT path. Don't assume they'll follow your internal routing.

### Sequelize Model Rules
- **No `challengeId`-style phantom columns** — If a model references another table via FK, that table MUST exist and the migration MUST have run. Check `SequelizeMeta` in prod before assuming.
- **Association `constraints: false`** — Cross-model associations that reference tables which may not exist yet must use `constraints: false` to prevent sync failures.
- **ENUM values must match exactly** — When inserting data, values must match the ENUM definition in the model. Case-sensitive. Test with actual enum values before deploying.

### Pre-Commit Mental Checklist
Before every commit, mentally verify:
1. Every new button has an `onClick` handler
2. No portals/heavy components inside `.map()`
3. All colors use theme tokens with Crystalline Swan fallbacks
4. Backend creates handle missing tables gracefully
5. All model FKs reference tables that exist in production
6. Error states exist for every data fetch

## Deployment — Render (Paid Professional Plan)
- **Plan:** Render Professional ($19/month + usage) — NOT free tier
- **Services:** SS-PT-New (web service ~$14/mo), SwanStudios PostgreSQL ($6/mo), 500GB bandwidth included
- **Billing:** ~$55-60/month total, billed to ogpswan@yahoo.com
- **No cold starts** — Professional plan keeps services running (do NOT assume free-tier cold start behavior)
- **Pipeline minutes:** 500 included, overage at $5/1000 min — be mindful of excessive rebuilds

## Common Gotchas
- `transform: translateZ(0)` creates CSS stacking contexts - add `position: relative; z-index` to parent if dropdowns are trapped
- Vite env vars (`VITE_*`) are build-time only - not changeable at runtime without redeploy
- Render deploys take 2-5 minutes after push; users may see cached old bundles
- Windows dev environment - use forward slashes in imports, `.cjs` extension for CommonJS migrations
