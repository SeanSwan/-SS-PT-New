**[PLAN] File permissions, responsibilities and budgets**

Paths below are exhaustive permissions for their slices. Listed line budgets are implementation targets, always ≤300. Existing tests retain their assertions unless an explicit contract change requires an reviewed update.

| Slice | Files | Purpose, imports/exports and budget |
|---|---|---|
| S0 | `frontend/playwright.theme-lens.config.ts` | Dedicated preview/browser configuration; exports config; ≤140 |
| S0 | `B/network.fixture.ts` | Imports Playwright; exports isolated fixture blocking API/external traffic; ≤180 |
| S0 | `B/mount.spec.ts` | Imports fixture; actual header reachability; ≤180 |
| S0 | Package `evidence/source-manifest.json`, `evidence/results.md` | Owned paths/hashes, dependency versions, commands/results; each ≤300 |
| S1 | `L/themePreferenceSnapshot.ts` | Imports palette validation; exports snapshot/resolver contracts; ≤160 |
| S1 | `L/useSystemColorScheme.ts` | Imports React; exports independent OS observer; ≤110 |
| S1 | `L/useThemePreference.ts` | Imports resolver/writer/observer; exports preference owner; ≤260 |
| S1 | `L/themePersistence.ts` | Preserve keys/helpers; guarded reads and validation; ≤180 |
| S1 | `L/themeStorageWrites.ts` | Operation-specific writes/readback; compatibility wrappers; ≤180 |
| S1 | `L/useCrossTabThemeSync.ts` | Imports snapshot reader; reconciliation triggers/cleanup; ≤180 |
| S1 | `L/useUniversalTheme.ts` | Context type additions; preserve hook exports; ≤120 |
| S1 | `L/UniversalThemeContext.tsx` | Extract preference state/effects/actions; keep CSS/StyledProvider bridge and exports; ≤220 |
| S1 | `L/themePreferenceSnapshot.test.ts`, `L/themePreference.integration.test.tsx`, `L/themeStorageFailures.test.tsx` | Resolver, provider and failure behavior; each ≤260 |
| S1 | `L/themeCrossTab.test.tsx`, `L/themeSystemPreference.test.tsx`, `L/themeWritePath.test.tsx` | Strengthen existing regressions and realistic event area; each ≤300 |
| S1 | `B/persistence.spec.ts` | Two pages, reload, clear and foreground recovery; ≤260 |
| S2 | `frontend/index.html` | Existing script identification/location and critical paint consumer; ≤300 |
| S2 | `L/themePrePaint.test.ts`, `L/themeBootstrap.execution.test.ts` | Preserve map parity; execute real script; each ≤260 |
| S2 | `B/prepaint.spec.ts` | Withheld-assets and takeover checks; ≤220 |
| S3 | `L/ThemeLensButton.tsx`, `L/ThemeLensButton.styles.ts` | Tooltip lifecycle, glyph plate, unsaved status, bounded motion; each ≤280 |
| S3 | `L/useThemeLensTooltip.ts` | Extract tooltip visibility/dismissal lifecycle; ≤140 |
| S3 | `L/ThemeLensPopover.tsx`, `L/ThemeLensPopover.styles.ts` | Opaque panel, current line, status placement and focus; each ≤280 |
| S3 | `L/ThemeLensSwitch.styles.ts` | Focus and transform-only thumb motion; ≤120 |
| S3 | `L/useThemeGridNavigation.ts`, `L/UniversalThemeToggle.tsx` | Native Tab departure and single Escape handling; each ≤240 |
| S3 | `L/ThemeLensStatus.tsx`, `L/ThemeLensStatus.styles.ts` | Notice/retry presentation from context; each ≤140 |
| S3 | `L/ThemeLensPreview.tsx`, `L/ThemeLensPreview.styles.ts` | Static decorative wing only; each ≤160 |
| S3 | `L/themeContrastInstrument.ts`, `L/themeContrastSites.ts`, `L/themeContrastCoverage.test.ts`, `L/themeContrast.test.ts` | Extend existing apparatus with state/paint ownership; each ≤280 |
| S3 | `L/themeContrastState.test.ts`, `L/ThemeLensInteraction.test.tsx`, `L/ThemeLensTooltip.test.tsx` | Negative controls and real interaction chain; each ≤260 |
| S3 | `B/accessibility.spec.ts`, `B/layout.spec.ts`, `B/contrast.spec.ts` | Browser semantics, viewport matrix and rendered pairs; each ≤280 |
| S4 | `L/ThemeLensPreview.tsx` | Add optional lazy admission without changing static contract; ≤220 |
| S4 | `L/themeLensScene.ts`, `L/themeLensScenePolicy.ts` | Existing Three.js only; scene exports and eligibility; each ≤240 |
| S4 | `L/themeLensScenePolicy.test.ts`, `L/ThemeLensPreview.test.tsx` | Eligibility, cancellation and cleanup; each ≤240 |
| S4 | `B/motion.spec.ts` | Real lifecycle and performance observations; ≤280 |
| S4 | `frontend/scripts/measure-theme-lens-bundle.mjs` | Imports Node filesystem/zlib; baseline/candidate graph and gzip report; ≤220 |
| S4 | `frontend/src/vite-env.d.ts` | Add typed public flag declaration only if absent; ≤300 |

Patterns to preserve:

- Provider injection: `useLayoutEffect` → `injectThemeVariables`, `UniversalThemeContext.tsx:109–111`.
- Side effects outside React state updaters: `UniversalThemeContext.tsx:164–181`.
- Real writer test: `themeWritePath.test.tsx:48–60`.
- Named styled-components and local motion boundaries: existing button/popover files.
- Disposable rendering contract: `frontend/src/components/SwanMark3D/swanMarkScene.ts:85–86`.

No change to the 607-line `frontend/src/utils/theme/themeUtils.ts` is needed for the specified bootstrap repair. Its existing size is not silently certified by the lane-only Rule 4 check.

If a target approaches 300 lines, extract its named responsibility within the slice’s permitted files; do not delete evidence comments merely to manufacture headroom.
