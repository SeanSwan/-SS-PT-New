# HANDOFF REPORT — SwanStudios full design overhaul program
**For another AI/agent picking up (or coordinating with) this work. Self-contained. Written 2026-07-17. All artifacts are committed on `origin/main` (tip `c820dec42`).**

---

## 0. TL;DR (read this, then §1 + §7)
In one session we produced a **complete, reviewed, build-ready design overhaul plan for the ENTIRE SwanStudios app** — every public + in-app surface — authored by Kimi K3 (design architect), consolidated, then pressure-tested by a 3-brain panel (Fable 5 + GPT-5.6 Sol + Kimi). Nothing is built yet. What exists is a **stack of build-exact blueprints + a panel-hardened corrected build plan**, all on `main`. The next step is a "Slice 0" of foundation work, then per-surface building. Total spend: ~$5.5 of Kimi + $0.31 of panel = **~$5.8**, all on OpenRouter, all design-scoped.

## 1. What this program is (the goal)
Redesign every SwanStudios surface to the **"Enchanted Apex: Crystalline Swan"** brand — dark-first, frozen-forest × deep-ocean-luxury-vault; midnight-sapphire/obsidian surfaces, ice-cyan + wing-purple glow, gold as a rare accent. The retired **Galaxy-Swan** palette (`#0a0a1a`/`#00FFFF`/`#7851A9`) is banned everywhere. Every surface must be **alive/premium on marketing, calm in-app** (the two-speed law), tie into one theme/world system, and be **fully wired (no mocks) and reversible.**

## 2. What we did (the arc)
1. **Authored 15 build-exact blueprints** via Kimi K3 (`scripts/consult-kimi.mjs`, OpenRouter) — one per surface, each: hostile review + exact refactor (files, tokens, px, ms, copy, acceptance tests, 3-slice order, do-NOT list, backend binding, reversibility plan).
2. **Consolidated** all 15 into ONE Master Review Report (so an expensive final panel reads 1 doc, not 15 — cost discipline).
3. **Ran the cheap final panel** — Fable + Sol-high + Kimi-design, each on the ONE report (~$0.31 total vs ~$20-40 for a full 19-brain run).
4. **Synthesized** the panel into a **corrected build plan** that supersedes the earlier order.

