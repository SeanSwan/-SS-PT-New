**Canonical tier policy**

The following is a **NEW internal contract**, not an existing export signature:

```ts
type CanonicalTier = 'full' | 'lean' | 'reduced';

type CapabilitySnapshot = Readonly<{
  reducedMotion: boolean;
  cores?: number;
  memoryGiB?: number;
  saveData?: boolean;
  effectiveType?: string;
}>;
```

Pure resolution rules, evaluated in order:

1. Reduced motion → `reduced`.
2. Known positive cores below 4, or known positive memory below 4GiB → `reduced`.
3. Save-data enabled, or effective connection `slow-2g`, `2g`, or `3g` → `lean`.
4. Known cores of at least 8, without an earlier restriction → `full`.
5. Otherwise → `lean`.

Missing APIs are neutral; invalid numeric readings are treated as unknown. Unknown network strings do not invent a connection class. Core count is a capability heuristic, not proof of GPU speed.

Before client detection, return `reduced`; after detection, ordinary unknown hardware resolves to `lean`. No scene request occurs before detection.

**Subscriptions and overrides**

- One provider owns reduced-motion and connection-change subscriptions.
- Effects depend on subscription inputs, not the state they update.
- Compute the next tier, use a functional state update, and remove `tier` from the effect dependency array.
- Do not log or perform other side effects inside a functional updater.
- Support the existing media-query compatibility pattern discovered at intake.
- `forceTier`, if retained, is a maximum allowance: it may lower a tier, never raise it above detected restrictions.
- Preference and connection downgrades apply immediately.
- A disabled/failed signature does not restart during the same home mount, even if the provider later upgrades.

**Vocabulary migration**

| Old provider | Old home | Canonical |
|---|---|---|
| `enhanced` | `full` | `full` |
| `standard` | `balanced` | `lean` |
| `minimal` | `essential` | `reduced` |

Intermediate adapters may return old names to unmigrated consumers. They must read canonical provider state and contain no capability checks.

Final state:

- `useAnimationTier(): AnimationTier` remains the public home hook.
- `AnimationTier` denotes `full | lean | reduced`.
- `useTierFlags` keeps useful existing flag names.
- Add `isReduced`; temporarily retain `isEssential` only as a deprecated alias during migration, then remove it after the consumer sweep.
- Final runtime capability code contains no old tier literals.
- `SectionVideoBackground` reads shared policy; its independent save-data detector is removed. Media-error and playback-support checks remain valid local responsibilities.
- Existing non-home consumers receive equivalent mappings before vocabulary cleanup.

**Motion values**

TypeScript is authoritative; CSS strings and Framer seconds are projections.

| CSS token | Authoritative value |
|---|---|
| `--motion-ambient` | 12000ms |
| `--motion-response-fast` | 120ms |
| `--motion-response` | 200ms |
| `--motion-response-slow` | 320ms |
| `--motion-narrative` | 720ms |
| `--ease-out-quint` | `[0.16, 1, 0.3, 1]` |
| `--ease-in-quad` | `[0.55, 0.085, 0.68, 0.53]` |
| Stagger interval | 60ms |
| Maximum stagger group | 5 children |

CSS easing projection uses `cubic-bezier(...)`; Framer receives numeric tuples. Durations passed to Framer are milliseconds divided by 1000. No independently maintained duplicate constants.

Expose CSS properties at the existing application style root verified during intake. Shared interpolated styles use `css`, not untagged template strings.

**Shared helper behavior**

- `fadeIn`, `fadeInUp`, `fadeInLeft`, `fadeInRight`, `scaleUp`, and `staggerItem` default to the 200ms response value.
- `staggerContainer`: `staggerChildren: 0.06`, `delayChildren: 0`.
- The 720ms narrative value is explicit to the signature, not the shared helper default.
- Reduced mode renders final opacity/transform immediately, with no stagger or delay.
- Keep the existing `animationVariants` export for compatibility; add a gated selection path for actual consumers.
- Update every actual helper consumer found during intake. A static export cannot react to media-query changes by itself.
- `withMotion` must not spread animation props through a plain component unchanged. Each verified caller is classified as plain, styled/ref-compatible, or already motion-capable. Adapt plain components once outside render; avoid double wrapping.
- Preserve domain props, refs, and event handlers; test DOM prop leakage.
- If there are no callers, retain and correct the export in this slice rather than combining the repair with cleanup.

