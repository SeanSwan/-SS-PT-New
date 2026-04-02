# Architecture Planning Consensus

> Phase 2B: Claude Sonnet 4.6 ↔ Qwen 3.6 Plus
> Consensus: YES

---

# Architecture Authority — Round 3 Final Ruling

**Reviewer:** Senior Architecture Lead (Claude Sonnet 4.6)
**Round:** 3 of 3 — Final Authority Decision

---

## CONSENSUS REACHED

The core architectural disputes are resolved. Before I ratify the final snapshot, I need to close four remaining gaps that will cause production issues if left unaddressed. These are not disputes with Qwen — they are completions.

---

## Ratifications (No Further Dispute)

**Accepted unconditionally from Round 2:**
- `useLatest.ts` at `frontend/src/hooks/utils/useLatest.ts`
- `BootcampTokens.ts` expanded schema with animation and z-index tokens
- Three-pane error boundary isolation
- Unified undo/redo history stack with `source` tagging
- Optimistic patch application with rollback on sync failure
- `BootcampBuilderModal.tsx` wrapper pattern for modal rendering

**Accepted with the corrections already documented:**
- `useBootcampSelector.ts` with `shallowEqual` default and `useCallback` enforcement
- `useBootcampNavigationURL.ts` with history-safe push/replace distinction and concurrent-safe `URLSearchParams` mutation

---

## Gap 1: The `syncPatchToServer` Rollback Has a Race Condition

