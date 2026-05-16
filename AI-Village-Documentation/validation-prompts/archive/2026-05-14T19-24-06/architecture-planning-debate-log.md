# Architecture & Component Planning — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 13,744 input / 8,192 output

---

## Senior Architecture Lead — Round 1

# Architecture Authority Review: Coach Command Center + PLAUD Unified Workflow

**Reviewer:** Senior Code Quality Lead / Architecture Authority
**Date:** 2026-05-14
**Verdict:** **REVISE** — The phasing logic is sound and the domain modeling is mature, but the hook composition has a structural flaw that will cause cascading re-renders, the 22-file decomposition has three files that are under-engineered (too thin) and two that will blow the 300-line budget immediately, and state ownership is ambiguous in four places that will produce duplicated truth within Phase 1.

---

## Finding 1 — Hook Composition: Circular Dependency Risk in `useCoachAssistant → useAIChat → useConversationSidebar`

**Severity:** 🔴 CRITICAL
**Files:** `frontend/src/hooks/useCoachAssistant.ts`, `frontend/src/hooks/useAIChat.ts`, `frontend/src/hooks/useConversationSidebar.ts`

### Issue

The proposed composition creates a three-level hook chain where `useCoachAssistant` wraps `useAIChat` and also imports `useConversationSidebar`. If `useConversationSidebar` reads `conversationId` from `useAIChat` (to highlight the active item in the list), and `useCoachAssistant` passes `conversationId` back down as a prop to the sidebar component, you have a data flow loop:

```
useCoachAssistant
  ├── calls useAIChat → produces conversationId
  ├── calls useConversationSidebar(conversationId) → reads conversationId
  └── passes conversationId to <ConversationSidebar> → which calls useConversationSidebar internally
```

The sidebar hook is instantiated **twice** with the same `conversationId` — once inside `useCoachAssistant` and once inside `<ConversationSidebar>`. Both instances subscribe to the same backend data independently, producing two fetch cycles on mount and two separate local states that can diverge (rename optimistic update in one instance, stale title in the other).

This is not a theoretical risk. The existing `SwanCoachAssistantPage.tsx` already demonstrates this pattern with `useAIChat` + `ConversationSidebar`, and the plan proposes to add a third layer on top without resolving the existing duplication.

### Recommended Fix

Invert the ownership model. State lives in one place; hooks are pure selectors or action dispatchers.

```typescript
// CoachCommandProvider.tsx — single source of truth
// This is the ONLY place that calls useAIChat and owns conversation state

interface CoachCommandState {
  // Conversation domain
  activeConversationId: string | null;
  conversations: AiConversation[];
  conversationsLoading: boolean;

  // Client context domain
  selectedClientId: string | null;
  selectedClient: ClientSummary | null;

  // Intake domain (read-only reference — owned by useCoachIntakeQueue)
  intakeScope: 'actionable' | 'all';

  // UI domain (ephemeral — does NOT belong in server state)
  sidebarOpen: boolean;
  activePanel: 'chat' | 'intake' | 'merge';
}

// useCoachAssistant.ts — actions only, no state ownership
// Reads from context, dispatches to context
export function useCoachAssistant() {
  const ctx = useCoachCommandContext(); // throws if used outside provider
  return {
    sendMessage: ctx.sendMessage,
    createConversation: ctx.createConversation,
    selectConversation: ctx.selectConversation,
    selectClient: ctx.selectClient,
  };
}

// useConversationSidebar.ts — derived selector only
// Reads conversations from context, returns filtered/sorted list
export function useConversationSidebar(filter?: string) {
  const { conversations, activeConversationId } = useCoachCommandContext();
  return useMemo(() => ({
    items: filterAndSort(conversations, filter),
    activeId: activeConversationId,
  }), [conversations, activeConversationId, filter]);
}
```

