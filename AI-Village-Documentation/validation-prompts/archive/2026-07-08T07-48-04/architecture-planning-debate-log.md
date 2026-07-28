# Architecture & Component Planning — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 13,634 input / 7,087 output

---

## Senior Architecture Lead — Round 1

# Architecture Review: Inception Canvas / Lens Foundry
## Senior Code Quality / Architecture Lead — Round 1 Analysis

---

## Preliminary Framing

This plan is a **concept document with proven design corpus**, not a technical specification. The 12 specialist reviews have collectively surfaced the right concerns. My role is to synthesize those into **actionable architectural decisions** with severity ratings, then produce the structural constraints a coding agent needs before touching a file.

The plan's core invention (isomorphic skeleton + Morph Contract) is sound. The execution risk is entirely in the **undefined seams**: state ownership, component boundaries, shared service paths, and file budget discipline.

---

## Finding 1 — No Single Source of Truth for the State Document

**Severity: 🔴 CRITICAL**
**Location:** Section 4 — "Voice/intent → API orchestration → state document → render"

### Issue

The plan describes a JSON "state document" that drives the entire render. Three separate consumers are implied:

1. The AI Harness (generates it)
2. The Inception Router (reads + applies it)
3. The Lens Store (persists + replays it)

No schema owner is named. No versioning strategy exists. The Data Safety audit correctly flags unbounded JSONB growth. The Architecture review flags that a coding agent will invent conflicting schemas across sessions.

The deeper structural problem: if the state document is both the **AI output format** and the **persistence format** and the **render input format**, any schema change breaks all three consumers simultaneously. This is a single-point-of-failure disguised as a feature.

### Fix

Define three distinct types with explicit transform boundaries:

```typescript
// src/engine/types/stateDocument.ts  (~60 lines)

/**
 * AIGeneratedPayload — raw output from the AI Harness / AG-UI stream.
 * Owned by: aiHarness.ts
 * NEVER persisted directly. NEVER passed to renderer directly.
 */
export interface AIGeneratedPayload {
  schemaVersion: '1.0';
  intentId: string;           // opaque, for audit only
  lensId: string | null;      // null = first generation
  components: ComponentDirective[];
  tokenOverrides: Partial<DesignTokenMap>;
  effectTier: EffectTier;     // T0-T4
}

/**
 * LensDocument — the persisted, versioned, deterministic snapshot.
 * Owned by: lensStore.ts
 * Produced by: lensFactory.ts (transforms AIGeneratedPayload → LensDocument)
 * NEVER mutated after creation — new version = new document.
 */
export interface LensDocument {
  id: string;                 // uuid
  name: string;
  version: number;
  ownerId: string;
  components: ComponentDirective[];
  tokenOverrides: Partial<DesignTokenMap>;
  effectTier: EffectTier;
  sizeBytes: number;          // enforced at write time, max 64KB
  createdAt: string;          // ISO8601
  checksum: string;           // sha256 of components + tokenOverrides
}

/**
 * RenderManifest — what the Canvas actually consumes.
 * Owned by: inceptionRouter.ts
 * Produced by: manifestBuilder.ts (transforms LensDocument → RenderManifest)
 * Ephemeral — never persisted.
 */
export interface RenderManifest {
  lensId: string;
  morphId: string;            // unique per transition, for Framer layoutId
  sections: SectionManifest[];
  activeTokens: DesignTokenMap;  // fully resolved, no partials
  trustGates: TrustGateMap;
}
```

**Transform chain (one direction only, no back-references):**

```
AIGeneratedPayload
  → lensFactory.ts → LensDocument (persisted)
  → manifestBuilder.ts → RenderManifest (ephemeral, drives render)
```

This means schema changes to the AI output format never touch the renderer. Lens documents are immutable snapshots. The renderer never sees raw AI output.

---

## Finding 2 — Dual API Families Risk (Shared-Path Integrity Violation)

**Severity: 🔴 CRITICAL**
**Location:** Section 4 — "Voice/intent → API orchestration" + implied admin UI actions

### Issue

The plan describes two paths that will inevitably reach the same backend operations:

- **UI path:** Trainer taps "Save Lens" in the admin panel → calls some endpoint
- **AI path:** Hermes agent decides to save a Lens → calls the same (or a different?) endpoint

The API Design review proposes new endpoints without specifying whether the UI and the AI harness share them. If they don't share them, you get **two parallel API families** — the most common source of divergent behavior bugs in agentic SaaS. The UI path gets battle-tested; the AI path drifts. Or vice versa.

The Trust Layer (T0–T4) makes this worse: if the AI path bypasses the trust gate that the UI path enforces, you have a security hole, not just a code smell.

### Fix

**One service layer. One path. Both consumers call it.**

```
frontend UI action
        ↓
  LensService.saveLens(payload, context)
        ↓
  TrustLayer.gate(action, context)   ← SAME gate for both paths
        ↓
  POST /api/v1/lenses

AI Harness action
        ↓
  LensService.saveLens(payload, context)   ← SAME service call
        ↓
  TrustLayer.gate(action, context)
        ↓
  POST /api/v1/lenses
```

