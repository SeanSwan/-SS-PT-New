# Kimi K3 Review Packet — SwanStudios Living-Environment System (Lens × Theme × World)

**You are Kimi K3, invited as SwanStudios' front-end + design-systems architect.** This is a REVIEW-AND-UPGRADE-PATH pass, not an implementation. Sean (owner, 26+yr trainer, dev) is expanding a "living theme changer" into a **living-environment engine**: the app can change its whole *environment/world* at will, safely, via pre-made data-driven scripts. He wants your enhancement ideas, upgrade paths, and — his #1 priority — **optimization of the FLOW between the three systems so they feel like one**. Better flow = better app.

Everything below is VERIFIED against real `origin/main @ 96ac6bd3d` (file:line where useful). Do NOT propose fixing things marked ALREADY DONE — propose how to make the whole thing better and more coherent.

---

## THE VISION (what Sean is building toward)
One coherent, safe, data-driven "environment" system where: (a) the user (or the app, reactively) selects a **World** = a full setting/atmosphere; (b) it composes cleanly with the existing **palette (theme) + style-lens (geometry) + motion**; (c) new environments are shipped as **safe pre-made JSON-shaped scripts** that can never carry code — so adding a world is data, not a deploy of new logic; (d) environments can react to app STATE (e.g. Aurora Console already tints by coach voice-state — "presence as weather"). The three systems (Theme Changer, Style Lens OS, World Engine) must become ONE flow.

## VERIFIED GROUND TRUTH — what exists on `origin/main @ 96ac6bd3d`