**Result:** `useAIChat` is called exactly once, inside `CoachCommandProvider`. Every child hook reads from context. No circular dependency. No duplicate fetch.

---

## Finding 2 — State Management: Four Locations of Duplicated Truth

**Severity:** 🔴 HIGH
**Files:** `CoachCommandCenterPage.tsx`, `useCoachAssistant.ts`, `useAIChat.ts`, `PlaudMergeWorkspace.tsx`

### Issue

The plan describes state that is owned in multiple places simultaneously:

| State | Owned By | Also Read/Written By | Risk |
|---|---|---|---|
| `selectedClientId` | `useCoachAssistant` local state | `PlaudClientResolver` props, `PlaudMergeWorkspace` query param, `useAIChat` `targetUserId` | Client changes in merge workspace do not propagate to chat context; chat context changes do not update merge workspace |
| `activeConversationId` | `useAIChat` internal state | `ConversationSidebar` highlight, query param `?conversationId=`, `CoachCommandCenterPage` URL sync | URL and hook state can diverge on browser back-button; sidebar highlight lags one render |
| `intakeQueue` items | `useCoachIntakeQueue` | `CoachCommandCenterPage` render, `PlaudMergeWorkspace` (reads same queue via separate hook call) | Two hook instances = two fetch cycles = two loading states that can show different item counts |
| `sidebarOpen` | Local `useState` in page | Mobile dock button, keyboard shortcut handler, query param `?sidebar=open` | Three writers, no single source; closing via keyboard does not update URL; URL open does not trigger dock animation |

### Recommended Fix

Define explicit ownership boundaries before writing a single line of Phase 1 code:

```typescript
// Ownership contract — document this in a comment at the top of CoachCommandProvider.tsx

// SERVER STATE (owned by React Query / SWR / useAIChat fetch layer):
//   conversations[]         → useAIChat, invalidated on send/rename/archive
//   intakeQueue[]           → useCoachIntakeQueue, invalidated on approve/discard
//   selectedClient profile  → useClientSummary(selectedClientId), read-only

// URL STATE (owned by query params, synced to context on mount):
//   conversationId          → ?conversationId=uuid
//   panel                   → ?panel=chat|intake|merge
//   mergeRequestId          → ?mergeRequestId=uuid (PLAUD deep link)

// EPHEMERAL UI STATE (owned by local useState, never serialized):
//   sidebarOpen             → CoachCommandShell only
//   composerDraft           → CoachInputBar only (do NOT lift this)
//   searchQuery             → ConversationSidebar only

// CROSS-DOMAIN STATE (owned by CoachCommandProvider, passed via context):
//   selectedClientId        → set by ClientSelector, read by chat + merge + intake
//   activePanel             → set by dock/tabs, read by shell layout
```

The `selectedClientId` cross-domain ownership is the most dangerous. It must live in `CoachCommandProvider` and be passed to `PlaudMergeWorkspace` as a prop, not re-derived from query params inside the merge workspace.

---

## Finding 3 — File Budget: Five Files Will Exceed 300 Lines

**Severity:** 🔴 HIGH
**Files:** See table below

### Analysis

Based on the feature scope described in the plan and the existing codebase patterns, the following files will exceed the 300-line budget before Phase 1 is complete:

