# CLAUDE.md - SwanStudios Project Intelligence

## Identity
SwanStudios (SS-PT): Production personal training SaaS on Render (sswanstudios.com).
- **Stack:** React 18 + TypeScript + styled-components (frontend), Node.js + Express + Sequelize + PostgreSQL (backend)
- **Theme:** Enchanted Apex: Crystalline Swan (dark-first, frozen enchanted forest + deep-ocean luxury vault)
- **RETIRED:** Galaxy-Swan theme (`#0a0a1a`, `#00FFFF`, `#7851A9`) — do NOT use

- **Priority:** SwanStudios production work is the default priority. Side projects, internal experiments, and non-SwanStudios plans are out of scope unless Sean explicitly names them.

## Build & Run
- **Local dev:** `npm run dev` (from root — backend:10000 + frontend:5173 concurrently, auto-opens browser)
- **Frontend build:** `cd frontend && npm run build` (Vite)
- **Tests:** `cd frontend && npx vitest run --reporter verbose` | `cd backend && npm test`
- **Type check:** `cd frontend && npx tsc --noEmit`
- **Local dev uses production DB** via `DATABASE_URL` — if it works locally, it works in production
- **MANDATORY:** Test locally before committing. No pushing broken code.
- **Bugfix standard:** For bug fixes, write a targeted failing regression test first when feasible. If not feasible, explicitly say why and verify from the real caller path instead of a local happy path only.

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
16. **AI Village (15-brain) requires Sean's permission** - NEVER run without asking. Use Opus (free) or Gemini CTO (cheap) for most planning. Village is for CRITICAL decisions only (~$0.33/run).

17. **Dual-pass completion required** - for bug fixes, production incidents, and reviews, Claude must act as BOTH builder and hostile reviewer before declaring success.
18. **Existing-pattern-first** - before adding or changing a library/API usage, inspect the installed version and at least one working in-repo example. Match the real API, not memory.
19. **No speculative success language** - never say "should be fixed", "likely fixed", or "looks good" without naming the exact verified caller path, test, or command.
20. **Repo-wide sibling sweep required** - when fixing hosts, env vars, routes, auth headers, proxy config, socket URLs, imports, or shared helpers, search for parallel usages and verify sibling paths in the same pass.
21. **Task-type Definition of Done required** - bug, UI, API/auth, state, and production tasks must satisfy the matching checklist below before claiming success.
22. **Premium design standard** - every visible UI must feel enterprise-grade, distinctive, and brand-specific, not generic, tacky, or template-like.
23. **Design dual-pass required** - after building a UI, Claude must critique and improve its own design for hierarchy, polish, responsiveness, motion, and originality before calling it done.
24. **Responsive audit matrix required** - verify layouts against the viewport matrix below, including `414px` for iPhone XR. Use CSS viewport widths, not marketing resolution labels alone.
25. **Motion must stay premium and accessible** - motion should feel modern and intentional, but must stay GPU-safe and respect `prefers-reduced-motion`.

26. **Canonical Surface Receipt (MANDATORY)** — Before any UI or data-truth bug fix, produce a written receipt with file:line evidence for: (a) route file that actually mounts the target URL, (b) mounted JSX page/component — a lazy `import()` declaration is NOT proof of mount, JSX usage is, (c) consumer hook/service, (d) exact frontend API path string literal, (e) backend route match, (f) authoritative model fields from the model file (not from nearby mapper code). No code may be written until the receipt exists in the task thread.

27. **Surface Classification Table (MANDATORY)** — If more than one file/component/route/endpoint appears to serve the same product surface, classify each as:
    - **canonical** — proven mounted in the live route tree, with file:line evidence
    - **legacy** — not rendered by the currently verified canonical route tree for this surface
    - **dormant** — exists but has no consumer (new-but-not-yet-wired, or intentional placeholder)
    - **competing/ambiguous** — two or more surfaces may both be active; resolution required
    Every row must include file:line evidence. If classification is ambiguous, stop and resolve with Sean before coding.

28. **Claim-to-Evidence Lock (MANDATORY)** — Any closeout phrase of the form "end-to-end fixed," "live surface fixed," "truth restored," or "canonical surface patched" requires a Canonical Surface Receipt (rule 26) in the same report. Fixing a dormant or legacy path does not justify a canonical-surface claim — narrow the claim to "schema drift in legacy/orphaned file" and explicitly state which surface the fix does and does not reach.

