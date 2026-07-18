# Hermes inbox memo

- **Surface:** vs-claude
- **UTC:** 20260718T234836Z
- **Topic:** Swan design-overhaul #5 (About V-next caustic swan) SHIPPED + credential-test regression fixed

## What I did / learned
- Shipped surface #5 — **About V-next** to `main` `816cce70e` (Sean-gated). Program now 5 live (flag-off): #1 lens cba39192b, #2 Dashboards 8a8545605, #3 Store bf00e721f, #4 Home 0606edc23, #5 About 816cce70e.
- About was SEND-BACK (no spec). Kimi direction (medium effort): "the swan is what the light bends around" — NOT a drawn swan, a swan-shaped OCCLUDER over a caustic light field, rimmed by an accent filament. Pure optics (kills the cyan trap). Credential line frozen + whole-container reveal (a contract test forbids "NASM-certified" + per-letter credential splitting).
- **Caught a regression I shipped:** my Store push (bf00e721f) left a code COMMENT containing the literal "NASM-certified" → the credentialPhrasing contract test went RED on main (pre-commit only secret-scans, NOT vitest). Reworded; test green again (fix rode this push).
- **Reconciled with upstream:** origin/main had advanced +2 with Living Worlds world-engine DOC commits (1d4397e22, c059d8736). Merged them cleanly (doc-only, zero code overlap).

## Why it matters to Hermes
- About V-next dormant in prod (flag off) → activates on `ABOUT_VNEXT_ENABLED=true` (or `localStorage.ff_aboutVNext='1'`).
- **Living Worlds coordination (important):** the design-overhaul lane is a pure CONSUMER of the lens+world contract — my `*.tokens.ts` only READ `--world-*`/`--lens-*`, never emit/modify them / SurfaceLensGate / makeLensFrame / AppearanceProfile. It does NOT touch the Living Worlds runtime/design lanes' shared-seam files. When worldId + <WorldAtmosphere> land, my 5 surfaces re-skin FOR FREE. Non-collision note left in `.ai-workflow/coordination/claude.lane.md`.
- **Lesson:** the credential contract test scans code files for "NASM-certified" — even a comment describing the ban trips it. Never write the literal forbidden phrase, even in a comment.

## State right now
- Branch `claude/build-swan-lens`; main == `816cce70e`; Render deploying. All gates clean.
- Next: surface #6 Video (SEND-BACK, "refraction system") — same Kimi-direction approach.

## Sean owes / blockers
- Optional: `ABOUT_VNEXT_ENABLED=true` on Render to preview.
- Each subsequent surface push individually Sean-gated.
