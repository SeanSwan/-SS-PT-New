# LIVING WORLDS — CONVERGENCE DIRECTIVE (both lanes → one brain, additively)
**Issued 2026-07-17 by Sean via Fable 5. This is the prompt to hand BOTH lanes.** North star = the unified blueprint `WORLD-ENGINE-LIVING-ENVIRONMENT-BUILD-BLUEPRINT-2026-07-17.md` (on main, incl. §8b UNIFIED v2). Aesthetic truth = the Design Brain `docs/ai-workflow/design-brain/design.md` (loaded by `swan-design-router`, Rule 40).

## LAW 0 — ADDITIVE ONLY. DESTROY NOTHING.
You keep everything you have already built. You do **not** rewrite, delete, or "start clean." You **finish your loose ends first**, then **seamlessly merge what you have into the unified brain**, then **keep building components up and adding features**. No breaking down. If a merge tempts you to delete working code, stop and adapt instead. Every commit is additive or a bridge — never a teardown.

## SHARED RULES (both lanes)
1. **One brain, two hands.** The blueprint is the single spec. Shared seam = the `--world-*` token contract (14 vars) + `AppearanceProfile.worldId` + the WorldScript JSON schema. Runtime owns HOW it's wired; design owns WHAT fills it. Never edit the other lane's files; re-read the other lane in `.ai-workflow/coordination/` before touching any shared-seam file (Rule 67).
2. **Fail-closed + taste-closed.** Unknown world/type → Crystalline default, zero visual change. The `<WorldAtmosphere>` renderer has a CLOSED primitive set and NO arbitrary-geometry primitive — phenomena, never creatures (§8b U1). A whale/dolphin/bee must be *unauthorable in the format*. The swan lives only in the Crystallize artifact.
3. **Two-speed law.** Cinematic on public marketing; calm, GPU-safe, reduced-motion-first atmosphere in-app. Reduced-motion + `data-motion-mode` are hard vetoes, including one-time events (§8b U7).
4. **House rules always:** Crystalline tokens with fallbacks (`var(--x, <fallback>)`), oklch in JSON (no hex), 44px targets, WCAG-AA (composite contrast, §8b U3), no MUI/Tailwind, 300-line file cap. Sean copy = "26+ years / NASM-protocol," never "NASM-certified"; no yoga/meditation vocabulary.
5. **Per slice:** finish → hostile-review-to-dry → gates (honest `tsc` with 8GB heap + check the exit code; run vitest from `frontend/`) → commit per slice, explicit paths (no `git add -A`) → one push per batch → verify. Cut branches from **real `origin/main`** (the local checkout is a stale WIP branch).

## RUNTIME LANE (plumbing) — your loose ends → your merge path
**Keep:** `ConsoleAtmosphere`, the `--world-*` contract, `SurfaceLensGate`, `useWorldKey` (the read-only observer — do not remove it; it stamps Crystallize with the committed identity). **Finish loose ends:** anything half-wired on your integration branch; make the `--console-*`/`--world-*` fallbacks complete.
**Merge path (blueprint §5 + §8b, in order):**
- **Slice 1 — `worldId` seam** (GATED: do NOT start until Sean answers gates (a)+(b) below). Add `worldId` to `AppearanceProfile` + a **"World" tab in the EXISTING Appearance Studio** (not a new header button) + registry cross-check (fail closed). Accept: selecting a world re-themes all 39 gated surfaces; unknown `worldId` → Crystalline, zero change.
- **Before Slice 2:** land the phenomena primitive set (§8b U1) — `base-gradient · particulate · caustics · light-shafts · aurora-ribbon · star-field · fog-band · chromatic-facet · ring-pulse · bloom · vignette · tint`; ~14 files (`primitives/` one module each + `registry` + `useMotionVeto` + `particulateCanvas`), each <300 lines. Slice 2 is **L**.
- **Slice 2 — `<WorldAtmosphere>` + 2 ported worlds**, with determinism `seed` (§8b U4) + oklch crossfade (§8b U5) + mechanized restraint caps (§8b U2) + capability-vs-security fail split (§8b U6) + canvas machinery or bake-once, ban animated `filter` (§8b U8).
- **Slice 3 — live-stage preview + boot script (no FOUE) + CI composite-contrast matrix** (§8b U3) + mobile reveal zones (§8b U9) + flagship signatures.
You build the EMPTY typed contract; the design lane fills the values.

## DESIGN / GENERATOR LANE (direction + content) — your loose ends → your merge path
**Keep:** the Living World Site Generator master prompt + your Kimi review trail + the offline world-factory gallery. **Finish loose ends:** ship the generator's remaining rounds; lock the world-concept menu.
**Merge path:**
- **Emit WorldScripts, not standalone HTML.** Point the generator's output at the blueprint's JSON WorldScript schema (§3) so a factory world becomes a runtime-selectable world — id, version, recipe (RecipeV2 six slots → `--world-*`), `atmosphere[]` (phenomena primitives only, §8b U1), `bindings[]` (state-reactive), `seed`, `motionBudget` (with §8b U2 caps), `a11y.pairs`. Each world ships a contrast receipt + thumbnail; approval promotes it into the registry.
- **Re-tokenize gallery imports** to Crystalline fallbacks (the ~20 offline worlds likely carry retired Galaxy-Swan DNA — reject on sight otherwise). Vet world names for house voice.
- **New marketing worlds** live on a **NEW `makeLensFrame` host** you create — never the runtime lane's existing 39 surfaces. Cinematic there (two-speed law).
- The `signaturePhenomenon` is optional in schema, promotion-required for the 5 flagships only (§8b U10). The swan = the Crystallize artifact, one-time, reduced-safe.
Design Brain (`design.md`) is your aesthetic source of truth; every `--world-*` / `--atmo-*` value must honor it.

## HELD FOR SEAN — two gates that unblock Slice 1 (answer these and both lanes proceed)
- **(a)** Fuse the swan-mark/logo into the DEFAULT world?  (recommend: yes, as a subtle facet/sheen so even the default has a signature — but Sean decides.)
- **(b)** Confirm `worldId` in `AppearanceProfile` + a **World tab inside the existing Appearance Studio** (NOT a new header button)?  (recommend: yes — reuses the plumbing that already commits palette+lens+motion as one Apply.)
Until (b) is confirmed, the runtime lane does prep only (primitive scaffolds, schema/validation types — pure, no wiring).

## DONE = ONE
The system is converged when: one Appearance Studio commits `{paletteThemeId, styleLensId, motionMode, worldId}` as one Apply; a WorldScript from the generator becomes a live selectable world with no code change; every world is fail-closed, taste-closed, WCAG-AA composite, reduced-motion-honest; and public marketing runs cinematic worlds on their own host while in-app stays calm. No parallel systems remain — just the one brain, still growing.
