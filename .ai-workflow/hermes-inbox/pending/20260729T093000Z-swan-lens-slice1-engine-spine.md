---
surface: swan-lens
slug: slice1-engine-spine
utc: 20260729T093000Z
author: vs-claude (Opus-tier, lead orchestrator)
kind: implementation / architecture
privacy: IDs/roles only — no PII, no secrets
---

# Swan Lens World Engine — Slice 1 (engine spine) SHIPPED to branch (not pushed)

Slice 1 of the 25-World Engine build (master prompt `SWAN-LENS-WORLD-ENGINE-MASTER-BUILD-PROMPT-2026-07-28.md`).
Zero user-visible change; pure engine foundation. Commit `3ae82c282` on `claude/build-swan-lens` (batch cadence —
not pushed).

**What landed (new `adapters/style-lens-swan/worlds/`):**
- `worldId.ts` — closed `WorldId` union = the 25 REAL style-catalog ids (playful 7 / calm 4 / technical 6 /
  luxe 4 / atmospheric 4), `WORLD_COUNT: 25` compile-time guard (tuple-length literal — drift = type error).
- `registry.ts` — exhaustive `Record<WorldId, WorldEntry>` (built|planned; recipe non-null iff built). 2 built
  (candy-glass-arcade, prism-terminal), 23 planned.
- `recipes/{candy-glass-arcade,prism-terminal}.ts` + `recipeShared.ts` — the 2 recipes MOVED out of
  `v2/labRecipes.ts`; labRecipes now RE-EXPORTS them (same object references).
- `ledger.ts` — exhaustive per-world a11y/perf budget + a UNIQUE `phenomenon` per world (the "no 25 greys" anchor;
  CI asserts all 25 distinct).
- `scripts/lens-add-world.mjs` — authoring generator (pure `renderWorldRecipeStub` + fs-safe CLI, refuses overwrite).
- `registry.test.ts` — CI layers 1–2 (completeness + static-deterministic) + hash-identical migration proof.

**Transferable techniques:**
1. **Hash-identical migration via re-export + identity assertions.** Moving shared data modules is proven safe by
   asserting SAME object references through old + new import paths (`registry.recipe === labRecipes export ===
   resolver hit`) + `compileRecipe` determinism (deep-equal on re-compile) — cheaper and stronger than snapshot
   hashing. The existing suites staying green is the corroborating hash guarantee.
2. **Exhaustive `Record<ClosedUnion, …>` = free completeness.** Registry + ledger keyed by the closed `WorldId`
   union → a missing world is a COMPILE error, no runtime completeness script needed (Fable's design, confirmed).
3. **tsc-OOM baseline reality (Rule 56):** whole-repo `npm run type-check` OOMs on this box even at 8GB heap (dies
   in mark-compact with ZERO `error TS` output — environment limit, not a code error). Mitigation that WORKS: a
   STANDALONE minimal tsconfig (no `extends` — extends pulls the whole project graph and re-OOMs) scoped to the
   touched files → exit 0, real type verdict. Full baseline stays UNVERIFIED and is disclosed, not claimed clean.

**Safety held:** `recipeResolution.ts` (the A3 dark-until-rollout gate) UNTOUCHED — production still fail-closed to
null; `resolveRecipeForStyleLens('candy-glass-arcade')` (v1 id) → null, asserted. The gate flips only at Slice 15.

**PROOF:** worlds+adapter vitest 150/150; consumer LensFrame tests 45/45; standalone tsc exit 0; generator smoke
ok+throws; DRY-LOOP CLEAN×2 (rounds: 3 — R1 found a fake `_Assert25` no-op guard + the untested consumer blast
radius, both fixed/verified; R2+R3 clean).

**Next:** Slice 2 (characterization oracle — snapshot computed `--*` props over 42 colorways × surfaces, the
theme-collapse safety net) OR jump to a world-DNA wave once Sean taste-cuts the roster. Issue: SWA-69.
