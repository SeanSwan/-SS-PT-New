**P2 amendment applied 2026-09-21. Superseded sections removed; P1 content preserved in
`/tmp/p1-originals-20260921/01-architecture.md` (md5-verified). **Correction 2026-09-21:** the earlier “*Not* in git history” note was wrong — this directory is **not** gitignored — the `.gitignore:496` claim was false (line 496 is blank, and the rules target `.ai-workflow/`, not `docs/ai-workflow/`); this packet is tracked in git as of 2026-09-21.**

**Proposed files and dispositions** *(replaces P1 "Proposed additions")*

| Path | Disposition | Responsibility |
|---|---|---|
| `frontend/src/core/perf/performanceTierPolicy.ts` | New | Pure tier resolution; no subscriptions or WebGL probing. |
| `frontend/src/core/perf/motionTokens.ts` | New | Numeric timings/easing and mechanically derived CSS values. |
| `frontend/src/components/SwanMark3D/swanMarkReveal.ts` | New | Pure finite-reveal sampling; no React, renderer, or rAF ownership. |
| `frontend/src/components/SwanMark3D/swanMarkLoop.ts` | New *(A8)* | The two frame loops; the only rAF call site. Permitted under the extraction clause below. |
| `frontend/src/components/SwanMark3D/swanMarkPresentation.ts` | New *(A8)* | Draw, blit and report. Owns the `onPresented` iff-blitted invariant. Permitted under the extraction clause below. |
| `frontend/src/components/SwanMark3D/SWANMARK-SIZING-RATIONALE.md` | New *(A8)* | The measured two-canvas reasoning, moved out of the `swanMarkScene.ts` header to free Rule 4 budget. Documentation, not a module. |
| `frontend/src/pages/HomePage/components/sections/HeroSignature.tsx` | New | Poster markup, eligibility, dynamic import, generation/deadline guards, controller lifecycle. |
| `frontend/src/pages/HomePage/components/sections/HeroSignature.styles.ts` | New | Reserved geometry, responsive composition and independent CSS motion gate. |
| `PerformanceTierProvider.tsx` | Modify | Stable subscriptions and detection phase. |
| `useAnimationTier.ts` and measured consumers | Modify | Consume the shared authority without permanent old-tier aliases. |
| `swanMarkScene.ts` | Modify narrowly | Optional finite reveal; presentation/error notifications; capped backing policy. |
| `sceneSupport.ts` | Modify if required | Extend existing backing calculation with explicit hero limits. |
| Existing `HeroSection` and V4 integration | Modify | Static composition, existing CTA delegation and home motion coordination. |

Cancel `homeHeroSpec.ts`, `homeHeroFactory.ts`, `HeroSignatureScene.tsx`, `HeroSignaturePoster.tsx`, and `motionTokenStyles.ts`.

The five-module list is a design boundary, not permission to exceed 300 lines. If the existing controller cannot remain within the cap, extract one cohesive private presentation helper and record the reason before adding it. Do not split constants into files merely to meet a file-count target.

> **A8 result — the contingency clause was invoked, twice, and the count is now six modules plus one document.** The controller could not remain within the cap: A8's reveal, notifications and accounting took `swanMarkScene.ts` from 281 to 427 lines. Two cohesive helpers were extracted rather than one, because the controller was doing three jobs that had only ever been in one file because they had always been in one file:
>
> - `swanMarkPresentation.ts` — a frame **reaching** the viewer, and the caller being told.
> - `swanMarkLoop.ts` — **when** the next frame is scheduled, and when to stop.
>
> Plus `SWANMARK-SIZING-RATIONALE.md`, which holds the measured two-canvas reasoning moved out of the header (62 lines of the budget, and documentation rather than code).
>
> Net: `swanMarkScene.ts` is now **277 lines**, below its pristine 281. All eleven modules on this surface are under the cap. Reasons and measurements: `A8-NOTES-2026-09-21.md`. **This list should be read as six modules.**

**Ownership** *(replaces P1 "Ownership")*

- The provider owns capability subscriptions.
- `HeroSignature` owns route-local eligibility, import state, observers and fallback.
- `swanMarkScene` owns its renderer, scratch canvas, scheduling and disposal.
- `swanMarkReveal` computes a pose from elapsed time; it never schedules frames.
- The existing factory owns construction according to its verified resource contract.
- Every controller instance owns its own mutable resources. Immutable mesh data may be reused; one instance must not dispose another's resources.
- Header behavior retains current defaults. Hero options are opt-in.
- No React state update occurs for every animation frame.

**User and data flow**

