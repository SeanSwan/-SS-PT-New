# CLAUDE.md Token Optimization Plan

## Problem Statement
The current `CLAUDE.md` is **1,263 lines / 75.8 KB / ~13,400 tokens** that gets loaded on EVERY SINGLE MESSAGE. Over a 30-message conversation, that's ~400,000 tokens just from CLAUDE.md re-reads. The recommended best practice is **under 200 lines** — we are 6.3x over that.

This is not about removing information. It's about restructuring CLAUDE.md as an **index file** that points to detailed reference docs, instead of being the encyclopedia itself.

## Current Token Budget (Per Message Overhead)
| Source | Estimated Tokens | Notes |
|--------|-----------------|-------|
| CLAUDE.md | ~13,400 | Loaded every message |
| MEMORY.md (136 lines) | ~2,500 | Loaded every message |
| System prompt + tools | ~15,000 | Fixed overhead |
| Skills (17 installed) | ~5,000+ | Loaded on invocation |
| MCP servers | Variable | Per-server overhead |
| **Total before user speaks** | **~36,000+** | Before any code or conversation |

## Proposed Architecture: Index + Reference Docs

### CLAUDE.md becomes a ~180-line INDEX with:
1. **Project identity** (5 lines) — Stack, theme name, deploy target
2. **Build commands** (8 lines) — How to run/test/build
3. **Critical rules** (40 lines) — The MUST-follow rules that apply to EVERY task
4. **Reference pointers** (60 lines) — `See docs/ai-workflow/references/SECTION.md` for each topic
5. **Active palette** (15 lines) — Color tokens (needed for every UI task)
6. **Code conventions** (10 lines) — The rules that affect every file
7. **Gotchas** (10 lines) — Common pitfalls
8. **Token optimization rules** (15 lines) — Self-enforcing efficiency

### Reference docs extracted to `docs/ai-workflow/references/`:
These are ONLY loaded when Claude needs them for a specific task.

| Current Section | Lines | Extract To | When Needed |
|----------------|-------|-----------|-------------|
| Blueprint-First Protocol | 107 | `BLUEPRINT-PROTOCOL.md` | Creating/modifying components >100 lines |
| Enhanced Blueprint Protocol | 93 | Merge into above | Same |
| 7-Star Documentation Standard | 48 | `DOCUMENTATION-STANDARD.md` | Creating new files |
| NASM OPT Protocol | 30 | `NASM-OPT-PROTOCOL.md` | Workout features only |
| Gamification & Badge System | 93 | `GAMIFICATION-SYSTEM.md` | Gamification features only |
| Chart & Analytics System | 63 | `CHART-ANALYTICS-SYSTEM.md` | Chart features only |
| Social Media Platform | 52 | `SOCIAL-PLATFORM.md` | Social features only |
| 14-Brain AI Village | 114 | `AI-VILLAGE-SYSTEM.md` | Running AI Village only |
| Dashboard Architecture | 28 | `DASHBOARD-ARCHITECTURE.md` | Dashboard work only |
| UI/UX Redesign Workflow | 45 | `UI-REDESIGN-WORKFLOW.md` | Redesign work only |
| Privacy Proxy | 30 | `PRIVACY-PROXY.md` | AI/PII work only |
| OpenClaw | 44 | `OPENCLAW-PLAN.md` | OpenClaw work only |
| Design System Handoff | 47 | `DESIGN-SYSTEM-HANDOFF.md` | Design work only |
| Theme Changer Compatibility | 46 | `THEME-CHANGER-COMPAT.md` | Theme/styling work only |
| File Cleanup Protocol | 37 | `FILE-CLEANUP-PROTOCOL.md` | Cleanup tasks only |
| Anti-AI-Tells Checklist | 29 | `ANTI-AI-TELLS.md` | UI work only |
| Visual Diff Loop | 24 | `VISUAL-DIFF-LOOP.md` | UI QA only |
| Build Hardening Checklist | 42 | `BUILD-HARDENING.md` | Pre-commit only |
| Auto Research Protocol | 37 | `AUTO-RESEARCH.md` | Running auto-research only |
| App AI Hive Mind | 20 | `APP-AI-HIVE-MIND.md` | AI features only |
| Skills Reference | 27 | `SKILLS-REFERENCE.md` | Skill work only |
| No-Monolith Rule | 25 | Merge into Code Conventions | Keep as 2-line rule in index |

