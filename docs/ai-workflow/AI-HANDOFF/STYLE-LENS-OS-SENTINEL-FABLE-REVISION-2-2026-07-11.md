# Style Lens OS — Sentinel Fable Revision 2

Date: 2026-07-11
Evidence commit: `abbf1503a` (`feat(appearance): add Swan Style Lens sentinels`)
Decision requested: `APPROVE` or `REVISE` for starting lenses 6–25.
Rollback: `git revert abbf1503a` (no migration, database, API, or server state is involved).

This is a precision amendment to Revision 1. Architecture, measured sentinel ratios, the bounded 25+25 IA, and the prior locked rules remain unchanged unless explicitly tightened here.

## 1. Exact Playwright evidence

Command:

`npx playwright test e2e/style-lens-sentinel-visual.spec.ts --project='Desktop Chrome' --workers=1 --retries=0 --reporter=list`

Actual result: **2 test blocks passed in 10.2 seconds**, retries disabled.

### Block 1 — 6.3 seconds

`five sentinels preview, apply, and remain overflow-free`

This block deliberately shares one authenticated, locally mocked dashboard mount so it can test appearance changes without repeating application startup five times. It performs:

- proof that the lazy `AppearanceStudioPanel` request count is 0 before opening and exactly 1 after opening;
- five sentinel selections and five axe scans;
- axe-core **4.12.1**, with **zero violations at every severity** (not merely zero serious/critical);
- mobile selection and dialog bounds at 414×896;
- overflow and 44px control measurements at 320, 375, 414, 768, 1024, 1440, 2560, 3440, and 3840 CSS pixels;
- deterministic screenshots at 320, 414, 1440, and 3840;
- explicit Apply, root attribute verification, zero non-GET `/api/` calls, and zero browser/page errors;
- measured Apply duration (121 ms on the final run) and CLS (0.0059).

### Block 2 — 3.0 seconds

`every sentinel preserves a static reduced-motion fallback`

This block emulates `prefers-reduced-motion: reduce`, then opens, selects, and commits all five sentinels. Each iteration verifies the committed root lens, `data-motion-mode=reduced`, and computed animation/transition durations at or below 0.01.

The test source is pinned by `abbf1503a`; the list reporter output and screenshots were generated from that implementation. The short runtime comes from local API fulfillment and one shared mount, not skipped assertions.

## 2. Color picker migration and single-writer state

Migration is executed, not planned:

- `UniversalThemeToggle.tsx` no longer imports or mounts `ThemePickerPanel`.
- It lazy-mounts `AppearanceStudioPanel` as the only header appearance dialog.
- The Studio Color tab changes only `draftTheme` during preview.
- `setTheme(draftTheme)` runs only after `commitPreview()` succeeds in the Apply path.
- Cancel never calls `setTheme`.
- `UniversalThemeToggle.panel.tsx` remains only as a metadata helper source (`buildFeaturedIds`); it is not rendered and owns no persistence effect.
- The only production color persistence owner remains `UniversalThemeContext` with key `swanstudios-theme`.
- The structural persistence owner uses `style-lens-os:appearance-profile`; it does not write `swanstudios-theme`.

Therefore there is no mounted second color writer and no dual-write race.

## 3. Named admin view-as evidence

The following committed tests cover both required directions:

- `appearancePersistence.test.ts` — `suppresses writes during view-as mode`
- `appearancePersistence.test.ts` — `suppresses external application while view-as is active`
- `StyleLensIntegration.contract.test.ts` — `suppresses persistence during administrator view-as sessions`
- `StyleLensProvider.test.tsx` — `does not persist commits while suppression is active`

The persistence helper checks suppression before `localStorage.setItem`; the storage-event reader returns before parsing/applying external state while suppression is active.

## 4. Contrast computation and Gilded Fern

The tests use the WCAG 2 relative-luminance method directly:

1. Parse each sRGB channel to 0–1.
2. Linearize with `v / 12.92` when `v <= 0.04045`; otherwise `((v + 0.055) / 1.055) ** 2.4`.
3. Luminance = `0.2126R + 0.7152G + 0.0722B`.
4. Ratio = `(Llighter + 0.05) / (Ldarker + 0.05)`.

The test recomputes each declared receipt and fails below 4.5.

| Gilded Fern use | Background | Ratio | Semantic use |
|---|---|---:|---|
| Kintsugi Circuit seam/line | Royal Depth `#003080` | 5.25:1 | decorative CSS background/border; no gold text node |
| Analog Flight Recorder status edge | Carbon `#141419` | 7.96:1 | decorative CSS background/border; no gold text node |
| Shared darkest fallback | Obsidian `#0a0a0f` | 8.56:1 | decorative-safe fallback |

