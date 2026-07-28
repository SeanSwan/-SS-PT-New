# Architecture & Component Design — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-sonnet-4.6 | **Duration:** 95.1s
> **Files:** docs/ai-workflow/AI-HANDOFF/SWANGUARD-REFACTOR-AND-SITE-REDESIGN-MASTER-PLAN-2026-07-21.md
> **Generated:** 7/21/2026, 9:14:47 PM

---

# Architectural Review: SWANGUARD-REFACTOR-AND-SITE-REDESIGN-MASTER-PLAN-2026-07-21

**Reviewer:** Senior React/TypeScript Architect
**Date:** 2026-07-21
**Plan Status:** Pre-build (no code written yet against this plan)
**Scope:** Both workstreams as described — deriving all findings from plan content only.

---

## Executive Summary

The plan is **strategically sound** and shows mature product thinking. The Kimi arbitration rulings are architecturally correct (delete > hide, gesture-gating by pointer capability not viewport width, single action registry). However, the plan has **significant architectural gaps** at the implementation level: it describes *what* to build but leaves critical *how* decisions unresolved in ways that will cause rework during slices 1–8. The photographic-luxury workstream (W2) has a near-total absence of technical specification, which is appropriate given the P0 gate — but the few technical claims it does make need scrutiny now.

**Overall verdict:** Approve to proceed to S0/P0 with the findings below resolved or tracked as slice-entry gates.

---

## Workstream 1 — SwanGuard Refactor

---

### Finding W1-01
**Severity:** 🔴 CRITICAL
**Component/File:** `CommandScreenDeck.tsx` (lines 166–177) + all 8 screen decks containing `HoldActionCompass`
**Issue — Component Decomposition:**
The plan correctly identifies `HoldActionCompass` renders unconditionally in 8 files. The proposed fix ("delete everywhere") is right, but the plan does not specify *what replaces the interaction surface in each deck*. Each deck currently uses the compass as its primary action dispatcher. Deleting it without a defined replacement contract means 8 files will independently invent their own action-dispatch patterns during Slice 1, producing 8 divergent patterns that Slice 3 (action diet) then has to reconcile. This is the most likely source of rework debt in the entire program.

**Recommended Fix:**
Before Slice 1 begins, define a single `<ContextualActionBar>` contract (props: `actions: ActionDescriptor[], context: DeckContext`) that all 8 decks will receive. The compass deletion and the replacement insertion become a single atomic change per deck. This contract should be the *first* file created in Slice 1, not discovered during it. The `ActionDescriptor` type should be the seed of the single consolidated registry (Slice 6 goal pulled forward as a type-only artifact).

```typescript
// Proposed contract — define before Slice 1 starts
interface ActionDescriptor {
  id: string; // survives from existing data-action-id
  label: string; // humanized (Slice 3 fills this in)
  intent: 'primary' | 'secondary' | 'destructive' | 'contextual';
  handler: () => void;
  shortcut?: string; // ⌘K palette registration
  touchGesture?: 'swipe-right' | 'swipe-left' | 'hold'; // mobile only
}
```

---

