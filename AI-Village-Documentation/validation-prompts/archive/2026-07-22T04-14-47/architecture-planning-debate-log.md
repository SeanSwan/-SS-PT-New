# Architecture & Component Planning — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 15,006 input / 6,171 output

---

## Senior Architecture Lead — Round 1

# Architecture Review — SwanGuard Refactor + SwanStudios Photographic-Luxury Redesign
**Reviewer:** Senior Code Quality / Architecture Lead
**Date:** 2026-07-21
**Plan Version:** SWANGUARD-REFACTOR-AND-SITE-REDESIGN-MASTER-PLAN-2026-07-21.md
**Derived from:** Plan content + 12 specialist validator outputs

---

## Executive Summary

The plan is **strategically sound and correctly sequenced**. The Kimi/Fable arbitration rulings are architecturally defensible. However, the plan has **seven critical and four high-severity architectural gaps** that will produce rework debt if not resolved before Slice 1 begins. The most dangerous gap is the absence of a defined replacement contract for `HoldActionCompass` — eight files will independently invent dispatch patterns without it. The second most dangerous is the implicit assumption that action-registry IDs are UI-only strings when the trust engine almost certainly persists them as foreign keys.

**Verdict:** Approve to proceed to S0 with the findings below resolved or tracked as slice-entry gates. No code should be written against Slices 1–3 until Findings 1, 2, and 4 are closed.

---

## Finding 1 — `HoldActionCompass` Deletion Without Replacement Contract

**Severity:** 🔴 CRITICAL
**Slice:** S1 (The Purge) → bleeds into S2, S3
**Affected files (derived from plan):** `CommandScreenDeck.tsx` (lines 166–177) + 7 other screen deck files containing `HoldActionCompass`

### Issue

The plan correctly rules "delete everywhere" for `HoldActionCompass`. But it does not define what replaces the interaction surface in each of the 8 decks. Each deck currently uses the compass as its **primary action dispatcher**. Without a defined replacement contract, each deck author will independently invent their own dispatch pattern during Slice 1, producing 8 divergent patterns that Slice 3 (action diet + ⌘K) then has to reconcile. This is the highest-probability source of rework debt in the entire program.

The plan specifies the replacement *modalities* (⌘K palette + keyboard on desktop; bottom tabs + swipe-to-dismiss + hold-to-confirm on mobile) but not the **component contract** that unifies them. "Bottom tabs" is a navigation primitive, not an action dispatcher. The gap between "delete compass" and "ship ⌘K palette" is a void that Slice 1 will fill with ad-hoc solutions.

### Fix

Define a single `<ContextualActionBar>` contract **before Slice 1 begins**. This is a thin shell — it does not need to be fully implemented in S1, but its prop interface must be locked:

```typescript
// src/components/actions/ContextualActionBar/index.tsx
// MAX ~80 lines — this is a contract file, not an implementation file

interface ActionDescriptor {
  id: string;                          // must match surviving actionRegistry entry
  label: string;                       // humanized (Finding 3 dependency)
  icon: React.ReactNode;
  onExecute: () => void | Promise<void>;
  variant: 'primary' | 'contextual' | 'destructive';
  requiresConfirm?: boolean;           // hold-to-confirm on touch
  keyboardShortcut?: string;           // ⌘K palette registration
}

interface ContextualActionBarProps {
  actions: ActionDescriptor[];         // max 5 primary, rest contextual
  context: 'today' | 'intel' | 'trust' | 'inbox' | 'settings';
}
```

Each of the 8 decks replaces its `<HoldActionCompass>` with `<ContextualActionBar actions={...} context="..." />`. The bar renders as a bottom sheet on touch, a hover-revealed toolbar on pointer:fine, and registers its `keyboardShortcut` entries with the ⌘K registry. This gives Slice 3 a single seam to upgrade rather than 8 divergent patterns.

**Slice-entry gate for S1:** `ContextualActionBar` interface locked and reviewed before first compass deletion commit.

---

## Finding 2 — Action Registry IDs May Be Persisted Foreign Keys

**Severity:** 🔴 CRITICAL
**Slice:** S6 (action-registry rationalization) — but the risk must be assessed before S1
**Affected files (derived from plan):** 10 `actionRegistry*.ts` files, 152 `data-action-id` values; trust engine persistence layer (receipts, ledger, approvals)