The synthetic signal using the accent is `aria-hidden=true`; CSS-only seams and borders create no accessibility node. If a future lens promotes gold to text, it must add a separate text-pair receipt and pass 4.5.

## 5. Full color × sentinel matrix

The current registry contains **38 color themes**, not 18. The contract validates all **38 × 5 = 190** color/lens combinations.

It also computes primary-text/background contrast for every registered color theme:

- minimum registered pair: `deep-ocean` at **12.17:1**;
- explicit light-theme pair: `crystalline-light` at **15.38:1**;
- combinations below 4.5: **0**.

Structural lenses inherit the selected palette, so the same verified primary pair applies to each of the five structural variants. Sentinel-specific dark/composite surfaces retain their separate receipt table from Revision 1.

## 6. Lazy split and immutable evidence chain

The raw main-chunk reduction (15.03 kB) is not expected to equal the isolated Studio chunk (17.30 kB): dynamic-import wrappers, shared-module placement, minifier graph changes, and subsequent focus/accessibility code change both sides of that comparison. The invariant that matters is now browser-tested:

- before opening Appearance Studio: 0 requests containing `AppearanceStudioPanel`;
- after opening: exactly 1 request;
- the chunk is not eagerly fetched on dashboard route mount.

Final production build: 6,665 modules transformed, exit 0. Full TypeScript exit 0. Targeted suite: 54/54 pass across 12 test files. Pre-commit secret scan: 42 staged files, 0 hits.

The four screenshot baselines and their producing test are pinned to `abbf1503a`. CI-hosted artifacts remain a pre-production ticket below; this checkpoint no longer calls local files CI evidence.

## 7. Tightened expansion and design-governance rules

Rule 11 now uses a minimum two-of-four differentiation test. A new lens must differ from every promoted sibling in at least two of:

1. navigation position/behavior;
2. content-density tier and information grouping;
3. primary grid/column topology;
4. shell chrome visibility/geometry.

It must also retain a unique layout signature plus allowlisted shell/navigation/recipe IDs. A Style Lens Review Board checkpoint consists of Design Brain doctrine review, automated receipt gates, mobile/desktop screenshots, and Fable sampling at sentinel 10, 15, 20, and 25.

Dual-Button Glow uses `box-shadow`. The Swan lens adapter does not apply `overflow:hidden` to semantic-action ancestors; the computed selector remains `[data-swan-button-tone]` inside the mounted shell. Any future container that clips a semantic action fails visual QA.

The Studio tablist now follows APG roving tabindex:

- selected tab has `tabIndex=0`; all siblings use `-1`;
- Arrow Left/Right/Up/Down wraps;
- Home/End moves to first/last;
- focus and selection move together;
- the behavior is locked by component tests.

Native View Transition snapshots can expose stale CSS custom-property paint in some engines. The runtime changes only root attributes inside the update callback, catches transition failure, and has a no-native-API fallback. Any old-paint flash found by the production browser checkpoint disables native View Transition while preserving immediate attribute application.

The zero-hit static scan is scoped to files introduced or modified by this checkpoint under Style Lens core, Swan adapter, and Appearance Studio—not the entire legacy repository.

Future commercial metadata is reserved as versioned manifest policy (`availability: included | entitlement-required`, optional `licenseScope`) but is not activated until a pricing/entitlement design is approved. Unknown commercial fields cannot bypass current promotion validation.

## 8. Owned roadmap and production gates

| ID | Owner | Must complete | Stop condition |
|---|---|---|---|
| `SL-PROD-01` | Frontend release owner | Safari iOS/macOS + Firefox smoke, including no-View-Transition path | before `main` / Render release |
| `SL-PROD-02` | Security review owner | localStorage profile injection/XSS review, admin-route auth receipt, lazy-chunk CSP review | before `main` / Render release |
| `SL-PROD-03` | CI/release owner | publish test logs and screenshot baselines as CI artifacts | before `main` / Render release |
| `SL-PROD-04` | Performance owner | 4× CPU mobile Apply measurement with median/p95 | before `main` / Render release |
| `SL-ROAD-01` | Product + frontend | account-level cross-device appearance sync decision | post-sentinel, before claiming account portability |

Development sequence after approval:

- lenses 6–10 + automated two-of-four receipt;
- Fable sample at 10;
- lenses 11–15, then sample;
- lenses 16–20, then sample;
- lenses 21–25, then final sample;
- build Lab Style and bounded Compare modes;
- complete all `SL-PROD-*` gates before any production push.

## Final decision

Return exactly one top-level verdict: `APPROVE` or `REVISE`. `APPROVE` opens development of lenses 6–25 under the rules above; it does not authorize `main`, Render, or production release. If revising, identify only an unmet checkpoint blocker with an executable acceptance criterion.