**Signature contract**

- Subject: the existing SwanMark, not a new mark.
- Home adapter reuses verified existing geometry/material construction.
- Rotation: one Y-axis movement from `−0.14` radians to `0`; fixed camera.
- Duration: 720ms using the canonical out easing.
- No particle field, camera flight, bloom, postprocessing, shadows, video, or pointer tracking.
- No remote assets.
- One Canvas maximum; explicit DPR range `[1, 1.5]`, remaining below the doctrine’s ceiling of 2.
- Use demand rendering; request frames only while the beat is active or the scene needs a resize update.
- Native document scrolling remains unchanged.

Demand rendering requires explicit invalidation for imperative updates. [R3F performance documentation](https://r3f.docs.pmnd.rs/advanced/scaling-performance)

**Fallback and cancellation**

- Static mark and its reserved dimensions exist before any scene import.
- Begin loading only after the base hero has painted, the hero is visible, and full capability is established.
- A 5000ms import/preparation timeout keeps the poster and latches failure.
- Promise completion checks a generation token, mount status, and current eligibility.
- A tier downgrade prevents a late import from mounting a canvas.
- Poster-to-scene handoff occurs only after a successful first frame; no layout change or opacity crossfade.
- Context loss immediately restores the poster and stops the scene.
- Offscreen/hidden during the beat: finish logically without replay; stop frame requests.
- Suspense handles pending work; a separate boundary handles failures. R3F documents both unsupported-WebGL fallback and crash protection. [R3F Canvas documentation](https://r3f.docs.pmnd.rs/api/canvas)

**Home motion budget**

At most these three home-controlled targets may animate together:

1. Signature canvas, counted conservatively as one animated target.
2. `ScrollProgress`, using one transform.
3. One `SectionTransition` wrapper, using opacity and transform.

Remaining rules:

- Sections animate at most one wrapper; no simultaneous nested character, particle, counter, or card animations.
- Section reveal: 200ms, once, maximum 12px translation.
- If another section reveal is active, newly visible sections appear immediately in their final state; do not queue hidden content.
- CTA hover/press/focus styling changes immediately on this surface.
- Noise remains static.
- Full/lean section reveals are permitted; reduced mode renders final states.
- Counters display final values on Home.
- Existing shell motion counts toward the viewport cap. Intake must identify it; reduce home activity accordingly. A conflicting shell requiring unrelated changes is a scoped blocker, not permission for a global redesign.

**Dependency contracts**

| Stage | Binding rule |
|---|---|
| A | Retain installed React 18 and React DOM pair. Select highest stable R3F 8 release whose published peers accept the installed React, types, and Three.js versions. Freeze exact version. |
| B1 Framer | Select highest stable `framer-motion` 12.x release whose peers accept both installed React 18 and intended React 19. Retain import paths. If no candidate qualifies, block this slice. |
| B1 Lucide | Verify packet candidate `1.47.0`, peer ranges, exports, and installed caller APIs before freezing. |
| B1 Helmet | Verify packet candidate `3.0.0`, provider API, metadata behavior, and React peers. |
| B1 Simple Maps | Verify packet candidate `5.0.5`, its one reported consumer, and React peers. |
| B2 | Verify packet target React/React DOM `19.3.0`; use matching runtime versions. Freeze compatible React 19 type packages, R3F 9, and React Leaflet 5 together. |

The packet’s exact package versions are **[UNKNOWN] as independently verified registry facts**. Missing candidates stop only their dependency slice. No `--force`, `--legacy-peer-deps`, dependency alias, or unreviewed override.

**API, schema, environment, and rollback**

- APIs: unchanged; no new URL strings.
- Database/model migrations: N/A — no persistence changes.
- Production environment variables: none added.
- Feature deployment: static composition remains functional if enhancement fails.
- A rollback removes the signature integration and its owned dependencies while preserving the static hero and unrelated work.
- B1 rollback reverses one dependency slice, including its lockfile changes.
- B2 rollback reverses the complete React dependency cohort, types, source adaptations, and error-reporting changes together.
- Never restore an entire dirty working tree or overwrite a concurrent agent’s changes.