```mermaid
flowchart TD
    Route["Existing route selects HomePage.V4"] --> Hero["Static Act 1: copy, CTA, poster"]
    Hero --> CTA["Book an orientation"]
    CTA --> Existing["Existing verified orientation opener"]
    Existing --> Flow["Existing orientation workflow unchanged"]

    Hero --> Rest["Remaining eleven sections unchanged in structure"]
    Provider["Canonical provider"] --> Ready{"Detection ready?"}
    Ready -->|No| Poster["Keep poster"]
    Ready -->|Yes| Eligible{"Full tier, visible, foreground?"}
    Eligible -->|No| Poster
    Eligible -->|Yes| Load["Dynamic import of house controller"]
    Load --> Prepare["Create owned controller and buffers"]
    Prepare --> Presented{"Successful first presentation?"}
    Presented -->|Yes| Reveal["One finite reveal"]
    Presented -->|No or deadline| Terminal["Dispose; terminal poster fallback"]
    Reveal --> Idle["Settled; no continuous rendering"]
    Reveal -->|Restriction, hidden, error or context loss| Terminal
    Idle -->|Restriction, hidden, error or context loss| Terminal
```

"Existing verified orientation opener" is a required integration boundary, not a claim that its identity is supplied. A0r must fill its exact source receipt before A7 changes the handler wiring.

**Controller interaction**

```mermaid
sequenceDiagram
    participant H as HeroSignature
    participant P as Provider
    participant M as Dynamic module
    participant C as SwanMark controller
    participant V as Displayed 2D canvas

    P-->>H: ready + eligible tier
    H->>H: Check visibility, generation and deadline
    H->>M: import controller
    M-->>H: Module available
    H->>H: Recheck eligibility and generation
    H->>C: Create with hero-only options
    H->>C: setSize; setDrift(0); beginReveal
    C->>C: Render scratch WebGL frame
    C->>V: Blit completed frame
    C-->>H: onPresented
    H->>H: Hide poster without crossfade
    loop Until reveal completes
        C->>C: Sample pose and schedule needed frame
        C->>V: Present frame
    end
    C-->>H: Final presentation
    C->>C: Stop continuous scheduling
    alt Restriction, failure, context loss or route exit
        H->>H: Invalidate generation
        H->>C: dispose
        H->>H: Show poster if still mounted
    end
```

**State machine**

```mermaid
stateDiagram-v2
    [*] --> Waiting
    Waiting --> Waiting: Detection pending or initially offscreen
    Waiting --> Disabled: Ready restriction or missing required observer
    Waiting --> Loading: Ready eligible and visible
    Loading --> Preparing: Import resolves; guards pass
    Loading --> Failed: Rejection or deadline
    Loading --> Disabled: Eligibility or visibility lost
    Preparing --> Running: First frame presented
    Preparing --> Failed: Construction/presentation error or deadline
    Preparing --> Disabled: Eligibility or visibility lost
    Running --> Settled: Final frame presented
    Running --> Disabled: Preference/network downgrade or hidden
    Running --> Failed: Error or context loss
    Settled --> Disabled: Downgrade or hidden
    Settled --> Failed: Error or context loss
    Waiting --> Disposed: Route exit
    Loading --> Disposed: Route exit
    Preparing --> Disposed: Route exit
    Running --> Disposed: Route exit
    Settled --> Disposed: Route exit
    Failed --> Disposed: Route exit
    Disabled --> Disposed: Route exit
    Disposed --> [*]
```

Failed and Disabled display the poster and have no outgoing retry transition. A new route mount starts a new lifecycle.

**Other diagrams**

- **ERD: N/A — no persisted entities, columns, migrations or database relationships change.**
- **HTTP sequence diagrams: N/A for changed behavior — no new API interaction is introduced.** Existing form submission remains outside this change; its real contract must be recorded without alteration.
- **Permissions:** public decorative surface; no new authorization capability.
- **Trust boundary:** local assets and browser capability signals only; no added telemetry or external asset service.

Mermaid source is supplied; rendering has not been validated in this consultation.

---

## Retired P1 sections

The following P1 sections were replaced by the amendment above. Kept as a pointer so a reader knows
what was removed and where it went; verbatim text is in the backup and git history.

| Retired P1 section | Replaced by |
|---|---|
| P1 "Proposed additions" (nine new paths) | Five-module disposition table above; six paths cancelled |
| P1 "Ownership" — *"R3F owns the new renderer and rendering lifecycle"* | Ownership above — the house `swanMarkScene` controller owns it; no R3F |
| P1 "Capability and rendering flow" mermaid — *"Lazy R3F scene import" → "Scene error boundary" → "At most one R3F Canvas"* | "User and data flow" above — dynamic import of the house controller |
| P1 "Enhancement-loading sequence" mermaid — `participant Scene as R3F scene` | "Controller interaction" above — `SwanMark controller` + displayed 2D canvas |
| P1 "Signature lifecycle" state machine (`Poster → Loading → Preparing → Running → Settled`) | State machine above — adds `Waiting` and `Disposed`, makes route exit explicit |
| P1 "User flow" mermaid — CTA node labeled `Book an orientation` | Retained in "User and data flow"; **see A0r §12 — the shipped CTA reads `Find a Trainer` and this is unresolved** |
