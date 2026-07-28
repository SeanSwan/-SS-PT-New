# Swan Lens — pre-production-push review packet (triangle: Claude + Gemini + Codex)

## What this is
A new design-infrastructure system ("Swan Lens") for SwanStudios (React 18 + TS + styled-components).
About to be pushed to production (Render auto-deploys from `main`). This is the FINAL cross-check before deploy.
Branch `claude/build-swan-lens`, clean 7-ahead / 0-behind fast-forward to origin/main.

## Architecture (3 slices, all ADDITIVE + reversible; design-lane only, zero edits to the parallel "Lane A" runtime files)
- **S1-A/B** — `contract/`: a per-lens world-role VALUE table (Crystalline theme values) + `designValueGuard`
  (R1-R7 + WCAG contrast) that EXTENDS the existing `validateRecipeV2` (composes, only narrows, short-circuits);
  `registryIntegrity` (dev/CI fail-closed thrower); `safeResolveLensId` (ready-to-wire for Lane A).
- **S1-C** — split the 324-line `SwanStyleLensGlobalStyles` monolith into always-present `styles/lensCoreStyles.ts`
  (core: :where(:root) defaults, density, shell rules, 44px button-tone glow, reduced-motion, AND the SHIPPED
  aurora-console `--console-*` skin preserved verbatim) + 27 active-only per-lens files + `styles/activeLensStyles.tsx`
  (subtree-union injection via useSyncExternalStore + MutationObserver; lens-first/core-last keyed fragment for
  cascade order). `SwanStyleLensGlobalStyles.ts` is now a re-export shell (App.tsx untouched). **F16** (index.ts):
  dev/CI-only `assertLensRegistryIntegrity`. The 27 extracted lens files are VERBATIM from the monolith and are
  EXCLUDED from this diff — behavior-identity proven by an AT-4i test (188/188 CSS declarations, multiset-identical).
- **Slice 2** — `motion/useCrystallizeTransition.ts` (a lens-switch "moment" controller consuming the real
  M0-M3 motion system: `surfaceMotionTiers` licence x `useAnimationTier` capability, effective=min; reduced-motion
  = OR of profile motionMode!=='auto' | capability 'essential' | prefers-reduced-motion, fail-closed) +
  `motion/CrystallizeOverlay.tsx` (body-portaled sheen, transform/opacity only) + `viewport/useLensViewport.ts`
  (hand/lap/desk/wall, debounced, fail-safe 'lap') + `styles/lensViewportStyles.ts` (matrix/density/a11y CSS string).
  Ships READY-to-wire for Lane A (zero Lane-A edits).
- **Slice 3** — `styles/lensSurfaceStyles.ts` (focus/selection SCOPED to [data-style-lens-shell] so it doesn't
  compete with existing global focus; additive --lens-elev-*/--lens-z-*) + `charts/victoryLensTheme.ts`
  (COMPOSES the existing `resolveLensChartPalette` into a Victory theme; respects the shipped "Chart Charter"
  deferral — qualitative is EXACTLY 2 entries; no --world-data-*; fail-closed).

