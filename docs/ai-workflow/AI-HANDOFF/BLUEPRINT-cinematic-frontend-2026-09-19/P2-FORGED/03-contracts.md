**Replace the following contracts. All unrelated dependency/migration provisions remain.**

**Capability contract**

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
```

Resolution after detection:

1. Reduced-motion preference → `reduced`.
2. Known positive cores below four, or known positive memory below 4GiB → `lean`.
3. Save-data or `slow-2g | 2g | 3g` → `lean`.
4. Known cores ≥8 without restrictions → `full`.
5. Otherwise → `lean`.

Non-finite/non-positive numeric readings are unknown; non-integer core counts are unknown. Positive fractional memory values remain valid. Missing APIs are neutral. Unknown connection strings are unknown.

Initial state: `{ phase: 'pending', tier: 'reduced' }`. Pending suppresses motion but does not latch signature disablement.

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

**Migration scope**

Migrate the provider, hook definition, Home, About and the measured direct provider consumer as their actual contracts require. The three-file hook inventory includes its definition. Do not call this a twelve-section hook migration.

Preserve About and `LivingConstellation` behavior through explicit regression checks. Global behavioral changes outside this task require their own bounded disposition.

**Controller contract**

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

**Backing contract**

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

**Lifecycle contract**

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

**CTA, storage, environment and rollback**

- CTA delegates to the existing verified opener. Its file, symbol and downstream contract remain A0r evidence requirements.
- No new endpoint, payload, storage key, environment variable or database migration.
- No automated real form submission.
- Rollback restores only the slice’s explicit paths from its preserved pre-change state or targeted commit reversal.
- First isolate enhancement failure by returning to the accepted static hero.
- Never roll back the shared tree wholesale.
- The B2 cohort no longer includes R3F solely because this cancelled home adoption required it. All other B2 decisions remain unchanged; independently discovered R3F adoption would require a new verified cohort entry.