29. **Schema Cross-Check Artifact (MANDATORY)** — For any fix that touches a Sequelize (or equivalent ORM) model, the report must include: (a) real column list quoted from the model file with file:line, (b) repo-wide grep across `backend/routes`, `backend/controllers`, `backend/services` for the model name, (c) for every hit, the full list of fields that caller references on the model, (d) a drift table: `caller field → real model column → match | drift`. Memory-based "I think these fields exist" assumptions are forbidden.

30. **Subagent Skepticism Rule (MANDATORY)** — Subagent output is a hypothesis, not root cause. For UI or data-truth work, a subagent's findings are not authoritative unless its output contains a Canonical Surface Receipt. If a subagent lacks that receipt, either re-prompt it with the Receipt requirement or construct the Receipt manually before acting.

31. **Backend Route Ownership / Shadow Audit (MANDATORY)** — When mapping a frontend API path to a backend handler, list every Express `app.use(...)` and `router.(get|post|put|delete)(...)` that could match the **touched path** and any **overlapping sibling paths revealed by the route walk**, in mount order. If overlapping mounts exist (e.g. `/api/workout` and `/api/workout/sessions` both mounted), the shadowing condition must be called out explicitly before the handler is considered verified. Default scope is narrow — do NOT run a whole-repo mount-order audit on every task.

32. **Repo Hygiene Scan Trigger (MANDATORY)** — Run a non-destructive hygiene scan before: major refactors or architecture changes, dashboard audits, route-tracing or debugging tasks with competing surfaces, and any fresh session where Sean says the repo feels confusing or cluttered. Also run after any large workstream that created many artifacts or planning docs. The scan must include root-level file inventory, competing-surface inventory, duplicate-route / duplicate-feature inventory, and a candidate archive/move list. **No files are moved or deleted during the scan.** Full workflow in `docs/ai-workflow/references/REPO-HYGIENE-PROTOCOL.md`.

33. **Active vs Archive vs Planned Classification (MANDATORY)** — Any non-trivial file discovered in a hygiene scan must be classified as exactly one of: active runtime code, active reference doc, planned/unimplemented blueprint, legacy but still referenced, orphaned candidate, archive-only historical record, QA artifact / screenshot / temp output. If classification is uncertain, mark it **ambiguous** and do not move it.

34. **No Blind Cleanup Rule (MANDATORY)** — No file may be archived, moved, or deleted until imports/references are grep-checked, route mounts/usages are checked where relevant, and Sean's explicit approval is obtained for the cleanup execution. Fresh-chat cleanup is non-destructive by default. Never auto-clean by assumption. The phrases "safe to delete," "guaranteed deletable," and "nothing to lose" are forbidden — use "likely deletion candidate pending Phase 2 approval," "appears unreferenced based on current grep," or "requires final reference check before destructive action."

35. **Root Directory Minimalism Rule (MANDATORY)** — The repo root stays intentionally lean. `CLAUDE.md` and `ACTIVE-INDEX.md` are the two operating files at root. Root-level screenshots, QA exports, temp logs, ad hoc markdown notes, and one-off artifacts should not accumulate indefinitely at root. But: do not move blindly. Classify first (rule 33), propose relocation into existing archive/QA folders (or a new approved structure), then execute only after approval.