## Status already verified (do not re-litigate; focus on NEW correctness/integration risks)
- 169/169 adapter+core vitest green; tsc 0 errors in new files; eslint 0; Vite production build PASSES.
- House rules enforced: styled-components only, no MUI, Victory only, var(--token,#fallback) (no raw hex outside
  audit tables/tests), 44px floor, no !important, retired Galaxy-Swan palette (#0a0a1a/#00FFFF/#7851A9 + aqua/cyan)
  banned + grep-gated, zero PII.

## THE ASK (hostile review before a PRODUCTION deploy)
Find CORRECTNESS bugs, race conditions, memory leaks, cross-slice integration failures, or anything that could
break production or the live app on deploy. Specifically scrutinize:
1. `activeLensStyles.tsx` — the useSyncExternalStore + MutationObserver injection: any render-loop, stale-closure,
   leak, or cascade-order risk? Does the keyed-fragment remount of CORE (incl. the console skin) on every lens
   switch cause a flash or break console-skin consumers?
2. `useCrystallizeTransition.ts` — timer/exactly-once-commit correctness, the async charge-timer fail-safe
   (commit throw → log not rethrow), busy-call flush, unmount safety.
3. The `designValueGuard` composition with `validateRecipeV2` — any way the two validators disagree?
4. Anything that would break the LIVE app on deploy (the one live-behavior change is the S1-C monolith→shell swap).

Give a one-line VERDICT (SHIP / SHIP-WITH-CHANGES / BLOCK) + the highest-severity findings first, each with
file + concrete failure scenario. Be concrete; do not hedge to consensus.

## THE DIFF (review-worthy logic; 27 verbatim-extracted lens files + tests + docs excluded)
diff --git a/frontend/src/adapters/style-lens-swan/SwanStyleLensGlobalStyles.ts b/frontend/src/adapters/style-lens-swan/SwanStyleLensGlobalStyles.ts
index 3886032bb..a0b2a8d6e 100644
--- a/frontend/src/adapters/style-lens-swan/SwanStyleLensGlobalStyles.ts
+++ b/frontend/src/adapters/style-lens-swan/SwanStyleLensGlobalStyles.ts
@@ -1,324 +1,11 @@
-/** Scoped structural bindings for SwanStudios Style Lens manifests. */
-import { createGlobalStyle } from 'styled-components';
-
-export const SwanStyleLensGlobalStyles = createGlobalStyle`
-  :root {
-    --lens-sidebar-width: 280px;
-    --lens-sidebar-collapsed: 64px;
-    --lens-main-padding: 24px;
-    --lens-main-padding-mobile: 16px;
-    --lens-panel-radius: 16px;
-    --lens-shell-gap: 0px;
-    --lens-navigation-edge: var(--accent-primary, #60c0f0);
-    --lens-canvas:
-      linear-gradient(145deg,
-        var(--bg-base, #0a0a0f),
-        color-mix(in srgb, var(--bg-surface, #141419) 86%, var(--midnight-sapphire, #002060)));
-  }
-
-  [data-style-lens='swan-flagship'] {
-    --lens-sidebar-width: 292px;
-    --lens-main-padding: clamp(24px, 2vw, 40px);
-    --lens-panel-radius: 18px;
-    --lens-navigation-edge: var(--wing-purple, #8b5cf6);
-  }
-
-  [data-style-lens='quiet-meridian'] {
-    --lens-sidebar-width: 228px;
-    --lens-main-padding: clamp(28px, 3vw, 56px);
-    --lens-panel-radius: 8px;
-    --lens-navigation-edge: var(--ice-wing, #60c0f0);
-    --lens-canvas:
-      linear-gradient(90deg,
-        var(--bg-base, #0a0a0f) 0%,
-        color-mix(in srgb, var(--royal-depth, #003080) 38%, var(--bg-base, #0a0a0f)) 52%,
-        var(--bg-base, #0a0a0f) 100%);
-  }
-
-  [data-style-lens='blueprint-fold'] {
-    --lens-sidebar-width: 252px;
-    --lens-main-padding: clamp(20px, 2.2vw, 44px);
-    --lens-panel-radius: 2px;
-    --lens-navigation-edge: var(--ice-wing, #60c0f0);
-    --lens-canvas:
-      repeating-linear-gradient(0deg,
-        transparent 0 23px,
-        color-mix(in srgb, var(--ice-wing, #60c0f0) 8%, transparent) 24px 25px),
-      repeating-linear-gradient(90deg,
-        transparent 0 23px,
-        color-mix(in srgb, var(--ice-wing, #60c0f0) 8%, transparent) 24px 25px),
-      var(--midnight-sapphire, #002060);
-  }
-
-  [data-style-lens='kintsugi-circuit'] {
-    --lens-sidebar-width: 266px;
-    --lens-main-padding: clamp(24px, 2.6vw, 48px);
-    --lens-panel-radius: 6px 22px 8px 28px;
-    --lens-navigation-edge: var(--gilded-fern, #c6a84b);
-    --lens-canvas:
-      linear-gradient(118deg,
-        transparent 0 46%,
-        color-mix(in srgb, var(--gilded-fern, #c6a84b) 32%, transparent) 46.2% 46.6%,
-        transparent 46.8%),
-      linear-gradient(155deg, var(--bg-base, #0a0a0f), var(--royal-depth, #003080));
-  }
-
-  [data-style-lens='analog-flight-recorder'] {
-    --lens-sidebar-width: 312px;
-    --lens-main-padding: clamp(18px, 2vw, 36px);
-    --lens-panel-radius: 3px;
-    --lens-navigation-edge: var(--gilded-fern, #c6a84b);
-    --lens-canvas:
-      linear-gradient(180deg,
-        var(--carbon, #141419) 0 36px,
-        var(--obsidian-black, #0a0a0f) 36px 100%);
-  }
-
-  [data-style-lens='candy-glass-arcade'] {
-    --lens-sidebar-width: 248px;
-    --lens-main-padding: clamp(20px, 2.4vw, 46px);
-    --lens-panel-radius: 26px;
-    --lens-navigation-edge: var(--wing-purple, #8b5cf6);
-    --lens-canvas:
-      radial-gradient(circle at 82% 12%,
-        color-mix(in srgb, var(--wing-purple, #8b5cf6) 28%, transparent),
-        transparent 32%),
-      radial-gradient(circle at 18% 84%,
-        color-mix(in srgb, var(--ice-wing, #60c0f0) 22%, transparent),
-        transparent 30%),
-      var(--bg-base, #0a0a0f);
-  }
-
-  [data-style-lens='recovery-cloister'] {
-    --lens-sidebar-width: 220px;
-    --lens-main-padding: clamp(32px, 4vw, 72px);
-    --lens-panel-radius: 30px 8px 30px 8px;
-    --lens-shell-gap: 12px;
-    --lens-navigation-edge: var(--ice-wing, #60c0f0);
-    --lens-canvas: radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--ice-wing, #60c0f0) 18%, transparent), transparent 38%), #08243a;
-  }
-
-  [data-style-lens='tempo-forge'] {
-    --lens-sidebar-width: 296px;
-    --lens-main-padding: clamp(18px, 1.8vw, 34px);
-    --lens-panel-radius: 4px 18px 4px 18px;
-    --lens-navigation-edge: var(--wing-purple, #8b5cf6);
-    --lens-canvas: repeating-linear-gradient(180deg, transparent 0 31px, color-mix(in srgb, var(--gilded-fern, #c6a84b) 10%, transparent) 32px 33px), #141419;
-  }
-
-  [data-style-lens='coach-ledger'] {
-    --lens-sidebar-width: 324px;
-    --lens-main-padding: clamp(20px, 2vw, 40px);
-    --lens-panel-radius: 2px;
-    --lens-shell-gap: 1px;
-    --lens-navigation-edge: var(--gilded-fern, #c6a84b);
-    --lens-canvas: linear-gradient(90deg, color-mix(in srgb, var(--gilded-fern, #c6a84b) 7%, transparent) 0 1px, transparent 1px 100%), #1a1a24;
-  }
-
-  [data-style-lens='signal-garden'] {
-    --lens-sidebar-width: 244px;
-    --lens-main-padding: clamp(24px, 3vw, 58px);
-    --lens-panel-radius: 28px 28px 8px 28px;
-    --lens-shell-gap: 16px;
-    --lens-navigation-edge: var(--ice-wing, #60c0f0);
-    --lens-canvas: radial-gradient(ellipse at 8% 50%, color-mix(in srgb, var(--ice-wing, #60c0f0) 16%, transparent), transparent 34%), linear-gradient(145deg, #062e3a, var(--bg-base, #0a0a0f));
-  }
-
-  [data-style-lens='split-horizon'] {
-    --lens-sidebar-width: 264px;
-    --lens-main-padding: clamp(22px, 2.5vw, 50px);
-    --lens-panel-radius: 18px 3px 18px 3px;
-    --lens-navigation-edge: var(--wing-purple, #8b5cf6);
-    --lens-canvas: linear-gradient(180deg, #101d46 0 49.75%, color-mix(in srgb, var(--ice-wing, #60c0f0) 24%, transparent) 50%, var(--bg-base, #0a0a0f) 50.25% 100%);
-  }
-  [data-style-lens='prism-terminal'] {
-    --lens-sidebar-width: 256px; --lens-main-padding: clamp(22px, 2.8vw, 52px);
-    --lens-panel-radius: 5px 24px 5px 24px; --lens-navigation-edge: var(--ice-wing, #60c0f0);
-    --lens-canvas: conic-gradient(from 210deg at 82% 16%, color-mix(in srgb, var(--wing-purple, #8b5cf6) 18%, transparent), transparent 28%, color-mix(in srgb, var(--ice-wing, #60c0f0) 12%, transparent) 48%, transparent 68%), #10203a;
-  }
-
-  [data-style-lens='tidal-columns'] {
-    --lens-sidebar-width: 238px; --lens-main-padding: clamp(26px, 3.4vw, 64px);
-    --lens-panel-radius: 38px 10px 38px 10px; --lens-shell-gap: 18px;
-    --lens-navigation-edge: var(--ice-wing, #60c0f0);
-    --lens-canvas: linear-gradient(100deg, #062a42 0 30%, color-mix(in srgb, var(--royal-depth, #003080) 72%, #062a42) 30% 68%, var(--bg-base, #0a0a0f) 68%);
-  }
-
-  [data-style-lens='monastic-grid'] {
-    --lens-sidebar-width: 208px; --lens-main-padding: clamp(36px, 5vw, 84px);
-    --lens-panel-radius: 0; --lens-navigation-edge: var(--gilded-fern, #c6a84b);
-    --lens-canvas: linear-gradient(color-mix(in srgb, var(--frost-white, #e0ecf4) 5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--frost-white, #e0ecf4) 5%, transparent) 1px, transparent 1px), #181a20;
-    background-size: 72px 72px;
-  }
-
-  [data-style-lens='orbit-atlas'] {
-    --lens-sidebar-width: 278px; --lens-main-padding: clamp(24px, 2.5vw, 48px);
-    --lens-panel-radius: 50% 18px 18px 18px; --lens-navigation-edge: var(--wing-purple, #8b5cf6);
-    --lens-canvas: radial-gradient(circle at 78% 24%, transparent 0 90px, color-mix(in srgb, var(--ice-wing, #60c0f0) 16%, transparent) 91px 93px, transparent 94px 150px, color-mix(in srgb, var(--wing-purple, #8b5cf6) 14%, transparent) 151px 153px, transparent 154px), #0e1638;
-  }
-
-  [data-style-lens='carbon-atelier'] {
-    --lens-sidebar-width: 340px; --lens-main-padding: clamp(16px, 1.6vw, 30px);
-    --lens-panel-radius: 12px 2px 12px 2px; --lens-shell-gap: 4px;
-    --lens-navigation-edge: var(--gilded-fern, #c6a84b);
-    --lens-canvas: linear-gradient(120deg, #17171b 0 64%, color-mix(in srgb, var(--royal-depth, #003080) 36%, #17171b) 64% 100%);
-  }
-  [data-style-lens='kinetic-kanban'] {
-    --lens-sidebar-width: 286px; --lens-main-padding: clamp(18px, 2vw, 38px); --lens-panel-radius: 14px 28px 14px 6px; --lens-shell-gap: 14px; --lens-navigation-edge: var(--wing-purple, #8b5cf6);
-    --lens-canvas: repeating-linear-gradient(90deg, #131b33 0 31%, color-mix(in srgb, var(--ice-wing, #60c0f0) 8%, #131b33) 31% 32%, #131b33 32% 65%, color-mix(in srgb, var(--wing-purple, #8b5cf6) 8%, #131b33) 65% 66%, #131b33 66% 100%);
-  }
-
-  [data-style-lens='aurora-index'] {
-    --lens-sidebar-width: 232px; --lens-main-padding: clamp(28px, 3.5vw, 68px); --lens-panel-radius: 32px 4px 32px 4px; --lens-navigation-edge: var(--ice-wing, #60c0f0);
-    --lens-canvas: linear-gradient(120deg, #0a2340, color-mix(in srgb, var(--wing-purple, #8b5cf6) 22%, #0a2340) 48%, color-mix(in srgb, var(--ice-wing, #60c0f0) 16%, #0a2340));
-  }
-
-  [data-style-lens='modular-harbor'] {
-    --lens-sidebar-width: 304px; --lens-main-padding: clamp(20px, 2.2vw, 42px); --lens-panel-radius: 6px 6px 30px 30px; --lens-shell-gap: 20px; --lens-navigation-edge: var(--gilded-fern, #c6a84b);
-    --lens-canvas: linear-gradient(180deg, #0b2738 0 78%, color-mix(in srgb, var(--gilded-fern, #c6a84b) 12%, #0b2738) 78% 80%, var(--bg-base, #0a0a0f) 80%);
-  }
-
-  [data-style-lens='terrain-console'] {
-    --lens-sidebar-width: 260px; --lens-main-padding: clamp(24px, 2.7vw, 52px); --lens-panel-radius: 22px 22px 4px 22px; --lens-navigation-edge: var(--ice-wing, #60c0f0);
-    --lens-canvas: repeating-radial-gradient(ellipse at 70% 30%, transparent 0 54px, color-mix(in srgb, var(--ice-wing, #60c0f0) 9%, transparent) 55px 56px), #182018;
-  }
-
-  [data-style-lens='chronograph-board'] {
-    --lens-sidebar-width: 318px; --lens-main-padding: clamp(18px, 1.9vw, 36px); --lens-panel-radius: 50% 8px 8px 8px; --lens-navigation-edge: var(--gilded-fern, #c6a84b);
-    --lens-canvas: radial-gradient(circle at 86% 18%, transparent 0 70px, color-mix(in srgb, var(--gilded-fern, #c6a84b) 18%, transparent) 71px 73px, transparent 74px), #1c1a22;
-  }
-  [data-style-lens='glass-rail'] {
-    --lens-sidebar-width: 196px; --lens-main-padding: clamp(26px, 3vw, 58px); --lens-panel-radius: 24px; --lens-shell-gap: 24px; --lens-navigation-edge: var(--ice-wing, #60c0f0);
-    --lens-canvas: linear-gradient(90deg, color-mix(in srgb, var(--frost-white, #e0ecf4) 9%, transparent) 0 2px, transparent 2px 100%), #10243a;
-  }
-  [data-style-lens='meridian-magazine'] {
-    --lens-sidebar-width: 272px; --lens-main-padding: clamp(30px, 4vw, 76px); --lens-panel-radius: 2px 22px 2px 2px; --lens-navigation-edge: var(--gilded-fern, #c6a84b);
-    --lens-canvas: linear-gradient(106deg, #1a1a24 0 38%, color-mix(in srgb, var(--royal-depth, #003080) 35%, #1a1a24) 38% 72%, #1a1a24 72%);
-  }
-  [data-style-lens='lunar-stack'] {
-    --lens-sidebar-width: 290px; --lens-main-padding: clamp(20px, 2.3vw, 44px); --lens-panel-radius: 32px 32px 6px 6px; --lens-shell-gap: 10px; --lens-navigation-edge: var(--ice-wing, #60c0f0);
-    --lens-canvas: linear-gradient(135deg, transparent 0 28%, color-mix(in srgb, var(--frost-white, #e0ecf4) 7%, transparent) 28% 29%, transparent 29% 58%, color-mix(in srgb, var(--wing-purple, #8b5cf6) 10%, transparent) 58% 59%, transparent 59%), #12182c;
-  }
-  [data-style-lens='cedar-workshop'] {
-    --lens-sidebar-width: 332px; --lens-main-padding: clamp(18px, 2vw, 38px); --lens-panel-radius: 10px 3px 10px 3px; --lens-navigation-edge: var(--gilded-fern, #c6a84b);
-    --lens-canvas: repeating-linear-gradient(0deg, transparent 0 44px, color-mix(in srgb, var(--gilded-fern, #c6a84b) 8%, transparent) 45px 46px), #1d241c;
-  }
-  [data-style-lens='crystalline-cathedral'] {
-    --lens-sidebar-width: 300px; --lens-main-padding: clamp(28px, 3.2vw, 64px); --lens-panel-radius: 44px 44px 10px 10px; --lens-shell-gap: 16px; --lens-navigation-edge: var(--gilded-fern, #c6a84b);
-    --lens-canvas: radial-gradient(ellipse at 50% -10%, color-mix(in srgb, var(--ice-wing, #60c0f0) 24%, transparent), transparent 46%), linear-gradient(120deg, #071b3a, color-mix(in srgb, var(--wing-purple, #8b5cf6) 18%, #071b3a) 55%, #071b3a);
-  }
-  /* Aurora Console — the LENS half: shell geometry + canvas, global like every
-     other lens (the Style Lens OS model is "the user picks one lens app-wide"). */
-  [data-style-lens='aurora-console'] {
-    --lens-sidebar-width: 264px; --lens-main-padding: clamp(20px, 2.6vw, 44px); --lens-panel-radius: 18px; --lens-navigation-edge: var(--accent-primary, #60c0f0);
-    --lens-canvas: radial-gradient(ellipse at 18% -8%, color-mix(in srgb, var(--accent-primary, #60c0f0) 20%, transparent), transparent 52%), radial-gradient(ellipse at 82% -4%, color-mix(in srgb, var(--accent-secondary, #8b5cf6) 16%, transparent), transparent 48%), linear-gradient(160deg, #0a2340, color-mix(in srgb, var(--bg-base, #0a0a0f) 78%, #0a2340));
-  }
-
-  /* Aurora Console — the SKIN half: the --console-* family other consoles
-     consume. Every value composes from THEME variables, so the theme changer
-     recolors the whole console automatically. State tokens key off
-     data-voice-state / data-console-state (presence as weather).
-
-     SCOPED TO [data-console-root] ON PURPOSE. The lens is global but this skin
-     is console-SPECIFIC: defining these on <html> would inherit them into every
-     element, so any future non-console surface that consumed --console-* (a
-     shared Card on a public page) would silently wear console chrome the moment
-     an operator picked this lens — "context collapse". Scoping to declared
-     console roots means a non-console consumer resolves to NOTHING and falls
-     back to its previous value via the bridge's fallback chain
-     (var(--console-x, var(--previous, <hex>))) — which is exactly why that chain
-     is load-bearing and must not be "simplified" away.
-
-     A console OPTS IN by putting data-console-root on its shell. That is the
-     whole adoption cost — no provider surgery, no per-route lens plumbing. */
-  html[data-style-lens='aurora-console'] [data-console-root] {
-    --console-surface: color-mix(in srgb, var(--bg-elevated, rgba(20, 32, 56, 0.94)) 74%, transparent);
-    --console-surface-strong: color-mix(in srgb, var(--bg-elevated, rgba(20, 32, 56, 0.94)) 92%, transparent);
-    --console-line: color-mix(in srgb, var(--accent-primary, #60c0f0) 24%, transparent);
-    --console-line-strong: color-mix(in srgb, var(--accent-primary, #60c0f0) 52%, transparent);
-    --console-glow: color-mix(in srgb, var(--accent-secondary, #8b5cf6) 32%, transparent);
-    --console-atmosphere-a: color-mix(in srgb, var(--accent-primary, #60c0f0) 26%, transparent);
-    --console-atmosphere-b: color-mix(in srgb, var(--accent-secondary, #8b5cf6) 22%, transparent);
-    --console-state-idle: var(--accent-primary, #60c0f0);
-    --console-state-listening: var(--error, #ff6d85);
-    --console-state-thinking: var(--accent-secondary, #8b5cf6);
-    --console-state-speaking: var(--accent-gold, #c6a84b);
-  }
-
-  [data-density='compact'] {
-    --lens-main-padding: 18px;
-    --lens-main-padding-mobile: 10px;
-  }
-
-  [data-style-lens-shell] {
-    gap: var(--lens-shell-gap, 0px);
-    background: var(--lens-canvas, var(--bg-base, #0a0a0f));
-  }
-  /* :where() keeps these at single-selector specificity: a non-destructive
-     Dual-Button-Glow floor for plain buttons and lens recipes that never
-     overrides GlowButton's own richer glow/hover treatment. */
-  [data-style-lens-shell] :where([data-swan-button-tone='blue']) {
-    min-height: 44px;
-    box-shadow: 0 0 22px color-mix(in srgb, var(--wing-purple, #8b5cf6) 48%, transparent);
-  }
-
-  [data-style-lens-shell] :where([data-swan-button-tone='purple']) {
-    min-height: 44px;
-    box-shadow: 0 0 22px color-mix(in srgb, var(--ice-wing, #60c0f0) 48%, transparent);
-  }
-
-
-  [data-style-lens-shell] [data-dashboard-scroll-root] {
-    background: var(--lens-canvas, var(--bg-base, #0a0a0f));
-    border-radius: var(--lens-panel-radius, 16px) 0 0 var(--lens-panel-radius, 16px);
-    border-top: 1px solid color-mix(in srgb, var(--lens-navigation-edge, var(--ice-wing, #60c0f0)) 20%, transparent);
-  }
-
-  @media (min-width: 1025px) {
-    [data-style-lens-shell] [role='navigation'] {
-      width: var(--lens-sidebar-width, 280px);
-      border-right-color: var(--lens-navigation-edge, var(--ice-wing, #60c0f0));
-    }
-  }
-
-  /* Lens-id descendant rules must not cross a ScopedLensFrame boundary: with
-     a committed global lens on <html>, every preview frame (Style Explorer
-     stage, both Compare panes) is still a DOM descendant of the html lens
-     attribute, so an unguarded rule would contaminate frames previewing a
-     DIFFERENT lens (e.g. global analog-flight-recorder forcing monospace into
-     a quiet-meridian pane). The :where(:not(...)) guard excludes anything
-     inside a scoped frame whose own lens differs — frames previewing the
-     matching lens still get the treatment, and :where() keeps specificity
-     identical to the unguarded rule. */
-  [data-style-lens='analog-flight-recorder'] [data-style-lens-shell]:where(:not([data-scoped-lens-frame]:not([data-style-lens='analog-flight-recorder']) *)) {
-    font-family: 'Fira Code', monospace;
-    box-shadow: inset 0 36px 0 color-mix(in srgb, var(--gilded-fern, #c6a84b) 12%, transparent);
-  }
-
-  [data-style-lens='quiet-meridian'] [data-dashboard-scroll-root] > :where(:not([data-scoped-lens-frame]:not([data-style-lens='quiet-meridian']) *)) {
-    max-width: 1680px;
-    margin-inline: auto;
-  }
-
-  [data-style-lens='candy-glass-arcade'] [data-dashboard-scroll-root]:where(:not([data-scoped-lens-frame]:not([data-style-lens='candy-glass-arcade']) *)) {
-    box-shadow:
-      inset 0 1px 0 color-mix(in srgb, var(--frost-white, #e0ecf4) 18%, transparent),
-      0 0 42px color-mix(in srgb, var(--wing-purple, #8b5cf6) 14%, transparent);
-  }
-
-  @media (prefers-reduced-motion: reduce) {
-    [data-style-lens-shell],
-    [data-style-lens-shell] * {
-      scroll-behavior: auto;
-      transition-duration: 0.01ms !important;
-      animation-duration: 0.01ms !important;
-      animation-iteration-count: 1 !important;
-    }
-  }
-
-  :root[data-motion='off'] [data-style-lens-shell],
-  :root[data-motion='off'] [data-style-lens-shell] * {
-    transition: none !important;
-    animation: none !important;
-  }
-`;
+/**
+ * SwanStyleLensGlobalStyles — RE-EXPORT SHELL (S1-C monolith split, KIMI-SWAN-LENS-S1C §6).
+ *
+ * The ~28-lens monolith is now split into always-present core (./styles/lensCoreStyles.ts) +
+ * active-only per-lens files (./styles/lenses/*), injected by ./styles/activeLensStyles. This
+ * shell preserves the exact named export consumed at App.tsx:246 and asserted by
+ * swanStyleLensRuntime.contract.test.ts — same file path, same specifier, App.tsx untouched.
+ * The pre-split CSS is preserved verbatim in styles/__tests__/fixtures/swanStyleLensMonolith.legacy.css
+ * (the behavior-identical reference proven by AT-4i). Do not rename; do not add side effects.
+ */
+export { ActiveLensGlobalStyles as SwanStyleLensGlobalStyles } from './styles/activeLensStyles';
diff --git a/frontend/src/adapters/style-lens-swan/charts/victoryLensTheme.ts b/frontend/src/adapters/style-lens-swan/charts/victoryLensTheme.ts
new file mode 100644
index 000000000..ffd8dbc9e
--- /dev/null
+++ b/frontend/src/adapters/style-lens-swan/charts/victoryLensTheme.ts
@@ -0,0 +1,118 @@
+/**
+ * Slice 3 / C7 — ADDITIVE Victory-theme helper (KIMI-SWAN-LENS-SLICE3 §3). Victory-only. No new dep.
+ *
+ * COMPOSES the shipped bridge — does NOT replace it, does NOT re-read --world-accent itself:
+ *   components/Charts/chartTheme.ts        -> resolveLensChartPalette, SWAN_CHART_PALETTE
+ *   components/Charts/lensChartPalette.tsx -> LensChartPaletteProvider (untouched)
+ *
+ * SHIPPED DECISIONS RESPECTED (chartTheme.ts in-file intent, verbatim):
+ *   1. "Chart chrome (axes, tooltips, labels) deliberately stays Swan-fixed for readability;
+ *      only the data-series accent pair follows the lens." => ALL chrome below is Swan-fixed;
+ *      it never reads a --world-* var.
+ *   2. "Only the PRIMARY series follows --world-accent today… the secondary series stays
+ *      Swan-fixed until the Chart Charter ships a real dataviz token pair." => CHART CHARTER
+ *      DEFERRAL: `qualitative` is EXACTLY two entries; the multi-series dataviz tokens (the
+ *      Chart-Charter proposal) do not exist yet and are NOT introduced here (proposal only, §8.1).
+ *
+ * SVG presentation attributes cannot carry var(), so colors are RESOLVED strings — the same
+ * mechanism the shipped bridge documents. Chrome comes from Swan-fixed THEME vars (--frost-white,
+ * --bg-surface) so it tracks the theme, never the lens. Fail-closed: any miss/throw/corrupt value
+ * => SWAN_CHROME_FALLBACKS. Deleting this file breaks nothing (pure additive).
+ */
+import {
+  resolveLensChartPalette,
+  SWAN_CHART_PALETTE,
+  type LensChartPalette,
+} from '../../../components/Charts/chartTheme';
+
+const HEX6 = /^#[0-9a-fA-F]{6}$/;
+
+/** House-rule-#1 audit point; mirrors S1-A §B verbatim. A drift-guard test pins these. */
+export const SWAN_CHROME_FALLBACKS = {
+  labelFill: '#e0ecf4', // --frost-white, verbatim
+  tooltipBg: '#141419', // --bg-surface, verbatim (label-on-bg 15.3:1)
+  axisStroke: 'rgba(224, 236, 244, 0.48)', // frost-white @48% — 4.3:1 on --bg-base
+  gridStroke: 'rgba(224, 236, 244, 0.12)', // frost-white @12% — decorative, non-text
+  tooltipBorder: 'rgba(224, 236, 244, 0.24)',
+} as const;
+
+export interface LensVictoryThemeBundle {
+  /** Spread into <VictoryChart theme={...}> (Victory merges over its own default). */
+  theme: {
+    palette: { qualitative: [string, string] };
+    axis: {
+      style: {
+        axis: { stroke: string };
+        grid: { stroke: string };
+        ticks: { stroke: string; size: number };
+        tickLabels: { fill: string };
+        axisLabel: { fill: string };
+      };
+    };
+  };
+  /** Spread onto <VictoryTooltip flyoutStyle={...} style={...} />. */
+  tooltip: {
+    flyoutStyle: { fill: string; stroke: string };
+    style: { fill: string };
+  };
+}
+
+const asValidHex = (value: string, fallback: string): string => (HEX6.test(value) ? value : fallback);
+
+function readSwanFixedVar(host: HTMLElement | null | undefined, name: string, fallback: string): string {
+  try {
+    const raw = getComputedStyle(host ?? document.documentElement).getPropertyValue(name).trim();
+    return asValidHex(raw, fallback);
+  } catch {
+    return fallback;
+  }
+}
+
+function buildBundle(series: LensChartPalette, labelFill: string, tooltipBg: string): LensVictoryThemeBundle {
+  return {
+    theme: {
+      palette: {
+        // CHART CHARTER DEFERRAL — exactly 2 entries. When the Charter ships a real dataviz token
+        // pair, this is the ONLY extension point. Do not add entries now.
+        qualitative: [series.primary, series.secondary],
+      },
+      axis: {
+        style: {
+          axis: { stroke: SWAN_CHROME_FALLBACKS.axisStroke },
+          grid: { stroke: SWAN_CHROME_FALLBACKS.gridStroke },
+          ticks: { stroke: SWAN_CHROME_FALLBACKS.axisStroke, size: 5 },
+          tickLabels: { fill: labelFill },
+          axisLabel: { fill: labelFill },
+          // fontFamily deliberately UNSET — current chart font handling is unchanged.
+        },
+      },
+    },
+    tooltip: {
+      flyoutStyle: { fill: tooltipBg, stroke: SWAN_CHROME_FALLBACKS.tooltipBorder },
+      style: { fill: labelFill },
+    },
+  };
+}
+
+/**
+ * Resolve a Victory theme bundle for the lens frame containing `host`. Re-invoke wherever
+ * resolveLensChartPalette is re-invoked today (the existing appearance subscriber /
+ * LensChartPaletteProvider render path) — no new subscription machinery is added by this slice.
+ */
+export function resolveLensVictoryTheme(host?: HTMLElement | null): LensVictoryThemeBundle {
+  try {
+    const series = resolveLensChartPalette(host ?? null); // shipped bridge; primary follows --world-accent
+    const safeSeries: LensChartPalette = {
+      primary: asValidHex(series.primary, SWAN_CHART_PALETTE.primary),
+      secondary: asValidHex(series.secondary, SWAN_CHART_PALETTE.secondary),
+    };
+    return buildBundle(
+      safeSeries,
+      readSwanFixedVar(host, '--frost-white', SWAN_CHROME_FALLBACKS.labelFill),
+      readSwanFixedVar(host, '--bg-surface', SWAN_CHROME_FALLBACKS.tooltipBg),
+    );
+  } catch {
+    // Total fail-closed: pure Swan bundle, never throws, always complete.
+    return buildBundle(SWAN_CHART_PALETTE, SWAN_CHROME_FALLBACKS.labelFill, SWAN_CHROME_FALLBACKS.tooltipBg);
+  }
+}
diff --git a/frontend/src/adapters/style-lens-swan/contract/__tests__/designValueGuard.test.ts b/frontend/src/adapters/style-lens-swan/contract/__tests__/designValueGuard.test.ts
new file mode 100644
index 000000000..690ce83b8
--- /dev/null
+++ b/frontend/src/adapters/style-lens-swan/contract/__tests__/designValueGuard.test.ts
@@ -0,0 +1,141 @@
+/**
+ * AT-1 / AT-2 / AT-3 — the design-value guard as a validator EXTENSION.
+ *
+ * Retired-palette literals are constructed by concatenation ('#0a0a' + '1a') so the CI
+ * grep gate (G2) finds zero occurrences of the banned strings anywhere in source.
+ */
+import { describe, expect, it } from 'vitest';
+import {
+  contrastRatio,
+  DESIGN_VALUE_PATTERN,
+  validateDesignThenRecipe,
+  validateLensDesignValues,
+} from '../designValueGuard';
+import { CRYSTALLINE_DEFAULT_WORLD_VALUES } from '../values/crystallineDefault';
+import type { LensWorldRoleValues } from '../lensValues.types';
+import { validateRecipeV2, type RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
+
+const BANNED_BG = '#0a0a' + '1a';
+const BANNED_CYAN = '#00ff' + 'ff';
+const BANNED_PURPLE = '#7851' + 'a9';
+const BANNED_NAMED = 'cy' + 'an';
+
+const withRole = (
+  role: keyof LensWorldRoleValues,
+  value: string,
+  kind: LensWorldRoleValues[typeof role]['kind'] = 'paint',
+): LensWorldRoleValues => ({
+  ...CRYSTALLINE_DEFAULT_WORLD_VALUES,
+  [role]: { value, kind },
+});
+
+const validRecipe: RecipeV2 = {
+  schema: 'smart-lens/recipe-v2',
+  id: 'swan-flagship',
+  version: '1.0.0',
+  compatibility: { engine: '1.0.0', requires: [] },
+  tokens: {},
+  composition: {},
+  components: {},
+  constraints: { minimumTouchTargetPx: 44, reducedMotionFallback: 'required' },
+};
+
+describe('AT-1 — validateLensDesignValues', () => {
+  it('(a) accepts the Crystalline default and its contrast ratios hold', () => {
+    expect(validateLensDesignValues('swan-flagship', CRYSTALLINE_DEFAULT_WORLD_VALUES)).toEqual([]);
+    expect(contrastRatio('#e0ecf4', '#0a0a0f')).toBeCloseTo(16.4, 1); // text / bg
+    expect(contrastRatio('#e0ecf4', '#141419')).toBeCloseTo(15.3, 1); // text / panel
+    expect(contrastRatio('#99a0a7', '#141419')).toBeCloseTo(6.9, 1); // muted / panel
+    expect(contrastRatio('#60c0f0', '#141419')).toBeCloseTo(9.0, 1); // accent / panel
+  });
+
+  it('(b) missing panel → R1 presence issue', () => {
+    const noPanel = { ...CRYSTALLINE_DEFAULT_WORLD_VALUES };
+    delete (noPanel as Record<string, unknown>).panel;
+    const issues = validateLensDesignValues('x', noPanel as LensWorldRoleValues);
+    expect(issues.some((i) => i.role === 'panel' && i.rule === 'R1')).toBe(true);
+  });
+
+  it('(c) concatenated banned literals + named color → R2', () => {
+    expect(validateLensDesignValues('x', withRole('accent', BANNED_BG, 'color')).some((i) => i.rule === 'R2')).toBe(true);
+    expect(validateLensDesignValues('x', withRole('accent', BANNED_CYAN, 'color')).some((i) => i.rule === 'R2')).toBe(true);
+    expect(validateLensDesignValues('x', withRole('accent', BANNED_PURPLE, 'color')).some((i) => i.rule === 'R2')).toBe(true);
+    expect(validateLensDesignValues('x', withRole('accent', BANNED_NAMED, 'paint')).some((i) => i.rule === 'R2')).toBe(true);
+  });
+
+  it('(d) muted = swan-lavender (#4070c0, on panel 3.76:1) → R5 contrast failure', () => {
+    const issues = validateLensDesignValues('x', withRole('muted', '#4070c0', 'color'));
+    expect(issues.some((i) => i.role === 'muted' && i.rule === 'R5')).toBe(true);
+  });
+
+  it('(e) 241-char value and a `;`-bearing value → R3', () => {
+    const long = '#' + 'a'.repeat(241);
+    expect(validateLensDesignValues('x', withRole('accent', long, 'paint')).some((i) => i.rule === 'R3')).toBe(true);
+    expect(validateLensDesignValues('x', withRole('accent', 'red;', 'paint')).some((i) => i.rule === 'R3')).toBe(true);
+  });
+
+  it('is deterministic — issues sorted by (role, rule)', () => {
+    const a = validateLensDesignValues('x', withRole('accent', BANNED_CYAN, 'color'));
+    const b = validateLensDesignValues('x', withRole('accent', BANNED_CYAN, 'color'));
+    expect(a).toEqual(b);
+  });
+});
+
+describe('AT-2 — parity corpus (guard vs base validateRecipeV2)', () => {
+  // Charset/url/length violations the BASE validator also catches — must never diverge.
+  const baseAndGuard = ['a;b', 'a{b', 'a}b', 'a<b', 'a>b', 'a\\b', 'url(x)', '#' + 'a'.repeat(241)];
+  // Brand/security values ONLY the guard rejects (base charset allows them). This is the guard's
+  // added value, NOT a divergence bug — the blueprint's "both reject" wording overstated base coverage.
+  const guardOnly = ['expression(x)', 'javascript', BANNED_BG, BANNED_CYAN, BANNED_PURPLE];
+
+  const guardRejects = (v: string) =>
+    validateLensDesignValues('x', withRole('accent', v, 'paint')).length > 0;
+  const baseRejects = (v: string) =>
+    validateRecipeV2({ ...validRecipe, tokens: { probe: v } }).length > 0;
+
+  it('charset/url/length corpus → rejected by BOTH (no divergence where base has coverage)', () => {
+    for (const v of baseAndGuard) {
+      expect(guardRejects(v), `guard should reject ${v}`).toBe(true);
+      expect(baseRejects(v), `base should reject ${v}`).toBe(true);
+    }
+  });
+
+  it('brand/security corpus → rejected by the GUARD (base accepts; guard is the added layer)', () => {
+    for (const v of guardOnly) {
+      expect(guardRejects(v), `guard should reject ${v}`).toBe(true);
+    }
+  });
+
+  it('DESIGN_VALUE_PATTERN is charset-identical to the base token pattern behavior', () => {
+    // Same accept/reject on charset probes as the base (behavioral parity, XP-4).
+    expect(DESIGN_VALUE_PATTERN.test('#60c0f0')).toBe(true);
+    expect(DESIGN_VALUE_PATTERN.test('a;b')).toBe(false);
+    expect(DESIGN_VALUE_PATTERN.test('a{b')).toBe(false);
+  });
+});
+
+describe('AT-3 — composed authority (validateDesignThenRecipe)', () => {
+  it('bad semver + guard-clean values → rejects with BASE issues only', () => {
+    const r = validateDesignThenRecipe({ ...validRecipe, version: '1.0' }, 'x', CRYSTALLINE_DEFAULT_WORLD_VALUES);
+    expect(r.ok).toBe(false);
+    expect(r.designIssues).toEqual([]);
+    expect(r.recipeIssues.some((i) => i.path === 'version')).toBe(true);
+  });
+
+  it('guard-dirty values short-circuit base validation (base issues suppressed even when present)', () => {
+    const dirty = withRole('accent', BANNED_CYAN, 'color');
+    // The recipe is ALSO base-invalid (bad semver). If base ran, recipeIssues would be non-empty.
+    // Guard-first short-circuit means recipeIssues stays [] — behavioral proof base was skipped.
+    const r = validateDesignThenRecipe({ ...validRecipe, version: '1.0' }, 'x', dirty);
+    expect(r.ok).toBe(false);
+    expect(r.designIssues.length).toBeGreaterThan(0);
+    expect(r.recipeIssues).toEqual([]);
+  });
+
+  it('clean values + valid recipe → ok', () => {
+    const r = validateDesignThenRecipe(validRecipe, 'x', CRYSTALLINE_DEFAULT_WORLD_VALUES);
+    expect(r.ok).toBe(true);
+    expect(r.designIssues).toEqual([]);
+    expect(r.recipeIssues).toEqual([]);
+  });
+});
diff --git a/frontend/src/adapters/style-lens-swan/contract/__tests__/registryIntegrity.test.ts b/frontend/src/adapters/style-lens-swan/contract/__tests__/registryIntegrity.test.ts
new file mode 100644
index 000000000..1ba7ee4d7
--- /dev/null
+++ b/frontend/src/adapters/style-lens-swan/contract/__tests__/registryIntegrity.test.ts
@@ -0,0 +1,56 @@
+/**
+ * AT-5 / FC-1 — registry integrity assertion over the REAL adapter manifest set.
+ *
+ * FC-1 (fail-closed): a doctored registry throws at init, before any render, so a bad lens
+ * can never ship. Retired-palette literals are concatenated so the CI grep gate finds none.
+ */
+import { describe, expect, it } from 'vitest';
+import { assertLensRegistryIntegrity } from '../registryIntegrity';
+import { buildWorldValuesRegistry, CRYSTALLINE_DEFAULT_WORLD_VALUES } from '../values';
+import { SWAN_STYLE_LENS_REGISTRY } from '../../index';
+import type { LensWorldValuesRegistry } from '../lensValues.types';
+
+// Real manifest ids from the adapter's own aggregation (no fixture list).
+const MANIFEST_IDS = SWAN_STYLE_LENS_REGISTRY.available().map((m) => m.id);
+
+describe('AT-5 — assertLensRegistryIntegrity (real inputs)', () => {
+  it('has a non-trivial real manifest set', () => {
+    expect(MANIFEST_IDS.length).toBeGreaterThan(10);
+  });
+
+  it('passes for the real manifests mapped to the Crystalline default table', () => {
+    const values = buildWorldValuesRegistry(MANIFEST_IDS);
+    expect(() => assertLensRegistryIntegrity(MANIFEST_IDS, values)).not.toThrow();
+  });
+
+  it('passes when a matching style allowlist is supplied', () => {
+    const values = buildWorldValuesRegistry(MANIFEST_IDS);
+    const allowlist = Object.fromEntries(MANIFEST_IDS.map((id) => [id, {}]));
+    expect(() => assertLensRegistryIntegrity(MANIFEST_IDS, values, allowlist)).not.toThrow();
+  });
+
+  it('FC-1: missing values entry throws with the exact prefix', () => {
+    const values = { ...buildWorldValuesRegistry(MANIFEST_IDS) } as Record<string, unknown>;
+    delete values[MANIFEST_IDS[0]];
+    expect(() => assertLensRegistryIntegrity(MANIFEST_IDS, values as LensWorldValuesRegistry)).toThrow(
+      /^\[SwanLens\] registry integrity failed:/,
+    );
+  });
+
+  it('FC-1: guard-failing values throw', () => {
+    const bad: LensWorldValuesRegistry = {
+      ...buildWorldValuesRegistry(MANIFEST_IDS),
+      [MANIFEST_IDS[0]]: {
+        ...CRYSTALLINE_DEFAULT_WORLD_VALUES,
+        accent: { value: '#00ff' + 'ff', kind: 'color' }, // retired neon cyan, concatenated
+      },
+    };
+    expect(() => assertLensRegistryIntegrity(MANIFEST_IDS, bad)).toThrow(/registry integrity failed/);
+  });
+
+  it('FC-1: extra style-allowlist entry with no manifest throws', () => {
+    const values = buildWorldValuesRegistry(MANIFEST_IDS);
+    const allowlist = { ...Object.fromEntries(MANIFEST_IDS.map((id) => [id, {}])), 'ghost-lens': {} };
+    expect(() => assertLensRegistryIntegrity(MANIFEST_IDS, values, allowlist)).toThrow(/registry integrity failed/);
+  });
+});
diff --git a/frontend/src/adapters/style-lens-swan/contract/designValueGuard.ts b/frontend/src/adapters/style-lens-swan/contract/designValueGuard.ts
new file mode 100644
index 000000000..147385f2f
--- /dev/null
+++ b/frontend/src/adapters/style-lens-swan/contract/designValueGuard.ts
@@ -0,0 +1,175 @@
+/**
+ * Swan Lens — design-value guard (S1-B / blueprint §4). A validator EXTENSION, never a parallel.
+ *
+ * Composition law (mirrors the codebase's own invariant in recipeV2.ts — "two fail-closed
+ * validators must never disagree on validity"): the composed accept ⟺ `validateRecipeV2`
+ * accepts AND the guard accepts. The guard can only NARROW the accept set (it adds Swan design
+ * rules — brand palette, contrast, kind formats); it never overrides a base rejection.
+ * `validateStyleLensManifest` / `validateAppearanceProfile` are NOT wrapped or edited.
+ *
+ * Rules R1–R7 run over a per-lens world-role VALUE table (lensValues.types.ts). No `--world-*`
+ * is emitted; keys are bare roles, declarations live in CSS files only (R6).
+ */
+import {
+  type RecipeIssue,
+  type RecipeV2,
+  validateRecipeV2,
+} from '../../../core/style-lens-os/v2/recipeV2';
+import {
+  LENS_WORLD_ROLES,
+  type LensWorldRole,
+  type LensWorldRoleValues,
+} from './lensValues.types';
+
+export interface DesignIssue {
+  role: string;
+  rule: string;
+  message: string;
+}
+
+/**
+ * Local re-declaration IDENTICAL to recipeV2.ts `TOKEN_VALUE_PATTERN` (not exported by Lane A;
+ * see blueprint XP-4). Parity is enforced behaviorally by the AT-2 corpus, not by import.
+ */
+export const DESIGN_VALUE_PATTERN = /^[a-zA-Z0-9 #%().,+*/'"_-]{1,240}$/;
+
+/** R5 contrast pairs: [foreground role, background role, minimum ratio]. hex6 roles only. */
+export const CONTRAST_RULES: ReadonlyArray<readonly [LensWorldRole, LensWorldRole, number]> = [
+  ['text', 'bg', 4.5],
+  ['text', 'panel', 4.5],
+  ['muted', 'panel', 4.5],
+  ['accent', 'panel', 3.0],
+];
+
+const HEX6 = /^#[0-9a-fA-F]{6}$/;
+const LENGTH = /^\d+(\.\d+)?(px|rem)$/;
+const PAINT_PREFIX = /^(#|rgb\(|rgba\(|linear-gradient\(|radial-gradient\(|color-mix\(in srgb,|none$)/;
+
+// R2 — the retired palette + injection substrings. Case-insensitive. Whole-word aqua/cyan so
+// "Arctic Cyan" prose elsewhere is irrelevant (only role VALUES reach here). The retired hex
+// literals are assembled by concatenation so no literal retired string appears in source and the
+// repo-wide grep gate (G2) finds zero occurrences anywhere, including this enforcement file (§3.D).
+const BANNED_LITERALS = [
+  new RegExp('#0a0a' + '1a', 'i'),
+  new RegExp('#00ff' + 'ff', 'i'),
+  new RegExp('#7851' + 'a9', 'i'),
+];
+const BANNED_SUBSTR = [/url\(/i, /expression\(/i, /@import/i, /javascript/i];
+const BANNED_NAMED = /(?<![\w-])(aqua|cyan)(?![\w-])/i;
+const FORBIDDEN_NAMESPACE = [/--console-/, /--world-/, /--lens-/];
+
+// ── WCAG 2.x relative luminance + contrast (sRGB) ────────────────────────────
+const channel = (c: number): number => {
+  const s = c / 255;
+  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
+};
+export function relativeLuminance(hex: string): number {
+  const m = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex);
+  if (!m) return NaN;
+  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
+  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
+}
+export function contrastRatio(fg: string, bg: string): number {
+  const l1 = relativeLuminance(fg);
+  const l2 = relativeLuminance(bg);
+  if (Number.isNaN(l1) || Number.isNaN(l2)) return NaN;
+  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
+  return (hi + 0.05) / (lo + 0.05);
+}
+
+function validateKind(value: string, kind: string): string | null {
+  switch (kind) {
+    case 'color':
+      return HEX6.test(value) ? null : 'color must be 6-digit hex #rrggbb';
+    case 'length':
+      return LENGTH.test(value) ? null : 'length must be <number>px|rem';
+    case 'paint':
+      return PAINT_PREFIX.test(value) ? null : 'paint must be a hex/rgb/gradient/color-mix/none value';
+    case 'shadow':
+      return (value === 'none' || (/(px|rem)/.test(value) && (/#[0-9a-fA-F]{3,8}/.test(value) || /rgba?\(/.test(value))))
+        ? null
+        : 'shadow must be a box-shadow (offset/blur lengths + a color) or none';
+    default:
+      return `unknown value kind "${kind}"`;
+  }
+}
+
+/**
+ * XP-1 — the adapter-owned design rules. Returns [] when the value table is Swan-clean.
+ * Pure + deterministic: issues sorted by (role, rule) (R7).
+ */
+export function validateLensDesignValues(
+  manifestId: string,
+  values: LensWorldRoleValues,
+): DesignIssue[] {
+  const issues: DesignIssue[] = [];
+  const push = (role: string, rule: string, message: string) => issues.push({ role, rule, message });
+
+  // R1 — presence: all 8 roles.
+  for (const role of LENS_WORLD_ROLES) {
+    if (!values[role]) push(role, 'R1', `missing required world role "${role}"`);
+  }
+
+  for (const role of LENS_WORLD_ROLES) {
+    const entry = values[role];
+    if (!entry) continue;
+    const v = entry.value;
+
+    // R2 — banned palette + injection.
+    if (BANNED_LITERALS.some((re) => re.test(v))) push(role, 'R2', 'retired Galaxy-Swan palette literal is banned');
+    if (BANNED_NAMED.test(v)) push(role, 'R2', 'named color aqua/cyan (retired neon cyan) is banned');
+    if (BANNED_SUBSTR.some((re) => re.test(v))) push(role, 'R2', 'value contains a forbidden token (url/expression/@import/javascript)');
+
+    // R3 — charset parity with TOKEN_VALUE_PATTERN.
+    if (!DESIGN_VALUE_PATTERN.test(v)) push(role, 'R3', 'value contains a disallowed character or exceeds 240 chars');
+
+    // R6 — no CSS custom-property namespaces in values.
+    if (FORBIDDEN_NAMESPACE.some((re) => re.test(v))) push(role, 'R6', 'value must not reference --console-/--world-/--lens- names');
+
+    // R4 — kind format.
+    const kindErr = validateKind(v, entry.kind);
+    if (kindErr) push(role, 'R4', kindErr);
+  }
+
+  // R5 — contrast (hex6 color roles only; non-hex skipped with a note).
+  for (const [fgRole, bgRole, min] of CONTRAST_RULES) {
+    const fg = values[fgRole];
+    const bg = values[bgRole];
+    if (!fg || !bg) continue;
+    if (fg.kind !== 'color' || !HEX6.test(fg.value) || bg.kind !== 'color' || !HEX6.test(bg.value)) {
+      push(fgRole, 'R5', `contrast vs ${bgRole} skipped: a non-hex role value`);
+      continue;
+    }
+    const ratio = contrastRatio(fg.value, bg.value);
+    if (!(ratio >= min)) {
+      push(fgRole, 'R5', `contrast vs ${bgRole} is ${ratio.toFixed(2)}:1, below ${min}:1`);
+    }
+  }
+
+  // R7 — deterministic ordering.
+  return issues.sort((a, b) => (a.role === b.role ? a.rule.localeCompare(b.rule) : a.role.localeCompare(b.role)));
+}
+
+export interface ComposedValidationResult {
+  ok: boolean;
+  designIssues: DesignIssue[];
+  recipeIssues: RecipeIssue[];
+}
+
+/**
+ * Composed entry: guard FIRST, short-circuit. When the guard fails, `validateRecipeV2` is NOT
+ * called (the composed result carries only design issues). When the guard passes, base issues
+ * are returned untouched. Accept ⟺ guard-clean AND base-clean.
+ */
+export function validateDesignThenRecipe(
+  recipe: RecipeV2,
+  manifestId: string,
+  values: LensWorldRoleValues,
+): ComposedValidationResult {
+  const designIssues = validateLensDesignValues(manifestId, values);
+  if (designIssues.length > 0) {
+    return { ok: false, designIssues, recipeIssues: [] };
+  }
+  const recipeIssues = validateRecipeV2(recipe);
+  return { ok: recipeIssues.length === 0, designIssues: [], recipeIssues };
+}
diff --git a/frontend/src/adapters/style-lens-swan/contract/lensValues.types.ts b/frontend/src/adapters/style-lens-swan/contract/lensValues.types.ts
new file mode 100644
index 000000000..fa7bf4441
--- /dev/null
+++ b/frontend/src/adapters/style-lens-swan/contract/lensValues.types.ts
@@ -0,0 +1,65 @@
+/**
+ * Swan Lens — world-role VALUE contract (S1-A, DATA only).
+ *
+ * A typed per-lens value table keyed to World-Engine **Lane A's existing** `--world-*`
+ * role names (bg/panel/accent/text/muted/action/shadow/radius). This is a VALUE SOURCE,
+ * not a schema: keys are bare role names WITHOUT the leading `--`, mirroring the shape of
+ * `RecipeTokens` (core/style-lens-os/v2/recipeV2.ts) so Lane A can feed roles into
+ * `compileRecipe` whenever it wires them. Slice-1 consumes this only in the design-value
+ * guard, its tests, and the registry-integrity check — it emits NO `--world-*` CSS.
+ *
+ * Ownership (Rule 67): Lane A owns the `--world-*` NAMES + their wiring. This adapter file
+ * owns the VALUES only. No new `--world-*` name is introduced here (see the regrounded
+ * blueprint §3.C "requires Lane A agreement" for proposed additions — none emitted in Slice 1).
+ */
+
+/** The eight world roles Lane A already exposes (bare names, no leading `--`). */
+export const LENS_WORLD_ROLES = [
+  'bg',
+  'panel',
+  'accent',
+  'text',
+  'muted',
+  'action',
+  'shadow',
+  'radius',
+] as const;
+
+export type LensWorldRole = (typeof LENS_WORLD_ROLES)[number];
+
+/**
+ * How a role's value is format-validated (guard rule R4).
+ * - `color`  → strict 6-digit hex (`#rrggbb`); the only kind eligible for contrast checks.
+ * - `length` → `<number>px|rem`.
+ * - `paint`  → a color/gradient value (starts with `#`/`rgb(`/`rgba(`/`linear-gradient(`/
+ *              `radial-gradient(`/`color-mix(in srgb,`/`none`).
+ * - `shadow` → a box-shadow value (offset/blur lengths + a color); NOT a bare paint.
+ *   [FLAGGED micro-clarification vs blueprint §3.B/R4, which named only color/length/paint:
+ *    the `shadow` role's value is a box-shadow, so it needs its own kind. Mechanical, not a
+ *    design decision — confirm with Kimi if desired.]
+ */
+export type ValueKind = 'color' | 'length' | 'paint' | 'shadow';
+
+/** One role's value + its declared kind (drives R4 format + R5 contrast eligibility). */
+export interface LensWorldRoleValue {
+  value: string;
+  kind: ValueKind;
+}
+
+/** A full per-lens table: every role in LENS_WORLD_ROLES present (guard rule R1). */
+export type LensWorldRoleValues = Readonly<Record<LensWorldRole, LensWorldRoleValue>>;
+
+/** manifestId → its world-role value table. */
+export type LensWorldValuesRegistry = Readonly<Record<string, LensWorldRoleValues>>;
+
+/**
+ * Documentation-only map from a world role to the natural RecipeV2 slot Lane A would wire it
+ * into (surface.card←panel, text.*←text, action.primary←action, chart.progress←accent). This
+ * is a NOTE for Lane A, not code Slice-1 executes; roles with no natural slot are omitted.
+ */
+export const WORLD_ROLE_TO_RECIPE_SLOT: Readonly<Partial<Record<LensWorldRole, string>>> = {
+  panel: 'surface.card',
+  text: 'text.body',
+  action: 'action.primary',
+  accent: 'chart.progress',
+};
diff --git a/frontend/src/adapters/style-lens-swan/contract/registryIntegrity.ts b/frontend/src/adapters/style-lens-swan/contract/registryIntegrity.ts
new file mode 100644
index 000000000..6ea1c5a90
--- /dev/null
+++ b/frontend/src/adapters/style-lens-swan/contract/registryIntegrity.ts
@@ -0,0 +1,51 @@
+/**
+ * Swan Lens — registry integrity assertion (S1-B / blueprint §4 XP-2, F5).
+ *
+ * Dev/CI thrower: verifies every manifest id has exactly one world-values entry (and, when a
+ * style allowlist is supplied, exactly one allowlist entry), and that each lens's values pass
+ * the design guard. Throws BEFORE any render so a build can never ship a lens that would render
+ * inherited garbage (fail-closed FC-1).
+ *
+ * All inputs are INJECTED — no import guessing about the adapter barrel (blueprint §10.3).
+ * `styleAllowlist` is optional so this composes before the S1-C injection allowlist exists.
+ */
+import { validateLensDesignValues } from './designValueGuard';
+import type { LensWorldValuesRegistry } from './lensValues.types';
+
+export function assertLensRegistryIntegrity(
+  manifestIds: readonly string[],
+  valuesRegistry: LensWorldValuesRegistry,
+  styleAllowlist?: Readonly<Record<string, unknown>>,
+): void {
+  const issues: string[] = [];
+
+  for (const id of manifestIds) {
+    const values = valuesRegistry[id];
+    if (!values) {
+      issues.push(`manifest "${id}" has no world-values entry`);
+    } else {
+      const designIssues = validateLensDesignValues(id, values);
+      if (designIssues.length > 0) {
+        issues.push(`manifest "${id}" values rejected (${designIssues[0].rule}: ${designIssues[0].message})`);
+      }
+    }
+    if (styleAllowlist && !Object.prototype.hasOwnProperty.call(styleAllowlist, id)) {
+      issues.push(`manifest "${id}" has no style-allowlist entry`);
+    }
+  }
+
+  // Reverse direction: no orphan entries pointing at a non-existent manifest.
+  const known = new Set(manifestIds);
+  for (const id of Object.keys(valuesRegistry)) {
+    if (!known.has(id)) issues.push(`world-values entry "${id}" has no manifest`);
+  }
+  if (styleAllowlist) {
+    for (const id of Object.keys(styleAllowlist)) {
+      if (!known.has(id)) issues.push(`style-allowlist entry "${id}" has no manifest`);
+    }
+  }
+
+  if (issues.length > 0) {
+    throw new Error(`[SwanLens] registry integrity failed: ${issues.length} issue(s) — ${issues[0]}`);
+  }
+}
diff --git a/frontend/src/adapters/style-lens-swan/contract/safeResolveLensId.ts b/frontend/src/adapters/style-lens-swan/contract/safeResolveLensId.ts
new file mode 100644
index 000000000..90bdaa0e0
--- /dev/null
+++ b/frontend/src/adapters/style-lens-swan/contract/safeResolveLensId.ts
@@ -0,0 +1,29 @@
+/**
+ * Swan Lens — safe lens-id resolution + Apply announcement copy (S1-B / blueprint §7, F6).
+ *
+ * Pure helper SHIPPED for World-Engine Lane A to wire into the Apply handler (the handler and
+ * `appearancePersistence` are Lane A's — Slice-1 does not call this from any Lane A file).
+ *
+ * Fail-closed model (blueprint §9.4): a NO safety-lens id is invented. On an unknown id the
+ * resolution is `ok:false, lensId:null` — Lane A then keeps the persisted profile and renders
+ * core-only (S1-C fallback), rather than swapping in a fabricated lens.
+ */
+
+export interface LensResolution {
+  ok: boolean;
+  /** The requested id when known; null when unknown (keep persisted profile, core-only render). */
+  lensId: string | null;
+}
+
+export function safeResolveLensId(requestedId: unknown, knownIds: readonly string[]): LensResolution {
+  if (typeof requestedId === 'string' && requestedId.length > 0 && knownIds.includes(requestedId)) {
+    return { ok: true, lensId: requestedId };
+  }
+  return { ok: false, lensId: null };
+}
+
+/** Live-region announcements (a11y). Lane A writes these on Apply success / safe-fallback. */
+export const ANNOUNCE_COPY = {
+  success: (lensDisplayName: string): string => `Appearance applied: ${lensDisplayName}.`,
+  fallback: "That style couldn't be applied safely, so the default look was restored.",
+} as const;
diff --git a/frontend/src/adapters/style-lens-swan/contract/values/crystallineDefault.ts b/frontend/src/adapters/style-lens-swan/contract/values/crystallineDefault.ts
new file mode 100644
index 000000000..d0573ea75
--- /dev/null
+++ b/frontend/src/adapters/style-lens-swan/contract/values/crystallineDefault.ts
@@ -0,0 +1,31 @@
+/**
+ * Swan Lens — the Crystalline default world-role VALUE table (S1-A / blueprint §3.B).
+ *
+ * The ONLY place Slice-1 world-role hex lives. Every value restates or derives from the
+ * Crystalline Swan theme tokens (--bg-base / --bg-surface / --ice-wing / --frost-white /
+ * --accent-primary / --obsidian-black / --carbon). Contrast ratios are asserted in
+ * designValueGuard.test.ts (AT-1) via WCAG 2.x relative luminance.
+ *
+ * No retired-palette literal appears here (guard rule R2 rejects the retired deep-bg / neon-cyan /
+ * wing-purple triple and named aqua/cyan). Per-lens world-role differentiation is Slice-3 work; in Slice-1
+ * every manifest maps to THIS default table (see values/index.ts).
+ */
+import type { LensWorldRoleValues } from '../lensValues.types';
+
+export const CRYSTALLINE_DEFAULT_WORLD_VALUES: LensWorldRoleValues = Object.freeze({
+  // --bg-base / --obsidian-black
+  bg: { value: '#0a0a0f', kind: 'color' },
+  // --bg-surface / --carbon
+  panel: { value: '#141419', kind: 'color' },
+  // --ice-wing / --accent-primary — on panel ≈ 9.0:1 (≥ 3.0 graphic)
+  accent: { value: '#60c0f0', kind: 'color' },
+  // --frost-white — on bg ≈ 16.4:1, on panel ≈ 15.3:1
+  text: { value: '#e0ecf4', kind: 'color' },
+  // frost-white dimmed over bg-surface — on panel ≈ 6.9:1 (≥ 4.5 body text)
+  muted: { value: '#99a0a7', kind: 'color' },
+  // --accent-primary — CTA; with proposed on-action #0a0a0f ≈ 9.7:1
+  action: { value: '#60c0f0', kind: 'color' },
+  // obsidian-based elevation paint
+  shadow: { value: '0 8px 24px rgba(10,10,15,0.55)', kind: 'shadow' },
+  radius: { value: '16px', kind: 'length' },
+});
diff --git a/frontend/src/adapters/style-lens-swan/contract/values/index.ts b/frontend/src/adapters/style-lens-swan/contract/values/index.ts
new file mode 100644
index 000000000..7dc5ae11c
--- /dev/null
+++ b/frontend/src/adapters/style-lens-swan/contract/values/index.ts
@@ -0,0 +1,28 @@
+/**
+ * Swan Lens — world-values registry builder (S1-A / blueprint §2 F3).
+ *
+ * Maps EVERY manifest id to the Crystalline default world-role table. Per-lens world-role
+ * differentiation is Slice-3 design work — Slice-1 gives every lens the same, contrast-clean
+ * default so no surface renders inherited garbage while the design lane authors per-world values.
+ *
+ * `manifestIds` is INJECTED (from the adapter's existing manifest aggregation) — this builder
+ * makes no import assumptions about the barrel's export names (blueprint §10.3).
+ */
+import type { LensWorldValuesRegistry } from '../lensValues.types';
+import { CRYSTALLINE_DEFAULT_WORLD_VALUES } from './crystallineDefault';
+
+export { CRYSTALLINE_DEFAULT_WORLD_VALUES } from './crystallineDefault';
+
+/**
+ * Build a values registry mapping each manifest id → the Crystalline default table.
+ * Duplicate ids collapse to one entry (last wins, but they are identical). Empty input → {}.
+ */
+export function buildWorldValuesRegistry(manifestIds: readonly string[]): LensWorldValuesRegistry {
+  const registry: Record<string, typeof CRYSTALLINE_DEFAULT_WORLD_VALUES> = {};
+  for (const id of manifestIds) {
+    if (typeof id === 'string' && id.length > 0) {
+      registry[id] = CRYSTALLINE_DEFAULT_WORLD_VALUES;
+    }
+  }
+  return Object.freeze(registry);
+}
diff --git a/frontend/src/adapters/style-lens-swan/index.ts b/frontend/src/adapters/style-lens-swan/index.ts
index 88711bf28..96a5ac738 100644
--- a/frontend/src/adapters/style-lens-swan/index.ts
+++ b/frontend/src/adapters/style-lens-swan/index.ts
@@ -29,6 +29,9 @@ import { LUNAR_STACK_MANIFEST } from './manifests/lunarStack';
 import { CEDAR_WORKSHOP_MANIFEST } from './manifests/cedarWorkshop';
 import { CRYSTALLINE_CATHEDRAL_MANIFEST } from './manifests/crystallineCathedral';
 import { AURORA_CONSOLE_MANIFEST } from './manifests/auroraConsole';
+import { assertLensRegistryIntegrity } from './contract/registryIntegrity';
+import { buildWorldValuesRegistry } from './contract/values';
+import { LENS_STYLE_ALLOWLIST } from './styles/lenses';
 
 export { SWAN_FLAGSHIP_MANIFEST } from './manifests/swanFlagship';
 export { SWAN_ROLE_SLOT_MAP } from './roleMapping';
@@ -74,3 +77,52 @@ export const SWAN_STYLE_LENS_REGISTRY = createStyleLensRegistry([
   ...SWAN_EXPANSION_MANIFESTS,
 ]);
 
+// ── Swan Lens Slice-1 contract surface (S1-A/B/C) ──
+export { validateLensDesignValues, validateDesignThenRecipe } from './contract/designValueGuard';
+export { assertLensRegistryIntegrity } from './contract/registryIntegrity';
+export { buildWorldValuesRegistry, CRYSTALLINE_DEFAULT_WORLD_VALUES } from './contract/values';
+export { safeResolveLensId, ANNOUNCE_COPY } from './contract/safeResolveLensId';
+export { LENS_STYLE_ALLOWLIST } from './styles/lenses';
+
+// ── Swan Lens Slice-2 (Crystallize + viewport) — ready-to-wire for Lane A ──
+export {
+  useCrystallizeTransition,
+  CRYSTALLIZE_SURFACE_ID,
+  CRYSTALLIZE_TIMING,
+  type CrystallizeController,
+  type CrystallizeOverlayProps,
+} from './motion/useCrystallizeTransition';
+export { CrystallizeOverlay, CRYSTALLIZE_OVERLAY_Z, crystallizeOverlayCss } from './motion/CrystallizeOverlay';
+export {
+  useLensViewport,
+  layoutProfileForViewport,
+  LENS_VIEWPORT_QUERIES,
+  type LensViewport,
+} from './viewport/useLensViewport';
+export { lensViewportCss } from './styles/lensViewportStyles';
+
+// ── Swan Lens Slice-3 (surfaces + Victory bridge) — additive, ready-to-wire ──
+export { lensSurfaceCss, LensSurfaceGlobalStyles } from './styles/lensSurfaceStyles';
+export {
+  resolveLensVictoryTheme,
+  SWAN_CHROME_FALLBACKS,
+  type LensVictoryThemeBundle,
+} from './charts/victoryLensTheme';
+
+// F16 — dev/CI fail-closed integrity gate (never runs in production). Asserts that every STYLED
+// lens (the 27 named manifests; the DEFAULT safety lens renders via always-present core, so it is
+// intentionally outside this set) has a Crystalline-clean world-values entry AND a style-allowlist
+// entry, with no orphans. A drift here throws at adapter init — before any render.
+if (process.env.NODE_ENV !== 'production') {
+  const styledLensIds = [
+    SWAN_FLAGSHIP_MANIFEST,
+    ...SWAN_SENTINEL_MANIFESTS,
+    ...SWAN_EXPANSION_MANIFESTS,
+  ].map((manifest) => manifest.id);
+  assertLensRegistryIntegrity(
+    styledLensIds,
+    buildWorldValuesRegistry(styledLensIds),
+    LENS_STYLE_ALLOWLIST,
+  );
+}
+
diff --git a/frontend/src/adapters/style-lens-swan/motion/CrystallizeOverlay.tsx b/frontend/src/adapters/style-lens-swan/motion/CrystallizeOverlay.tsx
new file mode 100644
index 000000000..8e09fbc40
--- /dev/null
+++ b/frontend/src/adapters/style-lens-swan/motion/CrystallizeOverlay.tsx
@@ -0,0 +1,78 @@
+/**
+ * CrystallizeOverlay — Swan Lens C4 sheen + live-region overlay (Slice 2 / §2.3).
+ *
+ * Portals to <body> (outside #root, so the desk/lap root-scale rule never re-contains the sheen).
+ * Always mounts a visually-hidden aria-live region (announcements fire on the static path too);
+ * the sheen div mounts only during an animated transition. Transform/opacity ONLY. Keyframe-based
+ * (deterministic start on mount + on the charging→settling flip; `both` fill keeps the commit seam
+ * visually continuous). Reduced-motion never reaches here (the controller resolves to `static`).
+ *
+ * z-index: --world-z-* are unratified Lane-A proposals (§3.C), so an INTERIM documented constant is
+ * used — 300, below modal(400)/toast(500). One-line swap to var(--world-z-overlay) on ratification.
+ */
+import { createPortal } from 'react-dom';
+import { createGlobalStyle } from 'styled-components';
+import type { CrystallizeOverlayProps } from './useCrystallizeTransition';
+
+export const CRYSTALLIZE_OVERLAY_Z = 300;
+
+// Exported as a string for the test CSS-property gate (§2.6 test 2). The z value is interpolated
+// from the single-source constant so no bare z-index literal is authored twice.
+// Timing is read from the html-scoped `--lens-crystallize-*` vars the CONTROLLER sets during a
+// transition (inherited down to the body-portaled sheen) — no inline style on the sheen div (repo
+// bans inline style={{}}). The visually-hidden live region is a class, not inline style.
+export const crystallizeOverlayCss = `
+  .lens-crystallize-live {
+    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
+    overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
+  }
+  .lens-crystallize-sheen {
+    position: fixed; top: 0; bottom: 0; left: 0;
+    z-index: ${CRYSTALLIZE_OVERLAY_Z};
+    pointer-events: none; opacity: 0; will-change: opacity, transform;
+    background: var(--lens-fx-crystallize-sheen, linear-gradient(105deg, transparent 40%, rgba(143,232,255,0.14) 50%, transparent 60%));
+  }
+  .lens-crystallize-sheen[data-variant='sweep'] { width: 160%; }
+  .lens-crystallize-sheen[data-variant='fade'] { right: 0; }
+
+  @keyframes crystallizeChargeSweep { from { opacity: 0; transform: translateX(-30%); } to { opacity: 1; transform: translateX(0); } }
+  @keyframes crystallizeSettleSweep { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(30%); } }
+  @keyframes crystallizeChargeFade { from { opacity: 0; } to { opacity: 1; } }
+  @keyframes crystallizeSettleFade { from { opacity: 1; } to { opacity: 0; } }
+
+  .lens-crystallize-sheen[data-phase='charging'][data-variant='sweep'] {
+    animation: crystallizeChargeSweep var(--lens-crystallize-charge-ms, 120ms) var(--lens-ease-crystallize, cubic-bezier(0.16,1,0.3,1)) both;
+  }
+  .lens-crystallize-sheen[data-phase='settling'][data-variant='sweep'] {
+    animation: crystallizeSettleSweep var(--lens-crystallize-settle-ms, 360ms) var(--lens-ease-crystallize, cubic-bezier(0.16,1,0.3,1)) both;
+  }
+  .lens-crystallize-sheen[data-phase='charging'][data-variant='fade'] {
+    animation: crystallizeChargeFade var(--lens-crystallize-charge-ms, 100ms) var(--lens-ease-crystallize, cubic-bezier(0.16,1,0.3,1)) both;
+  }
+  .lens-crystallize-sheen[data-phase='settling'][data-variant='fade'] {
+    animation: crystallizeSettleFade var(--lens-crystallize-settle-ms, 220ms) var(--lens-ease-crystallize, cubic-bezier(0.16,1,0.3,1)) both;
+  }
+`;
+
+const CrystallizeGlobalStyle = createGlobalStyle`${crystallizeOverlayCss}`;
+
+export function CrystallizeOverlay({
+  phase,
+  variant,
+  announcement,
+}: CrystallizeOverlayProps): React.ReactPortal | null {
+  if (typeof document === 'undefined') return null;
+  const showSheen = phase !== 'idle' && variant !== 'static';
+  return createPortal(
+    <>
+      <CrystallizeGlobalStyle />
+      <div aria-live="polite" className="lens-crystallize-live">
+        {announcement}
+      </div>
+      {showSheen && (
+        <div className="lens-crystallize-sheen" aria-hidden="true" data-phase={phase} data-variant={variant} />
+      )}
+    </>,
+    document.body,
+  );
+}
diff --git a/frontend/src/adapters/style-lens-swan/motion/useCrystallizeTransition.ts b/frontend/src/adapters/style-lens-swan/motion/useCrystallizeTransition.ts
new file mode 100644
index 000000000..dc364c763
--- /dev/null
+++ b/frontend/src/adapters/style-lens-swan/motion/useCrystallizeTransition.ts
@@ -0,0 +1,201 @@
+/**
+ * useCrystallizeTransition — Swan Lens C4 signature moment controller (Slice 2 / §2.2, §2.4).
+ *
+ * The Crystallize is an IN-APP calm moment fired when the lens switches. It CONSUMES the real
+ * motion system (surfaceMotionTiers licence × useAnimationTier capability, effective = min) — no
+ * parallel motion-token file. Reduced-motion is the OR of THREE real triggers (profile motionMode,
+ * capability 'essential', prefers-reduced-motion) with a fail-closed PRM read. It never reads
+ * `data-motion-mode` (ScopedLensFrame's frame-scoped vocabulary — wrong axis).
+ *
+ * Shipped READY-to-wire for World-Engine Lane A (the Apply handler is theirs): Lane A wraps its
+ * existing `commitAppearance` in `crystallizeTo(commit)` and renders <CrystallizeOverlay {...overlayProps}/>.
+ * Commit runs exactly once; on any timer exception the transition forces idle and still commits once.
+ */
+import { useCallback, useEffect, useRef, useState } from 'react';
+import type { AppearanceProfile } from '../../../core/style-lens-os/types';
+import { resolveMotionTier, tierAllows } from '../../../core/motion/surfaceMotionTiers';
+import { useAnimationTier } from '../../../hooks/useAnimationTier';
+import { useLensViewport } from '../viewport/useLensViewport';
+
+export type CrystallizePhase = 'idle' | 'charging' | 'settling';
+export type CrystallizeVariant = 'static' | 'fade' | 'sweep';
+
+/** The appearance-settings surface. UNLICENSED today → resolveMotionTier fails safe to M0 (static)
+ *  until Lane A registers it (integration note §2.8 step 1). */
+export const CRYSTALLIZE_SURFACE_ID = 'settings.appearance';
+
+/** Design-spec choreography — viewport-keyed. NOT a token file (§2.9). settle = total − charge. */
+export const CRYSTALLIZE_TIMING = {
+  hand: { charge: 100, total: 320 },
+  lap: { charge: 110, total: 400 },
+  desk: { charge: 120, total: 480 },
+  wall: { charge: 120, total: 480 },
+} as const;
+
+export interface CrystallizeOverlayProps {
+  phase: CrystallizePhase;
+  variant: CrystallizeVariant;
+  chargeMs: number;
+  settleMs: number;
+  announcement: string;
+}
+export interface CrystallizeController {
+  phase: CrystallizePhase;
+  reduced: boolean;
+  variant: CrystallizeVariant;
+  overlayProps: CrystallizeOverlayProps;
+  crystallizeTo(commit: () => void, opts?: { settleAnnouncement?: string }): void;
+}
+
+/** Fail-closed PRM read: matchMedia absent OR throwing → treated as reduce:true (motion fails closed). */
+function usePrefersReducedMotionFailClosed(): boolean {
+  const read = (): boolean => {
+    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
+    try {
+      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
+    } catch {
+      return true;
+    }
+  };
+  const [reduced, setReduced] = useState<boolean>(read);
+  useEffect(() => {
+    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
+    let mql: MediaQueryList;
+    try {
+      mql = window.matchMedia('(prefers-reduced-motion: reduce)');
+    } catch {
+      setReduced(true);
+      return;
+    }
+    const onChange = () => setReduced(read());
+    onChange();
+    mql.addEventListener('change', onChange);
+    return () => mql.removeEventListener('change', onChange);
+  }, []);
+  return reduced;
+}
+
+export function useCrystallizeTransition(options?: {
+  motionMode?: AppearanceProfile['motionMode'];
+  surfaceId?: string;
+}): CrystallizeController {
+  const motionMode = options?.motionMode ?? 'auto';
+  const surfaceId = options?.surfaceId ?? CRYSTALLIZE_SURFACE_ID;
+  const capability = useAnimationTier();
+  const viewport = useLensViewport();
+  const prm = usePrefersReducedMotionFailClosed();
+
+  const reduced = motionMode !== 'auto' || capability === 'essential' || prm;
+  const effectiveTier = resolveMotionTier(surfaceId, capability);
+  const variant: CrystallizeVariant =
+    reduced || !tierAllows(effectiveTier, 'M1')
+      ? 'static'
+      : viewport === 'hand' || !tierAllows(effectiveTier, 'M2')
+        ? 'fade'
+        : 'sweep';
+  const timing = CRYSTALLIZE_TIMING[viewport];
+
+  const [overlay, setOverlay] = useState<CrystallizeOverlayProps>({
+    phase: 'idle',
+    variant,
+    chargeMs: timing.charge,
+    settleMs: timing.total - timing.charge,
+    announcement: '',
+  });
+
+  const latest = useRef({ variant, timing });
+  latest.current = { variant, timing };
+  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
+  const pending = useRef<{ commit: () => void; done: boolean } | null>(null);
+  const mounted = useRef(true);
+
+  // Memoized (only touch stable refs + setState) so crystallizeTo's dep array is honest + stable.
+  const clearTimers = useCallback(() => {
+    timers.current.forEach(clearTimeout);
+    timers.current = [];
+  }, []);
+  const runPending = useCallback(() => {
+    const p = pending.current;
+    if (p && !p.done) {
+      p.done = true;
+      p.commit();
+    }
+  }, []);
+  const clearHtmlAttrs = useCallback(() => {
+    if (typeof document === 'undefined') return;
+    const el = document.documentElement;
+    el.removeAttribute('data-lens-transition');
+    el.removeAttribute('data-lens-transition-variant');
+    el.style.removeProperty('--lens-crystallize-charge-ms');
+    el.style.removeProperty('--lens-crystallize-settle-ms');
+  }, []);
+  const forceIdle = useCallback(() => {
+    clearTimers();
+    clearHtmlAttrs();
+    if (mounted.current) setOverlay((o) => ({ ...o, phase: 'idle' }));
+  }, [clearTimers, clearHtmlAttrs]);
+
+  useEffect(
+    () => () => {
+      mounted.current = false;
+      clearTimers();
+      runPending(); // no half-applied lens on unmount
+      clearHtmlAttrs();
+    },
+    [clearTimers, runPending, clearHtmlAttrs],
+  );
+
+  const crystallizeTo = useCallback((commit: () => void, opts?: { settleAnnouncement?: string }) => {
+    const { variant: v, timing: t } = latest.current;
+    const chargeMs = t.charge;
+    const settleMs = t.total - t.charge;
+    const announcement = opts?.settleAnnouncement ?? '';
+
+    // Complete any in-flight transition synchronously first — no commit dropped or doubled.
+    if (pending.current && !pending.current.done) {
+      clearTimers();
+      runPending();
+      clearHtmlAttrs();
+    }
+    pending.current = { commit, done: false };
+
+    if (v === 'static') {
+      setOverlay({ phase: 'idle', variant: 'static', chargeMs, settleMs, announcement });
+      runPending(); // synchronous commit — Lane A's Apply try/catch owns any throw
+      clearHtmlAttrs();
+      return;
+    }
+
+    if (typeof document !== 'undefined') {
+      const el = document.documentElement;
+      el.setAttribute('data-lens-transition', 'charging');
+      el.setAttribute('data-lens-transition-variant', v);
+      el.style.setProperty('--lens-crystallize-charge-ms', `${chargeMs}ms`);
+      el.style.setProperty('--lens-crystallize-settle-ms', `${settleMs}ms`);
+    }
+    setOverlay({ phase: 'charging', variant: v, chargeMs, settleMs, announcement });
+
+    const chargeTimer = setTimeout(() => {
+      try {
+        runPending(); // attribute swap masked mid-transition
+        if (typeof document !== 'undefined') document.documentElement.setAttribute('data-lens-transition', 'settling');
+        if (mounted.current) setOverlay((o) => ({ ...o, phase: 'settling' }));
+      } catch (error) {
+        // Async charge-timer: a thrown commit CANNOT reach Lane A's synchronous Apply try/catch
+        // (it already returned), so rethrowing would be an uncatchable async error that also aborts
+        // the idle state flush. Fail safe instead — force idle (the app stays on the prior lens,
+        // since the swap failed) and surface for observability. The STATIC path still throws
+        // synchronously out of crystallizeTo, where Lane A's catch owns the Slice-1 fallback.
+        // [Deviation from Kimi §2.2 "rethrow": the async path makes the rethrow unreachable.]
+        forceIdle(); // commit already ran once (or threw once) via the done guard; never re-run
+        // eslint-disable-next-line no-console
+        console.error('[SwanLens] Crystallize commit failed mid-transition; restored prior appearance.', error);
+      }
+    }, chargeMs);
+
+    const settleTimer = setTimeout(forceIdle, t.total);
+    timers.current = [chargeTimer, settleTimer];
+  }, [clearTimers, runPending, clearHtmlAttrs, forceIdle]);
+
+  return { phase: overlay.phase, reduced, variant, overlayProps: overlay, crystallizeTo };
+}
diff --git a/frontend/src/adapters/style-lens-swan/styles/activeLensStyles.tsx b/frontend/src/adapters/style-lens-swan/styles/activeLensStyles.tsx
new file mode 100644
index 000000000..8d96bb63d
--- /dev/null
+++ b/frontend/src/adapters/style-lens-swan/styles/activeLensStyles.tsx
@@ -0,0 +1,122 @@
+/**
+ * Swan Lens — active-only style injection (S1-C / KIMI-SWAN-LENS-S1C §4 + §6).
+ *
+ * Renders always-present CORE + only the lens style component(s) for the `data-style-lens` ids
+ * actually present in the document (committed on <html> + any live ScopedLensFrame previews —
+ * the subtree UNION, §4). Replaces the ~28-lens monolith: at most `1 core + N present-lens`
+ * styles are ever in the DOM (N=1 in the common case, ≤2 with a preview open).
+ *
+ * Cascade order (§3, load-bearing): lens component(s) render FIRST, core LAST, inside a fragment
+ * keyed by the resolved id-set — so on any change the pair remounts and styled-components inserts
+ * lens-before-core in the sheet, preserving the monolith's density-over-lens outcome at equal
+ * specificity. `:where(:root)` core defaults are zero-specificity and lose to every lens block.
+ *
+ * Note: this file is `.tsx` (not the blueprint's `.ts`) because it renders JSX — the shell import
+ * (`./styles/activeLensStyles`) resolves either extension, so no consumer changes.
+ */
+import { Fragment, type ComponentType, type ReactElement } from 'react';
+import { useSyncExternalStore } from 'react';
+import { LENS_STYLE_ALLOWLIST } from './lenses';
+import { LensCoreGlobalStyles } from './lensCoreStyles';
+
+const hasOwn = (obj: object, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);
+
+/**
+ * Pure selection: from the ids present in the DOM, keep only those with a style component
+ * (active-only; unknown ids dropped → they render core-only). Order preserved from input.
+ * `hasOwn` (not `in`) so an id like "toString"/"constructor" can never resolve a prototype key.
+ */
+export function selectActiveLensIds(presentIds: readonly string[]): string[] {
+  return presentIds.filter((id) => hasOwn(LENS_STYLE_ALLOWLIST, id));
+}
+
+/**
+ * Cascade-order lock (§3): lens component(s) FIRST, core LAST. styled-components inserts in tree
+ * order, so lens sheets precede core → the monolith's density-over-lens outcome is preserved at
+ * equal specificity. The unit test asserts core is the final element; the pixel-level computed
+ * cascade is verified by the deferred Playwright pass (Kimi §11.4).
+ */
+export function orderedLensStyleComponents(knownIds: readonly string[]): ComponentType[] {
+  return [...knownIds.map((id) => LENS_STYLE_ALLOWLIST[id]), LensCoreGlobalStyles];
+}
+
+// Module-level cache so getSnapshot returns a referentially-stable string between mutations
+// (a fresh string every call would loop useSyncExternalStore).
+let cachedSnapshot = '';
+
+function computeSnapshot(): string {
+  if (typeof document === 'undefined') return '';
+  const ids = Array.from(document.querySelectorAll('[data-style-lens]'))
+    .map((el) => el.getAttribute('data-style-lens'))
+    .filter((v): v is string => Boolean(v));
+  const next = Array.from(new Set(ids)).sort().join('\n');
+  if (next !== cachedSnapshot) cachedSnapshot = next;
+  return cachedSnapshot;
+}
+
+// Only notify when a data-style-lens attribute changed OR a node carrying/containing one was
+// added/removed — so the whole-document observer doesn't wake React on every unrelated DOM mutation.
+function recordsAreRelevant(records: MutationRecord[]): boolean {
+  return records.some((record) => {
+    if (record.type === 'attributes') return true; // attributeFilter already scopes to data-style-lens
+    const touchesLens = (nodes: NodeList): boolean =>
+      Array.from(nodes).some(
+        (node) =>
+          node instanceof Element &&
+          (node.matches('[data-style-lens]') || node.querySelector('[data-style-lens]') !== null),
+      );
+    return touchesLens(record.addedNodes) || touchesLens(record.removedNodes);
+  });
+}
+
+function subscribe(onChange: () => void): () => void {
+  if (typeof document === 'undefined') return () => undefined;
+  const observer = new MutationObserver((records) => {
+    if (recordsAreRelevant(records)) onChange();
+  });
+  observer.observe(document.documentElement, {
+    attributes: true,
+    attributeFilter: ['data-style-lens'],
+    childList: true,
+    subtree: true,
+  });
+  return () => observer.disconnect();
+}
+
+/** Dedup'd, sorted list of every `data-style-lens` id present in the document. */
+export function useStyleLensIds(): readonly string[] {
+  const snapshot = useSyncExternalStore(subscribe, computeSnapshot, () => '');
+  return snapshot ? snapshot.split('\n') : [];
+}
+
+const warnedIds = new Set<string>();
+function warnOncePerUnknownId(ids: readonly string[], known: readonly string[]): void {
+  if (typeof console === 'undefined') return;
+  for (const id of ids) {
+    if (!known.includes(id) && !warnedIds.has(id)) {
+      warnedIds.add(id);
+      // eslint-disable-next-line no-console
+      console.warn(`[SwanLens] unknown style-lens id "${id}" — rendering core-only.`);
+    }
+  }
+}
+
+/** Test-only: reset the warn-once memo so per-test assertions are deterministic. */
+export function __resetUnknownIdWarnings(): void {
+  warnedIds.clear();
+}
+
+export function ActiveLensGlobalStyles(): ReactElement {
+  const ids = useStyleLensIds();
+  const known = selectActiveLensIds(ids);
+  if (process.env.NODE_ENV !== 'production') warnOncePerUnknownId(ids, known);
+  return (
+    <Fragment key={known.length ? known.join('|') : 'core-only'}>
+      {known.map((id) => {
+        const LensStyles = LENS_STYLE_ALLOWLIST[id];
+        return <LensStyles key={id} />;
+      })}
+      <LensCoreGlobalStyles />
+    </Fragment>
+  );
+}
diff --git a/frontend/src/adapters/style-lens-swan/styles/lensSurfaceStyles.ts b/frontend/src/adapters/style-lens-swan/styles/lensSurfaceStyles.ts
new file mode 100644
index 000000000..da73bf14f
--- /dev/null
+++ b/frontend/src/adapters/style-lens-swan/styles/lensSurfaceStyles.ts
@@ -0,0 +1,70 @@
+/**
+ * Slice 3 / C6 — lens-shell focus, selection, elevation, z (KIMI-SWAN-LENS-SLICE3 §2). ADDITIVE.
+ * S1-C core untouched; Lane-A files untouched.
+ *
+ * MOUNT: `lensSurfaceCss` is composed by the SAME mount that composes Slice-2's viewport styles
+ * (one additive import line — the only prior-slice touch this slice needs). Fallback:
+ * <LensSurfaceGlobalStyles /> once at the lens-shell root.
+ *
+ * FOCUS/SELECTION RECONCILIATION — decision: SCOPE, not supersede. Every rule applies ONLY under
+ * [data-style-lens-shell]. These existing app-wide rules are RETAINED and keep ownership OUTSIDE
+ * the shell (not edited, not overridden there): styles/CosmicEleganceGlobalStyle.ts,
+ * styles/ImprovedGlobalStyle.ts, styles/dashboard-global-styles.css, styles/responsive-fixes.css.
+ * Inside the shell, C6 wins by specificity — `[data-style-lens-shell] …:focus-visible` is (0,2,0)
+ * vs their bare `:focus-visible` (0,1,0), order-independent, no !important. forced-colors is
+ * harmonized by SAME VALUE with the shipped S1-C rule (both `2px solid Highlight`) so declarations
+ * cannot conflict regardless of order.
+ *
+ * TOKENS: emits ZERO --world-* declarations (Rule 67 — new world names are Lane A's). READS the
+ * shipped --world-accent + theme var --bg-base only. var() fallbacks below mirror S1-A §B shipped
+ * values verbatim; retired trio absent (tested).
+ *
+ * ELEVATION: additive --lens-elev-* family, Swan-fixed this slice; elev-3 = the shipped S1-A shadow
+ * base verbatim. Consumption is OPT-IN (.lens-elev-* utilities or box-shadow: var(--lens-elev-<n>)).
+ * Z: additive --lens-z-* interim family (token form of Slice-2's CRYSTALLIZE_OVERLAY_Z pattern);
+ * consumers apply `var(--lens-z-<step>)` as their stacking value (bare z literals stay banned).
+ * Promotion of the family to --world-z-* is PROPOSED, not emitted (Deferred §8.2).
+ */
+import { createGlobalStyle } from 'styled-components';
+
+export const lensSurfaceCss = `
+[data-style-lens-shell] {
+  --lens-elev-0: none;
+  --lens-elev-1: 0 2px 6px rgba(10, 10, 15, 0.45);
+  --lens-elev-2: 0 4px 12px rgba(10, 10, 15, 0.5);
+  --lens-elev-3: 0 8px 24px rgba(10, 10, 15, 0.55);
+  --lens-elev-4: 0 16px 48px rgba(10, 10, 15, 0.6);
+  --lens-z-base: 0;
+  --lens-z-raised: 100;
+  --lens-z-sticky: 200;
+  --lens-z-overlay: 300;
+  --lens-z-modal: 400;
+  --lens-z-toast: 500;
+}
+
+[data-style-lens-shell] :where(a, button, [role='button'], input, select, textarea, [tabindex]):focus-visible {
+  outline: 2px solid var(--world-accent, #60c0f0);
+  outline-offset: 2px;
+}
+
+[data-style-lens-shell]::selection,
+[data-style-lens-shell] ::selection {
+  background-color: var(--world-accent, #60c0f0);
+  color: var(--bg-base, #0a0a0f);
+}
+
+@media (forced-colors: active) {
+  [data-style-lens-shell] :where(a, button, [role='button'], input, select, textarea, [tabindex]):focus-visible {
+    outline: 2px solid Highlight;
+    outline-offset: 2px;
+  }
+}
+
+[data-style-lens-shell] .lens-elev-1 { box-shadow: var(--lens-elev-1); }
+[data-style-lens-shell] .lens-elev-2 { box-shadow: var(--lens-elev-2); }
+[data-style-lens-shell] .lens-elev-3 { box-shadow: var(--lens-elev-3); }
+[data-style-lens-shell] .lens-elev-4 { box-shadow: var(--lens-elev-4); }
+`;
+
+/** Fallback mount only. Primary mount = the Slice-2 style composition (one additive line). */
+export const LensSurfaceGlobalStyles = createGlobalStyle`${lensSurfaceCss}`;
diff --git a/frontend/src/adapters/style-lens-swan/styles/lensViewportStyles.ts b/frontend/src/adapters/style-lens-swan/styles/lensViewportStyles.ts
new file mode 100644
index 000000000..9fb23ddcc
--- /dev/null
+++ b/frontend/src/adapters/style-lens-swan/styles/lensViewportStyles.ts
@@ -0,0 +1,95 @@
+/**
+ * lensViewportStyles — Swan Lens C5 responsive matrix + density + a11y CSS (Slice 2 / §2.5).
+ *
+ * Exported as a plain STRING (test-regex-able; mounted by S1-C's injector or the current
+ * global-styles mount — Lane-A integration note §2.9 step 3). Keys entirely off `[data-viewport]`
+ * (written by useLensViewport) and `[data-density]` (Lane-A-written). Additive geo token
+ * `--lens-geo-edge-pad` (Do-NOT #3 compliant). No `--world-*`, no `!important`, no retired palette.
+ * Transform/opacity only in animated contexts; 44px floor via max() (never scaled below).
+ */
+export const lensViewportCss = `
+  /* DENSITY — attribute-driven; data-density stays Lane-A-written */
+  :root { --lens-density-scale: 1; }
+  :root[data-density='compact']  { --lens-density-scale: 0.875; }
+  :root[data-density='cozy']     { --lens-density-scale: 1; }
+  :root[data-density='spacious'] { --lens-density-scale: 1.125; }
+  :root[data-viewport='wall']:not([data-density]) { --lens-density-scale: 1.125; }
+
+  /* TARGET FLOOR — opt-in .lens-target; compact can never scale below the validated 44px */
+  .lens-target {
+    min-block-size: max(var(--lens-geo-target-min, 44px), calc(var(--lens-geo-target-min, 44px) * var(--lens-density-scale, 1)));
+    min-inline-size: max(var(--lens-geo-target-min, 44px), calc(var(--lens-geo-target-min, 44px) * var(--lens-density-scale, 1)));
+  }
+
+  /* VIEWPORT MATRIX — values verbatim from the responsive matrix */
+  :root[data-viewport='hand'] {
+    --lens-geo-blur-sm: 0; --lens-geo-blur-md: 4px; --lens-geo-blur-lg: 8px;
+    --lens-fx-surface-alpha: 0.92; --lens-fx-noise-opacity: 0;
+    --lens-fx-glow-strength: 0.75; --lens-geo-edge-pad: 16px;
+  }
+  :root[data-viewport='lap'] {
+    --lens-geo-blur-sm: 4px; --lens-geo-blur-md: 8px; --lens-geo-blur-lg: 16px;
+    --lens-fx-surface-alpha: 0.8; --lens-fx-noise-opacity: 0.02;
+    --lens-fx-glow-strength: 0.9; --lens-geo-edge-pad: 24px;
+  }
+  :root[data-viewport='desk'] {
+    --lens-geo-blur-sm: 4px; --lens-geo-blur-md: 12px; --lens-geo-blur-lg: 24px;
+    --lens-fx-surface-alpha: 0.72; --lens-fx-noise-opacity: 0.04;
+    --lens-fx-glow-strength: 1; --lens-geo-edge-pad: 32px;
+  }
+  :root[data-viewport='wall'] {
+    --lens-geo-blur-sm: 6px; --lens-geo-blur-md: 16px; --lens-geo-blur-lg: 32px;
+    --lens-fx-surface-alpha: 0.72; --lens-fx-noise-opacity: 0.04;
+    --lens-fx-glow-strength: 1.15; --lens-geo-edge-pad: 48px;
+  }
+  [data-viewport='wall'] .lens-content { max-width: 1600px; margin-inline: auto; }
+
+  /* DESKTOP HOVER — feedback tier; guarded by hover/pointer AND both existing motion switches */
+  @media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
+    :root:not([data-motion='off']) .lens-card {
+      transition: transform 180ms var(--lens-ease-standard, cubic-bezier(0.2,0,0,1)),
+                  box-shadow 180ms var(--lens-ease-standard, cubic-bezier(0.2,0,0,1));
+    }
+    :root:not([data-motion='off']) .lens-card:hover {
+      transform: translateY(var(--lens-fx-hover-lift, -1px));
+      box-shadow: var(--lens-fx-glow-primary);
+    }
+  }
+
+  /* ROOT SCALE — sweep variant, desk/lap only; drives off the transition attributes on <html> */
+  @media (prefers-reduced-motion: no-preference) {
+    :root:not([data-motion='off'])[data-lens-transition-variant='sweep'][data-lens-transition='charging']
+      :where([data-viewport='desk'], [data-viewport='lap']) #root {
+      transform: scale(0.995);
+      transition: transform var(--lens-crystallize-charge-ms, 120ms) var(--lens-ease-crystallize, cubic-bezier(0.16,1,0.3,1));
+    }
+    :root:not([data-motion='off'])[data-lens-transition-variant='sweep'][data-lens-transition='settling']
+      :where([data-viewport='desk'], [data-viewport='lap']) #root {
+      transform: scale(1);
+      transition: transform var(--lens-crystallize-settle-ms, 360ms) var(--lens-ease-crystallize, cubic-bezier(0.16,1,0.3,1));
+    }
+  }
+
+  /* FRAME-SCOPED MOTION KILL-SWITCH — ScopedLensFrame's own 'full'|'reduced'|'off' vocabulary */
+  [data-motion-mode='off'] :where(.lens-card, .lens-animatable) { transition: none; animation: none; }
+  [data-motion-mode='reduced'] :where(.lens-animatable) { animation: none; }
+
+  /* A11Y MEDIA BLOCKS — real media queries */
+  @media (prefers-reduced-transparency: reduce) {
+    :root {
+      --lens-fx-surface-alpha: 1; --lens-fx-noise-opacity: 0;
+      --lens-geo-blur-sm: 0; --lens-geo-blur-md: 0; --lens-geo-blur-lg: 0;
+    }
+  }
+  @media (forced-colors: active) {
+    :root {
+      --lens-fx-glow-primary: none; --lens-fx-glow-secondary: none; --lens-fx-atmosphere: none;
+      --lens-fx-noise-opacity: 0; --lens-geo-blur-sm: 0; --lens-geo-blur-md: 0; --lens-geo-blur-lg: 0;
+      --lens-fx-surface-alpha: 1;
+    }
+    :where(.lens-card, .lens-surface) { border: 1px solid CanvasText; box-shadow: none; background-image: none; }
+    :where(a, button, [role='button'], input, select, textarea, [tabindex]):focus-visible {
+      outline: 2px solid Highlight; outline-offset: 2px;
+    }
+  }
+`;
diff --git a/frontend/src/adapters/style-lens-swan/styles/lenses/index.ts b/frontend/src/adapters/style-lens-swan/styles/lenses/index.ts
new file mode 100644
index 000000000..28532c059
--- /dev/null
+++ b/frontend/src/adapters/style-lens-swan/styles/lenses/index.ts
@@ -0,0 +1,65 @@
+/**
+ * Swan Lens — static per-lens style allowlist (S1-C / KIMI-SWAN-LENS-S1C §5).
+ * lensId -> its createGlobalStyle component. Static imports only (no import()/fetch). The key-set
+ * MUST equal the monolith's [data-style-lens] block set AND the manifest id set (asserted at init).
+ */
+import type { ComponentType } from 'react';
+import { AnalogFlightRecorderLensStyles } from './analog-flight-recorder';
+import { AuroraConsoleLensStyles } from './aurora-console';
+import { AuroraIndexLensStyles } from './aurora-index';
+import { BlueprintFoldLensStyles } from './blueprint-fold';
+import { CandyGlassArcadeLensStyles } from './candy-glass-arcade';
+import { CarbonAtelierLensStyles } from './carbon-atelier';
+import { CedarWorkshopLensStyles } from './cedar-workshop';
+import { ChronographBoardLensStyles } from './chronograph-board';
+import { CoachLedgerLensStyles } from './coach-ledger';
+import { CrystallineCathedralLensStyles } from './crystalline-cathedral';
+import { GlassRailLensStyles } from './glass-rail';
+import { KineticKanbanLensStyles } from './kinetic-kanban';
+import { KintsugiCircuitLensStyles } from './kintsugi-circuit';
+import { LunarStackLensStyles } from './lunar-stack';
+import { MeridianMagazineLensStyles } from './meridian-magazine';
+import { ModularHarborLensStyles } from './modular-harbor';
+import { MonasticGridLensStyles } from './monastic-grid';
+import { OrbitAtlasLensStyles } from './orbit-atlas';
+import { PrismTerminalLensStyles } from './prism-terminal';
+import { QuietMeridianLensStyles } from './quiet-meridian';
+import { RecoveryCloisterLensStyles } from './recovery-cloister';
+import { SignalGardenLensStyles } from './signal-garden';
+import { SplitHorizonLensStyles } from './split-horizon';
+import { SwanFlagshipLensStyles } from './swan-flagship';
+import { TempoForgeLensStyles } from './tempo-forge';
+import { TerrainConsoleLensStyles } from './terrain-console';
+import { TidalColumnsLensStyles } from './tidal-columns';
+
+export type LensStyleComponent = ComponentType;
+
+export const LENS_STYLE_ALLOWLIST: Readonly<Record<string, LensStyleComponent>> = Object.freeze({
+  'analog-flight-recorder': AnalogFlightRecorderLensStyles,
+  'aurora-console': AuroraConsoleLensStyles,
+  'aurora-index': AuroraIndexLensStyles,
+  'blueprint-fold': BlueprintFoldLensStyles,
+  'candy-glass-arcade': CandyGlassArcadeLensStyles,
+  'carbon-atelier': CarbonAtelierLensStyles,
+  'cedar-workshop': CedarWorkshopLensStyles,
+  'chronograph-board': ChronographBoardLensStyles,
+  'coach-ledger': CoachLedgerLensStyles,
+  'crystalline-cathedral': CrystallineCathedralLensStyles,
+  'glass-rail': GlassRailLensStyles,
+  'kinetic-kanban': KineticKanbanLensStyles,
+  'kintsugi-circuit': KintsugiCircuitLensStyles,
+  'lunar-stack': LunarStackLensStyles,
+  'meridian-magazine': MeridianMagazineLensStyles,
+  'modular-harbor': ModularHarborLensStyles,
+  'monastic-grid': MonasticGridLensStyles,
+  'orbit-atlas': OrbitAtlasLensStyles,
+  'prism-terminal': PrismTerminalLensStyles,
+  'quiet-meridian': QuietMeridianLensStyles,
+  'recovery-cloister': RecoveryCloisterLensStyles,
+  'signal-garden': SignalGardenLensStyles,
+  'split-horizon': SplitHorizonLensStyles,
+  'swan-flagship': SwanFlagshipLensStyles,
+  'tempo-forge': TempoForgeLensStyles,
+  'terrain-console': TerrainConsoleLensStyles,
+  'tidal-columns': TidalColumnsLensStyles,
+});
diff --git a/frontend/src/adapters/style-lens-swan/viewport/useLensViewport.ts b/frontend/src/adapters/style-lens-swan/viewport/useLensViewport.ts
new file mode 100644
index 000000000..ef9111df5
--- /dev/null
+++ b/frontend/src/adapters/style-lens-swan/viewport/useLensViewport.ts
@@ -0,0 +1,83 @@
+/**
+ * useLensViewport — Swan Lens C5 responsive viewport signal (Slice 2 / KIMI-SWAN-LENS-SLICE2 §2.5).
+ *
+ * Net-new (no existing viewport hook duplicated). Classifies the window into hand/lap/desk/wall,
+ * writes `data-viewport` on <html>, and re-evaluates on resize (debounced 150ms). All matrix CSS
+ * (lensViewportStyles.ts) keys off `[data-viewport]`, so this hook is the single source of truth
+ * and the media queries live only in LENS_VIEWPORT_QUERIES.
+ *
+ * Fail-safe: no `matchMedia` (SSR) OR a throwing `matchMedia` → `'lap'`, silently (motion/layout
+ * never crash on a viewport read). Writes only `data-viewport` — `data-layout-profile` stays
+ * Lane-A's Apply-owned attribute (use `layoutProfileForViewport` as a pure helper).
+ */
+import { useEffect, useState } from 'react';
+
+export type LensViewport = 'hand' | 'lap' | 'desk' | 'wall';
+export type LayoutProfile = 'stack' | 'rail' | 'console' | 'panorama';
+
+export const LENS_VIEWPORT_QUERIES: Readonly<Record<LensViewport, string>> = {
+  hand: '(max-width: 767px)',
+  lap: '(min-width: 768px) and (max-width: 1023px)',
+  desk: '(min-width: 1024px) and (max-width: 1919px)',
+  wall: '(min-width: 1920px)',
+};
+
+/** matchMedia absent OR throwing → this. */
+export const LENS_VIEWPORT_FALLBACK: LensViewport = 'lap';
+
+const ORDER: readonly LensViewport[] = ['hand', 'lap', 'desk', 'wall'];
+
+const PROFILE_BY_VIEWPORT: Readonly<Record<LensViewport, LayoutProfile>> = {
+  hand: 'stack',
+  lap: 'rail',
+  desk: 'console',
+  wall: 'panorama',
+};
+
+/** Pure mapping for Lane A to derive `data-layout-profile` when the profile layout is 'auto'. */
+export function layoutProfileForViewport(viewport: LensViewport): LayoutProfile {
+  return PROFILE_BY_VIEWPORT[viewport];
+}
+
+/** Evaluate the current viewport; fail-safe to 'lap' on any read failure or missing matchMedia. */
+export function evaluateViewport(): LensViewport {
+  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
+    return LENS_VIEWPORT_FALLBACK;
+  }
+  try {
+    for (const vp of ORDER) {
+      if (window.matchMedia(LENS_VIEWPORT_QUERIES[vp]).matches) return vp;
+    }
+    return LENS_VIEWPORT_FALLBACK;
+  } catch {
+    return LENS_VIEWPORT_FALLBACK;
+  }
+}
+
+export function useLensViewport(): LensViewport {
+  const [viewport, setViewport] = useState<LensViewport>(evaluateViewport);
+
+  useEffect(() => {
+    const apply = () => {
+      const next = evaluateViewport();
+      setViewport(next);
+      if (typeof document !== 'undefined') {
+        document.documentElement.setAttribute('data-viewport', next);
+      }
+    };
+    apply(); // immediate on mount
+
+    let timer: ReturnType<typeof setTimeout> | undefined;
+    const onResize = () => {
+      if (timer) clearTimeout(timer);
+      timer = setTimeout(apply, 150); // debounce
+    };
+    window.addEventListener('resize', onResize);
+    return () => {
+      if (timer) clearTimeout(timer);
+      window.removeEventListener('resize', onResize);
+    };
+  }, []);
+
+  return viewport;
+}
