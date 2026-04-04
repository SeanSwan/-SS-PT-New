# Architecture & Component Design — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 73.6s
> **Files:** docs/ai-workflow/blueprints/ONBOARDING-WORKFLOW-OVERHAUL-PLAN.md
> **Generated:** 4/2/2026, 8:47:53 PM

---

# SwanStudios Onboarding Overhaul — Architectural Review

**Reviewer:** Senior React/TypeScript Architect
**Plan:** `docs/ai-workflow/blueprints/ONBOARDING-WORKFLOW-OVERHAUL-PLAN.md`
**Date:** 2025
**Verdict:** Plan is directionally sound but has significant gaps in state management, race condition exposure, and hook design that must be resolved before implementation begins.

---

## Table of Contents
1. [Component Decomposition](#1-component-decomposition)
2. [State Management](#2-state-management)
3. [Data Flow](#3-data-flow)
4. [React Patterns](#4-react-patterns)
5. [File Budget](#5-file-budget)
6. [Hook Design](#6-hook-design)
7. [Error Boundaries](#7-error-boundaries)
8. [Cross-Cutting Concerns](#8-cross-cutting-concerns)
9. [Recommended File Structure](#9-recommended-file-structure)
10. [Priority Matrix](#10-priority-matrix)

---

## 1. Component Decomposition

### Finding 1.1 — `IncompleteOnboardingBanner.tsx` is under-scoped
**Severity:** 🟡 Medium
**File:** `frontend/src/components/DashBoard/Pages/client-dashboard/IncompleteOnboardingBanner.tsx`

**Issue:** The plan treats this as a single banner component, but it will need to handle three distinct render states (loading skeleton, partial completion with progress, zero-progress prompt) plus the glow animation, progress dots, and a CTA that deep-links into the wizard at the correct step. Cramming all of this into one file will push it past 300 lines and violate single-responsibility.

**Recommended Fix:** Decompose into a small co-located module:

```
client-dashboard/onboarding-banner/
├── IncompleteOnboardingBanner.tsx      # Orchestrator, ~80 lines
├── OnboardingProgressDots.tsx          # 8-dot step tracker, ~60 lines
├── OnboardingGlowWrapper.tsx           # Styled animation shell, ~40 lines
├── useOnboardingStatus.ts              # Data-fetching hook, ~70 lines
└── index.ts                            # Barrel export
```

The `OnboardingGlowWrapper` being a pure styled-component shell means the animation CSS lives in one place and can be reused by the trainer/admin badge variants.

---

### Finding 1.2 — `OnboardingStatusBadge.tsx` will be duplicated across three dashboards
**Severity:** 🟡 Medium
**File:** `frontend/src/components/DashBoard/Pages/admin-clients/components/OnboardingStatusBadge.tsx`

**Issue:** The plan creates this badge only under `admin-clients/`. The trainer dashboard (`MyClientsView.tsx`) will need the same badge. Two separate implementations will immediately diverge in styling.

**Recommended Fix:** Promote to a shared location:

```
frontend/src/components/shared/onboarding/
├── OnboardingStatusBadge.tsx           # Shared badge (admin + trainer)
├── OnboardingStatusBadge.types.ts      # Props interface
└── index.ts
```

The badge accepts a `variant: 'compact' | 'detailed'` prop — compact for table cells, detailed for the trainer client card.

---

### Finding 1.3 — `MasterDetailLayout.tsx` modification is too broad
**Severity:** 🔴 High
**File:** `frontend/src/components/DashBoard/workspaces/clients-team/MasterDetailLayout.tsx`

**Issue:** The plan says "Add onboarding column" to this layout file. `MasterDetailLayout` is almost certainly a generic layout shell that should know nothing about onboarding domain logic. Adding domain-specific column configuration here creates a god-component and makes the layout non-reusable.

**Recommended Fix:** The column definition belongs in the clients-team feature, not the layout:

```typescript
// frontend/src/components/DashBoard/workspaces/clients-team/
// ClientsTableColumns.ts  ← column definitions live here
// ClientsTable.tsx        ← consumes column definitions
// MasterDetailLayout.tsx  ← stays generic, receives columns as props
```

The onboarding column config is added to `ClientsTableColumns.ts`, not to the layout itself.

---

### Finding 1.4 — `ContextChipBar.tsx` tooltip logic will bloat the component
**Severity:** 🟡 Medium
**File:** `frontend/src/components/DashBoard/Pages/coach-assistant/ContextChipBar.tsx`

**Issue:** Adding "Teach Me" tooltip state, localStorage tracking, and tooltip render logic directly into `ContextChipBar` will push it well past 300 lines and mix UI orchestration with educational content concerns.

**Recommended Fix:**

```
coach-assistant/
├── ContextChipBar.tsx                  # Layout + chip iteration only, ~80 lines
├── ContextChip.tsx                     # Individual chip + tooltip, ~100 lines
├── TeachMeTooltip.tsx                  # Tooltip content renderer, ~80 lines
└── useTeachMeState.ts                  # localStorage tracking hook, ~50 lines
```

---

## 2. State Management

### Finding 2.1 — Hook composition chain is not defined in the plan
**Severity:** 🔴 High
**Files:** `useCoachAssistant`, `useAIChat`, `useConversationSidebar` (all implied, none specified)

**Issue:** The plan references these hooks by name but never defines their boundaries. Without explicit contracts, developers will make different assumptions about what each hook owns, leading to duplicated state (e.g., `currentConversationId` living in both `useAIChat` and `useConversationSidebar`).

**Recommended Fix:** Define explicit ownership contracts before any implementation:

```typescript
// useConversationSidebar.ts
// OWNS: conversationList, selectedConversationId, sidebar open/close UI state
// READS: nothing from sibling hooks
// EMITS: onConversationSelect(id: string) callback

// useAIChat.ts  
// OWNS: messages[], isStreaming, inputValue, pendingAction
// READS: selectedConversationId (passed as param, not imported)
// EMITS: onActionDetected(action: AIAction) callback

// useCoachAssistant.ts
// OWNS: activeContext chip, teachMe seen state
// COMPOSES: useConversationSidebar + useAIChat
// BRIDGES: wires onConversationSelect → useAIChat.loadConversation
```

The key rule: **lower-level hooks receive IDs as parameters, never import from sibling hooks.** This prevents circular dependencies entirely.

---

### Finding 2.2 — `pendingAction` state for `ONBOARD_CLIENT_INTENT` has no defined home
**Severity:** 🔴 High
**Files:** `aiChatRoutes.mjs` (backend), `useAIChat.ts` (frontend, implied)

**Issue:** The plan identifies that "ONBOARD_CLIENT action block from AI isn't processed by frontend" as a current bug. The fix requires the frontend to detect an `action: "create_client"` JSON block in the AI response stream and route it to a confirmation modal before executing. The plan does not specify where this state lives or how the confirmation flow works.

**Race condition risk:** If the AI streams a response that contains the action JSON mid-stream, and the user sends another message before the stream completes, the action could be lost or double-processed.

**Recommended Fix:**

```typescript
// In useAIChat.ts — explicit action state machine
type ActionState =
  | { status: 'idle' }
  | { status: 'detected'; action: AIAction; rawResponse: string }
  | { status: 'confirming'; action: AIAction }
  | { status: 'executing'; action: AIAction }
  | { status: 'complete'; result: AIActionResult }
  | { status: 'error'; error: Error };

// Rules:
// 1. Input is DISABLED when actionState.status !== 'idle'
// 2. Stream is parsed for action JSON only after stream completes (not mid-stream)
// 3. Confirmation modal is rendered by useCoachAssistant, not useAIChat
```

---

### Finding 2.3 — Onboarding status data will be fetched in multiple places without coordination
**Severity:** 🟡 Medium
**Files:** `useOnboardingStatus.ts` (new), `MyClientsView.tsx`, `MasterDetailLayout.tsx`

**Issue:** The client dashboard banner, trainer dashboard list, and admin dashboard table all need onboarding status data. Without a shared cache layer, three separate `useEffect` fetches will hit the same endpoint simultaneously on page load.

**Recommended Fix:** Use React Query (or SWR if already in the project) with a shared query key:

```typescript
// Shared query key factory
export const onboardingKeys = {
  all: ['onboarding'] as const,
  byClient: (clientId: string) => [...onboardingKeys.all, 'client', clientId] as const,
  byTrainer: (trainerId: string) => [...onboardingKeys.all, 'trainer', trainerId] as const,
  adminAll: () => [...onboardingKeys.all, 'admin'] as const,
};

// All three components use the same key → single network request, shared cache
// Invalidated when create_client action completes
```

If React Query is not in the project, a lightweight context provider at the dashboard layout level is the minimum acceptable solution.

---

## 3. Data Flow

### Finding 3.1 — Sidebar click → loadConversation has a stale closure risk
**Severity:** 🔴 High
**Files:** `useConversationSidebar.ts`, `useAIChat.ts`

**Issue:** The typical implementation of this pattern looks like:

```typescript
// DANGEROUS — stale closure pattern
const handleConversationSelect = useCallback((id: string) => {
  loadConversation(id); // loadConversation captured at mount
}, []); // ← empty deps means loadConversation is stale if it changes
```

If `loadConversation` is recreated (e.g., after auth token refresh), the sidebar handler holds a stale reference and silently loads with an expired token.

**Recommended Fix:**

```typescript
// SAFE — ref-based stable callback
const loadConversationRef = useRef(loadConversation);
useEffect(() => { loadConversationRef.current = loadConversation; });

const handleConversationSelect = useCallback((id: string) => {
  loadConversationRef.current(id);
}, []); // stable identity, always calls latest version
```

---

### Finding 3.2 — Race condition: rapid conversation switching
**Severity:** 🔴 High
**Files:** `useAIChat.ts` (implied)

**Issue:** If a user clicks conversation A, then immediately clicks conversation B before A's fetch resolves, both fetches are in-flight. Whichever resolves last wins — which may not be B. This is a classic race condition.

**Recommended Fix:** Abort controller pattern is mandatory:

```typescript
const loadConversation = useCallback(async (conversationId: string) => {
  // Cancel any in-flight request
  abortControllerRef.current?.abort();
  abortControllerRef.current = new AbortController();
  
  setMessagesState({ status: 'loading', conversationId });
  
  try {
    const messages = await fetchConversationMessages(
      conversationId, 
      { signal: abortControllerRef.current.signal }
    );
    // Only update if this is still the current conversation
    setMessagesState({ status: 'loaded', conversationId, messages });
  } catch (err) {
    if (err.name === 'AbortError') return; // Intentional, not an error
    setMessagesState({ status: 'error', error: err });
  }
}, []);

// Cleanup on unmount
useEffect(() => () => abortControllerRef.current?.abort(), []);
```

---

### Finding 3.3 — Pre-fill data flow from backend to wizard has no defined contract
**Severity:** 🟡 Medium
**Files:** `ClientOnboardingWizard.tsx`, `aiChatRoutes.mjs`

**Issue:** The plan describes pre-filling stages 1-3 of the wizard when a client claims their account. But the wizard currently reads from its own local state or a fresh API fetch. There is no defined mechanism for the wizard to:
1. Know that pre-fill data exists
2. Load it from the questionnaire record
3. Mark stages 1-3 as "completed by trainer" vs "completed by client"

**Recommended Fix:** Define the initialization contract explicitly:

```typescript
// ClientOnboardingWizard.tsx — initialization modes
type WizardInitMode =
  | { mode: 'fresh' }                              // New client, no pre-fill
  | { mode: 'prefilled'; questionnaireId: string } // AI-created, has partial data
  | { mode: 'resume'; questionnaireId: string };   // Client returning mid-flow

// On mount with mode='prefilled':
// 1. Fetch questionnaire by ID
// 2. Map responsesJson → wizard step state
// 3. Calculate firstIncompleteStep
// 4. Navigate to firstIncompleteStep (not step 1)
// 5. Show "Pre-filled by your trainer" badge on completed steps
```

The claim activation endpoint should return `{ questionnaireId, completionPercentage, firstIncompleteStep }` so the wizard knows exactly where to start.

---

### Finding 3.4 — Onboarding completion event has no propagation path
**Severity:** 🟡 Medium
**Files:** `ClientOnboardingWizard.tsx`, `IncompleteOnboardingBanner.tsx`, trainer/admin dashboards

**Issue:** When a client submits their completed onboarding, the glowing banner needs to disappear, the trainer dashboard needs to update, and the admin table needs to update. The plan has no mechanism for this — each component would only update on its next manual refresh.

**Recommended Fix:** Two acceptable approaches depending on project infrastructure:

```typescript
// Option A: React Query invalidation (preferred if RQ is available)
// In wizard's onSubmit handler:
queryClient.invalidateQueries({ queryKey: onboardingKeys.all });
// All subscribed components re-fetch automatically

// Option B: Custom event + polling fallback
// Emit a custom DOM event that dashboard components listen for
window.dispatchEvent(new CustomEvent('onboarding:completed', { 
  detail: { clientId, questionnaireId } 
}));
// Components listen in useEffect and trigger re-fetch
```

WebSocket/SSE for real-time trainer dashboard updates is a stretch goal, not MVP.

---

## 4. React Patterns

### Finding 4.1 — `MyClientsView.tsx` will re-render on every message in the chat
**Severity:** 🟡 Medium
**File:** `frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.tsx`

**Issue:** If `MyClientsView` is rendered inside the same component tree as the Coach Assistant, and the Coach Assistant's state updates on every streamed token, the entire clients list will re-render on every keystroke/token. With 20+ clients each showing an onboarding badge, this is measurable jank.

**Recommended Fix:**

```typescript
// MyClientsView should be wrapped in React.memo with a custom comparator
export const MyClientsView = React.memo(({ clients, onClientSelect }: Props) => {
  // ...
}, (prev, next) => {
  // Only re-render if client list actually changed
  return (
    prev.clients.length === next.clients.length &&
    prev.clients.every((c, i) => c.id === next.clients[i].id && 
      c.onboardingStatus === next.clients[i].onboardingStatus)
  );
});

// Individual client rows also memoized
const ClientRow = React.memo(({ client, onSelect }: ClientRowProps) => { ... });
```

---

### Finding 4.2 — Glow animation should use CSS, not JS-driven animation
**Severity:** 🟡 Medium
**File:** `IncompleteOnboardingBanner.tsx`, `OnboardingGlowWrapper.tsx`

**Issue:** The plan mentions a `@keyframes onboardingGlow` animation. If this is implemented with `setInterval` + style updates in JS (a common mistake), it will

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