## 3. The artifacts (all on `origin/main`, under `docs/ai-workflow/AI-HANDOFF/`)
**START HERE:**
- `KIMI-BLUEPRINT-SET-INDEX-2026-07-17.md` — map of all 15 with verdicts.
- `PANEL-SYNTHESIS-CORRECTED-BUILD-PLAN-2026-07-17.md` — **the authoritative go-forward** (supersedes everything else's build order).
- `NEXT-CHAT-PROMPT-build-from-kimi-blueprints-2026-07-17.md` — the paste-to-a-fresh-builder prompt.

**The 15 blueprints:** `KIMI-SWAN-LENS-BLUEPRINT` (foundation) · `KIMI-DASHBOARDS-BLUEPRINT` (admin/trainer/client/user, 4 role densities) · `KIMI-STORE-BLUEPRINT` (design-only, payment path untouched) · `KIMI-COVER-GALLERY-REFACTOR` · `KIMI-VIDEO-BLUEPRINT` · `KIMI-PHOTOGRAPHY-BLUEPRINT` · `KIMI-HOME-BLUEPRINT` · `KIMI-ABOUT-BLUEPRINT` · `KIMI-CONTACT-BLUEPRINT` · `KIMI-DESIGN-SKILL-REDO` (candidate) · `KIMI-DESIGN-BRAIN-ENHANCED` (candidate) · `KIMI-ORIG-SITE-PROMPT-REVIEW` · `KIMI-WORLD-ATMOSPHERE-ENHANCED` · `SWAN-LIVING-WORLD-GENERATOR-MASTER-PROMPT`.
**Review trail:** `KIMI-BLUEPRINT-SET-MASTER-REVIEW-REPORT` + `PANEL-FABLE-VERDICT` + `PANEL-SOL-VERDICT` + `PANEL-KIMI-VERDICT`.
**New skill:** `.claude/skills/cost-guard/SKILL.md` — API cost discipline (map-reduce before expensive brains, right-size effort/tokens, free-before-paid, estimate+confirm).

## 4. Governing doctrine (do not violate)
- **Kimi = ARCHITECT; the builder builds Kimi's design VERBATIM; Opus/orchestrator injects ZERO design decisions.** If a blueprint is ambiguous, re-consult Kimi — don't decide yourself.
- **FULL-STACK REAL — NO MOCKS.** Wire frontend AND backend to real endpoints/models; each blueprint names its API/model or flags a NEW backend surface; build the real thing.
- **REVERSIBLE.** New design = NEXT-VERSION component (e.g. `HomePage.V5`) side-by-side; current stays intact; a feature flag selects which mounts; backend ADDITIVE-ONLY. TWO revert modes (panel ruling): build-time flag = redeploy rollback; runtime remote-config = instant rollback (both chunks deployed, lazy-loaded). **Money/PII surfaces (Store, Contact) require runtime mode.** ErrorBoundary alone is NOT fail-closed.

## 5. Sean's brand + product rulings (encoded; enforce)
- **Optics-not-creatures:** render nature as light/refraction/caustics, NEVER literal creature silhouettes (the renderer must have no arbitrary-geometry primitive → a creature is unauthorable). Whale = sonar light-rings; the swan = the Crystallize moment.
- **Rainbows = real dispersion physics** (red-out/violet-in ~40-42°), never striped conic arcs.
- **The Crystallize** = executed action → faceted crystalline record artifact; the ONE signature moment, built once (in the lens/motion layer, published as a versioned contract), consumed everywhere — never reinvented per surface. Reduced-motion = designed static end-frame.
- **Everything ties to the Swan lens** via `--world-*`/`--lens-*` tokens so it re-skins when the header Appearance Studio switches world/theme. Production worlds = `chrome-sovereign`, `logo-faceted-sigil`, `swan-deep-field`. `worldId` goes in the fused `AppearanceProfile` + a "World" tab in the existing Appearance Studio (NOT a new header button).
- styled-components only (no MUI/Tailwind), tokens-with-fallback (no raw hex), 44px, WCAG AA, Victory-only charts, zero PII. "stretching/flexibility" never yoga/meditation; "26+ years/NASM-protocol" never "NASM-certified". 300-line/file cap.

## 6. The corrected build plan (authoritative — from PANEL-SYNTHESIS)
**Slice 0 (foundations + plan-fix) FIRST:**
1. Fix the readiness taxonomy: SEND-BACK = **Home, About, Video** only; Contact = ship-with-changes; Cover/Gallery = SEND-BACK/re-pass-class; Dashboards+Store = "decision-complete, gated on lens tokens."
2. Author the **token schema + Crystallize contract as standalone versioned artifacts, DURING the lens build** (validated by the lens as first consumer, but published as their own package so surfaces import tokens, not the lens). Generate `--world-*` aliases from the typed schema; test equality.
3. Real **de-Galaxy enforcement = token/AST lint, NOT grep** (grep misses named colors `aqua`/`cyan` = #00FFFF, 8-digit/space-`rgb()`/`hsla`, SVG `fill=`/canvas `addColorStop`/`.theme.ts`, and binary assets like a starfield PNG). Hue-window + saturation floor; gate-zero self-application to the lens's own tokens; explicitly rule the pale focus-ring `#8FE8FF` is NOT banned neon-cyan; perceptual asset review.
4. **Text-legal vs decorative-only = enforced lint** (text may only use text-legal token slots; `#7851A9` on `#060B16` = 3.33:1, fails 4.5:1).
5. Ratify the **two reversibility modes** (above).
6. **Skill/Brain authority:** approve the redone Skill + enhanced Brain FIRST (they encode the rules) or mark them non-authoritative; Sean = human owner ratifies.
7. **Backend/API contracts precede UI slices;** name the upload protocol (tus vs S3 multipart), Contact's anti-spam+429 contract, Video's watch-progress, Photography's server-side watermark.

**Build order:** Slice 0 → **Swan Lens** (+ de-Galaxy lint in CI day-zero) → **Dashboards** → **Store**, with **Home/About/Video re-passes IN PARALLEL** once the token schema freezes (each needs FULL design deliverables — signature moment + CTA hierarchy + layouts + state matrices — tokens alone do NOT unblock them), then **Contact** → **Cover/Gallery**. Photography whenever its decomposition + backend land.

## 7. Coordination (Rule 67 — do NOT collide)
- A separate **World-Engine build lane** is working the runtime `--world-*` / `<WorldAtmosphere>` primitive (TOKEN mode) + the `worldId`/World-tab wiring. This design program is the CODE/content side. **Shared seam = the `--world-*` token contract.** Read `.ai-workflow/coordination/*.lane.md` + `review-queue.md` at session start; claim files; don't `git add -A` while another lane holds files.
- If you (the other AI) are on the SAME repo: everything above is already on `main` — pull it. If a DIFFERENT repo/project: port the doctrine (§4-§6) + the blueprints you need.

## 8. Gotchas that cost real time (inherit these)
- **Verify branch freshness FIRST:** `git rev-list --left-right --count origin/main...HEAD`. The physical checkout was on a stale wip branch ~700 behind main all session; cut build branches from `origin/main`.
- **Lying gates:** full `tsc --noEmit` OOMs (exit 134) and `grep -c "error TS"` reads it as 0 → run with `NODE_OPTIONS=--max-old-space-size=8192` and CHECK the exit code. Vitest from a worktree root loads the wrong config → `cd frontend/` first. Wrappers/pipes mask exit codes → echo the real one.
- **grep is NOT an enforcement boundary** for a banned palette/pattern (the panel's biggest catch) — use AST/token lint + perceptual asset review.
- **consult-kimi/sol/fable tips:** they're REVIEW tools (override `--remit` to author). Empty response = drop `--effort` to `medium` (high can burn the whole budget on reasoning). Big outputs need `--max-tokens 100000` + `SWAN_KIMI_TIMEOUT_MS=1200000` (env-configurable now). Bash `A && node ... &` puts A's vars in the background subshell — inline paths, don't rely on a var across `&` jobs. When running a review panel, ATTACH the source (`--seed`), not just your synthesis (else strategy is validated but source-fidelity isn't).

## 9. Status: DECIDED vs PENDING
**Decided/done:** the 15 blueprints, the consolidation, the panel, the corrected plan, the cost-guard skill — all on `main`. Optics-not-creatures + rainbows-as-light + the 3 worlds + worldId/World-tab + Kimi-design-slot-in-village = ruled.
**Pending Sean (blocks Slice 0 start):** (1) ratify the Skill + Brain candidates (approve-first); (2) green-light the corrected plan. Then a fresh agent builds per the corrected plan + the NEXT-CHAT build prompt.
**Also open (older, unrelated to this program):** home Swan-CTA video is NOT royalty-free (backup hero required); swan-mark-into-default-world deferred; Coach B3/B5 voice-paywall product calls.

## 10. Cost posture
This program cost ~$5.8 total (Kimi blueprints ~$5.5 + panel ~$0.31), all OpenRouter, all design-scoped, PII-free. The `cost-guard` skill now enforces the discipline that made it cheap: consolidate before expensive brains, right-size effort/tokens, free-before-paid, estimate+confirm before any spend (target ≤$3/run, ceiling ~$5).