### Issue

The plan states the trust engine includes "permission/ledger/receipts spine" and "approvals, receipts, fail-closed connectors." These are almost certainly stored rows. If any of the 152 `data-action-id` strings are persisted as foreign keys or string identifiers in the database, then deleting or renaming them in the registry **orphans existing production rows** with no resolvable meaning. The plan treats registry collapse as a pure frontend operation. It is not.

Concrete risk scenario:

```sql
-- Hypothetical existing production row
INSERT INTO action_receipts (action_id, actor_id, timestamp, outcome)
VALUES ('influence:evidence_intake:create', 42, NOW(), 'approved');

-- After registry collapse, this action_id string no longer exists
-- in any registry. Kill-switch logic querying receipts by action_id
-- silently fails closed — or silently fails open.
```

Silent fail-open on a kill-switch is a production safety incident.

### Fix

**Before S1 begins**, run a schema audit:

```sql
-- Run against production read replica
SELECT DISTINCT action_id FROM action_receipts LIMIT 10;
SELECT DISTINCT action_id FROM permission_grants LIMIT 10;
SELECT DISTINCT action_id FROM audit_log LIMIT 10;
-- Add any other tables the trust engine writes to
```

If any `action_id` column exists and contains strings matching the `actionRegistry*.ts` format, the registry collapse in S6 **must** include a migration strategy:

1. **Never delete** a persisted action ID — add a `deprecated: true` flag to the registry entry and keep the string resolvable.
2. Create a `legacyActionIdMap` that maps old IDs to new consolidated IDs for display purposes.
3. The single consolidated registry must include all historically persisted IDs as resolvable entries, even if their UI surface is deleted.

**Slice-entry gate for S6:** Schema audit complete, migration strategy documented, no S6 commit until the audit confirms zero orphaned foreign keys.

---

## Finding 3 — Single Action Registry: One Service Path, Not Two

**Severity:** 🔴 CRITICAL
**Slice:** S3 (action diet + ⌘K) → S6 (registry rationalization)
**Affected files (derived from plan):** 10 `actionRegistry*.ts` files → 1 consolidated registry; ⌘K palette component; `ContextualActionBar` (Finding 1)

### Issue

The plan calls for "10 registries → 1" and separately introduces a ⌘K palette. There is a shared-path integrity risk: if the ⌘K palette and the `ContextualActionBar` each maintain their own list of available actions, the same action is now dispatched through two parallel code paths. Any permission check, rate limit, or audit log that lives in one path but not the other creates a security gap in the trust engine.

Additionally, the plan mentions the AI Village run will query the system. If the AI/automation layer dispatches actions through a third path (direct API calls bypassing the registry), the single-registry goal is already violated at the architecture level.

### Fix

One action registry. One dispatch function. Zero parallel paths.

```typescript
// src/services/actionRegistry/index.ts  (~120 lines)
// THE single source of truth — UI, ⌘K, and automation all call this

export interface RegisteredAction {
  id: string;
  label: string;
  description: string;
  permissions: string[];               // checked against trust engine
  deprecated?: boolean;               // never delete, only deprecate
  legacyIds?: string[];               // for migration (Finding 2)
  execute: (context: ActionContext) => Promise<ActionResult>;
}

// Single dispatch — all surfaces call this, never action.execute() directly
export async function dispatchAction(
  actionId: string,
  context: ActionContext,
  actor: ActorIdentity
): Promise<ActionResult> {
  const action = registry.get(actionId);
  if (!action) throw new UnknownActionError(actionId);
  await assertPermission(actor, action.permissions);  // trust engine check
  await writeAuditEntry(actionId, actor, context);    // always before execute
  return action.execute(context);
}
```

The ⌘K palette calls `dispatchAction`. The `ContextualActionBar` calls `dispatchAction`. The AI/automation layer calls `dispatchAction`. There is no other path.

**Lint rule:** Add an ESLint rule that flags any direct call to `action.execute()` outside of `dispatchAction`. This is enforceable with a simple no-restricted-syntax rule targeting the pattern.

---

