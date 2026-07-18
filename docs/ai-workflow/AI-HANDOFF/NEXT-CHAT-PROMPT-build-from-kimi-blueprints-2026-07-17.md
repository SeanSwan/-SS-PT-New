# NEXT-CHAT MASTER PROMPT — build SwanStudios from the KIMI blueprint set
**Forged 2026-07-17. Paste this to a FRESH agent to start building. The prior chat is long; this carries everything the new agent needs.**

> **Kickoff (paste to the fresh agent):** *"Read `docs/ai-workflow/AI-HANDOFF/NEXT-CHAT-PROMPT-build-from-kimi-blueprints-2026-07-17.md` in full, then read the blueprint index it points to, then execute. Cut a fresh branch off origin/main. Build ONE surface at a time, exactly to KIMI's blueprint, reversible, verify each before moving on."*

---

## 1. The situation (what exists)
A complete set of **KIMI-K3-authored, build-exact blueprints** for the entire SwanStudios design surface was created and is **on `origin/main`** (pushed 2026-07-17). Master index: **`docs/ai-workflow/AI-HANDOFF/KIMI-BLUEPRINT-SET-INDEX-2026-07-17.md`** — read it first; it lists all 15 with verdicts.

The blueprints (all in `docs/ai-workflow/AI-HANDOFF/`, dated 2026-07-17):
`KIMI-SWAN-LENS-BLUEPRINT` (foundation) · `KIMI-DASHBOARDS-BLUEPRINT` (4 role densities) · `KIMI-STORE-BLUEPRINT` (design-only, payment path fixed) · `KIMI-COVER-GALLERY-REFACTOR` · `KIMI-VIDEO-BLUEPRINT` · `KIMI-PHOTOGRAPHY-BLUEPRINT` · `KIMI-HOME-BLUEPRINT` (+ royalty-free backup hero) · `KIMI-ABOUT-BLUEPRINT` · `KIMI-CONTACT-BLUEPRINT` · `KIMI-DESIGN-SKILL-REDO` (candidate) · `KIMI-DESIGN-BRAIN-ENHANCED` (candidate) · `KIMI-ORIG-SITE-PROMPT-REVIEW` · `KIMI-WORLD-ATMOSPHERE-ENHANCED` · `SWAN-LIVING-WORLD-GENERATOR-MASTER-PROMPT`.