**Total extracted: ~1,075 lines → saved from every-message loading**
**Remaining in CLAUDE.md: ~180 lines (~3,200 tokens)**
**Token savings per message: ~10,200 tokens**
**Token savings over 30 messages: ~306,000 tokens**

## Proposed Slim CLAUDE.md Structure (Target: ~180 lines)

```markdown
# CLAUDE.md - SwanStudios Project Intelligence

## Identity
SwanStudios (SS-PT): Production PT SaaS on Render (sswanstudios.com)
Stack: React 18 + TS + styled-components | Node.js + Express + Sequelize + PostgreSQL
Theme: Enchanted Apex — Crystalline Swan (dark-first, #0A0A0F base)

## Build & Run
- `npm run dev` — backend + frontend, auto-opens browser
- `cd frontend && npm run build` — Vite build
- `cd frontend && npx vitest run` — frontend tests
- `cd frontend && npx tsc --noEmit` — type check
- `cd backend && npm test` — backend tests
- Local dev uses production DB via DATABASE_URL

## MANDATORY Rules (Apply to ALL Tasks)
1. Test locally before committing (npm run dev → verify → commit)
2. No Material-UI — styled-components only with CSS vars + dark fallbacks
3. 44px min touch targets on all interactive elements
4. Dark-first design: var(--bg-base, #030712), var(--accent-primary, #60C0F0)
5. Max 300 lines per file (extract hooks, utils, styles, types)
6. Blueprint header on components >100 lines
7. No hardcoded colors — use var(--token, #fallback) pattern
8. WCAG 4.5:1 contrast minimum
9. No yoga/meditation language — use "stretching"/"flexibility"
10. Victory only for charts (no Recharts for new work)
11. Zero PII to LLMs — client IDs only, names mapped client-side
12. Render is PAID Professional plan (~$60/month), NOT free tier
13. No Grok/X-AI models anywhere. Hard permanent no.
14. Commit style: type(scope): description → push to main for auto-deploy

## Active Palette
[Keep current palette — 15 lines, needed for every UI task]

## Typography
Headings: "Plus Jakarta Sans" | Drama: "Cormorant Garamond" Italic
Data: "Fira Code" | UI/Gaming: "Sora"

## Key Directories
- frontend/src/components/ — React components
- backend/routes/ — Express API routes
- backend/models/ — Sequelize models
- docs/ai-workflow/ — AI docs, blueprints, handoffs

## Co-Orchestrator Hierarchy
Opus 4.6 (CEO, FINAL authority) > Gemini 3.1 Pro (CTO, design) > Sonnet 4.6 (VP Eng)
Consult: `node scripts/consult-gemini.mjs --plan|--design|--review|--ask`

## Git Workflow
Deploy: Render auto-deploys from main. Commit: type(scope): description

## Common Gotchas
- translateZ(0) creates stacking contexts — add position:relative + z-index
- Vite env vars (VITE_*) are build-time only
- Render deploys take 2-5 min; users may see cached old bundles
- Windows dev — forward slashes in imports, .cjs for CommonJS migrations
- Gamification: always use idempotency keys to prevent double-award
- Chart lazy loading: React.lazy() + SafeChart error boundary
- Social feed: cursor-based pagination (not offset)

## Token Optimization (SELF-ENFORCING)
- Use sub-agents (Haiku) for exploration/research tasks
- If a task needs 3+ files or multi-file analysis, spawn a sub-agent
- Read reference docs ONLY when needed for current task
- Don't reload reference docs if already in context
- Compact at 60% context, not 95%
- Start fresh (/clear) between unrelated tasks

## Reference Docs (Read ONLY when needed for current task)
| Topic | File | When to Read |
|-------|------|-------------|
| Blueprint Protocol | docs/ai-workflow/references/BLUEPRINT-PROTOCOL.md | Creating/editing components >100 lines |
| Documentation Standard | docs/ai-workflow/references/DOCUMENTATION-STANDARD.md | Creating new files |
| NASM OPT Protocol | docs/ai-workflow/references/NASM-OPT-PROTOCOL.md | Workout/exercise features |
| Gamification System | docs/ai-workflow/references/GAMIFICATION-SYSTEM.md | Gamification features |
| Chart Analytics | docs/ai-workflow/references/CHART-ANALYTICS-SYSTEM.md | Chart/analytics work |
| Social Platform | docs/ai-workflow/references/SOCIAL-PLATFORM.md | Social features |
| AI Village System | docs/ai-workflow/references/AI-VILLAGE-SYSTEM.md | Running validation |
| Dashboard Architecture | docs/ai-workflow/references/DASHBOARD-ARCHITECTURE.md | Dashboard work |
| UI Redesign Workflow | docs/ai-workflow/references/UI-REDESIGN-WORKFLOW.md | UI redesign tasks |
| Privacy Proxy | docs/ai-workflow/references/PRIVACY-PROXY.md | AI/PII features |
| Design System | docs/ai-workflow/references/DESIGN-SYSTEM-HANDOFF.md | Design/styling |
| Theme Compatibility | docs/ai-workflow/references/THEME-CHANGER-COMPAT.md | Theme work |
| Build Hardening | docs/ai-workflow/references/BUILD-HARDENING.md | Pre-commit checks |
| Anti-AI-Tells | docs/ai-workflow/references/ANTI-AI-TELLS.md | UI component work |
| Visual Diff Loop | docs/ai-workflow/references/VISUAL-DIFF-LOOP.md | UI QA |
| File Cleanup | docs/ai-workflow/references/FILE-CLEANUP-PROTOCOL.md | Cleanup tasks |
| Auto Research | docs/ai-workflow/references/AUTO-RESEARCH.md | Running auto-research |
| App AI Hive Mind | docs/ai-workflow/references/APP-AI-HIVE-MIND.md | AI chat features |
| OpenClaw | docs/ai-workflow/references/OPENCLAW-PLAN.md | OpenClaw work |
| Skills Reference | docs/ai-workflow/references/SKILLS-REFERENCE.md | Skill management |
| 3-Tier Workflow | docs/ai-workflow/references/THREE-TIER-WORKFLOW.md | Choosing dev tier |
```

