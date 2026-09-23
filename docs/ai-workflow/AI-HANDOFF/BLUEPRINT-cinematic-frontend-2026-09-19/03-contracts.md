**P2 amendment applied 2026-09-21. Superseded contracts removed; superseded P1 text preserved in
`/tmp/p1-originals-20260921/03-contracts.md` (md5-verified). **Correction 2026-09-21:** the earlier “*Not* in git history” note was wrong — this directory is **not** gitignored — the `.gitignore:496` claim was false (line 496 is blank, and the rules target `.ai-workflow/`, not `docs/ai-workflow/`); this packet is tracked in git as of 2026-09-21. All unrelated dependency/migration
provisions remain.**

**Capability contract** *(replaces P1 "Canonical tier policy" and "Subscriptions and overrides")*

```ts
type CanonicalTier = 'full' | 'lean' | 'reduced';

type CapabilitySnapshot = Readonly<{
  reducedMotion: boolean;
  cores?: number;
  memoryGiB?: number;
  saveData?: boolean;
  effectiveType?: string;
}>;

type CapabilityState = Readonly<{
  phase: 'pending' | 'ready';
  tier: CanonicalTier;
}>;

type Resolution = Readonly<{ phase: 'ready'; tier: CanonicalTier }>;
```

Resolution after detection:

1. Reduced-motion preference → `reduced`.
2. Known positive cores below four, or known positive memory below 4GiB → `lean`.
3. Save-data or `slow-2g | 2g | 3g` → `lean`.
4. Known cores ≥8 without restrictions → `full`.
5. Otherwise → `lean`.

Non-finite/non-positive numeric readings are unknown; non-integer core counts are unknown. Positive fractional memory values remain valid. Missing APIs are neutral. Unknown connection strings are unknown.

**Initial state: `{ phase: 'pending', tier: 'reduced' }`. Pending suppresses motion but does not latch signature disablement.**

`forceTier` applies the lower of requested and detected tiers. It cannot create eligibility above restrictions. Full is admission to an attempted enhancement, not a GPU guarantee.

**Required examples**

| Inputs | Result |
|---|---|
| Four cores, save-data true | Ready/lean; no hero import or controller |
| Eight cores, memory 2GiB | Ready/lean |
| Sixteen cores, reduced motion true | Ready/reduced |
| Unknown hardware and network | Ready/lean |
| Eight cores, other signals unknown | Ready/full; WebGL may still fail safely |
| Pending detection | Poster; no terminal latch |
| Ready/lean later becomes full | Remains disabled for that route mount |

One provider owns stable reduced-motion/connection subscriptions. Preserve synchronous preference checks at the scene boundary before presentation; the CSS media query remains independent.

> **P1 defect this replaces.** P1 said *"Before client detection, return `reduced`"* and
> *"A disabled/failed signature does not restart during the same home mount."* Composed, those two
> clauses let a conforming implementation latch disablement from the **pre-detection** `reduced`
> reading — permanently disabling the signature before detection finishes, silently. P2 resolves it by
> separating `phase` from `tier`: pending is a distinct state, and disablement cannot latch from it.
> Astra's F05.

**Migration scope**

Migrate the provider, hook definition, Home, About and the measured direct provider consumer as their actual contracts require. The three-file hook inventory includes its definition. Do not call this a twelve-section hook migration.

Preserve About and `LivingConstellation` behavior through explicit regression checks. Global behavioral changes outside this task require their own bounded disposition.

> **A0r measurements for the three-file inventory.**
> `useAnimationTier.ts` (definition) + `About.V4.tsx:44` + `HomePage.V4.tsx:50`.
> The single provider consumer is `ui-kit/background/LivingConstellation.tsx:124`.
> The shipped hook vocabulary is `full | balanced | essential` with initial state `balanced`
> (`useAnimationTier.ts:16,20`) — **not** `full | lean | reduced`, and **not** initial `reduced`. See
> `A0r-INTAKE-RECEIPT.md` §5 for the lossy three-way mapping.

**Controller contract** *(replaces P1 "Signature contract" R3F framing)*

Retain existing public methods:

```ts
setSize(cssW: number, cssH: number): void;
setView(yaw: number, pitch: number): void;
setDrift(radPerSec: number): void;
requestRender(): void;
dispose(): void;
```

Add an opt-in finite reveal operation and optional presentation/error callbacks. These are **proposed extensions**, not claims about the current API.

- `beginReveal` accepts the fixed home reveal specification.
- `onPresented` fires only after successful rendering and the displayed-canvas blit.
- `onError` reports construction/presentation/runtime failures to the boundary.
- Existing callers that omit these options retain current defaults.
- The controller alone owns rAF scheduling. The reveal sampler owns no timer.
- All resource acquisition failures unwind already acquired resources.
- `dispose()` is idempotent; no callbacks or new scheduling occur afterward.
- Listen for context loss on the actual WebGL scratch canvas.
- Remove listeners before deliberate context destruction so cleanup does not report a second user-visible failure.
- Shared geometry/material ownership must be verified from the factory before implementation.