**File:** `hooks/useBootcampState.ts` — Line ~68 (Qwen's optimistic update implementation)
**Severity:** 🔴 SEV-1 — Data corruption under concurrent edits

Qwen's rollback implementation captures `previousState` as a snapshot, but if the trainer makes a **second edit while the first patch is syncing**, the rollback will revert BOTH edits, not just the failed one:

```typescript
// Qwen's version — BROKEN under concurrent edits
const applyPatch = useCallback((patch: BootcampPatch) => {
  const previousState = templateRef.current; // Snapshot at T=0
  setTemplate(prev => applyPatchToTemplate(prev, patch));
  
  syncPatchToServer(patch).catch(() => {
    setTemplate(previousState); // ❌ Reverts T=1 edit too if trainer edited at T=0.5
  });
}, []);
```

**Corrected implementation using patch-based rollback, not snapshot rollback:**

```typescript
// hooks/useBootcampState.ts — corrected applyPatch (~35 lines)
const applyPatch = useCallback((patch: BootcampPatch) => {
  // Generate inverse patch BEFORE applying — this is the rollback unit
  const inversePatch = computeInversePatch(templateRef.current, patch);
  const patchId = crypto.randomUUID();
  
  // Apply optimistically
  setTemplate(prev => applyPatchToTemplate(prev, patch));
  
  // Track in-flight patches for rollback targeting
  inFlightPatchesRef.current.set(patchId, inversePatch);
  
  syncPatchToServer(patch)
    .then(() => {
      inFlightPatchesRef.current.delete(patchId);
    })
    .catch(() => {
      // Apply ONLY the inverse of the failed patch — not a full snapshot revert
      const inverse = inFlightPatchesRef.current.get(patchId);
      if (inverse) {
        setTemplate(prev => applyPatchToTemplate(prev, inverse));
        inFlightPatchesRef.current.delete(patchId);
      }
      toast.error('AI patch failed to sync. That specific change was reverted.');
    });
}, []);

// Required: inverse patch computation
// computeInversePatch(currentTemplate, patch) → patch that undoes exactly `patch`
// This must be implemented alongside applyPatchToTemplate
```

**Additional requirement:** `inFlightPatchesRef` must be a `useRef<Map<string, BootcampPatch>>` initialized in `useBootcampState.ts`. This is a new field not in either reviewer's state inventory.

---

## Gap 2: The ESLint Rule Qwen Proposed Is Insufficient

**File:** `.eslintrc.js` — Qwen's addition
**Severity:** 🟠 SEV-2

Qwen's rule:
```json
"react-hooks/exhaustive-deps": ["warn", { "additionalHooks": "useBootcampSelector" }]
```

This only warns on missing dependencies in the selector function — it does **not** prevent inline selectors. A developer can still write:

```typescript
// This passes Qwen's lint rule but defeats the optimization
const station = useBootcampSelector(state => state.template?.stations[props.stationIndex]);
```

**The correct enforcement requires a custom lint rule or a code review checklist item.** Since a custom ESLint rule is out of scope for this planning phase, mandate it as a PR review gate instead:

```markdown
<!-- .github/PULL_REQUEST_TEMPLATE/bootcamp_builder.md — NEW -->
## useBootcampSelector Checklist
- [ ] All `useBootcampSelector` calls use a selector defined via `useCallback` or at module scope
- [ ] No inline arrow functions passed directly to `useBootcampSelector`
- [ ] Array selectors provide a custom equality function (not default shallowEqual)
```

This is not a perfect solution, but it's honest. A lint rule that only catches half the problem is worse than a documented checklist because it creates false confidence.

---

## Gap 3: `BootcampPatch` Type Is Undefined — Everything Depends on It

**Severity:** 🔴 SEV-1 — Blocks all hook implementation

Both reviewers have referenced `BootcampPatch` across 8 files without defining it. This type is the **contract between `useBootcampAI`, `useBootcampState`, `useBootcampHistory`, and the server API**. It must be defined before any hook is implemented.

```typescript
// types/BootcampPatch.ts — NEW FILE, ~60 lines
// This is the single most important type in the entire feature

export type PatchOperation =
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'move'; from: string; path: string };

export interface BootcampPatch {
  id: string;                          // UUID — for in-flight tracking
  operations: PatchOperation[];        // JSON Patch RFC 6902 format
  source: 'manual' | 'ai' | 'system'; // For history tagging (Qwen's requirement)
  description: string;                 // Human-readable for undo UI
  timestamp: number;
  
  // AI patches only — undefined for manual edits
  aiContext?: {
    promptSummary: string;             // What the trainer asked
    confidenceScore: number;           // 0-1, from AI response
    affectedStations: number[];        // Which station indices changed
  };
}

// Path conventions — document these or patches will be inconsistent
// '/stations/0/exercises/2/name'       → exercise name
// '/stations/0/exercises/2/setupTime'  → setup time
// '/stations/0'                        → entire station (add/remove)
// '/classStyle'                        → top-level class style change
// '/duration'                          → total duration

export type BootcampPatchResult = 
  | { success: true; appliedPatch: BootcampPatch }
  | { success: false; error: string; inversePatch: BootcampPatch };
```

**Why RFC 6902 JSON Patch format:** It gives us `computeInversePatch` for free via libraries like `fast-json-patch`. It's also the format the server should accept, making the API contract explicit. Do not invent a custom patch format.

**Required addition to `package.json`:**
```json
"fast-json-patch": "^3.1.1"
```

---

## Gap 4: `BootcampBuilderModal.tsx` Needs a Defined Interface

**File:** `components/BootcampBuilder/BootcampBuilderModal.tsx` — referenced but not specified
**Severity:** 🟡 SEV-3

Qwen introduced this file as the modal wrapper that swaps navigation to `useBootcampNavigationLocal`. It needs a defined interface so implementers don't make it a god component:

```typescript
// components/BootcampBuilder/BootcampBuilderModal.tsx — ~40 lines MAX
// This is a THIN wrapper — no business logic

interface BootcampBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: BootcampTemplate) => void;
  initialTemplate?: BootcampTemplate;  // For editing existing bootcamps
}

export function BootcampBuilderModal({ isOpen, onClose, onSave, initialTemplate }: BootcampBuilderModalProps) {
  const navigation = useBootcampNavigationLocal(); // Swaps URL → local state
  
  if (!isOpen) return null;
  
  return (
    <Modal onClose={onClose} size="fullscreen">
      <BootcampBuilderPage
        navigationStore={navigation}  // Injected — page doesn't know it's in a modal
        initialTemplate={initialTemplate}
        onSave={(template) => { onSave(template); onClose(); }}
      />
    </Modal>
  );
}
```

**This requires one change to `BootcampBuilderPage`:** Accept `navigationStore` as an optional prop. If provided, use it. If not, default to `useBootcampNavigationURL()`. This is the dependency injection pattern that makes the modal wrapper thin.

---

## Final Definitive File Manifest

```
frontend/src/
├── types/
│   └── BootcampPatch.ts                          # NEW — SEV-1 gap closed
├── hooks/
│   ├── utils/
│   │   └── useLatest.ts                          # Shared utility
│   ├── useBootcampState.ts                       # Master state + patch application
│   ├── useBootcampSelector.ts                    # Context selector (corrected)
│   ├── useBootcampGeneration.ts                  # AI Hive Mind generation
│   ├── useBootcampAI.ts                          # Conversational tweaks
│   ├── useBootcampFlow.ts                        # Pure flow computation
│   ├── useBootcampPDF.ts                         # PDF export
│   ├── useBootcampHistory.ts                     # Unified undo/redo
│   ├── useBootcampNavigationURL.ts               # URL-backed navigation
│   └── useBootcampNavigationLocal.ts             # Local state navigation
├── components/BootcampBuilder/
│   ├── index.ts                                  # Barrel
│   ├── BootcampBuilderPage.tsx                   # Orchestrator
│   ├── BootcampBuilderModal.tsx                  # Thin modal wrapper
│   ├── BootcampConfigPanel.tsx                   # Left pane
│   ├── BootcampInjuryFlags.tsx                   # Extracted from ConfigPanel
│   ├── BootcampClassPreview.tsx                  # Center pane
│   ├── BootcampAIInsights.tsx                    # Right pane (stateless)
│   ├── BootcampStationCard.tsx                   # Station card
│   ├── BootcampExerciseRow.tsx                   # Exercise row
│   ├── ExerciseModBadges.tsx                     # Extracted from ExerciseRow
│   ├── BootcampStretchModule.tsx                 # Stretch warm-up
│   ├── BootcampClassStyleConfig.tsx              # Merged Pyramid + Superset
│   ├── BootcampBoardToggle.tsx                   # Board toggle (kept separate)
│   ├── BootcampTimeline.tsx                      # Timeline (kept separate)
│   ├── BootcampFlowWarning.tsx                   # Flow warning banner
│   ├── BootcampErrorBoundaries.tsx               # Three-pane isolation
│   └── styles/
│       ├── BootcampTokens.ts                     # Design tokens (renamed + expanded)
│       ├── BootcampConfigStyles.ts               # Left pane styles
│       ├── BootcampPreviewStyles.ts              # Center pane styles
│       └── CoachAssistantStyles.ts               # Right pane styles
└── .github/PULL_REQUEST_TEMPLATE/
    └── bootcamp_builder.md                       # Selector checklist gate
```

**Final file count: 29 files.** Three more than Qwen's Round 2 snapshot, all justified by closed gaps.

---

## Architecture Decision Record — Locked

| Decision | Ruling | Rationale |
|----------|--------|-----------|
| Hook chain | New `useBootcampAI` bridge, no `useCoachAssistant` embed | Domain mismatch, separate endpoint |
| State ownership | Three-hook architecture: state / generation / AI | Single source of truth in `useBootcampState` |
| Context performance | `useBootcampSelector` with `shallowEqual` default | Prevents full-tree re-renders |
| Navigation storage | Abstracted via `NavigationStore` interface | URL default, local for modal |
| Patch format | RFC 6902 JSON Patch via `fast-json-patch` | Inverse patches, server contract |
| Optimistic updates | Apply immediately, inverse-patch rollback | Concurrent-edit safe |
| Undo/redo scope | Unified stack, `source` tagged | AI and manual edits both undoable |
| File count | 29 files | Justified by complexity tier |
| Error boundaries | Three-pane isolation, streaming recovery | AI failures never crash builder |
| Inline selector prevention | PR checklist gate | ESLint insufficient alone |

**Phase 0 decomposition: CLEARED TO BEGIN.**
**Phase 1 feature code: CLEARED pending `BootcampPatch.ts` type definition completion.**
