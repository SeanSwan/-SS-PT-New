**[PLAN] Compatibility**

Preserve existing exported names, `ThemeId`, registry order, `UniversalThemeToggleProps`, and explicit-selection `themeChanged` payload `{ themeId, theme }`.

Do not extend that event to OS/peer updates without a separate consumer audit. Decoration consumes context.

**Preference types and signatures**

| Export | Contract |
|---|---|
| `ThemePreference` | `{ themeId: ThemeId; followSystem: boolean }` |
| `PreferenceSnapshot` | `{ kind: 'readable'; rawTheme: string \| null; rawFollow: string \| null } \| { kind: 'unavailable' }` |
| `readThemePreferenceSnapshot()` | Returns `PreferenceSnapshot`; catches getter and read failures |
| `resolveThemePreference(snapshot, systemDark, fallback)` | Readable snapshot → complete `ThemePreference`; unavailable handling belongs to caller |
| `useSystemColorScheme()` | Current dark preference; true when unsupported/denied; subscription cleaned up |
| `useThemePreference(fallback: ThemeId)` | Existing preference fields/actions plus persistence state and retry |
| `persistenceStatus` | `'unverified' \| 'saved' \| 'session-only'` |
| `pendingLocalWrite` | Internal boolean; true only after an unsuccessful local persistence attempt |
| `retryThemePersistence()` | One attempt to save current desired preference; no automatic retry |
| `writeThemePreference(operation)` | Returns `{ status: 'saved' \| 'session-only' }` |

`operation` is exactly one of:

- `{ kind: 'manual'; themeId: ThemeId }`
- `{ kind: 'enable-follow' }`
- `{ kind: 'disable-follow'; themeId: ThemeId }`

Existing writer exports remain compatibility wrappers where still referenced.

**Storage schema**

| Key | Type and accepted values |
|---|---|
| `swanstudios-theme` | String containing a registered theme ID |
| `swanstudios-theme-follow-system` | String `'true'` or `'false'` |

No migration, new key, account sync or automatic cleanup.

Resolution:

1. Literal follow value `'true'` selects current OS dark/light mapping.
2. Otherwise use a valid stored theme.
3. Otherwise use the provider fallback, `crystalline-dark` on the mounted application.
4. Unavailable startup read uses that fallback with following false.
5. Unavailable active-session read retains both current fields.
6. Invalid follow values behave as false.

Write rules:

| Operation | Writes | Success readback |
|---|---|---|
| Manual | Theme ID, then `'false'` | Both equal desired values |
| Disable following | Displayed theme ID, then `'false'` | Both equal desired values |
| Enable following | `'true'` only | Follow value equals `'true'` |

Order is deterministic for implementation simplicity, not atomicity. Failure after either write returns `session-only`. No compensating writes: another tab may have changed storage.

Local state applies before persistence. A failed local attempt sets pending local intent. Reconciliation cannot overwrite it. A successful retry or new local action clears it.

**Cross-tab contract**

- Obtain local storage inside a guarded boundary.
- Require `event.storageArea` to equal that storage object; null-area synthetic events are not production authority.
- Accept either key or `key === null`; ignore other keys.
- Event payload values are hints only.
- Reconcile on relevant events, `pageshow`, and return to visible state.
- Apply a complete resolved preference in one state update.
- Never persist during peer/foreground reconciliation.
- Clear/removal/invalid values use normal fallback rules.
- Convergence applies after writers settle, reads succeed, notifications/reconciliation run, and the receiving tab has no pending local save.
- No promise of globally ordered human intentions or atomic multi-key snapshots.

**Bootstrap contract**

Retain one inline bootstrap. Give it ID `swan-theme-bootstrap`; place it in the head after theme metadata and before stylesheet links.

The seed keeps its current five custom properties and colour scheme, and adds actual `html/body` background consumption. Do not write inline custom properties on `<html>`. The existing injector remains the sole full-token writer and retires `swan-theme-prepaint`.

“Pre-JS” readings:

- **Pre-paint:** correct critical presentation before application assets; not “before any JavaScript.”
- **Three.js:** optional decorative enhancement in S4.

The package prioritizes dependable theme behavior and visible polish; Three.js remains a bounded optional treatment. The application uses `createRoot`, so hydration work is **N/A**.

**Contrast contract**

A measured site identifies:

`{ component, state, foreground, paintOwner, backgroundRecipe, threshold }`

States are named, not combined into unordered token sets. Parent background ownership is explicit.

