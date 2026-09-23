**[PLAN] Test specifications below are named implementation deliverables, not claims that files or passing results already exist.** Existing commands are runnable in an authorized write-capable checkout. Future-file commands become runnable in their owning slice.

All commands run from `frontend/`.

**Baseline**

```powershell
node ./node_modules/vitest/vitest.mjs run src/context/ThemeContext
node ./node_modules/typescript/bin/tsc --noEmit --incremental false -p tmp/tsconfig.themelens-lane-only.json
node ./node_modules/typescript/bin/tsc --noEmit --incremental false
node ./node_modules/vite/bin/vite.js build
```

Record actual test counts; do not preserve “120” as an expected outcome after adding files.

**Browser configuration**

`playwright.theme-lens.config.ts`:

- `testDir`: `e2e/theme-lens`.
- Base URL: `http://127.0.0.1:4179`.
- Start only Vite preview on that exact host/port.
- Disable server reuse, service workers and retries.
- Use isolated browser contexts; two-page cases share one context.
- Abort API/external requests and record attempted mutations.
- Never start a backend or inherit another Playwright configuration.
- Chromium initially; record browser version. Firefox/WebKit remain explicit additional gates before claiming cross-browser support.
- Save artifacts only under package evidence.

```powershell
node ./node_modules/@playwright/test/cli.js test --config playwright.theme-lens.config.ts
```

**Named cases**

| ID | File | Named cases and proof |
|---|---|---|
| T0 | `B/mount.spec.ts` | `mounts the production header lens`; `opens all registered radios`; `selection causes no API mutation` — proves actual mount and local-only action |
| T1 | `L/themePreferenceSnapshot.test.ts` | `follow wins over stored theme`; `invalid and missing values use supplied fallback`; `getter and read denial return unavailable`; `prototype names are rejected` |
| T2 | `L/themeCrossTab.test.tsx` | Retain repaired cases; add `clear resolves the supplied fallback`; `theme removal resolves fallback`; `wrong storage area causes zero reconciliation`; `null storage area is ignored`; `peer adoption never writes` |
| T2 | `L/themeSystemPreference.test.tsx` | Retain both existing behavior cases; add `StrictMode leaves one active listener`; `unmount removes listener`; `unsupported media API uses dark fallback` |
| T3 | `L/themePreference.integration.test.tsx` | `manual choice updates context CSS and storage`; `disabling following stores displayed theme`; `invalid action changes nothing`; `peer update applies both fields together` |
| T3 | `L/themeStorageFailures.test.tsx` | `first write failure retains local choice`; `second write failure reports session-only`; `readback mismatch is not saved`; `peer event preserves pending local choice`; `retry saves current desired preference once`; `enable-follow requires only follow readback` |
| T4 | `B/persistence.spec.ts` | `two pages converge after a real selection`; `reload restores manual choice`; `reload follows current OS`; `clear converges with a new page`; `foreground return reconciles`; `interleaved writers converge to final readable pair` |
| T5 | `L/themeBootstrap.execution.test.ts` | `actual script resolves every registered theme`; `actual follow branch matches provider`; `denied APIs preserve a usable fallback`; `critical seed contains a background consumer`; `actual seed retires on injector takeover` |
| T6 | `B/prepaint.spec.ts` | `saved background paints with JS and CSS withheld`; `follow-system paints before React`; `application CSS alone preserves critical background`; `takeover leaves correct computed colours and one theme authority` |
| T7 | `L/themeContrastState.test.ts` | `swapping selected backgrounds fails`; `changed wash percentage fails`; `unknown expression fails closed`; `nested imported stylesheet cannot escape`; `inline colour declaration cannot escape`; `focus sites cover every interactive control` |
| T8 | `L/ThemeLensInteraction.test.tsx` | `real arrow action updates checked state CSS and storage`; `click selects and closes`; `retry is keyboard reachable`; `Escape closes once`; `external update preserves focus` |
| T8 | `L/ThemeLensTooltip.test.tsx` | `Escape dismisses without moving focus`; `dismissed tooltip stays suppressed`; `pointer enters bubble without dismissal`; `leaving hover and focus rearms`; `picker opening hides tooltip` |
| T9 | `B/accessibility.spec.ts` | `complete keyboard journey reaches Next switch retry and radios`; `forward Tab leaves naturally`; `outside click preserves destination focus`; `every target meets 44 pixels`; `forced colours retain focus`; `closed failed save is announced` |
| T10 | `B/layout.spec.ts` | `all themes fit every viewport`; `last option remains reachable`; `200 percent zoom retains controls`; `tooltip remains inside visual viewport`; `longest label wraps without overlap` |
| T10 | `B/contrast.spec.ts` | `rendered text pairs meet AA`; `focus indicators meet non-text threshold`; `switch states and selected check remain visible`; `opaque panel isolates page-content backdrop` |
| T11 | `L/themeLensScenePolicy.test.ts` | `default flag denies`; `reduced motion and Save-Data deny`; `narrow hidden low-memory and other-canvas states deny`; `own canvas does not deny itself` |
| T11 | `L/ThemeLensPreview.test.tsx` | `static wing survives failure`; `late import cannot create scene`; `StrictMode cleanup is idempotent`; `eligibility loss disposes`; `context loss disables this document`; `timeout does not retry` |
| T12 | `B/motion.spec.ts` | `disabled or closed picker requests no scene`; `reduced motion has no lens animation`; `scene stops after settling`; `repeated opening leaves no owned resources`; `interaction and layout budgets hold` |