> **A0r verification.** All five retained methods exist with matching signatures at
> `swanMarkScene.ts:78–97`. `beginReveal` / `onPresented` / `onError` do **not** exist anywhere — the
> "proposed extensions" label is accurate. Two additional read-only accessors already exist and are
> **not** in the retain list: `backing` (`:87–95`) and `stats` (`:96`), both consumed by
> `SwanMark3D.tsx:145–147`. rAF ownership is currently single-owner and preservable.

**Backing contract** *(replaces P1's unstated DPR range)*

For a positive, capped hero layout box:

```text
displayRatio = min(validDevicePixelRatioOr1, 2)
displayW = max(1, round(cssW × displayRatio))
displayH = max(1, round(cssH × displayRatio))

supersample = min(
  2,
  2048 / max(displayW, displayH),
  sqrt(4194304 / (displayW × displayH))
)

scratchW = floor(displayW × supersample)
scratchH = floor(displayH × supersample)
```

Hero CSS dimensions are capped at 560×560, so this contract does not require a supersample below one. Reject zero/unmeasured boxes until a valid resize arrives.

Record display and scratch dimensions separately. Preserve the high-quality `drawImage` path. Treat supersample two as a candidate derived from the existing method, not a proven hero-size optimum.

Per hero: one displayed 2D canvas, one detached WebGL canvas, one WebGL context. Whole-page totals include the header.

> **P1 defect this replaces.** P1 specified `explicit DPR range [1, 1.5]` in the signature contract while
> the canvas contract used `≤2`. Both cannot be the contract. Astra's F08. The 1.5 figure is withdrawn.
>
> **A0r discrepancy, open.** The shipped controller does not derive `supersample`; it takes a scalar
> option (default `2`) and clamps the resulting **edge** at `maxBacking = 1024`
> (`swanMarkScene.ts:103,223`; `sceneSupport.ts:45–54`). That implies an area ceiling of 1,048,576 px²,
> **not** the 4,194,304 px² the formula above states, and an edge ceiling of 1024, **not** 2048. Same
> input, different buffers. **Unresolved — see `A0r-INTAKE-RECEIPT.md` §6 and §12 item 4.**

**Lifecycle contract** *(replaces P1 "Fallback and cancellation")*

- Require ready/full, foreground visibility and hero intersection.
- Defer import until after the initial rendering opportunity. A double-rAF implementation is a scheduling heuristic, not proof of paint; production LCP testing remains required.
- Initial offscreen state waits without importing.
- Missing required observation support leaves the poster; no eager fallback import.
- Start a 5000ms deadline when the import begins.
- Recheck generation, mounted status, eligibility, visibility and deadline before construction and presentation.
- Native dynamic import is not assumed cancellable. Late completion must have no mount side effect.
- The deadline cannot interrupt synchronous construction; startup blocking is tested separately.
- Loss of eligibility or visibility after loading starts disposes resources and latches Disabled.
- Failure latches Failed.
- Route cleanup invalidates the generation and disposes its instance.
- StrictMode setup/cleanup replay must not consume a reveal that never presented.
- No automatic retry within the same route mount.
- Resize after settlement may request one fresh presentation; it must not replay the reveal or restart a continuous loop.

**Motion tokens and budget**

Retain existing numeric timings and easing tuples. Export CSS values mechanically from the same module; no generated source file or additional build pipeline.

The easing tuple `[0.16, 1, 0.3, 1]` denotes that exact cubic-bezier curve. Do not substitute a similarly named polynomial easing.

Retain the three-target viewport limit as a project constraint. Count shell motion.

While the signature runs, newly visible home sections appear immediately in their final state. Do not spend an additional section-reveal slot. After settlement, the existing single-wrapper reveal rule resumes only when the shell leaves capacity.

No global animation scheduler is introduced.

**R1 deletion contract**

Before deletion, record the exact component path and an allowlist of exclusively referenced styles/assets. Check runtime imports, re-exports, CSS URLs, manifests, public-path references and test fixtures. Historical documentation is preserved.

A shared or unresolved asset stays in place. Do not expand this into cleanup of `motion-helpers.tsx` or the cinematic subtree.

> **A0r result — the allowlist is one file.**
> `frontend/src/components/PremiumParallax/PremiumParallax.tsx`. **Zero external importers.** All nine
> import edges terminate in shared modules or assets (GlowButton 71 importers · videoAssets 24 ·
> Logo.png 37 · framer-motion 385). **No exclusive style, asset, CSS URL, manifest entry, public-path
> reference or test fixture exists.** Under "a shared or unresolved asset stays in place", nothing else
> joins the allowlist. Full table: `A0r-INTAKE-RECEIPT.md` §7.

**CTA, storage, environment and rollback**

- CTA delegates to the existing verified opener. Its file, symbol and downstream contract remain A0r evidence requirements.
- No new endpoint, payload, storage key, environment variable or database migration.
- No automated real form submission.
- Rollback restores only the slice's explicit paths from its preserved pre-change state or targeted commit reversal.
- First isolate enhancement failure by returning to the accepted static hero.
- Never roll back the shared tree wholesale.
- The B2 cohort no longer includes R3F solely because this cancelled home adoption required it. All other B2 decisions remain unchanged; independently discovered R3F adoption would require a new verified cohort entry.

> **A0r — the CTA receipt is complete.** Chain from route to persistence:
> `HeroSection.tsx:136` (`Find a Trainer`, `colorScheme="accent"`, `onClick={onOpenOrientation}`)
> → `HomePage.V4.tsx:52,69` (`useState` + `setShowOrientation(true)`)
> → `HomePage.V4.tsx:106` (`<OrientationForm onClose={...} />`)
> → `orientationForm.tsx:23` (`{ onClose: () => void }`)
> → `:727` `authAxios.post('/api/orientation/signup', {...payload, source:'authenticated'})` when `user?.id`
> → `:734` `fetch('/api/orientation/submit', { method:'POST', ... source:'website' })` otherwise
> → `backend/core/routes.mjs:368` → `orientationRoutes.mjs:23`/`:51` → `orientationController.mjs:48`/`:108`
> → `Orientation.create({...})` on table `orientations`.
>
> **The handoff symbol is `onOpenOrientation`, not a route change and not a modal id.** `OrientationForm`
> is the existing component; its props are `{ onClose }` only.
>
> **Two unresolved product conflicts** (`A0r-INTAKE-RECEIPT.md` §4 and §12): the plan's CTA copy
> `Book an orientation` is **not** what ships (`Find a Trainer`), and the plan's *"No secondary hero
> CTA"* contradicts the live `Join the Community` → `/signup` CTA — the only `/signup` entry in the
> HomePage subtree. **Neither is resolved by this amendment; A7's wiring changes stay blocked on them.**

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

**Signature contract** — **superseded by "Controller contract" and "Backing contract" above (P2
amendment).** P1 specified an R3F Canvas, `explicit DPR range [1, 1.5]`, and demand rendering against
R3F's invalidation model. The house raw-three controller replaces the renderer; the DPR range is
withdrawn; demand rendering survives as `requestRender()` coalescing. Superseded text is in the backup
and git history.

**Fallback and cancellation** — **superseded by "Lifecycle contract" above (P2 amendment).**
Substantive changes: the R3F `Suspense` + error-boundary pair is replaced by generation/deadline guards
in the owning component; the deadline starts when the import begins rather than at preparation; and
StrictMode replay is addressed explicitly. Superseded text is in the backup and git history.

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
| A | Retain installed React 18 and React DOM pair. **No R3F/Drei installation for this surface** — the house raw-three controller is reused. |
| B1 Framer | Select highest stable `framer-motion` 12.x release whose peers accept both installed React 18 and intended React 19. Retain import paths. If no candidate qualifies, block this slice. |
| B1 Lucide | Verify packet candidate `1.47.0`, peer ranges, exports, and installed caller APIs before freezing. |
| B1 Helmet | Verify packet candidate `3.0.0`, provider API, metadata behavior, and React peers. |
| B1 Simple Maps | Verify packet candidate `5.0.5`, its one reported consumer, and React peers. |
| B2 | Verify packet target React/React DOM `19.3.0`; use matching runtime versions. Freeze compatible React 19 type packages and React Leaflet 5 together. **R3F 9 is no longer part of this cohort.** |

The packet's exact package versions are **[UNKNOWN] as independently verified registry facts**. Missing candidates stop only their dependency slice. No `--force`, `--legacy-peer-deps`, dependency alias, or unreviewed override.

> **A0r correction to the B1 Framer blocker.** Two of A0's/P1's premises were wrong.
> Installed `framer-motion` is **10.18.0** (declared `^10.16.5`) — not 12.x — and `three` is
> **0.169.0** (declared `^0.169.0`). The B1 row's stated *blocking condition* was whether a
> `framer-motion` 12.x release accepts React 18. **Resolved: newest 12.x peers
> `react: '^18.0.0 || ^19.0.0'` → the condition is cleared, not blocked** (measured 2026-09-21).
> `gsap` remains undeclared and uninstalled; `@types/three` is absent. Recorded so the B1 slice does
> not re-derive a blocker that no longer exists.

**API, schema, environment, and rollback**

- APIs: unchanged; no new URL strings.
- Database/model migrations: N/A — no persistence changes.
- Production environment variables: none added.
- Feature deployment: static composition remains functional if enhancement fails.
- A rollback removes the signature integration and its owned dependencies while preserving the static hero and unrelated work.
- B1 rollback reverses one dependency slice, including its lockfile changes.
- B2 rollback reverses the complete React dependency cohort, types, source adaptations, and error-reporting changes together.
- Never restore an entire dirty working tree or overwrite a concurrent agent’s changes.
