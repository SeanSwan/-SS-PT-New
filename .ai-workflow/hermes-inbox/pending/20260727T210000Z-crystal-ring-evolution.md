# Crystal Ring EVOLUTION system shipped — 4 eras, 20 artifacts, earned swan, zero clip (9e2adf230)

- **When:** terminal VS Claude, worktree C:/tmp/ss-charts-g3. Sean: "this can't be it, get more
  creative; evolve every 50 levels, more intense higher, swan logo at higher tiers, nothing cut off."

## How it was grounded (Rule 76 create-with-context, in action)
Paid Kimi K3 consult ($0.039, authorized) for generative design direction + Mobbin material-tier
refs (Brainly hex tiers, Mimo "Wooden League" — STRUCTURE only, aesthetic stayed Swan-cinematic)
+ design-brain signature doctrine. CLAUDE authored the fusion. Kimi's core insight (adopted):
stop thinking "more FX per band"; each band is "a different artifact forged from the same crystal"
— luxury = SUBSTITUTION, gaming = accumulation. Spec: AI-HANDOFF/CRYSTAL-RING-EVOLUTION-SPEC-2026-07-27.md.

## What shipped (Phase 1)
- **Permanent clip fix:** fixed 400x400 viewBox + hard FX budget (crystalRing.geometry). R_CORE=156,
  everything within R_MAX=200 (Apex crown = 186). Renders at ANY css size; nothing clips. The budget
  IS the guarantee (Kimi: not overflow:visible). Debug r=200 boundary makes it testable.
- **20 bands / 4 eras**, 5 identity axes: silhouette (real polygon progress PATHS: circle->hexagon->
  octagon->12-gon->crown), material (ice->silver->amethyst->gold, gold WITHHELD until Era IV + one
  gold trace in late Amethyst), dominant motion per era, particle grammar (dot/dash/shard/rune/comet),
  center treatment. Continuous `evo` ramp + discrete era transforms.
- **Earned swan crest:** none until L650 -> watermark -> dark-glass occluder (About-SwanMark language)
  -> gold emblem -> L1000 coronation (mirrored wing + swell). Swan never spins.

## Transferable gotchas (carry these)
1. **Consult env/cwd:** consult-kimi.mjs needs OPENROUTER_API_KEY from .env, which lives ONLY in the
   MAIN repo dir — a git WORKTREE has no gitignored .env. Fix: run the consult from the main repo cwd
   (`cd <main> && node scripts/consult-kimi.mjs`); it loads .env itself (Rule-59 safe — never touch the
   key). Also: the spend gate is 2-layer — set SWAN_CONTEXT_MAX_USD AND pass --confirm-spend (preflight
   dry-run without it). Output --out can be an absolute path back into the worktree.
2. **Center-emblem vs scrim:** a crest placed at the ring CENTER is hidden by the legibility scrim
   (radius ~112 in 400-space). Hostile review caught a span=96 swan fully behind the scrim -> invisible.
   Fix: span 240 (radius 120 > scrim) so it reads. OPEN TASTE CALL for Sean: center-sanctuary crest
   (current) vs Kimi's "emblem interrupts the arc at 12 o'clock" (more visible, more "mounted").

## Proof + phasing
31/31 tests (component 8 + evolution tiers 13 + badge 12); build exit 0; guards clean; max extent
186 < 200 verified. Preview artifact published (5 eras + safe-boundary toggle). PHASE 2 (deferred,
documented): the era-boundary "molt" transition (Kimi's brand-defining move — needs level-change
state) + per-band motion/particle swap. Sean to judge the preview + the swan-placement taste call.
