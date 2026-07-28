# Architecture & Component Design — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 83.3s
> **Files:** docs/ai-workflow/brainstorms/inception-morph-engine-plan-2026-07-08.md
> **Generated:** 7/8/2026, 12:48:04 AM

---

# Architectural Review: Inception Canvas / Lens Foundry Build-Out Plan

> **Reviewer note:** This plan is a *product + feasibility* document, not yet a technical implementation spec. It describes intent, open decisions, and a design corpus — it does **not** propose specific files, components, hooks, or data-flow diagrams. The review below therefore operates at two levels: (1) evaluating the architectural *claims* embedded in the plan against production React/TypeScript standards, and (2) flagging the structural gaps that must be resolved before any coding agent can execute this safely.

---

## Executive Summary

The plan contains a genuinely defensible core invention (the Morph Contract / isomorphic skeleton) and a coherent business decomposition. However, **it is not build-ready**. The rendering stack section makes performance claims that are unverified on real hardware, the state model is undefined, and there is no component decomposition at all — meaning a coding agent handed this document would have to invent the entire architecture from scratch, which is exactly the "rework" the plan says it wants to avoid.

**Overall readiness: 2/5 — Concept-proven, architecture-unspecified.**

---

## Finding 1 — Component Decomposition

| Field | Value |
|---|---|
| **Severity** | 🔴 Critical |
| **Location** | Entire plan — Section 4 "Rendering stack" |
| **Issue** | Zero component decomposition exists. The plan names the Engine, Lenses, Registry, Totem, and Canvas as concepts but never maps them to React component boundaries. A coding agent will invent conflicting decompositions across sessions, producing an unmergeable codebase. The "Component Registry" is mentioned as a core Engine asset but its shape (static import map? dynamic `React.lazy` registry? server-driven component manifest?) is never specified. |
| **Recommended Fix** | Before any build session, produce a `COMPONENTS.md` that specifies at minimum: |

```
lens-foundry/
  src/
    engine/
      MorphCanvas.tsx          # root shell, owns morph state machine
      MorphRouter.tsx          # URL ↔ Lens state sync
      ComponentRegistry.ts     # { [id: string]: React.LazyExoticComponent }
      TrustGate.tsx            # wraps T3/T4 actions, approval modal
    totem/
      Totem.tsx                # persistent command bar/orb
      TotemCommandInput.tsx    # voice/text intent entry
    lens/
      LensRenderer.tsx         # reads Lens JSON → assembles registry components
      LensLoader.tsx           # fetch/cache Lens document
      useLens.ts               # data hook: load, snapshot, version
    morph/
      useMorphState.ts         # state machine hook (idle→morphing→settled)
      MorphTransition.tsx      # Framer Motion layout group + View Transitions bridge
      morphGrammar.ts          # zoom/flip/fold/crystallize easing configs
    trust/
      useTrustTier.ts          # derives T0–T4 from component metadata
      AuditReceipt.tsx         # renders audit trail for T3/T4 actions
    grid/
      GridShell.tsx            # 12-col ultra-fine grid, CSS custom props only
```

Each file must stay under 300 lines. `MorphCanvas.tsx` is the highest risk for bloat — it will need to be kept as a pure orchestrator with zero render logic of its own.

---

## Finding 2 — State Management

| Field | Value |
|---|---|
| **Severity** | 🔴 Critical |
| **Location** | Section 4 — "state document (JSON)" and Open Decision #4 |
| **Issue** | The plan correctly identifies the Lens JSON as the central state artifact but leaves its schema entirely open. This is the single most dangerous gap. Without a versioned schema, every hook, every component, and every agent prompt will assume a different shape. The plan also describes three concurrent state concerns that will collide if not separated: (a) **morph animation state** (which transition phase are we in), (b) **Lens document state** (what is the current assembled UI), (c) **intent/session state** (what did the user ask for, what APIs fired). If these live in one store, any intent update will trigger a full morph re-render. |
| **Recommended Fix** | Define three isolated state domains before writing a single hook: |

```typescript
// 1. Morph State Machine — lives in useMorphState.ts
type MorphPhase = 'idle' | 'intent-received' | 'lens-loading' 
                | 'morphing' | 'settled' | 'error';

interface MorphState {
  phase: MorphPhase;
  fromLensId: string | null;
  toLensId: string | null;
  startedAt: number | null;
}

// 2. Lens Document — lives in useLens.ts, NEVER mixed with morph phase
interface LensDocument {
  id: string;
  version: string;           // semver — migration path required
  schemaVersion: number;     // integer bump for breaking changes
  sections: LensSectionMap;  // keyed by data-morph anchor id
  tokens: LensTokenMap;      // the 9 CSS custom properties
  components: LensComponentRef[];
}

// 3. Session/Intent — lives in useSession.ts, isolated from render
interface SessionState {
  rawIntent: string;
  resolvedLensId: string | null;
  apiCallLog: ApiCallRecord[];
  trustContext: TrustTierContext;
}
```