## Safety Constraints (MUST NOT Break)

### What CANNOT change:
1. **All rules remain enforced** — they just live in reference docs instead of CLAUDE.md
2. **AI Village still works** — just reads its own reference doc when needed
3. **Theme tokens stay in CLAUDE.md** — needed for every UI task
4. **Build commands stay** — always needed
5. **Critical rules stay** — the MANDATORY rules that apply everywhere
6. **Co-orchestrator hierarchy stays** — needed for AI decision-making

### What changes:
1. **CLAUDE.md shrinks from 1,263 → ~180 lines** (86% reduction)
2. **Extracted content moves to `docs/ai-workflow/references/`** — 20 reference files
3. **Claude reads reference docs on-demand** — only when the task requires that specific knowledge
4. **Token savings: ~10,200 per message, ~306,000 over 30 messages**

### Risk Mitigation:
- Reference docs are in the repo, always available via Read tool
- CLAUDE.md index table tells Claude exactly where to look
- No information is deleted — only relocated
- Memory system (MEMORY.md) is unchanged
- Skills system is unchanged
- The slim CLAUDE.md still has enough context for 90% of tasks

## Implementation Steps
1. Create `docs/ai-workflow/references/` directory
2. Extract each section into its own reference doc (preserving exact content)
3. Rewrite CLAUDE.md as the slim index (~180 lines)
4. Test: run /context before and after to verify token reduction
5. Test: verify a UI task still reads theme tokens correctly
6. Test: verify a gamification task triggers reading the gamification reference
7. Commit with clear message about the refactor

## Questions for AI Village
1. Are there any sections that MUST stay in CLAUDE.md beyond what's proposed?
2. Is 180 lines the right target, or could it be even leaner?
3. Should reference docs be further consolidated (e.g., merge UI-related ones)?
4. Are there any rules that could conflict if split across files?
5. What's the risk of Claude not reading a reference doc when it should?