## 2. THE GOVERNING DOCTRINE (do not violate)
- **KIMI is the ARCHITECT. You are the BUILDER + verifier. Build KIMI's design VERBATIM — inject ZERO design decisions of your own.** Sean's exact rule: "build it exactly the way Kimi would, not the way Opus would reinterpret it." If a blueprint is ambiguous, the fix is to re-consult KIMI (`scripts/consult-kimi.mjs`), NOT to decide yourself.
- **Every surface is FULL-STACK REAL — NO MOCKS.** Wire frontend AND backend to real endpoints/models. Each blueprint names its API/model or flags a new backend surface; build the real thing (e.g. the gallery's chunked/resumable upload is real backend work, not a fake progress bar).
- **Every surface is REVERSIBLE.** Build the new design as the NEXT VERSION component (e.g. `HomePage.V5`, `CreativeGalleryV2`) side-by-side; the current version stays intact; a feature flag (`config/env-config.ts` pattern) selects which mounts. Backend ADDITIVE-ONLY (new routes; additive migrations; never drop/alter). Revert = flip the flag, zero data loss. State the revert plan per slice.

## 3. Sean's brand rulings (encoded in the blueprints — enforce them)
- **Optics-not-creatures:** render nature as light/refraction/caustics, NEVER literal creature silhouettes (the renderer must have no arbitrary-geometry primitive → a creature is unauthorable). Whale = sonar light-rings; the swan = the Crystallize moment.
- **Rainbows = real dispersion physics** (red-out/violet-in ~40–42°), never striped conic arcs.
- **The Crystallize** = executed action → faceted crystalline record artifact (the one signature moment; specced once, reused).
- **Two-speed law:** cinematic/alive on PUBLIC marketing (home/about/contact/store/video/photography); CALM GPU-safe reduced-motion IN-APP (dashboards).
- **Everything ties to the Swan lens** via `--world-*`/`--lens-*` tokens so it re-skins when the header Appearance Studio switches world/theme. Production worlds = `chrome-sovereign`, `logo-faceted-sigil`, `swan-deep-field`. Confirmed: `worldId` goes in the fused `AppearanceProfile` + a "World" tab in the existing Appearance Studio (NOT a new header button).
- Retired Galaxy-Swan palette (`#0a0a1a`/`#00FFFF`/`#7851A9`) BANNED incl. as `var()` fallbacks — audit Store, Photography ("Cosmic Gate"), Cover ("Observatory") which carry it. styled-components only, tokens-with-fallback, 44px, WCAG AA, Victory-only charts, zero PII. "stretching/flexibility" never yoga/meditation; "26+ years/NASM-protocol" never "NASM-certified".

## 4. Recommended BUILD ORDER (per-surface, one at a time, reversible)
1. **Swan lens** first — it's the foundation the dashboards re-skin through (blueprint = "Lens 2.0 Crystalline Core"). Then the `worldId` + World-tab wiring.
2. **Dashboard system** (shared shell + 4 role densities) — the core product loop.
3. **Cover/gallery** (SEND-BACK — needs Core-Loop rewiring, the Crystallize, real chunked upload).
4. **Store** (design-only; bind to existing cart/payment, never redesign it; de-Galaxy).
5. **Home/About/Contact** (marketing; home needs the royalty-free backup hero since the current Swan-CTA video is NOT royalty-free).
6. **Video / Photography** (photography also needs the 2219-line monolith decomposed into <300-line files; contact needs its 1193-line file decomposed too).
Each: build to KIMI's blueprint → targeted tests → verify (real caller path) → reversible flag → commit per slice → ONE push per batch (Rule 70).

## 5. Optional review gates BEFORE/DURING build (Sean's call, spend-gated)
- **Free triangle** (Claude+Codex+Gemini) across the set — the launcher is DOWN (Gemini CLI auth-dead); use `scripts/consult-gemini.mjs` (API path) + a Claude pass + a Codex board request.
- **Paid AI Village** (`scripts/validation-orchestrator.mjs`) — Sean's roster ruling: Kimi = DESIGN-SLOT voting brain only; Fable 5 (available via OpenRouter) + GPT-5.6 Sol on HIGH to be ADDED (not yet wired — a careful slice + Codex review, it touches the Chinese-provider fence + spend gate). Full 19-brain over all 15 blueprints ≈ $20–40; RECOMMENDED targeted pass on store + dashboards + swan-lens ≈ $5–10. Run the orchestrator's built-in estimator (aborts if over `SWAN_VILLAGE_MAX_USD`) and get Sean's explicit confirm before ANY paid run (Rule 16).

## 6. Gotchas that cost real time this session
- **Verify branch freshness FIRST:** `git rev-list --left-right --count origin/main...HEAD`. The physical checkout has been on a stale wip branch (~700 behind main). Cut build branches from `origin/main` and verify each file's real home before committing across branches. `scripts/consult-kimi.mjs` is NOT on origin/main (shipped on another branch) — its two local edits (env-configurable `SWAN_KIMI_MAX_TOKENS` / `SWAN_KIMI_TIMEOUT_MS`) belong on its home branch.
- **Lying gates:** full `tsc --noEmit` OOMs (exit 134) and `grep -c "error TS"` reads it as 0 — run with `NODE_OPTIONS=--max-old-space-size=8192` and CHECK THE EXIT CODE. Vitest from a worktree root loads the wrong config — `cd frontend/` first. Wrappers/pipes can mask a real exit code — echo it.
- **consult-kimi is a REVIEW tool** (template ends "PRODUCE YOUR REVIEW NOW") — override `--remit` to author. Empty response = drop `--effort` to `medium`. Big blueprints need `--max-tokens 100000` + `SWAN_KIMI_TIMEOUT_MS=1200000`.
- **Rule 67 pair-coding:** read `.ai-workflow/coordination/*.lane.md` + `review-queue.md` at session start; a World-Engine build lane is also working the `--world-*` / atmosphere primitive (token-mode); don't collide.

## 7. Open items / pending Sean decisions
- Design-skill + design-brain are CANDIDATES — do NOT swap into the live `.claude/skills/swan-design-router/SKILL.md` or `design-brain/design.md` until Sean approves (git preserves originals).
- Swan-mark-into-default-world: deferred.
- Home Swan-CTA video: NOT royalty-free → the royalty-free backup hero is a required deliverable.
- The paid Village roster wiring (Fable+Sol+Kimi) is not done; Sean gates the spend.

**Start by reading the index + the swan-lens blueprint, cut a branch off origin/main, and build the swan lens first — verbatim, reversible, real. Report each slice with evidence before the next.**