**Circular dependency risk:** `LensRenderer` reads `LensDocument`; `useMorphState` reads `LensDocument` to know when loading is done; `MorphTransition` reads `MorphPhase`. If `LensRenderer` also writes to `MorphPhase` (e.g., "I finished rendering, set phase to settled"), you get a render-loop. Fix: `MorphTransition` owns the `onMorphComplete` callback; `LensRenderer` is purely presentational and fires no state writes.

---

## Finding 3 — Data Flow

| Field | Value |
|---|---|
| **Severity** | 🔴 Critical |
| **Location** | Section 4 — "Voice/intent → API orchestration → state document → render" |
| **Issue** | The plan describes a linear pipeline but does not address the race condition that is almost certain in production: a user speaks a second intent while the first morph is still in the `morphing` phase (600–900ms is a long window for a fast user). If the second intent fires a new Lens load while `MorphTransition` is mid-animation, the shared-layout `layoutId` anchors will be in an indeterminate position and Framer Motion will produce a visual glitch or throw. Additionally, the plan says "URLs survive the morph" but does not specify whether the URL update happens at `intent-received`, `lens-loading`, or `settled` — each choice has different back-button behavior implications. |
| **Recommended Fix** | |

```typescript
// In useMorphState.ts — queue intents, never interrupt a morph in flight
function useMorphState() {
  const [phase, setPhase] = useState<MorphPhase>('idle');
  const pendingIntent = useRef<string | null>(null);

  const receiveIntent = useCallback((intent: string) => {
    if (phase === 'morphing') {
      // Queue it; fire after onMorphComplete
      pendingIntent.current = intent;
      return;
    }
    startMorph(intent);
  }, [phase]);

  const onMorphComplete = useCallback(() => {
    setPhase('settled');
    if (pendingIntent.current) {
      const queued = pendingIntent.current;
      pendingIntent.current = null;
      startMorph(queued);  // drain queue
    }
  }, []);
}
```

**URL timing:** Update the URL at `lens-loading` start (optimistic), not at `settled`. This matches browser navigation expectations — the URL reflects intent, not render completion. Use `history.replaceState` during morph, `history.pushState` only on `settled` so back-button rewinds to the previous settled state, not an intermediate loading state.

**Stale Lens risk:** If a Lens document is cached and the registry has been updated (new component version), the cached Lens may reference a component ID that no longer exists or has a breaking prop change. The `schemaVersion` integer on `LensDocument` must be checked against the registry's own version manifest on every load, not just on first fetch.

---

## Finding 4 — React Patterns

| Field | Value |
|---|---|
| **Severity** | 🟡 High |
| **Location** | Section 4 — "Generation Ladder" and "Component Registry" |
| **Issue** | The plan describes dynamic component assembly (registry blocks assembled at runtime) but does not address the memoization strategy. In a registry-driven render, `LensRenderer` will map over `LensDocument.components` and render each one. Without `React.memo` on every registry component AND a stable `key` strategy tied to the `data-morph` anchor id (not array index), every intent update will unmount and remount all components, destroying Framer Motion's shared-layout continuity. The `layoutId` for a morph to work must survive across renders — it cannot be on a component that unmounts. |
| **Recommended Fix** | |

```typescript
// LensRenderer.tsx — stable keys, memoized registry lookup
const LensRenderer = React.memo(({ lens }: { lens: LensDocument }) => {
  const registry = useComponentRegistry();
  
  // useMemo: only recompute component list when lens.components changes
  const resolvedComponents = useMemo(() => 
    lens.components.map(ref => ({
      ...ref,
      Component: registry.get(ref.id),  // React.lazy component
    })),
    [lens.components, registry]
  );

  return (
    <GridShell>
      <AnimatePresence mode="wait">
        {resolvedComponents.map(({ morphAnchor, Component, props }) => (
          // Key = morphAnchor id, NOT array index
          // layoutId = morphAnchor id so Framer tracks across Lens swaps
          <motion.div
            key={morphAnchor}
            layoutId={morphAnchor}
          >
            <Suspense fallback={<MorphSkeleton anchorId={morphAnchor} />}>
              <Component {...props} />
            </Suspense>
          </motion.div>
        ))}
      </AnimatePresence>
    </GridShell>
  );
});
```

**Additional pattern gap:** The Totem (persistent element) must be rendered *outside* `AnimatePresence` entirely. If it is inside the morph transition group, it will be subject to exit animations and the "spatial continuity" guarantee breaks. It should be a sibling of `LensRenderer` in `MorphCanvas`, not a child.

---

## Finding 5 — File Budget (300-line limit)

