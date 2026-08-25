# AGENTS.md - Codex Operating Mirror for SwanStudios

> ## ⛔ EVERYTHING BELOW THE MIRROR MARKER IS A GENERATED ARTIFACT — DO NOT EDIT IT
>
> Only the adapter header (this section, above `--- project-doc mirror from CLAUDE.md ---

# CLAUDE.md - SwanStudios Project Intelligence

## Identity
SwanStudios (SS-PT): Production personal training SaaS on Render (sswanstudios.com).
- **Stack:** React 18 + TypeScript + styled-components (frontend), Node.js + Express + Sequelize + PostgreSQL (backend)
- **Theme:** Enchanted Apex: Crystalline Swan (dark-first, frozen enchanted forest + deep-ocean luxury vault)
- **RETIRED:** Galaxy-Swan theme (`#0a0a1a`, `#00FFFF`, `#7851A9`) — do NOT use

- **⚠ PARALLEL AI CODING (PERMANENT — Sean works with multiple agents 24/7, not a temporary arrangement):** You are almost never the only agent in this repo. Typical live state is **4-8 concurrent sessions across ~184 worktrees** — several Claude sessions, Codex, cloud agents. Most collisions are **Claude↔Claude**, not Claude↔Codex. **Run `node scripts/lane.mjs digest` at session start and before your first edit** — it is the one command; do NOT read `claude.lane.md`/`codex.lane.md` by name, those are stale relics and per-session lanes are named `<agent>--<worktree>-<hash>-s<session>.lane.md`. **When another agent holds what you need, TALK TO THEM in `.ai-workflow/coordination/review-queue.md` — that is the comms channel, and using it is the expected first move, not escalating to Sean.** Read their committed work and handoff docs BEFORE forming your own plan; theirs may already override it. Full: **Rule 67** + the `agent-lane` skill + `docs/ai-workflow/references/AI-PAIR-CODING-PROTOCOL.md`.

- **Priority:** SwanStudios production work is the default priority. Side projects, internal experiments, and non-SwanStudios plans are out of scope unless Sean explicitly names them. Hermes (Sean's internal Pi+Telegram operator bridge) is in scope only when Sean explicitly connects it to SwanStudios operator/coding/continuity work or names it as the active task. Do not blur public in-app Swan Coach with Sean-only Hermes Operator Mode — see `docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md`.

## Four-C Router (second brain — where everything lives)
> Navigation layer (Nate Herk "CLAUDE.md = router" model). This points to content that lives elsewhere in this file and the repo — it does not restate it. **Tool-agnostic:** AGENTS.md carries the identical map so Codex and Claude orient the same way. Fresh-session orientation: read this router → `ACTIVE-INDEX.md` → `.ai-workflow/continuity/rolling-last-done.md` (per the Source-of-Truth load order below).

- **C1 — Context** (who/what we are): Identity + Product Core Loop + Active Palette (above); the MANDATORY rules + dual-pass disciplines (below); vision/strategy in `docs/ai-workflow/references/` (BEST-IN-CLASS-TRAINING-APP-STRATEGY, SWANSTUDIOS-FULL-VISION, SWANSTUDIOS-MASTER-PROMPT) and `AI-HANDOFF/`. **Orient here first**, then `ACTIVE-INDEX.md` + the continuity bridge.
- **C2 — Connections** (live data the brain reaches): LIVE = Render PostgreSQL, Cloudflare R2, `scripts/consult-gemini.mjs`/`consult-codex.mjs`, Hermes bridge (Sean-only, gated), Swan Oracle/SerpAPI. PLANNED (Stripe-read, calendar, accounting, Plaud, wearables) → `docs/ai-workflow/references/FOUR-C-CONNECTIONS-CADENCE-ROADMAP.md`.
- **C3 — Capabilities** (what we can do): repo-local skills discovered by `node scripts/ai-workflow/validate-skill-registry.mjs`, AI Village (`scripts/validation-orchestrator.mjs`), repo `scripts/`.
- **C4 — Cadence** (runs on trigger/schedule, not just manually): LIVE = continuity bridge, pre-commit secret scan, `prompt-watcher` UserPromptSubmit hook (rule 66). PLANNED (nightly admin briefing, stale-client alert, deploy-health watch) → same roadmap doc. Automation must earn trust: keys-not-prompts, owner, kill switch (rule 48/50).

## Fable Control Layer (added 2026-07-03 - canonical routing for agents & operators)
- **Fable usage policy:** when to spend Fable vs Codex/Claude/Hermes/Village -> `docs/ai-workflow/references/FABLE-WORKFLOW-INTEGRATION-SPEC.md`
- **Agent workflow router:** clear vs foggy work, goal contracts, workspace isolation, guided setup, decision discipline, and third-party skill intake -> `docs/ai-workflow/references/AGENT-WORKFLOW-ROUTER.md`
- **Fable token-economy / context compression:** startup-visible cost-control rule for bulky Fable context; compact tool output, semantic-compress safe handoffs, query large logs, run the local estimator before image-rendered context, and keep unreviewed API/base-URL proxies blocked -> `docs/ai-workflow/references/FABLE-CONTEXT-COMPRESSION-PROTOCOL.md`
- **Fable-mode portable discipline + model/effort routing (rule 71):** the Fable method as a loadable skill for fallback Final Deciders (five gates + standing habits) + the cost/intelligence/taste routing table (orchestrator-smart / executor-cheap) for subagent fleets -> `.claude/skills/fable-mode/SKILL.md`; consult review + ARMS/Four-C second-brain gap analysis -> `docs/ai-workflow/AI-HANDOFF/HERMES-OS-SECOND-BRAIN-CONSULT-REVIEW-2026-07-07.md`
- **Hermes / SwanStudios boundary + T0-T4 command effect tiers** (T0 read; T1 draft; T2 bounded internal write; T3 external-visible; T4 destructive/financial/irreversible; T3/T4 = explicit approval + audit receipt; T4 is human-executed) -> `docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md`
- **AI skill & operator registry** (who owns what, at which tier; unregistered command = BLOCKED; deterministic-vs-agentic boundary) -> `docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md`
- **Hermes Agentic OS** (workflow-audit -> skills -> automations -> loops -> memory -> command center -> distribution; approval gates, audit receipts, kill switches, channels, headless runner) -> `docs/ai-workflow/hermes-agentic-os/index.md`
- **Design Brain** (callable design system; `design.md` is canonical and the sole canonical copy — the `design.html` mirror was retired 2026-08-16; adapters per agent; website archetypes; cinematic factory; QA gates) -> `docs/ai-workflow/design-brain/index.md`. Subordinate to `SWAN-CINEMATIC-DESIGN-SYSTEM.md`; loaded by `swan-design-router`.
- **AI Village modes** (LIGHT/FULL/HOSTILE/DESIGN/SAFETY_GOVERNANCE/PRODUCT/IMPLEMENTATION/AGENTIC_OS/GRAPHIFY_OBSIDIAN/FABLE_WORKFLOW; paid modes stay rule-16 gated) -> `docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/130-fable-ai-village-review-packet.md`
- **Browser Harness:** read-only by default; supervised admin audits (human authenticates, harness observes); any interaction = per-run approval + receipt (bridge section 6).
- **Obsidian/Karpathy routing + Graphify quarantine:** raw/wiki/outputs/runs/graph-imports/references/templates, index.md law, quarantine-first imports -> `docs/ai-workflow/design-brain/obsidian/` + `docs/ai-workflow/design-brain/graphify/` + `docs/ai-workflow/hermes-agentic-os/memory-and-state.md`
- **Naming note:** "Paybolt" was a 2026-07 transcription error for "Fable" - it is not canonical anywhere and must not be reintroduced (see `docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/101-paybolt-mishearing-cleanup.md`).


## Product Core Loop
SwanStudios is workout-progress-first. The main product loop is: log the workout -> save the workout diary entry -> turn it into charts/progress proof -> help the user, trainer, and admin decide the next training action -> make meaningful milestones shareable with the community.

- **User dashboard priority:** Home is first, then workout/progress visibility must be immediately reachable. Do not bury Progress below secondary social/profile surfaces. Dashboard work should make workout logging, chart review, streak/progression feedback, and community sharing feel addictive, low-click, and visually rewarding.
- **Trainer dashboard priority:** Trainers need fast client workout logging, reviewable workout history, progress charts generated from real logged data, and low-friction plan adjustments. Trainer features that do not improve this coaching loop are secondary unless Sean explicitly prioritizes them.
- **Admin dashboard priority:** Admin needs proof-of-value visibility across clients: who trained, what changed, what is stale, what needs intervention, and what progress can be celebrated or shared. Admin UI should surface workout/progress truth before decorative or low-revenue features.
- **Data truth rule:** Workout charts must come from real workout logs/sessions whenever possible. Mock progress data is a placeholder only and should be treated as a gap to replace.
- **Best-in-class strategy:** SwanStudios is a trainer-led B2B2C operating system, not a generic fitness social network. The product combines coach workflow depth, first-party workout/progress data, AI-assisted accountability, payments, and community belonging around one canonical user/client record. Full compact strategy: `docs/ai-workflow/references/BEST-IN-CLASS-TRAINING-APP-STRATEGY.md`.

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

## Swan Card/Button Standard
- The attached `SwanStudios Store Card -Handoff-.html` defines the house card/button direction: sapphire deep-gradient section backdrops, SheenCard-style chrome borders, GlowButton-style 44px+ controls, Frost White text, Ice Wing + Wing Purple glow discipline, and reduced-motion fallbacks.
- store/showcase cards may use the full animated SheenCard/GlowButton treatment, including metallic sheen and premium glints, when the card is meant to sell, feature, or showcase.
- Client/data cards must use the same geometry, dark blue gradient surface, chrome edge, pill/metric/button language, and clear focus states, but stay low-motion: no pointer tracking, no heavy animation loops, no hover-only actions, and no hidden controls.
- Client, trainer, admin, biometrics, program, measurement, and workout-log cards must preserve all available useful data without duplicating the same fact in multiple places. Prefer compact grouped facts, 44px icon buttons, and responsive wrap/stack behavior over dense text blocks.
- Any client-management surface must be checked at phone width before completion. On mobile, cards, tabs, buttons, biometrics, measurements, programs, and action rows must not overlap, clip critical text, or require hover to operate.

## Karpathy Coding Principles (cross-cutting; bias toward caution over speed)

These four principles distill common LLM coding pitfalls (per Andrej Karpathy's 2026 observations on agent failure modes, codified by `forrestchang/andrej-karpathy-skills`). They cross-cut the numbered MANDATORY rules below; the framing here is a memory aid for application.

1. **Think Before Coding.** Don't assume. Don't hide confusion. Surface tradeoffs. State assumptions explicitly. If multiple interpretations exist, present them — don't pick silently. If ambiguity affects behavior, security, or data and cannot be resolved from repo context, stop and ask. *(Reinforces: Rule 15 recursive planning, Rule 51 confidence tags, Rule 52 anti-rework burden of proof.)*
2. **Simplicity First.** Minimum code that solves the problem. Nothing speculative. If you write 200 lines and it could be 50, rewrite it. Self-check: "would a senior engineer say this is overcomplicated?" If yes, simplify. *(Reinforces: Rule 4 line cap, Rule 18 existing-pattern-first.)*
3. **Surgical Changes.** Touch only what you must. Don't "improve" adjacent code, comments, or formatting. Don't refactor what isn't broken. Match existing style even if you'd do it differently. If you notice unrelated dead code, mention it — don't delete it. The test: every changed line should trace directly to the user's request. *(Reinforces: Rule 20 sibling sweep stays narrow, Rule 37 cleanup-is-separate-pass.)*
4. **Goal-Driven Execution.** Define success criteria. Loop until verified. Transform tasks into verifiable goals: "add validation" → "write tests for invalid inputs, then make them pass." "Fix the bug" → "write a test that reproduces it, then make it pass." Strong success criteria let you loop independently; weak criteria ("make it work") require constant clarification. *(Reinforces: Rule 17 dual-pass, Bugfix standard, test-driven-development skill.)*

Trivial polish tasks may bypass formal planning overhead using judgment, but surgical scope, safety, and evidence requirements still apply. Anything that touches production data, security, auth, billing, shared infrastructure, or PII gets no bypass at all.

## Prompt Reconstruction + Hostile Review Protocol
Before creating anything substantial (docs, specs, plans, code slices): reconstruct the goal, audit the prompt, identify weak assumptions, improve the prompt/plan, execute the improved version, prove completion with evidence. Give the why; say what NOT to do; act when enough information exists; say less where possible; never reveal or request private reasoning.
Full protocol: `docs/ai-workflow/references/PROMPT-RECONSTRUCTION-HOSTILE-REVIEW-PROTOCOL.md`.

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
12. **REPEALED 2026-08-20 by Sean.** The former "no Grok/X-AI models" prohibition is deleted and carries no force. Grok/X-AI models are permitted, on the same footing as any other paid seat: Rule 16's spend gate and the standing "disclose worst-case spend first, cap it, never auto-retry" discipline still apply to them, as they do to Kimi and Sol. The slot is kept as a tombstone rather than renumbered because 99 numbered rules and 109 documents cite rule numbers; renumbering would invalidate all of them. Do not re-add the prohibition.
13. **Commit style:** `type(scope): description` → push to main for Render auto-deploy
14. **7-Star documentation** on all new files — see `docs/ai-workflow/references/DOCUMENTATION-STANDARD.md`
15. **Recursive planning BEFORE building** — NO code without a plan. See `docs/ai-workflow/references/RECURSIVE-PLANNING-PROTOCOL.md`
16. **AI Village (15-brain) requires Sean's permission** - NEVER run without asking. Use Opus (free) or Gemini CTO (cheap) for most planning. Village is for CRITICAL decisions only.
    **COST, from ACTUAL RECEIPTS (corrected 2026-08-14).** **Ten distinct** recorded runs in `AI-Village-Documentation/*/cost-summary.md` (11 files; `latest/` duplicates the newest): **$0.4396, $0.5648, $0.6913, $0.7405, $0.7885, $0.8411, $0.8825, $1.4971, $1.8106, $1.8937 — mean ~$1.01, none over $2.** My own first correction said "eight runs, mean ~$1.10" and had **miscounted the receipts it was citing** — re-count with `find AI-Village-Documentation -name cost-summary.md` and read each TOTAL line before quoting. The old "~$0.33/run" was too low. Quote ~$1–2 and cap at $2.50.
    **DO NOT quote the pre-run gate's estimate to Sean.** It reported "$27 typical / $147 worst case" for a 6.8 KB doc — a theoretical worst case ~25x the highest figure ever actually observed, because it prices debate panels at 7–51 calls each when real runs converge far sooner. It is a safety ceiling, not a forecast. Reading it as a forecast produced a wrong quote to Sean on 2026-08-14; his own lived experience ("it never goes over two dollars") corrected it, and the receipts proved him right.
    **The gate's estimate being ~25x reality makes `SWAN_VILLAGE_MAX_USD` awkward:** a cap set at a realistic $2.50 aborts the run before it starts, because the gate compares its inflated ESTIMATE against the cap. Until the estimator is fixed, either set the cap high enough to clear the estimate (accepting that it no longer bounds anything useful) or use the free tier below. **Fixing the estimator to price against observed history is a real, small, unclaimed slice.**
    **Default to the FREE triangle first** — `node scripts/fusion-triangle.mjs --task "..." --context "..."` runs Claude+Codex+Gemini on flat-rate subscriptions at **$0 marginal API cost** and satisfies most planning needs. Escalate to Village only when the triangle demonstrably was not enough.

17. **Dual-pass completion required** - for bug fixes, production incidents, and reviews, Claude must act as BOTH builder and hostile reviewer before declaring success.
18. **Existing-pattern-first** - before adding or changing a library/API usage, inspect the installed version and at least one working in-repo example. Match the real API, not memory.
19. **No speculative success language** - never say "should be fixed", "likely fixed", or "looks good" without naming the exact verified caller path, test, or command.
20. **Repo-wide sibling sweep required** - when fixing hosts, env vars, routes, auth headers, proxy config, socket URLs, imports, or shared helpers, search for parallel usages and verify sibling paths in the same pass.
21. **Task-type Definition of Done required** - bug, UI, API/auth, state, and production tasks must satisfy the matching checklist below before claiming success.
22. **Premium design standard** - every visible UI must feel enterprise-grade, distinctive, and brand-specific, not generic, tacky, or template-like.
23. **Design dual-pass required** - after building a UI, Claude must critique and improve its own design for hierarchy, polish, responsiveness, motion, and originality before calling it done.
24. **Responsive audit matrix required** - verify layouts against the viewport matrix below, including `414px` for iPhone XR, `2560x1440` for Sean's 1440p/QHD monitor class, and `3840x2160` for 4K. Use CSS viewport widths plus explicit monitor-class dimensions; do not stop at `1920px`.
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

40. **Design work routes through `swan-design-router` by default (MANDATORY)** — All UI/visual work auto-routes through the Swan design router. The router is the only default-exposed design brain. It loads `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` and `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md` as its source-of-truth docs, and treats `frontend-design` + `ui-ux-pro-max` as reference libraries (not co-equal steering brains). The 7 narrow aesthetic skills (`minimalist-ui`, `industrial-brutalist-ui`, `high-end-visual-design`, `design-taste-frontend`, `stitch-design-taste`, `redesign-existing-projects`, `web-design-guidelines`) are **explicit-invocation-only** — they do not steer default design work. For net-new pages and major redesigns, the router's 2-3 concept-direction ideation gate is mandatory before coding; small polish tasks can skip it. See `.claude/skills/swan-design-router/SKILL.md`. The router also loads `docs/ai-workflow/design-brain/` (design.md canonical, sole copy — the design.html mirror was retired 2026-08-16); the Design Brain is subordinate to SWAN-CINEMATIC-DESIGN-SYSTEM.md. **Taste-ceiling doctrine (added 2026-07-22 from the Kimi-K3 scroll-film transcript):** the highest Swan aesthetic tier — ABOVE Mobbin/conventional app-UI reference — is the cinematic scroll-journey. For any net-new **awe** surface (hero/landing/showcase/brand), the router's ideation gate now runs an 8-12-concept **breadth pass** (taste-cut by Sean), at least one direction must open with an **Extreme Macro-Journey** hook (`inside → through → across → out`, SWAN-CINEMATIC-DESIGN-SYSTEM.md §B2.4), and the maximalist option is the **C13 Scroll-Bound Macro Journey** (§C13 — the creative IS the page; scroll drives the video playhead; gates = 60fps scrub + tour mode). Mobbin stays the lane for conventional working surfaces; the cinematic-journey tier is the lane for awe. Production craft: `docs/ai-workflow/design-brain/cinematic-pages.md` §8.

41. **Closeout routes through `closeout-evidence-lock` by default (MANDATORY)** — End-of-task closeout for any substantial task auto-routes through the Swan closeout skill. It enforces the Claim-to-Evidence Lock (rule 28), the dual-pass hostile review (rule 17), the post-task hygiene check (rule 38), and the forbidden-language filter (rule 34). It preserves the full substantive code-review checklist (security, performance, test coverage, breaking changes, conventions) inherited from the retired `requesting-code-review` skill. The `requesting-code-review` skill is **removed from default use** — it depends on a missing `superpowers:code-reviewer` subagent and silently fails. Do NOT dispatch to `requesting-code-review` from any new code path. See `.claude/skills/closeout-evidence-lock/SKILL.md`.

42. **Pre-Push Backend Audit (MANDATORY)** — Before pushing ANY backend change, run BOTH audit commands and commit anything they surface:
    ```bash
    git ls-files --others --exclude-standard backend/   # untracked (crashes Render with ERR_MODULE_NOT_FOUND)
    git diff --name-only HEAD backend/                  # modified-uncommitted (crashes with SyntaxError: does not provide an export named 'X')
    ```
    Both classes of drift crash Render identically at boot. Incident 2026-04-12: a series of crash-loops caused by 10 untracked Swan Coach files + 9 modified-but-uncommitted files whose new exports were missing on the remote. Each check takes under a second — run both every time, no exceptions. Full detail in `docs/ai-workflow/references/BUILD-HARDENING.md` (Backend Rules + Pre-Commit Mental Checklist #7).

43. **styled-components `css` helper required for shared style chunks (MANDATORY)** — Any shared animation, mixin, or style fragment that contains `${}` interpolation AND will be composed into a styled component MUST be wrapped with the `` css`` `` tagged template helper, never a plain JS template string. Plain strings call `toString()` on `keyframes` / helper objects and bake the generated class name into the CSS output, crashing styled-components at mount with error #12 (`An error occurred. Args: <hash>`). The build passes, types check, nothing warns at dev time — it only crashes on mount. Incident 2026-04-12: `AdminOverviewPanel.tsx` `bentoItemAnimation` took down the entire admin dashboard this way. Rule of thumb: if a template literal interpolates a styled-components primitive, it is `` css`` ``, not a plain string. Full detail in `docs/ai-workflow/references/BUILD-HARDENING.md` (React Component Rules + Pre-Commit Mental Checklist #8).

44. **Secret scanning covers writes, not only shell commands (MANDATORY)** — After the 2026-04-19 credential incident, Bash deny patterns are not enough. Before writing or committing any docs, handoffs, scripts, config, or code that may mention credentials, scan the output for API keys, JWTs, DB URLs, PEM/private keys, and known rotated-secret fingerprints. The Codex-caught re-leak was in a Markdown handoff file, not a shell command.

45. **No amend/rewrite without Sean (MANDATORY)** — Do not use `git commit --amend`, `git rebase`, history rewrite, or force-push cleanup to polish a local commit unless Sean explicitly asks for that operation. If a SHA/reference or small mistake is discovered after a commit, make a normal follow-up commit.

46. **Kimi Hostile-Review Gate (MANDATORY for substantial changes) - AMENDED 2026-07-26.** Sean retired Fable as the routine Final Decider because its cost is disproportionate for everyday work. **Kimi K3 is the standard Final Reviewer and commit gate** for substantial plans, implementations, governance changes, and release candidates. **Fable is explicit opt-in only** when Sean specifically requests it; no workflow may silently require or invoke Fable. This amendment supersedes every conflicting active Fable-gate or fallback-decider statement elsewhere in this file.
    1. **Builder builds** - implementation and tests, with a bounded scope.
    2. **Builder verifies and self-attacks** - run the applicable tests, security checks, browser or caller-path checks, backend drift audit, and secret scan.
    3. **Kimi reviews** - provide a bounded privacy-safe packet plus verified evidence. Kimi returns APPROVE / REVISE / REJECT with concrete findings.
    4. **Builder repairs and re-verifies** - REVISE repeats until clean; REJECT returns to planning.

    Sub-rules:
    - A **matching completed Kimi review satisfies the gate** when the reviewed scope or content hash has not changed materially; do not pay to review the same packet twice.
    - Fable absence, quota, or cost never blocks routine work. Fable requires Sean's explicit per-run request.
    - Gemini, Codex, Opus, and other reviewers may provide advisory evidence, but they do not replace Kimi unless Sean explicitly names a replacement.
    - Repo rules and Sean's decisions outrank every model suggestion.
    - AI Village remains a separate Rule-16 spend-gated escalation track.
    - If Kimi is unavailable, stop before commit unless Sean explicitly waives the external gate or names a replacement reviewer.

47. **Supervised Read-Only Launcher Pattern (MANDATORY for all remote/Pi/production work)** — Established 2026-04-25 after the W1.0 manual-command workflow proved too fragile for Sean. Any semi-automated work that touches a remote system (Pi, Hermes, Render, third-party server) MUST run via a local launcher. Long copy-paste shell command sequences are forbidden; Claude does not hand Sean a wall of commands to run by hand.

    **Required launcher properties:**
    - Lives locally at `c:/tmp/<task-name>.ps1` (or `scripts/launchers/<task>.ps1` if persistent).
    - Tees all output to a local Windows file at `c:/tmp/<task-name>.out.txt`. Output path is local-only — never on the remote.
    - Embeds the remote script (typically base64-encoded) and runs it via SSH stdin or single-command argv.
    - Performs redaction at the remote source BEFORE output reaches stdout. Required redactions: 8+ digit numeric IDs → `<REDACTED-NUM>`; emails → `<REDACTED-EMAIL>`; key/token shapes (`sk-`, `sk_live_`, `sk_test_`, `rk_live_`, `whsec_`, `xoxb-`, `AIza`, JWT `eyJ...`, Telegram bot tokens) → `<REDACTED-KEY>`; env values → `KEY=<REDACTED>` or `KEY=<N chars>`.
    - Read-only by default. **No remote writes.** Forbidden remote operations: `tee`, `>`, `>>`, `touch`, `sed -i`, editor saves, `cat >`, `mkdir`, `rm`, `mv`, `cp <to-remote>`, package installs, `git add|commit|push|checkout|reset|rebase`, `systemctl restart|reload|daemon-reload|enable|disable|start|stop`, env file edits, Telegram bot config changes, feature flag toggles, test mode toggles.
    - Prompts Sean for SSH/sudo credentials interactively only. Never embeds passwords, never hardcodes credentials, never reads `.env` files for SSH auth.
    - Exits cleanly. Sean types `done` in chat; Claude reads the local output file and continues the task.

    **Required disclosure before Claude hands Sean a launcher command:**
    - Exact local file paths created.
    - Confirmation the embedded remote script contains zero Pi-write operations (Claude must have grep-checked the script for the forbidden ops above).
    - Confirmation the output path is local Windows only.
    - The STOP rule: if any raw secret (chat_id digits, API key, JWT, email, token shape, password) appears in the output file, Claude halts and tells Sean immediately. Don't continue parsing or filling receipts with leaked output.

    **Why:** 2026-04-25 incident — the W1.0 runtime-layout discovery was first delivered as a 10-step manual command sequence with copy-paste blocks for Sean to run interactively over SSH. Sean called this "too much work on my end and I am not up for it" and required the workflow be revised to a launcher pattern. The fragility of long manual sequences is its own security risk: tired hands paste wrong commands, skip redaction steps, paste raw secrets back into the chat. A launcher pattern enforces redaction at the source, captures output mechanically, and lets Sean focus on credentials only.

    **How to apply:** Any task that says "SSH into the Pi" / "run this on Render" / "check this on the server" → build a launcher first. Show the disclosure block. Then hand Sean one command. Wait for `done`. The W1.0 launcher at `c:/tmp/wiki-w1.0-discovery.ps1` is the canonical first instance.

    **Exception:** A single one-shot read-only command Sean explicitly asks for ("just run `git log` for me on the Pi") is fine without a launcher. The trigger for the launcher pattern is multi-step / multi-section discovery, not one-liners.

48. **Phase Completion Audit Record (MANDATORY at the close of every phase, sprint, feature, fix, or substantial workstream)** — Established 2026-04-25. After any phase is finalized and considered good-to-go, before declaring the work fully done, Claude MUST produce a single self-contained Markdown audit record documenting that phase's files, logic, security posture, best-practices applied, and explicit re-review hooks. The intent is permanent: Sean (or Codex / Gemini / a future AI) returns weeks or months later to look for security gaps, data-leak risks, performance wins, UX improvements, or "loopholes a malicious actor could exploit." Memory is not enough. Skill outputs are not enough. The audit record is the load-bearing artifact.

    **File location + naming:**
    - `docs/ai-workflow/AI-HANDOFF/<PHASE-NAME>-AUDIT-RECORD-<YYYY-MM-DD>.md`
    - Example: `HERMES-WIKI-BRIDGE-W2-AUDIT-RECORD-2026-04-30.md`
    - One file per phase. Self-contained: a future reviewer should be able to read this single file and produce useful security/perf/UX feedback without re-reading 20 other docs.

    **Required sections (in this order):**
    1. **Phase header** — phase name, scope, start/end dates, who reviewed (Codex / Gemini / Village / Sean), final verdict (APPROVED / SHIPPED / SUPERSEDED).
    2. **Files involved** — every file created, modified, or deleted, organized by repo location. Include line counts and one-line purpose for each. New + modified runtime code is the priority; docs/handoffs as supporting context.
    3. **Architecture & runtime flow** — how the feature actually works end-to-end. Diagrams in ASCII or markdown tables are fine. A reader who has never seen the phase should be able to trace UI → API → service → DB → response from this section alone.
    4. **Security logic & posture** — explicit list of every security control: zero-PII patterns used, secret-handling, redaction patterns, allowlists, fail-closed gates, rate limits, audit logs, input validation, path-escape prevention, symlink protections, operator gates, kill switches, env var guards, default-off flags. For each control: WHAT it blocks, WHY it was added, and HOW it can be bypassed if implemented wrong (so future reviewers know what to attack).
    5. **Best practices applied** — explicit reference to which CLAUDE.md rules and which industry standards were followed (e.g. "Rule 6 token-with-fallback; Rule 8 zero PII to LLMs; Rule 26 canonical surface receipt; OWASP A01 access control via fail-closed operator gate").
    6. **Known limitations / non-goals** — what was deliberately NOT done and why. This prevents future reviewers from flagging "missing" features that were intentionally deferred.
    7. **Performance & UX considerations** — minimum clicks, latency budget, mobile responsiveness, accessibility, keyboard navigation, loading/empty/error states. UX choices made and rejected (e.g. "considered modal flow, picked inline confirm because 1 fewer click on mobile").
    8. **Test coverage summary** — what tests exist, what they prove, what was NOT tested and why. Include test file paths.
    9. **Rollback plan** — exact steps to revert this phase if a problem emerges later (kill-switch flag, git revert range, env var to flip, systemd restart command, DB migration to roll back). A reviewer should be able to roll back without paging Sean.
    10. **Future review hooks** — **the most important section.** A bullet list of explicit prompts for the next reviewer: "re-examine the redaction regex against new key formats published since 2026-04," "audit rate-limit window for DoS feasibility," "check if `wiki/clients/` gating still aligns with privacy policy when client count grows past 50," "verify the kill-switch still disables all six tools after future toolset additions." Each hook is one specific thing to look at, not vague handwaving.
    11. **Codex / AI review log** — chronological list of every review pass, verdict, and what changed in response. Captures the dialectic that produced the final state (Rev 1 → Rev 2 → Rev 3 → APPROVE).
    12. **Sign-off** — Sean's explicit "this phase is complete" timestamp, the commit SHA(s) that ship the phase, and the next-action pointer (next phase / parking / monitoring window).

    **When this triggers (mandatory):**
    - Sean says any of: "phase complete," "ship and close," "we're good," "consider this done," "wrap this up," "log this and close."
    - A multi-day workstream merges to `main`.
    - A feature flag is flipped from off to on in production.
    - A security-sensitive change ships (auth, redaction, allowlist, env handling, anything touching PII or credentials).
    - A debate file reaches CONSENSUS REACHED.
    - W1.0 / W1.1 / W2 / W3 / W4 of any plan completes (sprint-style sub-phases also qualify).

    **When this does NOT trigger:**
    - Single-line bug fixes (record in commit message; no audit doc).
    - Trivial doc edits, typo fixes, formatting passes.
    - Mid-phase work-in-progress (the audit record lands at phase CLOSE, not during).

    **Reviewer-friendliness checklist before declaring the audit record complete:**
    - [ ] Could an AI with no prior context find every relevant file from this doc alone?
    - [ ] Is every security control labeled with WHAT/WHY/HOW-IT-BREAKS?
    - [ ] Are the "Future review hooks" specific enough to act on without follow-up questions?
    - [ ] Is the rollback plan executable by someone who didn't build the phase?

    **Why:** Sean's words 2026-04-25 — "I'm always gonna want to come back and analyze and relook at logic and code to make sure that everything is running in best practices to prevent data leaks and security break-ins and hackers… or even just as an overall better way to code the logic so that it could be allowed to run faster… and have better features for the logic which would make everything more convenient and easy to use because we want everything to be as easy to use as possible and we want everything to take the least amount of time as possible and we want everything to have the least amount of clicks as possible." A phase that ships without this artifact is a phase whose security posture cannot be re-audited later — that is unacceptable for a production SaaS handling client PII, payment data, and (via Hermes) family/medical/immigration data.

    **How to apply:**
    - When Sean signals phase close, draft the audit record FIRST, then declare the work done.
    - Land the audit record in `docs/ai-workflow/AI-HANDOFF/`. Add a one-line pointer in `ACTIVE-INDEX.md` if the phase is significant enough to be discoverable from the index.
    - The closeout-evidence-lock skill (rule 41) is the per-task closeout gate; this rule 48 audit record is the per-phase permanent artifact. They are complementary, not duplicative — closeout runs at every task close; the audit record runs at every phase close.
    - Future re-review: Sean re-opens the audit record, runs through "Future review hooks," and either invokes Codex/Gemini/Village or works the items down himself.

49. **No Manual Code Inspection by Sean (MANDATORY)** — Established 2026-04-26. Claude MUST NEVER ask Sean to manually open, read, paste, eyeball, or inspect code from the codebase to answer a structural question about it. If a question can be answered by automated structural analysis — Python `ast` parsing, scoped grep, file inventory, callsite enumeration, return-statement analysis, import graph walk, etc. — Claude builds a narrow Rule 47 supervised read-only launcher that produces a structural digest. Sean's role is to RUN the launcher, not to read the file.

    **Disallowed phrasings (Claude must never produce these):**
    - "please open this file in your editor and tell me what line X says"
    - "manually inspect the function body and confirm whether..."
    - "read lines N-M and report back"
    - "eyeball the code and let me know if..."
    - "could you check that helper and tell me..."
    - "verify by hand that..."

    **Required substitution:** any of the above is replaced with a tiny Rule 47 launcher (`c:/tmp/<task>-<slice>.{ps1,sh,out.txt}`) that uses `ast.parse` / scoped `grep` / file metadata to answer the structural question with redacted, structural-digest-only output (file:line, function names, boolean signals, counts, return-statement analysis). Sean runs the launcher, types `done`, Claude reads the output. Total Sean interaction: one launcher invocation, not a code-reading session.

    **Categories of structural questions answerable by launcher (non-exhaustive):**
    - "What does this function return when env var X is unset?" → AST walk for `Return` nodes inside the function, classify each return value as constant True/False/None or non-literal expression.
    - "Where is helper X called?" → walk all `.py` files (with scoped exclusions), find every `Call` node where the resolved name matches X, output `file:enclosing_function:line`.
    - "Is this gate fail-open or fail-closed?" → walk the function's top-level body, examine early `Return` constants, classify by branch.
    - "How many handlers match pattern Y?" → AST count, no body content.
    - "Does this module import X?" → inspect `Import`/`ImportFrom` nodes only.
    - "Is variable Z set in the running process?" → `/proc/$PID/environ` presence check, value reported as count/length only.

    **Why:** Sean's words 2026-04-26 — "I don't want to ever have to manually inspect code." Manual inspection is slow, error-prone, and creates new risk (Sean copy-pastes code into chat → leaks sensitive content into LLM context, which has caused upstream API content-policy refusals during this session). Launchers are auditable, deterministic, fail-safe, and don't depend on human grep skill or willingness to scroll through unfamiliar files. The W1.0c → W1.0d → W1.0e chain established that any structural question about Hermes runtime code can be answered with a 30-80 line digest from a 50-line launcher.

    **How to apply:** Whenever Claude is about to write a sentence like "could you check..." / "manually verify..." / "read lines X-Y and tell me..." / "what does this function return when..." — STOP, build the launcher instead. Show the disclosure block per Rule 47, hand Sean one command, wait for `done`, read the digest. The only acceptable Sean-as-reader role is for Markdown documentation Claude has produced (where Sean reviews FINDINGS or PLANS, not raw source code).

    **Exception:** Sean may CHOOSE to inspect code on his own initiative — for his own learning, sanity-check, or to volunteer information. That's fine. The rule prohibits Claude from REQUESTING manual inspection as a protocol step. If Sean offers manual inspection unprompted, Claude accepts that input but does not normalize it into a future protocol — the next similar question must still go through a launcher.

50. **Three-Layer QA Pipeline (MANDATORY)** — Every change passes through up to three review/verification layers, picked by scope:
    - **Tier A — Deterministic tooling.** Type-check, linter, formatter, unit/integration tests, secret scan, repo-hygiene scan. Always-on; cheap; runs first.
    - **Tier B — AI cross-review.** The Rule 46 gate: builder builds → builder verifies and self-attacks → **Kimi K3 reviews** (APPROVE / REVISE / REJECT) → builder repairs until clean. Mandatory for substantial changes; not optional. *(Corrected 2026-08-14: this line still described the retired 3-Brain chain with "Codex is final gate" while citing rule 46 — which has named Kimi the standard Final Reviewer since 2026-07-26. It read identically in both constitutions, so no mirror diff could ever surface it.)*
    - **Tier C — AI Village (14-Brain).** Episodic, paid, reserved. Only invoked when one of six binary triggers fires (auth/authz, Stripe webhook, multi-tenant scoping, Sean-declared pre-launch hardening, minor's-data path, cross-service architectural change). Even when a trigger fires, requires Sean's explicit per-run permission (rule 16).

    QA tier (review/verification) is **orthogonal** to workflow path (Fast / Standard / Deploy execution shape). A Fast-Path change still passes Tier-A; a Deploy-Path change passes A + B + (when triggered) C. Full doctrine: `docs/ai-workflow/references/QA-PIPELINE.md`. Workflow paths: `docs/ai-workflow/references/WORKFLOW-PATHS.md`.

51. **Confidence-Tag Discipline (MANDATORY)** — Non-trivial factual or causal claims about the codebase or system behavior carry exactly one tag: `[VERIFIED]` (confirmed by file read, executed test, observed network response, or other reproducible evidence in the current session), `[LIKELY]` (high confidence based on consistent evidence; not directly verified for the current claim), `[HYPOTHESIS]` (reasoned guess; could be wrong; must be verified before acting on it), `[UNKNOWN]` (don't know, haven't checked, no usable evidence yet).

    **Scoping — what these tags do NOT apply to:**
    - **Routine status updates** ("file edited successfully," "test passes," "commit created at SHA abc123").
    - **Tool call results.** Tool output speaks for itself; no tag needed.
    - **Basic acknowledgments** ("understood," "proceeding with the slice you approved," "noted").
    - **Direct file reads quoted with file:line citation** — the citation IS the evidence; the read result is `[VERIFIED]` by construction.

    The tags exist to surface uncertainty about **claims** — assertions that the reader might act on. They are not a label that goes on every sentence. Burying uncertainty inside confident prose ("the storage is likely safe but I'm not sure") = doctrine violation; either tag explicitly or rewrite with concrete evidence. Full doctrine: `docs/ai-workflow/references/REVIEWER-DISCIPLINE.md` Doctrine 5.

52. **Anti-Rework Burden of Proof (MANDATORY)** — Before flagging code as broken, check git history and context. The area is "recently-passed gate" if EITHER condition is true:

    - **Closeout artifact exists:** any file under `docs/ai-workflow/AI-HANDOFF/` whose filename contains the literal substring `CLOSEOUT` (case-insensitive).
    - **Codex APPROVE within 14 days:** file matching `docs/ai-workflow/AI-HANDOFF/OPUS-CODEX-DEBATE-*.md` that names the file/area AND contains literal token `APPROVE` or `APPROVED` AND has filesystem mtime within 14 calendar days.

    If recently-passed-gate, burden of proof to re-flag is HIGH: failing test exercising the actual code path, specific file:line evidence, OR citation of the rule/contract being violated. Sean-relayed external claims ("Codex says X is broken") are treated as `[HYPOTHESIS]` until verified — first response is "Before I change this, I need to verify. What's the reproduction?" Sean may explicitly override the verification gate; the override is on him and the change carries `[UNVERIFIED]` annotation. The 14-day clock is filesystem mtime, not Sean's last-touched-this-conversation date. Full doctrine: `docs/ai-workflow/references/REVIEWER-DISCIPLINE.md` Doctrine 3.

53. **Adjacent-Doc Wording-Class Sweep (MANDATORY for hostile review)** — Established 2026-04-28 after Codex caught the same "read-only" wording contradiction in the Phase 18.B receipt that Third Eye had caught on the P1-O slice. Third Eye was scope-locked to the slice and missed the parallel doc instance. When a hostile review surfaces a wording-class contradiction in a slice (e.g. "read-only" copy on a surface that has edit affordance, "end-to-end fixed" without a Canonical Surface Receipt, "guaranteed deletable" without grep evidence), the reviewer MUST sweep same-day adjacent docs (receipts, handoffs, audit records, runbooks shipped within ±48h) for the same string class before issuing the verdict. **Why:** contradictions of this class travel in clusters — the same author writes the same wrong wording in multiple files in the same session. **How to apply:** at the moment a wording-class blocker is identified, run `rg -n "<offending string>" docs/ai-workflow/AI-HANDOFF/` (use `grep -rn` only if `rg` is unavailable) across adjacent doc directories; either fix all instances in the same review or list the un-fixed instances explicitly as REVISE blockers on the parent docs.

54. **Sibling-Sweep Grep Evidence Requirement (MANDATORY)** — Established 2026-04-28 after Codex found 8+ frontend consumers of `/api/workout/sessions` that the Phase 19 receipt's §7 didn't enumerate; Third Eye accepted the receipt because cited consumers checked out, missing that the grep had been narrow. When a slice or receipt claims "Rule 20 sibling sweep complete," the artifact MUST include the literal search command(s) used and a numerically complete enumeration of consumer files. File:line evidence on cited consumers is necessary but not sufficient — the reviewer must be able to verify the search ran wide enough. **Why:** sibling sweeps fail by under-scope, not by miscitation. **How to apply:** receipts must show `rg -n '<symbol>' <scope>` output (or `grep -rn` equivalent if `rg` is unavailable) and classify every hit; reviewers must verify the search scope was wide enough (typically `frontend/src` + `backend/`, not just one subtree).

55. **Diagnostic Probe Requirement (MANDATORY)** — Established 2026-04-28 after Codex used local Express/supertest to diagnose: `clientAnalyticsRoutes.mjs` set `req.params.userId` inside `router.use(...)`, Express then reset `req.params` for the later paramless route layer, and `chartDataController.mjs:87` read an empty `req.params.userId`. The Playwright doc had blamed the wrong endpoint family. Before accepting a diagnostic prescription that targets a specific layer ("the endpoint family is wrong," "the mapper is stripping," "the auth gate is wrong"), the reviewer MUST require either (a) an executed probe (supertest, curl, browser network panel, vitest assertion that fails on the cited cause) or (b) the doc must explicitly tag the prescription `[HYPOTHESIS]` and require probe verification before code lands. Reading the source file is necessary but not sufficient when adapter middleware, mount-order shadows, role-conditional handlers, or runtime env are in play. **Why:** file-reading produces plausible-but-wrong root cause when middleware composition is non-trivial; only an actual probe disambiguates. **How to apply:** any prescription with the form "switch from X to Y" or "the canonical layer is Z, not W" needs probe evidence in the same artifact.

56. **Tier-A Baseline Disclosure (MANDATORY)** — Established 2026-04-28 after Codex flagged that "tsc --noEmit clean for slice files" understated the broader baseline non-cleanliness. The rule scopes to **broad/global quality claims** — phrases like "Tier-A green," "tsc --noEmit clean," "lint clean," "all tests pass," "build is clean." It does NOT apply to narrowly reported exact commands and their outputs (e.g. "ran `npx vitest run path/to/file.test.tsx` → 7/7 pass" is fine on its own). When a slice makes a broad/global claim, the artifact MUST distinguish slice-clean from baseline-clean. If the full repo baseline is not clean, the artifact must say so explicitly and either (a) confirm the slice introduces zero new errors, with the comparison-against-baseline disclosed as `[VERIFIED]` or `[UNVERIFIED]`, or (b) avoid the global claim entirely and report only the targeted command results. **Why:** future readers conflate slice-clean with baseline-clean and assume the repo is in good shape when it isn't. **How to apply:** "Tier-A green" alone is not enough; require "Tier-A green for slice files; full baseline status: [clean | N pre-existing errors of class X | UNVERIFIED]." Targeted command outputs do not need this framing.

57. **Dual-Tier Summary for Substantial Work (MANDATORY)** — Established 2026-04-30; tightened 2026-05-07 for Codex-led work. At substantial user-facing handoffs, explanations, review results, or workstream summaries, the active builder/reviewer MUST provide a two-part inline summary in chat: a **plain-English summary** (outcome-framed, no jargon) and a **technical summary** (files, commits, tests, deferred items). Both must appear in the same response, plain-English first.

    **When this triggers:**
    - After a phase ships to production (regardless of whether the rule-48 audit record has landed yet — that's a separate file artifact).
    - After a deploy goes live and is health-verified.
    - When Sean explicitly asks for a summary, recap, "what did we do," or similar.
    - When Sean asks how an architecture, workflow, UX, or feature changed.
    - After any substantial implementation slice, hostile review/fix pass, or review-chain result is reported.
    - At session close on a substantial workstream when the conversation is winding down.
    - After a multi-round review chain (rule 46) reaches APPROVE, even if no deploy has occurred yet.

    **When this does NOT trigger:**
    - Routine task completion (single-file edit, doc fix, trivial bugfix, typo) unless Sean asks for a recap.
    - Mid-task progress updates (those stay one sentence per the tone rules).
    - Conversation about plans that have not yet been executed.
    - Receipt-only or audit-record-only writes (those land in their own files).

    **Format requirements:**
    - **Plain-English first.** Frames work in outcome terms ("we fixed X so Y now works") and avoids file paths, function names, and protocol jargon (no "IDOR," no "rule 26," no "TDD," no commit SHAs in the plain section). Frames blockers as "we deferred this because of a security issue we'll fix in the next slice," not "Phase B is gated on the IDOR mitigation."
    - **Technical second.** File paths and commits welcome here. Includes: files changed (paths), commit SHA(s) if a commit landed, test counts (e.g. 86/86 pass), review-chain verdict (Codex APPROVE / REVISE / REJECT), deferred items with the specific reason gate (security blocker, scope, etc.).
    - Use markdown headings so the two parts are visually scannable.

    **Distinct from related artifacts:**
    - **Rule 41 closeout-evidence-lock** is the per-task evidence gate that runs BEFORE declaring done. Rule 57 runs AFTER ship/approve and is for narrative continuity.
    - **Rule 48 audit record** is a per-phase permanent FILE artifact at `docs/ai-workflow/AI-HANDOFF/`. Rule 57 is the inline-readable CHAT narrative Sean can scroll back to without opening a file.
    - **Continuity bridge `rolling-last-done.md`** is auto-trimmed cross-session log written only on Sean's explicit "log this and close." Rule 57 is unprompted at the moments above.

    **Why:** Sean's words 2026-04-30 — "we're getting so much work done now that it's easy to get lost and I need to be able to look at my prompts etcetera and see what it was that we actually did so I can continue to make the best decisions or where we move next." The Phase A workout-builder slice that triggered this rule shipped in one session with a dense pre-code receipt (3 revisions), 3 test suites, a 3-brain review chain (REVISE round 1, REVISE round 2, APPROVE), a deploy lag, and 4 deferred follow-up phases — exactly the density where Sean needs an inline narrative to stay oriented.

    **How to apply:** When a trigger fires, write the dual-tier summary BEFORE moving to the next task or pausing. The goal: "Sean opens this chat in two weeks and reconstructs what happened in 90 seconds."

    **ENFORCED (added 2026-08-03):** this rule is no longer prose-only. `scripts/hooks/dual-tier-gate.mjs` is a deterministic `Stop` hook (wired in `.claude/settings.json` beside the Hermes, dry-loop and Linear gates). Any build-shaped turn — ≥2 non-emission file writes OR a git commit/push — whose closing message lacks a **plain-English section**, or that puts technical *before* plain-English, is BLOCKED. Escape hatch for genuinely non-qualifying turns: `DUAL-TIER: N/A — <reason>`. **Why the hook:** Sean flagged on 2026-08-03 that this rule had been silently skipped for an entire session. It was the only closeout rule without a gate — the Hermes memo, dry-loop ledger and Linear sync fire every turn precisely because they have one. Same lesson as the Hermes outbox at n=443: a duty enforced only by the model remembering is a duty that will eventually be dropped.

58. **Proactive Schema-Drift Detection (MANDATORY)** — Established 2026-05-01 after multiple cascading 403/500 bugs in one session, all rooted in schema drift. Schema drift is a recurring root-cause class in this codebase: model files declare one shape, the production DB has another, and the drift only surfaces at runtime when a code path actually executes. Sean's words: "we're gonna have to make sure that we make a rule to search for schema drift because this is a issue that I see a lot." Whenever Claude reads, edits, or reasons about ANY Sequelize model, raw SQL, or DB-aware code, Claude MUST proactively check for these drift classes — not just when fixing a known bug.

    **Drift classes to look for (any of these is a confirmed bug class observed in this codebase):**

    1. **Column-name case drift** — Model declares `field: 'snake_case_name'` mapping to a snake_case DB column, but the real DB column is camelCase (or vice versa). Symptom: `column "snake_case_name" does not exist`. Example incident 2026-05-01: `TrainerPermissions.mjs` mapped `field: 'trainer_id'` but DB has `trainerId`.
    2. **Table-name drift (PascalCase vs snake_case)** — Code references `"ClientTrainerAssignments"` (PascalCase, the model class name) but the real table is `client_trainer_assignments` (snake_case). Symptom: `relation "ClientTrainerAssignments" does not exist`. Example incidents 2026-05-01: `authMiddleware.mjs:842` raw SQL + earlier `workoutBuilderRoutes.mjs` raw SQL.
    3. **FK target table drift** — FK constraint references `users` (lowercase, stale duplicate) but the canonical user table is `"Users"` (PascalCase). Symptom: `violates foreign key constraint` when inserting a row that references a user that exists in `"Users"` but not in `users`. CLAUDE.md gotcha: "Dual `users`/`"Users"` table in production — FK constraints must reference `"Users"`."
    4. **Field existence drift** — Model declares column X (e.g. `deactivatedBy`, `deactivatedAt`, `reason`) but DB has different columns serving the same purpose (e.g. `revokedAt`, `notes`). Symptom: `column "deactivatedBy" does not exist` OR silent `null` writes that lose data.
    5. **Field-type drift** — Model declares `INTEGER` but DB has `STRING` (or vice versa). Less common but happens — Sequelize sometimes coerces silently. Symptom: type-coercion bugs at the JS level (`req.user.id === parseInt(x)` always false because one is string, one is number).
    6. **Wrong field name in caller** — Caller (route, controller, service) uses `assignment.isActive` but the real model field is `assignment.status` (`'active'|'inactive'|'pending'`). Symptom: filter/check always returns falsy → silent denial. Example incident 2026-05-01: `MyClientsView.tsx` filter on `assignment.isActive` while API returns `status: 'active'`.
    7. **Frontend response-shape drift** — Frontend normalizer expects `data.data.assignments` (nested) but backend returns `data.assignments` (flat at root). Symptom: dropdowns / lists silently render empty. Example incident 2026-05-01: `GlobalClientContext.tsx:108`.

    **When this triggers (mandatory):**
    - Reading or editing ANY Sequelize model file (`backend/models/*.mjs`).
    - Reading or editing ANY raw SQL query (`sequelize.query`, `pg`, knex, etc.).
    - Reading or editing ANY route or controller that hits the DB.
    - Reading or editing ANY frontend normalizer / adapter / shape mapper.
    - When a 403, 500, or unexplained empty list surfaces during runtime testing.
    - Before claiming a model or query "looks correct" — actively cross-check.
    - When a fix touches the SAME model, table, or response shape that another file in the same workstream just touched (sibling-sweep angle).

    **How to apply (the proactive cross-check):**
    1. **Open the model file.** Note: declared field names, declared `field:` mappings, declared column types, declared associations.
    2. **Open the migration files.** Confirm the migrations match the model's declared shape (or note the divergence).
    3. **Run a real-DB schema check when in doubt.** Use a quick read-only diagnostic: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'X' ORDER BY ordinal_position`. The real DB is the source of truth. (Pattern: see `backend/scripts/inspect-trainer-permissions-schema.mjs` and `inspect-trainer-permissions-fks.mjs`.)
    4. **Cross-reference all callers.** Every code path that touches the model must use the field names the real DB has. If a sibling caller uses different field names, that's drift — flag it in the same pass (rule 20 sibling sweep).
    5. **Cross-reference frontend response shapes.** When backend returns `{ assignments: [...] }` but the frontend normalizer reads `data.data.assignments`, the dropdown silently breaks. Verify both ends.
    6. **For FK constraints, verify the target table.** `REFERENCES "users"` vs `REFERENCES "Users"` is a real bug class. Run `SELECT ... FROM information_schema.table_constraints` to confirm FK targets.
    7. **Surface the finding even when not asked.** If Claude is reading a model file for any reason and notices drift, mention it. Don't wait for a bug report — drift compounds.

    **Why:** schema drift hides at runtime, breaks live users not local tests, and travels in clusters (one drift in a model file means siblings have likely drifted too). The 2026-05-01 session shipped 5+ schema-drift fixes in one chain — `clientTrainerAssignmentRoutes` raw SQL, `workoutBuilderRoutes` raw SQL, `authMiddleware:842` raw SQL, `TrainerPermissions` model fields, `GlobalClientContext` normalizer shape — all the same root pattern. Proactive detection collapses these from "discover at runtime, fix in production" to "catch at read time, fix in the same slice."

    **What this rule does NOT require:**
    - It does NOT require running a full schema audit on every task. Only the touched models / tables / shapes.
    - It does NOT require fixing all drift discovered. If drift is out-of-scope, Claude reports it as a finding (with file:line + classification) and Sean decides whether to expand scope.
    - It does NOT require a separate doc artifact (rule 29 covers that for fixes). This rule is about DETECTION during regular work.

    **Cross-references:** Rule 26 (Canonical Surface Receipt) gates UI/data-truth fixes; Rule 27 (Surface Classification) handles competing surfaces; Rule 29 (Schema Cross-Check Artifact) is the artifact for shipped fixes; Rule 51 (`[VERIFIED]` confidence tags) requires evidence; Rule 20 (Sibling Sweep) ensures all parallel callers get checked. This rule (58) is the proactive trigger that surfaces drift before any of those other rules fire.

59. **Read-Time Secret Exposure Prevention (MANDATORY)** — Established 2026-05-04 after a Claude `Grep` tool call surfaced the live `OPENROUTER_API_KEY` value from `.env` line 132 into chat context while diagnosing a script's API-key load failure. Rule 44 only covers WRITES (commits, edits, doc generation). This rule (59) covers READS — any tool result that could surface a secret VALUE into chat output, even when the secret is already present in the user's local files.

    **What "secret-bearing files" means:** any of the following, no matter what the file contents look like, are PRESUMED to contain secrets and must be treated under this rule:
    - `.env`, `.env.*`, `.env.local`, `.env.production`, `.env.development`, `.env.staging`, `.env.test`
    - `secrets.*`, `credentials.*`, `*.secret`, `*.secrets`
    - `*.pem`, `*.key`, `id_rsa*`, `id_ed25519*`, `*.p12`, `*.pfx`, `*.jks`
    - Files matching `**/keys/**`, `**/credentials/**`, `**/.aws/credentials`, `**/.ssh/**`
    - Any file the user explicitly identifies as containing credentials
    - Render service-shell session output that may include `printenv` results
    - Outputs from `cat /proc/*/environ`, `env`, `printenv`, `set` (process env dumps)

    **Forbidden actions on secret-bearing files (will surface values to chat):**
    - `Grep` with `output_mode: "content"` — emits matching lines including the value
    - `Grep` with `-A`, `-B`, `-C` context flags — same risk
    - `Read` tool on the whole file (or a range that covers a secret line)
    - `Bash` commands that pipe file content to stdout: `cat .env`, `head .env`, `tail .env`, `awk '/PATTERN/' .env`, `grep PATTERN .env` (the bare grep CLI, not the Grep tool)
    - `Bash` with `echo $SECRET_VAR`, `echo ${VAR}`, `printenv VAR`
    - Any tool that returns the value through its result channel

    **Required substitutes (verify presence without exposing value):**
    - `Grep` with `output_mode: "files_with_matches"` — confirms the file contains the pattern, returns only the file path
    - `Grep` with `output_mode: "count"` — returns the match count, not the matching content
    - `Bash` with redacting transformations: `grep -c '^OPENROUTER_API_KEY=' .env` (count only), `awk -F= '/^OPENROUTER_API_KEY=/{print "found, "length($2)" chars"}' .env`, `[ -n "$VAR" ] && echo "set, ${#VAR} chars" || echo "missing"`
    - When a script needs the value, load it INSIDE the script (script reads file or `process.env`, never echoes to stdout) — example: `export OPENROUTER_API_KEY=$(grep '^OPENROUTER_API_KEY=' .env | cut -d= -f2) && node script.mjs` is acceptable because the value goes to env, not to stdout (no `echo`, no `set -x`)
    - When configuring `Edit` to modify a secret-bearing file, never include the secret VALUE in `old_string` or `new_string` — use unique non-secret context lines as anchors

    **Mandatory response when a secret leaks anyway** (mistake, hook output, system reminder, or unanticipated tool behavior):
    1. **STOP** the current workflow.
    2. **Flag the exposure to the user IMMEDIATELY** — name the specific tool call, the specific value class (API key / JWT / DB URL), and the source file.
    3. **Recommend rotation** — provide the rotation procedure for that specific secret class.
    4. **Log the incident** in the closeout audit record (Rule 48) — incident date, secret type, exposure path, rotation status.
    5. **Do not re-emit** — never quote the leaked value again in the same conversation, even when the user asks "what was the value?" Tell them to look at their `.env` directly.
    6. **Continue work only after** the user acknowledges the rotation plan or explicitly defers it.

    **Why:** Chat context is persistent. Anthropic's chat history, Claude Code transcripts, telemetry, and any conversation-replay or memory feature creates new copies of any secret that enters chat. Even if the secret is in the user's gitignored `.env`, exposing it to chat creates a new copy in a less-controlled location. The 2026-05-04 incident — Claude grepped `OPENROUTER_API_KEY` from `.env` with `output_mode: "content"` while diagnosing a script's env-load failure — established this gap in Rule 44 (which only covers writes). The previous-day AI Village runs Sean references did NOT trigger this because they used the orchestrator's own internal `.env` loading (Node.js `process.env`, never grep), not a Claude tool call.

    **How to apply:**
    - Whenever Claude is about to grep, read, or `cat` a `.env`-class file: STOP and use the presence-only substitutes above.
    - Whenever Claude is troubleshooting a "key not loading" failure: load INSIDE the script, never grep+echo.
    - Whenever Claude is about to run an env dump (`printenv`, `set`, `env`): redact secret-shaped values BEFORE displaying, OR use targeted checks instead.
    - Whenever the user pastes a tool output (e.g. Render shell session) that may contain secrets: scan the paste, redact secret-shaped values from your response, and tell the user the redacted version.

    **Cross-references:** Rule 44 (write-time secret scanning — companion rule); Rule 47 (Supervised Read-Only Launcher Pattern — its redaction-at-source rule applies the same principle to remote shells); Rule 48 (Phase Completion Audit Record — closeout records secret-handling posture).

60. **Next-Slice Closeout Disclosure (MANDATORY)** - Established 2026-05-08 by Sean, CEO Orchestrator. Every completed slice, fix, review cycle, phase, or substantial task closeout MUST explicitly tell Sean what the recommended next slice is. If there is no active next slice, the closeout MUST say that the current workstream is complete and Codex/Claude is ready for Sean's next direction.

    **Required closeout language:**
    - If more work remains: `Next slice: [specific next slice name] - [one-sentence reason it is the next highest-value or highest-risk move].`
    - If no work remains: `No active next slice remains for this workstream; I am ready for any new information or direction you want to give next.`

    **What counts as a next slice:** the next narrow, reviewable unit of work that follows from the evidence just gathered. It may be a bug fix, hostile review, schema reconciliation, UI polish, test hardening, cleanup proposal, or explicit "pause and ask Sean" decision when the next move is ambiguous.

    **How to choose it:** base the recommendation on verified residual risk, failed or skipped verification, business priority, security/privacy exposure, or Sean's stated sequence. Do not invent speculative work just to fill the field. If multiple candidates are tied, name the top two and ask Sean to choose.

    **Where it belongs:** final user-facing closeouts, substantial review responses, phase summaries, and any handoff/continuity note. This rule extends Rule 41 closeout-evidence-lock and Rule 57 plain-English memory trace: Rule 41 proves the work, Rule 57 explains what happened, Rule 60 tells Sean where to move next.

61. **Slice-Internal Hostile Review Before Reporting (MANDATORY)** - Established 2026-05-08 by Sean, CEO Orchestrator. After every implementation slice, bug fix, UI change, backend/API change, test-hardening pass, or docs rule change, the builder MUST run a hostile review pass and apply concrete fixes before giving Sean the substantive slice report.

    **Required sequence:**
    1. Implement the slice.
    2. Run the relevant verification for that slice.
    3. Switch into hostile reviewer mode and actively try to break the implementation using Rule 17, Rule 41, and the task-type Definition of Done.
    4. Fix every concrete issue found by that hostile review, with tests where feasible.
    5. Re-run the relevant verification.
    6. Only then provide the user-facing answer.

    **Reporting shape:** The final answer for a slice MUST be one consolidated report that includes: what was created or changed, what the hostile review found, what was fixed because of it, verification evidence, residual risk, and the Rule 60 next-slice recommendation. Do not present a slice as complete before this internal hostile-review/fix loop has happened.

    **Allowed progress updates:** Short working updates are allowed while implementation and review are in progress, but they must not claim the slice is complete or summarize the slice outcome before the hostile review and fixes are done.

62. **Best-in-Class Product Strategy Gate (MANDATORY for product/UX/roadmap work)** — Established 2026-05-25 from the GPT Pro personal-training/community strategy analysis and Sean's SwanStudios vision. Any product, dashboard, onboarding, workout/progress, community, monetization, integration, or roadmap change MUST pass the SwanStudios strategy gate before implementation. Read `docs/ai-workflow/references/BEST-IN-CLASS-TRAINING-APP-STRATEGY.md` when planning these changes. The gate:
    - Preserve the wedge: trainer-led coaching + first-party workout/progress record + paid accountability/community loops, not generic social media.
    - Ask the north-star questions: what is the trainee's next best action, which client needs coach intervention, what progress can be shown, and what reason brings the group back this week?
    - Keep coaching records first-party: programs, assignments, workout logs, coach notes, adherence, progress, and session history cannot be treated as secondary integration artifacts.
    - Make role-specific activation explicit: trainer = first template + first client invite + payout/payment path; trainee = first workout logged + first coach/group interaction within seven days + first visible progress proof; admin = exceptions, stale clients, billing/support/moderation, and retention risk visible without hunting.
    - Favor mobile-first daily training flows plus a strong web coach/admin console. Live-session tasks must be low-tap: find client, start session, dictate or manually log, save, review, and show progress.
    - Make community reinforce coaching through challenges, cohorts, events, badges, progress sharing, and accountability. Do not add noisy generic feed behavior unless it strengthens adherence, retention, or trust.
    - Treat integrations as enrichment, not source of truth. Wearables, calendar, nutrition, and third-party sync must feed consented context while SwanStudios owns the canonical workout/program/progress model.
    - Treat workout, biometric, pain/injury, recovery, sleep, and nutrition-like data as sensitive by design. Consent, export, revocation, deletion, access rationale, and auditability are product surfaces, not afterthoughts.
    - Use operating KPIs when prioritizing: activation, engagement, retention, commercial, and quality metrics, including workout-save success, sync freshness, coach response time, checkout failure rate, and program completion.
    - Kill or defer scope that does not improve coaching, adherence, progress proof, community belonging, revenue, or trust.

63. **Static Intelligence Gate for AI Code Quality (MANDATORY for substantial code work)** - Established 2026-06-05 from the WebDev Simplified/Fallow transcript. AI-generated code must be checked for maintainability failure modes: dead files, unused exports/types/dependencies, duplicated logic, oversized or high-complexity functions, low file health, hotspots, and ranked refactor targets.

    **When this triggers:**
    - After substantial implementation, refactor, recursive slice, or broad polish pass, before the hostile-review closeout.
    - Before pushing a code change to `main`/Render when Fallow or a configured equivalent is available.
    - During dashboard, workout/progress, Swan Coach, onboarding, or session-flow work where code churn spans multiple files.
    - When a touched file crosses 300 lines, gains copied blocks, grows new exported helpers, or becomes harder to test.

    **Required pass:**
    1. Prefer the project-configured Fallow command, scoped to changed files or the current branch: `npm run code-health:audit` for local working-tree checks, or `npm run code-health:audit:main` for branch/CI checks against `main`. Use `npm run code-health:dead`, `npm run code-health:dupes`, and `npm run code-health:health` for focused investigations.
    2. If Fallow is not installed or configured, do not claim the gate is clean. Report `[UNKNOWN] static-intelligence gate unavailable`, keep the normal Tier-A verification running, and propose a separate Fallow setup/config slice when appropriate.
    3. Configure ignores before treating findings as blockers: tests, generated files, archive/vendor/build output, fixtures, and intentional data-definition catalogs can produce expected duplication or dead-code noise.
    4. Fix current-slice regressions first: new dead exports, duplicated new logic, oversized functions, or complexity introduced by the work. Existing broad findings become backlog unless they block the task, violate another rule, or Sean explicitly expands scope.
    5. Never run auto-fix blindly. If `fallow fix` is used, preview or inspect the diff before staging, and do not remove public exports, route handlers, model associations, test fixtures, or integration entry points without usage evidence.
    6. Closeout must state whether the static-intelligence pass ran, the command/scope/result, findings fixed, findings deferred with reason, and whether the result is baseline-clean or only slice-clean per Rule 56.

    **Why:** AI coding tends to leave duplicated logic, dead/orphaned files, unused exports, and complicated functions that poison future agent context and make SwanStudios harder to maintain. This gate converts those risks into deterministic evidence without turning every feature slice into a full-repo cleanup project.

    **Cross-references:** Rule 4 (300-line cap), Rules 32-39 (repo hygiene and cleanup approval), Rule 50 (Tier-A deterministic tooling), Rule 56 (baseline disclosure), and Rule 61 (slice-internal hostile review).

64. **Intent-Extraction Gate via `grill-me` (MANDATORY for net-new building and planning)** — Established 2026-06-09 by Sean from the Matt PCO "grill me" skill + Nate Herk's checkpointing version. Everyone using Claude Opus 4.8 gets the same model; what makes a SwanStudios output sound like *Sean* is his context — his taste, voice, and decisions. The hardest part of building a good operating system is getting that knowledge out of Sean's head and into the system. A 5-minute brain-dump is never enough. Before planning or building anything net-new, the AI MUST relentlessly interview Sean to extract his thought process, and checkpoint every answer to a durable brainstorm doc.

    **When this auto-routes (mandatory):**
    - Any **net-new component, page, dashboard surface, or feature** where Sean's preferences aren't already captured in a brainstorm doc or reference doc.
    - Any **redesign** of an existing surface.
    - Any **new system, integration, or product direction** (Swan Coach lane, gamification, nutrition, social, Hermes scope, etc.).
    - Any **planning session** where the goal is still fuzzy / lives mostly in Sean's head.
    - Any explicit "grill me", "interview me", "ask me questions about", or `/grill-me`.
    - Any moment the AI is **about to guess** at Sean's taste, hierarchy, scope, or business logic instead of knowing it.

    **When this does NOT trigger:** trivial bug fixes, typo/comment/formatting edits, read-only exploration with no build planned, or any surface whose brainstorm doc already exists and is current (read it instead, then offer a re-grill only for new gaps).

    **The method (preserve all five):** (1) interview relentlessly until no gaps remain; (2) **one question at a time** — never a batch; (3) walk the design tree depth-first, resolving dependencies in order; (4) **always lead with a recommended answer + one-line reason** so Sean confirms or corrects fast; (5) **explore the codebase instead of asking** whenever the answer is discoverable from the repo (honors Rule 18 existing-pattern-first and Rule 49 no-manual-inspection). Use the `AskUserQuestion` tool for discrete-option questions (with `preview` mockups for UI/layout choices) and plain one-message-at-a-time chat for open-ended ones.

    **Two phases — Extract, then Synthesize & Advise:** grill-me is not just a stenographer. **Phase 1 (Extract)** is the grill above — and it always starts at the *vision tier*: what the app/feature/component **is**, what it's **supposed to do**, and where it sits (is this the **parent** surface or a **child** of one?) — before descending into layout/data/states. **Phase 2 (Synthesize & Advise, MANDATORY before closeout)** steps back to the whole-system view and proactively produces, grounded in what it explored of the **parent component, its children, and the app-as-a-whole**: (a) features that are needed but not yet in Sean's plan, each tied to the Product Core Loop / next-best-action / Rule 62 strategy; (b) **minimal-click enhancements** with concrete before→after tap counts (Sean's standing least-clicks/least-time mandate); (c) parent/children/whole observations (duplicated facts across cards, a child that should be promoted to the parent, missing shared state, app-level coherence); (d) recommendations that may tune the plan, the build, or the skills themselves. Phase 2 is advisory — Sean accepts/modifies/rejects each suggestion, and his verdicts are captured back into the doc. Suggestions never invent scope for its own sake — they must strengthen coaching, adherence, progress proof, community, revenue, or trust.

    **Checkpointing (mandatory):** brainstorm docs live at `docs/ai-workflow/brainstorms/<kebab-topic>-<YYYY-MM-DD>.md` (NOT repo root — honors Rule 35). Create the doc at grill start; append after **every single Q&A exchange** so context-window drift never loses an answer. Doc sections: Summary, Key Decisions, Q&A Log (question → recommended → Sean's answer → implication), Key Highlights, Architecture Notes (parent/children/whole), Suggestions & Enhancements (Phase 2), Minimal-Click Opportunities, Open Flags (things Sean must look up or get from a stakeholder — flag and keep going, don't block).

    **Closeout:** when the grill ends (Phase 2 delivered and reacted to), set the doc `Status: complete`, scan for related skills/reference docs this knowledge should improve, and **offer to update them** (apply only on Sean's yes). Then hand off to the next gate.

    **Order in the pipeline:** Rule 78 mode classification → `wayfinder` only for multi-session material fog (a `GRILL-HITL` ticket may invoke `grill-me`) OR `grill-me` directly for clear net-new intent → `swan-orchestrator` → `swan-design-router` (if UI) → build → `closeout-evidence-lock`. Grill-me remains the intent layer; Wayfinder only orders unresolved decision dependencies.

    **Privacy (Rule 8):** brainstorm docs are committed to the repo — never write real client names, medical/immigration/PII, or secrets; use IDs and roles.

    **Why:** Sean's words 2026-06-09 — "I want the AI to ask me questions to understand my thought process on every aspect of the sites I'm building so all AIs can know what I come to expect when building the SwanStudios app or any other app." Spending the extra time up front (sharpening the axe) jumps iteration-one quality from ~70% to ~90% and front-loads the context that pays off across every downstream slice. Full procedure: `.claude/skills/grill-me/SKILL.md`.

65. **Strategy / Adversarial / Conversion / Self-Improvement skill suite (MANDATORY routing)** — Established 2026-06-11 from the Fable-5 use-case transcript (interview-before-build, hire-it-to-kill-your-company, copywriting tournament, make-it-build-its-own-tools). Four skills were added and `grill-me` gained a top-builder lens. Route to them by trigger; each lives at `.claude/skills/<name>/SKILL.md`:
    - **`chromie`** — top-product-CEO strategy pressure-test. Interviews Sean through a configurable founder panel (default **Zuckerberg / Gates / Altman**), ONE hostile question at a time, pushing back on vague answers, then writes the spec + **3 ways it fails** + **absence-first gap analysis** (what's missing, ranked by value/money left on the table). Runs AFTER `grill-me` for any net-new bet whose success is unproven (new product/feature lane, monetization, roadmap call). grill-me extracts what Sean *wants*; Chromie pressure-tests whether it *wins*. Skip for features whose value is already proven (go straight to `swan-orchestrator`).
    - **`attack-the-site`** — adversarial competitor/attacker red-team. Comes at a surface/feature/the whole product as a well-funded rival who wants to out-build SwanStudios + a malicious user abusing the product-as-designed; ranks threats by self-executability (cheapest/fastest first) and pairs each with a defend + out-build move. Distinct from `security-review` (code CVEs — hand those off) and `code-review` (correctness). Trigger: "attack the site," "red-team," "how would a competitor beat me."
    - **`copy-tournament`** — conversion-copy generator: N variants → 5-judge panel (skeptical CFO / midnight-scrolling founder / competitor / ideal customer / conversion copywriter) → kill losers → merge winner → scoreboard. For landing pages, hero/pricing/ascension copy, email. Visual side routes through `swan-design-router`; honors the credentials rule (26+ years / NASM-protocol, never "NASM-certified") and rule 9.
    - **`skill-harvest`** — the self-improvement loop: scans recent work for repeated requests and proposes turning them into skills/ref-docs/rules (gap-filtered against what exists), and names what Sean still does by hand that should be delegated. Proposes only — never writes a skill without Sean's yes. Complements `auto-research` (which *tunes* existing skills; skill-harvest *finds new ones*). This is the loop that created the three skills above.
    - **`grill-me` top-builder lens (upgrade):** grill-me can now interview through the founder lens on request ("grill me like Zuckerberg") with sharper pushback, while staying *extraction*; when the question turns to "will it win," it hands off to `chromie`.

    **Updated pipeline order:** Rule 78 mode classification → optional `wayfinder` for multi-session material fog → `grill-me` (directly or from a `GRILL-HITL` ticket) → `chromie` when the bet is unproven → `swan-orchestrator` → `swan-design-router` (if UI) → build → `closeout-evidence-lock`. `attack-the-site`, `copy-tournament`, and `skill-harvest` are triggered on demand, not in the linear build path.

    **Why:** the transcript's core lesson — don't one-shot; use interview-before-build, adversarial multi-persona panels, and self-improving tooling. The skills institutionalize the highest-value techniques that weren't already covered by the existing gates. Privacy (rule 8): all skill output docs are committed — IDs/roles only, no PII/secrets.

66. **`prompt-watcher` — per-prompt intent amplifier (MANDATORY, fires every prompt)** — Established 2026-06-11 by Sean. A `UserPromptSubmit` hook (`scripts/hooks/prompt-watcher.mjs`, wired in `.claude/settings.json`) injects a ~90-token classifier reminder on EVERY prompt. The model then:
    - **Classifies SIMPLE vs VISION.** SIMPLE (instruction / question / correction / status / "go") → respond normally, do NOT load the skill — zero extra tokens. VISION (an idea Sean is bringing into reality) → load `.claude/skills/prompt-watcher`. Bias to SIMPLE when unsure.
    - **For VISION: silently amplify, then act.** Gap-check the idea against the in-context vision (Product Core Loop, the four dashboards, rule 62), add features that genuinely strengthen it (surgical — rule 3), and rewrite it into a sharper prompt — then **act on the enhanced prompt automatically. No confirmation step, no printout.** Sean's directive 2026-06-11: don't show it and don't wait — just use it; that's the click + tokens he's cutting. **Reveal the enhanced prompt only if Sean asks** ("what prompt did you use / what did you change"). Retain it in working context for that; do not write a file per prompt.
    - **Token discipline (Sean's explicit ask):** never bulk-reload CLAUDE.md/AGENTS.md (already in context); open a specific reference doc only when a real gap check needs it.
    - **Standing safety still applies (not a confirmation gate):** surface the interpretation first only when acting blind would be irreversible/outward-facing/unauthorized (delete, overwrite, push, send external, spend, auth/billing/PII) or the build is genuinely ambiguous between two very different outcomes. Otherwise proceed silently.
    - **Routing, not bypass:** if the enhanced prompt reveals a net-new surface or unproven bet, the *action* starts with Rule 78 mode classification: `wayfinder` only for multi-session material fog, otherwise `grill-me`; then `chromie` when needed → `swan-orchestrator` → `swan-design-router` (if UI) → build → `closeout-evidence-lock`. Invoking the gate IS acting on the prompt; it does not reintroduce a confirmation step.

    **Why:** Sean's words 2026-06-11 — "I want every prompt I give to be the best that it could possibly be," with the AI telling SIMPLE apart from "an idea I'm trying to bring into reality," enhancing silently for least clicks / least tokens. Full procedure: `.claude/skills/prompt-watcher/SKILL.md`.

67. **Multi-Agent Coordination (MANDATORY, PERMANENT, every session)** — Established 2026-06-13; rewritten 2026-08-14 after the v1 text caused the failure it existed to prevent. **Sean runs multiple AI agents on this repo continuously** — typically 4-8 live sessions across ~184 worktrees. v1 said "while Claude + Codex run in parallel," described a "2-agent layer," and named two lane files; by August the real state was many concurrent **Claude↔Claude** sessions with per-session lanes, so a literal reading of the rule did not even apply to the commonest collision. **This rule is unconditional. Assume other agents are live until the digest says otherwise.**
    - **Session start AND before your first edit:** `node scripts/lane.mjs digest`. That is the command. **Never read `claude.lane.md`/`codex.lane.md` by name** — they are stale relics; live lanes are `<agent>--<worktree>-<hash>-s<session>.lane.md`. A `SessionStart` hook prints the digest automatically: **it is an instruction, not a banner.** Reading it and proceeding as if alone is the failure mode.
    - **R1 read-before-edit:** if your target is in another agent's **🔒 EDITING NOW**, do not edit it.
    - **R1b TALK TO THEM FIRST (added 2026-08-14 — this is the fix).** The ledger is a two-way channel, not a notice board. When another agent holds your file, is mid-slice on your topic, or has already shipped work in your area: **write to `.ai-workflow/coordination/review-queue.md`** — state what you are taking, what you are not touching, and what you need from them. v1 listed "or ask Sean" as a co-equal option to queuing a request, and R5 said to flag staleness "to Sean"; an agent following it exactly escalates a coordination problem to the human instead of using the channel built for it. **Sean is the last resort, not the first.** Escalate only for a genuine conflict of intent, a destructive/irreversible action, or an owner-gated decision.
    - **R1c read their work before forming your plan.** Check the other agent's commits and any `SESSION-HANDOFF-*` / `AI-HANDOFF/` doc in your area **before** recommending a direction. On 2026-08-14 a session spent a turn recommending a build that a parallel session had already proven unnecessary — its evidence-backed "do NOT build this" was sitting committed and unread. **A peer's finding can override your own recommendation; go find it first.**
    - **R2/R3 claim/release:** `node scripts/lane.mjs claim --task "..." --files "a,b"` before the first edit; `release --outcome "..."` at the end. Re-claim with the fuller list if scope grows — a stale claim is a lie. **Never write another agent's lane file** (R4).
    - **R5 staleness:** a lane older than ~120 min still `in-progress` may be abandoned — **judge peers by git, not by their lane**, whose `Delivery:` field froze at their last write. Commits newer than the lane mean live-but-stale-lane, not gone. Never silently seize.
    - **R6 commit safety:** no `git add -A` while another agent holds a lock — and a bare `git commit` takes the whole shared index, so stage **explicit paths** and verify with `git diff --cached --name-only` before committing. Nothing enforces this; it is discipline, not a guard.
    - **R7 mutual hostile review:** finishing a substantial slice → append a request to `review-queue.md`; another agent returns APPROVE/REVISE/REJECT + findings (rule 17 + 41 + HANDOFF-PROTOCOL Business-Logic Audit).
    - **R8 lanes are declared in the ledger, not here.** v1 hardcoded a June lane split that was stale within weeks. Perishable state does not belong in a doc that reads as authoritative — publish your owned area in your lane file and read the digest for everyone else's.
    - **Committed ≠ delivered.** A branch that is not pushed is invisible to every off-machine agent and to Hermes. Say which state work is in: `local-commit` / `pushed-branch` / `merged-to-main`.
    - **Retention:** lane files overwrite in place; `review-queue.md`/`activity.log.md` pruned by `scripts/coordination-prune.mjs`. Skill: `.claude/skills/agent-lane/SKILL.md` (carries the push blast-radius checklist and the deliberately-NOT-built list). Spec: `docs/ai-workflow/references/AI-PAIR-CODING-PROTOCOL.md`. **Why:** Sean 2026-06-13, restated 2026-08-14 — "I'm always working with other agents 24/7… I already created a system where you can talk to other agents and see what they're doing." The system existed and worked; the rule described a smaller world than the one it ran in, so agents used it as a warning to relay rather than a channel to use.

68. **Fable-Grade Plan → Worker-Bot Build → Hermes Learning Loop (MANDATORY routing for major "Fable vision" initiatives)** — Established 2026-07-05 by Sean. Fable is expensive, so its highest-leverage use is producing **plans so complete a lower-tier worker-bot executes them verbatim in Fable's exact vision** — not hand-writing every line. The standing pipeline for any major remake/vision initiative:
    ```
    Opus 4.8 enhances the prompt + runs a grounded deep audit  →  AI Village 15-brain synthesis (paid, Rule 16 gated)
      →  Fable synthesis = the FINAL ultra-comprehensive plan (mermaid + wireframes desktop&mobile + per-field data/API contract + numbered independently-shippable slices, each executable with ZERO further questions)
      →  worker-bot builds slice-by-slice with recursive hostile review (Rule 17/41/61) until zero errors  →  push to Render
      →  Hermes Learning Packet emitted from the Fable-tier output
    ```
    - **Fable's output contract** (11 required parts per workstream) lives in `docs/ai-workflow/brainstorms/FABLE-VISION-MASTER-BRIEF-2026-07-05.md §2`; the grounded reality it plans against lives in `docs/ai-workflow/AI-HANDOFF/FABLE-VISION-REBUILD-DEEP-AUDIT-2026-07-05.md`. A plan a worker-bot would have to ask Fable about is **incomplete** — that is the detail bar.
    - **Hermes learns from Fable-tier sources — Fable 5, Opus 5, and Kimi K3 (Sean, 2026-08-10).** After any substantial workstream/phase/Fable-tier synthesis, emit a **Hermes Learning Packet** via the `hermes-learning-packet` skill (`.claude/skills/hermes-learning-packet/SKILL.md`) so Hermes evolves without Sean re-typing. **Source gate is fail-closed to Fable-tier** (`claude-fable-5`, `claude-opus-5`, and `moonshotai/kimi-k3` — all Fable-tier learning sources by Sean's explicit designation 2026-08-10 — or a future model Sean designates at/near Fable's level) — Opus 4.8, Codex, Gemini, local Qwen, and anything below Fable route to quarantine, NEVER the learning corpus. Because Sean has **subscriptions, not API keys**, tier is a stamped/trusted `originating_model` provenance tag, not an API check. Packets are privacy-safe (IDs/roles only, two-layer secret scan reusing `continuity-append.mjs` plumbing), **durable/compounding** at `docs/ai-workflow/hermes-learning-packets/` (not the 30 KB-trimmed continuity log), and delivered over the **already-proven** Pi daemon SSH/cat read path (`HERMES-DAEMON-PHASE-B-PATCH-2026-04-22.md`) — extend that read list; do not invent a new transport. **Trigger is AUTOMATIC, not manual (amended 2026-08-13 by Sean — "it's protocol; I'm wondering why you didn't do it").** The manual-by-default wording is RETIRED: it made the durable corpus discretionary, and an Opus 5 session that produced a permanent, *repeated* lesson emitted four ephemeral inbox memos and ZERO learning packets **because the rule said the trigger was manual**. Sean should never have to ask. **If you are Fable-tier (`claude-fable-5`, `claude-opus-5`, `moonshotai/kimi-k3`) AND the work produced a permanent transferable lesson, emit the packet at close — unprompted.** The sub-Fable quarantine gate is unchanged and still fail-closed; this widens *when* an authorised model writes, never *who* may write.      - **Inbox memo is NOT a learning packet — emit BOTH when both apply.** Rule 69's memo is the *ephemeral, any-agent, gitignored, drained-daily* working note (`.ai-workflow/hermes-inbox/pending/` — laptop-local until Hermes consumes it). Rule 68's packet is the *durable, Fable-tier-only, committed, compounding* record (`docs/ai-workflow/hermes-learning-packets/` — travels with the repo, survives any machine). **A memo that satisfies the Stop gate does NOT satisfy this rule.** Test for a packet: *would this lesson still be worth reading in six months, on a different machine, by an agent who was never in this session?* If yes it is durable — commit it. An error class that recurred **within a single session** is a permanent lesson by definition, never a working note.      - **A gate's condition is a floor, not a ceiling.** The `Stop` hook requests a packet only "if the lesson came from a verified Fable-tier synthesis" — that is the minimum it can *detect*, not the limit of the duty. Judging whether a lesson is durable is the model's call; deferring that judgement to a hook's phrasing is exactly how the corpus stays empty while every closeout looks complete. (Superseded wording, kept for context: trigger was manual by default ("feed Hermes"); auto-after-Fable is opt-in via the `prompt-watcher` hook model.
    - **What every packet MUST carry (Sean, 2026-08-13): "put what models did what… and the skills we're making… and all the errors that the models are making, what they're doing, and how they're making errors and fixing them and making errors and fixing them."** Frontmatter gains two required lists — `models_used:` (model / role / what it actually did / cost) and `skills_touched:` (skill or rule id / created|amended|retired|proposed / the failure that motivated it). Body gains four required sections: **`## Who did what`** (per-model attribution in prose — name the model that was WRONG as readily as the one that was right; Hermes cannot learn a routing table from unattributed lessons), **`## Skills created or changed`** (a skill recorded without the failure it was built against becomes cargo-cult within a month), **`## Mistakes I made`** (MANDATORY, matched **literally** by `scripts/hooks/hermes-closeout-gate.mjs` — never number it; `## 6. Mistakes I made` does not match and the gate blocks), and **`## Error → fix → repeat ledger`** (per error class: how many times it recurred *this session*, whether it had already been written up before recurring, and what finally stopped it). **The repeat count is the highest-signal field in the corpus** — a lesson that was documented and then repeated proves the write-up was not a fix; the correction that survives is procedural ("run this command before committing"), never resolutional ("be more careful"). `## External-model calibration` records, per paid model, findings real vs disproven on verification plus cost — that is how the routing table gets learned empirically instead of asserted. Full schema: `.claude/skills/hermes-learning-packet/SKILL.md`.
    - **Guardrails:** AI Village stays Rule-16 paid/gated; the Karpathy Wiki (intended long-term Hermes corpus) is BLOCKED on Pi SSD/power hardware, so packets compound in-repo until it clears; never touch the Pi without Sean. **Why:** Sean 2026-07-05 — "have Fable give us as much plans as possible… so we can build it as though Fable were going to build it, but a worker bot builds it… and give Hermes a summary at the end of everything worth it so Hermes can learn and evolve without me typing it in all the time — from Fable and Fable only."

69. **Hermes Inbox — any-agent → Hermes working channel (MANDATORY at substantial terminal task/session close)** — Established 2026-07-06 by Sean. A lot of real context is produced **outside** Hermes — Claude or Codex in a VS Code terminal, the local Qwen model, a one-off script — and without a channel it never reaches Hermes unless Sean re-types it. The fix is a low-friction drop box. At the close of any substantial task/slice/phase done outside Hermes (or any time you learn something Hermes should carry — a decision + why, a new/changed surface, a live-state fact, a risk, a Sean-owned blocker), drop a short memo into `.ai-workflow/hermes-inbox/pending/`. **One file per memo** named `<UTC-YYYYMMDDThhmmssZ>-<surface>-<slug>.md` (never append to a shared file — concurrent agents would clobber; a backlog is just N files). Hermes reads all pending memos at its next session start (via the proven daemon repo-read path — extend the read list, do NOT invent transport), absorbs what it needs, then memos are **archived to `consumed/<YYYY-MM>/` — never hard-deleted (Rule 34)** so the record survives while `pending/` stays fresh. Because the Pi runs read-only (Rule 47) and is currently SSD-power BLOCKED (`MEMORY.md`), Hermes records a high-water mark and reports "consumed through `<ts>`"; the physical archive move is done in-repo by a terminal agent / prune step (mirror `scripts/coordination-prune.mjs`) — Hermes never git-writes from the Pi. **Privacy (Rules 8/44/59):** committed + LLM-read → IDs/roles only, secret-scan every memo (`scripts/scan-secrets.sh`); no PII, keys, tokens, DB URLs, or absolute paths. **Distinct from Rule 68** (Fable-tier-only, durable, compounding *lessons*) **and the continuity bridge** (Sean-triggered *closeout log* for the next terminal session): this is the **any-agent, ephemeral, drained daily working memo**; a memo may be *promoted* to a learning-packet if it proves a permanent Fable-tier lesson. **Guaranteed to fire, not "maybe":** (1) this rule in boot context, (2) the `hermes-inbox` skill (`.claude/skills/hermes-inbox/SKILL.md`) carries write + drain procedure, (3) folded into `closeout-evidence-lock` (Rule 41) so it recurs at every substantial task close, (4) a `SessionStart` hook (`scripts/hooks/hermes-inbox-reminder.mjs`, wired in `.claude/settings.json`) injects a once-per-session reminder + pending count — harness-executed = the deterministic layer, once/session over a per-turn `Stop` hook to avoid token-noise *(amended 2026-07-11: Sean opted in to a per-turn deterministic `Stop` command hook as layer (5) — see "Rules 68-69 automatic closeout override" at the end of this file)*. Protocol: `.ai-workflow/hermes-inbox/README.md`. **Why:** Sean 2026-07-06 — "write a file that's gonna always be looked at by Hermes… Hermes reads everything, learns what it needs about the day of the project, takes it in memory, and then [clears] it… so codex and all the other AIs, even Qwen, will write information here for the case that it wasn't done inside of Hermes."

    **AMENDED 2026-08-04 — the MISTAKES SECTION is mandatory in every substantial memo.** Sean: *"give a report to Hermes, especially about the mistakes that you made so I can learn from them… normally we are supposed to give reports to Hermes, especially since we are using Opus 5 [and] they pull in Kimi. This should be automatic… literally a skill."* Memos were recording *lessons* while soft-pedaling the **author own errors** — the highest-value training signal Hermes can receive. Every memo for substantial work now carries `## Mistakes I made`: one line per error — what I got wrong → how it was caught → the rule that prevents the repeat. Include errors caught and fixed **mid-task** (a mistake that never reached Sean is still real training data), tools that reported **false success**, wrong severity calls, and claims walked back. **If you repeated a mistake you had already written up, say exactly that** — that repeat is the single highest-signal entry a memo can contain. When a **paid/external model** (Kimi, HY3, Village, Fable) was consulted, add an **`## External-model calibration`** line: findings real vs disproven on verification, so Hermes learns what each model is worth per task class. Honest-empty (`## Mistakes I made — none surfaced this task`) is allowed only after a hostile pass genuinely ran dry; **never omit the heading** — an absent section reads as "nothing went wrong," which is almost never true. **Enforced in three layers, not by memory:** (1) `.claude/skills/hermes-inbox/SKILL.md` step 3b, (2) `.ai-workflow/hermes-inbox/ENTRY-TEMPLATE.md` ships the headings so every copied memo starts with them, (3) `scripts/hooks/hermes-closeout-gate.mjs` **reads the emitted memo and BLOCKS the turn when the heading is absent** (fail-open on unreadable files; honest-empty accepted; 16/16 contract tests, mutation-proven).

70. **Batch-Push Cadence — no per-slice deploy waits (MANDATORY)** — Established 2026-07-06 by Sean during the Fable vision /loop: "no need to wait that long… go back to back… I would rather just do the work and then push everything at the end. that waiting takes too long." Multi-slice working sessions run **back-to-back**: build slice → run ALL local gates per slice (affected vitest, tsc true-exit from `frontend/`, vite build, `node --check` + import-execution smoke on touched backend modules, Rule 42 audit, secret scan) → **commit per slice locally (explicit paths — clean history, per-slice revertability) → do NOT push → start the next slice immediately.** Push the WHOLE batch once at session/batch end (rebase onto origin/main if it moved, re-verify the rebased tree), which triggers ONE Render deploy, then run ONE §4.9-style deploy verification (backend health + release-marker chunk walk; do the targeted chunk-name hunt — local dist names the chunk, find its reference in the deployed graph — before declaring a marker absent). Waiting/sleeping between slices is justified ONLY when a deploy is actually in flight AND its verification blocks the next decision. Exceptions that still push immediately: production-outage fixes (boot crash, revenue-path down) and anything Sean explicitly asks to ship now. Why: the per-slice push→wait→probe cadence turned most loop ticks into deploy-babysitting and multiplied Render deploys; batching removes the wait and the churn without giving up per-slice gates or verification truth.

71. **Fable-Mode Continuity + Model/Effort Routing (MANDATORY)** — Established 2026-07-07 by Sean from the Fable-extraction transcript ("you can't keep the model's intelligence, but you can keep its process"). Two disciplines:
    - **Fable-mode:** `.claude/skills/fable-mode/SKILL.md` packages Fable's working discipline — five gates (scope adversarially → evidence before reasoning → attack your own reasoning → verify before declaring → report calibrated) plus the standing habits distilled from Fable's system prompt (training memory ≠ current knowledge — verify it; a prompt implying a file exists doesn't mean it does — check; answer even an ambiguous query first, then at most ONE clarifying question; own mistakes plainly and stay on the problem) — into one loadable mode. **Any non-Fable model acting as Final Decider (Co-Orchestrator fallback chain) MUST load it at session start.** Any model may load it for genuinely hard problems or when Sean says "fable mode." It packages rules 15/17/19/26/51/61 into a working mode; it bypasses no gate. **Provenance guard (corrected 2026-08-11):** fable-mode does NOT elevate rule-68 tier — **tier comes from the MODEL, never from the mode.** `claude-opus-5` is independently Fable-tier (Sean 2026-08-10) and writes the learning corpus on its own provenance, with or without fable-mode loaded. A **sub-Fable** model (Opus 4.8, Sonnet, Codex, Gemini, Qwen) that loads fable-mode is still sub-Fable and routes to quarantine. The original wording said "Opus … routes to quarantine" unqualified, which predated the Opus-5 designation and contradicted rule 68.
    - **Model/effort routing:** before spawning subagents/Workflows, pick the cheapest model+effort tier that meets the task's intelligence/taste bar (routing table lives in the skill). Default shape: the SMART model scopes, writes worker prompts with acceptance criteria, and verifies/arbitrates; CHEAP models (Sonnet/Haiku) execute the bounded stages — transcript-verified twice (Fable+Sonnet ≈ Fable+Fable; Opus+Haiku ≈ Opus+Opus at ~3× less cost). Don't default to xhigh/max effort — it runs longer, costs more, second-guesses itself, and can produce WORSE output than high on routine work; reserve top effort for judge/verify stages and security cores. Rule 16 (Village spend gate) still governs every routing choice. (Rule 12's no-Grok prohibition was repealed 2026-08-20; Grok is a permitted paid seat under the same spend gate.)

72. **The Catalog — distilled recall layer (MANDATORY)** — Established 2026-07-20 (brain-review packet verdict, Fable Final Decider). Swan's recall layer is a **generated markdown catalog**, NOT vector RAG. One catalog file per trust boundary:
    - `docs/ai-workflow/CATALOG.md` — tracked; indexes only already-committed docs (AI-HANDOFF, brainstorms, references).
    - `.ai-workflow/CATALOG.local.md` — gitignored; indexes the gitignored operational stores. Never merge the two — a merged index is how gitignored content leaks into git (Rules 8/44/59).
    - Row format: `path | date | author | decision | status | source-SHA12` (git blob SHA of the source file).

    **Usage law:**
    - Before answering any "what did we decide / where is X / has this been done before" question, **grep the catalogs first** (`rg "<topic>" docs/ai-workflow/CATALOG.md .ai-workflow/CATALOG.local.md`). Grep — do NOT load the whole catalog into context by default.
    - **Rows are pointers, never canon.** Acting on a row requires opening the source file. A row may never be cited as doctrine (Mobbin L6/L7 promotion is untouched and human-only).
    - A row whose `source-SHA` no longer matches the file is **STALE** and must not be trusted — regenerate via `node scripts/catalog-regen.mjs` (sole writer; deterministic; never calls an LLM; `--check` exits 2 when re-distillation is needed).
    - The catalog is **generated only; hand-edits are forbidden.** If a row is wrong, fix the source document and regenerate.
    - Regeneration is **T2**: may read anything already in the repo, writes exactly the catalog file(s), never writes into `wiki/`, `docs/ai-workflow/references/`, or any L6/L7 surface. Incremental regen via the SHA manifest — only re-distill files whose blob SHA changed.
    - **New handoff/brainstorm docs must carry frontmatter** `decision:`, `status:` (open|shipped|superseded), and `supersedes:` (path or none) — so new docs are born catalog-ready and the distiller degrades into a parser.
    - **Standing prohibition with a re-decision gate:** no vector/embedding/RAG infra, no autonomous external ingestion (email/Slack/Gmail ingest = T3, refused), no knowledge graph for flat lookups (per graphify policy). Re-open ONLY if the non-archived catalog exceeds ~2,000 rows or a single operational store exceeds ~5,000 items — and record that re-decision explicitly; do not drift into it. This reaffirms the anti-RAG table in `HERMES-WIKI-MYTHOS-MASTER-PLAN.md`.

73. **ADW Discipline — Three Actors, Validation Gates, and the Harness Ruling (MANDATORY)** — Established 2026-07-21 from the IndyDevDan model-fusion/ADW analysis + Boris Cherny "domain knowledge → infra" post, hardened by a Kimi K3 hostile consult (Fable verdict, Sean-approved; master prompt: `docs/ai-workflow/AI-HANDOFF/MASTER-PROMPT-ADW-FUSION-UPGRADE-2026-07-21.md`).
    - **Three actors:** engineers, agents, and deterministic code create value; code is free, fast, and reliable. Before assigning any task to an agent, ask: *can plain code do this?* Deterministic fields (SHAs, dates, counts, IDs) must NEVER pass through an LLM (proof case: catalog SHA corruption 2026-07-20). Prefer: code > agent > human, for any step code can do.
    - **Validation Gates:** substantial build slices route through `swan-gate` — an independent validator writes an executable `gate.mjs` BEFORE the build; the builder never edits the gate (hash-diff enforced); fail output loops back ≤3 times then escalates. Gate evidence is required in closeout (Rule 41 amendment). Trivial/doc-only slices are exempt.
    - **Twice = codify:** a defect class any agent fixes for the SECOND time MUST produce a deterministic guard (lint rule, pre-commit check, test, gate `_lib` helper) in the same slice — not another prose rule. Bounds: the guard targets the *class*, not the instance (if only the instance is checkable, it stays prose); any guard that hasn't fired in 90 days is reviewed for retirement (dead guards masquerade as safety). New prose rules/skills must cite the observed failure they encode — never speculative. First application: `scripts/hooks/frontend-guards.mjs` (pre-commit G1 no-MUI, G2 no-recharts, G3 retired Galaxy palette, G4 raw hex).
    - **Agent confusion = doc bug:** when a fresh agent session has to ask where something lives or gets a convention wrong that a steering file should have taught, fix the steering line IN THAT SESSION (surgical, one line) — agent clarifying-questions are failing tests for the docs.
    - **Vocabulary:** a chained set of build/verify stages is an **ADW (AI Developer Workflow)**; the org of ADWs + board + agents is the **software factory**. Use these names in docs and handoffs.
    - **Harness ruling (standing):** the Swan harness of record is this repo's rules+skills+hooks stack on Claude Code, with Codex as the standing second lane. New harnesses (PI coding agent, Antigravity, etc.) may be TRIALED as additional lanes with Sean's explicit approval, but replacement of the harness of record requires a Fable-tier review + Sean sign-off recorded in the catalog. And-not-or.


74. **Proof-Before-Done — no "done" without a passing hostile-review gate (MANDATORY, HARD RULE, applies to EVERY agent — Claude, Codex, Fable, Sonnet, subagents, workflows)** — Established 2026-07-22 by Sean after the SwanGuard shell-rebuild: an agent reported the work "all fixed / done," Sean forced a hostile review, and round 1 found **4 real defects** (command-palette shortcuts routed to the wrong screen, a phantom focus target, and a destructive-action gate that was mouse-only so keyboard users couldn't confirm). Sean's words: *"We cannot say anything is done until we can prove it… don't say nothing's done. In that case we would probably need to do a hostile review to go ahead and confirm."* This has cost Sean real time across many sessions. It is now a hard gate.

    **The core law:** an agent may NOT use the words **done / complete / fixed / finished / ready / shipped / working / passing / good to go** (or any synonym asserting the work is finished/correct) UNLESS, in the SAME message, it presents **proof it generated and verified in the current session** AND states that a hostile-review pass was run and came back clean. No proof + no clean hostile pass = the work is **NOT done**, and the agent must say so plainly ("implemented but not yet proven — running the hostile-review gate now") instead of claiming completion.

    **What counts as PROOF (must be current-session, reproducible, and shown — not asserted):**
    - Executed command output pasted/summarized with the exact command (e.g. `npm test` → `X passed`, `tsc --noEmit` exit 0, `npm run build` → built, the specific vitest file → N/N).
    - A failing→passing regression test that exercises the ACTUAL caller path (not a local happy path), or an explicit statement of why a test wasn't feasible + the real entry-path check that replaced it (Bugfix standard).
    - For UI/data-truth: a Canonical Surface Receipt (Rule 26) or a live probe (browser network panel, computed-style read, real-DOM assertion) — file:line + observed value, not "should render."
    - For a claim about behavior: `[VERIFIED]` per Rule 51 with the reproducible evidence inline. `[LIKELY]`/`[HYPOTHESIS]`/`[UNKNOWN]` are NOT proof and cannot accompany a "done."

    **The hostile-review gate (mandatory before any completion claim on substantial work):** after implementing, the agent switches into hostile-reviewer mode (Rule 17/61) and actively tries to break its own work — then **loops: find defects → fix → re-verify → hostile-review again — and does NOT stop until a full hostile pass finds NOTHING new** (the "run dry" bar, same as Rule 61 + the DRY-LOOP discipline). Only after a clean dry pass may it report. The report MUST state: what the hostile pass looked for, what it found and fixed (even "found nothing this round"), and the proof evidence. A single implement-then-declare with no hostile loop is a **rule violation**, not a completion.

    **Forbidden phrasings (categorical, like Rule 34's cleanup bans):** "it's fixed" / "all done" / "should be working now" / "that's complete" / "looks good" / "ready to ship" / "everything passes" — whenever they appear WITHOUT current-session proof + a clean hostile pass in the same message. Replace with the honest state: "implemented; hostile review + proof pending," or "verified done — [evidence]: tests N/N, tsc clean, hostile pass dry (rounds: K)."

    **Applies to subagents and workflows too:** a subagent's "done" is a HYPOTHESIS (Rule 30) until the dispatching agent verifies it with its own proof + hostile pass. Never relay a subagent's completion claim to Sean as fact. Workflow stages that report success must carry the same proof; the orchestrator re-verifies before the turn's completion claim.

    **The escape hatch is honesty, not silence:** if the work genuinely cannot be proven in-session (e.g. a live authenticated browser journey needs a backend that won't run here), the agent DISCLOSES the gap explicitly (what could not be proven, why, and what lower-tier evidence stands in — as done in the SwanGuard audit's "browser-journey LIMITATION" section) and does NOT claim done for the unproven part. Partial proof → partial, scoped claim only (Rule 28 Claim-to-Evidence Lock).

    **Closeout enforcement:** this rule is enforced at the `closeout-evidence-lock` gate (Rule 41) — closeout must refuse to emit a completion claim that lacks proof + a clean hostile pass, and must print the proof + the dry-pass round count. Additionally the deterministic `Stop` hook `scripts/hooks/dry-loop-gate.mjs` BLOCKS any build-shaped turn (≥2 non-emission file writes OR a git commit/push) whose closeout lacks EITHER the `DRY-LOOP: CLEAN×2` marker OR a `PROOF:` token (unit-tested in `dry-loop-gate.test.mjs`). **Why:** Sean has burned countless hours catching "done" claims that weren't. The fix is structural: proof and an adversarial dry-loop are the price of the word "done." No proof, no done.

75. **Trailhead-Truth — docs, READMEs, closeouts, status, and in-app copy describe what the code does NOW, never the destination (MANDATORY, HARD RULE, applies to EVERY agent — Claude, Codex, Fable, Sonnet, subagents, workflows)** — Established 2026-07-22 by Sean after an agent's own audit named the exact failure in its own words: *"I let closeout/README language describe the destination while the code was at the trailhead."* The docs — and worse, the app's own UI copy — narrated the intended, finished feature in present tense while the code was barely started: stubbed, unwired, or mocked. This is DISTINCT from a false "done" claim (Rule 74) and a claim-without-receipt (Rule 28): those govern *completion assertions*; **this governs aspirational prose stated as current reality.** A README that says "SwanStudios generates cinematic worlds from your workout data" while the generator is a stub is a lie the next reader — or the paying user — acts on.

    **The core law:** every present-tense capability statement in a README, doc, closeout, status update, commit body, handoff, changelog, OR user-facing UI/marketing copy MUST be true of the code AS IT EXISTS NOW. Intended/planned/partial behavior MUST be tense-marked as such — `Planned:` / `Not yet wired:` / `Design intent (unbuilt):` / `Stub — returns mock data` — never phrased in the present indicative as though it already works. When in doubt, describe the trailhead (what runs today) and label the destination (what's designed but unbuilt) as a separate, clearly-future thing.

    **The app-tells-the-truth corollary (highest stakes):** user-facing copy is the worst place for this failure — if a screen says the app does X and the code doesn't, **the app is lying to the user**, and that is a P0 correctness bug, not a wording nit. The #1 fix for any surface whose copy over-promises is ALWAYS to make the copy tell the truth FIRST (downgrade/qualify the claim to match the code), and THEN close the real correctness gap. Never leave a false claim standing on a live surface while the "real" feature is deferred to later.

    **How to apply:** before writing or committing any README, doc, closeout, status, changelog, or in-app copy, every present-tense capability claim must map to code that actually does it now (grep/trace it) or be tense-marked as planned. On hostile review (Rule 61) and at closeout (Rule 41), sweep the prose against the code: does it describe the trailhead, or narrate the destination? A closeout that describes a destination the code hasn't reached fails BOTH the Claim-to-Evidence Lock (Rule 28) and this rule. Cross-references: Rule 26 (canonical surface receipt proves what is actually mounted), Rule 28 (claim-to-evidence), Rule 34 (forbidden-language discipline), Rule 74 (proof-before-done). **Why:** Sean, 2026-07-22 — the mistake "keeps happening; we don't wanna ever make this mistake again — let's make it on that level." Docs and UI that describe the destination while the code sits at the trailhead mislead the next agent, mislead Sean, and — in user copy — mislead the customer. Truth is the trailhead, always.

76. **Create-With-Context — expert brains are CREATIVE PEERS whose ideas FUSE, Claude is the AUTHOR (MANDATORY routing for all substantial creation)** — Established 2026-07-24 by Sean, tightened same day: *"use your creativity AND Kimi's, combine them both together for the final creativity idea."* The split: **creativity ~50/50** (BOTH Claude and the expert generate real, original ideas — Claude must bring its OWN, not just curate the expert's), **authorship 100% Claude** (Claude owns the fusion and is accountable). Every substantial creation (net-new feature / component / page / dashboard surface / system / design, or a meaningful upgrade / redesign) auto-routes through the `create-with-context` skill and its five steps:
    1. **GROUND — find what exists, then make it BETTER.** Audit the REAL current state before designing anything (never create from memory; spawn an `Explore`/audit agent or run `canonical-surface-audit`; cite file:line). Grounding is NOT only to avoid duplication — when it surfaces existing work, LOOK IT OVER FOR UPGRADES: does it match the vision, the house rules, the least-clicks bar, the premium bar? Then EXTEND/IMPROVE it toward the vision rather than rebuilding from scratch OR leaving it as-is. Both failures are banned: don't-reinvent AND don't-leave-it-weak. Honors Rules 18/26/52/58. Memory is a hypothesis; the audit is truth; existing code is a starting point to upgrade.
    2. **ENHANCE** — remake Sean's prompt into a grounded brief that fills the gaps he may have missed + surgical amplifying features (Rule 62). This is the `prompt-watcher` enhancement, written down.
    3. **EXPERT AS CREATIVE PEER** — feed the brief to the RIGHT expert: **Kimi K3** for design/front-end (`consult-kimi.mjs --effort medium --max-tokens 16000`), free **triangle fusion** or `swan-oracle` for architecture/strategy, paid **Village** for high-stakes (Rule 16, ask-first). The expert generates creative ideas + hostile critique — AND Claude generates its OWN original ideas in parallel (do not outsource creativity, match it). If Sean names the expert, the paid consult is pre-authorized that turn; otherwise free-first, ask before paid.
    4. **FUSE** — **CLAUDE authors the fusion of BOTH idea sets**: puts its own ideas and the expert's on the table together, keeps the best of each, cuts what doesn't fit (including the expert's — a bad expert idea is rejected, not shipped), and synthesizes ONE final creation with concrete, opinionated decisions. DESIGN it — don't assert "premium/awe"; name the tokens, layout, signature moment, CTA priority, phasing. Blueprint header states "Claude authored the fusion; `<expert>` was a creative peer; `<audit>` was ground truth" + an idea-provenance note (his / mine / cut). Land in `docs/ai-workflow/AI-HANDOFF/` or `brainstorms/` with `decision:`/`status:` frontmatter.
    5. **PRESENT + BUILD WITH PROOF** — blueprint + taste-cut decisions Sean must make + recommended first slice (Rule 60); then build through the normal gates with Rule 74 proof + DRY-LOOP + `closeout-evidence-lock`.

    **The non-negotiable law:** NEVER relay an expert's output as the deliverable — and never reduce Claude to a transcriber either. Both brains create; Claude authors the fusion. Reject expert suggestions that fight the Swan strategy or house rules (Rule 6 tokens, Rule 10 Victory, Dual-Button Glow, dark-first, 44px, ≤300 lines, reduced-motion). This is the creation spine INSIDE the pipeline (`prompt-watcher` → Rule 78 mode classification → optional `wayfinder` → `grill-me`/`chromie` as needed → `swan-orchestrator` → `swan-design-router` → build → `closeout-evidence-lock`), NOT a bypass. Fires automatically every chat via this rule (boot context) + the `prompt-watcher` VISION path. Does NOT fire for trivial edits / bugfixes / questions / status / corrections. Skill: `.claude/skills/create-with-context/SKILL.md`. **Why:** Sean 2026-07-24 — consulting an expert and pasting its answer is a failure mode; so is Claude just transcribing. Grounding in an audit + FUSING Claude's creativity with the expert's produced the charts-upgrade blueprint (`CHARTS-EXPANSIVE-UPGRADE-BLUEPRINT-2026-07-24.md`) this rule was born from. Memory is a hypothesis; the audit is truth; the expert is a creative peer; **Claude authors the fusion.**

77. **Dead-File Quarantine — an unrouted file must never sit beside live code (MANDATORY, applies to EVERY agent)** — Established 2026-07-28 by Sean: *"whenever we find any non-linked, non-routed dead files, they automatically need to be put away and hidden somewhere so that they don't trip the AI into thinking it's the current file."* An orphaned `.bak`, a `Component.old.tsx`, a half-migrated `serviceV2.mjs`, or an agent's own scratch copy sitting next to the real module is a **trap for the next agent**: it greps, finds the dead twin, edits it, verifies nothing, and ships a change to a file no route reaches. This has a proven cost — the whole point of Rules 26/27 (Canonical Surface Receipt, Surface Classification) is recovering from exactly this confusion *after* it happens. Rule 77 removes the trap instead.

    **Two tiers, because "automatic" and Rule 34 (No Blind Cleanup) must both hold.**

    **TIER 1 — agent scratch: auto-remove, no approval needed.** A file the CURRENT session created purely as a working artifact — A/B copies, probe scripts, `*.tmp.*`, `*.before.*`, `probe-*.mjs`, `verify-*.mjs`, dumps written next to source instead of the scratchpad. The agent that created it **deletes it before closeout** and never commits it. No approval, because nothing is being destroyed that existed before the session. Real instance that motivated this rule: a `phiScanner.before.tmp.mjs` A/B copy was left beside the live `phiScanner.mjs` — caught by the diff audit at closeout, one grep away from a future agent "fixing" the wrong file.

    **TIER 2 — pre-existing files that look dead: propose, never move silently.** Requires evidence before any proposal: `rg` for every import/require of the module, route-mount check where relevant, JSX-usage check for components (an `import()` declaration is NOT proof of mount — Rule 26), and a check for dynamic/string-built references. Then classify per Rule 33 and propose relocation to `archive/pending-deletion/<YYYY-MM-DD>/` **preserving the original path underneath**, with a one-line `MANIFEST.md` entry recording origin path, date, evidence, and who approved. Execution happens only with Sean's explicit approval (Rule 34), and the phrases "safe to delete" / "nothing to lose" remain forbidden.

    **Quarantine layout (existing convention, do not invent a new one):** `archive/pending-deletion/<YYYY-MM-DD>/<original/path/preserved>` plus `MANIFEST.md`. Never `archive/` root, never a sibling `_old/` next to live code — the whole point is getting it OUT of the working tree's grep path.

    **When Tier 2 detection runs:** during `repo-hygiene-scan` (Rules 32-39), during any canonical-surface audit that surfaces a competing file, when a grep returns two plausible implementations of one thing, and at the closeout diff audit. It is a **detection-and-propose** gate, not a background deleter.

    **Never quarantine on suspicion alone:** intentionally-dormant modules are NOT dead. `voiceConfirmationTier.mjs` has zero consumers on purpose (SWA-67); `notImplementedCheck` stubs exist to fail honestly. A file with a header explaining why it is dormant is doing its job — read the header before proposing anything. If the file lacks that header and is genuinely dormant-on-purpose, the correct fix is to ADD the header, not to move the file.

    **Closeout requirement:** the post-task hygiene check (Rule 38) must state either `DEAD-FILES: none created, none found` or list Tier-1 artifacts removed and Tier-2 candidates proposed. Skill: `.claude/skills/dead-file-sweep/SKILL.md`.

78. **Agent Workflow Mode Router (MANDATORY for substantial planning, long execution, setup, and unsafe workspaces)** - Run two passes in order. **Pass 1, environment preflight, always precedes mutation:** classify the checkout; dirty, stale, shared, concurrent, or otherwise risky work uses `worktree-isolation` and produces its receipt before any execution mode. **Pass 2, choose the smallest mode:** clear one-session work goes to `swan-orchestrator`; work that is both multi-session and materially foggy uses `wayfinder` (including partly mechanical work with blocking fog), then downgrades a clarified long slice to `goal-contract`; installation/auth/deployment/environment setup uses `guided-setup`. Wayfinder is exceptional, not a ceremony for every ambitious project. A goal contract NEVER authorizes a persistent Codex goal unless Sean explicitly asks to create or pursue a goal, and its baseline/acceptance become immutable after execution starts unless Sean explicitly re-approves an append-only change. Consequential decisions are `VERIFIED`, `REVERSIBLE`, or `NEEDS_USER`; each mode has one canonical decision source, and closeout promotes unresolved entries into the next handoff's first blocking question. Sensitive human setup steps require explicit human confirmation plus safe observable verification. External tracker authority is per-session and names the tracker and permitted write type. Subagents inherit constraints and stop conditions verbatim and cannot expand authority. Third-party skill intake must pin source + commit, record license, inventory network/spend/external-write/secret/destructive behavior, and classify `ADOPT / MERGE / DEFER / REJECT` before installation. The canonical procedure and routing probes live at `docs/ai-workflow/references/AGENT-WORKFLOW-ROUTER.md`; filesystem inventory truth comes from `node scripts/ai-workflow/validate-skill-registry.mjs`, whose failure blocks skill closeout/commit/push.

79. **Tests Can Encode The Bug — a red test after a fix is a QUESTION, not a verdict (MANDATORY, applies to EVERY agent)** — Established 2026-07-29 during the SWA-87 schema-truth work. Fixing three models to match the real DB turned **three tests red — and every one of them was wrong, not the fix.** They asserted columns that do not exist (`progressPercentage` on an award create; `isNew` in a count filter — twice, once inside a **shared harness**). Those tests had been green for months *because* the production code was broken; they were locking the defect in place. A fourth artifact, `gamificationController.mjs`, carried a comment explaining the drift and working around it with an explicit attribute list rather than fixing the model — the defect was **known, documented, and left live**.

    **The law:** a green test is evidence that code matches a test, NOT that code is correct. When a fix makes a test fail, the first question is **"which one is right?"** — answered against ground truth (the live DB, the real API contract, the actual rendered DOM), never by whichever change makes the suite green fastest.

    **Forbidden (this is the whole point of the rule):**
    - Re-adding a phantom field, column, or param to production code so a test passes. That reverts the fix and re-breaks production while showing green.
    - Loosening an assertion (`objectContaining` → `any`, deleting the expectation) to get past a failure you have not diagnosed.
    - `.skip`/`.todo`/`-t` filtering a test that a fix turned red, without recording why in the same commit.

    **Required when a fix turns tests red:**
    1. **Diagnose against ground truth first.** For schema: `information_schema` or a real query. For an API: the actual response. For UI: the real DOM/computed style. Name the source in the commit.
    2. **Correct the test to the real contract**, and add a **negative assertion** (`expect(call).not.toHaveProperty('<phantom>')`) so the phantom cannot creep back. Positive-only assertions let the bug return silently.
    3. **Sweep shared fixtures/harnesses/factories/mocks.** The `isNew` lie lived in `clientSelfServiceCommandDispatcherHarness.mjs`, not in the test that failed — fixing only the visible test leaves the lie in the shared file for every other consumer. Grep the phantom name across `**/*harness*`, `**/*fixture*`, `**/*factory*`, `**/mocks/**`, and `**/*.test.*`.
    4. **Disclose the baseline** (Rule 56): state total pass/fail AND prove the remaining failures are pre-existing — the cheapest method is to stash the fix, re-run *that exact file set*, and show the identical failures.

    **Grep targets that reveal known-but-unfixed defects.** A comment that documents a defect as CURRENT is a fossil of a bug someone chose to work around. Hunt them: `safe attribute`, `bypass`, `workaround`, `drift`, `does not exist`, `until a separate slice`, `temporarily`, `for now`, `known issue`, `HACK`. Each is a candidate real defect **plus** a comment that becomes a lie the moment the defect is fixed — Rule 75 (Trailhead-Truth) governs code comments too, so fix the comment in the same pass.

    **A phantom field read is worse than a phantom field written.** A bad write usually throws. A bad *read* returns `undefined`, so a filter silently counts zero and the surface shows plausible-looking wrong data forever. Live example from this same slice: `view_xp_streaks` filtered `achievement.isNew` and reported `newAchievements: 0` for every client, indefinitely, with no error anywhere.

    **Companion smells:**
    - **A suite that is green against a model that cannot query the DB never touched the DB.** Mock-only coverage cannot see schema drift by construction; that is exactly why `audit-model-health` / `audit-write-paths` exist (Rule 58). Prefer at least one ground-truth check per data-layer slice.
    - **A green test guarding unreachable code** (SWA-99: a carefully-reasoned invariant locking a controller nothing mounts). Same family — the test proves nothing about the running product.

    **Cross-references:** Rule 58 (schema-drift detection — how ground truth is established), Rule 56 (baseline disclosure), Rule 74 (Proof-Before-Done — a suite turned green by appeasement is not proof), Rule 75 (Trailhead-Truth — stale workaround comments), Rule 20 (sibling sweep — shared harnesses are siblings), Rule 77 (Dead-File Quarantine — a green test over a dead twin).

80. **Second-Vantage Verification — one tool's failure is NEVER proof something is broken (MANDATORY, HARD GATE before any destructive remedy, applies to EVERY agent)** — Established 2026-08-05 after a planner investigating the SwanGuard repo ran `git status`, got `fatal: not a git repository`, ranked **"the repo is completely broken" as its #1 finding above everything else**, and prescribed *"re-clone or re-init as an independent repo"* as Slice 0 of the build.

    The repo was completely healthy. Branch `codex/…-recovery-20260801`, full history, tracked modifications, intact worktree metadata. Git failed for exactly one reason: the agent runs in **WSL**, and the repo's `.git` file holds a **Windows** path (`C:/…`) that WSL's git cannot resolve. Windows git reads it perfectly. Executing that slice would have destroyed a branch, its history, and five files of uncommitted work. A human asking for a review caught it. **Nothing else would have.**

    The failure was not the git error. It was collapsing two different sentences:
    > "I cannot reach X with this tool."
    > "X is broken."

    The first is an observation about your tooling. The second is a claim about the world. **Everything expensive lives in the gap between them.**

    **THE GATE:** no `delete`, `re-clone`, `re-init`, `reset --hard`, `wipe`, `drop`, `reinstall`, `overwrite`, or "recreate it fresh" **on the strength of one tool's failure.** Each requires positive evidence of damage **from a second vantage** — not merely an error from the first. If you cannot obtain that evidence, the finding is *"unreachable from here"* and the remedy is **escalate to Sean**, not repair.

    **When it fires:** any sentence of the form "X is broken / corrupt / missing / empty / not found / does not exist / unreachable," "the repo/DB/service/config is in a bad state," "there is no Y here" (when Y's absence would be surprising), or "we need to re-clone / re-init / reset / wipe / reinstall." It fires **hardest** when the proposed remedy is destructive: a wrong "it's broken" that leads to a `--help` is cheap; one that leads to `rm -rf` is not.

    **The check:**
    1. **Name the tool AND the environment, not just the result.** Not "git says it's not a repo" — *"git, run from WSL against a `/mnt/c` path, says it's not a repo."* The moment you write the environment down, the hypothesis appears on its own.
    2. **Re-check from a second vantage** before the claim stands: git failing on `/mnt/c` from WSL → run git from Windows (and vice versa); a file "missing" from one side → check the other side's path; a command "not installed" → check the other shell, the venv, `which -a`, the full path; a service "down" → check the port/socket, not just the client; an env var "unset" → check the *running process's* `/proc/<pid>/environ`, not your shell; a dir "empty" → check permissions and that you are where you think; an API "returning nothing" → check status code and raw body before parsing.
    3. **Look for the artifact that would exist if it really were broken.** A truly broken git repo has no intact `refs/`, `logs/`, or `HEAD`. **Absence of damage is evidence of health** — go find the damage before you claim it.
    4. **State the residue.** If a second vantage was impossible, say so explicitly: `[UNVERIFIED — could not check from <vantage>]`. Never upgrade an unverified failure into a fact.

    **Build it into the tooling, not just the habit.** Any diagnostic that reports "unreachable" must try the second vantage *itself* before giving up. Proven 2026-08-06: the test-delta detector in `scripts/hermes/review.py` reported `[UNVERIFIED]` for SwanGuard from WSL — correct, but it meant the gate would have been **decorative in 100% of real Hermes runs**. It now falls back to Windows `git.exe` with a translated path and reports unreachable only after *every* vantage fails.

    **Absence claims are the same error in a different costume.** "No Linear issue exists," "there's no test for this," "that file isn't anywhere," "nothing references it" — each is a claim about the world derived from not having looked hard enough. Search before asserting absence; an empty result from one query is not an empty world.

    **Reviewer duty:** treat every "X is broken" in another agent's work as **unproven until you re-check it yourself from a different environment.** This is the single highest-yield check when reviewing anything produced by an agent that lives in WSL while the repos live on Windows — the mismatch is structural, so this error will keep recurring.

    **Cross-references:** Rule 34 (No Blind Cleanup — the forbidden-language sibling), Rule 47 (supervised read-only launcher — redaction-at-source applies the same principle to remote shells), Rule 74 (Proof-Before-Done), Rule 51 (confidence tags — an unverified failure is `[HYPOTHESIS]`, never `[VERIFIED]`), Rule 52 (anti-rework burden of proof). Full procedure: skill `cross-env-verify`.

81. **Test-Delta Disclosure — a pass count that includes assertions you rewrote is not proof (MANDATORY, applies to EVERY agent)** — Established 2026-08-06. This is the **disclosure half of Rule 79**: Rule 79 grants that a red test may itself be the thing that is wrong; Rule 81 requires you to show your work when you act on that grant. Without 81, Rule 79 is a license to edit any inconvenient assertion.

    Incident: a builder appended migration `0026` to SwanGuard, which turned three existing position-anchored tests red. It re-anchored all three — **correctly** — and reported *"all 52 database tests pass."* Every edit was right; the report gave no way to know that. One sentence was doing two jobs at once: vouching for 49 tests that passed on their own, and vouching for 3 whose assertions the author had rewritten minutes earlier so that they would.

    Every edit to an existing test is exactly one of two things:
    - **RE-ANCHOR** — the contract genuinely changed, and the old assertion encoded the old contract. Legitimate, expected, often mandatory.
    - **SILENCE** — the code broke a contract that still holds, and the assertion was moved to match the break. A bug, now wearing a green checkmark.

    **In a diff these are indistinguishable. In a pass count they are invisible.** The only one who can tell them apart is the author, at the moment of the edit, while the reason is still in their head. The failure mode is not dishonesty — it is flow: red test → obvious fix → green → move on. Each step is locally reasonable, which is why the reflex is the danger.

    **The requirement:** report a **test-delta table** — one row per changed assertion, not per file — **before and separately from** the pass count, then split the number: *"52 passed — 49 unchanged, 3 re-anchored above."* Columns: `File:line | Before | After | Class (RE-ANCHOR|SILENCE) | Why the new assertion is the correct one`. **The *why* must stand alone, without the diff, in one sentence** — if you cannot write that sentence, you have not established which class you are in, and you must find out before reporting rather than after. **Any row you would honestly class SILENCE is a STOP:** escalate it and name the contract. Silencing a live contract is a spec change, not a builder's call.

    **Fires on** any edit to an assertion-bearing file: changing an expected value, count, length, index, or ordinal; changing or loosening a matcher; widening a tolerance/timeout/retry; renaming a test in a way that changes what it claims; deleting a test or an assertion inside one; adding `.skip` / `.only` / `xit` / `@pytest.mark.skip`; editing a shared fixture, factory, harness, or `conftest`; regenerating a snapshot. **Does not fire** for a brand-new test file or for new assertions that leave every existing one untouched — net-new coverage is not standing in for evidence that already existed.

    **Anchor on identity, not position.** `toHaveLength(26)`, `.at(-1)`, `[25]` break every time a list grows, and the "fix" is always to bump a number — **which is exactly the reflex this rule exists to interrupt.** A test that must be edited on every unrelated append is training the habit that hides bugs. Prefer `find(m => m.version === '0025')` / `toContain('0026')`. **When you find yourself editing a positional assertion, that is a signal the assertion is wrong, not merely outdated** — say so in the *why* column and fix the anchor in the same slice if it is a one-liner. A count that *deliberately* pins a registry size as a canary is legitimate; say so, so the reviewer knows it was a choice.

    **Reviewer duty:** never accept a bare pass count from a turn that edited tests — its absence is a finding, not a formatting nit. Get ground truth yourself (`git diff -- '*test*' '*spec*' '*fixture*' '*conftest*'`), classify each row **independently before** reading the author's reason, then compare; disagreement on the class is a **blocker**. Watch the quiet ones that never turn a suite red and never change the count: an added `.skip`, a deleted assertion, a regenerated snapshot, a widened tolerance — the only edits that reduce coverage while looking like maintenance.

    **Cross-references:** Rule 79 (Tests Can Encode The Bug — the permission this rule disciplines), Rule 74 (Proof-Before-Done — proof you manufactured in the same breath you cited it), Rule 56 (baseline disclosure), Rule 58 (schema drift — the usual cause of a legitimate re-anchor), Rule 20 (sibling sweep — shared harnesses are siblings). Full procedure: skill `test-delta-disclosure`; enforced for Hermes by `scripts/hermes/review.py`, which scans the repo and pre-seeds the table.

82. **Full-Spectrum Panel — no narrow-lens consults (MANDATORY for every multi-model run)** — Established 2026-08-16 by Sean. Every external-model consult — AI Village, Kimi, GLM, HY3, Fable, Gemini, the fusion triangle, any hostile review — MUST have **every model answer the COMPLETE brief across ALL angles**: product, architecture, security, UX/interaction, strategy, synthesis, and final-decider judgement. Assigning each model a narrow role and restricting it to that role is **forbidden**.

    **Roles are declared, not restrictive.** A model MAY be given a specialty. When it is, the required shape is: *"My assigned role is X. From that angle, here is my view… and here is everything else I see across every other angle."* The role earns the model's deepest pass; it never bounds the model's scope. A reply that covers only its assigned lane is **incomplete** and must be re-run.

    **Why (the incident that established it):** on 2026-08-15/16 a six-model panel was run with per-model lenses — Kimi as systems architect, GLM as product lead, HY3 as interaction designer, Gemini as design authority. GLM 5.3, restricted to the *product* lens, nonetheless produced **the single best architectural catch of the entire session** and its sharpest security finding — despite being explicitly pointed away from both. What it withheld *because of its assigned remit* was unknown and unrecoverable without a full re-run. Sean: *"we miss out on a lot of good stuff from GLM 5.3 on everything else… every hostile review is not coming from a narrow lens, it's coming from every angle, from every AI."* Lensing optimises for **non-overlap between reviewers**, which is the wrong objective; the objective is **maximum depth per brain on every dimension**. Diversity of conclusions comes from model diversity, not from artificially narrowing each model's remit. **The re-run proved the cost:** unlensed, GLM immediately found three structural defects the lensed round had missed entirely — an inference loop assigned to the wrong device, an undesigned final handoff step that made the kill criteria unmeasurable, and a locked input choice that violated the project's own locked privacy constraint.

    **How to apply:**
    - **One shared packet.** Every model receives the byte-identical brief containing all sections. Differentiate models by nothing, or at most by which section they are invited to go deepest on — never by which sections they may answer.
    - **The consult scripts default to LENSED remits — you must override them.** `scripts/consult-kimi.mjs` and `scripts/consult-hy3-design.mjs` both compute `options.remit || defaultRemit`, and both defaults are narrow *and* SwanStudios-branded ("Give only UI/UX and interaction suggestions", "Enforce Crystalline Swan dark-first… Victory charts…"). An explicit `--remit` **replaces** the default; omitting it silently reintroduces exactly the failure this rule bans, and injects Swan branding into non-Swan projects. **Always pass an explicit full-spectrum `--remit`.** Fixing the script defaults is a small, real, unclaimed slice.
    - **Identical required output format** across all models, so replies stay directly comparable for synthesis.
    - **`DISSENT` is a mandatory section in every reply** — where the packet's own assumptions are wrong. Absence of a dissent section means the reply is incomplete.
    - **Check for truncation before synthesising.** A reply that hits `max_tokens` loses its tail, which is usually the build-order and do-NOT sections. Compare `completion_tokens` against the cap and re-run a continuation for the missing sections rather than synthesising from a cut-off answer.
    - **A specialist pass runs IN ADDITION to the full-spectrum pass, never instead of it.**
    - **Synthesis must attribute per model per angle** — which model caught what, on which dimension. This is what makes the routing table learnable over time (feeds Rule 68's `## External-model calibration`).
    - If a reply comes back lane-bound, **re-run it** rather than synthesising from a filtered view.

    **What this does NOT require:** it does not mandate more models, more rounds, or more spend. Rule 16's permission and spend gates are unchanged. It changes the *shape* of the brief, not the size of the panel — a three-model full-spectrum run costs the same as a three-model lensed run and returns strictly more.

    **Cross-references:** Rule 16 (Village permission + spend gate), Rule 46 (3-brain review order), Rule 50 (Tier-B AI cross-review), Rule 61 (slice-internal hostile review), Rule 68 (`## External-model calibration` — per-model findings-real-vs-disproven, which this rule makes measurable), Rule 71 (model/effort routing — routing by cost/capability is still correct; this rule forbids routing by *scope*), Rule 74 (proof-before-done).

83. **Handoff Skill — session transfer is a skill, not a speech (MANDATORY, fires on ANY handoff phrasing)** — Established 2026-08-17 by Sean: *"I'm tired of saying this. I tell this to every agent."* Every time a chat got long, Sean had to re-dictate the same paragraph — capture everything from the beginning, not just the tail; look for gaps in my vision; suggest what I didn't think of; then ask me about it. That paragraph is now `.claude/skills/handoff/SKILL.md` and fires on the trigger alone.

    **Triggers (deliberately wide, and NOT just one phrase):** "handoff" / "hand off" / "hand this off" / "we're gonna need to hand this off" / "handoff report" / `/handoff` / "pass this to the next agent" / "this chat is getting long" / "we're running out of context" / "continue in a new chat" / "start a new agent on this" / "write this up for the next one" / "make sure the next agent knows everything" — and anything that means the same thing. **If you are not sure whether a handoff was meant, ASK in one line** ("Did you want a full handoff for the next agent on this?") and stop — do not guess one into existence, and do not silently skip one. Not a trigger: "hand me that file", "off-hand", or handing off between *people*. Read the sentence, not the substring.

    **What the skill does, in order:**
    1. **Harvests the WHOLE conversation, first message forward** — not the recent turns. The original ask in Sean's framing (including his mid-session corrections, which outrank the initial request), every decision *and its reason*, every rejected option *and why* (or the next agent re-proposes it), verified state with the command that proved it, claims **disproved** this session, traps hit live, Sean-owed items, and anything deliberately NOT done and why.
    2. **Re-derives every number.** Counts, SHAs, row totals, test results must come from a command run in that pass — **never inherited from the handoff being superseded.** This is the most common way a handoff ships a lie, and it is recorded because it happened live on 2026-08-17: an agent wrote "assume this file has decayed — re-verify" and four paragraphs later copied an unverified row count from the file it was superseding. It was wrong.
    3. **Gap-analyses against Sean's vision** — what the plan needs and lacks; features/options/logic he never mentioned; **cheaper paths to the same goal**; minimal-click wins with before→after counts; what to kill. The strongest gaps are **structural asymmetries — a rigor or gate applied to one part of the system but not to a comparable part.** Look specifically for *the thing we believed in getting less scrutiny than the thing we doubted*; the belief is exactly what should have been tested. Ranked, with a recommended first move — a recommendation without an order is a menu, not advice.
    4. **Grills Sean on the gaps** (`AskUserQuestion`, recommended option first with a one-line reason, one topic at a time) and **records his verdicts in the handoff itself**, so the next agent inherits decisions instead of open questions. Skips the grill when it would be noise (trivial gaps, already answered, he's mid-flow) and says so.
    5. **Writes the document** to `docs/ai-workflow/AI-HANDOFF/` (Rule 35 — never root) with `supersedes:` frontmatter and a staleness pointer on the old file (Rule 34 — never delete it), then a **paste-ready agent prompt** that tells the next agent to load this skill first, so the chain does not break at the first link.
    6. **Closes the house gates:** Linear sync, Hermes memo (a handoff is substantial by definition), learning packet if Fable-tier, lane release, secret scan.

    **Where it must exist:** `.claude/skills/handoff/SKILL.md` (project skill — it overrides any generic plugin skill of the same name), this rule in **both** `CLAUDE.md` and `AGENTS.md` (Codex and Claude orient identically), and **Hermes** must carry the same capability so a handoff requested from Telegram behaves the same as one requested in the terminal.

    **Why:** context that lives only in a chat dies with the chat. The transfer moment is also the one point in a session where the whole shape of the work is visible at once — which makes it the right moment for the gap analysis, not just a transcript. Rule 57 is the inline narrative, Rule 48 the per-phase audit record, the continuity bridge the cross-session log; **this is the cold-start document for the next agent**, and it is the only one of the four that carries forward-looking advice.

84. **Forge-First UI — new UI of a class the Forge ships comes from `@swan/forge`, or files a ledgered exception (MANDATORY, applies to EVERY agent building UI in a Forge consumer repo)** — Ratified by Sean 2026-08-24 (Component Forge grill, decision D4; scoped per plan §11.C4) and armed 2026-08-25 when the Phase 1.5 wiring gate passed with live proof (`docs/ai-workflow/brainstorms/component-forge-catalog-2026-08-24.md` §15–§16). The Swan Component Forge (`packages/swan-forge/`) is the canonical catalog: one headless core + structural variants + zero-runtime token skins per component, re-themed per site by theme pack. **Both reviewers of the plan independently named this the highest-leverage rule in it: a catalog nobody is required to consume becomes a museum.**

    **The law, scoped exactly:**
    - **Applies ONLY to classes the Forge actually ships** — `packages/swan-forge/README.md` "Live inventory" is the sole authority on that list (never a parenthetical in this rule). No exception spam for classes the catalog does not cover yet.
    - **Applies to NEW UI — and to GROWING legacy UI of a shipped class.** Adding variants, props, or new styling to a legacy component whose class the Forge ships (e.g. extending the old GlowButton) requires the same ledger row as building new; only bug fixes to legacy are free. Existing local components migrate via strangler PRs — one component per PR, never a big-bang rewrite — in the order of `docs/ai-workflow/AI-HANDOFF/FORGE-STRANGLER-BACKLOG-2026-08-25.md` (generated from the drift-linter's R4 findings; regenerate, never hand-edit).
    - **The exception path is a ledger row, not a comment:** `packages/swan-forge/EXCEPTIONS.md` — path, rule, owner, expiry (≤ 90 days), reason, **and a second-party review** (a peer agent's APPROVE in `.ai-workflow/coordination/review-queue.md`, or Sean) before the row suppresses anything. A lone agent may not ledger itself out of a MANDATORY rule. Expired rows stop suppressing automatically. Prefer contributing a variant to the Forge over filing an exception; the exception ledger is the shadow catalog.
    - **Precedence:** Rule 84 outranks the ~20% catalog-tax sprint cap (plan §4) for the strangler that unblocks a rule-84 obligation; if honoring both is impossible in a sprint, the legal exit is a dated ledger row — not a local fork. "No dual existence beyond one sprint" is measured from the START of that component's strangler PR, not from the Forge shipping the class; the backlog is deeper than one sprint by design.
    - **Consumer overrides are forbidden** (drift-lint R2): never restyle `sw-*` selectors or `!important` against them; the sanctioned surface is each component's published `--sw-<cmp>-*` custom properties.
    - **Enforcement surfaces (dated, not aspirational):** `swan-design-router` Step 0.5 runs the Forge-first check for any UI task (agents); `node packages/swan-forge/scripts/drift-lint.mjs --consumer frontend/src` runs report-only NOW and **arms `--enforce` at the Phase 3 gate or when GitHub Actions are alive again, whichever comes first** (the amnesty in plan §12.5 governs the ledger's contents, never the arming date); pre-commit `frontend-guards` for hex/var discipline. Until `--enforce` arms, the ledger + second-party review is the human layer — and the arming date is the tracked item (SWA-206). A rule enforced only by memory is a rule that gets dropped.
    - **No dual existence beyond one sprint:** once a Forge class replaces a local component on a surface, the legacy delete-PR is scheduled in `packages/swan-forge/CHANGELOG.md`.

    **Why:** Sean, 2026-08-24 — one ultimate version of each component, designed once, re-skinned per site. Ox Alpha's v0.1 review: "without forced consumption the catalog becomes a museum." GLM 5.3's round-2 review added the scoping (C4) and the ledger-with-teeth (C3) so the rule cannot rot into exception spam or a disabled linter. **How to apply:** before building any button/card/field/modal (or any later Forge class) in `frontend/src`, import from `@swan/forge` via the consumer binding in `frontend/src/components/ui/forge/`; if the catalog genuinely cannot serve the need, add the ledger row first, then build.

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
   - `1440px` desktop browser width
   - `1920px` 1080p desktop
   - `2560x1440` 1440p / QHD monitor class
   - `3840x2160` 4K monitor class
   - `3440px` ultrawide
   - If a QA tool accepts only width, use `2560px` and `3840px` widths and state the tested height separately. `1440px` width is not the same as 1440p; 1440p means a `2560x1440` viewport class.
6. **Design handoff rule (amended 2026-07-25 — Gemini is context, not authority)**
   The design direction is set by **Kimi K3 or Opus 5** (the design authority). Gemini may contribute context, research, or options *into* that decision — its output is an input, never the direction itself, and it holds no veto. Whoever receives a concept must still critique implementation fidelity, hierarchy, spacing, responsiveness, and polish. No concept from any model is a substitute for production QA.
7. **Reporting style**
   Name the design weaknesses found, what was improved, and which viewport widths were actually checked.

## Key Directories
- `frontend/src/components/` — React components (styled-components, NO MUI)
- `backend/routes/` — Express API routes
- `backend/models/` — Sequelize models (PostgreSQL)
- `docs/ai-workflow/` — AI coordination docs, blueprints, handoffs, references

## Active Continuity Handoffs
- `docs/ai-workflow/AI-HANDOFF/SECURITY-REMEDIATION-2026-04-19.md` — credential leak incident closeout: `.claude/settings.local.json` tracked in public GitHub since 2025-10-29, all creds rotated (Render PG, Gemini, JWT x2, local PG), 2,179 commits rewritten via `git-filter-repo`, force-pushed to `origin/main`, `.gitignore` hardened. Post-rewrite HEAD = `302c6fa3`. Read before any future git-history or secrets work. Includes verification grep commands, Hermes Pi cleanup notes, and deferred follow-ups (repo→private, Secret Scanning, `vickievaldez` test-user delete, Hermes `request_dump` redaction).
- `docs/ai-workflow/AI-HANDOFF/OPUS-CODEX-DEBATE-3-BRAIN-PIPELINE-V3-2026-04-19.md` — Codex Round 1 review of the v3 3-Brain Pipeline plan. Status: REVISE before Week 1 permission rollout. Key blocker: credential prevention must scan Write/Edit/pre-commit outputs, not only Bash commands.
- `docs/ai-workflow/AI-HANDOFF/3-BRAIN-PIPELINE-v3-PATCH-LIST-2026-04-19.md` — ROUND 2 synthesis: 9 targeted patches addressing Codex's CRITICAL/HIGH/MEDIUM/LOW findings on v3. Patches 1–5 match Sean's explicit list (secret scanner, permission pattern syntax verify, `.ai-workflow/audit/` gitignore, enumerate safe scripts vs blanket `node scripts/*`, lint gate defer). Patches 6–9 cover remaining Codex findings. Includes ordered apply sequence + 4 open questions back to Sean. Not yet applied — specifies what to do, doesn't do it.
- `docs/ai-workflow/AI-HANDOFF/OPUS-CODEX-DEBATE-RUNTIME-DRIFT-21639730.md` — Phase 16 residual/runtime-drift debate. ROUND 3 marks consensus after `a3bd6dd3`; remaining follow-ups are socket URL unification, production `avatar_homes` inspection before repair migration, and gamification migration test polish.
- ⚠ `SWANSTUDIOS-CURRENT-COMPLETION-STATE-2026-04-19.md` **was never written** (no such blob in git history, verified 2026-08-15). For current ship state read `docs/ai-workflow/AI-HANDOFF/ACTIVE-PRIORITIES.md` and `ACTIVE-INDEX.md` instead. Original intent — compact current ship state: Phase 16/16.2 smoke, commit order, Phase 17/revenue/legal next priorities, and low-token master-plan pointers
- ⚠ `SWANSTUDIOS-MASTER-EXECUTION-PLAN-2026-04-19.md` **was never written** (verified against git history 2026-08-15). Do not go looking for it. Original intent — authoritative Village-ratified master roadmap v2; load only the relevant section after reading the compact current-state handoff
- `docs/ai-workflow/AI-HANDOFF/HERMES-REMOTE-CODING-BRIDGE-PLAN-2026-04-19.md` — Hermes Telegram ↔ VS Code (Claude Code + Codex) remote coding bridge. HIGH priority per Sean ("extremely important"). 3-5 day effort. Currently awaiting Village review + Sean approval before Phase R1 implementation.
- `docs/ai-workflow/AI-HANDOFF/SWAN-STUDIOS-VISION-CONTINUITY-HANDOFF-2026-04-11.md` — broader Swan Studios product vision, revenue priorities, premium-gating intent, and sequencing
- `docs/ai-workflow/AI-HANDOFF/SWAN-COACH-CONTINUITY-HANDOFF-2026-04-11.md` — Swan Coach phase history, verified command-lane status, blocked areas, and next-slice logic

## Co-Orchestrator Hierarchy
- **Sean (human owner)** - final authority above every model.
- **Kimi K3 (STANDARD FINAL REVIEWER)** - As amended by Sean 2026-07-26, Kimi is the routine hostile-review and commit gate for substantial work. A matching completed review is reused. Normal privacy, bounded-packet, and spend controls still apply.
- **Fable 5 (EXPLICIT OPT-IN ONLY)** - Fable is not a standing gate, fallback, or automatic expense. Invoke it only when Sean specifically requests a Fable run.
- **⚠ DESIGN AUTHORITY = Kimi K3 + Opus 5 (Sean 2026-07-25).** Design arbitration belongs to **Kimi and Opus 5**. They pick the direction and own aesthetic judgment. Either may decide alone when the other is unavailable.
- **Gemini 3.1 Pro (CTO) — CONTEXT ONLY (amended 2026-07-25).** Gemini is **NO LONGER the design authority.** It may supply context, research, and options *into* a design decision; it does **not** arbitrate, set direction, or hold veto. Sean's words: *"gemini 3 pro is no longer the authority — Kimi and Opus 5. Gemini 3.1 can only give context to the decision and that is all."*
- **Codex (Builder / Hostile Reviewer)** - performs implementation, verification, and independent hostile review; its evidence feeds the Kimi gate.
- **Sonnet 4.6 (VP Eng)** — Premium code quality. Used in AI Village debates.
- **Design execution rule (amended 2026-07-25):** the direction is set by **Kimi or Opus 5**. Gemini output is an input to that decision, never the decision. Whoever builds still runs hostile design critique, responsive QA, and production-fidelity review before ship.
- **Model-ID discipline:** Names in this section are role labels, not executable API IDs. Once `config/MODEL_VERSIONS.md` exists, scripts must use verified registry IDs only; do not assume model IDs from memory.
- Consult: `node scripts/consult-gemini.mjs --plan|--design|--review|--ask`
- Output: `AI-Village-Documentation/gemini-consults/latest.md`
- **IMPORTANT:** Do NOT use Flash 2.5 or any other model's design vision. Gemini 3.1 Pro creates from scratch.

## AI Collaboration — Fusion Tiers (DEFAULT coding mode, added 2026-06-16)
> How we work by default. The `fusion-router` skill auto-picks the tier at the start of substantial tasks (like `swan-orchestrator`); `ai-village-fusion` runs it. Tiers 0–2 are **$0** (flat-rate Claude/Codex/Gemini subscriptions); Tier 3 spends OpenRouter credits and is spend-gated (Rule 16). This mechanizes the Rule 46 3-Brain loop and makes the free triangle the everyday default — paid is the exception.
- **Tier 0 — pair-code** (Claude+Codex, Rule 67): trivial/mechanical work — just do it, no fusion.
- **Tier 1 — duo fusion** (Claude+Codex via the board): a quick 2-way second opinion.
- **Tier 2 — TRIANGLE fusion (Claude+Codex+Gemini) = DEFAULT WORKHORSE** for every substantial call (architecture, plan review, "is this right", risky refactor, hard bug). Free. Runs `scripts/fusion-triangle.mjs` (shared-folder polling board, Gemini Pro-first chain). **Proceeds with ≥2 if any agent times out — so if the Gemini API is down it degrades to Claude+Codex automatically; no separate "duo fallback" path is needed.**
- **Tier 3 — paid AI Village** (`scripts/validation-orchestrator.mjs`, ~13 brains + recursive debates + an **Opus 5** synthesis judge; Fable only on Sean's explicit per-run request): must-be-right / high-stakes ONLY (auth, billing, Stripe, multi-tenant scoping, minors' data, legal, irreversible migration, pre-launch hardening). **ALWAYS ask Sean first (Rule 16)**; spend-gated (`SWAN_VILLAGE_MAX_USD` hard cap, pre-run estimate + confirm, per-model `cost-summary.md`). Used least.
  - **Tier 3 ALWAYS chains into Tier 2 (Sean's rule, 2026-06-16):** the Village synthesis is a deep draft, NOT the final word — it is then ratified by a (free) **triangle** pass whose synthesis is the **FINAL verdict** (flow: **Village → triangle → final**, closed by the Rule 46 gate). The Village never closes a high-stakes call alone. Tiers 0–2 do not chain.
- Synthesis contract (consensus / contradictions / unique insights / blind spots / fused recommendation) is identical across all fusion tiers — only the brains + cost differ. The judge in every tier is the **Rule 46 gate**: builder builds, builder verifies and self-attacks, **Kimi K3** reviews (APPROVE/REVISE/REJECT), builder repairs. Fable is **explicit opt-in only** and is never the automatic judge. *(Corrected 2026-08-14 — the old "Fable to Opus/Claude to Codex" chain here predated the 2026-07-26 amendment and was identical in BOTH constitutions, so no mirror diff could ever surface it; only reading for contradiction caught it.)* Privacy: IDs/roles only (Rule 8); the fusion board is gitignored/local-only. Self-tuning is propose-only.
- Skills: `.claude/skills/fusion-router/SKILL.md` (tier auto-select + permission gate), `.claude/skills/ai-village-fusion/SKILL.md` (runs the four tiers). Retention: `node scripts/fusion-prune.mjs` (90-day).

## Git Workflow
- **Batch-push cadence (Rule 70):** in multi-slice sessions, commit per slice locally, push ONCE at batch end → one deploy, one verification. Never wait per push.
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
- **Fresh sessions are encouraged to save tokens** (long threads cost more per turn). With two agents (Rule 67), a fresh session re-enters CHEAPLY: read the tiny `.ai-workflow/coordination/*.lane.md` + `review-queue.md` + `rolling-last-done.md` — not the full debate/handoff history. Offer a continuity closeout (`"log this and close"`) before Sean restarts meaningful work so the new session is cheap + lossless.
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
5. For cross-AI sessions, prefer a compact bootstrap over the full onboarding prompt. ⚠ The previously cited `AI-VILLAGE-BOOTSTRAP-PROMPT.md` **was never written** (verified against git history 2026-08-15); the only onboarding doc that exists is `AI-Village-Documentation/AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V5.md`, which rule 6 below deliberately keeps cold. Writing the compact bootstrap is an unclaimed slice.
6. Heavy docs stay cold unless the task is explicitly about them: `AI-Village-Documentation/AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V5.md`, `AI-Village-Documentation/archive/retired-prompt-surface-2026-04-09/*`, `AI-Village-Documentation/validation-prompts/archive/*`, `full-report.md`.
7. Archives are reference-only, never default reading.
8. Side-project, internal-only, or experimental plans are never part of default context unless Sean explicitly requests them by name.
9. If docs conflict: `CLAUDE.md` > compact reference doc in `docs/ai-workflow/references/` > current task/debate file > latest validation outputs > heavyweight handbook/onboarding docs > archives.
10. **Continuity bridge (Phase B, added 2026-04-22 — applies to all 4 agent surfaces):**
    - At session start, after CLAUDE.md + ACTIVE-INDEX.md but before exploring the task, read:
      - `.ai-workflow/continuity/rolling-last-done.md` (rolling closeout log, ≤30 KB, auto-trimmed)
      - `docs/ai-workflow/AI-HANDOFF/CONTINUITY-GOOD-IDEAS.md` (curated promotions)
    - Then run `bash scripts/continuity-promotions.sh --count`; if output > 0, mention the backlog in your session opening (e.g. "N pending promotion markers — review via `scripts/continuity-promotions.sh`").
    - To **append a closeout** (ONLY when Sean explicitly says `"log this and close"` or `"session closeout"`):
      `node scripts/continuity-append.mjs --topic "..." --outcome "..." [--files "a,b,c"] [--notes "..."]`
      The `SWAN_AGENT_SURFACE` env var (one of `vs-claude` / `vs-codex` / `tg-claude` / `tg-codex`) must be set by the launch environment; the script reads gitignored `scripts/continuity-config.local.json` when present, otherwise the tracked template, and hard-fails if placeholders remain in the loaded config.
    - **Closeouts are explicit-trigger-only.** Do not auto-append — the discipline is that Sean decides when a session is meaningful enough to log.
    - Full spec + review chain: `docs/ai-workflow/AI-HANDOFF/CONTINUITY-BRIDGE-PHASE-B-DEBATE-2026-04-22.md`. Directory README: `.ai-workflow/continuity/README.md`.
11. **Multi-Agent Coordination Ledger (Rule 67, rewritten 2026-08-14 — PERMANENT; 4-8 live agents is normal):** at session start run **`node scripts/lane.mjs digest`** — never read `claude.lane.md`/`codex.lane.md` by name, they are stale relics and live lanes are per-session. Read `.ai-workflow/coordination/review-queue.md` for open requests. Before editing ANY file, re-run the digest (read-before-edit). **If another agent holds your file or your topic, write to `review-queue.md` and talk to them — do not relay it to Sean as a blocker.** Read their commits and any `SESSION-HANDOFF-*` doc in your area before forming your plan; their finding may override yours. Full spec: `docs/ai-workflow/references/AI-PAIR-CODING-PROTOCOL.md`; skill: `.claude/skills/agent-lane/SKILL.md`.

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
| Best-in-Class Training App Strategy | `docs/ai-workflow/references/BEST-IN-CLASS-TRAINING-APP-STRATEGY.md` | **MANDATORY** for product/UX/roadmap work. Trainer-led B2B2C wedge, next-best-action north star, first-party workout/progress record, activation loops, community/accountability strategy, privacy posture, monetization and KPI gates. |
| Swan Coach V1 Spec | `docs/ai-workflow/references/SWAN-COACH-V1-SPEC.md` | Swan Coach scope, command model, permissions, dictation-first execution |
| Swan Coach V1 Impl Roadmap | `docs/ai-workflow/references/SWAN-COACH-V1-IMPLEMENTATION-ROADMAP.md` | Swan Coach build phases, file map, acceptance criteria, rollout order |
| Swan Coach Sprint A Checklist | `docs/ai-workflow/references/SWAN-COACH-SPRINT-A-ACCEPTANCE-CHECKLIST.md` | Pass/fail review target for shell unification, command routing, inline confirmations, and execution results |
| Site Transformation Prompt | `docs/ai-workflow/references/SWANSTUDIOS-SITE-TRANSFORMATION-PROMPT.md` | Piece-by-piece premium site modernization |
| Theme Compatibility | `docs/ai-workflow/references/THEME-CHANGER-COMPAT.md` | Theme/CSS variable work |
| Build Hardening | `docs/ai-workflow/references/BUILD-HARDENING.md` | Pre-commit review |
| Seedance Workflow Rules | ⚠ **NEVER WRITTEN** — this path has no file and never has in git history (found 2026-08-15 by `scripts/hooks/constitution-references.mjs`). The live surface is the `seedance-swan-video` skill; the binding constraints are restated in this row. | **MANDATORY** for any Seedance 2.0 exercise/workout video prompt work. 2499-char hard cap (target ~2400), two-layer CLEAN/TAGGED pairing, 8s single-angle default / 15s expanded optional, five-beat Setup→Action→Signature→Proof→Reset teaching rhythm, clinical-language moderation dodge, reusable base prefix, regression-first for 40–70 clients. Triggered by PIRIFORMIS misspelling + quadruped moderation rejection incidents 2026-04-12. |
| Seedance Cinematic Video Rules | ⚠ **NEVER WRITTEN** — no file at this path, ever, in git history (found 2026-08-15). Use the `seedance-swan-video` skill's cinematic mode; the constraints in this row still bind. | **MANDATORY** for Seedance 2.0 hero loops, store/card loops, icon micro-loops, ambient b-roll, and non-exercise brand films. Separates cinematic multi-shot work from workout rules with loop integrity, surface-specific duration modes, signature visual beats, and Swan brand-motion discipline. |
| Anti-AI-Tells | `docs/ai-workflow/references/ANTI-AI-TELLS.md` | UI component design |
| Visual Diff Loop | `docs/ai-workflow/references/VISUAL-DIFF-LOOP.md` | UI QA screenshots |
| File Cleanup | `docs/ai-workflow/references/FILE-CLEANUP-PROTOCOL.md` | Cleanup tasks |
| Repo Hygiene Protocol | `docs/ai-workflow/references/REPO-HYGIENE-PROTOCOL.md` | **MANDATORY** — before refactors, audits, route-tracing with competing surfaces, or fresh sessions where the repo feels cluttered. Drives rules 32-39. |
| Swan Cinematic Design System | `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` | **MANDATORY** — source of truth for every Swan visual task. Stack truth, page-level narrative arc (B2), C1-C12 pattern library, generic-pattern bans. Loaded by `swan-design-router`. Supersedes legacy `AI-Village-Documentation/CINEMATIC-WEB-DESIGN-SYSTEM.md`. |
| Swan Asset Storyboarding | `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md` | **MANDATORY** for any task that needs generated media. Asset archetypes, emotional jobs, per-section rules, Seedance 2.0 prompt templates. Loaded by `swan-design-router`. |
| Auto Research | `docs/ai-workflow/references/AUTO-RESEARCH.md` | Running skill optimization |
| App AI Hive Mind | `docs/ai-workflow/references/APP-AI-HIVE-MIND.md` | AI chat features |
| Hermes + Wiki + Mythos | `docs/ai-workflow/references/HERMES-WIKI-MYTHOS-MASTER-PLAN.md` | AI command center, Hermes Agent, Karpathy Wiki, Mythos planning |
| Hermes ↔ SwanStudios Operator Bridge | `docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` | **Boundary clarifier.** Distinguishes public Swan Coach (in-app product feature) from Sean-only Hermes Operator Mode (Pi+Telegram). Read when scoping any task that crosses Hermes/SwanStudios. Reaffirms: SwanStudios production stability outranks Hermes polish unless Sean names Hermes the active task; Hermes assists the rule-46 review loop but never bypasses the **Kimi K3** gate *(corrected 2026-08-14 — this said "Codex final gate", superseded 2026-07-26)*. |
| Plaud Audio Intelligence | `docs/ai-workflow/references/PLAUD-AUDIO-INTELLIGENCE.md` | Voice logging, Plaud NotePin, audio import, transcript parsing, session recap |
| PLAUD Applaud Runbook | `docs/ai-workflow/references/PLAUD-APPLAUD-RUNBOOK.md` | Phase 5 Slice 5.8 — operational setup for PLAUD Auto-Ingestion: Applaud install, Cloudflare Tunnel, Render env vars, troubleshooting, day-2 ops, rotation procedures. Read before first staging activation (Slice 5.9) or when a webhook ingest fails in production. |
| OpenClaw (SUPERSEDED) | `docs/ai-workflow/references/OPENCLAW-PLAN.md` | SUPERSEDED by Hermes plan — kept for reference only |
| Skills Reference | `docs/ai-workflow/references/SKILLS-REFERENCE.md` | Skill management |
| QA Pipeline | `docs/ai-workflow/references/QA-PIPELINE.md` | **MANDATORY** — defines the three-layer review/verification pipeline (Tier-A deterministic tooling, Tier-B AI cross-review, Tier-C AI Village). Read before invoking Tier-C, before designing a Tier-B review checklist, or when uncertain which tier a change requires. Encodes rules 50–52. |
| Reviewer Discipline | `docs/ai-workflow/references/REVIEWER-DISCIPLINE.md` | **MANDATORY** when writing a review (Tier-B), responding to a user-relayed claim ("the other AI said X is broken"), or before any non-trivial factual/causal claim leaves your output. Six anti-sycophancy doctrines. Encodes rules 50–52. |
| Workflow Paths | `docs/ai-workflow/references/WORKFLOW-PATHS.md` | Choosing how to run a change end-to-end (Fast / Standard / Deploy execution shape). **Orthogonal** to QA tier — see QA-PIPELINE.md for the review/verification layers. |
| AI Pair-Coding Protocol | `docs/ai-workflow/references/AI-PAIR-CODING-PROTOCOL.md` | **MANDATORY (Rule 67)** while Claude + Codex run in parallel. Live Coordination Ledger (`.ai-workflow/coordination/`): read-before-edit, lane claims, commit safety, mutual hostile review. Read at session start with the continuity bridge. |
| ESLint Setup | `docs/ai-workflow/references/ESLINT-SETUP.md` | Tier-A linter install/config (deferred install slice). |
| Claude Permission Syntax | `docs/ai-workflow/references/CLAUDE-PERMISSION-SYNTAX.md` | `.claude/settings.json` permission patterns — read when editing allow/deny rules. |
| Karpathy Wiki Operations | `docs/ai-workflow/references/KARPATHY-WIKI-OPERATIONS.md` | Hermes Wiki Bridge runtime ops, ingest, redaction posture. |
| SwanStudios Full Vision | `docs/ai-workflow/references/SWANSTUDIOS-FULL-VISION.md` | Long-form product/business vision. Read for "where is this going" framing; for sequencing, defer to `SWANSTUDIOS-EXECUTION-ROADMAP.md`. |
| SwanStudios Master Prompt | `docs/ai-workflow/references/SWANSTUDIOS-MASTER-PROMPT.md` | **Canonical compact vision loader** (2026-06-10) — ready-to-paste prompt giving any AI the complete vision in one shot. Supersedes all archived "MASTER PROMPT" docs. Use when briefing a fresh AI/session; FULL-VISION.md stays the deep reference. |
| R2 Video Migration | `docs/ai-workflow/references/R2-VIDEO-MIGRATION.md` | Adding/troubleshooting videos, R2 setup |
| Recursive Planning | `docs/ai-workflow/references/RECURSIVE-PLANNING-PROTOCOL.md` | **MANDATORY** — read before ANY implementation task |
| Four-C Connections/Cadence Roadmap | `docs/ai-workflow/references/FOUR-C-CONNECTIONS-CADENCE-ROADMAP.md` | Planned C2 (live-data connections) + C4 (scheduled/triggered automations) build-out. Pointed to by the Four-C Router. Read when scoping a connection or automation; loaded on demand to keep the operating files lean. |
| Fable Workflow Integration | `docs/ai-workflow/references/FABLE-WORKFLOW-INTEGRATION-SPEC.md` | Deciding whether/how to use Fable; writing Fable handoffs |
| AI Skill & Operator Registry | `docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md` | **MANDATORY** before granting any agent/automation a new capability; unregistered = BLOCKED |
| Hermes Agentic OS | `docs/ai-workflow/hermes-agentic-os/index.md` | Any Hermes/operator/automation work - approval gates, receipts, kill switches, T0-T4 |
| Design Brain | `docs/ai-workflow/design-brain/index.md` | Any UI/visual work, alongside SWAN-CINEMATIC-DESIGN-SYSTEM.md (which remains source of truth) |

## Swan Visual Operating System and Workflow Skills

The strict-model design architecture is fully enforced. `swan-design-router` is the only default-exposed design brain. All UI/visual work auto-routes through it (rule 40). Closeout auto-routes through `closeout-evidence-lock` (rule 41). Rule 78 classifies the mode first. Clear net-new work routes to `grill-me`; only multi-session work with material fog routes to `wayfinder`, which invokes `grill-me` through a blocking `GRILL-HITL` ticket when intent must be extracted. `chromie` follows for unproven bets.

### Default-exposed `.claude/skills/`

> Inventory is discovered at runtime with `node scripts/ai-workflow/validate-skill-registry.mjs`; do not hand-maintain a total here.

**Strategy / adversarial / conversion / self-improvement / prompt-amplify (5) — rules 65-66:**
| Skill | Role |
|---|---|
| `chromie` | Top-product-CEO strategy pressure-test. Founder-panel interrogation (Zuck/Gates/Altman default), hostile pushback, spec + 3 ways it fails + absence-first gap ranking. Runs after `grill-me` for unproven bets. |
| `attack-the-site` | Adversarial competitor/attacker red-team. Rival-founder + malicious-user hats; ranks threats by self-executability with defend + out-build moves. Distinct from `security-review` (code CVEs). |
| `copy-tournament` | N copy variants → 5-judge panel → kill/merge/scoreboard for conversion surfaces. Visual side via `swan-design-router`. |
| `skill-harvest` | Self-improvement loop: finds repeated requests, proposes new skills/ref-docs/rules (gap-filtered), names manual work to delegate. Proposes only. Complements `auto-research` (tuning). |
| `prompt-watcher` | Per-prompt intent amplifier (rule 66). UserPromptSubmit hook classifies SIMPLE vs VISION; VISION prompts get silently gap-checked + enhanced, then acted on automatically (no confirm; reveal only if asked). Token-light: simple prompts cost nothing extra. |

**Swan orchestration and workflow modes:**
| Skill | Role |
|---|---|
| `create-with-context` | The Swan creation workflow (rule 76). For any substantial creation: GROUND in a real audit (never from memory) → ENHANCE the prompt → pull an EXPERT brain (Kimi K3 for design; triangle/oracle otherwise) as a CREATIVE PEER + generate your OWN ideas → CLAUDE AUTHORS the FUSION of both idea sets (creativity ~50/50, authorship 100% Claude) → present blueprint + build with proof. Auto-fires every chat via rule 76 + prompt-watcher VISION path. |
| `grill-me` | Intent-extraction gate (rule 64). Relentlessly interviews Sean one question at a time, checkpointing every answer to `docs/ai-workflow/brainstorms/`. Runs directly for clear net-new intent; foggy multi-session work reaches it through the current Wayfinder `GRILL-HITL` ticket. |
| `fable-mode` | Portable Fable working discipline (rule 71). Five gates (scope adversarially / evidence first / attack own reasoning / verify before declaring / report calibrated) + the model/effort routing table (orchestrator-smart, executor-cheap). MANDATORY load for any fallback Final Decider acting in Fable's absence; on-demand for hard problems ("fable mode"). Does NOT elevate rule-68 provenance. |
| `swan-orchestrator` | Pre-task gate. Enforces rules 15/17/26/32 with a structured checklist before any implementation. Dispatches to the right Swan skill for the task type. |
| `wayfinder` | Situational map and decision-ticket system for multi-session work with material fog; exits early for clear work. |
| `goal-contract` | Measurable objective, validation, checkpoint, uncertainty, and stop-condition contract; never creates a persistent goal implicitly. |
| `worktree-isolation` | Verifies baseline, branch, environment, dependencies, ports, services, coordination, and cleanup authority for isolated execution. |
| `guided-setup` | Installation/auth/deployment/environment walkthrough with one verified current step and a stable remaining ledger. |
| `canonical-surface-audit` | Standardized execution surface for rules 26-31. Produces Canonical Surface Receipt, Surface Classification Table, Schema Cross-Check Artifact, Backend Route Ownership walk. |
| `repo-hygiene-scan` | Standardized execution surface for rules 32-39. Produces the Phase 1 non-destructive inventory doc. Never moves, renames, or deletes files. |
| `dead-file-sweep` | Rule 77 execution surface. Finds unrouted/unimported files that trap the next agent into editing a dead twin. Two tiers: agent scratch artifacts are auto-removed at closeout; pre-existing suspects are evidenced (imports + route mounts + JSX usage + dynamic refs) and PROPOSED for `archive/pending-deletion/`, never moved silently. Honors the dormant-on-purpose exception. |
| `cost-guard` | Cost-discipline gate. Fires BEFORE any paid-AI spend (consult-fable/sol/kimi, validation-orchestrator) or expensive multi-file operation. |
| `linear-todo` | Linear-backed to-do workflow: capture conversation summaries as SWA issues, verify captured work against current commits, run the read-only tree sentinel so parallel agents do not collide. |
| `agent-lane` | Rule 67 execution surface. Publishes what this session is editing so parallel agents (Claude sessions, Codex, cloud agents) do not sweep each other's files into a commit or push a dirty batch. Carries the delivery-state vocabulary (committed is not delivered) and the push blast-radius checklist. Fires at session start via the lane hook. |
| `lesson-recall` | Surfaces the prior lesson BEFORE the same mistake is repeated, rather than after. Complements `stale-check` (which re-verifies carried-forward blockers) and the Hermes corpus (which stores them). |
| `swan-debate` | Bounded N-round adversarial debate between two agents for genuinely contested decisions. Escalation target when a Tier-2 triangle returns CONTRADICTIONS. |
| `swan-world-factory` | Manual-only batch orchestrator for generating and hostile-reviewing licensed M4 Swan World Engine experiments. Writes ignored artifacts, never auto-promotes. |
| `swan-atelier-studio` | The N-up parallel design engine (module B11 on the Atelier spine). Sean talks; the Studio diverges into 4-5 structurally distinct rendered directions on ONE canvas (shared plate pack, skeleton contracts, fingerprint hard gate), he judges side-by-side with style-only tweak levers, grafts (never "merges"), and every pick is logged into `rejection-log.jsonl` as the taste instrument. Runs downstream of `design-dialogue`/`grill-me` and `swan-design-router`. Rulings: `SWAN-ATELIER-STUDIO-R2-RULINGS-2026-08-18.md`. |
| `design-dialogue` | Design brainstorming PARTNER, not an interviewer. Where `grill-me` extracts what is already in Sean's head, this puts new things into it — proposing concrete alternatives he did not ask for, arguing both sides, and recording which he rejects and why. Runs before `swan-design-router` and before any Mobbin pull. |
| `swan-design-router` | Only default-exposed design brain. Loads SWAN-CINEMATIC-DESIGN-SYSTEM.md + SWAN-ASSET-STORYBOARDING.md. Enforces Dual-Button Glow, styled-components-first, anti-template discipline, 2-3 concept-direction ideation gate. |
| `closeout-evidence-lock` | End-of-task closeout gate. Enforces Claim-to-Evidence Lock + dual-pass hostile review + post-task hygiene check + forbidden-language filter. Preserves the full substantive code-review checklist (security, performance, test coverage, breaking changes, conventions) inherited from retired `requesting-code-review`. |
| `hermes-learning-packet` | Fable→Hermes learning loop (rule 68). At close of substantial/Fable-tier work, emits a privacy-safe, durable, compounding learning packet Hermes ingests so it self-upgrades without Sean re-typing. Source gate is fail-closed to Fable-tier only (sub-Fable → quarantine). Delivers over the proven Pi SSH/cat transport. |
| `spend-guard` | Cumulative paid-AI budget gate (Sean 2026-08-22, after one workstream cost ~$4.87). Fires AUTOMATICALLY as a PreToolUse(Bash) hook on every `consult-fable|sol|kimi|grok|panel` invocation — no invocation needed. Caps $1.00/call, $3.00/topic, $5.00/day against an append-only ledger; a breach is REFUSED on the first ask and mints a single-use token, so a second explicit yes is required. Exists because the two prior gates (`--confirm-spend`, `premium:true`) were both per-call and passed every one of the four Fable calls that blew the budget — the failure mode is a sequence of defensible calls, not one extravagant one. Load it when a call is blocked or when Sean asks about spend. |
| `hermes-inbox` | Any-agent → Hermes working channel (rule 69). Work done OUTSIDE Hermes (terminal Claude/Codex, local Qwen, scripts) drops a short IDs-only memo in `.ai-workflow/hermes-inbox/pending/`; Hermes reads at session start, absorbs, then memos archive to `consumed/` (Rule 34). Ephemeral + any-agent — distinct from the Fable-tier-only durable learning-packet and the Sean-triggered continuity bridge. Fires via rule 69 + closeout-evidence-lock fold + a SessionStart hook. |
| `handoff` | **Session-transfer gate (rule 83).** Fires on ANY handoff phrasing — "hand this off", "this chat is getting long", "pass it to the next agent" — and asks in one line when unsure. Harvests the WHOLE conversation (not the tail), re-derives every number, gap-analyses against Sean's vision, grills him on the gaps and records his verdicts, then writes the cold-start doc + a paste-ready agent prompt to `docs/ai-workflow/AI-HANDOFF/`. Paired with `scripts/hooks/context-watch-gate.mjs`, which watches real token usage and forces the handoff at ~70% context so a session never drifts into a lossy compaction. |

**Evidence gates (4) — rules 52 / 80-81:**
| Skill | Role |
|---|---|
| `cross-env-verify` | Fires before any "X is broken / missing / corrupt" claim, and **hard-gates every destructive remedy** (delete, re-clone, re-init, reset, wipe, reinstall). One tool's failure is not a fact about the world — re-check from a second vantage first. Born 2026-08-05 from a near-miss that would have destroyed a branch and its history. |
| `test-delta-disclosure` | Fires when a turn edits an existing test, fixture, or snapshot. Requires a test-delta table (`RE-ANCHOR` vs `SILENCE`) reported before and separately from the pass count. The disclosure half of rule 79 — without it, "tests can encode the bug" becomes a license to edit any inconvenient assertion. |
| `stale-check` | Fires before repeating ANY carried-forward blocker, memory, or handoff claim (rule 52). Another agent may have already fixed it. Every carried-forward claim ships with a one-command re-verification attached, and that command MUST be re-run — and its output shown — before the claim is repeated. |
| `drift-check` | Fires at SessionStart, and before trusting any governance file. Detects the ways a repo silently lies to an agent — mirror divergence, stale branch, stale registry/index, missing tooling a doc promises, guard coverage gaps, a registered hook whose FILE is absent, a LIVE hook that exists in no commit, and a rulebook that cannot state its own size. Born 2026-08-23: three safety gates — including the zero-PII egress gate — were live in one working tree and committed nowhere, which is byte-identical to healthy from inside the session. |

**KEEP core:**
`systematic-debugging`, `test-driven-development`, `verification-before-completion`, `webapp-testing`, `agent-browser`, `audit-website`, `full-output-enforcement`, `seedance-swan-video`

### Reference libraries loaded by `swan-design-router`, NOT default-exposed
`frontend-design` and `ui-ux-pro-max` live at `.agents/skills/frontend-design/SKILL.md` and `.agents/skills/ui-ux-pro-max/SKILL.md` respectively. They are **not** in `.claude/skills/`. They are loaded on-demand by the router from their `.agents/skills/` paths. They are not archived and not treated as quarantined.

`seedance-loop-prompt` lives at `.agents/skills/seedance-loop-prompt/SKILL.md` as the general-purpose shot-by-shot reference. The active Swan adapter is the unified `seedance-swan-video` entrypoint on both skill surfaces; use its workout or cinematic mode as appropriate.

### Quarantined skills — explicit-invocation-only (8, relocated to `archive/quarantined-skills/2026-04-12/`)
These skills have been moved off the default-exposed surface. Their sources now live at `archive/quarantined-skills/2026-04-12/<name>/`. Do NOT auto-load them. Invoke only when Sean explicitly requests the specific aesthetic or review behavior by slash-command. The move is reversible via `git mv` back.

| Skill | Why quarantined |
|---|---|
| `minimalist-ui` | Narrow aesthetic — warm monochrome + flat bento + no gradients. Conflicts with Swan's dark-luxury direction. |
| `industrial-brutalist-ui` | Narrow aesthetic — Swiss typographic + military terminal. Conflicts with Swan's cinematic direction. |
| `high-end-visual-design` | Rigid "Absolute Zero" bans + opinionated "Awwwards-tier" persona. Useful occasionally, not as default. |
| `design-taste-frontend` | Contains "THE LILA BAN" that **directly contradicts** the Dual-Button Glow rule (bans purple button glows and neon gradients). Hard doctrinal conflict with Swan brand. |
| `stitch-design-taste` | Niche to Google Stitch DESIGN.md output. |
| `redesign-existing-projects` | Audit-focused, niche — useful when explicitly asked for a redesign audit, noisy otherwise. |
| `web-design-guidelines` | Review-only, overlaps with `verification-before-completion` + rules 22-23 design dual-pass. |
| `requesting-code-review` | **Broken** — depends on a missing `superpowers:code-reviewer` subagent. Substantive checklist preserved in `closeout-evidence-lock`. Do NOT dispatch to this skill from any new code path. |

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
> Current production/stability priorities: `docs/ai-workflow/AI-HANDOFF/ACTIVE-PRIORITIES.md`

### Swan Coach Command Lane (ACTIVE TRACK)
- **v1–v14 CONFIRMED LIVE** (repo-verified 2026-04-11): 20 commands live, commandDispatcher.mjs 214 lines
- **v15 NEXT** → `view_available_slots` — clean read, no destructive risk, builds on v14 availability work
- **Blocked/deferred:** `set_availability` (full-week destructive replace), `reschedule_session` (409 conflict path), `schedule_session` (wrong semantics in live code), `FRONTEND_DISPATCH` (browser-local state)
- **After v15:** trainer workout logging → client dashboard visibility audit (revenue-critical proof-of-value chain)
- **After trainer workflow:** PLAUD transcript ingestion → Swan Coach logging, then premium gating/tier alignment
  - **Reality check (2026-04-14):** Plaud now has an official Developer Platform, but it is still private beta and official OAuth pull from existing Plaud user accounts is still in progress / waitlist-only. Swan already has a live upload+parse path (`/api/workout-logs/upload` + `workoutLogParserService.mjs`), so near-term planning should assume manual export/direct upload first, unofficial Plaud web API only as an internal bridge, and official Plaud OAuth/webhooks later.

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
- **⛔ DO NOT RESEED (retracted 2026-08-04, Lane 4 audit).** The old instruction here told a
  future session to run `FORCE_RESEED=true` on the storefront seeder "to wipe bad data". That
  was written when the catalog was disposable and has since become **destructive**: the seeder
  clears with `TRUNCATE storefront_items RESTART IDENTITY CASCADE`, and `TRUNCATE … CASCADE`
  truncates dependent tables outright — it does **not** honour the `ON DELETE SET NULL`
  tombstone relax — so it would erase the line items of **already-paid orders**. Live prod also
  carries 2 packages the seeder does not define (10-Session, 24-Session) plus a renamed 30-min
  pack, so a reseed would delete live catalog rows too. The seeder now refuses when any
  `order_items` row exists. **Correct the catalog from the admin storefront UI instead.**
- **✅ RESOLVED (2026-08-04):** `/api/cart/add` is mounted exactly once (`cartRoutes.mjs`) and
  returns **401** unauthenticated in production, not 404 — verified by live probe. The modern
  rejection to expect on that path is **403 `PRICE_ACCESS_REQUIRED`** from the invitation gate,
  which is correct behaviour, not a bug.
- **Packages:** Single ($175) · 3-Month ($8,400) · 6-Month ($16,800) · 12-Month ($33,600) · 30-min pack ($1,100)

### Deferred UI / Code Quality
- `MeasurementEntry.tsx` — 300-line refactor into sub-hooks (not a bug, safe to defer)
- `ActivitySection.tsx` — all violations fixed and committed 2026-04-11 ✓
- `StorefrontItem.mjs` Sequelize validator bug — fixed and deployed 2026-04-10 ✓

### Content Studio — Seedance 2.0 + Exercise Videos (ACTIVE GOAL)
- **Goal:** Create exercise demo videos with anatomy overlays — muscle activation highlighted as Sean performs perfect-form reps
- **Seedance skill:** `.agents/skills/seedance-swan-video/SKILL.md` is the unified entrypoint for workout demos and cinematic/brand modes.
- **AI Village refinement PENDING** — skill was written from first principles; schedule a planning/research Village run next session to research Seedance 2.0 prompt engineering best practices and refine
- **Workflow:** NanoBanana/key.ai for reference image → Seedance 2.0 (via key.ai API or interface) → Claude Code for website integration → anatomy overlay in post (Capcut Pro / DaVinci)
- **Scroll-activated video technique** (from YouTube research 2026-04-11): Extract frames from video → map to scroll position → `<canvas>` + `requestAnimationFrame`. Claude Code can do this end-to-end from a video file. Very high priority for homepage hero.
- **Full plan:** `docs/ai-workflow/references/PLAUD-AUDIO-INTELLIGENCE.md` (content side) + new Seedance skill

### Claude Code Skills — Status
- **Inventory truth:** run `node scripts/ai-workflow/validate-skill-registry.mjs`; the two roots intentionally contain overlapping adapters and runtime-specific skills.
- **Official Claude Code plugin (`/frontend-design`)** — `installed_plugins.json` is EMPTY. NOT installed yet.
  - The `frontend-design` you see is the skills.sh community version — good but different
  - **ACTION NEEDED:** Open Claude Code terminal → type `/plugins` → search `frontend-design` → install globally. This gives plan-mode-specific first-party design intelligence on top of the skills.sh version
  - Also check `/plugins` for any other first-party plugins you may be missing (look for `ui`, `react`, `accessibility`)
- **Seedance:** unified `seedance-swan-video` is the active adapter; stale split-skill references are retired.

### Business Priority Order (do not scatter)
Current production/stability priority stack lives in `docs/ai-workflow/AI-HANDOFF/ACTIVE-PRIORITIES.md`.

1. **Now:** v15 `view_available_slots` Swan Coach slice → verify end-to-end
2. **Then:** trainer workout logging → client dashboard visibility (retention/upsell proof)
3. **Then:** chart/KPI truthfulness audit (workout, weight, measurements, schedule)
4. **Then:** PLAUD voice transcript ingestion → Swan Coach log_workout
   - Use the existing Swan upload/parse pipeline as the default starting point; do not assume official Plaud account sync is ready yet.
5. **Then:** Swan Coach premium gating aligned to package tiers
6. **Then:** client dashboard audit → user/social dashboard audit → broader site polish

### Rules 68-69 automatic closeout override (Sean opted in 2026-07-11)

The earlier manual-default wording is superseded. A deterministic project `Stop` command hook (`scripts/hooks/hermes-closeout-gate.mjs` — heuristic, fail-open, zero model calls; replaced the original prompt-type hook 2026-07-11 after live-fire smoke showed the classifier blocked 100% of trivial turns) evaluates every completed turn. Substantial terminal work must emit a privacy-safe Hermes Inbox memo before the agent stops. A substantial permanent lesson with verified Fable-tier provenance must also emit a durable Hermes Learning Packet. Trivial work, incomplete work, already-emitted closeouts, and `stop_hook_active` continuations pass without emission. The durable Fable-tier gate remains fail-closed.