Concrete file structure:

```
src/
  services/
    lensService.ts          // ALL lens operations — UI and AI use this
    registryService.ts      // ALL registry operations
    intentService.ts        // ALL intent/voice operations
  engine/
    trustLayer.ts           // gates EVERY action regardless of caller
    aiHarness.ts            // calls intentService, never calls API directly
```

The AI Harness is a **caller of services**, not a parallel API client. This is non-negotiable for audit integrity.

---

## Finding 3 — Component Registry Shape Is Undefined

**Severity: 🔴 CRITICAL**
**Location:** Section 2 — "Component Registry" + Section 4 — "Generation Ladder"

### Issue

The plan names the Component Registry as a core Engine asset but never specifies its shape. The Architecture review correctly identifies three possible implementations (static import map, `React.lazy` registry, server-driven manifest) — each with fundamentally different performance and security characteristics.

A coding agent will pick one arbitrarily. If it picks static imports, the bundle explodes. If it picks server-driven, you need a new API surface. If it picks `React.lazy` without a trust gate, a generated component can be promoted into the registry without review.

The Generation Ladder (assemble → compose → generate) implies three **different registry entry types** with different trust levels. The plan treats them as one thing.

### Fix

Define the registry as a typed map with explicit entry classification:

```typescript
// src/engine/registry/registryTypes.ts  (~80 lines)

export type RegistryTier = 
  | 'stable'      // reviewed, versioned, in bundle — assemble path
  | 'composed'    // runtime-assembled from stable blocks — compose path
  | 'sandboxed';  // AI-generated, not yet reviewed — generate path

export interface RegistryEntry {
  id: string;
  tier: RegistryTier;
  version: string;
  morphAnchor: MorphAnchor;     // which data-morph slot this fills
  effectTier: EffectTier;       // T0-T4 — determines trust gate
  load: () => Promise<React.ComponentType<MorphBlockProps>>;
  // Always a dynamic import — even 'stable' entries are lazy-loaded
  // 'stable' entries are prefetched; 'sandboxed' entries require T4 approval
}

export type ComponentRegistry = Map<string, RegistryEntry>;
```

Loading rules by tier:

```typescript
// src/engine/registry/registryLoader.ts  (~120 lines)

const TIER_RULES: Record<RegistryTier, LoadRule> = {
  stable: {
    prefetch: true,
    requiresApproval: false,
    sandboxed: false,
  },
  composed: {
    prefetch: false,
    requiresApproval: false,
    sandboxed: false,
  },
  sandboxed: {
    prefetch: false,
    requiresApproval: true,   // blocks render until T4 approval
    sandboxed: true,          // rendered in iframe or shadow DOM
  },
};
```

This makes the Generation Ladder a **data property**, not an architectural assumption. The registry loader enforces it uniformly.

---

## Finding 4 — Monolithic Hook Risk on `useMorph`

**Severity: 🟠 HIGH**
**Location:** Section 4 — entire morph engine description

### Issue

The plan describes a morph that involves: intent parsing, state document generation, trust gating, component loading, token interpolation, animation orchestration, URL updating, and Totem persistence. If a single `useMorph` hook owns all of this, it will exceed 300 lines on day one and become impossible to test.

The Frontend Patterns review recommends splitting into `useMorphState`, `useMorphTransition`, and `useTrustLayer`. This is correct but incomplete — it misses the URL/history concern and the Totem persistence concern.

### Fix

Five hooks with explicit ownership boundaries:

```typescript
// Hook decomposition — each file stays under 150 lines

// src/engine/hooks/useLensState.ts
// Owns: current LensDocument, loading state, error state
// Does NOT know about animation
useLensState(lensId: string): {
  lens: LensDocument | null;
  manifest: RenderManifest | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: LensError | null;
}

// src/engine/hooks/useMorphTransition.ts
// Owns: Framer Motion + View Transitions API lifecycle
// Does NOT know about lens content — only receives morphId
useMorphTransition(morphId: string | null): {
  isTransitioning: boolean;
  startMorph: (nextMorphId: string) => void;
  cancelMorph: () => void;
}

// src/engine/hooks/useTrustGate.ts
// Owns: T0-T4 effect tier enforcement, approval state
// Does NOT know about animation or lens content
useTrustGate(effectTier: EffectTier): {
  isGated: boolean;
  approvalState: ApprovalState;
  requestApproval: () => Promise<boolean>;
}

// src/engine/hooks/useLensHistory.ts
// Owns: URL state, back-button behavior, history stack
// Does NOT know about animation
useLensHistory(): {
  currentLensId: string | null;
  canGoBack: boolean;
  navigateTo: (lensId: string) => void;
  goBack: () => void;
}

// src/engine/hooks/useTotem.ts
// Owns: persistent command orb state, visibility, position
// Survives morph transitions — deliberately NOT reset on morph
useTotem(): {
  isVisible: boolean;
  position: TotemPosition;
  commands: TotemCommand[];
  dispatch: (command: TotemCommand) => void;
}
```