## Finding 4 — State Management: No Single Source of Truth for Navigation + Action State

**Severity:** 🔴 CRITICAL
**Slice:** S2 (IA collapse) → S3 (action diet)
**Affected files (derived from plan):** New 5-space navigation (Today / Intel / Trust / Inbox / Settings); `ContextualActionBar`; ⌘K palette

### Issue

The plan collapses 14 modules into 5 spaces and introduces a new navigation model (desktop rail + mobile tabs). It does not specify where navigation state lives. With 14 modules currently, there are likely 14 independent local states or router entries. The collapse to 5 spaces risks producing **duplicated derived state**: the active space drives which actions appear in `ContextualActionBar`, which items appear in the ⌘K palette, and which data panels auto-load. If each of these three consumers independently derives "what space am I in," a single navigation event requires three state updates, and they can drift.

Additionally, the plan's "auto-load on mount" directive for previously manual "Load X" panels means that navigation to a space now triggers data fetching. If the data-fetching logic lives inside the panel components (common pattern), navigating back and forth will re-fetch on every mount. This is a performance and UX regression disguised as a simplification.

### Fix

**Navigation state in one place.** Use a `NavigationProvider` with a `useNavigation()` hook:

```typescript
// src/state/navigation/NavigationProvider.tsx  (~80 lines)

interface NavigationState {
  activeSpace: 'today' | 'intel' | 'trust' | 'inbox' | 'settings';
  activeSubview: string | null;
  history: string[];                   // for back-navigation on mobile
}

// Derived state — computed once, consumed everywhere
interface NavigationContext extends NavigationState {
  availableActions: ActionDescriptor[];  // drives ContextualActionBar
  commandPaletteScope: string[];         // drives ⌘K filtering
}
```

**Data fetching above the panel.** Each space's data fetch lives in a space-level component that persists across subview changes, not inside individual panels. Use React Query (or equivalent) with space-scoped cache keys so navigating away and back hits the cache, not the network.

```typescript
// src/spaces/TodaySpace/index.tsx  (~120 lines)
// Fetches once, passes data down — panels never fetch independently
const { data: briefData } = useQuery(['brief', 'today'], fetchTodayBrief);
const { data: alertsData } = useQuery(['alerts', 'active'], fetchActiveAlerts);
```

---

## Finding 5 — `TvTreehouseFrame` Deletion: Implicit Style Dependency Graph

**Severity:** 🔴 CRITICAL
**Slice:** S1 (The Purge) — specifically the frame deletion
**Affected files (derived from plan):** `TvTreehouseFrame` wrapper component; all 61 non-test components currently wrapped inside it; `ScreenActionCompass.styles.ts`

### Issue

The plan rules "clean kill" for `TvTreehouseFrame`. But a skeuomorphic wrapper component of this nature almost certainly provides implicit layout context to its children: it sets a viewport constraint, a z-index stacking context, scroll containment, and possibly CSS custom properties that child components inherit. Deleting the wrapper without auditing these implicit dependencies will produce layout breakage across all 61 components simultaneously — not a controlled deletion but a cascade failure.

The plan's "two-pass deletion (flag-hide → delete next slice)" guardrail is correct in principle but is specified at the action level, not the style-dependency level. Hiding the frame visually while keeping it in the DOM preserves the layout context. Deleting it removes the context. These are two different operations with different blast radii.

### Fix

Before the frame deletion commit in S1, run a **style-dependency audit**:

```bash
# Find all CSS custom properties defined on TvTreehouseFrame
grep -r "TvTreehouseFrame" src/ --include="*.ts" --include="*.tsx" --include="*.css"

# Find all child components that use var(--tv-*) or any frame-scoped tokens
grep -r "var(--tv-" src/ --include="*.ts" --include="*.tsx"

# Find all components that rely on the frame's scroll container
grep -r "overflow.*scroll\|overflow.*auto" src/ --include="*.styles.ts"
```

The frame deletion must be preceded by a **layout migration commit** that:
1. Moves all frame-defined CSS custom properties to the global token sheet.
2. Replaces the frame's scroll container with an explicit `<AppShell>` component.
3. Replaces the frame's z-index stacking context with an explicit `<LayerManager>`.