### Finding W1-02
**Severity:** 🔴 CRITICAL
**Component/File:** 10 `actionRegistry*.ts` files → proposed single registry
**Issue — State Management / Circular Dependencies:**
The plan calls for collapsing 10 action registries into 1 (Slice 6). The current architecture has 152 `data-action-id` entries distributed across registries. If those registries are currently imported by components (likely — they're registries), and the new single registry is built by merging them, there is a high probability of circular import chains: `ComponentA → registryA → registryB → ComponentB → registryA`. The plan does not address this.

Additionally, the plan's "action diet" (152 → ~60 contextual survivors) implies the registry becomes *dynamic* — actions registered at mount, deregistered at unmount — rather than a static map. A static-to-dynamic registry migration is a significant state management change that the plan treats as a Slice 6 detail but which affects every slice before it.

**Recommended Fix:**
Decide the registry architecture *now*, before Slice 1:

**Option A (simpler, recommended):** Registry stays static. It is a pure data file (`actionManifest.ts`) with no imports from components. Components import from it; it never imports from components. The ⌘K palette reads from it. This is achievable and eliminates circular risk.

**Option B (dynamic):** Registry is a React context (`ActionRegistryContext`) populated via `useRegisterActions(actions[])` hook at mount. This is the correct pattern for contextual actions but requires the context to exist from Slice 1 onward. If chosen, the context provider must wrap the app shell in Slice 1, not Slice 6.

The plan's current sequencing (delete registries in Slice 6, build ⌘K in Slice 3) is **incompatible** — ⌘K needs a registry to read from. Slice 3 must either use Option A's static manifest or Option B's context, and that decision gates Slice 3 design.

---

### Finding W1-03
**Severity:** 🟠 HIGH
**Component/File:** `TvTreehouseFrame` wrapper component
**Issue — Component Decomposition / Data Flow:**
The plan calls for a "clean kill" of `TvTreehouseFrame`. The audit notes it wraps "the whole workspace." If it is a layout wrapper (renders children), deletion is straightforward. However, if it also provides context values (theme tokens, era state, layout measurements) to descendants — which is architecturally likely given it has era buttons (`oak-1984`/`graphite-1996`/`glass-2026`) that presumably affect child rendering — then deleting it without auditing its context surface will cause runtime errors in Slice 1.

The plan does not include a "what does TvTreehouseFrame provide to its children" audit step.

**Recommended Fix:**
Add to Slice 0 (hygiene): grep for `useTvTreehouse`, `TvTreehouseContext`, and any context consumers before deletion. The `glass-2026` material tokens the plan wants to salvage are almost certainly provided via this context. Extract those tokens to the new design token file *before* deleting the frame. Sequence: extract tokens → verify no consumers remain → delete frame. This is a two-commit operation, not one.

---

### Finding W1-04
**Severity:** 🟠 HIGH
**Component/File:** All "Load X" panels (auto-load migration, Slice 1)
**Issue — Data Flow / Race Conditions:**
The plan converts manual "Load X" buttons to auto-load on mount. With 14+ modules collapsing to 5 spaces, and multiple intelligence feeds (civic, comment, influence, wiki, readiness), auto-loading everything on mount means the Today screen will fire 6–10 concurrent data fetches on first render. The plan does not address:

1. **Waterfall vs. parallel fetch strategy** — are these independent feeds or do some depend on others (e.g., does Readiness depend on Trust state)?
2. **Stale-while-revalidate policy** — the plan mentions "refresh affordance" but not cache TTLs. Without this, every navigation to Today re-fires all fetches.
3. **Error isolation** — if the Civic Intel feed fails, does it block the Morning Brief render? The plan's "fail-closed connectors" safety architecture suggests some feeds are safety-critical; those need different error handling than informational feeds.

**Recommended Fix:**
Before Slice 1, classify all auto-loading feeds into three tiers:
- **Safety-critical** (kill switch state, owner grants, trust status): load first, block render if failed, never stale
- **Primary content** (Morning Brief, daily brief): load in parallel, show skeleton, degrade gracefully
- **Supplementary** (marketplace, impact): lazy-load on scroll/tab activation, not on mount

This classification should be a comment block in the new data-fetching hook architecture, not discovered during implementation. Recommend a `useFeedOrchestrator` hook that encodes this priority — prevents the race condition where a slow supplementary feed delays the safety-critical status display.

---

### Finding W1-05
**Severity:** 🟠 HIGH
**Component/File:** New navigation component (Slice 2 — desktop rail + mobile tabs)
**Issue — React Patterns / Unnecessary Re-renders:**
The plan specifies "desktop rail + mobile tabs" with gesture-gating by `(hover:hover) and (pointer:fine)` rather than viewport width. This is architecturally correct. However, the implementation risk is that the pointer-capability check is typically done via a media query match (`window.matchMedia`), and if this is stored in component state rather than a stable hook, every pointer-capability change (e.g., user plugs in a mouse to a touch device) will re-render the entire navigation tree.

Additionally, the plan's IA collapse (14 → 5 spaces, with Creator Board/Marketplace/Impact behind feature flags) means the nav component will conditionally render items based on flag state. If flag state lives in a context that also contains other frequently-updating values (e.g., unread counts), nav will re-render on every unread count change.

**Recommended Fix:**

```typescript
// Separate stable capability detection from volatile nav state
const usePointerCapability = () => {
  // Returns stable ref — only changes on actual device capability change
  // NOT on every render
  return useMemo(() => ({
    isFinePointer: window.matchMedia('(hover:hover) and (pointer:fine)').matches,
    isTouchPrimary: window.matchMedia('(hover:none) and (pointer:coarse)').matches,
  }), []); // intentionally empty deps — capability is stable per session
};

// Feature flags in their own context, separate from nav state
// Nav subscribes only to flag context, not to unread/notification context
```

The nav component itself should be `React.memo`-wrapped with a custom comparator that ignores unread count changes.

---

### Finding W1-06
**Severity:** 🟠 HIGH
**Component/File:** Slice 5 — "Morning Brief" signature moment component
**Issue — File Budget (300-line cap):**
The plan describes the Morning Brief as a "photographic Morning Brief as the signature moment" with a "family watchtower at night" visual identity. Based on the described complexity (photographic background, editorial serif display, daily brief content, readiness status card, alert surfacing), this component will almost certainly exceed 300 lines if built as a single file. The plan does not decompose it.

**Recommended Fix:**
Pre-decompose before Slice 5 begins:

```
MorningBrief/
  index.tsx              (~80 lines — composition only)
  MorningBriefHero.tsx   (~120 lines — photo bg + headline)
  BriefContent.tsx       (~150 lines — brief items + readiness card)
  AlertSurface.tsx       (~100 lines — safety-critical alerts)
  useMorningBrief.ts     (~80 lines — data fetching hook)
  morningBrief.styles.ts (~100 lines — styled-components)
```

The `AlertSurface` component specifically needs its own **error boundary** (see W1-09) because it surfaces safety-critical information — a render error in the brief content must not suppress alerts.

---

### Finding W1-07
**Severity:** 🟡 MEDIUM
**Component/File:** ⌘K palette (Slice 3)
**Issue — Hook Design:**
The plan specifies a ⌘K command palette as the desktop replacement for the gesture compass. Command palettes have three distinct concerns that are frequently collapsed into one hook, causing re-render problems:

1. **Open/close state** (UI state — changes on keypress)
2. **Search query** (UI state — changes on every keystroke)
3. **Action list** (business logic — derived from registry + current context)
4. **Filtered results** (derived state — expensive computation)

If these live in one `useCommandPalette` hook, every keystroke re-computes the full action list derivation.

**Recommended Fix:**

```typescript
// Separate into three hooks with clear boundaries:
useCommandPaletteVisibility()  // UI state only: isOpen, open(), close()
useCommandPaletteSearch()      // UI state only: query, setQuery, clearQuery
useCommandPaletteActions(      // Business logic: reads registry, current context
  context: DeckContext          // returns stable filtered list via useMemo
)                               // useMemo deps: [registry, context.spaceId, query]
                                // NOT: [isOpen] — list should be pre-computed
```

The filtered results should use `useMemo` with the query as a dependency, and the action list derivation (registry + context) should be memoized separately so a query change doesn't re-derive the full action list.

---

### Finding W1-08
**Severity:** 🟡 MEDIUM
**Component/File:** Trust/Owner space — kill switches, approve/revoke actions
**Issue — Data Flow / Stale State:**
The plan specifies a **Critical Action SLA**: kill switch / approve / revoke ≤2 interactions from anywhere. This implies these actions must be accessible from any space (Today, Intel, Family, Inbox, Settings). The data flow risk is: if kill-switch state is fetched once on app load and cached, a state change made from the Owner space (e.g., revoking a permission) may not be reflected in the Today space's safety status display until a full refresh.

The plan's "fail-closed connectors" architecture suggests this is a known concern at the trust-engine level, but the React data flow for reflecting trust-state changes across spaces is not addressed.

**Recommended Fix:**
Trust/safety state must be in a **single source of truth** — a React context or a dedicated query with aggressive invalidation. When any kill-switch or grant mutation completes, it must invalidate *all* consumers of trust state, not just the local component. If using React Query or SWR (not specified in plan), this is `queryClient.invalidateQueries(['trust-state'])`. If using custom hooks, the trust state hook must use a shared atom/context, not local state. This is a Slice 0 architectural decision, not a Slice 6 detail.

---

### Finding W1-09
**Severity:** 🟡 MEDIUM
**Component/File:** Error boundary placement — not addressed in plan
**Issue — Error Boundaries:**
The plan has no error boundary strategy. Given the safety-critical nature of SwanGuard (kill switches, family trust), error boundary placement is not optional.

**Recommended Fix — Error boundary map:**

| Boundary | Location | Behavior |
|---|---|---|
| **App-level** | Root `App.tsx` | Full-page fallback with "SwanGuard is unavailable" + support contact |
| **Safety-critical** | `AlertSurface`, `KillSwitchPanel`, `GrantApproval` | Fail-OPEN display: show "Safety controls unavailable — contact owner" — never silently hide |
| **Space-level** | Each of the 5 spaces (Today, Intel, Trust, Inbox, Settings) | Space-level error shows error card within shell; other spaces remain functional |
| **Morning Brief** | `MorningBriefHero` | Degrade to text-only brief; photo failure must not suppress content |
| **Intel feeds** | Each feed component (Civic, Comment, Influence) | Per-feed error card; other feeds continue rendering |

The safety-critical boundaries specifically must **not** use the same fallback as content boundaries. A blank screen where kill switches should be is worse than an error message.

---

### Finding W1-10
**Severity:** 🟡 MEDIUM
**Component/File:** Slice 0 — "clean tree claim" / uncommitted modifications
**Issue — State Management (build state, not React state):**
The plan notes "tree currently has uncommitted modifications (apps/api config/tests, App.tsx, action registries) — another agent's in-flight work." The plan says "Refactor must claim a clean state first (Rule 67 discipline applies)." This is correct, but the plan does not specify *how* to handle the in-flight work:

- Stash and discard? (Risk: loses potentially valid work)
- Stash and re-apply after Slice 1? (Risk: merge conflicts on files Slice 1 modifies)
- Commit as-is with a "WIP" tag? (Risk: pollutes the clean baseline)

If `App.tsx` has uncommitted modifications and Slice 1 also modifies `App.tsx` (removing `TvTreehouseFrame`, adding new shell), this is a guaranteed conflict.

**Recommended Fix:**
Slice 0 must include an explicit decision tree: (1) read each modified file, (2) classify as "safe to discard" / "must preserve" / "conflicts with Slice 1 target files", (

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