| File | Estimated Lines | Why It Will Overflow | Fix |
|---|---|---|---|
| `CoachCommandCenterPage.tsx` | **480–600** | Query-param parsing + layout grid + panel routing + mobile dock + PLAUD workspace mount + conversation panel mount + client selector + error boundary setup | Split per Finding 4 below |
| `useCoachAssistant.ts` | **350–420** | If it wraps `useAIChat` AND owns client context AND handles PLAUD state AND exposes 12+ action methods, it becomes a god hook | Split into `useCoachAssistant` (actions only, ~80 lines) + `CoachCommandProvider` (state, ~150 lines) |
| `CoachInputBar.tsx` | **295–380** | Voice record button + file attachment button + text area with auto-resize + submit handler + client context badge + character count + keyboard shortcut handler + mobile safe-area padding | Extract `VoiceRecordButton.tsx` (~80 lines) and `AttachmentButton.tsx` (~60 lines) as siblings, not children |
| `PlaudMergeWorkspace.tsx` | **310–400** | Already exists and is large; Phase 1 adds client context prop threading and conversation context binding | Do not modify in Phase 1 — treat as a black box, pass `selectedClientId` as prop only |
| `CoachIntakePanel.tsx` | **280–340** | Status filter tabs + item list + empty states (7 distinct statuses) + loading skeleton + error state + "review next" auto-advance logic | Extract `IntakeStatusFilter.tsx` (~60 lines) and `IntakeItemCard.tsx` (~90 lines) |

### The Under-Engineered Files (Too Thin)

Three proposed files are too thin to justify their own module:

| File | Estimated Lines | Problem | Fix |
|---|---|---|---|
| `CoachCommandCenter.data.ts` | ~40 lines | Static prototype data that should be deleted, not refactored into its own file | Delete entirely in Phase 1; replace with real data from `useAIChat` |
| `CoachPanelHeader.tsx` | ~35 lines | A title + subtitle + action button — this is a styled div, not a component | Inline into `CoachCommandShell.tsx` or use existing `DashboardHeader` pattern |
| `CoachEmptyState.tsx` | ~25 lines | Generic empty state with icon + message — already exists as a pattern in the codebase | Use existing empty state component or a single shared `EmptyState` with props |

---

## Finding 4 — Component Decomposition: The Three-Layer Rule

**Severity:** 🟡 MEDIUM
**File:** `CoachCommandCenterPage.tsx`

### Issue

The existing file and the plan's additions will create a component that violates the single-responsibility principle across four distinct concerns: routing, layout, data orchestration, and render. The 12 specialist reviews all flagged this but proposed different split points. Here is the authoritative decomposition:

### Recommended File Tree with Line Budgets

