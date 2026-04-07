# CLAUDE.md - SwanStudios Project Intelligence

## Identity
SwanStudios (SS-PT): Production personal training SaaS on Render (sswanstudios.com).
- **Stack:** React 18 + TypeScript + styled-components (frontend), Node.js + Express + Sequelize + PostgreSQL (backend)
- **Theme:** Enchanted Apex: Crystalline Swan (dark-first, frozen enchanted forest + deep-ocean luxury vault)
- **RETIRED:** Galaxy-Swan theme (`#0a0a1a`, `#00FFFF`, `#7851A9`) — do NOT use

## Build & Run
- **Local dev:** `npm run dev` (from root — backend:10000 + frontend:5173 concurrently, auto-opens browser)
- **Frontend build:** `cd frontend && npm run build` (Vite)
- **Tests:** `cd frontend && npx vitest run --reporter verbose` | `cd backend && npm test`
- **Type check:** `cd frontend && npx tsc --noEmit`
- **Local dev uses production DB** via `DATABASE_URL` — if it works locally, it works in production
- **MANDATORY:** Test locally before committing. No pushing broken code.

## Active Palette
- Midnight Sapphire `#002060` (Primary — buttons bg)
- Royal Depth `#003080` (Surface — elevated cards)
- Ice Wing `#60C0F0` (Cyan Glow — gaming accents, XP bars)
- Arctic Cyan `#50A0F0` (Data Only — charts. NOT for buttons/glow)
- Gilded Fern `#C6A84B` (Luxury Accent — gold)
- Frost White `#E0ECF4` (Text — primary light)
- Swan Lavender `#4070C0` (Tertiary)
- Wing Purple `#8B5CF6` (Glow Accent — purple buttons, focus rings)
- Obsidian Black `#0A0A0F` (Deep Dark — primary dark bg)
- Carbon `#141419` (Card Dark)
- Graphite `#1A1A24` (Surface Dark — modals, drawers)
- **Dual-Button Glow:** Blue bg → Purple glow | Purple bg → Cyan glow
- **Typography:** Plus Jakarta Sans (headings), Cormorant Garamond Italic (drama), Fira Code (data), Sora (UI/gaming)
- **Rarity:** Common=Swan Lavender, Rare=Gilded Fern, Epic=Wing Purple, Legendary=animated gradient