**A. Theme + Lens + Motion are ALREADY FUSED (do not "fix the seam" — it's done).**
- One `AppearanceProfile { paletteThemeId, styleLensId, motionMode }` (`frontend/src/core/style-lens-os/types.ts:129-133`) is committed as a unit through the **Appearance Studio** (`frontend/src/context/ThemeContext/AppearanceStudio/AppearanceStudioPanel.tsx` + `AppearanceStudioPreview.tsx` + `useDialogFocusTrap.ts`), opened from the header theme toggle. Palette + lens + motion apply together on ONE "Apply."
- Two runtime axes on `<html>`: `data-theme` (color vars via `themeUtils.injectThemeVariables`, persist `swanstudios-theme`) and `data-style-lens` + `data-layout-profile` + `data-motion-mode` + `data-density` (geometry/atmosphere, persist `style-lens-os:appearance-profile`). The Studio reconciles both on Apply.
- `worldId` is **NOT yet in `AppearanceProfile`** (verified: 0 matches). This is the clean extension seam for the World Switcher.

**B. The `--world-*` atmosphere/style contract is LIVE and widely adopted.**
- **14 CSS vars:** `--world-{accent, action, bg, dial-radius, letter-spacing, muted, panel, panel-radius, radius, row-columns, row-radius, shadow, text, title-font}`.
- Consumed by **39 production surfaces** (charts, workout planner cards, bootcamp builder, dashboards, etc.) through the **`SurfaceLensGate` / `makeLensFrame`** per-surface opt-in boundary (`frontend/src/adapters/style-lens-swan/v2/SurfaceLensGate.tsx`; example `components/BootcampBuilder/BootcampBuilderLensFrame.tsx`). A surface opts in by wrapping in a lens frame; unknown lens → null → host defaults (fail-closed, zero visual change).

**C. The safe data-driven layer already exists: RecipeV2 (JSON-SHAPED, code-free, fail-closed).**
- `frontend/src/core/style-lens-os/v2/recipeV2.ts` — a recipe "is DATA … it can never carry code, selectors, or URLs." 6 fixed slots; strict token-value allowlist regex bans `url()`, `;`, `{}`, backslash, angle-brackets; `validateRecipeV2` fails closed. Compiled deterministically by `v2/compileRecipe.ts` → CSS `--lens2-*`/`--world-*` vars; unsupported optional slots are dropped as recorded `degradations`, never errors.
- BUT: recipe instances are authored as **TS object literals** (`adapters/style-lens-swan/v2/labRecipes.ts`), not `.json` files. The only actual `.json` in the system are OFFLINE world-factory receipts (`site-manifest.json`, `qa-report.json`) the runtime never reads. So "safe pre-made JSON scripts" is the SHAPE that exists but not yet the runtime INPUT FORMAT.

**D. Aurora Console = the one shipped "environment reacting to app state" (your reference).**
- `aurora-console` lens + `ConsoleAtmosphere` (`frontend/src/components/ConsoleOS/ConsoleAtmosphere.tsx`): fail-closed CSS-only (`display:none` unless `html[data-style-lens='aurora-console']`); a `--console-*` token family derived from theme vars (theme change recolors it); hue follows `[data-voice-state=idle|listening|thinking|speaking]` (also generic `[data-console-state]`) — "presence as weather"; `aria-hidden` + `pointer-events:none`; transform/opacity only (GPU-safe); reduced-motion keeps a static per-state tint. It is a CSS atmosphere LAYER, not a full "world" (no z-stack/particles/shader).

**E. The World Engine / World Creator = docs + offline gallery, ZERO runtime wiring (today).**
- `docs/ai-workflow/AI-HANDOFF/SWAN-WORLD-ENGINE-BUILD-HANDOFF-2026-07-12.md` is a docs-only slice: 18 worlds / 5 families, techniques T1–T13, psychology principles, an "Experience / page-as-place" M4 tier. The "world-factory" is a BATCH GENERATOR of throwaway standalone HTML sites into a gitignored gallery (~20+ `index.html` worlds like `chrome-sovereign`, `evergreen-dominion`, `webb-deep-field`, each with a `site-manifest.json`). It is a gallery for picking a direction, **decoupled from the runtime lens registry** — `site-manifest.json.language` names are World Engine worlds, not lens IDs. A prior Kimi-K3 review already exists at `CAMILLE-7-WORLD-DESIGN-BLUEPRINT.md`.
- `SWAN-UNIFIED-WORLD-REDESIGN-MASTER-2026-07-16.md` (status: AWAITING GO) states the composition law: **World = setting · Structure = preserved IA · Style = Lens OS v2 recipes · Chrome = Crystalline Swan tokens.**

**F. Security posture (Sean cares that environments-via-JSON stay safe):** renderer allowlist (name-only, no markup/code); recipe token-value allowlist (no url/selectors/code); registry deep-freeze + fail-closed resolution to a safety default; `promotion.status !== 'approved'` removes a lens; validate-time gates for contrast ≥4.5 / reduced-motion / 44px; persistence envelope cap (8192 chars) + invalid-profile reset. One known gap: `paletteThemeId` is validated only as a non-empty string, not cross-checked against the theme registry.

## WHAT I (Fable) WANT YOUR EXPERT VIEW ON (be opinionated; rank by impact)
1. **The World Switcher seam.** Given B/C, is "add `worldId` to `AppearanceProfile` + a 'World' tab in the existing Appearance Studio, mapping each world → a RecipeV2 that drives the 14 `--world-*` vars through `SurfaceLensGate`" the right integration — or is there a cleaner/more powerful composition? What does a `world` need beyond the 14 vars to feel like a real *place* (your Experience/M4 tier) WITHOUT breaking the code-free/data-only safety boundary?
2. **The JSON environment format.** Design the safe, pre-made **JSON world/environment script** schema Sean wants — the runtime INPUT format that RecipeV2 validation would consume, so shipping a world is data not code. What fields make it expressive (atmosphere layers, state-reactive bindings à la Aurora, per-surface overrides, motion budget) while staying strictly declarative/allowlisted? How do worlds compose with palette+lens+motion without conflict (precedence rules)?
3. **FLOW (Sean's #1).** Where does the current select→preview→apply→persist→react loop have friction across theme/lens/motion/world? Propose the optimal end-to-end flow (including boot restore, cross-tab sync, per-route or state-reactive world switching, and the offline-gallery → runtime-registry bridge so a factory-generated world becomes a live selectable world). Name concrete flow upgrades.
4. **State-reactive environments beyond Aurora.** Aurora tints by voice-state. What's the general pattern for "environment reacts to app state" (streaks, progress, time-of-day, coaching mode) that stays declarative + GPU-safe + reduced-motion-honest + accessible? Where would it add the most value across the four dashboards (user/client/trainer/admin) tied to the Product Core Loop (log workout → progress proof → next best action → community)?
5. **Ease-of-use / contrast / decoration / beautifying** — Sean's words. With environments now swappable, how do we guarantee every world stays WCAG-AA and legible (contrast receipts at world scale), avoid decoration that hurts the operator console, and make world-switching itself a delightful, low-friction, minimal-click moment?
6. **Gaps I may have missed.** Absence-first: what should exist in this living-environment vision that isn't planned yet? Rank by value/impact.

## OUTPUT FORMAT (so Fable can turn your review into an exact build blueprint)
Return, in this order:
1. **Verdict** (1 paragraph): is the fuse-into-AppearanceProfile direction right? Biggest opportunity, biggest risk.
2. **Ranked upgrade paths** — for each: name · what it enables · the exact seam it uses (cite the real artifacts above) · safety note · rough effort (S/M/L) · why it improves FLOW.
3. **The JSON world-script schema** — concrete field list with types + an example world + the precedence rules vs palette/lens/motion + the validation/allowlist rules that keep it code-free.
4. **The optimal end-to-end flow** — select → preview → apply → persist → boot-restore → cross-tab → state-react → per-route, as a step list I can render as a flowchart.
5. **Absence-first gap list** — missing pieces ranked by value.
6. **3 concrete "next slices"** you'd build first, in order, each with a one-line acceptance test.
Be specific and cite the real seams (RecipeV2, SurfaceLensGate/makeLensFrame, AppearanceProfile, `--world-*`, ConsoleAtmosphere). Assume a senior team will build exactly what you specify.
