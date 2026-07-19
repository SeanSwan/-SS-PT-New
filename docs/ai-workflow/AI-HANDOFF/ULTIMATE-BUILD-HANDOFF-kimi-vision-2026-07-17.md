# ULTIMATE BUILD HANDOFF — build all of SwanStudios in Kimi's vision
**This is an EXECUTION ORDER for the builder AI, not a status report. Paste it (or: "read this file in full and execute it"). Everything referenced is on `origin/main` (tip `6aea2b1e5` at handoff). Repo: SwanStudios (SS-PT), React 18 + TS + styled-components frontend, Node/Express/Sequelize/Postgres backend, deploys from `main` to Render.**

---

## 0. YOUR MISSION
A complete set of **15 Kimi-K3-authored build-exact blueprints** redesigns every SwanStudios surface to the "Enchanted Apex: Crystalline Swan" brand. They were consolidated and pressure-tested by a 3-brain panel (Fable + Sol + Kimi) which produced a **corrected build plan**. Your job: **build it out, exactly as Kimi designed it.** You are the BUILDER. Kimi is the ARCHITECT. You inject ZERO design decisions of your own — if a blueprint is ambiguous, re-consult Kimi (`scripts/consult-kimi.mjs`), do not decide.

## 1. FIRST ACTIONS (do these before writing any code)
1. **Verify branch freshness:** `git fetch origin main && git rev-list --left-right --count origin/main...HEAD`. Whatever branch is checked out may be stale (this happened all session — a checkout ~700 commits behind main). **Cut your build branch from `origin/main`:** `git worktree add C:/tmp/ss-build-<slice> -b claude/build-<slice> origin/main`.
2. **Read, in order:** `docs/ai-workflow/AI-HANDOFF/PANEL-SYNTHESIS-CORRECTED-BUILD-PLAN-2026-07-17.md` (**the authoritative plan — it supersedes every other build order**), then `KIMI-BLUEPRINT-SET-INDEX-2026-07-17.md`, then `HANDOFF-REPORT-design-overhaul-program-2026-07-17.md`, then the specific surface blueprint you're about to build.
3. **Read the coordination lanes** (`.ai-workflow/coordination/claude.lane.md` + `codex.lane.md` + `review-queue.md`) and run `node scripts/coordination-prune.mjs`. A separate **World-Engine lane** owns the runtime `--world-*`/`<WorldAtmosphere>` primitive + `worldId`/World-tab wiring (TOKEN mode). You are the CODE/content side. **Shared seam = the `--world-*` token contract — coordinate, don't collide (Rule 67).**
4. **Claim your files** in your own lane file before editing anything.

## 2. THE UNBREAKABLE RULES
- **Build Kimi's design VERBATIM.** No reinterpretation. Ambiguity → re-consult Kimi.
- **FULL-STACK REAL — NO MOCKS.** Wire frontend AND backend to real endpoints/models. Each blueprint names its API/model or flags a NEW backend surface — build the real thing (real upload, real endpoints, real states), not a fake progress bar or placeholder data.
- **REVERSIBLE.** New design = NEXT-VERSION component (e.g. `HomePage.V5`, `StoreV4`, `CreativeGalleryV2`) side-by-side; the current version stays intact, `lazy()`-loaded; a feature flag selects which mounts; backend is ADDITIVE-ONLY (new routes, additive migrations, NEVER drop/alter). **Two revert modes:** build-time flag (redeploy rollback) and runtime remote-config (instant rollback, both chunks deployed). **Money/PII surfaces (Store, Contact) MUST use runtime mode.** An ErrorBoundary alone is NOT fail-closed.
- **Brand law:** dark-first Crystalline Swan; styled-components only (no MUI/Tailwind); tokens-with-fallback (no raw hex); 44px targets; WCAG AA; Victory-only charts; reduced-motion honored; zero PII. Retired **Galaxy-Swan `#0a0a1a`/`#00FFFF`/`#7851A9` BANNED** everywhere (incl. `var()` fallbacks, `aqua`/`cyan` named colors, `rgba()`/`hsl()` channel literals, SVG/canvas, `.theme.ts`, and image assets). "stretching/flexibility" never yoga/meditation; "26+ years/NASM-protocol" never "NASM-certified". 300-line/file cap.
- **Two-speed law:** cinematic/alive on public marketing (home/about/contact/store/video/photography); CALM GPU-safe reduced-motion in-app (dashboards). Transform/opacity only; ban animated `filter`/`backdrop-filter`.
- **Optics-not-creatures:** render nature as light/refraction/caustics, never literal creatures (the renderer must have no arbitrary-geometry primitive). Whale = sonar light-rings; **rainbows = real dispersion physics (red-out/violet-in ~40-42°), never striped arcs;** the swan lives in the Crystallize.
- **The Crystallize** = executed action → faceted crystalline record artifact. Built ONCE (in the lens/motion layer, published as a versioned interface contract), consumed everywhere — never reinvented per surface. Reduced-motion = designed static end-frame.
- **Do NOT push to `main` or deploy without Sean's explicit go.** Commit per slice locally; batch-push once per phase on Sean's approval (Rule 70). Docs may be pushed; code/deploy is Sean-gated.