The instrument supports only its declared CSS grammar. Unsupported colour expressions, unmeasured reachable styles or unknown state branches fail measurement; they do not return an empty successful result.

Retain exact existing debt-ledger memberships. New focus or state failures are not absorbed into those ledgers.

**Motion**

- Remove existing infinite pulse/orbit animations from the lens.
- Remove `transition: all` and theme-colour interpolation.
- Panel: opacity plus ≤8px movement, ≤180ms.
- Tooltip: opacity, ≤120ms.
- Reduced motion: duration zero and no transform animation.
- Switch: transform-based thumb movement ≤120ms; zero under reduced motion.
- No viewport-wide colour tween or text on animated backgrounds.

**Optional scene**

`ThemeLensPreview({ themeId, enabled })` owns static fallback and lazy lifecycle.

`createThemeLensScene(canvas, colors, size)` returns:

`{ updateColors(colors), resize(size), play(), dispose() }`

- `colors`: validated resolved primary/secondary accent strings.
- `size`: `{ width, height, pixelRatio }`.
- APIs: `WebGLRenderer`, `Scene`, `OrthographicCamera`, `ShapeGeometry`, `MeshBasicMaterial`, `Mesh`, `Group`, `Color`, `render()`, geometry/material/renderer `dispose()`.
- 72×48 CSS px; DPR ≤1.5; ≤128 triangles; ≤4 draw calls.
- One 240ms settle, yaw ≤8°; no idle loop.
- No textures, external assets, HDRI, bloom or postprocessing.
- Disable below 768px, under reduced motion/Save-Data, known memory below 4GB, hidden document, or another page canvas.
- Exclude the owned canvas from the “another canvas” check.
- Recheck eligibility after import and on relevant changes.
- Two-second import deadline; late completion cannot create a scene.
- Close/context loss disposes owned resources; context loss disables the effect for that document lifetime.
- No automatic retry in the same opening.

Three.js resources require explicit lifecycle cleanup; garbage collection alone is not the acceptance criterion. [Three.js renderer documentation](https://threejs.org/docs/pages/WebGLRenderer.html).

**Dependencies and admission**

[VERIFIED] Declared / locked / installed:

| Package | Declared | Locked | Installed |
|---|---|---|---|
| React | `^18.2.0` | 18.3.1 | 18.3.1 |
| Framer Motion | `^10.16.5` | 10.18.0 | 10.18.0 |
| styled-components | `^6.1.6` | 6.1.19 | 6.1.19 |
| Three.js | `^0.169.0` | 0.169.0 | 0.169.0 |
| Victory | `^37.3.6` | 37.3.6 | 37.3.6 |

[VERIFIED] GSAP, R3F, Drei, both postprocessing packages and `@tabler/icons-react` were absent from these three dependency surfaces.

[PLAN] Recommendation remains **no new dependency for this control**, pending Sean’s answer:

- GSAP supplies timeline/media-query orchestration; this control’s motion already fits Framer Motion. Candidate APIs, if later justified: `gsap.context()`, `gsap.matchMedia()`, `revert()`. [GSAP documentation](https://gsap.com/docs/v3/GSAP/gsap.matchMedia%28%29/).
- R3F supplies declarative scene/lifecycle integration. A three-facet ornament does not yet establish an advantage over existing raw Three.js. Any later evaluation must verify exact peer dependencies; documented R3F 8 pairs with React 18. [R3F installation](https://r3f.docs.pmnd.rs/getting-started/installation).
- Drei/postprocessing/icons have no accepted lane requirement.

[UNKNOWN] Incremental bundle and GPU costs are unmeasured. Historical chunk sizes are not candidate measurements.

[PLAN] Admission budgets:

- Core addition ≤5 KiB gzip initial JS and ≤2 KiB gzip CSS.
- Lazy scene-specific code ≤8 KiB gzip.
- Report total cold transfer including any newly fetched Three.js chunk.
- No scene import while disabled or before eligible opening.
- Interaction p95 ≤100ms over 30 recorded interactions.
- No lens-attributed layout shift or new main-thread task >50ms in the measured trace.
- Zero scene animation frames after settling.
- Failure keeps `VITE_THEME_LENS_3D` false.

Flag: enabled only by exact string `'true'`; default false; public build configuration.

Rollback: restore only owned changes from verified preservation artifacts in an isolated checkout. Preserve user storage. Optional-effect rollback requires a rebuild with the flag false.