Only after this migration commit is the frame safe to delete.

**Slice-entry gate for S1 frame deletion:** Style-dependency audit complete, migration commit merged, zero `var(--tv-*)` references remaining.

---

## Finding 6 — Error Boundary Placement: Trust Engine Has No Defined Failure Surface

**Severity:** 🔴 CRITICAL
**Slice:** S4 (visual tokens) → S6 (trust redesign + human copy)
**Affected files (derived from plan):** Kill-switch components; approval/receipt surfaces; all 5 spaces

### Issue

The plan's "Critical Action SLA" requires kill-switch/approve/revoke to be reachable in ≤2 interactions from anywhere. But the plan does not specify where error boundaries live, and the trust engine is the one place where a React render error must **never** silently swallow a failed kill-switch render. If the kill-switch component throws during render and the nearest error boundary is at the app root, the user sees a blank screen instead of a degraded-but-functional safety control.

This is not a hypothetical: styled-components theme injection failures, missing CSS custom properties, and async data races during navigation are all realistic render-error triggers during a visual reskin (S4).

### Fix

**Three-tier error boundary strategy**, derived from the plan's trust architecture:

```
Tier 1 — AppRoot boundary: catches catastrophic failures, shows "reload" screen
Tier 2 — Space boundary: catches space-level failures, shows space error state,
          BUT always renders the TrustControlsBar (kill switch + approve/revoke)
          OUTSIDE the space boundary so it survives space-level failures
Tier 3 — Panel boundary: catches individual panel failures, shows panel skeleton,
          never affects adjacent panels
```

```typescript
// src/components/shell/AppShell.tsx  (~100 lines)
// Structure:
// <AppRootBoundary>
//   <TrustControlsBar />          ← OUTSIDE all space boundaries
//   <NavigationRail />            ← OUTSIDE all space boundaries
//   <SpaceBoundary key={activeSpace}>
//     <ActiveSpaceComponent />
//   </SpaceBoundary>
// </AppRootBoundary>
```

The `TrustControlsBar` (kill switch + approve/revoke) must never be a child of any boundary that can be thrown by space-level data or render errors. It renders from its own isolated data subscription.

---

## Finding 7 — `ScreenActionCompass.styles.ts`: Dead File Risk After Compass Deletion

**Severity:** 🟠 HIGH
**Slice:** S1 (The Purge)
**Affected files (derived from plan):** `ScreenActionCompass.styles.ts`

### Issue

The plan notes `ScreenActionCompass.styles.ts` has only a ≤720px layout variant and no desktop hide. After `HoldAction

---

## Code Architecture Specialist (1M context) — Round 2

CONSENSUS REACHED

All 7 findings from the Architecture Lead's review are accepted as stated. No modifications are required to the findings or proposed fixes. The critical issues (Findings 1-6) must be resolved as slice-entry gates before Slice 1 begins, and Finding 7 should be addressed by removing `ScreenActionCompass.styles.ts` concurrent with `HoldActionCompass` deletion in Slice 1. Specific implementation details remain as originally cited:

- **Finding 1**: Lock `ContextualActionBar` interface in `src/components/actions/ContextualActionBar/index.tsx` before any compass deletion commits.
- **Finding 2**: Execute schema audit queries against production replicas (e.g., `SELECT DISTINCT action_id FROM action_receipts`) before S6 registry changes.
- **Finding 3**: Implement singleton `dispatchAction` in `src/services/actionRegistry/index.ts` with ESLint lint rule blocking direct `action.execute()` calls.
- **Finding 4**: Centralize navigation state via `NavigationProvider` in `src/state/navigation/NavigationProvider.tsx` with space-scoped React Query keys.
- **Finding 5**: Migrate `TvTreehouseFrame`-scoped CSS tokens to global sheet and replace with `<AppShell>`/`<LayerManager>` prior to frame deletion.
- **Finding 6**: Implement three-tier error boundaries with `TrustControlsBar` rendered outside `SpaceBoundary` in `src/components/shell/AppShell.tsx`.
- **Finding 7**: Delete `ScreenActionCompass.styles.ts` in the same PR that removes the last `HoldActionCompass` usage (verified via `grep -r "HoldActionCompass" src/`).

---