| Field | Value |
|---|---|
| **Severity** | 🟡 High |
| **Location** | Implied by plan scope — no files exist yet |
| **Issue** | Three proposed conceptual units will almost certainly exceed 300 lines if naively implemented as single files: |

| Conceptual Unit | Risk | Mitigation |
|---|---|---|
| `MorphCanvas.tsx` | Orchestrates morph state machine + URL sync + Totem + LensRenderer + error boundaries + Trust context. Easily 400–600 lines. | Split into `MorphCanvas.tsx` (pure layout shell, ~80 lines) + `MorphOrchestrator.tsx` (state machine wiring, ~150 lines) + `MorphCanvas.stories.tsx` (separate). |
| `LensDocument` schema + validation | If Zod schemas, migration functions, and type guards live together: 300+ lines. | `lens.schema.ts` (Zod), `lens.migrations.ts` (version bumps), `lens.types.ts` (TypeScript interfaces) — three files. |
| `ComponentRegistry.ts` | If it contains the registry map, lazy imports for all 50+ corpus components, and the lookup/registration API: easily 400+ lines. | Registry map lives in `registry.manifest.ts` (auto-generated). API lives in `registry.ts` (~80 lines). Each corpus component is its own file. |
| `TrustGate.tsx` | T0–T4 logic + approval modal + audit receipt + styled-components variants. | Split `TrustGate.tsx` (gate wrapper) from `ApprovalModal.tsx` and `AuditReceipt.tsx`. |

---

## Finding 6 — Hook Design

| Field | Value |
|---|---|
| **Severity** | 🟡 High |
| **Location** | Section 4 — all hooks implied but unnamed |
| **Issue** | The plan conflates three hook concerns that must be separated for testability and reuse. Currently the plan implies a single "morph hook" that handles intent parsing, API orchestration, Lens loading, and animation phase — this is a god-hook anti-pattern. On a production SaaS platform, each concern needs to be independently mockable for testing. |
| **Recommended Fix** | Enforce this separation strictly: |

```
Data fetching hooks (network I/O only, no UI state):
  useLensDocument(lensId)     → { data, loading, error, refetch }
  useIntentResolution(intent) → { lensId, confidence, loading, error }
  useApiOrchestration()       → { fire, results, loading, error }

UI state hooks (no network, no business logic):
  useMorphPhase()             → { phase, setPhase }
  useTotemVisibility()        → { visible, show, hide }
  useTrustTierUI(tier)        → { requiresApproval, approvalState, approve, reject }

Business logic hooks (compose data + UI, no direct render):
  useMorphEngine()            → composes useLensDocument + useMorphPhase + useIntentResolution
  useLensSession()            → composes useApiOrchestration + useSession + useTrustTierUI
```

**Specific risk:** `useMorphEngine` is the composition hook that will be tempting to bloat. It must remain a thin coordinator — if it exceeds ~80 lines, it is doing too much and should be split further.

---

## Finding 7 — Error Boundaries

| Field | Value |
|---|---|
| **Severity** | 🟡 High |
| **Location** | Section 4 — "Generation Ladder" step (c), Trust Layer, Lens loading |
| **Issue** | The plan describes three failure modes that require distinct error boundary strategies, none of which are specified: (1) a registry component throws during render (especially dangerous for step-(c) generated components promoted from sandbox), (2) a Lens document fails to load or has a schema mismatch, (3) a T3/T4 Trust action fails mid-approval. Without boundaries, any of these crashes the entire Canvas — the worst possible failure mode for a shell that is supposed to be the "render + approval layer of the agentic web." |
| **Recommended Fix** | Three-layer boundary strategy: |

```tsx
// Layer 1: Canvas-level — catches total failures, renders Totem-only fallback
// so the user can still issue a new intent even if the current Lens is broken
<CanvasErrorBoundary fallback={<TotemOnlyFallback />}>
  <MorphCanvas />
</CanvasErrorBoundary>

// Layer 2: Lens-level — catches Lens render failures, shows last-known-good Lens
// or a "Lens unavailable" state without killing the shell
<LensErrorBoundary lensId={currentLensId} fallback={<LensUnavailable />}>
  <LensRenderer lens={lensDocument} />
</LensErrorBoundary>

// Layer 3: Component-level — wraps EVERY registry component
// Generated (step-c) components get a stricter boundary with automatic
// demotion back to sandbox on repeated failures
<RegistryComponentBoundary 
  componentId={ref.id}
  onFailure={registry.reportFailure}  // triggers demotion if threshold exceeded
>
  <Suspense fallback={<MorphSkeleton />}>
    <Component {...props} />
  </Suspense>
</RegistryComponentBoundary>
```

**Trust action boundary (special case):** T3/T4 approval flows must have their own boundary that, on failure, renders an explicit "action could not be completed" state with the audit receipt preserved. A failed payment or file-send must never sil

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