The `MorphCanvas` component composes these five hooks. It never calls services directly.

---

## Finding 5 — File Budget Violations (Pre-identified)

**Severity: 🟠 HIGH**
**Location:** Implied by plan scope

### Issue

Based on the plan's described responsibilities, the following files will exceed 300 lines if naively implemented:

| File | Why It Will Overflow | Split Strategy |
|---|---|---|
| `inceptionRouter.ts` | State machine + effect-tier logic + manifest building + URL sync | Split into `inceptionRouter.ts` (transition triggers only) + `manifestBuilder.ts` (LensDocument → RenderManifest) + `lensHistory.ts` (URL/history) |
| `trustLayer.ts` | T0-T4 gating + approval workflow + audit receipt generation + PII scrubbing | Split into `trustLayer.ts` (gate logic) + `approvalGate.ts` (approval workflow) + `auditLogger.ts` (receipts) |
| `aiHarness.ts` | AG-UI stream parsing + intent routing + PII scrubbing + state doc generation | Split into `aiHarness.ts` (stream client) + `intentRouter.ts` (routing logic) + `piiScrubber.ts` (PII removal before any external call) |
| `MorphCanvas.tsx` | Renders all 7 sections + composes all 5 hooks + handles error boundaries | Split into `MorphCanvas.tsx` (composition root, ~100 lines) + `MorphSection.tsx` (single section renderer) + `MorphErrorBoundary.tsx` |
| `lensStore.ts` | CRUD + size enforcement + encryption + versioning + migration | Split into `lensStore.ts` (CRUD) + `lensValidator.ts` (size/schema enforcement) + `lensMigration.ts` (version migration) |

### Concrete file budget for the Engine:

```
src/engine/
  types/
    stateDocument.ts        ~60 lines
    registryTypes.ts        ~80 lines
    trustTypes.ts           ~40 lines
    morphTypes.ts           ~50 lines
  
  registry/
    registryLoader.ts       ~120 lines
    registryEntries.ts      ~100 lines  (the actual Map — grows with corpus)
  
  harness/
    aiHarness.ts            ~150 lines  (AG-UI stream client only)
    intentRouter.ts         ~120 lines
    piiScrubber.ts          ~80 lines
  
  router/
    inceptionRouter.ts      ~150 lines  (transition triggers)
    manifestBuilder.ts      ~120 lines
    lensHistory.ts          ~80 lines
  
  trust/
    trustLayer.ts           ~120 lines
    approvalGate.ts         ~100 lines
    auditLogger.ts          ~80 lines
  
  lens/
    lensFactory.ts          ~100 lines
    lensStore.ts            ~120 lines
    lensValidator.ts        ~80 lines
    lensMigration.ts        ~60 lines
  
  hooks/
    useLensState.ts         ~100 lines
    useMorphTransition.ts   ~120 lines
    useTrustGate.ts         ~80 lines
    useLensHistory.ts       ~60 lines
    useTotem.ts             ~80 lines
  
  components/
    MorphCanvas.tsx         ~100 lines
    MorphSection.tsx        ~150 lines
    MorphErrorBoundary.tsx  ~80 lines
    Totem.tsx               ~120 lines
```

Total: ~28 files, all under 300 lines. No file owns two concerns.

---

## Finding 6 — Error Boundary Placement

**Severity: 🟠 HIGH**
**Location:** Section 4 — "Generation Ladder" + sandboxed component generation

### Issue

The plan describes AI-generated components being rendered in a sandbox before promotion. React error boundaries are not mentioned anywhere. A sandboxed component that throws will crash the entire Canvas — including the Totem, which the plan explicitly says must survive every morph.

There are three distinct error domains that need separate boundaries:

1. **Morph transition errors** — animation fails, View Transitions API unavailable
2. **Lens load errors** — LensDocument corrupt, network failure, schema version mismatch
3. **Sandboxed component errors** — AI-generated component throws during render

### Fix

```typescript
// Error boundary hierarchy

<MorphCanvas>                          // top-level, catches everything
  <MorphErrorBoundary                  // catches lens load + morph errors
    fallback={<LensFallbackSkeleton />}
    onError={auditLogger.logLensError}
  >
    <MorphSection />                   // per-section rendering
  </MorphErrorBoundary>

  <SandboxErrorBoundary               // catches sandboxed component errors
    fallback={<SandboxFailurePlac

---

## Code Architecture Specialist (1M context) — Round 2

CONSENSUS REACHED

Merged Findings:
All six findings from the Senior Architecture Lead's Round 1 analysis are accepted without modification. The proposed fixes—including explicit type boundaries for state documents, unified service layer, typed component registry with tiered loading, hook decomposition, file budget splits, and error boundary hierarchy—are adopted as structural constraints for implementation. No additional points or disputes are raised in this round.

---

