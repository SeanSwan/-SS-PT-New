# Architecture Planning Consensus

> Phase 2B: Claude Sonnet 4.6 ↔ Nemotron 3 Super
> Consensus: YES

---

CONSENSUS REACHED

All findings and fixes from the Senior Architecture Lead's Round 1 are accepted as specified. No modifications or alternatives are required. The agreed-upon items are:

1. **LensPlanFrame Boundary Ambiguity**: Implement the exact contract (props, forbidden patterns) and file split (`LensPlanFrame.tsx`, `LensPlanFrame.styles.ts`, `LensPlanFrame.contract.ts`) as detailed.
2. **Custom Chart State**: Adopt the state machine (`CustomChartStatus`, `CustomChart` interface) and hook separation (`useCoachChat`, `useCustomCharts`, `useDashboardPins`) with single-source-of-truth enforcement.
3. **Shared Write Path**: Enforce the "SHARED WRITE PATH LAW" across all packs, routing all writes through `/api/workouts/...` with role-based headers and pending flags.
4. **Workout Logger File Budget**: Implement the specified folder structure, file limits (e.g., `WorkoutLogger.tsx` ≤120 lines, `useWorkoutSession.ts` ≤200 lines), and hard rules (no nested `LensPlanFrame`, session hook as sole API caller).
5. **Capability Manifest Schema**: Export `SurfaceCapabilityManifest` interface in `capability-manifest.schema.ts` (≤80 lines) with forbidden fields (layout, raw colors, free version numbers).
6. **Coach Hook Decomposition**: Split `useCoachState` into `useCoachSession` (≤200 lines), `useCoachMessages` (≤200 lines), `useCoachCost` (≤150 lines), and `useVoiceInput` (≤150 lines) with strict import boundaries.
7. **Naming Streamline Enforcement**: Implement `canonical-surface-names.ts` (≤100 lines) as the machine-readable single source of truth for routes, test IDs, and aria-labels.