```
frontend/src/components/DashBoard/Pages/coach-assistant/
│
├── CoachCommandCenterPage.tsx              [~80 lines]
│   RESPONSIBILITY: Route shell only.
│   - Parse query params (conversationId, panel, mergeRequestId, review)
│   - Mount CoachCommandProvider with parsed initial state
│   - Mount CoachCommandShell
│   - Mount top-level ErrorBoundary
│   - NO layout, NO data fetching, NO render logic
│
├── CoachCommandShell.tsx                   [~140 lines]
│   RESPONSIBILITY: Layout and panel visibility.
│   - Desktop: sidebar + main panel grid
│   - Mobile: bottom dock + single panel view
│   - Panel switching logic (chat / intake / merge)
│   - Sidebar open/close animation (Framer Motion AnimatePresence)
│   - NO data fetching
│
├── panels/
│   ├── CoachConversationPanel.tsx          [~160 lines]
│   │   RESPONSIBILITY: Conversation list + active thread layout.
│   │   - Renders ConversationSidebar (reused from SwanCoachAssistantPage)
│   │   - Renders CoachThreadView
│   │   - Handles empty state (no conversation selected)
│   │
│   ├── CoachIntakePanel.tsx                [~180 lines]
│   │   RESPONSIBILITY: Today's intake queue.
│   │   - Status filter tabs
│   │   - Item list (virtualized if >20 items)
│   │   - "Review next" auto-advance
│   │   - Delegates to IntakeItemCard for individual items
│   │
│   └── CoachMergePanel.tsx                 [~80 lines]
│       RESPONSIBILITY: Thin wrapper around PlaudMergeWorkspace.
│       - Passes selectedClientId from context as prop
│       - Passes mergeRequestId from query params
│       - NO modification to PlaudMergeWorkspace internals in Phase 1
│
├── components/
│   ├── CoachThreadView.tsx                 [~200 lines]
│   │   - Message list (virtualized)
│   │   - Streaming token display
│   │   - CoachInputBar at bottom
│   │
│   ├── CoachInputBar.tsx                   [~180 lines]
│   │   - Text area with auto-resize
│   │   - Submit on Enter/Shift+Enter
│   │   - Client context badge (read from context, not props)
│   │   - Character count
│   │   - Mobile safe-area padding
│   │   NOTE: Voice and attachment extracted to siblings
│   │
│   ├── VoiceRecordButton.tsx               [~90 lines]
│   │   - MediaRecorder lifecycle
│   │   - Recording state indicator
│   │   - Calls useVoiceRecorder hook
│   │
│   ├── AttachmentButton.tsx                [~70 lines]
│   │   - File input trigger
│   │   - MIME type validation (client-side pre-check only)
│   │   - Calls useFileAttachment hook
│   │
│   ├── IntakeItemCard.tsx                  [~110 lines]
│   │   - Single intake item render
│   │   - Status badge
│   │   - Action buttons (approve / discard / clarify)
│   │   - Memoized with React.memo
│   │
│   ├── IntakeStatusFilter.tsx              [~70 lines]
│   │   - Tab/pill filter for intake statuses
│   │   - Controlled component (filter state owned by CoachIntakePanel)
│   │
│   └── MobileCommandDock.tsx               [~120 lines]
│       - Fixed bottom bar
│       - Panel switch buttons (44px touch targets)
│       - Quick action: new conversation, voice note
│       - Safe area inset handling
│
├── context/
│   └── CoachCommandProvider.tsx            [~200 lines]
│       RESPONSIBILITY: Single source of truth for cross-domain state.
│       - Calls useAIChat (ONCE)
│       - Calls useCoachIntakeQueue (ONCE)
│       - Owns selectedClientId
│       - Owns activePanel
│       - Syncs URL params on mount
│       - Exposes CoachCommandContext
│
├── hooks/
│   ├── useCoachAssistant.ts                [~80 lines]
│   │   - Action dispatcher only
│   │   - Reads from CoachCommandContext
│   │   - Returns: sendMessage, createConversation, selectConversation, selectClient
│   │   - NO state ownership
│   │
│   ├── useConversationSidebar.ts           [~60 lines]
│   │   - Derived selector
│   │   - Reads conversations from context
│   │   - Returns filtered/sorted list + activeId
│   │   - NO fetch calls
│   │
│   ├── useVoiceRecorder.ts                 [~120 lines]
│   │   - MediaRecorder lifecycle management
│   │   - Blob accumulation
│   │   - Error handling (permission denied, browser unsupported)
│   │   - PHASE 4 ONLY — stub with feature flag in Phase 1
│   │
│   ├── useGeminiTranscription.ts           [~100 lines]
│   │   - Sends audio blob to backend transcription endpoint
│   │   - Returns transcript + confidence
│   │   - PHASE 4 ONLY — do not implement in Phase 1
│   │
│   └── useFileAttachment.ts                [~90 lines]
│       - File validation (MIME, size)
│       - Upload to backend (not direct to R2 from client)
│       - Progress tracking
│       - PHASE 2 ONLY — stub in Phase 1
│
└──

---

## Code Architecture Specialist (1M context) — Round 2

CONSENSUS REACHED

The Senior Architecture Lead's review is accepted in full. All four findings are valid and the recommended fixes are sound. No disputes are raised.

**Summary of Agreed Points:**

1. **Hook Composition Circular Dependency**
   - **Files:** `frontend/src/hooks/useCoachAssistant.ts`, `frontend/src/hooks/useAIChat.ts`, `frontend/src/hooks/useConversationSidebar.ts`
   - **Fix:** Invert ownership via `CoachCommandProvider` as single source of truth. Hooks become pure selectors/action dispatchers.
   - **Implementation:**
     - Create `CoachCommandProvider.tsx` (context) owning `useAIChat` and state.
     - Refactor `useCoachAssistant.ts` to action-only dispatcher (~80 lines).
     - Refactor `useConversationSidebar.ts` to derived selector (~60 lines).

2. **Duplicated Truth in State Management**
   - **Files:** `CoachCommandCenterPage.tsx`, `useCoachAssistant.ts`, `useAIChat.ts`, `PlaudMergeWorkspace.tsx`
   - **Fix:** Define explicit ownership boundaries:
     - **Server State:** `conversations[]`, `intakeQueue[]` (owned by React Query hooks).
     - **URL State:** `conversationId`, `panel`, `mergeRequestId` (synced to context on mount).
     - **Ephemeral UI State:** `sidebarOpen`, `composerDraft`, `searchQuery` (local `useState`).
     - **Cross-Domain State:** `selectedClientId`, `activePanel` (owned by `CoachCommandProvider`).
   - **Implementation:**
     - Pass `selectedClientId` as prop to `PlaudMergeWorkspace` (no re-derivation from URL).
     - Sync URL params to context in `CoachCommandCenterPage.tsx` on mount.

3. **File Budget Overruns**
   - **Files at Risk:** `CoachCommandCenterPage.tsx` (480–600 lines), `useCoachAssistant.ts` (350–420 lines), `CoachInputBar.tsx` (295–380 lines), `PlaudMergeWorkspace.tsx` (310–400 lines), `CoachIntakePanel.tsx` (280–340 lines).
   - **Fix:** Apply component decomposition per Finding 4 to enforce <300 lines/file.
   - **Under-Engineered Files to Delete:**
     - `CoachCommandCenter.data.ts` (~40 lines) → replace with real data from `useAIChat`.
     - `CoachPanelHeader.tsx` (~35 lines) → inline into `CoachCommandShell.tsx`.
     - `CoachEmptyState.tsx` (~25 lines) → use existing `EmptyState` component.

4. **Component Decomposition (Three-Layer Rule)**
   - **File Tree & Responsibilities:**
     ```
     frontend/src/components/DashBoard/Pages/coach-assistant/
     │
     ├── CoachCommandCenterPage.tsx          [~80 lines]
     │   - Route shell: parse query params, mount provider/shell/error boundary.
     │
     ├── CoachCommandShell.tsx               [~140 lines]
     │   - Layout: desktop sidebar/grid, mobile dock, panel switching, animations.
     │
     ├── panels/
     │   ├── CoachConversationPanel.tsx      [~160 lines]
     │   │   - Conversation list + active thread layout.
     │   │
     │   ├── CoachIntakePanel.tsx            [~180 lines]
     │   │   - Intake queue: status filters, item list, auto-advance.
     │   │
     │   └── CoachMergePanel.tsx             [~80 lines]
     │       - Thin wrapper for `PlaudMergeWorkspace` (pass `selectedClientId`, `mergeRequestId`).
     │
     ├── components/
     │   ├── CoachThreadView.tsx             [~200 lines]
     │   │   - Message list (virtualized), streaming tokens, input bar.
     │   │
     │   ├── CoachInputBar.tsx               [~180 lines]
     │   │   - Text area (auto-resize), submit, client badge, char count, mobile padding.
     │   │
     │   ├── VoiceRecordButton.tsx           [~90 lines]
     │   │   - MediaRecorder lifecycle, recording state.
     │   │
     │   ├── AttachmentButton.tsx            [~70 lines]
     │   │   - File input trigger, MIME/size validation, upload hook.
     │   │
     │   ├── IntakeItemCard.tsx              [~110 lines]
     │   │   - Single item render: status badge, action buttons.
     │   │
     │   ├── IntakeStatusFilter.tsx          [~70 lines]
     │   │   - Tab/pill filter for intake statuses.
     │   │
     │   └── MobileCommandDock.tsx           [~

---