## 3. THE BUILD ORDER (from PANEL-SYNTHESIS — authoritative)
**SLICE 0 (foundations + plan-fix) — do this FIRST, it unblocks everything:**
1. **Token schema + Crystallize contract as standalone versioned artifacts, authored DURING the lens build** (validated by the lens as first consumer, but published as their own package so surfaces import tokens, not the lens component). Generate `--world-*` aliases from the typed schema and test equality.
2. **Real de-Galaxy enforcement = a token/AST lint in CI (NOT grep).** grep misses `aqua`/`cyan` (= #00FFFF), 8-digit/space-`rgb()`/`hsla`, SVG `fill=`, canvas `addColorStop`, `.theme.ts` objects, and image assets (a starfield PNG passes every grep). Use hue-window + saturation floor + perceptual asset review + gate-zero self-application to the lens's own new tokens + an explicit allow-rule that the pale focus-ring `#8FE8FF` (≈14:1 on `#060B16`) is NOT banned neon-cyan. **Land this lint in CI day-zero, repo-wide.**
3. **Text-legal vs decorative-only = an enforced lint rule** (text styles may only reference text-legal token slots; `#7851A9` on `#060B16` = 3.33:1, fails 4.5:1).
4. **Ratify the two reversibility modes** in writing; money/PII surfaces use runtime remote-config.
5. **Skill/Brain:** the redone Design Skill (`KIMI-DESIGN-SKILL-REDO`) + enhanced Design Brain (`KIMI-DESIGN-BRAIN-ENHANCED`) are CANDIDATES that encode the rules everything is built to. Per the panel, **approve them FIRST** — review, then (on Sean's confirm) swap them into `.claude/skills/swan-design-router/SKILL.md` + `docs/ai-workflow/design-brain/design.md` (git preserves the originals = reversible). Until swapped, treat them as authoritative reference.
6. **Backend/API contracts precede their UI slices** — write the contract first: Contact (anti-spam + 429 + `200{id}/422{fieldErrors}/429+Retry-After`), Video (watch-progress), Cover (name the upload protocol: tus vs S3 multipart), Photography (server-side watermark rendition).

**Then build surfaces in this order** (each consumes the Slice-0 token schema + Crystallize contract):
1. **Swan Lens** (Slice 1) — see §4 for exact files.
2. **Dashboards** (admin/trainer/client/user — one shell, 4 role densities).
3. **Store** (StoreV4 gated beside V3, runtime-config reversibility, payment path UNTOUCHED, de-Galaxy).
4. **In PARALLEL from the moment the token schema freezes:** re-pass Home / About / Video — each needs FULL design deliverables (signature moment + CTA hierarchy + layouts + state matrices + reduced-motion frame + API contracts); tokens alone do NOT unblock them. Home needs a royalty-free backup hero (current Swan-CTA video is NOT royalty-free). About = light-caustic swan logomark. Video = refraction system.
5. **Contact** (mechanical; exercises the backend-flag + gate pattern end-to-end).
6. **Cover/Gallery** (Core-Loop rewire; the Crystallize on achievements; real chunked upload).
7. **Photography** (whenever its 2219→<300 decomposition + backend land; rename "Cosmic Gate").

## 4. SLICE 1 — SWAN LENS (your first real build; exact from `KIMI-SWAN-LENS-BLUEPRINT`)
Base path `SL = frontend/src/adapters/style-lens-swan`. Read the blueprint in full first. It specifies (verbatim targets):
- `CREATE SL/contract/lensTokens.ts` (≤200) — the token schema: `--lens-core-*` (18 required, e.g. `--lens-core-bg #060B16`, `--lens-core-surface-1 #0A1224`, focus-ring `#8FE8FF`), `--lens-geo-*` (9), `--lens-fx-*` (8 optional), `--lens-elev-*` (5 optional).
- `CREATE SL/contract/worldProjection.ts` (≤140) — 1:1 fixed projection of the 11 existing `--world-*` names + 12 new additive ones FROM the core tokens (one place only; the existing names preserved verbatim).
- `CREATE SL/contract/consoleAlias.ts` (≤60) · `CREATE SL/contract/lensValidator.ts` (≤230) + `__tests__/lensValidator.test.ts` (≤260) — the validator enforces: all required tokens present; banned-pattern sanitizer on every value incl. fallbacks; color format; retired-palette rejection; contrast pairs (text ≥4.5, focus/accent-rare ≥3.0).
- `CREATE SL/motion/useCrystallizeTransition.ts` (≤160) + `SL/motion/CrystallizeOverlay.tsx` (≤120) — the Crystallize (two-speed, reduced-motion = instant facet + opacity static end-frame).
- `MODIFY SL/index.ts` (+45, wrap aggregation in `assertRegistryIntegrity()`) and the Appearance Studio panel (+60, add the 4-swatch preview strip).
- Global focus-ring + `::selection` rules; z-index literals banned (use z-scale tokens).

## 5. PER-SLICE PROTOCOL (repeat for every surface)
1. Read that surface's blueprint in full.
2. Build to it VERBATIM — new-version component side-by-side, feature flag, real backend binding, additive-only.
3. Write the targeted tests the blueprint's acceptance criteria specify (RED first where feasible).
4. VERIFY on the real caller path: `cd frontend/ && npx vitest run <files>` (never from a worktree root — wrong config); `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` and **check the exit code** (a bare `grep -c "error TS"` lies — tsc OOMs to exit 134 and reads as "0 errors"); build; and the de-Galaxy lint must pass on the new files.
5. Confirm reversibility: the flag flips back to the intact old version; backend delta is additive-only.
6. Commit per slice. **Do not push/deploy without Sean.**
7. Report each slice with evidence (files, tests, the flag, residual risk) before the next.

## 6. GOTCHAS (inherit these — they cost real time)
- Verify branch freshness first (§1). Cut from `origin/main`.
- Lying gates: tsc OOM read as 0; vitest from worktree root; piped/wrapped exit codes. Echo the real exit code.
- grep is NOT an enforcement boundary for the banned palette — use the AST/token lint from Slice 0.
- Windows dev: forward slashes in imports; `.cjs` for CommonJS migrations. `translateZ(0)` creates stacking contexts.
- Dual `users`/`"Users"` table in prod — FK constraints reference `"Users"`. Schema drift is a recurring bug class — cross-check model ↔ DB before trusting a query (Rule 58).
- When a blueprint is ambiguous, re-consult Kimi with `scripts/consult-kimi.mjs --document <path> --remit "..." --effort medium --max-tokens 100000` (it's a review tool — override `--remit` to get what you need; medium effort avoids the empty-response failure; big outputs need the high max-tokens + `SWAN_KIMI_TIMEOUT_MS=1200000`).

## 7. WHERE EVERYTHING IS (all on `origin/main`)
`docs/ai-workflow/AI-HANDOFF/`: the 15 `KIMI-*-BLUEPRINT/REFACTOR/REVIEW` docs · `KIMI-BLUEPRINT-SET-INDEX` · `KIMI-BLUEPRINT-SET-MASTER-REVIEW-REPORT` · `PANEL-{FABLE,SOL,KIMI}-VERDICT` · `PANEL-SYNTHESIS-CORRECTED-BUILD-PLAN` (authoritative) · `HANDOFF-REPORT-design-overhaul-program` · `NEXT-CHAT-PROMPT-build-from-kimi-blueprints` · this file. Skill: `.claude/skills/cost-guard/SKILL.md`.

## 8. STATUS — decided vs pending
**Decided:** all blueprints, the panel, the corrected plan, the doctrine, Sean's rulings (optics-not-creatures, rainbows-as-light, the 3 production worlds `chrome-sovereign`/`logo-faceted-sigil`/`swan-deep-field`, `worldId`+World-tab in the existing Appearance Studio, Kimi=design-slot in the Village).
**Pending Sean (confirm before/at Slice 0):** (1) final green-light of the corrected plan (Sean handing you this file IS that go); (2) approve the Design Skill + Brain candidates (swap on his confirm, per §3.5). Ask Sean to confirm both in your first reply, then proceed.
**Cost posture:** honor the `cost-guard` skill — this whole program cost ~$5.8. Don't burn API money by reflex; consolidate before expensive brains, right-size effort/tokens, estimate+confirm before any paid call.

---
**Begin by confirming branch freshness + Sean's two ratifications, reading the corrected plan + the Swan-lens blueprint, then executing Slice 0 → Slice 1 (Swan Lens). Build exactly as Kimi designed it. Report each slice with evidence.**