## MANDATORY Rules (Apply to ALL Tasks)
1. **No Material-UI** — styled-components only with CSS custom properties + dark-theme fallbacks
2. **44px min touch targets** on all interactive elements
3. **Dark-first design** — default theme is `crystalline-dark`. var(--bg-base, #030712), var(--accent-primary, #60C0F0)
4. **Max 300 lines per file** — extract hooks, utils, styles, types when approaching limit
5. **Blueprint header on components >100 lines** — see `docs/ai-workflow/references/BLUEPRINT-PROTOCOL.md`
6. **No hardcoded colors** — use `var(--token, #fallback)` pattern with Crystalline Swan fallbacks
7. **WCAG 4.5:1 contrast minimum** — test text against background
8. **Zero PII to LLMs** — client IDs only, names mapped client-side. See `docs/ai-workflow/references/PRIVACY-PROXY.md`
9. **No yoga/meditation** language — use "stretching"/"flexibility" instead
10. **Victory only** for charts (no Recharts for new work)
11. **Render is PAID Professional plan** (~$60/month), NOT free tier. No cold starts.
12. **No Grok/X-AI models** anywhere. Hard permanent no.
13. **Commit style:** `type(scope): description` → push to main for Render auto-deploy
14. **7-Star documentation** on all new files — see `docs/ai-workflow/references/DOCUMENTATION-STANDARD.md`
15. **Recursive planning BEFORE building** — NO code without a plan. See `docs/ai-workflow/references/RECURSIVE-PLANNING-PROTOCOL.md`
16. **AI Village (14-brain) requires Sean's permission** — NEVER run without asking. Use Opus (free) or Gemini CTO (cheap) for most planning. Village is for CRITICAL decisions only (~$0.33/run).

## Key Directories
- `frontend/src/components/` — React components (styled-components, NO MUI)
- `backend/routes/` — Express API routes
- `backend/models/` — Sequelize models (PostgreSQL)
- `docs/ai-workflow/` — AI coordination docs, blueprints, handoffs, references

## Co-Orchestrator Hierarchy
- **Opus 4.6 (CEO)** — FINAL authority on ALL decisions. Overrides everyone.
- **Gemini 3.1 Pro (CTO)** — Lead Design Authority. Authoritative on aesthetics, Opus can override.
- **Sonnet 4.6 (VP Eng)** — Premium code quality. Used in AI Village debates.
- Consult: `node scripts/consult-gemini.mjs --plan|--design|--review|--ask`
- Output: `AI-Village-Documentation/gemini-consults/latest.md`
- **IMPORTANT:** Do NOT use Flash 2.5 or any other model's design vision. Gemini 3.1 Pro creates from scratch.

## Git Workflow
- Deploy: Render auto-deploys from `main` branch
- Commit: `type(scope): description` (e.g., `fix(schedule): enterprise audit P0 fixes`)
- Always push to trigger Render deploy after commits

## Common Gotchas
- `translateZ(0)` creates stacking contexts — add `position: relative; z-index` to parent
- Vite env vars (`VITE_*`) are build-time only — not changeable at runtime
- Render deploys take 2-5 min; users may see cached old bundles
- Windows dev — forward slashes in imports, `.cjs` for CommonJS migrations
- Gamification: always use idempotency keys to prevent double-award
- Chart lazy loading: `React.lazy()` + SafeChart error boundary — never eagerly load full gallery
- Social feed: cursor-based pagination (not offset)
- Dual `users`/`"Users"` table in production — FK constraints must reference `"Users"`

## Token Optimization (SELF-ENFORCING)
- **CLAUDE.md is an INDEX** — detailed specs live in reference docs, loaded on-demand
- Use sub-agents (Haiku) for exploration/research tasks requiring 3+ files
- Don't reload reference docs already in context
- Compact at 60% context capacity, not 95%
- Start fresh (/clear) between unrelated tasks
- Be surgical with file references — specify exact file/function, don't say "find the bug"
- Batch multi-step instructions into single messages

## Reference Docs (Read ONLY when needed for current task)
| Topic | File | When to Read |
|-------|------|-------------|
| Blueprint Protocol | `docs/ai-workflow/references/BLUEPRINT-PROTOCOL.md` | Creating/editing components >100 lines |
| Documentation Standard | `docs/ai-workflow/references/DOCUMENTATION-STANDARD.md` | Creating new files |
| NASM OPT Protocol | `docs/ai-workflow/references/NASM-OPT-PROTOCOL.md` | Workout/exercise features |
| Gamification System | `docs/ai-workflow/references/GAMIFICATION-SYSTEM.md` | Gamification features |
| Chart Analytics | `docs/ai-workflow/references/CHART-ANALYTICS-SYSTEM.md` | Chart/analytics work |
| Social Platform | `docs/ai-workflow/references/SOCIAL-PLATFORM.md` | Social features |
| AI Village (14-Brain) | `docs/ai-workflow/references/AI-VILLAGE-SYSTEM.md` | Running validation |
| Dashboard Architecture | `docs/ai-workflow/references/DASHBOARD-ARCHITECTURE.md` | Dashboard page work |
| UI Redesign Workflow | `docs/ai-workflow/references/UI-REDESIGN-WORKFLOW.md` | UI redesign tasks |
| Privacy Proxy | `docs/ai-workflow/references/PRIVACY-PROXY.md` | AI/PII features |
| Design System Handoff | `docs/ai-workflow/references/DESIGN-SYSTEM-HANDOFF.md` | Design/styling specs |
| Theme Compatibility | `docs/ai-workflow/references/THEME-CHANGER-COMPAT.md` | Theme/CSS variable work |
| Build Hardening | `docs/ai-workflow/references/BUILD-HARDENING.md` | Pre-commit review |
| Anti-AI-Tells | `docs/ai-workflow/references/ANTI-AI-TELLS.md` | UI component design |
| Visual Diff Loop | `docs/ai-workflow/references/VISUAL-DIFF-LOOP.md` | UI QA screenshots |
| File Cleanup | `docs/ai-workflow/references/FILE-CLEANUP-PROTOCOL.md` | Cleanup tasks |
| Auto Research | `docs/ai-workflow/references/AUTO-RESEARCH.md` | Running skill optimization |
| App AI Hive Mind | `docs/ai-workflow/references/APP-AI-HIVE-MIND.md` | AI chat features |
| OpenClaw | `docs/ai-workflow/references/OPENCLAW-PLAN.md` | OpenClaw work |
| Skills Reference | `docs/ai-workflow/references/SKILLS-REFERENCE.md` | Skill management |
| 3-Tier Workflow | `docs/ai-workflow/references/THREE-TIER-WORKFLOW.md` | Choosing dev workflow tier |
| R2 Video Migration | `docs/ai-workflow/references/R2-VIDEO-MIGRATION.md` | Adding/troubleshooting videos, R2 setup |
| Recursive Planning | `docs/ai-workflow/references/RECURSIVE-PLANNING-PROTOCOL.md` | **MANDATORY** — read before ANY implementation task |

## Opus-Codex Recursive Debate Protocol (MANDATORY)
- **Debate file:** `docs/ai-workflow/AI-HANDOFF/OPUS-CODEX-DEBATE-2026-04-06.md`
- **Purpose:** Claude (Opus) and Codex debate plans/fixes recursively until consensus
- **Flow:**
  1. Claude writes analysis/plan/AI Village results into the debate .md file
  2. Claude asks Sean: "Would you like Codex to review this?" — **Sean decides yes or no**
  3. If yes: Claude provides Sean a prompt to give Codex, pointing to the debate file
  4. Sean pastes Codex's response back to Claude (or notifies file was updated)
  5. Claude reads Codex's response, writes Round N reply into the debate file
  6. Repeat until BOTH parties write "CONSENSUS REACHED"
  7. Final consensus becomes the implementation plan
- **Rules:**
  - Claude NEVER starts without asking Sean's permission for Codex review
  - Polling ownership: Sean manages — Codex does NOT self-poll
  - All AI Village final results go INTO the debate file for Codex review
  - Max 25 rounds per debate — Opus CEO makes final call if no consensus
  - Codex autonomous scope: bug fixes, error resolution ONLY — no feature work, no UI redesign
  - Codex MUST read CLAUDE.md first — violations (MUI, README in prod, retired theme) have broken production

## AI Coordination
- Multi-AI Swarm (see `.clinerules` for full protocol)
- **Task tracker:** `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md`
- **Handoff protocol:** `docs/ai-workflow/AI-HANDOFF/HANDOFF-PROTOCOL.md`
- **Master handbook:** `docs/MASTER-HANDBOOK.md`