36. **Repo Index Requirement (MANDATORY)** — Maintain a lightweight index at `ACTIVE-INDEX.md` (repo root) that tells future sessions where active, planned, and archived material lives. The index must distinguish: active operating docs, active handoff docs, compact references, planned/unimplemented blueprints, archives (and what's in each), QA artifact locations. Target read time: under 2 minutes.

37. **Cleanup Execution Is a Separate Pass (MANDATORY)** — Protocol creation/inventory and physical cleanup are separate passes. Do not mix new feature implementation, bug fixing, and repo cleanup in the same unbounded task unless explicitly approved by Sean.

38. **Post-Task Hygiene Check (MANDATORY)** — At the end of any substantial task, report whether the work created new temp artifacts, new screenshots, new debate docs, or new obsolete files. If yes, add them to the cleanup backlog or archive plan explicitly.

39. **Artifact Recurrence / .gitignore Rule (MANDATORY)** — If a hygiene scan identifies a recurring temp/log/build-artifact class (e.g. `combined.log`, `tsc-errors.txt`, ad hoc root `.png` QA dumps), Claude must propose the matching `.gitignore` update in the same cleanup plan so the same clutter does not repopulate the repo root after cleanup. The `.gitignore` proposal is part of Phase 1 planning output; the actual `.gitignore` edit happens only with Sean's explicit approval in Phase 2.

## Dual-Pass Fix/Review Discipline (MANDATORY)
Use this on every bug fix, production incident, and code review unless Sean explicitly narrows scope to implementation-only or debate-file-only.

1. **Start from the real caller path, not the isolated component.**
   Trace: UI trigger -> hook/context/state -> transport/API client -> env/proxy/service worker -> backend route/service -> response -> rendered result.
2. **Fix the root cause, not just the nearest symptom.**
   Distinguish transport-layer fixes from caller/UI-path fixes. A local patch is not enough if the runtime path still fails.
3. **Assume the first fix is incomplete until disproven.**
   After implementing, switch into hostile reviewer mode and try to break the fix.
4. **Required hostile review checklist**
   - stale state / race conditions
   - null/undefined/type mismatches
   - wrong route/base URL/env/proxy/service worker/deploy drift
   - auth/header/permission mismatches
   - mobile overflow / squeezed UI
   - keyboard/focus/touch target issues
   - nested interactive elements / invalid DOM
   - import/path mistakes
   - happy-path-only logic
5. **Verification is mandatory before saying "fixed."**
   Prefer a failing regression test first. If that is not feasible, explicitly say why and verify from the real entry path instead of a local happy path only.
6. **Reporting style: blockers first.**
   Report blockers/findings first, then what was verified, then residual risk. Never claim success without naming the exact caller path that was checked.
7. **Reasoning discipline**
   State the implementation assumption, the runtime path checked, and the specific failure mode being disproven. Do not hand-wave with "should be fixed" or "looks good."

## Definition of Done by Task Type (MANDATORY)
- **Bug fix**
  - Identify root cause and the actual caller path.
  - Write a targeted failing regression test first when feasible, or explicitly say why not.
  - Verify the exact failing path after the fix.
  - Search for sibling call sites that can fail the same way.
- **UI fix**
  - Verify desktop and mobile layout, wrap/overflow, 44px targets, keyboard/focus behavior, and no nested interactive elements.
  - If the UI depends on data, verify loading, empty, and error states too.
- **Design/redesign**
  - Verify the page has an intentional visual direction, not a generic/template look.
  - Verify hierarchy, spacing rhythm, typography, surfaces, CTA clarity, and one signature visual moment.
  - Verify the responsive audit matrix below, especially `320px`, `414px`, and the user's real device class when known.
  - Run a hostile design critique pass and improve the weakest visual area before declaring completion.
- **API/Auth/Socket/Deploy fix**
  - Verify route mount, auth headers, env/base URL, proxy/rewrite, service worker, and the frontend caller path together.
  - Distinguish a source-code fix from deployment/runtime config drift.
- **Data-fetch/State fix**
  - Verify loading, success, empty, error, stale-after-failure, refetch, and filter-change behavior.
- **Library/framework change**
  - Verify against the installed version and at least one working in-repo example before claiming correctness.

## Premium Design Critique Loop (MANDATORY)
Use this on every new page, redesign, landing page, dashboard surface, and any visible UI change unless Sean explicitly asks for a bare utility/admin patch only.

1. **Establish a visual direction before coding.**
   Pick the page's mood, hierarchy, density, typography strategy, surface treatment, and motion language. Do not default to safe template composition.
2. **Build a first pass with a signature moment.**
   Each page needs at least one memorable visual move: distinctive silhouette, layered atmosphere, editorial type contrast, premium card architecture, or a deliberate motion beat.
3. **Run a hostile design critique pass before stopping.**
   Try to prove the design is generic, tacky, flat, crowded, or inconsistent. Fix the weakest areas before declaring it done.
4. **Required design critique checklist**
   - generic/template feel
   - weak hierarchy or unclear CTA
   - inconsistent spacing rhythm
   - cheap-looking shadows, borders, or icon treatment
   - flat backgrounds with no depth or atmosphere
   - unreadable density or squeeze on mobile
   - motion that feels dead, noisy, or excessive
   - weak contrast or muddy dark-mode presentation
   - acceptable-but-not-premium components
5. **Required responsive audit matrix**
   - `320px` minimum handset
   - `375px` small iPhone
   - `414px` iPhone XR / Plus-class portrait
   - `768px` tablet portrait
   - `1024px` tablet landscape / small laptop
   - `1280px` laptop
   - `1440px` desktop
   - `1920px` 1080p desktop
   - `2560px` QHD / scaled 4K desktop
   - `3440px` ultrawide
6. **Gemini design handoff rule**
   If Gemini provides the concept, Claude must preserve the direction but still critique implementation fidelity, hierarchy, spacing, responsiveness, and polish. Gemini direction is not a substitute for production QA.
7. **Reporting style**
   Name the design weaknesses found, what was improved, and which viewport widths were actually checked.

## Key Directories
- `frontend/src/components/` — React components (styled-components, NO MUI)
- `backend/routes/` — Express API routes
- `backend/models/` — Sequelize models (PostgreSQL)
- `docs/ai-workflow/` — AI coordination docs, blueprints, handoffs, references

## Active Continuity Handoffs
- `docs/ai-workflow/AI-HANDOFF/SWAN-STUDIOS-VISION-CONTINUITY-HANDOFF-2026-04-11.md` — broader Swan Studios product vision, revenue priorities, premium-gating intent, and sequencing
- `docs/ai-workflow/AI-HANDOFF/SWAN-COACH-CONTINUITY-HANDOFF-2026-04-11.md` — Swan Coach phase history, verified command-lane status, blocked areas, and next-slice logic

## Co-Orchestrator Hierarchy
- **Opus 4.6 (CEO)** — FINAL authority on ALL decisions. Overrides everyone.
- **Gemini 3.1 Pro (CTO)** — Lead Design Authority. Authoritative on aesthetics, Opus can override.
- **Sonnet 4.6 (VP Eng)** — Premium code quality. Used in AI Village debates.
- **Design execution rule:** Gemini may set the vision, but Claude must still run hostile design critique, responsive QA, and production-fidelity review before ship.
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

- Prefer compact refs in `docs/ai-workflow/references/` over heavyweight docs in `AI-Village-Documentation/`
- Read `AI-Village-Documentation/validation-prompts/latest/summary.md` before any full validation report or debate transcript
- Never load `archive/`, `full-report.md`, old onboarding prompts, or the full handbook by default
- Use exact-file prompts with exact questions and expected output format to avoid broad context waste

## Source of Truth & Load Order (MANDATORY)
1. `CLAUDE.md` is the root operating index, paired with `ACTIVE-INDEX.md` (repo root) as the compact surface/archive map for "where does X live" questions.
2. `docs/ai-workflow/references/*.md` are the compact source-of-truth refs. Load only the exact topic doc needed.
3. Then read the exact task files, implementation files, or debate file in scope.
4. For AI Village work, read `AI-Village-Documentation/validation-prompts/latest/summary.md` first, then only the failing or relevant track reports.
5. For cross-AI sessions, prefer `AI-Village-Documentation/AI-VILLAGE-BOOTSTRAP-PROMPT.md` over the full onboarding prompt.
6. Heavy docs stay cold unless the task is explicitly about them: `AI-Village-Documentation/AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V5.md`, `AI-Village-Documentation/archive/retired-prompt-surface-2026-04-09/*`, `AI-Village-Documentation/validation-prompts/archive/*`, `full-report.md`.
7. Archives are reference-only, never default reading.
8. Side-project, internal-only, or experimental plans are never part of default context unless Sean explicitly requests them by name.
9. If docs conflict: `CLAUDE.md` > compact reference doc in `docs/ai-workflow/references/` > current task/debate file > latest validation outputs > heavyweight handbook/onboarding docs > archives.

## Reference Docs (Read ONLY when needed for current task)
| Topic | File | When to Read |
|-------|------|-------------|
| Blueprint Protocol | `docs/ai-workflow/references/BLUEPRINT-PROTOCOL.md` | Creating/editing components >100 lines |
| Documentation Standard | `docs/ai-workflow/references/DOCUMENTATION-STANDARD.md` | Creating new files |
| NASM OPT Protocol | `docs/ai-workflow/references/NASM-OPT-PROTOCOL.md` | Workout/exercise features |
| Gamification System | `docs/ai-workflow/references/GAMIFICATION-SYSTEM.md` | Gamification features |
| Chart Analytics | `docs/ai-workflow/references/CHART-ANALYTICS-SYSTEM.md` | Chart/analytics work |
| Social Platform | `docs/ai-workflow/references/SOCIAL-PLATFORM.md` | Social features |
| AI Village (15-Brain) | `docs/ai-workflow/references/AI-VILLAGE-SYSTEM.md` | Running validation |
| Dashboard Architecture | `docs/ai-workflow/references/DASHBOARD-ARCHITECTURE.md` | Dashboard page work |
| Dashboard Vision Brief | `docs/ai-workflow/references/SWANSTUDIOS-DASHBOARD-VISION-BRIEF.md` | Aligning user, client, trainer, and admin dashboard IA, tab compaction, Swan Coach placement |
| UI Redesign Workflow | `docs/ai-workflow/references/UI-REDESIGN-WORKFLOW.md` | UI redesign tasks |
| Privacy Proxy | `docs/ai-workflow/references/PRIVACY-PROXY.md` | AI/PII features |
| Design System Handoff | `docs/ai-workflow/references/DESIGN-SYSTEM-HANDOFF.md` | Design/styling specs |
| Execution Roadmap | `docs/ai-workflow/references/SWANSTUDIOS-EXECUTION-ROADMAP.md` | Product sequencing, anti-scatter prioritization, dictation-first operating model |
| Swan Coach V1 Spec | `docs/ai-workflow/references/SWAN-COACH-V1-SPEC.md` | Swan Coach scope, command model, permissions, dictation-first execution |
| Swan Coach V1 Impl Roadmap | `docs/ai-workflow/references/SWAN-COACH-V1-IMPLEMENTATION-ROADMAP.md` | Swan Coach build phases, file map, acceptance criteria, rollout order |
| Swan Coach Sprint A Checklist | `docs/ai-workflow/references/SWAN-COACH-SPRINT-A-ACCEPTANCE-CHECKLIST.md` | Pass/fail review target for shell unification, command routing, inline confirmations, and execution results |
| Site Transformation Prompt | `docs/ai-workflow/references/SWANSTUDIOS-SITE-TRANSFORMATION-PROMPT.md` | Piece-by-piece premium site modernization |
| Theme Compatibility | `docs/ai-workflow/references/THEME-CHANGER-COMPAT.md` | Theme/CSS variable work |
| Build Hardening | `docs/ai-workflow/references/BUILD-HARDENING.md` | Pre-commit review |
| Anti-AI-Tells | `docs/ai-workflow/references/ANTI-AI-TELLS.md` | UI component design |
| Visual Diff Loop | `docs/ai-workflow/references/VISUAL-DIFF-LOOP.md` | UI QA screenshots |
| File Cleanup | `docs/ai-workflow/references/FILE-CLEANUP-PROTOCOL.md` | Cleanup tasks |
| Repo Hygiene Protocol | `docs/ai-workflow/references/REPO-HYGIENE-PROTOCOL.md` | **MANDATORY** — before refactors, audits, route-tracing with competing surfaces, or fresh sessions where the repo feels cluttered. Drives rules 32-39. |
| Auto Research | `docs/ai-workflow/references/AUTO-RESEARCH.md` | Running skill optimization |
| App AI Hive Mind | `docs/ai-workflow/references/APP-AI-HIVE-MIND.md` | AI chat features |
| Hermes + Wiki + Mythos | `docs/ai-workflow/references/HERMES-WIKI-MYTHOS-MASTER-PLAN.md` | AI command center, Hermes Agent, Karpathy Wiki, Mythos planning |
| Plaud Audio Intelligence | `docs/ai-workflow/references/PLAUD-AUDIO-INTELLIGENCE.md` | Voice logging, Plaud NotePin, audio import, transcript parsing, session recap |
| OpenClaw (SUPERSEDED) | `docs/ai-workflow/references/OPENCLAW-PLAN.md` | SUPERSEDED by Hermes plan — kept for reference only |
| Skills Reference | `docs/ai-workflow/references/SKILLS-REFERENCE.md` | Skill management |
| 3-Tier Workflow | `docs/ai-workflow/references/THREE-TIER-WORKFLOW.md` | Choosing dev workflow tier |
| R2 Video Migration | `docs/ai-workflow/references/R2-VIDEO-MIGRATION.md` | Adding/troubleshooting videos, R2 setup |
| Recursive Planning | `docs/ai-workflow/references/RECURSIVE-PLANNING-PROTOCOL.md` | **MANDATORY** — read before ANY implementation task |

## Opus-Codex Recursive Debate Protocol (MANDATORY)
- **Debate directory:** `docs/ai-workflow/AI-HANDOFF/`
- **Archive:** `docs/ai-workflow/AI-HANDOFF/debate-archive/` (completed debates)
- **Purpose:** Claude (Opus) and Codex debate plans/fixes recursively until consensus
- **Flow:**
  1. Claude writes analysis/plan/AI Village results into a **per-phase debate file** (e.g., `OPUS-CODEX-DEBATE-TIER1-2026-04-07.md`)
  2. Claude asks Sean: "Would you like Codex to review this?" — **Sean decides yes or no**
  3. If yes: Claude provides Sean a prompt to give Codex, pointing to the debate file
  4. Sean pastes Codex's response back to Claude (or notifies file was updated)
  5. Claude reads Codex's response, writes Round N reply into the debate file
  6. Repeat until BOTH parties write "CONSENSUS REACHED"
  7. Final consensus becomes the implementation plan
- **Token Management (MANDATORY):**
  - **One debate file per phase/tier** — NEVER append to a multi-thousand-line mega-file
  - **On CONSENSUS REACHED:** Move full transcript to `debate-archive/`, replace original with a <30 line summary (outcomes + key decisions only)
  - **Max file size:** If a debate file exceeds 500 lines mid-debate, summarize earlier rounds in-place (keep last 2 rounds full, compress older rounds to bullet summaries)
  - **Codex prompt must say:** "Read ONLY this debate file" — never point Codex at the archive
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

## Open Items — Session Continuity Index
> Read the linked handoff docs for full context. This section is the quick-reference only.
> Full vision: `docs/ai-workflow/AI-HANDOFF/SWAN-STUDIOS-VISION-CONTINUITY-HANDOFF-2026-04-11.md`
> Swan Coach command state: `docs/ai-workflow/AI-HANDOFF/SWAN-COACH-CONTINUITY-HANDOFF-2026-04-11.md`

### Swan Coach Command Lane (ACTIVE TRACK)
- **v1–v14 CONFIRMED LIVE** (repo-verified 2026-04-11): 20 commands live, commandDispatcher.mjs 214 lines
- **v15 NEXT** → `view_available_slots` — clean read, no destructive risk, builds on v14 availability work
- **Blocked/deferred:** `set_availability` (full-week destructive replace), `reschedule_session` (409 conflict path), `schedule_session` (wrong semantics in live code), `FRONTEND_DISPATCH` (browser-local state)
- **After v15:** trainer workout logging → client dashboard visibility audit (revenue-critical proof-of-value chain)
- **After trainer workflow:** PLAUD transcript ingestion → Swan Coach logging, then premium gating/tier alignment

### Hermes on Raspberry Pi (BLOCKED — SSD POWER)
- **Done:** Telegram bot running as systemd service, dense Swan Coach system prompt, google-genai SDK with 3-model fallback, systemd auto-restart
- **Pi model in use:** whichever `models/gemini-2.5-flash` variant responded (fallback to `gemini-flash-latest`)
- **BLOCKER — SSD power issue:** All SSDs tested were running too slow / crashing when connected directly to Pi 4 USB port. Pi USB does not supply enough power for full SSD speed. Currently running on SD card which WILL fail eventually.
  - **Resolution:** Need a **powered USB hub** (one that has its own power adapter AND connects to Pi). Sean already owns a USB hub but can't locate the power cord. Once found → plug SSD into powered hub → plug hub into Pi → USB-boot from SSD.
  - When ready: re-image SSD, re-run setup. DO NOT re-setup on SD card again — do it right once.
  - **Remind Sean** when he returns to Pi work: find the USB hub power cord first, confirm it's a powered hub (not bus-powered), THEN proceed.
- **Still needed after SSD is resolved:**
  - Karpathy Wiki directory structure on Pi (`~/karpathy-wiki/`)
  - Connect Swan Coach Telegram bot to SwanStudios production DB for real client data reads
- **Full plan:** `docs/ai-workflow/references/HERMES-WIKI-MYTHOS-MASTER-PLAN.md`

### Storefront Packages (PENDING CONFIRMATION)
- **Seeder corrected 2026-04-11** → 5 packages, $175/session flat (NO volume discounts), 30-min 10-pack $110
- **NEEDS:** Run `FORCE_RESEED=true node seeders/20260407-seed-storefront-packages.mjs` in Render shell to wipe bad data
- **Unresolved:** `/api/cart/add` returning 404 in production — not yet root-caused
- **Packages:** Single ($175) · 3-Month ($8,400) · 6-Month ($16,800) · 12-Month ($33,600) · 30-min pack ($1,100)

### Deferred UI / Code Quality
- `MeasurementEntry.tsx` — 300-line refactor into sub-hooks (not a bug, safe to defer)
- `ActivitySection.tsx` — all violations fixed and committed 2026-04-11 ✓
- `StorefrontItem.mjs` Sequelize validator bug — fixed and deployed 2026-04-10 ✓

### Content Studio — Seedance 2.0 + Exercise Videos (ACTIVE GOAL)
- **Goal:** Create exercise demo videos with anatomy overlays — muscle activation highlighted as Sean performs perfect-form reps
- **Seedance skill installed 2026-04-11:** `.agents/skills/seedance-swan-video/skill.md` — invoke with `/seedance-swan-video`
  - 3 output types: website hero loop, exercise demo (with anatomy overlay markers), brand film
  - Scroll-sync variant (Section 5) for scroll-activated video like Apple product pages
  - Full anatomy overlay integration notes (ElevenLabs narration + composited muscle highlight layer)
- **AI Village refinement PENDING** — skill was written from first principles; schedule a planning/research Village run next session to research Seedance 2.0 prompt engineering best practices and refine
- **Workflow:** NanoBanana/key.ai for reference image → Seedance 2.0 (via key.ai API or interface) → Claude Code for website integration → anatomy overlay in post (Capcut Pro / DaVinci)
- **Scroll-activated video technique** (from YouTube research 2026-04-11): Extract frames from video → map to scroll position → `<canvas>` + `requestAnimationFrame`. Claude Code can do this end-to-end from a video file. Very high priority for homepage hero.
- **Full plan:** `docs/ai-workflow/references/PLAUD-AUDIO-INTELLIGENCE.md` (content side) + new Seedance skill

### Claude Code Skills — Status (2026-04-11)
- **32 skills from skills.sh** installed via `.agents/skills/` → symlinked into `.claude/skills/`
- **Official Claude Code plugin (`/frontend-design`)** — `installed_plugins.json` is EMPTY. NOT installed yet.
  - The `frontend-design` you see is the skills.sh community version — good but different
  - **ACTION NEEDED:** Open Claude Code terminal → type `/plugins` → search `frontend-design` → install globally. This gives plan-mode-specific first-party design intelligence on top of the skills.sh version
  - Also check `/plugins` for any other first-party plugins you may be missing (look for `ui`, `react`, `accessibility`)
- **New skill added:** `seedance-swan-video` — Seedance 2.0 video prompt builder with exercise anatomy support

### Business Priority Order (do not scatter)
1. **Now:** v15 `view_available_slots` Swan Coach slice → verify end-to-end
2. **Then:** trainer workout logging → client dashboard visibility (retention/upsell proof)
3. **Then:** chart/KPI truthfulness audit (workout, weight, measurements, schedule)
4. **Then:** PLAUD voice transcript ingestion → Swan Coach log_workout
5. **Then:** Swan Coach premium gating aligned to package tiers
6. **Then:** client dashboard audit → user/social dashboard audit → broader site polish