**Slice commands**

```powershell
node ./node_modules/vitest/vitest.mjs run src/context/ThemeContext/themePreferenceSnapshot.test.ts src/context/ThemeContext/themePreference.integration.test.tsx src/context/ThemeContext/themeStorageFailures.test.tsx src/context/ThemeContext/themeCrossTab.test.tsx src/context/ThemeContext/themeSystemPreference.test.tsx src/context/ThemeContext/themeWritePath.test.tsx
node ./node_modules/@playwright/test/cli.js test --config playwright.theme-lens.config.ts persistence.spec.ts
```

```powershell
node ./node_modules/vitest/vitest.mjs run src/context/ThemeContext/themePrePaint.test.ts src/context/ThemeContext/themeBootstrap.execution.test.ts
node ./node_modules/@playwright/test/cli.js test --config playwright.theme-lens.config.ts prepaint.spec.ts
```

```powershell
node ./node_modules/vitest/vitest.mjs run src/context/ThemeContext/themeContrast.test.ts src/context/ThemeContext/themeContrastCoverage.test.ts src/context/ThemeContext/themeContrastState.test.ts src/context/ThemeContext/ThemeLensInteraction.test.tsx src/context/ThemeContext/ThemeLensTooltip.test.tsx
node ./node_modules/@playwright/test/cli.js test --config playwright.theme-lens.config.ts accessibility.spec.ts layout.spec.ts contrast.spec.ts
```

```powershell
node ./node_modules/vitest/vitest.mjs run src/context/ThemeContext/themeLensScenePolicy.test.ts src/context/ThemeContext/ThemeLensPreview.test.tsx
node ./node_modules/@playwright/test/cli.js test --config playwright.theme-lens.config.ts motion.spec.ts
node scripts/measure-theme-lens-bundle.mjs --baseline tmp/theme-lens-baseline/dist --candidate tmp/theme-lens-candidate/dist
```

**Fixtures and observable results**

- Registry fixtures come from actual `themeCycle`, never a second theme list.
- Viewports: 320×740, 375×812, 414×896, 768×1024, 1024×768, 1440×900, 2560×1440, 3840×2160.
- Exercise all 28 themes across layout/contrast cases.
- Contrast uses actual computed foreground/background state pairs, pseudo-elements and opaque backing. Unsupported computed colour formats fail the measurement.
- Negative controls mutate strings/modules in memory or task-owned temporary fixtures, never production source.
- Performance evidence records hardware, browser, viewport, throttling, warm/cold cache, raw samples and p95.
- Bundle evidence records initial graph delta, lazy graph delta and total cold transfer separately.
- Rollback verification rebuilds the owned baseline in isolation and confirms existing stored preferences still resolve.
- No real DB, account, provider or production service is a test fixture.

Missing imports, denied process execution or missing browsers are setup failures, not valid RED evidence.
